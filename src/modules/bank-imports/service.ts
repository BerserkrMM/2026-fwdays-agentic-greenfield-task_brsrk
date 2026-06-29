// Bank-imports channel service — orchestrates `/imports/bank` (FR-BANK-01..06).
// It stores the original statement as an input_event, performs deterministic
// provider normalization, invokes Parsing, and creates pending ledger items via
// the shared item-creation contract. It owns bank-row retry insert-if-absent
// behavior and no balance or category logic.

import {
  assertBankProvider,
  assertSupportedBankFile,
  normalizeBankStatement,
  serializeBankRows,
  type BankProvider,
} from "@/src/domain/bank-statement";
import {
  type ItemCreationContract,
  MissingInputEventError,
  NoDefaultAccountError,
  type Repositories,
} from "@/src/domain/ports";
import type { ParsedLedgerItemDraft } from "@/src/domain/parsed-draft";
import type { ParsingService } from "@/src/modules/parsing/service";

export interface BankImportInput {
  provider: unknown;
  fileName: unknown;
  mimeType: unknown;
  rawText: string;
}

export interface BankImportSummary {
  inputEventId: string;
  parserRunId: string;
  created: number;
  failed: number;
  skipped: number;
}

export class BankImportService {
  constructor(
    private readonly repos: Repositories,
    private readonly parsing: ParsingService,
    private readonly itemCreation: ItemCreationContract,
  ) {}

  async importStatement(input: BankImportInput): Promise<BankImportSummary> {
    const provider = assertBankProvider(input.provider);
    const file = assertSupportedBankFile(input.fileName, input.mimeType);

    // Preserve original statement before deterministic normalization/parsing.
    const event = await this.repos.inputEvents.create({
      source: "bank",
      provider,
      rawText: input.rawText,
      storageUri: null,
      mimeType: file.mimeType,
    });

    return this.processEvent(event.id, provider, input.rawText);
  }

  async retryInputEvent(inputEventId: string): Promise<BankImportSummary> {
    const event = await this.repos.inputEvents.findById(inputEventId);
    if (!event || event.source !== "bank" || !event.provider || event.rawText === null) {
      throw new MissingInputEventError(inputEventId);
    }
    const provider = assertBankProvider(event.provider);
    return this.processEvent(event.id, provider, event.rawText);
  }

  private async processEvent(
    inputEventId: string,
    provider: BankProvider,
    rawText: string,
  ): Promise<BankImportSummary> {
    const rows = normalizeBankStatement({ provider, rawText });
    const result = await this.parsing.parse({
      inputEventId,
      payload: {
        kind: "bank",
        content: serializeBankRows(provider, rows),
        locale: "uk-UA",
      },
    });
    const validRowNumbers = new Set(rows.map((row) => row.rowNumber));

    let created = 0;
    let failed = 0;
    let skipped = 0;

    for (const draft of result.drafts) {
      const rowNumber = draft.sourceRef?.rowNumber;
      if (rowNumber === undefined || !validRowNumbers.has(rowNumber)) {
        failed += 1;
        continue;
      }
      const existing = await this.repos.ledgerItems.findByInputEventRow(
        inputEventId,
        rowNumber,
      );
      if (existing) {
        skipped += 1;
        continue;
      }
      try {
        await this.itemCreation.createPendingItem({
          draft: ensureBankSourceRow(draft, rowNumber),
          inputEventId,
          parserRunId: result.parserRun.id,
        });
        created += 1;
      } catch (error) {
        if (
          error instanceof NoDefaultAccountError ||
          error instanceof MissingInputEventError
        ) {
          throw error;
        }
        // A race against the DB unique index should not overwrite the existing
        // row. If the row now exists, treat it as skipped; otherwise count as a
        // per-row creation failure.
        const nowExisting = await this.repos.ledgerItems.findByInputEventRow(
          inputEventId,
          rowNumber,
        );
        if (nowExisting) skipped += 1;
        else failed += 1;
      }
    }

    return { inputEventId, parserRunId: result.parserRun.id, created, failed, skipped };
  }
}

function ensureBankSourceRow(
  draft: ParsedLedgerItemDraft,
  rowNumber: number,
): ParsedLedgerItemDraft {
  return { ...draft, sourceRef: { ...(draft.sourceRef ?? {}), rowNumber } };
}

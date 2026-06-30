// Bank-imports channel service — orchestrates `/imports/bank` (FR-BANK-01..06).
// It stores the original statement as an input_event, performs deterministic
// table extraction only, invokes Parsing on header+row batches, and creates
// pending ledger items via the shared item-creation contract. It owns bank-row
// retry insert-if-absent behavior and no balance or category logic.

import {
  assertBankProvider,
  assertSupportedBankFile,
  normalizeBankStatement,
  serializeBankRows,
  type NormalizedBankRow,
  type NormalizedBankTable,
  type BankProvider,
} from "@/src/domain/bank-statement";
import {
  type ItemCreationContract,
  MissingInputEventError,
  NoDefaultAccountError,
  type Repositories,
} from "@/src/domain/ports";
import type { ParsedLedgerItemDraft } from "@/src/domain/parsed-draft";
import type { ParserRun } from "@/src/domain/parser-run";
import type { ParsingService } from "@/src/modules/parsing/service";

export interface BankImportInput {
  provider: unknown;
  fileName: unknown;
  mimeType: unknown;
  rawText: string;
}

export interface BankImportSummary {
  inputEventId: string;
  /** First parser_run for this import; large statements may create one per batch. */
  parserRunId: string;
  created: number;
  failed: number;
  skipped: number;
}

const BANK_PARSE_BATCH_SIZE = 25;

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
    const table = normalizeBankStatement({ provider, rawText });
    const rowsByNumber = new Map(table.rows.map((row) => [row.rowNumber, row]));
    const validRowNumbers = new Set(rowsByNumber.keys());
    const attributedRows = new Set<number>();

    let firstParserRun: ParserRun | null = null;
    let created = 0;
    let failed = 0;
    let skipped = 0;

    for (const batchRows of chunks(table.rows, BANK_PARSE_BATCH_SIZE)) {
      const batchTable: NormalizedBankTable = { ...table, rows: batchRows };
      const result = await this.parsing.parse({
        inputEventId,
        tolerateInvalidDrafts: true,
        payload: {
          kind: "bank",
          content: serializeBankRows(batchTable),
          locale: "uk-UA",
        },
      });
      firstParserRun ??= result.parserRun;
      const batchRowNumbers = new Set(batchRows.map((row) => row.rowNumber));

      for (const draft of result.drafts) {
        const rowNumber = draft.sourceRef?.rowNumber;
        if (rowNumber === undefined || !validRowNumbers.has(rowNumber) || !batchRowNumbers.has(rowNumber)) {
          failed += 1;
          continue;
        }
        if (attributedRows.has(rowNumber)) {
          // The parser returned more than one draft for the same source row; only
          // the first is honored, so ignore the extras rather than double-count.
          continue;
        }
        attributedRows.add(rowNumber);
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
            draft: withBankDefaults(draft, rowNumber, rowsByNumber.get(rowNumber)),
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

      // A normalized source row the parser dropped entirely (no draft) must not
      // vanish from the summary — count it as failed so the import never reports
      // success while silently importing fewer rows than the statement had.
      for (const rowNumber of batchRowNumbers) {
        if (!attributedRows.has(rowNumber)) failed += 1;
      }
    }

    if (!firstParserRun) {
      throw new MissingInputEventError(inputEventId);
    }
    return { inputEventId, parserRunId: firstParserRun.id, created, failed, skipped };
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function withBankDefaults(
  draft: ParsedLedgerItemDraft,
  rowNumber: number,
  row: NormalizedBankRow | undefined,
): ParsedLedgerItemDraft {
  return {
    ...draft,
    ...(draft.occurredAt ? {} : { occurredAt: extractDateFromCells(row?.cells ?? []) }),
    sourceRef: { ...(draft.sourceRef ?? {}), rowNumber },
  };
}

function extractDateFromCells(cells: string[]): string | undefined {
  for (const cell of cells) {
    const iso = parseCellDate(cell);
    if (iso) return iso;
  }
  return undefined;
}

function parseCellDate(value: string): string | undefined {
  const trimmed = value.trim();
  const ymd = /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?\b/.exec(trimmed);
  if (ymd) return isoDate(ymd[1], ymd[2], ymd[3], ymd[4], ymd[5], ymd[6]);
  const dmy = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?\b/.exec(trimmed);
  if (dmy) return isoDate(dmy[3], dmy[2], dmy[1], dmy[4], dmy[5], dmy[6]);
  return undefined;
}

function isoDate(
  year: string,
  month: string,
  day: string,
  hour = "0",
  minute = "0",
  second = "0",
): string | undefined {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const hh = Number(hour);
  const mm = Number(minute);
  const ss = Number(second);
  if (m < 1 || m > 12 || d < 1 || d > 31 || hh > 23 || mm > 59 || ss > 59) return undefined;
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss)).toISOString();
}

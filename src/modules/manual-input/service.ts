// Manual-input channel service — orchestrates the `/imports/text` flow
// (FR-TEXT-01..05). It is a thin coordinator over already-built pieces and owns
// no schema or balance logic: it stores the original text as an `input_event`
// (NFR-PRIV-02), source-normalizes it, delegates parsing to the Parsing
// capability, and creates one pending ledger item per draft through the shared
// item-creation contract (FR-PARSE-07). Framework-free: persistence, parsing,
// and item-creation are injected, so it is unit-testable on the in-memory
// fallback with no Next/DB import here.

import { assertManualText } from "@/src/domain/manual-text";
import {
  type ItemCreationContract,
  MissingInputEventError,
  NoDefaultAccountError,
  type Repositories,
} from "@/src/domain/ports";
import type { ParsingService } from "@/src/modules/parsing/service";

export interface ManualImportSummary {
  inputEventId: string;
  parserRunId: string;
  /** Drafts saved as pending items. */
  created: number;
  /** Drafts that failed creation (partial-success; saved items are kept). */
  failed: number;
}

export class ManualInputService {
  constructor(
    private readonly repos: Repositories,
    private readonly parsing: ParsingService,
    private readonly itemCreation: ItemCreationContract,
  ) {}

  /**
   * Imports one free-form text submission. Throws `ManualTextError` for empty
   * input before any write, and `ParsingError` when parsing fails (the
   * input_event and a failed parser_run are preserved by the parser for retry —
   * FR-ITEM-07). On success every returned draft is attempted; a per-draft
   * failure is counted, not rolled back (partial-success, FR-TEXT-04).
   */
  async importText(rawText: string): Promise<ManualImportSummary> {
    const normalized = assertManualText(rawText);

    // Preserve the original text (NFR-PRIV-02) before normalization/parsing.
    const event = await this.repos.inputEvents.create({
      source: "text",
      provider: null,
      rawText,
      storageUri: null,
      mimeType: null,
    });

    const result = await this.parsing.parse({
      inputEventId: event.id,
      payload: { kind: "text", content: normalized, locale: "uk-UA" },
    });

    let created = 0;
    let failed = 0;
    for (const draft of result.drafts) {
      try {
        await this.itemCreation.createPendingItem({
          draft,
          inputEventId: event.id,
          parserRunId: result.parserRun.id,
        });
        created += 1;
      } catch (error) {
        // A systemic failure (no default account / missing input event) is not a
        // per-draft data problem — it would mislabel a real fault as a benign
        // "partial" summary, so let it propagate. Only genuine per-row failures
        // are counted (partial-success, FR-TEXT-04).
        if (
          error instanceof NoDefaultAccountError ||
          error instanceof MissingInputEventError
        ) {
          throw error;
        }
        failed += 1;
      }
    }

    return { inputEventId: event.id, parserRunId: result.parserRun.id, created, failed };
  }
}

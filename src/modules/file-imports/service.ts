// File-imports channel service — orchestrates the `/imports/files` receipt-photo
// flow (FR-FILE-01..05). It is a thin coordinator over already-built pieces and
// owns no schema or balance logic: it validates one image deterministically,
// preserves the original as a `photo` `input_event` (storage_uri = data URI),
// delegates a vision parse to the Parsing capability, and creates one pending
// ledger item per draft through the shared item-creation contract (FR-PARSE-07).
// Framework-free: persistence, parsing, and item-creation are injected.

import {
  type ItemCreationContract,
  MissingInputEventError,
  NoDefaultAccountError,
  type Repositories,
} from "@/src/domain/ports";
import { assertSupportedReceiptPhoto } from "@/src/domain/receipt-photo";
import type { ParsingService } from "@/src/modules/parsing/service";

export interface FileImportInput {
  fileName: unknown;
  mimeType: unknown;
  bytes: Uint8Array;
}

export interface FileImportSummary {
  inputEventId: string;
  parserRunId: string;
  /** Drafts saved as pending items. */
  created: number;
  /** Drafts that failed creation (partial-success; saved items are kept). */
  failed: number;
}

/** Short Ukrainian instruction sent alongside the receipt image. */
const RECEIPT_PROMPT_HINT =
  "Розпізнай позиції чека: опис, суму в копійках та дату, якщо вона є.";

/** Recovers the MIME from a `data:<mime>;base64,…` URI; defaults to JPEG. */
function mimeTypeFromDataUri(dataUri: string): string {
  const match = /^data:([^;,]+)[;,]/.exec(dataUri);
  return match?.[1] ?? "image/jpeg";
}

export class FileImportService {
  constructor(
    private readonly repos: Repositories,
    private readonly parsing: ParsingService,
    private readonly itemCreation: ItemCreationContract,
  ) {}

  /**
   * Imports one receipt photo. Throws `ReceiptPhotoError` for an invalid image
   * before any write, and `ParsingError` when the vision parse fails (the
   * input_event and a failed parser_run are preserved by the parser for retry —
   * FR-ITEM-07). On success every returned draft is attempted; a per-draft
   * failure is counted, not rolled back (partial-success, FR-FILE-05).
   */
  async importPhoto(input: FileImportInput): Promise<FileImportSummary> {
    const photo = assertSupportedReceiptPhoto({
      fileName: input.fileName,
      mimeType: input.mimeType,
      bytes: input.bytes,
    });

    // Preserve the original image (NFR-PRIV-02) before parsing. The bytes live in
    // storage_uri as a data: URI; no binary metadata stripping in v1.
    const event = await this.repos.inputEvents.create({
      source: "photo",
      provider: null,
      rawText: null,
      storageUri: photo.dataUri,
      mimeType: photo.mimeType,
    });

    return this.processEvent(event.id, photo.dataUri, photo.mimeType);
  }

  async retryInputEvent(inputEventId: string): Promise<FileImportSummary> {
    const event = await this.repos.inputEvents.findById(inputEventId);
    if (!event || event.source !== "photo" || !event.storageUri) {
      throw new MissingInputEventError(inputEventId);
    }
    // Prefer the stored mime; fall back to the one encoded in the data: URI so a
    // null mime never mislabels a non-JPEG retry.
    const mimeType = event.mimeType ?? mimeTypeFromDataUri(event.storageUri);
    return this.processEvent(event.id, event.storageUri, mimeType);
  }

  private async processEvent(
    inputEventId: string,
    dataUri: string,
    mimeType: string,
  ): Promise<FileImportSummary> {
    const result = await this.parsing.parse({
      inputEventId,
      // A receipt photo can yield several line items; one malformed line must not
      // discard the whole receipt. Keep valid drafts and count malformed ones as
      // failed (partial-success, FR-FILE-05).
      tolerateInvalidDrafts: true,
      payload: {
        kind: "photo",
        content: RECEIPT_PROMPT_HINT,
        locale: "uk-UA",
        image: { dataUri, mimeType },
        sourceRef: { photoIndex: 0 },
      },
    });

    let created = 0;
    let failed = result.invalidDrafts.length;
    for (const draft of result.drafts) {
      try {
        await this.itemCreation.createPendingItem({
          draft,
          inputEventId,
          parserRunId: result.parserRun.id,
        });
        created += 1;
      } catch (error) {
        // Systemic failures (no default account / missing input event) are not a
        // per-draft data problem — let them propagate instead of mislabeling them
        // as a benign "partial" summary. Only genuine per-draft failures count.
        if (
          error instanceof NoDefaultAccountError ||
          error instanceof MissingInputEventError
        ) {
          throw error;
        }
        failed += 1;
      }
    }

    return { inputEventId, parserRunId: result.parserRun.id, created, failed };
  }
}

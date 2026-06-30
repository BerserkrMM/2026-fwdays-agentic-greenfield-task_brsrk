// Manual-input source normalization — framework-free (TC-PURE-01).
// Owns only the channel-specific text preparation for `/imports/text`: trim the
// outer whitespace and reject empty input. Parsing-level privacy/noise cleanup
// (emails/phones, inner whitespace) runs later inside the Parsing capability
// (see `normalizeParserPayload`), so it is intentionally NOT duplicated here.
// The original (un-normalized) text is what gets preserved on the input_event
// (NFR-PRIV-02); this module produces only the normalized payload content.

export type ManualTextErrorCode = "empty-text";

export class ManualTextError extends Error {
  constructor(
    public readonly code: ManualTextErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ManualTextError";
  }
}

/** Source-specific normalization: trim outer whitespace. */
export function normalizeManualText(raw: string): string {
  return raw.trim();
}

/**
 * Normalizes the submitted text and rejects empty/whitespace-only input with
 * `empty-text` (FR-TEXT-01). Returns the normalized text to pass downstream.
 */
export function assertManualText(raw: string): string {
  const normalized = normalizeManualText(raw);
  if (!normalized) {
    throw new ManualTextError("empty-text", "Введіть текст для імпорту.");
  }
  return normalized;
}

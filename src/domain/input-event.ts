// InputEvent — one act of user input (text, one receipt photo, or one bank
// statement upload). The raw original is preserved here for traceability
// (NFR-PRIV-02). Framework-free (TC-PURE-01).

export type InputEventSource = "text" | "photo" | "bank";

export type BankProvider = "monobank" | "privatbank";

export interface InputEvent {
  id: string;
  source: InputEventSource;
  /** Bank provider, set only for `bank` source (FR-BANK-02). */
  provider: BankProvider | null;
  /** Raw text for `text` source; null otherwise. */
  rawText: string | null;
  /** Stored file reference for `photo`/`bank` sources; null otherwise. */
  storageUri: string | null;
  /** MIME type for file-backed sources; null otherwise. */
  mimeType: string | null;
  createdAt: Date;
}

/** Input accepted by the input-event storage contract (id/createdAt assigned). */
export type NewInputEvent = Omit<InputEvent, "id" | "createdAt"> & {
  id?: string;
};

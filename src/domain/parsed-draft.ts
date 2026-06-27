// ParsedLedgerItemDraft — the parser result contract (docs/requirements.md).
// The parser returns drafts only and never writes items (FR-PARSE-07).
// Framework-free (TC-PURE-01).

import type { Currency, OperationType } from "./money";

export interface ParsedLedgerItemDraft {
  description: string;
  /** Signed kopiyky: expense < 0, income > 0. */
  amountMinor: number;
  currency: Currency;
  type: OperationType;
  /** ISO date/time when known. */
  occurredAt?: string;
  /** AI-provided text, or `Без категорії` (FR-PARSE-03). */
  category: string;
  /** 0..1 when available (FR-PARSE-04). */
  confidence?: number;
  sourceRef?: {
    /** Required for bank-statement rows when available. */
    rowNumber?: number;
    /** v1 normally 0 because one photo per input_event. */
    photoIndex?: number;
  };
}

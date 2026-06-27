// LedgerItem — the atomic financial row and single source of truth for balances
// (FR-LEDGER-01/05). Framework-free (TC-PURE-01).

import type { AmountMinor, Currency, OperationType } from "./money";

// Status semantics (docs/requirements.md):
//   pending  — created by parsing/manual input, not yet reviewed (affects balance)
//   approved — user reviewed and agreed (affects balance)
//   deleted  — excluded from balance, retained as a log
export type LedgerItemStatus = "pending" | "approved" | "deleted";

/** Statuses included in balances/dashboard (everything except `deleted`). */
export const BALANCE_STATUSES: readonly LedgerItemStatus[] = [
  "pending",
  "approved",
];

export interface LedgerItem {
  id: string;
  accountId: string;
  /** The InputEvent this item was produced from (NFR-PRIV-02 traceability). */
  inputEventId: string;
  /** The ParserRun that produced it; null for direct manual creation. */
  parserRunId: string | null;
  description: string;
  /** Signed kopiyky: expense < 0, income > 0. */
  amountMinor: AmountMinor;
  currency: Currency;
  type: OperationType;
  /** Free-text category; defaults to `Без категорії` (FR-CAT-01/03). */
  category: string;
  status: LedgerItemStatus;
  /** Source row number for bank-statement rows; null otherwise (FR-BANK-06). */
  importRowNumber: number | null;
  /** When the operation occurred, when known (ISO at the edge, Date in domain). */
  occurredAt: Date | null;
  createdAt: Date;
}

/** Does this status contribute to balances? (FR-LEDGER-02, BC-SCOPE-04) */
export function affectsBalance(status: LedgerItemStatus): boolean {
  return status !== "deleted";
}

// Ledger item mutations — framework-free (TC-PURE-01). The single place that
// validates an edit and performs the status transitions the review surface owns
// (FR-ITEM-03/04/05). No persistence here: each function takes an item and
// returns the next item; the service writes it through the repository.

import type { LedgerItem } from "./ledger-item";
import { DEFAULT_CATEGORY, type OperationType } from "./money";

/** Stable codes for a rejected ledger-item operation; the UI maps each to Ukrainian copy. */
export type LedgerItemErrorCode =
  | "not-found"
  | "invalid-status"
  | "description-required"
  | "amount-invalid"
  | "date-required"
  | "account-not-found";

/** A rejected ledger-item operation, carrying a stable `code` for the error surface. */
export class LedgerItemError extends Error {
  constructor(
    readonly code: LedgerItemErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LedgerItemError";
  }
}

/** Raw edit input from the form: an absolute amount + type yields the signed minor amount. */
export interface LedgerItemEdit {
  description: string;
  /** Absolute amount as entered, e.g. "200,50" or "1 000"; sign comes from `type`. */
  amount: string;
  type: OperationType;
  category: string;
  /** Required operation date (mandatory `occurred_at`, FR-ITEM-03). */
  occurredAt: string;
  /** Target account; the service validates it is an active account. */
  accountId: string;
}

/**
 * Parses an absolute amount string to positive minor units (kopiyky). Accepts a
 * comma or dot decimal separator and space grouping; rejects non-numeric,
 * zero/negative, and over-precise (>2 decimals) input with `amount-invalid`
 * rather than letting a bad value reach the signed-amount CHECK.
 */
export function parseAmountToMinor(raw: string): number {
  const cleaned = (raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new LedgerItemError("amount-invalid", "Невірна сума.");
  }
  const [whole, frac = ""] = cleaned.split(".");
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor <= 0) {
    throw new LedgerItemError("amount-invalid", "Невірна сума.");
  }
  return minor;
}

/**
 * Parses the edit form's operation date, returning null when absent/invalid.
 * `datetime-local` (and `date`) inputs are zoneless; the screen formats them from
 * a UTC wall-clock, so a bare value is normalized to UTC here. This keeps the
 * round-trip stable regardless of server timezone (BC-SCOPE-03 is Europe/Kyiv, not
 * UTC) — saving an item unchanged no longer drifts `occurred_at`. Values that
 * already carry a timezone offset pass through untouched.
 */
function parseOccurredAt(raw: string): Date | null {
  if (!raw) return null;
  let normalized = raw;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) normalized = `${raw}:00Z`;
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) normalized = `${raw}Z`;
  // A date-only value ("YYYY-MM-DD") is already parsed as UTC midnight by spec.
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Validates and applies an edit to a `pending` or `approved` item (FR-ITEM-03).
 * The stored `amount_minor` sign always matches the operation type (expense < 0,
 * income > 0); a blank category defaults to `Без категорії` (FR-CAT-01/03);
 * `occurred_at` is mandatory. Status is preserved — an `approved` item stays
 * `approved`. A `deleted` item cannot be edited. Provenance fields
 * (id, inputEventId, parserRunId, importRowNumber, currency, createdAt) are kept.
 */
export function editLedgerItem(item: LedgerItem, edit: LedgerItemEdit): LedgerItem {
  if (item.status === "deleted") {
    throw new LedgerItemError("invalid-status", "Вилучену операцію не можна редагувати.");
  }

  const description = (edit.description ?? "").trim();
  if (description.length === 0) {
    throw new LedgerItemError("description-required", "Вкажіть опис операції.");
  }

  const magnitude = parseAmountToMinor(edit.amount);
  const amountMinor = edit.type === "expense" ? -magnitude : magnitude;

  const occurredAt = parseOccurredAt(edit.occurredAt);
  if (!occurredAt) {
    throw new LedgerItemError("date-required", "Вкажіть дату операції.");
  }

  const category = (edit.category ?? "").trim() || DEFAULT_CATEGORY;

  return {
    ...item,
    accountId: edit.accountId,
    description,
    amountMinor,
    type: edit.type,
    category,
    occurredAt,
  };
}

/** Approves a `pending` item (FR-ITEM-04); approving a non-pending item is rejected. */
export function approveLedgerItem(item: LedgerItem): LedgerItem {
  if (item.status !== "pending") {
    throw new LedgerItemError(
      "invalid-status",
      "Затвердити можна лише операцію зі статусом «очікує».",
    );
  }
  return { ...item, status: "approved" };
}

/** Soft-deletes an item (FR-ITEM-05); idempotent — deleting a deleted item is a no-op. */
export function deleteLedgerItem(item: LedgerItem): LedgerItem {
  if (item.status === "deleted") return item;
  return { ...item, status: "deleted" };
}

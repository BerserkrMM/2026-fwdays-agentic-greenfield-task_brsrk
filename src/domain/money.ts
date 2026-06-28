// Money model — framework-free (TC-PURE-01).
// v1 is UAH-only (BC-SCOPE-02). Amounts are signed integers in kopiyky:
// expenses are negative, income is positive (per docs/requirements.md).

export const CURRENCY = "UAH" as const;
export type Currency = typeof CURRENCY;

export type OperationType = "expense" | "income";

/** Smallest UAH unit (kopiyky). Signed: expense < 0, income > 0. */
export type AmountMinor = number;

/** Default category text when none is provided (FR-CAT-03). */
export const DEFAULT_CATEGORY = "Без категорії" as const;

/** Sign convention check: an expense amount must be < 0, income > 0. */
export function amountMatchesType(
  amountMinor: AmountMinor,
  type: OperationType,
): boolean {
  return type === "expense" ? amountMinor < 0 : amountMinor > 0;
}

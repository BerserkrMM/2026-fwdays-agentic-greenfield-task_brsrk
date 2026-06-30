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

/**
 * Formats signed kopiyky as Ukrainian-first UAH for display (e.g. "-2 000,50 ₴").
 * Deterministic and locale-independent (plain ASCII spaces, comma decimal),
 * so it is safe to reuse anywhere a balance/aggregate is shown.
 */
export function formatUahMinor(amountMinor: AmountMinor): string {
  const sign = amountMinor < 0 ? "-" : "";
  const absMinor = Math.abs(amountMinor);
  const hryvnia = Math.trunc(absMinor / 100);
  const kopiyky = absMinor % 100;
  // Thousands grouped with a plain ASCII space, chosen for deterministic,
  // locale-independent output (not the uk-UA non-breaking space).
  const grouped = String(hryvnia).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${grouped},${String(kopiyky).padStart(2, "0")} ₴`;
}

// Dashboard view-model — framework-free (TC-PURE-01). Pure transforms over the
// ledger query results into the shapes the read-only `/dashboard` screen renders:
// the expense breakdown (share-of-spend), the monthly trend bars + sufficiency
// decision (FR-DASH-04), and the empty-overview decision (FR-DASH-01). No balance
// math happens here — that stays in the ledger query domain (FR-LEDGER-05).

import type { CategoryTotal, MonthlyTrendPoint } from "@/src/domain/ledger-query";

/** One row of the expense breakdown: a category's spend magnitude and share. */
export interface CategorySlice {
  category: string;
  /** Positive spend magnitude in kopiyky. */
  spendMinor: number;
  /** Integer share of total spend, 0–100. */
  percent: number;
}

/**
 * Expense breakdown grouped by raw category text, including `Без категорії`
 * (FR-DASH-03, FR-CAT-04). Only spending categories (negative totals) are kept;
 * income categories are excluded. Sorted by magnitude (descending, stable), with
 * each share computed against total spend. Empty when there is no spend.
 */
export function toExpenseBreakdown(
  totals: readonly CategoryTotal[],
): CategorySlice[] {
  const spend = totals
    .filter((t) => t.totalMinor < 0)
    .map((t) => ({ category: t.category, spendMinor: -t.totalMinor }));
  const totalSpend = spend.reduce((sum, s) => sum + s.spendMinor, 0);
  if (totalSpend === 0) return [];
  return spend
    .slice()
    .sort((a, b) => b.spendMinor - a.spendMinor)
    .map((s) => ({
      category: s.category,
      spendMinor: s.spendMinor,
      percent: Math.round((s.spendMinor / totalSpend) * 100),
    }));
}

/** One trend column: a month's income/expense and their normalized bar heights. */
export interface TrendBar {
  month: string;
  label: string;
  incomeMinor: number;
  expenseMinor: number;
  /** Bar height as a percentage of the peak magnitude, 0–100. */
  incomeHeightPct: number;
  expenseHeightPct: number;
}

export interface TrendView {
  bars: TrendBar[];
  /** Trends are meaningful only with ≥ 2 distinct months (FR-DASH-04). */
  hasSufficientTrend: boolean;
}

const UK_MONTHS_SHORT = [
  "Січ", "Лют", "Бер", "Кві", "Тра", "Чер",
  "Лип", "Сер", "Вер", "Жов", "Лис", "Гру",
];

/** Maps a `YYYY-MM` key to a Ukrainian short month label (e.g. `2025-06` → `Чер`). */
export function monthLabel(monthKey: string): string {
  const month = Number(monthKey.slice(5, 7));
  return UK_MONTHS_SHORT[month - 1] ?? monthKey;
}

/**
 * Builds the trend view: normalized bar heights against the peak income/expense
 * magnitude, plus the ≥ 2-month sufficiency flag (FR-DASH-04). The caller renders
 * an explicit insufficient-data state when `hasSufficientTrend` is false.
 */
export function toTrendView(points: readonly MonthlyTrendPoint[]): TrendView {
  const peak = points.reduce(
    (max, p) => Math.max(max, p.incomeMinor, Math.abs(p.expenseMinor)),
    0,
  );
  const heightPct = (value: number) =>
    peak === 0 ? 0 : Math.round((value / peak) * 100);
  return {
    hasSufficientTrend: points.length >= 2,
    bars: points.map((p) => ({
      month: p.month,
      label: monthLabel(p.month),
      incomeMinor: p.incomeMinor,
      expenseMinor: p.expenseMinor,
      incomeHeightPct: heightPct(p.incomeMinor),
      expenseHeightPct: heightPct(Math.abs(p.expenseMinor)),
    })),
  };
}

/**
 * Whether the Dashboard has no data to show at all (FR-DASH-01). Derived from the
 * read results — no non-deleted items means no categories and no trend months —
 * so the screen shows an onboarding empty state instead of zeroed figures.
 */
export function isEmptyOverview(
  categoryCount: number,
  trendMonthCount: number,
): boolean {
  return categoryCount === 0 && trendMonthCount === 0;
}

// Ledger query computations — the single, canonical place balances and
// aggregates are derived from ledger items (FR-LEDGER-05). Framework-free
// (TC-PURE-01): pure functions over LedgerItem[], with inclusion decided by the
// shared `affectsBalance` predicate so `pending` + `approved` count and `deleted`
// is excluded everywhere (FR-LEDGER-02). The grouping depends only on the item's
// `accountId`/`category` and status — never on account archive state, so an
// archived account's historical items still contribute (FR-ACCT-05).

import { affectsBalance, type LedgerItem } from "./ledger-item";
import type { AmountMinor } from "./money";

/** A single account's derived balance (no stored value — FR-ACCT-06). */
export interface AccountBalance {
  accountId: string;
  balanceMinor: AmountMinor;
}

/**
 * Income/expense split over non-deleted items (FR-LEDGER-04). `expenseMinor` is
 * kept signed (≤ 0) so `incomeMinor + expenseMinor === netMinor`, and `netMinor`
 * equals the overall balance. The UI formats magnitudes for display.
 */
export interface LedgerAggregates {
  incomeMinor: AmountMinor;
  expenseMinor: AmountMinor;
  netMinor: AmountMinor;
}

/** A per-category total over non-deleted items, grouped by raw text (FR-CAT-04). */
export interface CategoryTotal {
  category: string;
  totalMinor: AmountMinor;
}

/** Non-deleted items only — the inclusion rule for every balance/aggregate. */
function balanceItems(items: readonly LedgerItem[]): readonly LedgerItem[] {
  return items.filter((item) => affectsBalance(item.status));
}

/** Sum of all non-deleted items across accounts (FR-LEDGER-03). */
export function computeOverallBalance(items: readonly LedgerItem[]): AmountMinor {
  return balanceItems(items).reduce((sum, item) => sum + item.amountMinor, 0);
}

/** Sum of one account's non-deleted items (FR-LEDGER-03, FR-ACCT-02). */
export function computeAccountBalance(
  items: readonly LedgerItem[],
  accountId: string,
): AmountMinor {
  return balanceItems(items).reduce(
    (sum, item) => (item.accountId === accountId ? sum + item.amountMinor : sum),
    0,
  );
}

/**
 * Per-account balances over non-deleted items, grouped by `accountId` in
 * first-seen order (FR-LEDGER-03). Independent of account archive state.
 */
export function computeAccountBalances(
  items: readonly LedgerItem[],
): AccountBalance[] {
  const byAccount = new Map<string, AmountMinor>();
  for (const item of balanceItems(items)) {
    byAccount.set(item.accountId, (byAccount.get(item.accountId) ?? 0) + item.amountMinor);
  }
  return [...byAccount].map(([accountId, balanceMinor]) => ({ accountId, balanceMinor }));
}

/** Income/expense aggregates over non-deleted items, by amount sign (FR-LEDGER-04). */
export function computeAggregates(items: readonly LedgerItem[]): LedgerAggregates {
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const item of balanceItems(items)) {
    if (item.amountMinor >= 0) incomeMinor += item.amountMinor;
    else expenseMinor += item.amountMinor;
  }
  return { incomeMinor, expenseMinor, netMinor: incomeMinor + expenseMinor };
}

/**
 * Per-category totals over non-deleted items, grouped by raw `category` text in
 * first-seen order (FR-LEDGER-04, FR-CAT-04). No category table join.
 */
export function computeCategoryTotals(
  items: readonly LedgerItem[],
): CategoryTotal[] {
  const byCategory = new Map<string, AmountMinor>();
  for (const item of balanceItems(items)) {
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.amountMinor);
  }
  return [...byCategory].map(([category, totalMinor]) => ({ category, totalMinor }));
}

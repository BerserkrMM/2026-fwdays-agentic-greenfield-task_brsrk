import { describe, expect, it } from "vitest";
import type { LedgerItem, LedgerItemStatus } from "./ledger-item";
import {
  computeAccountBalance,
  computeAccountBalances,
  computeAggregates,
  computeCategoryTotals,
  computeOverallBalance,
} from "./ledger-query";

let seq = 0;

function item(
  partial: Partial<LedgerItem> & {
    accountId: string;
    amountMinor: number;
    status: LedgerItemStatus;
  },
): LedgerItem {
  seq += 1;
  const amount = partial.amountMinor;
  return {
    id: `item-${seq}`,
    inputEventId: "ev-1",
    parserRunId: null,
    description: `row ${seq}`,
    currency: "UAH",
    type: amount < 0 ? "expense" : "income",
    category: "Без категорії",
    importRowNumber: null,
    occurredAt: null,
    createdAt: new Date(),
    ...partial,
  };
}

// A representative fixture: account a1 has income + expense + a deleted row;
// account a2 has one expense. Deleted rows must never count (FR-LEDGER-02).
const items: LedgerItem[] = [
  item({ accountId: "a1", amountMinor: 10000, status: "pending", category: "Зарплата" }),
  item({ accountId: "a1", amountMinor: -3000, status: "approved", category: "Їжа" }),
  item({ accountId: "a2", amountMinor: -2000, status: "pending", category: "Їжа" }),
  item({ accountId: "a1", amountMinor: -5000, status: "deleted", category: "Їжа" }),
];

describe("ledger-query computations", () => {
  // @trace FR-LEDGER-02
  it("includes pending and approved items and excludes deleted from the overall balance", () => {
    // 10000 + (-3000) + (-2000); the deleted -5000 is excluded
    expect(computeOverallBalance(items)).toBe(5000);
  });

  // @trace FR-LEDGER-03
  it("computes per-account balances over non-deleted items", () => {
    expect(computeAccountBalance(items, "a1")).toBe(7000); // 10000 - 3000
    expect(computeAccountBalance(items, "a2")).toBe(-2000);
  });

  // @trace FR-LEDGER-03
  it("groups balances by accountId, regardless of account state", () => {
    // The domain knows nothing about account archive state — it groups purely by
    // the item's accountId, so an archived account's items still group/sum.
    expect(computeAccountBalances(items)).toEqual([
      { accountId: "a1", balanceMinor: 7000 },
      { accountId: "a2", balanceMinor: -2000 },
    ]);
  });

  // @trace FR-LEDGER-03
  it("returns 0 for an account with only deleted items or no items", () => {
    const onlyDeleted: LedgerItem[] = [
      item({ accountId: "ghost", amountMinor: -4000, status: "deleted" }),
    ];
    expect(computeAccountBalance(onlyDeleted, "ghost")).toBe(0);
    expect(computeAccountBalance(items, "missing")).toBe(0);
  });

  // @trace FR-LEDGER-04
  it("splits income and expense aggregates by amount sign, excluding deleted", () => {
    expect(computeAggregates(items)).toEqual({
      incomeMinor: 10000,
      expenseMinor: -5000, // -3000 + -2000; deleted -5000 excluded
      netMinor: 5000,
    });
  });

  // @trace FR-LEDGER-04, FR-CAT-04
  it("totals by raw category text, excluding deleted", () => {
    expect(computeCategoryTotals(items)).toEqual([
      { category: "Зарплата", totalMinor: 10000 },
      { category: "Їжа", totalMinor: -5000 }, // -3000 + -2000; deleted excluded
    ]);
  });

  // @trace FR-LEDGER-05
  it("treats an empty ledger as all-zero", () => {
    expect(computeOverallBalance([])).toBe(0);
    expect(computeAccountBalances([])).toEqual([]);
    expect(computeAggregates([])).toEqual({ incomeMinor: 0, expenseMinor: 0, netMinor: 0 });
    expect(computeCategoryTotals([])).toEqual([]);
  });
});

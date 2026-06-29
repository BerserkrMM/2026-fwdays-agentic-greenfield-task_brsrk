import { describe, expect, it } from "vitest";
import { computeMonthlyTrends } from "./ledger-query";
import type { LedgerItem } from "./ledger-item";

let seq = 0;
function item(
  amountMinor: number,
  status: LedgerItem["status"],
  dates: { occurredAt?: Date | null; createdAt?: Date },
): LedgerItem {
  seq += 1;
  return {
    id: `i${seq}`,
    accountId: "a1",
    inputEventId: "ev-1",
    parserRunId: null,
    description: `row ${seq}`,
    amountMinor,
    currency: "UAH",
    type: amountMinor < 0 ? "expense" : "income",
    category: "Без категорії",
    confidence: null,
    status,
    importRowNumber: null,
    occurredAt: dates.occurredAt ?? null,
    createdAt: dates.createdAt ?? new Date("2025-01-01T00:00:00Z"),
  };
}

describe("computeMonthlyTrends (FR-DASH-04)", () => {
  // @trace FR-DASH-04, FR-LEDGER-04
  it("groups income/expense by Europe/Kyiv calendar month, ascending, excluding deleted", () => {
    const trends = computeMonthlyTrends([
      item(50000, "approved", { occurredAt: new Date("2025-05-10T08:00:00Z") }),
      item(-20000, "pending", { occurredAt: new Date("2025-05-20T08:00:00Z") }),
      item(-30000, "approved", { occurredAt: new Date("2025-06-01T08:00:00Z") }),
      // deleted item must not contribute
      item(-99999, "deleted", { occurredAt: new Date("2025-06-15T08:00:00Z") }),
    ]);

    expect(trends).toEqual([
      { month: "2025-05", incomeMinor: 50000, expenseMinor: -20000, netMinor: 30000 },
      { month: "2025-06", incomeMinor: 0, expenseMinor: -30000, netMinor: -30000 },
    ]);
  });

  // @trace FR-DASH-04
  it("falls back to createdAt when occurredAt is absent", () => {
    const trends = computeMonthlyTrends([
      item(10000, "pending", { occurredAt: null, createdAt: new Date("2025-03-04T10:00:00Z") }),
    ]);
    expect(trends).toEqual([
      { month: "2025-03", incomeMinor: 10000, expenseMinor: 0, netMinor: 10000 },
    ]);
  });

  // @trace FR-DASH-04, BC-SCOPE-03
  it("buckets by Europe/Kyiv local month, not UTC (late-UTC instant rolls into next Kyiv day)", () => {
    // 2025-05-31T22:30:00Z is 2025-06-01 01:30 in Europe/Kyiv (UTC+3 summer).
    const trends = computeMonthlyTrends([
      item(-1000, "approved", { occurredAt: new Date("2025-05-31T22:30:00Z") }),
    ]);
    expect(trends.map((t) => t.month)).toEqual(["2025-06"]);
  });

  it("returns an empty array when there are no non-deleted items", () => {
    expect(computeMonthlyTrends([])).toEqual([]);
    expect(
      computeMonthlyTrends([
        item(-1000, "deleted", { occurredAt: new Date("2025-06-01T08:00:00Z") }),
      ]),
    ).toEqual([]);
  });
});

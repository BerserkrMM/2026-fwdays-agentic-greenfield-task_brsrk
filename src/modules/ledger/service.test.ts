import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryRepositories } from "@/src/db/memory";
import type { LedgerItem } from "@/src/domain/ledger-item";
import type { Repositories } from "@/src/domain/ports";
import { LedgerQueryService } from "./service";

let repos: Repositories;
let service: LedgerQueryService;
let seq = 0;

function makeItem(
  accountId: string,
  amountMinor: number,
  status: LedgerItem["status"],
  category = "Без категорії",
): LedgerItem {
  seq += 1;
  return {
    id: globalThis.crypto.randomUUID(),
    accountId,
    inputEventId: "ev-1",
    parserRunId: null,
    description: `row ${seq}`,
    amountMinor,
    currency: "UAH",
    type: amountMinor < 0 ? "expense" : "income",
    category,
    confidence: null,
    status,
    importRowNumber: null,
    occurredAt: null,
    createdAt: new Date(),
  };
}

beforeEach(async () => {
  repos = createInMemoryRepositories();
  service = new LedgerQueryService(repos.ledgerItems);
  for (const it of [
    makeItem("a1", 12000, "pending", "Зарплата"),
    makeItem("a1", -2000, "approved", "Їжа"),
    makeItem("a2", -3000, "pending", "Транспорт"),
    makeItem("a1", -9999, "deleted", "Їжа"),
  ]) {
    await repos.ledgerItems.insert(it);
  }
});

describe("LedgerQueryService (over the in-memory repository)", () => {
  // @trace FR-LEDGER-02, FR-LEDGER-03
  it("returns the overall balance from non-deleted items only", async () => {
    expect(await service.getOverallBalance()).toBe(7000); // 12000 - 2000 - 3000
  });

  // @trace FR-LEDGER-03, FR-ACCT-02
  it("returns per-account balances over non-deleted items", async () => {
    expect(await service.getAccountBalances()).toEqual([
      { accountId: "a1", balanceMinor: 10000 },
      { accountId: "a2", balanceMinor: -3000 },
    ]);
    expect(await service.getAccountBalance("a1")).toBe(10000);
    expect(await service.getAccountBalance("a2")).toBe(-3000);
  });

  // @trace FR-LEDGER-04, FR-CAT-04
  it("returns income/expense aggregates and category totals, excluding deleted", async () => {
    expect(await service.getAggregates()).toEqual({
      incomeMinor: 12000,
      expenseMinor: -5000,
      netMinor: 7000,
    });
    expect(await service.getCategoryTotals()).toEqual([
      { category: "Зарплата", totalMinor: 12000 },
      { category: "Їжа", totalMinor: -2000 },
      { category: "Транспорт", totalMinor: -3000 },
    ]);
  });

  // @trace FR-DASH-01, FR-DASH-02, FR-DASH-03, FR-DASH-04, FR-LEDGER-04
  it("returns the whole dashboard summary from a single non-deleted snapshot", async () => {
    const summary = await service.getDashboardSummary();
    expect(summary.overallBalanceMinor).toBe(7000); // 12000 - 2000 - 3000
    expect(summary.aggregates).toEqual({
      incomeMinor: 12000,
      expenseMinor: -5000,
      netMinor: 7000,
    });
    expect(summary.categoryTotals).toEqual([
      { category: "Зарплата", totalMinor: 12000 },
      { category: "Їжа", totalMinor: -2000 },
      { category: "Транспорт", totalMinor: -3000 },
    ]);
    // All seeded items share the current month (occurredAt null → createdAt now),
    // so they fold into a single trend point; precise grouping is covered by the
    // domain test. Deleted items are excluded from every figure.
    expect(summary.trends).toHaveLength(1);
    expect(summary.trends[0]).toMatchObject({
      incomeMinor: 12000,
      expenseMinor: -5000,
      netMinor: 7000,
    });
    expect(summary.trends[0].month).toMatch(/^\d{4}-\d{2}$/);
  });
});

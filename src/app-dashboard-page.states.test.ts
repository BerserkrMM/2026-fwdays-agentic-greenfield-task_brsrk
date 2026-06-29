import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LedgerAggregates, CategoryTotal, MonthlyTrendPoint } from "@/src/domain/ledger-query";
import { collectServerTreeText as collectText } from "@/src/test-support/server-tree";

// Drives the Dashboard server component through its degraded/empty data states
// (FR-SHELL-03) by controlling what the ledger query port returns/throws per
// test, so the partial/error/insufficient branches are exercised deterministically.

type Behavior = {
  getOverallBalance: () => Promise<number>;
  getAggregates: () => Promise<LedgerAggregates>;
  getCategoryTotals: () => Promise<CategoryTotal[]>;
  getMonthlyTrends: () => Promise<MonthlyTrendPoint[]>;
};

const behavior: Behavior = {
  getOverallBalance: async () => 1000,
  getAggregates: async () => ({ incomeMinor: 1000, expenseMinor: 0, netMinor: 1000 }),
  getCategoryTotals: async () => [],
  getMonthlyTrends: async () => [],
};

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => ({
    type: "a",
    props: { href, children },
  }),
}));

vi.mock("@/src/db/client", () => ({
  getRepositories: () => ({ ledgerItems: {} }),
}));

vi.mock("@/src/modules/ledger/service", () => ({
  LedgerQueryService: class {
    getOverallBalance() {
      return behavior.getOverallBalance();
    }
    getAggregates() {
      return behavior.getAggregates();
    }
    getCategoryTotals() {
      return behavior.getCategoryTotals();
    }
    getMonthlyTrends() {
      return behavior.getMonthlyTrends();
    }
  },
}));

async function renderDashboard(): Promise<string> {
  const { default: DashboardPage } = await import("@/app/dashboard/page");
  return collectText(await DashboardPage());
}

beforeEach(() => {
  behavior.getOverallBalance = async () => 1000;
  behavior.getAggregates = async () => ({ incomeMinor: 1000, expenseMinor: 0, netMinor: 1000 });
  behavior.getCategoryTotals = async () => [];
  behavior.getMonthlyTrends = async () => [];
});

afterEach(() => {
  vi.resetModules();
});

describe("DashboardPage data states (FR-SHELL-03)", () => {
  // @trace FR-SHELL-03, FR-DASH-05
  it("shows the error state with a retry link when the primary balance read fails", async () => {
    behavior.getOverallBalance = async () => {
      throw new Error("db down");
    };
    const text = await renderDashboard();
    expect(text).toContain("Не вдалося завантажити огляд");
    expect(text).toContain("/dashboard"); // read-only retry, never a mutation
  });

  // @trace FR-SHELL-03
  it("shows a partial banner and «—» placeholders when an aggregate read fails", async () => {
    behavior.getCategoryTotals = async () => [{ category: "Їжа", totalMinor: -500 }];
    behavior.getMonthlyTrends = async () => [
      { month: "2025-05", incomeMinor: 1000, expenseMinor: -500, netMinor: 500 },
      { month: "2025-06", incomeMinor: 2000, expenseMinor: -300, netMinor: 1700 },
    ];
    behavior.getAggregates = async () => {
      throw new Error("aggregate down");
    };
    const text = await renderDashboard();
    expect(text).toContain("Показано частину огляду");
    expect(text).toContain("—"); // income/expense fall back to a placeholder
  });

  // @trace FR-SHELL-03
  it("marks failed sections as unavailable (not empty/insufficient) when reads fail but balance succeeds", async () => {
    behavior.getCategoryTotals = async () => {
      throw new Error("categories down");
    };
    behavior.getMonthlyTrends = async () => {
      throw new Error("trends down");
    };
    const text = await renderDashboard();
    // Not treated as the onboarding empty state — the reads failed, so it is partial,
    // and each failed section says "unavailable" rather than masquerading as "no data".
    expect(text).toContain("Показано частину огляду");
    expect(text).toContain("Не вдалося завантажити цей розділ");
    // The misleading "no data yet" copy must NOT appear for a failed read.
    expect(text).not.toContain("Ще немає витрат для розподілу");
    expect(text).not.toContain("Замало даних для тренду");
  });

  // @trace FR-DASH-03, FR-DASH-04
  it("shows breakdown-empty and insufficient-trend states with income-only, single-month data", async () => {
    behavior.getCategoryTotals = async () => [{ category: "Зарплата", totalMinor: 1000 }];
    behavior.getMonthlyTrends = async () => [
      { month: "2025-06", incomeMinor: 1000, expenseMinor: 0, netMinor: 1000 },
    ];
    const text = await renderDashboard();
    expect(text).toContain("Ще немає витрат для розподілу");
    expect(text).toContain("Замало даних для тренду");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardSummary } from "@/src/domain/ledger-query";
import { collectServerTreeText as collectText } from "@/src/test-support/server-tree";

// Drives the Dashboard server component through its empty/insufficient/error
// states (FR-SHELL-03, FR-DASH-04) by controlling the single dashboard-summary
// read. Because every figure comes from one snapshot, a read either fully
// succeeds or fails as a whole — there is no per-section partial state.

let summary: () => Promise<DashboardSummary>;

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
    getDashboardSummary() {
      return summary();
    }
  },
}));

async function renderDashboard(): Promise<string> {
  const { default: DashboardPage } = await import("@/app/dashboard/page");
  return collectText(await DashboardPage());
}

beforeEach(() => {
  summary = async () => ({
    overallBalanceMinor: 1000,
    aggregates: { incomeMinor: 1000, expenseMinor: 0, netMinor: 1000 },
    categoryTotals: [{ category: "Зарплата", totalMinor: 1000 }],
    trends: [{ month: "2025-06", incomeMinor: 1000, expenseMinor: 0, netMinor: 1000 }],
  });
});

afterEach(() => {
  vi.resetModules();
});

describe("DashboardPage data states (FR-SHELL-03)", () => {
  // @trace FR-SHELL-03, FR-DASH-05
  it("shows the error state with a read-only retry link when the snapshot read fails", async () => {
    summary = async () => {
      throw new Error("db down");
    };
    const text = await renderDashboard();
    expect(text).toContain("Не вдалося завантажити огляд");
    expect(text).toContain("/dashboard"); // read-only retry, never a mutation
  });

  // @trace FR-DASH-03, FR-DASH-04
  it("shows breakdown-empty and insufficient-trend states with income-only, single-month data", async () => {
    // Defaults from beforeEach: one income category, one month → no spend, <2 months.
    const text = await renderDashboard();
    expect(text).toContain("Ще немає витрат для розподілу");
    expect(text).toContain("Замало даних для тренду");
  });
});

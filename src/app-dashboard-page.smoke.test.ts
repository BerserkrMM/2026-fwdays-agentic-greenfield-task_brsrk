import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRepositories, resetDbBoundaryForTests } from "@/src/db/client";
import type { LedgerItem } from "@/src/domain/ledger-item";
import { collectServerTreeText as collectText } from "@/src/test-support/server-tree";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => ({
    type: "a",
    props: { href, children },
  }),
}));

let seq = 0;
function item(amountMinor: number, category: string, occurredAt: Date): LedgerItem {
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
    category,
    confidence: null,
    status: "pending",
    importRowNumber: null,
    occurredAt,
    createdAt: occurredAt,
  };
}

beforeEach(async () => {
  delete process.env.DATABASE_URL;
  await resetDbBoundaryForTests();
});

afterEach(async () => {
  await resetDbBoundaryForTests();
});

describe("DashboardPage (read-only overview)", () => {
  // @trace FR-DASH-01, FR-DASH-02, FR-DASH-03, FR-DASH-04
  it("renders the balance, totals, category breakdown and trend from non-deleted items", async () => {
    const repos = getRepositories();
    await repos.ledgerItems.insert(item(50000, "Зарплата", new Date("2025-05-10T08:00:00Z")));
    await repos.ledgerItems.insert(item(-6000, "Їжа", new Date("2025-05-12T08:00:00Z")));
    await repos.ledgerItems.insert(item(-4000, "Транспорт", new Date("2025-06-02T08:00:00Z")));

    const { default: DashboardPage } = await import("@/app/dashboard/page");
    const text = collectText(await DashboardPage());

    expect(text).toContain("Огляд фінансів");
    expect(text).toContain("400,00 ₴"); // overall balance 40 000,00 grouped
    expect(text).toContain("Їжа");
    expect(text).toContain("Транспорт");
  });

  // @trace FR-DASH-01, FR-SHELL-03
  it("shows an onboarding empty state when there are no non-deleted items", async () => {
    getRepositories(); // initialize empty in-memory repo

    const { default: DashboardPage } = await import("@/app/dashboard/page");
    const text = collectText(await DashboardPage());

    expect(text).toContain("Ще немає операцій");
    expect(text).toContain("/imports");
  });
});

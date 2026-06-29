import { describe, expect, it } from "vitest";
import type { LedgerItem } from "./ledger-item";
import { DEFAULT_PAGE_SIZE, selectLedgerPage } from "./ledger-filter";

function item(overrides: Partial<LedgerItem> & { id: string }): LedgerItem {
  return {
    id: overrides.id,
    accountId: overrides.accountId ?? "acc-1",
    inputEventId: "evt-1",
    parserRunId: null,
    description: overrides.description ?? "опис",
    amountMinor: overrides.amountMinor ?? -1000,
    currency: "UAH",
    type: overrides.type ?? "expense",
    category: overrides.category ?? "Їжа",
    confidence: null,
    status: overrides.status ?? "pending",
    importRowNumber: null,
    occurredAt: overrides.occurredAt ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00Z"),
  };
}

const d = (iso: string) => new Date(iso);

// @trace FR-ITEM-01, FR-ITEM-02
describe("selectLedgerPage", () => {
  it("sorts newest-first by effective date (occurredAt ?? createdAt) with id tiebreak", () => {
    const items = [
      item({ id: "a", occurredAt: d("2026-03-01T00:00:00Z") }),
      item({ id: "b", occurredAt: d("2026-05-01T00:00:00Z") }),
      // no occurredAt → falls back to createdAt (newest of all)
      item({ id: "c", occurredAt: null, createdAt: d("2026-06-01T00:00:00Z") }),
    ];
    const page = selectLedgerPage(items, {});
    expect(page.items.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });

  it("breaks ties on equal effective date by id descending", () => {
    const when = d("2026-04-01T00:00:00Z");
    const items = [
      item({ id: "a1", occurredAt: when }),
      item({ id: "a3", occurredAt: when }),
      item({ id: "a2", occurredAt: when }),
    ];
    const page = selectLedgerPage(items, {});
    expect(page.items.map((i) => i.id)).toEqual(["a3", "a2", "a1"]);
  });

  it("filters by status, type, account and combines them", () => {
    const items = [
      item({ id: "keep", status: "approved", type: "income", amountMinor: 500, accountId: "acc-9" }),
      item({ id: "wrong-status", status: "pending", type: "income", amountMinor: 500, accountId: "acc-9" }),
      item({ id: "wrong-type", status: "approved", type: "expense", amountMinor: -500, accountId: "acc-9" }),
      item({ id: "wrong-acc", status: "approved", type: "income", amountMinor: 500, accountId: "acc-1" }),
    ];
    const page = selectLedgerPage(items, {
      status: "approved",
      type: "income",
      accountId: "acc-9",
    });
    expect(page.items.map((i) => i.id)).toEqual(["keep"]);
  });

  it("keeps deleted items available so the journal can show the log", () => {
    const items = [
      item({ id: "del", status: "deleted" }),
      item({ id: "live", status: "pending" }),
    ];
    expect(selectLedgerPage(items, {}).matched).toBe(2);
    expect(selectLedgerPage(items, { status: "deleted" }).items.map((i) => i.id)).toEqual(["del"]);
  });

  it("searches description case-insensitively and filters category by contains", () => {
    const items = [
      item({ id: "milk", description: "Молоко та хліб", category: "Продукти" }),
      item({ id: "taxi", description: "Таксі додому", category: "Транспорт" }),
    ];
    expect(selectLedgerPage(items, { search: "МОЛОКО" }).items.map((i) => i.id)).toEqual(["milk"]);
    expect(selectLedgerPage(items, { category: "транспорт" }).items.map((i) => i.id)).toEqual(["taxi"]);
  });

  it("filters by occurred_at date range inclusive on the effective date", () => {
    const items = [
      item({ id: "before", occurredAt: d("2026-01-10T00:00:00Z") }),
      item({ id: "inside", occurredAt: d("2026-02-15T00:00:00Z") }),
      item({ id: "after", occurredAt: d("2026-03-20T00:00:00Z") }),
    ];
    const page = selectLedgerPage(items, {
      from: d("2026-02-01T00:00:00Z"),
      to: d("2026-02-28T23:59:59Z"),
    });
    expect(page.items.map((i) => i.id)).toEqual(["inside"]);
  });

  it("paginates cumulatively and reports total/matched/hasMore", () => {
    const items = Array.from({ length: 25 }, (_, n) =>
      item({ id: String(n).padStart(2, "0"), occurredAt: d(`2026-01-${String(n + 1).padStart(2, "0")}T00:00:00Z`) }),
    );
    const firstPage = selectLedgerPage(items, {});
    expect(firstPage.items).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(firstPage.total).toBe(25);
    expect(firstPage.matched).toBe(25);
    expect(firstPage.hasMore).toBe(true);

    const more = selectLedgerPage(items, { limit: 20 });
    expect(more.items).toHaveLength(20);
    expect(more.hasMore).toBe(true);

    const all = selectLedgerPage(items, { limit: 30 });
    expect(all.items).toHaveLength(25);
    expect(all.hasMore).toBe(false);
  });
});

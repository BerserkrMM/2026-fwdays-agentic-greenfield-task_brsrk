import { describe, expect, it } from "vitest";
import {
  emptyStateKind,
  firstParam,
  hasActiveFilters,
  loadMoreHref,
  parseLedgerParams,
} from "./ledger-params";

// @trace FR-ITEM-01, FR-ITEM-02
describe("parseLedgerParams", () => {
  it("parses every supported filter into the domain filter + echoed raw map", () => {
    const { filter, raw } = parseLedgerParams({
      status: "approved",
      type: "income",
      account: "acc-1",
      category: "Кафе",
      q: "кава",
      from: "2026-02-01",
      to: "2026-02-28",
      limit: "30",
    });
    expect(filter.status).toBe("approved");
    expect(filter.type).toBe("income");
    expect(filter.accountId).toBe("acc-1");
    expect(filter.category).toBe("Кафе");
    expect(filter.search).toBe("кава");
    expect(filter.from?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(filter.to?.toISOString()).toBe("2026-02-28T23:59:59.999Z");
    expect(filter.limit).toBe(30);
    expect(raw).toEqual({
      status: "approved",
      type: "income",
      account: "acc-1",
      category: "Кафе",
      q: "кава",
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("drops invalid status/type, non-positive limit, and bad dates without throwing", () => {
    const { filter, raw } = parseLedgerParams({
      status: "bogus",
      type: "weird",
      limit: "-5",
      from: "not-a-date",
    });
    expect(filter.status).toBeUndefined();
    expect(filter.type).toBeUndefined();
    expect(filter.limit).toBeUndefined();
    expect(filter.from).toBeUndefined();
    expect(raw).toEqual({});
  });

  it("takes the first value of a repeated param and ignores empty strings", () => {
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam("  ")).toBeUndefined();
    expect(firstParam(undefined)).toBeUndefined();
  });
});

// @trace FR-ITEM-01
describe("emptyStateKind / hasActiveFilters", () => {
  it("returns null when there are results", () => {
    expect(emptyStateKind(3, {})).toBeNull();
  });

  it("distinguishes an empty journal from a no-match filter", () => {
    expect(emptyStateKind(0, {})).toBe("empty");
    expect(emptyStateKind(0, { status: "deleted" })).toBe("filtered");
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ q: "x" })).toBe(true);
  });
});

// @trace FR-ITEM-01
describe("loadMoreHref", () => {
  it("grows the cumulative limit by 10 while preserving active filters", () => {
    const href = loadMoreHref({ status: "pending", q: "кава" }, 20);
    const url = new URL(href, "https://example.test");
    expect(url.pathname).toBe("/ledger");
    expect(url.searchParams.get("status")).toBe("pending");
    expect(url.searchParams.get("q")).toBe("кава");
    expect(url.searchParams.get("limit")).toBe("30");
  });

  it("starts at 10 when nothing is shown yet", () => {
    const url = new URL(loadMoreHref({}, 0), "https://example.test");
    expect(url.searchParams.get("limit")).toBe("10");
  });
});

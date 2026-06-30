import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRepositories, resetDbBoundaryForTests } from "@/src/db/client";
import type { LedgerItem } from "@/src/domain/ledger-item";

let savedDatabaseUrl: string | undefined;

beforeEach(async () => {
  savedDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL; // force the in-memory fallback
  await resetDbBoundaryForTests();
});

afterEach(async () => {
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
  await resetDbBoundaryForTests();
});

function ledgerItem(overrides: Partial<LedgerItem> = {}): LedgerItem {
  return {
    id: "i1",
    accountId: "acc-1",
    inputEventId: "ev-1",
    parserRunId: null,
    description: "кава",
    amountMinor: -6000,
    currency: "UAH",
    type: "expense",
    category: "Їжа",
    confidence: null,
    status: "pending",
    importRowNumber: null,
    occurredAt: new Date("2025-05-12T08:00:00Z"),
    createdAt: new Date("2025-05-12T08:00:00Z"),
    ...overrides,
  };
}

describe("GET /settings/export (FR-SET-03)", () => {
  // @trace FR-SET-03
  it("returns a CSV download and mutates nothing", async () => {
    const repos = getRepositories();
    await repos.ledgerItems.insert(ledgerItem());
    const before = (await repos.ledgerItems.listAll()).length;

    const { GET } = await import("@/app/settings/export/route");
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toContain("text/csv");
    expect(res.headers.get("content-disposition") ?? "").toContain("attachment");
    expect(res.headers.get("content-disposition") ?? "").toContain("filename");

    const body = await res.text();
    expect(body).toContain("кава");
    expect(body).toContain("-60.00");

    const after = (await repos.ledgerItems.listAll()).length;
    expect(after).toBe(before);
  });
});

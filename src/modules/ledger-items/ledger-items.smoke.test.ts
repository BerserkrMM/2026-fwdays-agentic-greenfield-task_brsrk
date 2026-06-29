import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRepositories, resetDbBoundaryForTests } from "@/src/db/client";
import type { ParsedLedgerItemDraft } from "@/src/domain/parsed-draft";
import { AccountsService } from "@/src/modules/accounts/service";
import { ItemCreationService } from "@/src/modules/foundation/item-creation";
import { LedgerQueryService } from "@/src/modules/ledger/service";
import { LedgerItemsService } from "./service";

const original = process.env.DATABASE_URL;

beforeEach(async () => {
  await resetDbBoundaryForTests();
  delete process.env.DATABASE_URL;
});

afterEach(async () => {
  await resetDbBoundaryForTests();
  if (original === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = original;
});

function draft(amountMinor: number, description: string): ParsedLedgerItemDraft {
  return {
    description,
    amountMinor,
    currency: "UAH",
    type: amountMinor < 0 ? "expense" : "income",
    category: "Покупки",
  };
}

// @trace FR-ITEM-01, FR-ITEM-03, FR-ITEM-04, FR-ITEM-05, FR-LEDGER-05
describe("ledger-items review boundary smoke (in-memory fallback, TC-DATA-01)", () => {
  it("lists, edits, approves and soft-deletes items through the shared DB boundary", async () => {
    const repos = getRepositories();
    const accounts = new AccountsService(repos.accounts);
    const creation = new ItemCreationService(repos, accounts);
    const ledger = new LedgerQueryService(repos.ledgerItems);
    const review = new LedgerItemsService(repos.ledgerItems, repos.accounts);

    await accounts.ensureSeededDefault();
    const event = await repos.inputEvents.create({
      source: "text",
      provider: null,
      rawText: "seed",
      storageUri: null,
      mimeType: null,
    });

    const a = await creation.createPendingItem({ draft: draft(-3000, "Обід"), inputEventId: event.id });
    const b = await creation.createPendingItem({ draft: draft(10000, "Премія"), inputEventId: event.id });

    // Initial balance counts both pending items (FR-LEDGER-05): 10000 - 3000.
    expect(await ledger.getOverallBalance()).toBe(7000);

    // Edit + approve item a.
    const edited = await review.editItem(a.id, {
      description: "Обід у місті",
      amount: "35,00",
      type: "expense",
      category: "Кафе",
      occurredAt: "2026-03-05T13:00",
      accountId: a.accountId,
    });
    expect(edited.amountMinor).toBe(-3500);
    expect((await review.approveItem(a.id)).status).toBe("approved");
    expect(await ledger.getOverallBalance()).toBe(6500); // 10000 - 3500

    // Soft-delete item b: it leaves the balance but stays in the journal log.
    await review.deleteItem(b.id);
    expect(await ledger.getOverallBalance()).toBe(-3500); // only item a remains
    const page = await review.listPage({});
    expect(page.items.map((i) => i.id)).toContain(b.id);
    expect(page.items.find((i) => i.id === b.id)?.status).toBe("deleted");

    // The deleted item is filterable as a log.
    const deletedOnly = await review.listPage({ status: "deleted" });
    expect(deletedOnly.items.map((i) => i.id)).toEqual([b.id]);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRepositories, resetDbBoundaryForTests } from "@/src/db/client";
import { ItemCreationService } from "@/src/modules/foundation/item-creation";
import { AccountsService } from "@/src/modules/accounts/service";
import type { ParsedLedgerItemDraft } from "@/src/domain/parsed-draft";
import { LedgerQueryService } from "./service";

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

function draft(amountMinor: number, category: string): ParsedLedgerItemDraft {
  return {
    description: category,
    amountMinor,
    currency: "UAH",
    type: amountMinor < 0 ? "expense" : "income",
    category,
  };
}

// @trace FR-LEDGER-02, FR-LEDGER-03, FR-LEDGER-04, FR-LEDGER-05, FR-ACCT-02, FR-ACCT-05
describe("ledger balance boundary smoke (in-memory fallback, TC-DATA-01)", () => {
  it("derives balances from ledger_items and keeps archived accounts' items counting", async () => {
    const repos = getRepositories();
    const accounts = new AccountsService(repos.accounts);
    const itemCreation = new ItemCreationService(repos, accounts);
    const ledger = new LedgerQueryService(repos.ledgerItems);

    const cash = await accounts.ensureSeededDefault();
    const card = await accounts.createAccount("Картка");

    const event = await repos.inputEvents.create({
      source: "text",
      provider: null,
      rawText: "seed",
      storageUri: null,
      mimeType: null,
    });

    // Card: +50000 income, -20000 expense. Cash: -10000 expense.
    await itemCreation.createPendingItem({
      draft: draft(50000, "Зарплата"),
      inputEventId: event.id,
      accountId: card.id,
    });
    await itemCreation.createPendingItem({
      draft: draft(-20000, "Покупки"),
      inputEventId: event.id,
      accountId: card.id,
    });
    await itemCreation.createPendingItem({
      draft: draft(-10000, "Їжа"),
      inputEventId: event.id,
      accountId: cash.id,
    });

    // Balances are derived purely from ledger_items (FR-LEDGER-05).
    expect(await ledger.getOverallBalance()).toBe(20000); // 50000 - 20000 - 10000
    expect(await ledger.getAccountBalance(card.id)).toBe(30000);
    expect(await ledger.getAccountBalance(cash.id)).toBe(-10000);

    // Archive the (non-default, not-last) card account.
    const archived = await accounts.archiveAccount(card.id);
    expect(archived.archivedAt).not.toBeNull();
    expect((await accounts.listActive()).map((a) => a.id)).toEqual([cash.id]);

    // Regression: the archived account's historical items still contribute to
    // both its per-account balance and the overall balance (FR-ACCT-05).
    expect(await ledger.getAccountBalance(card.id)).toBe(30000);
    expect(await ledger.getOverallBalance()).toBe(20000);
    expect(await ledger.getAccountBalances()).toEqual(
      expect.arrayContaining([{ accountId: card.id, balanceMinor: 30000 }]),
    );
  });
});

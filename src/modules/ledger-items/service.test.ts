import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryRepositories } from "@/src/db/memory";
import type { ParsedLedgerItemDraft } from "@/src/domain/parsed-draft";
import type { Repositories } from "@/src/domain/ports";
import { LedgerItemError } from "@/src/domain/ledger-item-edit";
import { AccountsService } from "@/src/modules/accounts/service";
import { ItemCreationService } from "@/src/modules/foundation/item-creation";
import { LedgerItemsService } from "./service";

function draft(amountMinor: number, description: string): ParsedLedgerItemDraft {
  return {
    description,
    amountMinor,
    currency: "UAH",
    type: amountMinor < 0 ? "expense" : "income",
    category: amountMinor < 0 ? "Покупки" : "Дохід",
  };
}

let repos: Repositories;
let accounts: AccountsService;
let creation: ItemCreationService;
let service: LedgerItemsService;
let cashId: string;
let eventId: string;

beforeEach(async () => {
  repos = createInMemoryRepositories();
  accounts = new AccountsService(repos.accounts);
  creation = new ItemCreationService(repos, accounts);
  service = new LedgerItemsService(repos.ledgerItems, repos.accounts);
  const cash = await accounts.ensureSeededDefault();
  cashId = cash.id;
  const event = await repos.inputEvents.create({
    source: "text",
    provider: null,
    rawText: "seed",
    storageUri: null,
    mimeType: null,
  });
  eventId = event.id;
});

async function create(amountMinor: number, description: string) {
  return creation.createPendingItem({ draft: draft(amountMinor, description), inputEventId: eventId });
}

// @trace FR-ITEM-01, FR-ITEM-02
describe("LedgerItemsService.listPage", () => {
  it("returns a filtered, paginated page over all items", async () => {
    await create(-1000, "Кава");
    await create(5000, "Зарплата");
    await create(-2000, "Таксі");

    const all = await service.listPage({});
    expect(all.total).toBe(3);

    const income = await service.listPage({ type: "income" });
    expect(income.items.map((i) => i.description)).toEqual(["Зарплата"]);

    const search = await service.listPage({ search: "так" });
    expect(search.items.map((i) => i.description)).toEqual(["Таксі"]);
  });
});

// @trace FR-ITEM-03
describe("LedgerItemsService.editItem", () => {
  it("edits an item and validates the chosen account is active", async () => {
    const created = await create(-1000, "Кава");
    const card = await accounts.createAccount("Картка");

    const edited = await service.editItem(created.id, {
      description: "Кава велика",
      amount: "45,00",
      type: "expense",
      category: "Кафе",
      occurredAt: "2026-03-02T08:30",
      accountId: card.id,
    });
    expect(edited.description).toBe("Кава велика");
    expect(edited.amountMinor).toBe(-4500);
    expect(edited.accountId).toBe(card.id);

    const persisted = await repos.ledgerItems.findById(created.id);
    expect(persisted?.amountMinor).toBe(-4500);
  });

  it("rejects an unknown item id", async () => {
    await expect(
      service.editItem("22222222-2222-2222-2222-222222222222", {
        description: "x",
        amount: "1",
        type: "expense",
        category: "Кафе",
        occurredAt: "2026-03-02T08:30",
        accountId: cashId,
      }),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("leaves the stored item unchanged when an edit is invalid (no partial persist)", async () => {
    const created = await create(-1000, "Кава");
    await expect(
      service.editItem(created.id, {
        description: "Кава",
        amount: "not-a-number",
        type: "expense",
        category: "Кафе",
        occurredAt: "2026-03-02T08:30",
        accountId: cashId,
      }),
    ).rejects.toMatchObject({ code: "amount-invalid" });
    const persisted = await repos.ledgerItems.findById(created.id);
    expect(persisted?.amountMinor).toBe(-1000);
    expect(persisted?.description).toBe("Кава");
  });

  it("rejects editing onto an archived account", async () => {
    const created = await create(-1000, "Кава");
    const card = await accounts.createAccount("Картка");
    await accounts.archiveAccount(card.id);
    await expect(
      service.editItem(created.id, {
        description: "Кава",
        amount: "10",
        type: "expense",
        category: "Кафе",
        occurredAt: "2026-03-02T08:30",
        accountId: card.id,
      }),
    ).rejects.toMatchObject({ code: "account-not-found" });
  });
});

// @trace FR-ITEM-04, FR-ITEM-05
describe("LedgerItemsService approve/delete", () => {
  it("approves a pending item and rejects re-approval", async () => {
    const created = await create(-1000, "Кава");
    expect((await service.approveItem(created.id)).status).toBe("approved");
    await expect(service.approveItem(created.id)).rejects.toBeInstanceOf(LedgerItemError);
  });

  it("soft-deletes idempotently and keeps the row as a log", async () => {
    const created = await create(-1000, "Кава");
    expect((await service.deleteItem(created.id)).status).toBe("deleted");
    expect((await service.deleteItem(created.id)).status).toBe("deleted");
    const all = await service.listPage({});
    expect(all.items.map((i) => i.id)).toContain(created.id);
  });
});

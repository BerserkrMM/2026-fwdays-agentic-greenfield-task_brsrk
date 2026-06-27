import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryRepositories } from "@/src/db/memory";
import {
  type AccountsPort,
  MissingInputEventError,
  NoDefaultAccountError,
  type Repositories,
} from "@/src/domain/ports";
import type { ParsedLedgerItemDraft } from "@/src/domain/parsed-draft";
import { ItemCreationService } from "./item-creation";

const draft: ParsedLedgerItemDraft = {
  description: "ковбаса",
  amountMinor: -4000,
  currency: "UAH",
  type: "expense",
  category: "Їжа",
};

function accountsPort(id: string | null): AccountsPort {
  return { getDefaultAccountId: async () => id };
}

let repos: Repositories;

beforeEach(() => {
  repos = createInMemoryRepositories();
});

async function seedInputEvent(): Promise<string> {
  const event = await repos.inputEvents.create({
    source: "text",
    provider: null,
    rawText: "40 грн ковбаса",
    storageUri: null,
    mimeType: null,
  });
  return event.id;
}

describe("ItemCreationService", () => {
  it("creates a pending item linked to its input event", async () => {
    const inputEventId = await seedInputEvent();
    const service = new ItemCreationService(repos, accountsPort("acc-1"));

    const item = await service.createPendingItem({
      draft,
      inputEventId,
      accountId: "acc-1",
    });

    expect(item.status).toBe("pending");
    expect(item.amountMinor).toBe(-4000);
    expect(item.currency).toBe("UAH");
    expect(item.type).toBe("expense");
    expect(item.category).toBe("Їжа");
    expect(item.accountId).toBe("acc-1");
    expect(item.inputEventId).toBe(inputEventId);
    expect(await repos.ledgerItems.findById(item.id)).not.toBeNull();
  });

  it("resolves the default account when none is supplied (FR-ITEM-06)", async () => {
    const inputEventId = await seedInputEvent();
    const service = new ItemCreationService(repos, accountsPort("default-acc"));

    const item = await service.createPendingItem({ draft, inputEventId });

    expect(item.accountId).toBe("default-acc");
  });

  it("fails cleanly when no account is available", async () => {
    const inputEventId = await seedInputEvent();
    const service = new ItemCreationService(repos, accountsPort(null));

    await expect(
      service.createPendingItem({ draft, inputEventId }),
    ).rejects.toBeInstanceOf(NoDefaultAccountError);
  });

  it("defaults the category to «Без категорії» when empty (FR-CAT-03)", async () => {
    const inputEventId = await seedInputEvent();
    const service = new ItemCreationService(repos, accountsPort("acc-1"));

    const item = await service.createPendingItem({
      draft: { ...draft, category: "  " },
      inputEventId,
    });

    expect(item.category).toBe("Без категорії");
  });

  it("rejects a reference to a missing input event", async () => {
    const service = new ItemCreationService(repos, accountsPort("acc-1"));

    await expect(
      service.createPendingItem({ draft, inputEventId: "does-not-exist" }),
    ).rejects.toBeInstanceOf(MissingInputEventError);
  });

  it("carries the bank source row number onto the item (FR-BANK-06)", async () => {
    const inputEventId = await seedInputEvent();
    const service = new ItemCreationService(repos, accountsPort("acc-1"));

    const item = await service.createPendingItem({
      draft: { ...draft, sourceRef: { rowNumber: 7 } },
      inputEventId,
    });

    expect(item.importRowNumber).toBe(7);
  });
});

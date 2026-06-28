import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryRepositories } from "@/src/db/memory";
import { AccountError, CASH_ACCOUNT_NAME } from "@/src/domain/account";
import type { Account } from "@/src/domain/account";
import type { AccountRepository, Repositories } from "@/src/domain/ports";
import { AccountsService } from "./service";

let repos: Repositories;
let service: AccountsService;

beforeEach(() => {
  repos = createInMemoryRepositories();
  service = new AccountsService(repos.accounts);
});

function caught(p: Promise<unknown>): Promise<unknown> {
  return p.then(
    () => null,
    (e) => e,
  );
}

function account(name: string, isDefault = false, archivedAt: Date | null = null): Account {
  return {
    id: globalThis.crypto.randomUUID(),
    name,
    currency: "UAH",
    isDefault,
    archivedAt,
    createdAt: new Date(),
  };
}

describe("AccountsService", () => {
  // @trace FR-ACCT-06, FR-ITEM-06
  it("seeds a single default Готівка (UAH) account at first run", async () => {
    const seeded = await service.ensureSeededDefault();
    expect(seeded.name).toBe(CASH_ACCOUNT_NAME);
    expect(seeded.isDefault).toBe(true);
    expect(seeded.currency).toBe("UAH");
    expect(await service.getDefaultAccountId()).toBe(seeded.id);
  });

  // @trace FR-ACCT-06
  it("ensureSeededDefault is idempotent (one account, same id)", async () => {
    const a = await service.ensureSeededDefault();
    const b = await service.ensureSeededDefault();
    expect(b.id).toBe(a.id);
    expect((await service.listActive()).length).toBe(1);
  });

  // @trace FR-ITEM-06, FR-ACCT-01
  it("getDefaultAccountId resolves the default even before an explicit seed", async () => {
    const id = await service.getDefaultAccountId();
    expect(id).toBeTruthy();
    const def = (await service.listActive()).find((a) => a.isDefault);
    expect(def?.id).toBe(id);
  });

  // @trace FR-ACCT-01
  it("lists active accounts with exactly one default", async () => {
    await service.ensureSeededDefault();
    await service.createAccount("Картка");
    const active = await service.listActive();
    expect(active.length).toBe(2);
    expect(active.filter((a) => a.isDefault).length).toBe(1);
  });

  // @trace FR-ACCT-04
  it("retries first-default creation as non-default after a default conflict", async () => {
    const existingDefault = account("Готівка", true);
    const inserted: Account[] = [];
    let defaultLookups = 0;
    const repo: AccountRepository = {
      list: async () => [],
      findById: async () => null,
      findDefault: async () => (++defaultLookups === 1 ? null : existingDefault),
      countActive: async () => 1,
      insert: async (next) => {
        if (next.isDefault) throw new Error("default-account-conflict");
        inserted.push(next);
        return next;
      },
      update: async (next) => next,
      setDefault: async () => {},
    };

    const created = await new AccountsService(repo).createAccount("Картка");

    expect(created.isDefault).toBe(false);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].name).toBe("Картка");
  });

  // @trace FR-ACCT-04
  it("creates a non-default account and switches the default, keeping exactly one", async () => {
    const def = await service.ensureSeededDefault();
    const card = await service.createAccount("Картка");
    expect(card.isDefault).toBe(false);
    expect(card.currency).toBe("UAH");

    await service.setDefaultAccount(card.id);
    const active = await service.listActive();
    expect(active.filter((a) => a.isDefault).length).toBe(1);
    expect(active.find((a) => a.id === card.id)?.isDefault).toBe(true);
    expect(active.find((a) => a.id === def.id)?.isDefault).toBe(false);
    expect(await service.getDefaultAccountId()).toBe(card.id);
  });

  // @trace FR-ACCT-04
  it("keeps the current in-memory default when asked to default an archived account", async () => {
    const cash = await repos.accounts.insert(account("Готівка", true));
    const archived = await repos.accounts.insert(account("Архів", false, new Date()));

    await repos.accounts.setDefault(archived.id);

    expect((await repos.accounts.findDefault())?.id).toBe(cash.id);
  });

  // @trace FR-ACCT-04
  it("rejects inserting a second default account in the in-memory repository", async () => {
    await repos.accounts.insert(account("Готівка", true));

    await expect(repos.accounts.insert(account("Картка", true))).rejects.toThrow(
      "default-account-conflict",
    );
  });

  // @trace FR-ACCT-03
  it("renames an account, trimming the name and keeping it UAH", async () => {
    const def = await service.ensureSeededDefault();
    const renamed = await service.renameAccount(def.id, "  Основний  ");
    expect(renamed.name).toBe("Основний");
    expect(renamed.currency).toBe("UAH");
  });

  // @trace FR-ACCT-03
  it("rejects an empty rename with code name-required", async () => {
    const def = await service.ensureSeededDefault();
    const e = await caught(service.renameAccount(def.id, "  "));
    expect(e).toBeInstanceOf(AccountError);
    expect((e as AccountError).code).toBe("name-required");
  });

  // @trace FR-ACCT-05
  it("soft-archives a non-default account, hiding it but retaining the row", async () => {
    await service.ensureSeededDefault();
    const card = await service.createAccount("Картка");
    const archived = await service.archiveAccount(card.id);
    expect(archived.archivedAt).not.toBeNull();
    expect((await service.listActive()).find((a) => a.id === card.id)).toBeUndefined();
    // retained so its ledger items + balance contribution survive
    expect((await repos.accounts.findById(card.id))?.archivedAt).not.toBeNull();
  });

  // @trace FR-ACCT-04, FR-ACCT-05
  it("treats a malformed (non-UUID) id as not-found instead of a raw failure", async () => {
    await service.ensureSeededDefault();
    for (const op of [
      service.setDefaultAccount("not-a-uuid"),
      service.renameAccount("not-a-uuid", "Картка"),
      service.archiveAccount("not-a-uuid"),
    ]) {
      const e = await caught(op);
      expect(e).toBeInstanceOf(AccountError);
      expect((e as AccountError).code).toBe("not-found");
    }
  });

  // @trace FR-ACCT-05
  it("refuses to archive the default account", async () => {
    const def = await service.ensureSeededDefault();
    await service.createAccount("Картка"); // 2 active, so not "last"
    const e = await caught(service.archiveAccount(def.id));
    expect(e).toBeInstanceOf(AccountError);
    expect((e as AccountError).code).toBe("cannot-archive-default");
  });

  // @trace FR-ACCT-05
  it("refuses to archive the last remaining active account", async () => {
    const def = await service.ensureSeededDefault();
    const e = await caught(service.archiveAccount(def.id));
    expect(e).toBeInstanceOf(AccountError);
    expect((e as AccountError).code).toBe("cannot-archive-last");
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRepositories, resetDbBoundaryForTests } from "@/src/db/client";
import { AccountError } from "@/src/domain/account";
import { AccountsService } from "./service";

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

// @trace FR-ACCT-01, FR-ACCT-04, FR-ACCT-05, FR-ACCT-06, FR-ITEM-06
describe("accounts boundary smoke (in-memory fallback, TC-DATA-01)", () => {
  it("seed → create → switch default → archive guard through getRepositories()", async () => {
    const service = new AccountsService(getRepositories().accounts);

    const seeded = await service.ensureSeededDefault();
    expect(seeded.isDefault).toBe(true);

    const card = await service.createAccount("Картка");
    await service.setDefaultAccount(card.id);
    expect(await service.getDefaultAccountId()).toBe(card.id);

    // the now-non-default seed can be archived; the last active account cannot
    await service.archiveAccount(seeded.id);
    expect((await service.listActive()).map((a) => a.id)).toEqual([card.id]);
    await expect(service.archiveAccount(card.id)).rejects.toMatchObject({
      code: "cannot-archive-last",
    } satisfies Partial<AccountError>);
  });
});

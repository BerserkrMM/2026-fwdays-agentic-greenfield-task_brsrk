import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRepositories, resetDbBoundaryForTests } from "@/src/db/client";
import type { ParserAdapter } from "@/src/domain/parsing";
import { AccountsService } from "@/src/modules/accounts/service";
import { ItemCreationService } from "@/src/modules/foundation/item-creation";
import { ParsingService } from "@/src/modules/parsing/service";
import { ManualInputService } from "./service";

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

const stubAdapter: ParserAdapter = {
  async parse() {
    return {
      drafts: [
        { description: "Ковбаса", amountMinor: -4000, currency: "UAH", type: "expense", category: "Продукти" },
        { description: "Хліб", amountMinor: -2000, currency: "UAH", type: "expense", category: "Продукти" },
      ],
    };
  },
};

// @trace FR-TEXT-02, FR-TEXT-04
describe("manual-input boundary smoke (in-memory fallback, TC-DATA-01)", () => {
  it("stores the text event and creates pending items through the shared DB boundary", async () => {
    const repos = getRepositories();
    await new AccountsService(repos.accounts).ensureSeededDefault();
    const parsing = new ParsingService(repos, stubAdapter);
    const creation = new ItemCreationService(repos, new AccountsService(repos.accounts));
    const service = new ManualInputService(repos, parsing, creation);

    const summary = await service.importText("40 грн ковбаса, 20 грн хліб");

    expect(summary.created).toBe(2);
    expect(summary.failed).toBe(0);

    const event = await repos.inputEvents.findById(summary.inputEventId);
    expect(event?.source).toBe("text");

    const items = await repos.ledgerItems.listAll();
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.status === "pending")).toBe(true);
    expect(items.every((i) => i.inputEventId === summary.inputEventId)).toBe(true);
  });
});

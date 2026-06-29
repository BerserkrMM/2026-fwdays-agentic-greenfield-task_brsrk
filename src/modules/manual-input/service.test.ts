import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryRepositories } from "@/src/db/memory";
import { ManualTextError } from "@/src/domain/manual-text";
import { ParsingError, type ParserAdapter } from "@/src/domain/parsing";
import type { ParsedLedgerItemDraft } from "@/src/domain/parsed-draft";
import {
  type ItemCreationContract,
  NoDefaultAccountError,
  type Repositories,
} from "@/src/domain/ports";
import { AccountsService } from "@/src/modules/accounts/service";
import { ItemCreationService } from "@/src/modules/foundation/item-creation";
import { OpenAiParserAdapter } from "@/src/modules/parsing/adapters";
import { ParsingService } from "@/src/modules/parsing/service";
import { ManualInputService } from "./service";

function draftsAdapter(drafts: ParsedLedgerItemDraft[]): ParserAdapter {
  return { async parse() { return { drafts }; } };
}

function expense(amountMinor: number, description: string): ParsedLedgerItemDraft {
  return { description, amountMinor, currency: "UAH", type: "expense", category: "Покупки" };
}

let repos: Repositories;
let accounts: AccountsService;
let creation: ItemCreationService;

async function build(adapter: ParserAdapter): Promise<ManualInputService> {
  repos = createInMemoryRepositories();
  accounts = new AccountsService(repos.accounts);
  await accounts.ensureSeededDefault();
  creation = new ItemCreationService(repos, accounts);
  const parsing = new ParsingService(repos, adapter);
  return new ManualInputService(repos, parsing, creation);
}

beforeEach(() => {
  repos = createInMemoryRepositories();
});

// @trace FR-TEXT-01, FR-TEXT-02
describe("ManualInputService stores the original text", () => {
  it("stores submitted text as an input_event with source text, preserving the original", async () => {
    const service = await build(draftsAdapter([expense(-4500, "Кава")]));
    const summary = await service.importText("  Кава 45 грн  ");
    const event = await repos.inputEvents.findById(summary.inputEventId);
    expect(event?.source).toBe("text");
    expect(event?.rawText).toBe("  Кава 45 грн  ");
  });

  it("rejects empty text without creating an input_event", async () => {
    const service = await build(draftsAdapter([]));
    await expect(service.importText("   ")).rejects.toBeInstanceOf(ManualTextError);
  });
});

// @trace FR-TEXT-03
describe("ManualInputService normalizes and parses", () => {
  it("passes the normalized text payload (kind text) to the parser", async () => {
    const seen: { kind: string; content: string }[] = [];
    const adapter: ParserAdapter = {
      async parse(payload) {
        seen.push({ kind: payload.kind, content: payload.content });
        return { drafts: [expense(-4500, "Кава")] };
      },
    };
    const service = await build(adapter);
    await service.importText("  Кава 45 грн  ");
    expect(seen).toHaveLength(1);
    expect(seen[0].kind).toBe("text");
    expect(seen[0].content).toBe("Кава 45 грн");
  });
});

// @trace FR-TEXT-04, FR-TEXT-05
describe("ManualInputService creates pending items (partial success)", () => {
  it("creates one pending item per valid draft and reports the summary", async () => {
    const service = await build(
      draftsAdapter([expense(-4000, "Ковбаса"), expense(-2000, "Хліб")]),
    );
    const summary = await service.importText("40 грн ковбаса, 20 грн хліб");
    expect(summary.created).toBe(2);
    expect(summary.failed).toBe(0);
    const items = await repos.ledgerItems.listAll();
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.status === "pending")).toBe(true);
    expect(items.every((i) => i.parserRunId === summary.parserRunId)).toBe(true);
  });

  it("counts a draft that fails creation as failed without rolling back saved items", async () => {
    const service = await build(
      draftsAdapter([expense(-4000, "Ковбаса"), expense(-2000, "Хліб")]),
    );
    // Force the second createPendingItem to throw, leaving the first persisted.
    let calls = 0;
    const realInsert = repos.ledgerItems.insert.bind(repos.ledgerItems);
    repos.ledgerItems.insert = async (item) => {
      calls += 1;
      if (calls === 2) throw new Error("boom");
      return realInsert(item);
    };
    const summary = await service.importText("40 грн ковбаса, 20 грн хліб");
    expect(summary.created).toBe(1);
    expect(summary.failed).toBe(1);
    expect(await repos.ledgerItems.listAll()).toHaveLength(1);
  });

  it("propagates a systemic creation error instead of mislabelling it as a failed draft", async () => {
    repos = createInMemoryRepositories();
    const parsing = new ParsingService(repos, draftsAdapter([expense(-4000, "Ковбаса")]));
    const itemCreation: ItemCreationContract = {
      async createPendingItem() {
        throw new NoDefaultAccountError();
      },
    };
    const service = new ManualInputService(repos, parsing, itemCreation);
    await expect(service.importText("ковбаса 40 грн")).rejects.toBeInstanceOf(
      NoDefaultAccountError,
    );
  });
});

// @trace FR-ITEM-07
describe("ManualInputService surfaces parse failure with preserved evidence", () => {
  it("preserves the input_event and a failed parser_run when parsing fails", async () => {
    // OpenAI adapter with no key throws ParsingError("adapter-failed").
    repos = createInMemoryRepositories();
    accounts = new AccountsService(repos.accounts);
    await accounts.ensureSeededDefault();
    creation = new ItemCreationService(repos, accounts);

    const events: string[] = [];
    const realEventCreate = repos.inputEvents.create.bind(repos.inputEvents);
    repos.inputEvents.create = async (event) => {
      const created = await realEventCreate(event);
      events.push(created.id);
      return created;
    };
    const runs: string[] = [];
    const realRunCreate = repos.parserRuns.create.bind(repos.parserRuns);
    repos.parserRuns.create = async (run) => {
      const created = await realRunCreate(run);
      runs.push(created.status);
      return created;
    };

    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const parsing = new ParsingService(repos, new OpenAiParserAdapter());
      const service = new ManualInputService(repos, parsing, creation);
      await expect(service.importText("кава 45 грн")).rejects.toBeInstanceOf(ParsingError);
      // input_event was stored, a failed parser_run recorded, no items created.
      expect(events).toHaveLength(1);
      expect(runs).toEqual(["failed"]);
      expect(await repos.ledgerItems.listAll()).toHaveLength(0);
    } finally {
      if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousKey;
    }
  });
});

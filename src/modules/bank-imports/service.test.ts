import { beforeEach, expect, it } from "vitest";
import { createInMemoryRepositories } from "@/src/db/memory";
import { ParsingError, type ParserAdapter, type ParserPayload } from "@/src/domain/parsing";
import type { ParsedLedgerItemDraft } from "@/src/domain/parsed-draft";
import {
  MissingInputEventError,
  NoDefaultAccountError,
  type ItemCreationContract,
  type Repositories,
} from "@/src/domain/ports";
import { AccountsService } from "@/src/modules/accounts/service";
import { ItemCreationService } from "@/src/modules/foundation/item-creation";
import { ParsingService } from "@/src/modules/parsing/service";
import { BankImportService } from "./service";

function draft(rowNumber: number, description = `рядок ${rowNumber}`): ParsedLedgerItemDraft {
  return {
    description,
    amountMinor: -1000 * rowNumber,
    currency: "UAH",
    type: "expense",
    category: "Банк",
    sourceRef: { rowNumber },
  };
}

function adapter(drafts: ParsedLedgerItemDraft[], seen: ParserPayload[] = []): ParserAdapter {
  return {
    async parse(payload) {
      seen.push(payload);
      return { drafts };
    },
  };
}

let repos: Repositories;

async function build(parserAdapter: ParserAdapter): Promise<BankImportService> {
  repos = createInMemoryRepositories();
  const accounts = new AccountsService(repos.accounts);
  await accounts.ensureSeededDefault();
  return new BankImportService(
    repos,
    new ParsingService(repos, parserAdapter),
    new ItemCreationService(repos, accounts),
  );
}

beforeEach(() => {
  repos = createInMemoryRepositories();
});

// @trace FR-BANK-01, FR-BANK-02, FR-IMPORT-02
it("preserves the original bank statement as a provider-tagged input_event before parsing", async () => {
  const seen: ParserPayload[] = [];
  const service = await build(adapter([draft(2, "АТБ")], seen));
  const rawText = "Дата,Опис,Сума\n2026-06-01,АТБ,-10.00\n";

  const summary = await service.importStatement({
    provider: "monobank",
    fileName: "mono.csv",
    mimeType: "text/csv",
    rawText,
  });

  const event = await repos.inputEvents.findById(summary.inputEventId);
  expect(event?.source).toBe("bank");
  expect(event?.provider).toBe("monobank");
  expect(event?.rawText).toBe(rawText);
  expect(event?.mimeType).toBe("text/csv");
  expect(seen).toHaveLength(1);
});

// @trace FR-BANK-03, FR-BANK-04
it("passes normalized bank rows to the parser and creates pending row items", async () => {
  const seen: ParserPayload[] = [];
  const service = await build(adapter([draft(2, "АТБ"), draft(3, "Таксі")], seen));

  const summary = await service.importStatement({
    provider: "monobank",
    fileName: "mono.csv",
    mimeType: "text/csv",
    rawText: "Дата,Опис,Сума\n2026-06-01,АТБ,-10.00\n2026-06-02,Таксі,-20.00\n",
  });

  expect(seen[0].kind).toBe("bank");
  const parserTable = JSON.parse(seen[0].content);
  expect(parserTable.headers).toEqual(["Дата", "Опис", "Сума"]);
  expect(parserTable.rows[0]).toEqual({
    rowNumber: 2,
    rowId: "r2",
    cells: ["2026-06-01", "АТБ", "-10.00"],
  });
  expect(seen[0].content).not.toContain('"description":"АТБ"');
  expect(summary.created).toBe(2);
  expect(summary.failed).toBe(0);
  const items = await repos.ledgerItems.listAll();
  expect(items.map((item) => item.importRowNumber).sort()).toEqual([2, 3]);
  expect(items.every((item) => item.status === "pending")).toBe(true);
});

// @trace FR-BANK-04
it("counts malformed bank drafts without a valid normalized source row as failed while keeping saved rows", async () => {
  const service = await build(adapter([draft(2), { ...draft(3), sourceRef: undefined }, draft(999)]));
  const summary = await service.importStatement({
    provider: "monobank",
    fileName: "mono.csv",
    mimeType: "text/csv",
    rawText: "Дата,Опис,Сума\n2026-06-01,АТБ,-10.00\n2026-06-02,Таксі,-20.00\n",
  });

  // Row 2 imports; the source-less draft and the hallucinated row 999 are
  // failed, and row 3 (which got no usable draft) is also counted as failed.
  expect(summary.created).toBe(1);
  expect(summary.failed).toBe(3);
  expect(await repos.ledgerItems.listAll()).toHaveLength(1);
});

// @trace FR-BANK-04
it("honors only the first draft when the parser returns duplicates for one row", async () => {
  const service = await build(adapter([draft(2, "АТБ"), draft(2, "дубль")]));
  const summary = await service.importStatement({
    provider: "monobank",
    fileName: "mono.csv",
    mimeType: "text/csv",
    rawText: "Дата,Опис,Сума\n2026-06-01,АТБ,-10.00\n",
  });

  expect(summary.created).toBe(1);
  expect(summary.failed).toBe(0);
  expect(await repos.ledgerItems.listAll()).toHaveLength(1);
});

// @trace FR-BANK-04
it("tolerates invalid AI drafts for bank rows and counts those rows as failed", async () => {
  const service = await build(adapter([draft(2), { ...draft(3), amountMinor: 0 }]));

  const summary = await service.importStatement({
    provider: "monobank",
    fileName: "mono.csv",
    mimeType: "text/csv",
    rawText: "Дата,Опис,Сума\n2026-06-01,АТБ,-10.00\n2026-06-02,Таксі,-20.00\n",
  });

  expect(summary.created).toBe(1);
  expect(summary.failed).toBe(1);
  expect(await repos.ledgerItems.listAll()).toHaveLength(1);
});

// @trace FR-BANK-04
it("counts normalized rows the parser dropped entirely as failed", async () => {
  const service = await build(adapter([draft(2)]));
  const summary = await service.importStatement({
    provider: "monobank",
    fileName: "mono.csv",
    mimeType: "text/csv",
    rawText: "Дата,Опис,Сума\n2026-06-01,АТБ,-10.00\n2026-06-02,Таксі,-20.00\n",
  });

  // The parser returned a draft only for row 2; row 3 must not vanish from the
  // summary even though no draft referenced it.
  expect(summary.created).toBe(1);
  expect(summary.failed).toBe(1);
  expect(await repos.ledgerItems.listAll()).toHaveLength(1);
});

it("fills a missing bank occurredAt from the source row cells instead of falling back to createdAt", async () => {
  const service = await build(adapter([{ ...draft(2, "АТБ"), occurredAt: undefined }]));

  const summary = await service.importStatement({
    provider: "monobank",
    fileName: "mono.csv",
    mimeType: "text/csv",
    rawText: "Коли,Що,Скільки\n27.02.2025 18:04:09,АТБ,-10.00\n",
  });

  expect(summary.created).toBe(1);
  const [item] = await repos.ledgerItems.listAll();
  expect(item.occurredAt?.toISOString()).toBe("2025-02-27T18:04:09.000Z");
});

// @trace FR-BANK-04, FR-PARSE-08, FR-ITEM-07
it("preserves input_event and failed parser_run when parsing fails", async () => {
  const failing: ParserAdapter = {
    async parse() {
      throw new ParsingError("adapter-failed", "no key");
    },
  };
  const service = await build(failing);
  const eventIds: string[] = [];
  const realEventCreate = repos.inputEvents.create.bind(repos.inputEvents);
  repos.inputEvents.create = async (event) => {
    const created = await realEventCreate(event);
    eventIds.push(created.id);
    return created;
  };
  const runStatuses: string[] = [];
  const realRunCreate = repos.parserRuns.create.bind(repos.parserRuns);
  repos.parserRuns.create = async (run) => {
    const created = await realRunCreate(run);
    runStatuses.push(created.status);
    return created;
  };

  await expect(
    service.importStatement({
      provider: "privatbank",
      fileName: "pb.csv",
      mimeType: "text/csv",
      rawText: "Дата;Опис;Сума\n2026-06-01;АТБ;-10.00\n",
    }),
  ).rejects.toBeInstanceOf(ParsingError);

  expect(await repos.ledgerItems.listAll()).toHaveLength(0);
  expect(eventIds).toHaveLength(1);
  expect(runStatuses).toEqual(["failed"]);
});

it("rejects retry for a missing bank input_event", async () => {
  const service = await build(adapter([]));
  await expect(service.retryInputEvent("missing")).rejects.toBeInstanceOf(
    MissingInputEventError,
  );
});

it("counts a per-row creation failure without rolling back saved rows", async () => {
  repos = createInMemoryRepositories();
  const accounts = new AccountsService(repos.accounts);
  await accounts.ensureSeededDefault();
  const parsing = new ParsingService(repos, adapter([draft(2), draft(3)]));
  let calls = 0;
  const itemCreation: ItemCreationContract = {
    async createPendingItem(input) {
      calls += 1;
      if (calls === 2) throw new Error("row failed");
      return new ItemCreationService(repos, accounts).createPendingItem(input);
    },
  };
  const service = new BankImportService(repos, parsing, itemCreation);

  const summary = await service.importStatement({
    provider: "monobank",
    fileName: "mono.csv",
    mimeType: "text/csv",
    rawText: "Дата,Опис,Сума\n2026-06-01,АТБ,-10.00\n2026-06-02,Таксі,-20.00\n",
  });

  expect(summary.created).toBe(1);
  expect(summary.failed).toBe(1);
  expect(await repos.ledgerItems.listAll()).toHaveLength(1);
});

it("propagates systemic item creation errors", async () => {
  repos = createInMemoryRepositories();
  const parsing = new ParsingService(repos, adapter([draft(2)]));
  const service = new BankImportService(repos, parsing, {
    async createPendingItem() {
      throw new NoDefaultAccountError();
    },
  });

  await expect(
    service.importStatement({
      provider: "monobank",
      fileName: "mono.csv",
      mimeType: "text/csv",
      rawText: "Дата,Опис,Сума\n2026-06-01,АТБ,-10.00\n",
    }),
  ).rejects.toBeInstanceOf(NoDefaultAccountError);
});

// @trace FR-BANK-06
it("retrying a partially imported input_event creates only missing rows", async () => {
  repos = createInMemoryRepositories();
  const accounts = new AccountsService(repos.accounts);
  await accounts.ensureSeededDefault();
  const rawText = "Дата,Опис,Сума\n2026-06-01,АТБ,-10.00\n2026-06-02,Таксі,-20.00\n";
  let calls = 0;
  const partial = new BankImportService(
    repos,
    new ParsingService(repos, adapter([draft(2), draft(3)])),
    {
      async createPendingItem(input) {
        calls += 1;
        if (calls === 2) throw new Error("row failed");
        return new ItemCreationService(repos, accounts).createPendingItem(input);
      },
    },
  );
  const first = await partial.importStatement({
    provider: "monobank",
    fileName: "mono.csv",
    mimeType: "text/csv",
    rawText,
  });
  expect(first.created).toBe(1);
  expect(first.failed).toBe(1);

  const retry = await new BankImportService(
    repos,
    new ParsingService(repos, adapter([draft(2), draft(3)])),
    new ItemCreationService(repos, accounts),
  ).retryInputEvent(first.inputEventId);

  expect(retry.created).toBe(1);
  expect(retry.skipped).toBe(1);
  expect((await repos.ledgerItems.listAll()).map((item) => item.importRowNumber).sort()).toEqual([
    2,
    3,
  ]);
});

// @trace FR-BANK-06
it("retrying an existing bank input_event skips rows already inserted in any status", async () => {
  const service = await build(adapter([draft(2), draft(3)]));
  const first = await service.importStatement({
    provider: "monobank",
    fileName: "mono.csv",
    mimeType: "text/csv",
    rawText: "Дата,Опис,Сума\n2026-06-01,АТБ,-10.00\n2026-06-02,Таксі,-20.00\n",
  });
  const [firstItem] = await repos.ledgerItems.listAll();
  await repos.ledgerItems.update({ ...firstItem, status: "deleted" });

  const retry = await service.retryInputEvent(first.inputEventId);

  expect(retry.created).toBe(0);
  expect(retry.skipped).toBe(2);
  expect((await repos.ledgerItems.listAll()).map((item) => item.importRowNumber).sort()).toEqual([
    2,
    3,
  ]);
});

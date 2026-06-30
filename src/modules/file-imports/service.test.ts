import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryRepositories } from "@/src/db/memory";
import type { ParserAdapter, ParserPayload } from "@/src/domain/parsing";
import { ParsingError } from "@/src/domain/parsing";
import type { ParsedLedgerItemDraft } from "@/src/domain/parsed-draft";
import type { Repositories } from "@/src/domain/ports";
import { AccountsService } from "@/src/modules/accounts/service";
import { ItemCreationService } from "@/src/modules/foundation/item-creation";
import { ParsingService } from "@/src/modules/parsing/service";
import { FileImportService } from "./service";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

function receiptDraft(description: string, amountMinor: number): ParsedLedgerItemDraft {
  return {
    description,
    amountMinor,
    currency: "UAH",
    type: "expense",
    category: "Їжа",
    sourceRef: { photoIndex: 0 },
  };
}

class StubAdapter implements ParserAdapter {
  public readonly payloads: ParserPayload[] = [];
  constructor(
    private readonly impl: (payload: ParserPayload) => Promise<{ drafts: unknown[] }>,
  ) {}
  get lastPayload(): ParserPayload | undefined {
    return this.payloads.at(-1);
  }
  async parse(payload: ParserPayload) {
    this.payloads.push(payload);
    return this.impl(payload) as Promise<{ drafts: ParsedLedgerItemDraft[] }>;
  }
}

async function buildService(adapter: ParserAdapter): Promise<{
  repos: Repositories;
  service: FileImportService;
}> {
  const repos = createInMemoryRepositories();
  const accounts = new AccountsService(repos.accounts);
  await accounts.ensureSeededDefault();
  const parsing = new ParsingService(repos, adapter);
  const itemCreation = new ItemCreationService(repos, accounts);
  const service = new FileImportService(repos, parsing, itemCreation);
  return { repos, service };
}

function photoInput() {
  return { fileName: "check.JPEG", mimeType: "image/jpeg", bytes: JPEG };
}

// @trace FR-FILE-01, FR-FILE-02
describe("FileImportService.importPhoto preservation", () => {
  let repos: Repositories;
  let service: FileImportService;

  beforeEach(async () => {
    ({ repos, service } = await buildService(
      new StubAdapter(async () => ({ drafts: [receiptDraft("Кава", -4500)] })),
    ));
  });

  it("stores the original photo as a photo input_event with a data URI and mime", async () => {
    const summary = await service.importPhoto(photoInput());
    const event = await repos.inputEvents.findById(summary.inputEventId);
    expect(event?.source).toBe("photo");
    expect(event?.provider).toBeNull();
    expect(event?.rawText).toBeNull();
    expect(event?.mimeType).toBe("image/jpeg");
    expect(event?.storageUri?.startsWith("data:image/jpeg;base64,")).toBe(true);
  });

  it("rejects a non-image upload before creating any input_event", async () => {
    await expect(
      service.importPhoto({ fileName: "x.txt", mimeType: "text/plain", bytes: new Uint8Array([1, 2, 3]) }),
    ).rejects.toMatchObject({ name: "ReceiptPhotoError", code: "file-invalid" });
  });
});

// @trace FR-FILE-03, FR-FILE-04
describe("FileImportService vision payload", () => {
  it("passes a photo-kind payload carrying the image to the parser", async () => {
    const adapter = new StubAdapter(async () => ({ drafts: [receiptDraft("Кава", -4500)] }));
    const { service } = await buildService(adapter);
    await service.importPhoto(photoInput());

    expect(adapter.lastPayload?.kind).toBe("photo");
    expect(adapter.lastPayload?.image?.mimeType).toBe("image/jpeg");
    expect(adapter.lastPayload?.image?.dataUri.startsWith("data:image/jpeg;base64,")).toBe(true);
  });

  it("does not duplicate the raw image base64 into the stored normalized payload", async () => {
    const { repos, service } = await buildService(
      new StubAdapter(async () => ({ drafts: [receiptDraft("Кава", -4500)] })),
    );
    const summary = await service.importPhoto(photoInput());
    const run = await repos.parserRuns.findById(summary.parserRunId);
    expect(run?.normalizedPayload ?? "").not.toContain("base64,");
    // The redacted payload keeps the real decoded byte length, not the base64 char count.
    const stored = JSON.parse(run?.normalizedPayload ?? "{}");
    expect(stored.image).toMatchObject({ mimeType: "image/jpeg", byteLength: JPEG.length });
  });
});

// @trace FR-FILE-05, FR-ITEM-04
describe("FileImportService item creation", () => {
  it("creates one pending ledger item per valid draft", async () => {
    const { repos, service } = await buildService(
      new StubAdapter(async () => ({
        drafts: [receiptDraft("Кава", -4500), receiptDraft("Хліб", -2000)],
      })),
    );
    const summary = await service.importPhoto(photoInput());
    expect(summary.created).toBe(2);
    expect(summary.failed).toBe(0);
    const items = await repos.ledgerItems.listAll();
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.status === "pending")).toBe(true);
  });

  it("counts an invalid draft as failed without rolling back valid items (partial-success)", async () => {
    const { repos, service } = await buildService(
      new StubAdapter(async () => ({
        drafts: [receiptDraft("Кава", -4500), { description: "", amountMinor: 0 }],
      })),
    );
    const summary = await service.importPhoto(photoInput());
    expect(summary.created).toBe(1);
    expect(summary.failed).toBe(1);
    expect(await repos.ledgerItems.listAll()).toHaveLength(1);
  });
});

// @trace FR-FILE-04, FR-ITEM-07
describe("FileImportService parse failure and retry", () => {
  it("surfaces the parse failure and writes no partial ledger items", async () => {
    // The input_event + failed parser_run preservation is owned and unit-tested by
    // ParsingService; at the channel boundary the guarantee is that the failure
    // propagates as a ParsingError (so the route shows retry) and nothing partial
    // is written to the ledger.
    const { repos, service } = await buildService(
      new StubAdapter(async () => {
        throw new ParsingError("adapter-failed", "no key");
      }),
    );
    await expect(service.importPhoto(photoInput())).rejects.toBeInstanceOf(ParsingError);
    expect(await repos.ledgerItems.listAll()).toHaveLength(0);
  });

  it("retries an existing photo input_event from the stored data URI", async () => {
    const adapter = new StubAdapter(async () => ({ drafts: [receiptDraft("Кава", -4500)] }));
    const { service } = await buildService(adapter);
    const first = await service.importPhoto(photoInput());

    const retry = await service.retryInputEvent(first.inputEventId);
    expect(retry.inputEventId).toBe(first.inputEventId);
    expect(adapter.payloads).toHaveLength(2);
    expect(adapter.lastPayload?.kind).toBe("photo");
    expect(adapter.lastPayload?.image?.dataUri.startsWith("data:image/jpeg;base64,")).toBe(true);
  });

  it("derives the mime from the stored data URI when the event mime is missing", async () => {
    const adapter = new StubAdapter(async () => ({ drafts: [receiptDraft("Кава", -4500)] }));
    const { repos, service } = await buildService(adapter);
    // A photo event whose mime_type was never recorded but whose storage_uri carries it.
    const event = await repos.inputEvents.create({
      source: "photo",
      provider: null,
      rawText: null,
      storageUri: "data:image/webp;base64,AQID",
      mimeType: null,
    });

    await service.retryInputEvent(event.id);
    expect(adapter.lastPayload?.image?.mimeType).toBe("image/webp");
  });

  it("rejects retry for a non-photo or reference-less event", async () => {
    const { repos, service } = await buildService(
      new StubAdapter(async () => ({ drafts: [] })),
    );
    const textEvent = await repos.inputEvents.create({
      source: "text",
      provider: null,
      rawText: "кава",
      storageUri: null,
      mimeType: null,
    });
    await expect(service.retryInputEvent(textEvent.id)).rejects.toMatchObject({
      name: "MissingInputEventError",
    });
  });
});

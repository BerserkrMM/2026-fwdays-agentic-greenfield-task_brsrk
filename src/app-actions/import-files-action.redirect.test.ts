import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryRepositories } from "@/src/db/memory";
import { ParsingError } from "@/src/domain/parsing";
import type { ParsedLedgerItemDraft } from "@/src/domain/parsed-draft";
import type { Repositories } from "@/src/domain/ports";

// Exercises the /imports/files action redirect mapping end-to-end over the real
// service stack and in-memory repositories, controlling only the parser adapter.
const h = vi.hoisted(() => ({
  repos: undefined as unknown as Repositories,
  parse: vi.fn(),
}));

vi.mock("@/src/db/client", () => ({ getRepositories: () => h.repos }));
vi.mock("@/src/modules/parsing/adapters", () => ({
  OpenAiParserAdapter: class {
    parse = h.parse;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

function receiptDraft(): ParsedLedgerItemDraft {
  return {
    description: "Кава",
    amountMinor: -4500,
    currency: "UAH",
    type: "expense",
    category: "Кафе",
    sourceRef: { photoIndex: 0 },
  };
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

function form(file: File): FormData {
  const formData = new FormData();
  formData.append("photo", file);
  return formData;
}

const jpeg = () => new File([JPEG], "check.jpg", { type: "image/jpeg" });

// @trace FR-FILE-01, FR-FILE-04, FR-FILE-05
describe("importPhotoAction redirects", () => {
  beforeEach(() => {
    h.repos = createInMemoryRepositories();
    h.parse.mockReset();
  });

  it("redirects to the ledger created/failed summary after a successful import", async () => {
    h.parse.mockResolvedValue({ drafts: [receiptDraft()] });
    const { importPhotoAction } = await import("@/app/imports/files/actions");

    await expect(importPhotoAction(form(jpeg()))).rejects.toThrow(
      "redirect:/ledger?imported=1&failed=0",
    );
    expect(await h.repos.ledgerItems.listAll()).toHaveLength(1);
  });

  it("redirects back with parse-failed when vision parsing fails", async () => {
    h.parse.mockRejectedValue(new ParsingError("adapter-failed", "no key"));
    const { importPhotoAction } = await import("@/app/imports/files/actions");

    await expect(importPhotoAction(form(jpeg()))).rejects.toThrow(
      "redirect:/imports/files?formError=parse-failed",
    );
    expect(await h.repos.ledgerItems.listAll()).toHaveLength(0);
  });

  it("redirects a non-image upload to a friendly file error without parsing", async () => {
    const { importPhotoAction } = await import("@/app/imports/files/actions");
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "doc.pdf", {
      type: "application/pdf",
    });

    await expect(importPhotoAction(form(pdf))).rejects.toThrow(
      "redirect:/imports/files?formError=file-invalid",
    );
    expect(h.parse).not.toHaveBeenCalled();
  });

  it("redirects a missing file to a friendly file error", async () => {
    const { importPhotoAction } = await import("@/app/imports/files/actions");

    await expect(importPhotoAction(new FormData())).rejects.toThrow(
      "redirect:/imports/files?formError=file-invalid",
    );
    expect(h.parse).not.toHaveBeenCalled();
  });
});

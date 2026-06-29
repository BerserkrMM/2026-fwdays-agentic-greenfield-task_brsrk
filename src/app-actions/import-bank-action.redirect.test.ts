import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryRepositories } from "@/src/db/memory";
import { ParsingError } from "@/src/domain/parsing";
import type { ParsedLedgerItemDraft } from "@/src/domain/parsed-draft";
import type { Repositories } from "@/src/domain/ports";

// Exercises the /imports/bank action redirect mapping end-to-end over the real
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

function bankRow(rowNumber: number): ParsedLedgerItemDraft {
  return {
    description: `рядок ${rowNumber}`,
    amountMinor: -1000 * rowNumber,
    currency: "UAH",
    type: "expense",
    category: "Банк",
    sourceRef: { rowNumber },
  };
}

function form(file: File): FormData {
  const formData = new FormData();
  formData.set("provider", "monobank");
  formData.append("statement", file);
  return formData;
}

const csv = () =>
  new File(["Дата,Опис,Сума\n2026-06-01,АТБ,-10.00\n"], "mono.csv", { type: "text/csv" });

// @trace FR-BANK-04, FR-BANK-05
describe("importBankAction redirects", () => {
  beforeEach(() => {
    h.repos = createInMemoryRepositories();
    h.parse.mockReset();
  });

  it("redirects to the ledger created/failed summary after a successful import", async () => {
    h.parse.mockResolvedValue({ drafts: [bankRow(2)] });
    const { importBankAction } = await import("@/app/imports/bank/actions");

    await expect(importBankAction(form(csv()))).rejects.toThrow(
      "redirect:/ledger?imported=1&failed=0",
    );
    expect(await h.repos.ledgerItems.listAll()).toHaveLength(1);
  });

  it("redirects back with parse-failed when parsing the statement fails", async () => {
    h.parse.mockRejectedValue(new ParsingError("adapter-failed", "no key"));
    const { importBankAction } = await import("@/app/imports/bank/actions");

    await expect(importBankAction(form(csv()))).rejects.toThrow(
      "redirect:/imports/bank?formError=parse-failed",
    );
    expect(await h.repos.ledgerItems.listAll()).toHaveLength(0);
  });

  it("redirects a corrupt XLSX upload to a friendly file error instead of a 500", async () => {
    const { importBankAction } = await import("@/app/imports/bank/actions");
    const corrupt = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], "evil.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await expect(importBankAction(form(corrupt))).rejects.toThrow(
      "redirect:/imports/bank?formError=file-invalid",
    );
    expect(h.parse).not.toHaveBeenCalled();
  });
});

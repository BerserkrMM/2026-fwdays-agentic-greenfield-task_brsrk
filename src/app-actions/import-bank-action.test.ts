import { describe, expect, it, vi } from "vitest";

const getRepositories = vi.fn(() => {
  throw new Error("unexpected db access");
});

vi.mock("@/src/db/client", () => ({ getRepositories }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

// @trace FR-BANK-01, FR-BANK-02
describe("importBankAction", () => {
  it("rejects a non-string provider before any database access", async () => {
    const { importBankAction } = await import("@/app/imports/bank/actions");
    const formData = new FormData();
    formData.append("provider", new Blob(["monobank"]), "provider.txt");
    formData.append("statement", new File(["Дата,Опис,Сума"], "mono.csv", { type: "text/csv" }));

    await expect(importBankAction(formData)).rejects.toThrow(
      "redirect:/imports/bank?formError=provider-invalid",
    );
    expect(getRepositories).not.toHaveBeenCalled();
  });

  it("rejects a missing or unsupported file before seeding the default account", async () => {
    const { importBankAction } = await import("@/app/imports/bank/actions");
    const formData = new FormData();
    formData.set("provider", "monobank");
    formData.append("statement", new File(["%PDF"], "statement.pdf", { type: "application/pdf" }));

    await expect(importBankAction(formData)).rejects.toThrow(
      "redirect:/imports/bank?formError=file-invalid",
    );
    expect(getRepositories).not.toHaveBeenCalled();
  });
});

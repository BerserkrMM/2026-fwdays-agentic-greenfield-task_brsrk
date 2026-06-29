import { describe, expect, it } from "vitest";
import { BANK_IMPORT_PAGE, bankImportErrorMessage } from "./bank-import-content";

// @trace FR-BANK-01, FR-BANK-02, FR-BANK-05
// @trace NFR-I18N-01
describe("bank import copy", () => {
  it("exposes Ukrainian-first page copy without a preview gate", () => {
    expect(BANK_IMPORT_PAGE.title).toBe("Виписка банку");
    expect(BANK_IMPORT_PAGE.submitLabel).toContain("Імпортувати");
    expect(BANK_IMPORT_PAGE.providerOptions.map((option) => option.value)).toEqual([
      "monobank",
      "privatbank",
    ]);
    expect(`${BANK_IMPORT_PAGE.description} ${BANK_IMPORT_PAGE.hint}`).not.toMatch(/прев/i);
  });

  it("maps validation and parse errors to explicit Ukrainian messages", () => {
    expect(bankImportErrorMessage("provider-invalid")).toContain("провайдера");
    expect(bankImportErrorMessage("file-invalid")).toContain("CSV");
    expect(bankImportErrorMessage("empty-statement")).toContain("рядків");
    expect(bankImportErrorMessage("parse-failed")?.toLowerCase()).toContain("розпізнати");
    expect(bankImportErrorMessage("mystery")).toBe("Сталася помилка. Спробуйте ще раз.");
    expect(bankImportErrorMessage(undefined)).toBeNull();
  });
});

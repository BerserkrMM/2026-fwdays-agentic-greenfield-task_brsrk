import { describe, expect, it } from "vitest";
import { FILE_IMPORT_PAGE, fileImportErrorMessage } from "./file-import-content";

// @trace FR-FILE-01, NFR-I18N-01
describe("fileImportErrorMessage", () => {
  it("returns null when no error code is present", () => {
    expect(fileImportErrorMessage(undefined)).toBeNull();
  });

  it("maps known error codes to explicit Ukrainian messages", () => {
    expect(fileImportErrorMessage("file-invalid")).toContain("JPEG");
    expect(fileImportErrorMessage("parse-failed")).toContain("розпізнати");
  });

  it("falls back to a generic recoverable message for an unknown code", () => {
    expect(fileImportErrorMessage("something-else")).toBe("Сталася помилка. Спробуйте ще раз.");
  });

  it("keeps the page copy Ukrainian-first", () => {
    expect(FILE_IMPORT_PAGE.title).toBe("Фото чека");
    expect(FILE_IMPORT_PAGE.hint).toContain("PDF не підтримується");
  });
});

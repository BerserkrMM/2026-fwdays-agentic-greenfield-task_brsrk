import { describe, expect, it } from "vitest";
import {
  importSummaryMessage,
  isEmptyImport,
  parseImportSummary,
} from "./import-summary";

// @trace FR-TEXT-05
describe("parseImportSummary", () => {
  it("returns null when no summary params are present", () => {
    expect(parseImportSummary({})).toBeNull();
    expect(parseImportSummary({ imported: undefined, failed: undefined })).toBeNull();
  });

  it("parses created/failed counts, defaulting the missing side to zero", () => {
    expect(parseImportSummary({ imported: "2", failed: "1" })).toEqual({
      created: 2,
      failed: 1,
    });
    expect(parseImportSummary({ imported: "3" })).toEqual({ created: 3, failed: 0 });
    expect(parseImportSummary({ failed: "2" })).toEqual({ created: 0, failed: 2 });
  });

  it("uses the first value of a repeated param and rejects invalid counts", () => {
    expect(parseImportSummary({ imported: ["4", "9"] })).toEqual({
      created: 4,
      failed: 0,
    });
    expect(parseImportSummary({ imported: "-1", failed: "x" })).toBeNull();
    expect(parseImportSummary({ imported: "2", failed: "x" })).toBeNull();
  });
});

describe("importSummaryMessage", () => {
  it("describes created items in Ukrainian", () => {
    const msg = importSummaryMessage({ created: 2, failed: 0 });
    expect(msg).toContain("2");
    expect(msg.toLowerCase()).toContain("додано");
  });

  it("mentions failures when some drafts could not be saved", () => {
    const msg = importSummaryMessage({ created: 1, failed: 2 });
    expect(msg).toContain("2");
    expect(msg.toLowerCase()).toContain("не вдалося");
  });

  it("uses a distinct 'nothing recognized' message when nothing was imported", () => {
    expect(isEmptyImport({ created: 0, failed: 0 })).toBe(true);
    expect(isEmptyImport({ created: 1, failed: 0 })).toBe(false);
    const msg = importSummaryMessage({ created: 0, failed: 0 });
    expect(msg.toLowerCase()).toContain("розпізнати");
    expect(msg).not.toContain("Додано до журналу: 0");
  });
});

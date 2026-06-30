import { describe, expect, it } from "vitest";
import {
  assertManualText,
  ManualTextError,
  normalizeManualText,
} from "./manual-text";

// @trace FR-TEXT-01, FR-TEXT-03
describe("manual-text source normalization", () => {
  it("trims outer whitespace while leaving inner content", () => {
    expect(normalizeManualText("  кава 45 грн  ")).toBe("кава 45 грн");
    expect(normalizeManualText("40 грн ковбаса, 20 грн хліб")).toBe(
      "40 грн ковбаса, 20 грн хліб",
    );
  });

  it("assertManualText returns the normalized text for non-empty input", () => {
    expect(assertManualText("  таксі 120 грн\n")).toBe("таксі 120 грн");
  });

  it("rejects empty or whitespace-only text with empty-text", () => {
    for (const blank of ["", "   ", "\n\t  \n"]) {
      try {
        assertManualText(blank);
        throw new Error(`expected ManualTextError for ${JSON.stringify(blank)}`);
      } catch (error) {
        expect(error).toBeInstanceOf(ManualTextError);
        expect((error as ManualTextError).code).toBe("empty-text");
      }
    }
  });
});

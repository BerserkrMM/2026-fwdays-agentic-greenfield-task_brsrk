import { describe, expect, it } from "vitest";
import {
  MANUAL_TEXT_PAGE,
  manualTextErrorMessage,
} from "./manual-input-content";

// @trace FR-TEXT-01, FR-TEXT-03
describe("manual-input copy", () => {
  it("exposes Ukrainian-first page copy", () => {
    expect(MANUAL_TEXT_PAGE.title).toBe("Текст");
    expect(MANUAL_TEXT_PAGE.submitLabel.length).toBeGreaterThan(0);
    expect(MANUAL_TEXT_PAGE.placeholder).toContain("грн");
  });

  it("maps the empty-text error to an explicit Ukrainian message", () => {
    expect(manualTextErrorMessage("empty-text")).toBe("Введіть текст для імпорту.");
  });

  it("maps the parse-failed error to a retry-oriented message", () => {
    const msg = manualTextErrorMessage("parse-failed");
    expect(msg?.toLowerCase()).toContain("розпізнати");
  });

  it("returns null when no error code is present", () => {
    expect(manualTextErrorMessage(undefined)).toBeNull();
  });

  it("falls back to a generic Ukrainian message for an unknown code", () => {
    expect(manualTextErrorMessage("mystery")).toBe("Сталася помилка. Спробуйте ще раз.");
  });
});

import { describe, expect, it } from "vitest";
import { IMPORTS_HUB } from "./imports-hub-content";
import {
  PLACEHOLDER_DEFAULT_NOTE,
  PLACEHOLDER_SECTIONS,
  PLACEHOLDER_STATE_TITLE,
  placeholderFor,
} from "./placeholder-content";

// @trace FR-IMPORT-01, FR-SHELL-03, NFR-I18N-01
describe("imports hub content (FR-IMPORT-01)", () => {
  it("links exactly the three import channels", () => {
    expect(IMPORTS_HUB.channels.map((c) => c.href)).toEqual([
      "/imports/text",
      "/imports/bank",
      "/imports/files",
    ]);
  });

  it("gives every channel a non-empty title and description", () => {
    for (const c of IMPORTS_HUB.channels) {
      expect(c.title.trim().length).toBeGreaterThan(0);
      expect(c.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("explains that imports become pending operations for review", () => {
    expect(IMPORTS_HUB.description).toContain("очікує перевірки");
    expect(IMPORTS_HUB.footer).toContain("очікує перевірки");
  });
});

// @trace FR-SHELL-03
describe("placeholder content (FR-SHELL-03)", () => {
  it("registers copy for the four not-yet-implemented sections", () => {
    expect(PLACEHOLDER_SECTIONS.map((s) => s.href)).toEqual([
      "/dashboard",
      "/ledger",
      "/accounts",
      "/settings",
    ]);
  });

  it("returns capability-specific copy by href", () => {
    expect(placeholderFor("/accounts").title).toBe("Рахунки");
    expect(placeholderFor("/settings").description).toContain("AI");
  });

  it("throws for an unregistered href", () => {
    expect(() => placeholderFor("/nope")).toThrow();
  });

  it("exposes an explicit in-development state", () => {
    expect(PLACEHOLDER_STATE_TITLE).toBe("Скоро");
    expect(PLACEHOLDER_DEFAULT_NOTE).toContain("розробці");
  });
});

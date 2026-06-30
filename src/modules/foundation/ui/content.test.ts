import { describe, expect, it } from "vitest";
import { ABOUT } from "./about-content";
import { IMPORTS_HUB } from "./imports-hub-content";
import { NAV_ITEMS } from "./nav-items";
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

// @trace FR-SHELL-01, NFR-I18N-01
describe("about page content (/about)", () => {
  it("registers /about in navigation but keeps it off the mobile primary bar", () => {
    const about = NAV_ITEMS.find((item) => item.href === "/about");
    expect(about).toBeDefined();
    expect(about?.primary).toBe(false);
  });

  it("opens with the product one-liner and the five numbered sections", () => {
    expect(ABOUT.hero.title).toBe("Finup");
    expect(ABOUT.product.summary.trim().length).toBeGreaterThan(0);
    expect([
      ABOUT.product.index,
      ABOUT.features.index,
      ABOUT.build.index,
      ABOUT.role.index,
      ABOUT.next.index,
    ]).toEqual(["01", "02", "03", "04", "05"]);
  });

  it("keeps the product pipeline order from input_event to dashboard", () => {
    expect(ABOUT.product.pipeline.map((s) => s.label)).toEqual([
      "input_event",
      "normalization",
      "parser run",
      "ledger_items",
      "dashboard",
    ]);
  });

  it("describes the three levels of checks", () => {
    expect(ABOUT.gates.groups.map((g) => g.title)).toEqual([
      "Product / code gates",
      "Process-evidence checks",
      "Reporting commands",
    ]);
  });

  it("lists concrete gate commands and evidence artifacts", () => {
    expect(ABOUT.commands.rows.map((row) => row.command)).toContain(
      "npx tsc --noEmit",
    );
    expect(ABOUT.commands.rows.map((row) => row.command)).toContain(
      "npm run check:trace",
    );
    expect(ABOUT.artifacts.rows.map((row) => row.path)).toContain(
      "docs/current-state.md",
    );
    expect(ABOUT.terms.rows.map((row) => row.term)).toContain("ratchet");
  });

  it("points its calls to action at real in-app routes", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toContain(ABOUT.cta.primaryHref);
    expect(hrefs).toContain(ABOUT.cta.secondaryHref);
  });
});

// Foundation output eval cases for Finup.
//
// These cases grade user-visible quality that unit tests do not capture well:
// whether the foundation shell/imports copy is clear, Ukrainian-first, explicit
// about pending review, and not a dead end while downstream slices are still
// placeholders.
//
// `produce()` reads the REAL app copy from its single source of truth modules
// (imports-hub-content.ts, placeholder-content.ts) and serializes the exact
// strings the user sees — so the judge grades the live product, not a duplicated
// sample.

export type EvalCase = {
  id: string;
  trace: string[];
  dimension: string;
  capability: string;
  scenario: string;
  produce: () => Promise<string>;
  rubric: string[];
};

export const cases: EvalCase[] = [
  {
    id: "eval-foundation-imports-hub-clarity",
    trace: ["FR-IMPORT-01", "FR-SHELL-03", "NFR-I18N-01"],
    dimension: "ua-ux-clarity",
    capability: "foundation",
    scenario:
      "A first-time user opens the Imports hub before any specific import channel is implemented.",
    produce: async () => {
      const { IMPORTS_HUB } = await import(
        "@/src/modules/foundation/ui/imports-hub-content"
      );
      return [
        "Route: /imports",
        `Heading: ${IMPORTS_HUB.title}`,
        `Intro: ${IMPORTS_HUB.description}`,
        ...IMPORTS_HUB.channels.map(
          (c) => `Channel: ${c.title} (${c.href}) — ${c.description}`,
        ),
        `Footer: ${IMPORTS_HUB.footer}`,
      ].join("\n");
    },
    rubric: [
      "CRITICAL: the output is Ukrainian-first and understandable without English product jargon",
      "CRITICAL: all three import channels are visible and linked: text, receipt photo, and bank statement",
      "CRITICAL: the copy makes clear that imported data becomes ledger operations pending user review",
      "the user is not left on a blank or dead-end screen",
      "the tone is calm and finance-oriented, not playful or noisy",
    ],
  },
  {
    id: "eval-foundation-placeholder-state-clarity",
    trace: ["FR-SHELL-03", "BC-BRAND-01", "NFR-I18N-01"],
    dimension: "explicit-state-clarity",
    capability: "foundation",
    scenario:
      "A user opens a not-yet-implemented capability route such as Accounts, Ledger, Dashboard, or Settings.",
    produce: async () => {
      const {
        PLACEHOLDER_STATE_TITLE,
        PLACEHOLDER_DEFAULT_NOTE,
        PLACEHOLDER_SECTIONS,
      } = await import("@/src/modules/foundation/ui/placeholder-content");
      // Each not-yet-implemented section renders PlaceholderScreen with its own
      // capability-specific title + description, plus the shared explicit state.
      return [
        "Component: PlaceholderScreen (one screen per not-yet-implemented section)",
        ...PLACEHOLDER_SECTIONS.map(
          (s) =>
            `Section ${s.title} (${s.href}): «${s.description}» → state «${PLACEHOLDER_STATE_TITLE}» — ${PLACEHOLDER_DEFAULT_NOTE}`,
        ),
      ].join("\n");
    },
    rubric: [
      "CRITICAL: the screen presents an explicit state instead of a blank page or 404",
      "CRITICAL: the copy is Ukrainian-first",
      "CRITICAL: the copy honestly says the section is still in development rather than implying data is missing",
      "the tone is calm and concise",
      "the page still has a meaningful title and capability-specific description",
    ],
  },
];

// @trace FR-IMPORT-01, FR-SHELL-03, NFR-I18N-01, BC-BRAND-01

// Manual-input output eval case for Finup.
//
// Unit tests prove the channel *logic* (store original text, normalize, parse,
// partial-success item creation, redirect with a summary). This case grades the
// user-visible *quality* of the manual text-import copy: whether the parse-failure
// error explains what went wrong and offers a retry, whether the empty-text
// validation is clear, and whether the post-import summary on the Ledger states
// created/failed counts in calm, Ukrainian-first finance language.
//
// `produce()` reads the REAL copy modules (manual-input-content.ts +
// import-summary.ts) — the single source of truth shared with the page/action —
// so the judge grades the live product.

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
    id: "eval-manual-input-error-clarity",
    trace: ["FR-TEXT-01", "FR-TEXT-03", "FR-TEXT-05", "NFR-I18N-01"],
    dimension: "ua-error-clarity",
    capability: "manual-input",
    scenario:
      "A user pastes free-form text on /imports/text: submits empty input, hits a parse failure (no AI key / bad response), then succeeds and lands on the Ledger with a created/failed summary.",
    produce: async () => {
      const { MANUAL_TEXT_PAGE, manualTextErrorMessage } = await import(
        "@/src/modules/manual-input/ui/manual-input-content"
      );
      const { importSummaryMessage } = await import(
        "@/src/modules/manual-input/ui/import-summary"
      );
      return [
        "Route: /imports/text",
        `Heading: ${MANUAL_TEXT_PAGE.title}`,
        `Intro: ${MANUAL_TEXT_PAGE.description}`,
        `Field: ${MANUAL_TEXT_PAGE.fieldLabel}`,
        `Placeholder: ${MANUAL_TEXT_PAGE.placeholder}`,
        `Hint: ${MANUAL_TEXT_PAGE.hint}`,
        `Submit: ${MANUAL_TEXT_PAGE.submitLabel}`,
        `Error title: ${MANUAL_TEXT_PAGE.errorTitle}`,
        `Error[empty-text]: ${manualTextErrorMessage("empty-text")}`,
        `Error[parse-failed]: ${manualTextErrorMessage("parse-failed")}`,
        `Ledger summary (ok): ${importSummaryMessage({ created: 2, failed: 0 })}`,
        `Ledger summary (partial): ${importSummaryMessage({ created: 1, failed: 2 })}`,
      ].join("\n");
    },
    rubric: [
      "CRITICAL: every string is Ukrainian-first with no English product jargon",
      "CRITICAL: the parse-failure error explains what went wrong and points to a retry / checking AI settings",
      "CRITICAL: the empty-text validation tells the user exactly what to do (enter text)",
      "the post-import summary clearly states how many items were created and, when relevant, how many failed",
      "the tone is calm and finance-oriented, not alarming, and never a generic 'something went wrong'",
    ],
  },
];

// @trace FR-TEXT-01, FR-TEXT-03, FR-TEXT-05, NFR-I18N-01

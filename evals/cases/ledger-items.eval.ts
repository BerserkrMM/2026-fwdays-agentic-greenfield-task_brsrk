// Ledger-items output eval case for Finup.
//
// Unit tests prove the review/write *logic* (filter/sort/paginate, edit
// validation, status transitions); this case grades the user-visible *quality* of
// the journal copy — whether the error messages explain WHY an action was blocked
// and what to do instead, whether the two empty states (no items yet vs. nothing
// matched a filter) are distinct and helpful, and whether the tone is calm,
// Ukrainian-first finance language rather than a generic "something went wrong".
//
// `produce()` reads the REAL copy module (ledger-content.ts) — the single source
// of truth shared with the page + actions — so the judge grades the live product.

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
    id: "eval-ledger-items-error-clarity",
    trace: ["FR-ITEM-03", "FR-ITEM-04", "FR-ITEM-05", "NFR-I18N-01"],
    dimension: "ua-error-clarity",
    capability: "ledger-items",
    scenario:
      "A user reviews the journal: approves/edits/deletes items, hits a validation or invalid-status error, and sees the empty states when there are no items or no filter matches.",
    produce: async () => {
      const { LEDGER_PAGE, LEDGER_ITEM_ERRORS } = await import(
        "@/src/modules/ledger-items/ui/ledger-content"
      );
      return [
        "Route: /ledger",
        `Heading: ${LEDGER_PAGE.title}`,
        `Intro: ${LEDGER_PAGE.description}`,
        `Approve action: ${LEDGER_PAGE.approveLabel}`,
        `Delete action: ${LEDGER_PAGE.deleteLabel}`,
        `Empty (no items): ${LEDGER_PAGE.emptyTitle} — ${LEDGER_PAGE.emptyDescription}`,
        `Empty (filtered): ${LEDGER_PAGE.filteredEmptyTitle} — ${LEDGER_PAGE.filteredEmptyDescription}`,
        ...Object.entries(LEDGER_ITEM_ERRORS).map(
          ([code, message]) => `Error[${code}]: ${message}`,
        ),
      ].join("\n");
    },
    rubric: [
      "CRITICAL: every string is Ukrainian-first with no English product jargon",
      "CRITICAL: the invalid-status and validation errors explain WHY the action is blocked and imply what the user can do instead",
      "CRITICAL: the two empty states are clearly distinct — one for an empty journal, one for no filter matches",
      "the amount-invalid message gives a concrete example of an acceptable value",
      "the tone is calm and finance-oriented, not alarming, and never a generic 'something went wrong'",
    ],
  },
];

// @trace FR-ITEM-03, FR-ITEM-04, FR-ITEM-05, NFR-I18N-01

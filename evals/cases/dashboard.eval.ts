// Dashboard output eval case for Finup.
//
// Unit tests prove the aggregate *logic* (balance/trend/breakdown). This case
// grades the user-visible *quality* of the Dashboard's degraded- and empty-state
// copy — whether the empty, insufficient-trend, partial, and error states each
// explain WHAT is happening and WHAT the user can do next, in calm, Ukrainian-
// first language, rather than a blank screen or a generic "something went wrong".
//
// `produce()` reads the REAL copy module (dashboard-content.ts) — the single
// source of truth shared with the page — so the judge grades the live product.

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
    id: "eval-dashboard-state-clarity",
    trace: ["FR-DASH-01", "FR-DASH-04", "FR-DASH-05", "FR-SHELL-03", "NFR-I18N-01"],
    dimension: "ua-error-clarity",
    capability: "dashboard",
    scenario:
      "A user opens the read-only Dashboard when there is no data, too little history for a trend, or the read fails.",
    produce: async () => {
      const { DASHBOARD } = await import(
        "@/src/modules/dashboard/ui/dashboard-content"
      );
      return [
        "Route: /dashboard (read-only)",
        `Heading: ${DASHBOARD.title}`,
        `Subtitle: ${DASHBOARD.subtitle}`,
        `Empty title: ${DASHBOARD.emptyTitle}`,
        `Empty description: ${DASHBOARD.emptyDescription}`,
        `Empty CTA: ${DASHBOARD.emptyCta}`,
        `Insufficient-trend title: ${DASHBOARD.trendInsufficientTitle}`,
        `Insufficient-trend description: ${DASHBOARD.trendInsufficientDescription}`,
        `Breakdown empty: ${DASHBOARD.breakdownEmpty}`,
        `Error title: ${DASHBOARD.errorTitle}`,
        `Error description: ${DASHBOARD.errorDescription}`,
        `Retry: ${DASHBOARD.retryLabel}`,
        `Balance hint: ${DASHBOARD.balanceHint}`,
        `Read-only note: ${DASHBOARD.readOnlyNote}`,
      ].join("\n");
    },
    rubric: [
      "CRITICAL: every string is Ukrainian-first with no English product jargon",
      "CRITICAL: the empty state explains there are no operations yet AND points to importing as the next step (not a dead blank screen)",
      "CRITICAL: the insufficient-trend state explains WHY the trend is missing (needs at least two months) rather than showing an empty chart with no reason",
      "the error state explains the failure and offers a clear retry, distinct from the empty and insufficient-data states",
      "the read-only nature is conveyed and the balance hint clarifies which statuses count, in a calm, finance-oriented tone — never a generic 'something went wrong'",
    ],
  },
];

// @trace FR-DASH-01, FR-DASH-04, FR-DASH-05, FR-SHELL-03, NFR-I18N-01

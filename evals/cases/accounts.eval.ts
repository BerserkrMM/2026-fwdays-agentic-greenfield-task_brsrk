// Accounts output eval case for Finup.
//
// Unit tests prove the archive-guard *logic*; this case grades the user-visible
// *quality* of the accounts copy — whether the screen labels the default account
// unambiguously and whether the archive-rejection messages explain WHY an action
// was blocked (and what to do instead) in calm, Ukrainian-first language, rather
// than a generic "something went wrong".
//
// `produce()` reads the REAL copy module (accounts-content.ts) — the single
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
    id: "eval-accounts-error-clarity",
    trace: ["FR-ACCT-05", "FR-ACCT-01", "NFR-I18N-01"],
    dimension: "ua-error-clarity",
    capability: "accounts",
    scenario:
      "A user manages accounts and attempts to archive the default or the last remaining account.",
    produce: async () => {
      const { ACCOUNTS_PAGE, ACCOUNT_ERRORS } = await import(
        "@/src/modules/accounts/ui/accounts-content"
      );
      return [
        "Route: /accounts",
        `Heading: ${ACCOUNTS_PAGE.title}`,
        `Intro: ${ACCOUNTS_PAGE.description}`,
        `Default label: ${ACCOUNTS_PAGE.defaultBadge}`,
        `Set-default action: ${ACCOUNTS_PAGE.setDefaultLabel}`,
        `Archive action: ${ACCOUNTS_PAGE.archiveLabel}`,
        ...Object.entries(ACCOUNT_ERRORS).map(
          ([code, message]) => `Error[${code}]: ${message}`,
        ),
      ].join("\n");
    },
    rubric: [
      "CRITICAL: every string is Ukrainian-first with no English product jargon",
      "CRITICAL: the archive-rejection messages explain WHY the action is blocked (default account / last active account) and imply what the user can do instead",
      "CRITICAL: the default account is labelled clearly and unambiguously",
      "the tone is calm and finance-oriented, not alarming",
      "messages are specific to the situation, never a generic 'something went wrong'",
    ],
  },
];

// @trace FR-ACCT-05, FR-ACCT-01, NFR-I18N-01

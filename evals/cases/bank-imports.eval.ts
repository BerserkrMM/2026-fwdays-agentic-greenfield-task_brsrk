// Bank-imports output eval case for Finup.
//
// Unit tests prove the deterministic validation/normalization/import behavior.
// This case grades the user-visible quality of the bank-import route copy and
// error states: provider/file validation, empty statement, parse failure, and
// Ledger summary handoff in Ukrainian-first language.

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
    id: "eval-bank-import-error-clarity",
    trace: ["FR-BANK-01", "FR-BANK-02", "FR-BANK-03", "FR-BANK-05", "NFR-I18N-01"],
    dimension: "ua-error-clarity",
    capability: "bank-imports",
    scenario:
      "A user opens /imports/bank, selects a bank provider, uploads an unsupported file, uploads an empty/noise statement, hits a parser failure, and then sees the Ledger created/failed summary after a successful import.",
    produce: async () => {
      const { BANK_IMPORT_PAGE, bankImportErrorMessage } = await import(
        "@/src/modules/bank-imports/ui/bank-import-content"
      );
      const { importSummaryMessage } = await import(
        "@/src/modules/manual-input/ui/import-summary"
      );
      return [
        "Route: /imports/bank",
        `Heading: ${BANK_IMPORT_PAGE.title}`,
        `Intro: ${BANK_IMPORT_PAGE.description}`,
        `Provider label: ${BANK_IMPORT_PAGE.providerLabel}`,
        `Providers: ${BANK_IMPORT_PAGE.providerOptions.map((option) => option.label).join(", ")}`,
        `File label: ${BANK_IMPORT_PAGE.fileLabel}`,
        `Hint: ${BANK_IMPORT_PAGE.hint}`,
        `Submit: ${BANK_IMPORT_PAGE.submitLabel}`,
        `Error title: ${BANK_IMPORT_PAGE.errorTitle}`,
        `Error[provider-invalid]: ${bankImportErrorMessage("provider-invalid")}`,
        `Error[file-invalid]: ${bankImportErrorMessage("file-invalid")}`,
        `Error[empty-statement]: ${bankImportErrorMessage("empty-statement")}`,
        `Error[parse-failed]: ${bankImportErrorMessage("parse-failed")}`,
        `Ledger summary (ok): ${importSummaryMessage({ created: 3, failed: 0 })}`,
        `Ledger summary (partial): ${importSummaryMessage({ created: 2, failed: 1 })}`,
      ].join("\n");
    },
    rubric: [
      "CRITICAL: every user-visible string is Ukrainian-first with no untranslated product jargon",
      "CRITICAL: validation errors specifically tell the user whether the provider, file type, or statement rows are the problem",
      "CRITICAL: the parse-failure message is recoverable and tells the user to retry or check the file, not a generic 500",
      "CRITICAL: the copy makes clear that imported rows go to the Ledger for review, without asking the user to approve a separate preview gate",
      "the Ledger summary clearly states created and failed item counts",
      "the tone is calm and practical for personal finance work",
    ],
  },
];

// @trace FR-BANK-01, FR-BANK-02, FR-BANK-03, FR-BANK-05, NFR-I18N-01

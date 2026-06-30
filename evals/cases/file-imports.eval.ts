// File-imports output eval case for Finup.
//
// Unit tests prove the deterministic validation/import behavior. This case grades
// the user-visible quality of the receipt-photo route copy and error states:
// upload guidance, non-image/PDF rejection, vision parse failure, and the Ledger
// summary handoff in Ukrainian-first language.

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
    id: "eval-file-import-error-clarity",
    trace: ["FR-FILE-01", "FR-FILE-03", "FR-FILE-04", "FR-FILE-05", "NFR-I18N-01"],
    dimension: "ua-error-clarity",
    capability: "file-imports",
    scenario:
      "A user opens /imports/files, uploads a non-image (PDF), hits a vision-parser failure, and then sees the Ledger created/failed summary after a successful receipt import.",
    produce: async () => {
      const { FILE_IMPORT_PAGE, fileImportErrorMessage } = await import(
        "@/src/modules/file-imports/ui/file-import-content"
      );
      const { importSummaryMessage } = await import(
        "@/src/modules/manual-input/ui/import-summary"
      );
      return [
        "Route: /imports/files",
        `Heading: ${FILE_IMPORT_PAGE.title}`,
        `Intro: ${FILE_IMPORT_PAGE.description}`,
        `File label: ${FILE_IMPORT_PAGE.fileLabel}`,
        `Hint: ${FILE_IMPORT_PAGE.hint}`,
        `Submit: ${FILE_IMPORT_PAGE.submitLabel}`,
        `Error title: ${FILE_IMPORT_PAGE.errorTitle}`,
        `Error[file-invalid]: ${fileImportErrorMessage("file-invalid")}`,
        `Error[parse-failed]: ${fileImportErrorMessage("parse-failed")}`,
        `Ledger summary (ok): ${importSummaryMessage({ created: 4, failed: 0 })}`,
        `Ledger summary (partial): ${importSummaryMessage({ created: 3, failed: 1 })}`,
      ].join("\n");
    },
    rubric: [
      "CRITICAL: every user-visible string is Ukrainian-first with no untranslated product jargon",
      "CRITICAL: the file-invalid error tells the user which formats are accepted (JPEG/PNG/WEBP) and that PDF is not supported",
      "CRITICAL: the parse-failure message is recoverable and tells the user to retry or check the photo, not a generic 500",
      "CRITICAL: the copy makes clear that recognized items go to the Ledger for review, without asking the user to approve a separate preview gate",
      "the Ledger summary clearly states created and failed item counts",
      "the tone is calm and practical for personal finance work",
    ],
  },
];

// @trace FR-FILE-01, FR-FILE-03, FR-FILE-04, FR-FILE-05, NFR-I18N-01

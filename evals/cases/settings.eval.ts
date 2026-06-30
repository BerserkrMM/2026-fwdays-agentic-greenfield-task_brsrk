// Settings output eval case for Finup.
//
// Unit tests prove the settings *logic* (write-only status, key validation, CSV
// hardening). This case grades the user-visible *quality* of the Settings copy —
// whether the not-configured state, validation errors, write-only messaging, and
// export/no-reset copy each explain WHAT is happening and WHAT the user can do
// next, in calm, Ukrainian-first language, rather than a blank screen or a generic
// "something went wrong".
//
// `produce()` reads the REAL copy module (settings-content.ts) — the single source
// of truth shared with the page and actions — so the judge grades the live product.

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
    id: "eval-settings-config-export-clarity",
    trace: ["FR-SET-01", "FR-SET-02", "FR-SET-03", "FR-SHELL-03", "NFR-I18N-01"],
    dimension: "ua-error-clarity",
    capability: "settings",
    scenario:
      "A user opens Settings to configure the OpenAI key (not yet set, or rejected as invalid), understands the key is never shown back, and exports their ledger to CSV with no destructive reset.",
    produce: async () => {
      const { SETTINGS, SETTINGS_ERRORS } = await import(
        "@/src/modules/settings/ui/settings-content"
      );
      return [
        "Route: /settings",
        `Heading: ${SETTINGS.title}`,
        `Subtitle: ${SETTINGS.description}`,
        `AI section: ${SETTINGS.aiHeading} — ${SETTINGS.aiDescription}`,
        `API key help: ${SETTINGS.apiKeyHelp}`,
        `Configured badge: ${SETTINGS.configuredBadge}`,
        `Not-configured title: ${SETTINGS.notConfiguredTitle}`,
        `Not-configured description: ${SETTINGS.notConfiguredDescription}`,
        `Remove key: ${SETTINGS.removeKeyLabel}`,
        `Removed notice: ${SETTINGS.removedNotice}`,
        `Saved notice: ${SETTINGS.savedNotice}`,
        `Error (required): ${SETTINGS_ERRORS["api-key-required"]}`,
        `Error (whitespace): ${SETTINGS_ERRORS["api-key-whitespace"]}`,
        `Error (too long): ${SETTINGS_ERRORS["api-key-too-long"]}`,
        `Export section: ${SETTINGS.exportHeading} — ${SETTINGS.exportDescription}`,
        `Export CTA: ${SETTINGS.exportLabel}`,
        `Export hint (incl. no destructive reset): ${SETTINGS.exportHint}`,
      ].join("\n");
    },
    rubric: [
      "CRITICAL: every string is Ukrainian-first with no English product jargon",
      "CRITICAL: the not-configured state explains the consequence (AI parsing will not work / will fail) AND the next step (add a key), not a dead blank state",
      "CRITICAL: the copy conveys that the stored key is write-only — it is never shown again, and the help text explains that a blank field keeps the existing key",
      "the validation errors are specific and actionable (required vs whitespace vs too-long are distinguishable, blame-free), never a generic 'something went wrong'",
      "the export copy makes clear it is read-only and that v1 has no destructive reset/clear-all, in a calm, finance-oriented tone",
    ],
  },
];

// @trace FR-SET-01, FR-SET-02, FR-SET-03, FR-SHELL-03, NFR-I18N-01

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
        "Маршрут: /settings",
        `Заголовок: ${SETTINGS.title}`,
        `Підзаголовок: ${SETTINGS.description}`,
        `Розділ ШІ: ${SETTINGS.aiHeading} — ${SETTINGS.aiDescription}`,
        `Підказка до API-ключа: ${SETTINGS.apiKeyHelp}`,
        `Позначка налаштування: ${SETTINGS.configuredBadge}`,
        `Стан без ключа: ${SETTINGS.notConfiguredTitle}`,
        `Пояснення стану без ключа: ${SETTINGS.notConfiguredDescription}`,
        `Дія видалення ключа: ${SETTINGS.removeKeyLabel}`,
        `Повідомлення після видалення: ${SETTINGS.removedNotice}`,
        `Повідомлення після збереження: ${SETTINGS.savedNotice}`,
        `Помилка: ключ обов’язковий: ${SETTINGS_ERRORS["api-key-required"]}`,
        `Помилка: пробіли в ключі: ${SETTINGS_ERRORS["api-key-whitespace"]}`,
        `Помилка: ключ задовгий: ${SETTINGS_ERRORS["api-key-too-long"]}`,
        `Розділ експорту: ${SETTINGS.exportHeading} — ${SETTINGS.exportDescription}`,
        `Кнопка експорту: ${SETTINGS.exportLabel}`,
        `Підказка експорту без очищення даних: ${SETTINGS.exportHint}`,
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

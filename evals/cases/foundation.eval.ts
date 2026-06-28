// Foundation output eval cases for Finup.
//
// These cases grade user-visible quality that unit tests do not capture well:
// whether the foundation shell/imports copy is clear, Ukrainian-first, explicit
// about pending review, and not a dead end while downstream slices are still
// placeholders.

export type EvalCase = {
  id: string;
  trace: string[];
  dimension: string;
  capability: string;
  scenario: string;
  produce: () => Promise<unknown>;
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
    produce: async () => ({
      route: "/imports",
      heading: "Імпорт",
      description:
        "Оберіть спосіб внесення. Будь-яке джерело перетворюється на операції зі статусом «очікує перевірки», які ви потім перевіряєте.",
      cards: [
        { title: "Текст", href: "/imports/text", description: "Вільний текст → операції «очікує перевірки»." },
        { title: "Фото чека", href: "/imports/files", description: "Одне фото чека → AI-розпізнавання → операції. PDF не підтримується." },
        { title: "Виписка банку", href: "/imports/bank", description: "Завантаження CSV/XLS/XLSX, вибір провайдера, рядки → операції." },
      ],
    }),
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
    produce: async () => ({
      component: "PlaceholderScreen",
      titleExample: "Рахунки",
      descriptionExample: "Список рахунків, типовий рахунок і баланси (UAH).",
      stateTitle: "Скоро",
      stateDescription: "Цей розділ зараз у розробці й з’явиться незабаром.",
    }),
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

// Single source of truth for the Imports hub copy (FR-IMPORT-01, FR-SHELL-03).
// Consumed by app/imports/page.tsx (the UI) AND the foundation eval cases, so the
// graded copy is exactly what the app renders — no duplicated strings to drift.

export interface ImportChannel {
  href: string;
  glyph: string;
  title: string;
  description: string;
}

export const IMPORTS_HUB = {
  title: "Імпорт",
  description:
    "Оберіть спосіб внесення. Будь-яке джерело перетворюється на операції зі статусом «очікує перевірки», які ви потім перевіряєте.",
  channels: [
    {
      href: "/imports/text",
      glyph: "✎",
      title: "Текст",
      description: "Напишіть витрати словами, напр. «40 грн ковбаса, 20 грн хліб».",
    },
    {
      href: "/imports/bank",
      glyph: "↥",
      title: "Виписка банку",
      description: "Завантажте виписку Monobank або PrivatBank (CSV/XLS/XLSX).",
    },
    {
      href: "/imports/files",
      glyph: "▣",
      title: "Фото чека",
      description: "Сфотографуйте один чек — система розпізнає операції.",
    },
  ] satisfies ImportChannel[],
  footer:
    "Потік: джерело → операції «очікує перевірки» → перевірка. Імпорт PDF поки не підтримується.",
} as const;

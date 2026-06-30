// Single source of truth for the Settings screen copy + error-surface messages
// (FR-SET-01/02/03, NFR-I18N-01). Shared by the page, the server actions, and the
// settings eval case so the graded copy is exactly what the user sees. Pure module
// (only a type import) — importing it pulls no UI tree.

import type { SettingsErrorCode } from "@/src/domain/app-config";

export const SETTINGS = {
  title: "Налаштування",
  description:
    "Технічні налаштування додатку: постачальник ШІ та експорт даних. Усе для одного користувача.",

  aiHeading: "Постачальник ШІ (OpenAI)",
  aiDescription:
    "Ключ потрібен, щоб ШІ розбирав ваші внесення на операції. Він зберігається на сервері й ніколи не показується повторно.",
  apiKeyLabel: "API-ключ OpenAI",
  apiKeyPlaceholder: "sk-…",
  apiKeyHelp:
    "Введіть ключ, щоб додати або замінити його. Залиште поле порожнім, щоб не змінювати збережений ключ.",
  modelLabel: "Модель (необов’язково)",
  modelPlaceholder: "gpt-4o-mini",
  modelHelp: "Залиште порожнім, щоб використати модель за замовчуванням.",
  saveLabel: "Зберегти налаштування",
  removeKeyLabel: "Видалити ключ",

  errorBannerTitle: "Не вдалося зберегти",
  configuredBadge: "Ключ налаштовано",
  notConfiguredTitle: "Ключ OpenAI ще не налаштовано",
  notConfiguredDescription:
    "Поки ключ не додано, розбір внесень через ШІ не працюватиме — внесення збережеться, але завершиться помилкою розбору.",
  savedNotice: "Налаштування збережено.",
  removedNotice: "Ключ видалено. Розбір через ШІ вимкнено, доки не додасте новий ключ.",

  exportHeading: "Експорт даних",
  exportDescription:
    "Завантажте всі операції журналу у форматі CSV. Експорт лише читає дані — нічого не змінює й не видаляє.",
  exportLabel: "Експортувати CSV",
  exportHint:
    "Файл містить усі операції, зокрема вилучені (зі статусом). Деструктивного очищення даних у версії 1 немає.",
} as const;

/** Canonical Ukrainian copy for each settings error code, shown in the banner. */
export const SETTINGS_ERRORS: Record<SettingsErrorCode, string> = {
  "api-key-required": "Вкажіть API-ключ OpenAI — поле не може бути порожнім.",
  "api-key-too-long":
    "API-ключ задовгий. Перевірте, що скопіювали лише ключ, без зайвого тексту.",
  "api-key-whitespace":
    "API-ключ не може містити пробіли. Перевірте скопійоване значення.",
};

const SETTINGS_ERROR_FALLBACK =
  "Не вдалося зберегти налаштування. Спробуйте ще раз.";

/** Maps a `?formError=` code to its banner message; null when there is no error. */
export function settingsErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return Object.hasOwn(SETTINGS_ERRORS, code)
    ? SETTINGS_ERRORS[code as SettingsErrorCode]
    : SETTINGS_ERROR_FALLBACK;
}

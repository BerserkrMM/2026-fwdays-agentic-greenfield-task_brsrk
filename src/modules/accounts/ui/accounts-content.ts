// Single source of truth for the Accounts screen copy + the error-surface
// messages (FR-ACCT-01/03/04/05, NFR-I18N-01). Shared by the page, the server
// actions, and the accounts eval case so the graded copy is exactly what the user
// sees. Pure module (only a type import) — importing it pulls no UI tree.

import type { AccountErrorCode } from "@/src/domain/account";

export const ACCOUNTS_PAGE = {
  title: "Рахунки",
  description:
    "Керуйте рахунками та оберіть типовий. Усі рахунки ведуться у гривні (UAH).",
  createHeading: "Новий рахунок",
  nameLabel: "Назва рахунку",
  namePlaceholder: "Напр. Картка, Готівка, Заощадження",
  createLabel: "Додати рахунок",
  defaultBadge: "Типовий",
  setDefaultLabel: "Зробити типовим",
  renameLabel: "Нова назва",
  renameSubmitLabel: "Перейменувати",
  archiveLabel: "Архівувати",
  emptyTitle: "Ще немає рахунків",
  emptyDescription:
    "Типовий рахунок «Готівка» створюється автоматично, щоб операції було куди записувати.",
  balanceHint: "Баланс кожного рахунку зʼявиться разом із журналом операцій.",
} as const;

/** Canonical Ukrainian copy for each account error code, shown in the banner. */
export const ACCOUNT_ERRORS: Record<AccountErrorCode, string> = {
  "name-required": "Вкажіть назву рахунку — поле не може бути порожнім.",
  "name-too-long": "Назва рахунку задовга. Будь ласка, скоротіть її.",
  "not-found": "Рахунок не знайдено — можливо, його вже архівовано.",
  "cannot-archive-default":
    "Не можна архівувати типовий рахунок. Спершу зробіть типовим інший рахунок.",
  "cannot-archive-last":
    "Не можна архівувати останній активний рахунок — має лишатися щонайменше один.",
};

/** Maps a `?formError=` code to its banner message; null when there is no error. */
export function accountErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return (
    ACCOUNT_ERRORS[code as AccountErrorCode] ??
    "Не вдалося виконати дію. Спробуйте ще раз."
  );
}

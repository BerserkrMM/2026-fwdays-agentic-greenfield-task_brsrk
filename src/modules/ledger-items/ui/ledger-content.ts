// Single source of truth for the Ledger (journal) screen copy + the error-surface
// messages (FR-ITEM-01..05, NFR-I18N-01). Shared by the page, the server actions,
// and the ledger-items eval case so the graded copy is exactly what the user
// sees. Pure module (only type imports) — importing it pulls no UI tree.

import type { LedgerItemErrorCode } from "@/src/domain/ledger-item-edit";
import type { LedgerItemStatus } from "@/src/domain/ledger-item";
import type { OperationType } from "@/src/domain/money";

export const LEDGER_PAGE = {
  title: "Журнал операцій",
  description:
    "Переглядайте, фільтруйте та впорядковуйте свої операції. Затверджуйте, редагуйте або вилучайте їх — вилучені залишаються в журналі як історія.",
  filtersHeading: "Фільтри та пошук",
  searchLabel: "Пошук за описом",
  searchPlaceholder: "Напр. кава, таксі, зарплата",
  statusLabel: "Статус",
  typeLabel: "Тип",
  accountLabel: "Рахунок",
  categoryLabel: "Категорія",
  fromLabel: "Від дати",
  toLabel: "До дати",
  anyOption: "Будь-який",
  allAccountsOption: "Усі рахунки",
  applyLabel: "Застосувати",
  resetLabel: "Скинути",
  loadMoreLabel: "Завантажити ще",
  editHeading: "Редагувати операцію",
  descriptionLabel: "Опис",
  amountLabel: "Сума (без знака)",
  categoryEditLabel: "Категорія",
  dateLabel: "Дата операції",
  saveLabel: "Зберегти",
  approveLabel: "Затвердити",
  deleteLabel: "Вилучити",
  countSummary: (shown: number, matched: number) =>
    `Показано ${shown} із ${matched}`,
  emptyTitle: "Журнал порожній",
  emptyDescription:
    "Тут зʼявляться операції, коли ви додасте їх через імпорт тексту, фото чеків або банківської виписки.",
  filteredEmptyTitle: "Нічого не знайдено",
  filteredEmptyDescription:
    "За обраними фільтрами немає операцій. Спробуйте змінити або скинути фільтри.",
} as const;

/** Ukrainian status labels shown on each row (FR-ITEM-01). */
export const STATUS_LABELS: Record<LedgerItemStatus, string> = {
  pending: "Очікує",
  approved: "Затверджено",
  deleted: "Вилучено",
};

/** Ukrainian operation-type labels (FR-ITEM-02). */
export const TYPE_LABELS: Record<OperationType, string> = {
  expense: "Витрата",
  income: "Дохід",
};

/** Canonical Ukrainian copy for each ledger-item error code, shown in the banner. */
export const LEDGER_ITEM_ERRORS: Record<LedgerItemErrorCode, string> = {
  "not-found": "Операцію не знайдено — можливо, її вже змінено в іншій вкладці.",
  "invalid-status":
    "Цю дію не можна виконати для поточного статусу операції. Затвердити можна лише операцію, що очікує; вилучену не можна редагувати.",
  "description-required": "Вкажіть опис операції — поле не може бути порожнім.",
  "amount-invalid":
    "Невірна сума. Введіть додатне число, напр. 200 або 200,50 (без знака).",
  "date-required": "Вкажіть дату операції — це обовʼязкове поле.",
  "account-not-found":
    "Обраний рахунок недоступний — можливо, його архівовано. Оберіть активний рахунок.",
};

/** Maps a `?formError=` code to its banner message; null when there is no error. */
export function ledgerErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return (
    LEDGER_ITEM_ERRORS[code as LedgerItemErrorCode] ??
    "Не вдалося виконати дію. Спробуйте ще раз."
  );
}

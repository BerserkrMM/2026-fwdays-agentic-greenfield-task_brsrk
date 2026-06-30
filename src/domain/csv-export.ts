// CSV export of ledger items — framework-free (TC-PURE-01). Pure serialization
// with two safety properties (FR-SET-03):
//   1. Spreadsheet formula-injection hardening (CWE-1236): a cell whose first
//      character is a formula trigger (= + - @, tab, or CR) is prefixed with an
//      apostrophe so Excel/Sheets/LibreOffice treat it as text, not a formula.
//   2. RFC-4180 quoting: a cell containing a comma, quote, or newline (or one we
//      neutralized) is wrapped in double quotes with embedded quotes doubled.

import type { LedgerItem, LedgerItemStatus } from "./ledger-item";
import type { OperationType } from "./money";

/** Ukrainian-first labels for the CSV `Тип`/`Статус` columns (NFR-I18N-01). */
const TYPE_LABELS: Record<OperationType, string> = {
  expense: "Витрата",
  income: "Дохід",
};
const STATUS_LABELS: Record<LedgerItemStatus, string> = {
  pending: "Очікує",
  approved: "Підтверджено",
  deleted: "Вилучено",
};

/** Local (Europe/Kyiv) calendar date as `YYYY-MM-DD` — what «Дата» should show. */
function kyivDate(date: Date): string {
  // sv-SE renders an ISO-like YYYY-MM-DD; the timeZone option does the conversion.
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Kyiv" }).format(date);
}

/** Ukrainian-first CSV column headers (NFR-I18N-01). */
export const CSV_HEADER = [
  "Дата",
  "Опис",
  "Сума",
  "Валюта",
  "Тип",
  "Категорія",
  "Статус",
  "Рахунок",
] as const;

const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

/**
 * Renders a single CSV cell with formula-injection hardening + RFC-4180 quoting.
 * Exported for direct unit testing of the hardening rule.
 */
export function csvCell(value: string): string {
  const neutralized = FORMULA_TRIGGERS.has(value[0] ?? "") ? `'${value}` : value;
  const mustQuote =
    neutralized !== value || /[",\n\r]/.test(neutralized);
  if (!mustQuote) return neutralized;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

/** Formats signed kopiyky as a plain signed decimal (e.g. -6000 -> "-60.00"). */
function amountForCsv(amountMinor: number): string {
  const sign = amountMinor < 0 ? "-" : "";
  const abs = Math.abs(amountMinor);
  const major = Math.trunc(abs / 100);
  const kopiyky = abs % 100;
  return `${sign}${major}.${String(kopiyky).padStart(2, "0")}`;
}

function rowFor(item: LedgerItem, accountNames?: Map<string, string>): string {
  const effectiveDate = item.occurredAt ?? item.createdAt;
  // The amount column is generated numeric data (`[-]digits.dd`), never
  // user-controlled text, so it is emitted raw: it carries no CSV-special
  // characters and a leading «-» on a negative amount is a number, not a
  // formula. Neutralizing it would prefix every expense with «'» and break
  // summing in spreadsheets (reviewer SPEC minor). Formula-injection hardening
  // is applied only to the free-text columns.
  return [
    csvCell(kyivDate(effectiveDate)),
    csvCell(item.description),
    amountForCsv(item.amountMinor),
    csvCell(item.currency),
    csvCell(TYPE_LABELS[item.type]),
    csvCell(item.category),
    csvCell(STATUS_LABELS[item.status]),
    csvCell(accountNames?.get(item.accountId) ?? item.accountId),
  ].join(",");
}

/**
 * Serializes ledger items to an RFC-4180 CSV string (CRLF line terminators).
 * Always emits the header row; an empty ledger yields the header alone. The input
 * order is preserved — callers pass items already sorted by the repository.
 * `accountNames` resolves the readable «Рахунок» column (id → name); a missing id
 * falls back to the raw id.
 */
export function toLedgerCsv(
  items: LedgerItem[],
  accountNames?: Map<string, string>,
): string {
  const headerLine = CSV_HEADER.join(",");
  if (items.length === 0) return headerLine;
  return [headerLine, ...items.map((item) => rowFor(item, accountNames))].join("\r\n");
}

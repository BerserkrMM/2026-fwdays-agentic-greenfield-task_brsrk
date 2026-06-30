import { describe, expect, it } from "vitest";
import {
  LEDGER_ITEM_ERRORS,
  LEDGER_PAGE,
  STATUS_LABELS,
  TYPE_LABELS,
  ledgerErrorMessage,
} from "./ledger-content";
import type { LedgerItemErrorCode } from "@/src/domain/ledger-item-edit";

// @trace FR-ITEM-01, FR-ITEM-03, FR-ITEM-04, FR-ITEM-05, NFR-I18N-01
describe("ledger-items content", () => {
  it("labels every status and operation type in Ukrainian", () => {
    expect(STATUS_LABELS.pending).toBe("Очікує");
    expect(STATUS_LABELS.approved).toBe("Затверджено");
    expect(STATUS_LABELS.deleted).toBe("Вилучено");
    expect(TYPE_LABELS.expense).toBe("Витрата");
    expect(TYPE_LABELS.income).toBe("Дохід");
  });

  it("gives distinct empty states for an empty journal vs. no filter matches", () => {
    expect(LEDGER_PAGE.emptyTitle).not.toBe(LEDGER_PAGE.filteredEmptyTitle);
    expect(LEDGER_PAGE.emptyDescription.trim().length).toBeGreaterThan(0);
    expect(LEDGER_PAGE.filteredEmptyDescription.trim().length).toBeGreaterThan(0);
  });

  it("summarises how many of the matched items are shown", () => {
    expect(LEDGER_PAGE.countSummary(10, 25)).toBe("Показано 10 із 25");
  });

  it("labels an archived account option so reassignment is discoverable", () => {
    expect(LEDGER_PAGE.archivedAccountNote).toContain("архівований");
    expect(LEDGER_PAGE.archivedAccountNote).toContain("активний");
  });

  it("maps every error code to a non-empty Ukrainian message", () => {
    const codes: LedgerItemErrorCode[] = [
      "not-found",
      "invalid-status",
      "description-required",
      "amount-invalid",
      "type-invalid",
      "date-required",
      "account-not-found",
    ];
    for (const code of codes) {
      expect(LEDGER_ITEM_ERRORS[code].trim().length).toBeGreaterThan(0);
      expect(ledgerErrorMessage(code)).toBe(LEDGER_ITEM_ERRORS[code]);
    }
  });

  it("returns null for no error code and a generic fallback for an unknown one", () => {
    expect(ledgerErrorMessage(undefined)).toBeNull();
    expect(ledgerErrorMessage("totally-unknown")).toContain("Спробуйте ще раз");
  });
});

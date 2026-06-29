import { describe, expect, it } from "vitest";
import type { LedgerItem } from "./ledger-item";
import {
  approveLedgerItem,
  deleteLedgerItem,
  editLedgerItem,
  LedgerItemError,
  parseAmountToMinor,
  type LedgerItemEdit,
} from "./ledger-item-edit";

function item(overrides: Partial<LedgerItem> = {}): LedgerItem {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    accountId: "acc-1",
    inputEventId: "evt-1",
    parserRunId: null,
    description: "стара назва",
    amountMinor: -1000,
    currency: "UAH",
    type: "expense",
    category: "Їжа",
    status: "pending",
    importRowNumber: null,
    occurredAt: new Date("2026-02-01T10:00:00Z"),
    createdAt: new Date("2026-02-01T09:00:00Z"),
    ...overrides,
  };
}

function edit(overrides: Partial<LedgerItemEdit> = {}): LedgerItemEdit {
  return {
    description: "Нова покупка",
    amount: "200,50",
    type: "expense",
    category: "Продукти",
    occurredAt: "2026-03-01T12:00",
    accountId: "acc-2",
    ...overrides,
  };
}

describe("parseAmountToMinor", () => {
  it("parses comma and dot decimals and grouped values to positive minor units", () => {
    expect(parseAmountToMinor("200,50")).toBe(20050);
    expect(parseAmountToMinor("200.5")).toBe(20050);
    expect(parseAmountToMinor("1 000")).toBe(100000);
    expect(parseAmountToMinor("7")).toBe(700);
  });

  it("rejects non-numeric, zero, negative and over-precise amounts", () => {
    for (const bad of ["", "abc", "0", "-5", "1.234", "1,2,3"]) {
      expect(() => parseAmountToMinor(bad)).toThrow(LedgerItemError);
    }
  });
});

// @trace FR-ITEM-03, FR-CAT-01, FR-CAT-03
describe("editLedgerItem", () => {
  it("applies edits and stores a signed amount matching the type", () => {
    const expense = editLedgerItem(item(), edit({ type: "expense", amount: "200,50" }));
    expect(expense.amountMinor).toBe(-20050);
    expect(expense.description).toBe("Нова покупка");
    expect(expense.accountId).toBe("acc-2");

    const income = editLedgerItem(item(), edit({ type: "income", amount: "200,50" }));
    expect(income.amountMinor).toBe(20050);
  });

  it("parses the zoneless date as UTC so the round-trip is timezone-stable", () => {
    const result = editLedgerItem(item(), edit({ occurredAt: "2026-03-01T12:00" }));
    expect(result.occurredAt?.toISOString()).toBe("2026-03-01T12:00:00.000Z");
  });

  it("keeps an approved item approved after editing", () => {
    const result = editLedgerItem(item({ status: "approved" }), edit());
    expect(result.status).toBe("approved");
  });

  it("refuses to edit a deleted item", () => {
    expect(() => editLedgerItem(item({ status: "deleted" }), edit())).toThrow(
      LedgerItemError,
    );
  });

  it("defaults a blank category to Без категорії", () => {
    const result = editLedgerItem(item(), edit({ category: "   " }));
    expect(result.category).toBe("Без категорії");
  });

  it("rejects empty description, bad amount and missing date with specific codes", () => {
    const cases: Array<[Partial<LedgerItemEdit>, string]> = [
      [{ description: "   " }, "description-required"],
      [{ amount: "abc" }, "amount-invalid"],
      [{ occurredAt: "" }, "date-required"],
    ];
    for (const [override, code] of cases) {
      try {
        editLedgerItem(item(), edit(override));
        throw new Error(`expected throw for ${code}`);
      } catch (error) {
        expect(error).toBeInstanceOf(LedgerItemError);
        expect((error as LedgerItemError).code).toBe(code);
      }
    }
  });

  it("preserves immutable provenance fields", () => {
    const original = item();
    const result = editLedgerItem(original, edit());
    expect(result.id).toBe(original.id);
    expect(result.inputEventId).toBe(original.inputEventId);
    expect(result.createdAt).toBe(original.createdAt);
    expect(result.currency).toBe("UAH");
  });
});

// @trace FR-ITEM-04
describe("approveLedgerItem", () => {
  it("moves a pending item to approved", () => {
    expect(approveLedgerItem(item({ status: "pending" })).status).toBe("approved");
  });

  it("rejects approving a non-pending item", () => {
    for (const status of ["approved", "deleted"] as const) {
      try {
        approveLedgerItem(item({ status }));
        throw new Error("expected throw");
      } catch (error) {
        expect(error).toBeInstanceOf(LedgerItemError);
        expect((error as LedgerItemError).code).toBe("invalid-status");
      }
    }
  });
});

// @trace FR-ITEM-05
describe("deleteLedgerItem", () => {
  it("marks an item deleted and is idempotent", () => {
    expect(deleteLedgerItem(item({ status: "pending" })).status).toBe("deleted");
    expect(deleteLedgerItem(item({ status: "approved" })).status).toBe("deleted");
    expect(deleteLedgerItem(item({ status: "deleted" })).status).toBe("deleted");
  });
});

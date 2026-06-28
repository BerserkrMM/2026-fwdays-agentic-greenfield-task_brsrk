import { describe, expect, it } from "vitest";
import {
  AccountError,
  CASH_ACCOUNT_NAME,
  isArchived,
  validateAccountName,
  type Account,
} from "./account";

function caught(fn: () => unknown): unknown {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
}

const base: Account = {
  id: "a1",
  name: "Картка",
  currency: "UAH",
  isDefault: false,
  archivedAt: null,
  createdAt: new Date(),
};

describe("account domain", () => {
  // @trace FR-ACCT-03
  it("trims a valid account name", () => {
    expect(validateAccountName("  Картка  ")).toBe("Картка");
  });

  // @trace FR-ACCT-03, FR-ACCT-04
  it("rejects an empty/whitespace name with code name-required", () => {
    const e = caught(() => validateAccountName("   "));
    expect(e).toBeInstanceOf(AccountError);
    expect((e as AccountError).code).toBe("name-required");
  });

  // @trace FR-ACCT-03
  it("rejects an over-long name with code name-too-long", () => {
    const e = caught(() => validateAccountName("я".repeat(200)));
    expect(e).toBeInstanceOf(AccountError);
    expect((e as AccountError).code).toBe("name-too-long");
  });

  // @trace FR-ACCT-05
  it("reports archived state from archivedAt", () => {
    expect(isArchived(base)).toBe(false);
    expect(isArchived({ ...base, archivedAt: new Date() })).toBe(true);
  });

  // @trace FR-ACCT-06
  it("uses Готівка as the seeded cash-account name", () => {
    expect(CASH_ACCOUNT_NAME).toBe("Готівка");
  });
});

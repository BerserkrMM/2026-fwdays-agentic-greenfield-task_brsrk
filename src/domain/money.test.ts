import { describe, expect, it } from "vitest";
import { amountMatchesType, formatUahMinor } from "./money";

describe("amountMatchesType", () => {
  it("requires expenses negative and income positive", () => {
    expect(amountMatchesType(-100, "expense")).toBe(true);
    expect(amountMatchesType(100, "expense")).toBe(false);
    expect(amountMatchesType(100, "income")).toBe(true);
    expect(amountMatchesType(-100, "income")).toBe(false);
  });
});

// @trace FR-ACCT-02, NFR-I18N-01
describe("formatUahMinor", () => {
  it("formats kopiyky into grouped UAH with the ₴ symbol", () => {
    expect(formatUahMinor(0)).toBe("0,00 ₴");
    expect(formatUahMinor(5)).toBe("0,05 ₴");
    expect(formatUahMinor(12345)).toBe("123,45 ₴");
    expect(formatUahMinor(100000000)).toBe("1 000 000,00 ₴");
  });

  it("keeps the sign of negative (expense) balances", () => {
    expect(formatUahMinor(-2000)).toBe("-20,00 ₴");
    expect(formatUahMinor(-50)).toBe("-0,50 ₴");
  });
});

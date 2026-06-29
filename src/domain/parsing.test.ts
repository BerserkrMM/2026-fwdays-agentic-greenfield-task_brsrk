import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORY } from "./money";
import {
  canonicalizeParserDrafts,
  normalizeParserPayload,
  ParsingError,
} from "./parsing";

// @trace FR-PARSE-02, FR-PARSE-03, FR-PARSE-04
describe("canonicalizeParserDrafts", () => {
  it("defaults blank categories and preserves valid confidence/source refs", () => {
    const drafts = canonicalizeParserDrafts([
      {
        description: "  Кава  ",
        amountMinor: -4500,
        currency: "UAH",
        type: "expense",
        category: "   ",
        confidence: 0.72,
        occurredAt: "2026-06-29T08:30:00.000Z",
        sourceRef: { rowNumber: 7 },
      },
    ]);

    expect(drafts).toEqual([
      {
        description: "Кава",
        amountMinor: -4500,
        currency: "UAH",
        type: "expense",
        category: DEFAULT_CATEGORY,
        confidence: 0.72,
        occurredAt: "2026-06-29T08:30:00.000Z",
        sourceRef: { rowNumber: 7 },
      },
    ]);
  });

  it("preserves non-empty category text as-is", () => {
    expect(
      canonicalizeParserDrafts([
        {
          description: "Хліб",
          amountMinor: -3000,
          currency: "UAH",
          type: "expense",
          category: "  Продукти  ",
        },
      ])[0]?.category,
    ).toBe("  Продукти  ");
  });

  it("rejects invalid draft shape and confidence bounds", () => {
    const invalidDrafts = [
      null,
      { description: "", amountMinor: -100, currency: "UAH", type: "expense", category: "Їжа" },
      { description: "Кава", amountMinor: 0, currency: "UAH", type: "expense", category: "Їжа" },
      { description: "Кава", amountMinor: -100, currency: "EUR", type: "expense", category: "Їжа" },
      { description: "Кава", amountMinor: -100, currency: "UAH", type: "other", category: "Їжа" },
      { description: "Кава", amountMinor: -100, currency: "UAH", type: "income", category: "Їжа" },
      { description: "Кава", amountMinor: -100, currency: "UAH", type: "expense", category: "Їжа", occurredAt: "not-a-date" },
      { description: "Кава", amountMinor: -100, currency: "UAH", type: "expense", category: "Їжа", confidence: 1.2 },
      { description: "Кава", amountMinor: -100, currency: "UAH", type: "expense", category: "Їжа", confidence: Number.NaN },
      { description: "Кава", amountMinor: -100, currency: "UAH", type: "expense", category: "Їжа", sourceRef: "row" },
      { description: "Кава", amountMinor: -100, currency: "UAH", type: "expense", category: "Їжа", sourceRef: { rowNumber: 1.5 } },
    ];

    for (const invalid of invalidDrafts) {
      expect(() => canonicalizeParserDrafts([invalid])).toThrow(ParsingError);
    }
    expect(() => canonicalizeParserDrafts({})).toThrow(ParsingError);
  });
});

// @trace FR-PARSE-05
describe("normalizeParserPayload", () => {
  it("masks obvious personal data and removes blank/noise lines before adapter calls", () => {
    const normalized = normalizeParserPayload({
      kind: "text",
      content: "  чек\n\n email: buyer@example.com\nphone +380 67 123 45 67\ncard 4444555566667777\n  кава 45 грн  ",
      locale: "uk-UA",
    });

    expect(normalized).toEqual({
      kind: "text",
      content:
        "чек\nemail: [email]\nphone [phone]\ncard [number]\nкава 45 грн",
      locale: "uk-UA",
    });
  });
});

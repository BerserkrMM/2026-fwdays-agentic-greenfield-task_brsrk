import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORY } from "./money";
import {
  canonicalizeParserDrafts,
  normalizeParserPayload,
  ParsingError,
  redactParserPayloadForStorage,
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

  it("preserves bank-statement date/time values while masking phones and long numbers", () => {
    const normalized = normalizeParserPayload({
      kind: "bank",
      content: 'row 2026-06-01; row 27.02.2025 18:04:09; mono 28.02.1830 18:42:01; phone +380 67 123 45 67; card 4444555566667777',
    });

    expect(normalized.content).toBe(
      "row 2026-06-01; row 27.02.2025 18:04:09; mono 28.02.1830 18:42:01; phone [phone]; card [number]",
    );
  });
});

describe("redactParserPayloadForStorage", () => {
  it("returns the payload unchanged when there is no image", () => {
    const payload = { kind: "text" as const, content: "кава 45" };
    expect(redactParserPayloadForStorage(payload)).toBe(payload);
  });

  it("strips the raw base64 and reports the real decoded byte length", () => {
    // "AQID" => 3 bytes (no padding); "AQI=" => 2 bytes (one pad); "AQ==" => 1 byte (two pads).
    const cases: Array<[string, number]> = [
      ["data:image/png;base64,AQID", 3],
      ["data:image/png;base64,AQI=", 2],
      ["data:image/png;base64,AQ==", 1],
      ["data:image/png;base64,", 0],
      ["data:image/png", 0],
    ];
    for (const [dataUri, expected] of cases) {
      const redacted = redactParserPayloadForStorage({
        kind: "photo",
        content: "чек",
        image: { dataUri, mimeType: "image/png" },
      }) as { image: { mimeType: string; byteLength: number }; content: string };
      expect(redacted.image).toEqual({ mimeType: "image/png", byteLength: expected });
      expect(JSON.stringify(redacted)).not.toContain("base64,");
    }
  });
});

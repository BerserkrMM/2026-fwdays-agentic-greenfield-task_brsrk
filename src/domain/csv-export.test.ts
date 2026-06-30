import { describe, expect, it } from "vitest";
import type { LedgerItem } from "@/src/domain/ledger-item";
import { CSV_HEADER, csvCell, toLedgerCsv } from "@/src/domain/csv-export";

let seq = 0;
function item(overrides: Partial<LedgerItem> = {}): LedgerItem {
  seq += 1;
  return {
    id: `i${seq}`,
    accountId: "acc-1",
    inputEventId: "ev-1",
    parserRunId: null,
    description: `опис ${seq}`,
    amountMinor: -6000,
    currency: "UAH",
    type: "expense",
    category: "Їжа",
    confidence: null,
    status: "pending",
    importRowNumber: null,
    occurredAt: new Date("2025-05-12T08:00:00Z"),
    createdAt: new Date("2025-05-12T08:00:00Z"),
    ...overrides,
  };
}

describe("toLedgerCsv (FR-SET-03)", () => {
  it("emits the header row even for an empty ledger", () => {
    expect(toLedgerCsv([])).toBe(CSV_HEADER.join(","));
  });

  it("writes one CSV row per item with a signed hryvnia amount", () => {
    const csv = toLedgerCsv([
      item({ amountMinor: -6000, type: "expense", category: "Їжа" }),
      item({ amountMinor: 50000, type: "income", category: "Зарплата" }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(CSV_HEADER.join(","));
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("-60.00"); // -6000 kopiyky
    expect(lines[2]).toContain("500.00"); // 50000 kopiyky
    // the numeric amount column is NOT formula-neutralized — a leading «-» on a
    // negative amount is a number, so it must export raw (stays summable), not «'-60.00»
    expect(lines[1]).not.toContain("'-60.00");
    expect(lines[1].split(",")[2]).toBe("-60.00");
    expect(lines[1]).toContain("Їжа");
    expect(lines[2]).toContain("Зарплата");
  });

  it("includes deleted items (Ukrainian status label) — a full export, not a filtered view", () => {
    const csv = toLedgerCsv([item({ status: "deleted", description: "видалений рядок" })]);
    expect(csv).toContain("Вилучено"); // status label, Ukrainian (NFR-I18N-01)
    expect(csv).toContain("видалений рядок");
    expect(csv).not.toContain("deleted"); // machine enum code must not leak
  });

  it("renders Ukrainian type/status labels and a local date, and resolves the account name", () => {
    const csv = toLedgerCsv(
      [
        item({
          type: "income",
          amountMinor: 50000,
          status: "approved",
          accountId: "acc-1",
          occurredAt: new Date("2025-05-12T22:30:00Z"), // → 2025-05-13 in Europe/Kyiv
        }),
      ],
      new Map([["acc-1", "Готівка"]]),
    );
    const row = csv.split("\r\n")[1].split(",");
    expect(row[0]).toBe("2025-05-13"); // Kyiv-local date, no time/Z
    expect(row[4]).toBe("Дохід"); // type label
    expect(row[6]).toBe("Підтверджено"); // status label
    expect(row[7]).toBe("Готівка"); // resolved account name
  });

  it("quotes fields containing commas, quotes or newlines per RFC 4180", () => {
    const csv = toLedgerCsv([item({ description: 'кава, "велика"\nдодаток' })]);
    // embedded quotes are doubled and the whole field is wrapped in quotes
    expect(csv).toContain('"кава, ""велика""\nдодаток"');
  });
});

describe("csvCell — spreadsheet formula-injection hardening (FR-SET-03, CWE-1236)", () => {
  it.each(["=SUM(A1)", "+1+1", "-2+3", "@cmd", "\t=evil", "\r=evil"])(
    "neutralizes a leading formula trigger: %s",
    (raw) => {
      const cell = csvCell(raw);
      // the dangerous value is prefixed with an apostrophe so a spreadsheet
      // treats it as text rather than evaluating it as a formula
      expect(cell).toContain(`'${raw}`);
    },
  );

  it("leaves an ordinary value unescaped", () => {
    expect(csvCell("кава")).toBe("кава");
  });

  it("a formula-injection attempt survives a full row export", () => {
    const csv = toLedgerCsv([item({ description: "=HYPERLINK(0)", category: "@evil" })]);
    expect(csv).toContain("'=HYPERLINK(0)");
    expect(csv).toContain("'@evil");
  });
});

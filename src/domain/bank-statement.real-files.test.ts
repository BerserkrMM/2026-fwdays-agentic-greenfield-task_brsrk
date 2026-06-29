import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeBankStatement, statementBytesToText, type BankProvider } from "./bank-statement";

// Integration coverage against real provider exports committed under
// docs/test_bank_statements/. These exercise the quirks that synthetic fixtures
// miss: cp1251 encoding, an XLSX shipped with a .xls name, long preambles, and
// descriptive column titles ("Сума в валюті картки", "Опис операції").
const FIXTURES = join(process.cwd(), "docs", "test_bank_statements");

const cases: { name: string; provider: BankProvider; path: string }[] = [
  { name: "monobank cp1251 CSV", provider: "monobank", path: join(FIXTURES, "monobank", "1.csv") },
  {
    name: "monobank XLSX named .xls",
    provider: "monobank",
    path: join(FIXTURES, "monobank", "report_24-06-2026_14-48-32.xls"),
  },
  {
    name: "privatbank XLSX",
    provider: "privatbank",
    path: join(FIXTURES, "privatbank", "_JhbQT56SV-4UBMC-J6Yuqmfd7avuiUikKiYrDoEpa8.xlsx"),
  },
];

// @trace FR-BANK-01, FR-BANK-03
describe("real provider statement exports", () => {
  for (const c of cases) {
    const run = existsSync(c.path) ? it : it.skip;
    run(`extracts transaction rows from ${c.name}`, () => {
      const bytes = new Uint8Array(readFileSync(c.path));
      const text = statementBytesToText({ fileName: c.path, bytes });
      const table = normalizeBankStatement({ provider: c.provider, rawText: text });

      expect(table.headers.length).toBeGreaterThan(1);
      expect(table.rows.length).toBeGreaterThan(0);
      for (const row of table.rows) {
        expect(row.rowNumber).toBeGreaterThan(table.headerRowNumber);
        expect(row.rowId).toBe(`r${row.rowNumber}`);
        expect(row.cells.length).toBeGreaterThan(1);
        // Structural extraction should preserve raw transaction-like cell values
        // for AI, without requiring deterministic semantic column mapping.
        expect(row.cells.some((cell) => /\d/.test(cell))).toBe(true);
      }
    });
  }
});

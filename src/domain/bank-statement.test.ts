import { describe, expect, it } from "vitest";
import {
  BankStatementError,
  assertBankProvider,
  assertSupportedBankFile,
  normalizeBankStatement,
  statementBytesToText,
} from "./bank-statement";

// @trace FR-BANK-01, FR-BANK-02
describe("bank statement validation", () => {
  it("accepts supported providers and supported statement file types", () => {
    expect(assertBankProvider("monobank")).toBe("monobank");
    expect(assertBankProvider("privatbank")).toBe("privatbank");
    expect(assertSupportedBankFile("june.csv", "text/csv")).toEqual({
      fileName: "june.csv",
      mimeType: "text/csv",
    });
    expect(assertSupportedBankFile("export.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").fileName).toBe("export.xlsx");
  });

  it("rejects unsupported providers and files", () => {
    expect(() => assertBankProvider("other")).toThrow(BankStatementError);
    expect(() => assertSupportedBankFile("receipt.pdf", "application/pdf")).toThrow(
      BankStatementError,
    );
  });
});

// @trace FR-BANK-03
describe("provider-specific bank normalization", () => {
  it("prepares clean monobank rows with source row numbers without categorizing", () => {
    const rows = normalizeBankStatement({
      provider: "monobank",
      rawText: "Дата,Опис,MCC,Сума,Валюта\n2026-06-01,АТБ маркет,5411,-120.50,UAH\nРазом,,,,-120.50\n",
    });
    expect(rows).toEqual([
      {
        rowNumber: 2,
        date: "2026-06-01",
        description: "АТБ маркет",
        amount: "-120.50",
        currency: "UAH",
      },
    ]);
    expect(JSON.stringify(rows)).not.toContain("category");
    expect(JSON.stringify(rows)).not.toContain("expense");
  });

  it("prepares clean privatbank rows and skips obvious non-transaction rows", () => {
    const rows = normalizeBankStatement({
      provider: "privatbank",
      rawText: "Дата;Призначення платежу;Сума;Валюта\nПеріод: червень;;;\n03.06.2026;Поповнення картки;2000,00;UAH\nБаланс на кінець;;;\n",
    });
    expect(rows).toEqual([
      {
        rowNumber: 3,
        date: "03.06.2026",
        description: "Поповнення картки",
        amount: "2000,00",
        currency: "UAH",
      },
    ]);
  });

  it("handles quoted delimiters and tab-separated exports", () => {
    expect(
      normalizeBankStatement({
        provider: "monobank",
        rawText: 'Дата\tОпис\tСума\n2026-06-01\t"АТБ, маркет"\t-120.00\n',
      })[0].description,
    ).toBe("АТБ, маркет");
  });

  it("extracts rows from an Excel HTML .xls export before normalization", () => {
    const text = statementBytesToText({
      fileName: "pb.xls",
      bytes: new Uint8Array(),
      textFallback:
        "<table><tr><th>Дата</th><th>Призначення платежу</th><th>Сума</th></tr><tr><td>2026-06-01</td><td>АТБ</td><td>-120.50</td></tr></table>",
    });
    expect(normalizeBankStatement({ provider: "privatbank", rawText: text })[0].description).toBe(
      "АТБ",
    );
  });

  it("extracts worksheet rows from an XLSX workbook before normalization", () => {
    const workbook = makeStoredXlsx({
      "xl/sharedStrings.xml": "<sst><si><t>Дата</t></si><si><t>Опис</t></si><si><t>Сума</t></si><si><t>АТБ</t></si></sst>",
      "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2"><c r="A2"><v>2026-06-01</v></c><c r="B2" t="s"><v>3</v></c><c r="C2"><v>-120.50</v></c></row></sheetData></worksheet>',
    });
    const text = statementBytesToText({ fileName: "mono.xlsx", bytes: workbook, textFallback: "" });
    expect(normalizeBankStatement({ provider: "monobank", rawText: text })[0]).toMatchObject({
      rowNumber: 2,
      description: "АТБ",
      amount: "-120.50",
    });
  });

  it("keeps comma-bearing cells intact when rebuilding an Excel HTML .xls export", () => {
    const text = statementBytesToText({
      fileName: "pb.xls",
      bytes: new Uint8Array(),
      textFallback:
        "<table><tr><th>Дата</th><th>Опис</th><th>Сума</th></tr><tr><td>2026-06-01</td><td>АТБ, маркет</td><td>-120.50</td></tr></table>",
    });
    expect(normalizeBankStatement({ provider: "privatbank", rawText: text })[0]).toMatchObject({
      description: "АТБ, маркет",
      amount: "-120.50",
    });
  });

  it("keeps comma-bearing cells intact when rebuilding an XLSX worksheet", () => {
    const workbook = makeStoredXlsx({
      "xl/sharedStrings.xml":
        "<sst><si><t>Дата</t></si><si><t>Опис</t></si><si><t>Сума</t></si><si><t>АТБ, маркет</t></si></sst>",
      "xl/worksheets/sheet1.xml":
        '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2"><c r="A2"><v>2026-06-01</v></c><c r="B2" t="s"><v>3</v></c><c r="C2"><v>-120.50</v></c></row></sheetData></worksheet>',
    });
    const text = statementBytesToText({ fileName: "mono.xlsx", bytes: workbook, textFallback: "" });
    expect(normalizeBankStatement({ provider: "monobank", rawText: text })[0]).toMatchObject({
      rowNumber: 2,
      description: "АТБ, маркет",
      amount: "-120.50",
    });
  });

  it("rejects a corrupt XLSX upload as an invalid file instead of throwing", () => {
    expect(() =>
      statementBytesToText({
        fileName: "evil.xlsx",
        bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
        textFallback: "",
      }),
    ).toThrow(BankStatementError);
  });

  it("rejects a statement with no normalized transaction rows", () => {
    expect(() =>
      normalizeBankStatement({ provider: "monobank", rawText: "Дата,Опис,Сума\nРазом,,0\n" }),
    ).toThrow(BankStatementError);
  });

  it("rejects a statement with no recognizable header", () => {
    expect(() => normalizeBankStatement({ provider: "privatbank", rawText: "не виписка" })).toThrow(
      BankStatementError,
    );
  });
});

function makeStoredXlsx(files: Record<string, string>): Uint8Array {
  const chunks: number[][] = [];
  const central: number[][] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = bytes(name);
    const data = bytes(content);
    const crc = crc32(data);
    const local = [
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0),
      ...nameBytes, ...data,
    ];
    chunks.push(local);
    central.push([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...nameBytes,
    ]);
    offset += local.length;
  }
  const centralOffset = offset;
  const centralBytes = central.flat();
  const eocd = [
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length),
    ...u32(centralBytes.length), ...u32(centralOffset), ...u16(0),
  ];
  return new Uint8Array([...chunks.flat(), ...centralBytes, ...eocd]);
}

function bytes(value: string): number[] {
  return [...new TextEncoder().encode(value)];
}

function u16(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function u32(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

function crc32(data: number[]): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Bank-statement domain helpers — deterministic and framework-free (FR-BANK-01..03).
// They validate provider/file metadata and normalize provider exports into clean
// rows for the parser. They do not categorize, infer final item types, call AI,
// or write ledger items.

import { inflateRawSync } from "node:zlib";

export type BankProvider = "monobank" | "privatbank";

export interface SupportedBankFile {
  fileName: string;
  mimeType: string | null;
}

export interface NormalizeBankStatementInput {
  provider: BankProvider;
  rawText: string;
}

export interface NormalizedBankRow {
  rowNumber: number;
  date: string;
  description: string;
  amount: string;
  currency: string;
}

export type BankStatementErrorCode =
  | "provider-invalid"
  | "file-invalid"
  | "empty-statement";

export class BankStatementError extends Error {
  constructor(
    public readonly code: BankStatementErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BankStatementError";
  }
}

const SUPPORTED_EXTENSIONS = new Set(["csv", "xls", "xlsx"]);
const SUPPORTED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

const DATE_ALIASES = ["дата", "date", "operation date", "дата операції"];
const DESCRIPTION_ALIASES = [
  "опис",
  "description",
  "призначення платежу",
  "деталі операції",
  "коментар",
  "merchant",
  "контрагент",
];
const AMOUNT_ALIASES = ["сума", "amount", "amount in card currency", "сума операції"];
const CURRENCY_ALIASES = ["валюта", "currency", "ccy"];

export function assertBankProvider(value: unknown): BankProvider {
  if (value === "monobank" || value === "privatbank") return value;
  throw new BankStatementError("provider-invalid", "Unsupported bank provider.");
}

export function assertSupportedBankFile(
  fileName: unknown,
  mimeType: unknown,
): SupportedBankFile {
  if (typeof fileName !== "string" || !fileName.trim()) {
    throw new BankStatementError("file-invalid", "Statement file is required.");
  }
  const normalizedMime = typeof mimeType === "string" && mimeType.trim()
    ? mimeType.trim().toLowerCase()
    : null;
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new BankStatementError("file-invalid", "Unsupported statement file type.");
  }
  if (normalizedMime && !SUPPORTED_MIME_TYPES.has(normalizedMime)) {
    throw new BankStatementError("file-invalid", "Unsupported statement file type.");
  }
  return { fileName, mimeType: normalizedMime };
}

export function normalizeBankStatement(
  input: NormalizeBankStatementInput,
): NormalizedBankRow[] {
  const rawLines = input.rawText.split(/\r?\n/);
  const delimiter = chooseDelimiter(rawLines);
  const parsed = rawLines.map((line, index) => ({
    lineNumber: index + 1,
    cells: parseDelimitedLine(line, delimiter).map((cell) => cell.trim()),
  }));
  const headerIndex = parsed.findIndex((row) => looksLikeHeader(row.cells));
  if (headerIndex < 0) {
    throw new BankStatementError("empty-statement", "No statement rows found.");
  }

  const header = parsed[headerIndex].cells.map(normalizeHeader);
  const columns = resolveColumns(input.provider, header);
  const rows: NormalizedBankRow[] = [];

  for (const row of parsed.slice(headerIndex + 1)) {
    const cells = row.cells;
    if (isNoiseRow(cells)) continue;
    const date = valueAt(cells, columns.date);
    const description = valueAt(cells, columns.description);
    const amount = valueAt(cells, columns.amount);
    const currency = valueAt(cells, columns.currency) || "UAH";
    if (!date || !description || !amount || !looksLikeAmount(amount)) continue;
    rows.push({ rowNumber: row.lineNumber, date, description, amount, currency });
  }

  if (rows.length === 0) {
    throw new BankStatementError("empty-statement", "No transaction rows found.");
  }
  return rows;
}

export function serializeBankRows(provider: BankProvider, rows: NormalizedBankRow[]): string {
  return JSON.stringify({ provider, rows });
}

export function statementBytesToText(input: {
  fileName: string;
  bytes: Uint8Array;
  textFallback: string;
}): string {
  const extension = input.fileName.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "xls") {
    if (/<table[\s>]/i.test(input.textFallback)) {
      return htmlTableToDelimited(input.textFallback);
    }
    // Legacy binary BIFF .xls (OLE2 compound document) is not supported in v1;
    // only the Excel HTML-table .xls export is. Reject it deterministically
    // instead of feeding binary bytes to the delimited-text parser.
    if (isOle2CompoundFile(input.bytes)) {
      throw new BankStatementError(
        "file-invalid",
        "Legacy binary .xls is not supported; export the statement as CSV or XLSX.",
      );
    }
    return input.textFallback;
  }
  if (extension !== "xlsx") return input.textFallback;
  try {
    const files = unzipFiles(input.bytes);
    const sharedStrings = readSharedStrings(files.get("xl/sharedStrings.xml") ?? "");
    const sheet = [...files.entries()].find(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
    if (!sheet) throw new BankStatementError("file-invalid", "Workbook has no worksheet.");
    return worksheetXmlToDelimited(sheet[1], sharedStrings);
  } catch (error) {
    // A corrupt/hostile workbook (bad ZIP, oversized inflate, byte-range error)
    // must surface as a friendly validation error, never an uncaught 500.
    if (error instanceof BankStatementError) throw error;
    throw new BankStatementError("file-invalid", "Unsupported or corrupt XLSX workbook.");
  }
}

// Choose the delimiter by the line that actually looks like a transaction
// header, not the first non-empty line: provider exports often begin with a
// preamble ("Виписка за період…", account name) whose delimiter differs from
// the table. Prefer the candidate that splits a header line into the most
// recognized columns; fall back to the densest first non-empty line.
// OLE2 / Compound File Binary signature — the container legacy BIFF .xls uses.
const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function isOle2CompoundFile(bytes: Uint8Array): boolean {
  if (bytes.length < OLE2_SIGNATURE.length) return false;
  return OLE2_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function chooseDelimiter(lines: string[]): "," | ";" | "\t" {
  const candidates = [";", "\t", ","] as const;
  let best: (typeof candidates)[number] | null = null;
  let bestScore = 0;
  for (const delimiter of candidates) {
    for (const line of lines) {
      if (!line.trim()) continue;
      const cells = parseDelimitedLine(line, delimiter).map((cell) => cell.trim());
      if (looksLikeHeader(cells) && cells.length > bestScore) {
        best = delimiter;
        bestScore = cells.length;
      }
    }
  }
  if (best) return best;
  const firstDataLine = lines.find((line) => line.trim().length > 0) ?? "";
  const counts = [
    [";", count(firstDataLine, ";")],
    ["\t", count(firstDataLine, "\t")],
    [",", count(firstDataLine, ",")],
  ] as const;
  return counts.toSorted((a, b) => b[1] - a[1])[0][0];
}

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === delimiter && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

function looksLikeHeader(cells: string[]): boolean {
  const normalized = cells.map(normalizeHeader);
  return (
    findIndex(normalized, DATE_ALIASES) >= 0 &&
    findIndex(normalized, AMOUNT_ALIASES) >= 0 &&
    findIndex(normalized, DESCRIPTION_ALIASES) >= 0
  );
}

function resolveColumns(provider: BankProvider, header: string[]) {
  // Provider parameter is intentionally present: aliases can diverge as exports
  // are hardened. Current v1 aliases cover both common Monobank and PrivatBank
  // CSV headings without changing parser/item semantics.
  void provider;
  return {
    date: findIndex(header, DATE_ALIASES),
    description: findIndex(header, DESCRIPTION_ALIASES),
    amount: findIndex(header, AMOUNT_ALIASES),
    currency: findIndex(header, CURRENCY_ALIASES),
  };
}

function normalizeHeader(value: string): string {
  return value.trim().replace(/^\uFEFF/, "").replace(/\s+/g, " ").toLowerCase();
}

function findIndex(header: string[], aliases: string[]): number {
  return header.findIndex((name) => aliases.includes(name));
}

function valueAt(cells: string[], index: number): string {
  return index >= 0 ? (cells[index] ?? "").trim() : "";
}

function isNoiseRow(cells: string[]): boolean {
  const compact = cells.join(" ").trim().toLowerCase();
  if (!compact) return true;
  return /^(разом|усього|баланс|період|period|total)\b/.test(compact);
}

function looksLikeAmount(value: string): boolean {
  return /-?\d+(?:[,.]\d+)?/.test(value.replace(/\s/g, ""));
}

function htmlTableToDelimited(html: string): string {
  // Join cells with a tab, not a comma: reconstructed text is re-parsed by
  // normalizeBankStatement, and a comma inside a cell (e.g. "АТБ, маркет" or a
  // "2000,00" amount) would otherwise shift every later column. Tabs do not
  // appear inside extracted cell text, so they are an unambiguous delimiter.
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) =>
      [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((cell) => xmlText(cell[1]).trim().replace(/\t/g, " "))
        .join("\t"),
    )
    .filter(Boolean)
    .join("\n");
}

/* c8 ignore start -- low-level ZIP/XML fallback is exercised through statementBytesToText; branch-level coverage is noisy. */
// Only these entries are read; everything else in the workbook is skipped so a
// crafted XLSX cannot force us to inflate unrelated payloads.
const NEEDED_XLSX_ENTRY = /^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/;
// Bound each inflated entry so a small "zip bomb" cannot amplify into GBs and OOM
// the process. A real statement worksheet is comfortably under this.
const MAX_XLSX_ENTRY_BYTES = 32 * 1024 * 1024;

function unzipFiles(bytes: Uint8Array): Map<string, string> {
  const files = new Map<string, string>();
  const eocd = findSignature(bytes, 0x06054b50, bytes.length - 22, -1);
  if (eocd < 0) throw new BankStatementError("file-invalid", "Invalid XLSX workbook.");
  const entryCount = u16(bytes, eocd + 10);
  let offset = u32(bytes, eocd + 16);
  for (let i = 0; i < entryCount; i += 1) {
    if (u32(bytes, offset) !== 0x02014b50) break;
    const method = u16(bytes, offset + 10);
    const compressedSize = u32(bytes, offset + 20);
    const nameLength = u16(bytes, offset + 28);
    const extraLength = u16(bytes, offset + 30);
    const commentLength = u16(bytes, offset + 32);
    const localOffset = u32(bytes, offset + 42);
    const name = decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
    if (!NEEDED_XLSX_ENTRY.test(name)) continue;
    const localNameLength = u16(bytes, localOffset + 26);
    const localExtraLength = u16(bytes, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const raw =
      method === 8
        ? inflateRawSync(compressed, { maxOutputLength: MAX_XLSX_ENTRY_BYTES })
        : compressed.slice(0, MAX_XLSX_ENTRY_BYTES);
    files.set(name, decode(raw));
  }
  return files;
}

function readSharedStrings(xml: string): string[] {
  if (!xml) return [];
  return [...xml.matchAll(/<si[\s\S]*?<\/si>/g)].map((match) =>
    [...match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((part) => xmlText(part[1]))
      .join(""),
  );
}

function worksheetXmlToDelimited(xml: string, sharedStrings: string[]): string {
  // Place each row at its declared `r="N"` index so the source Excel row number
  // is preserved through normalization (sourceRef.rowNumber / import_row_number),
  // instead of collapsing rows to a dense sequence.
  const lines: string[] = [];
  for (const row of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowAttrs = row[1];
    const rowBody = row[2];
    const cells: string[] = [];
    for (const cell of rowBody.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cell[1];
      const body = cell[2];
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1];
      const index = ref ? columnIndex(ref) : cells.length;
      cells[index] = readCellValue(attrs, body, sharedStrings);
    }
    if (cells.some((value) => value?.trim())) {
      // Tab-delimited so comma-bearing cell values survive re-parsing (see
      // htmlTableToDelimited). Strip stray tabs from cell text first.
      const line = cells.map((value) => (value ?? "").replace(/\t/g, " ")).join("\t");
      const declaredRow = Number(/\br="(\d+)"/.exec(rowAttrs)?.[1] ?? 0);
      if (Number.isSafeInteger(declaredRow) && declaredRow > 0) {
        while (lines.length < declaredRow - 1) lines.push("");
        lines[declaredRow - 1] = line;
      } else {
        lines.push(line);
      }
    }
  }
  return lines.join("\n");
}

function readCellValue(attrs: string, body: string, sharedStrings: string[]): string {
  const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
  if (type === "inlineStr") {
    return [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => xmlText(m[1])).join("");
  }
  const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
  if (type === "s") return sharedStrings[Number(raw)] ?? "";
  return xmlText(raw);
}

function columnIndex(column: string): number {
  let n = 0;
  for (const ch of column) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

function xmlText(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function findSignature(bytes: Uint8Array, signature: number, start: number, step: 1 | -1): number {
  for (let i = Math.max(0, start); i >= 0 && i <= bytes.length - 4; i += step) {
    if (u32(bytes, i) === signature) return i;
  }
  return -1;
}

function u16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
/* c8 ignore stop */

// Bank-statement domain helpers — deterministic and framework-free (FR-BANK-01..03).
// They validate provider/file metadata and extract statement tables into clean
// structural rows for the parser. They do not categorize, infer final item
// fields, call AI, or write ledger items.

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
  /** Physical source row number from CSV/text line or Excel row r="N". */
  rowNumber: number;
  /** Stable ID the AI must echo back; easier to copy than a bare number. */
  rowId: string;
  /** Raw table cells aligned to `headers`; semantic meaning is left to AI. */
  cells: string[];
}

export interface NormalizedBankTable {
  provider: BankProvider;
  headerRowNumber: number;
  /** Raw table headers; unknown/empty headers are given deterministic names. */
  headers: string[];
  rows: NormalizedBankRow[];
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

// Semantic aliases are NOT used to decide final column meaning. They are only a
// tie-breaker for locating the header row when an export includes a long preamble.
const DATE_ALIASES = ["дата", "date"];
const DESCRIPTION_ALIASES = [
  "опис",
  "деталі",
  "призначення",
  "коментар",
  "merchant",
  "контрагент",
  "description",
  "назва",
];
const AMOUNT_ALIASES = ["сума", "amount"];
const CURRENCY_ALIASES = ["валюта", "currency", "ccy"];
const STRUCTURAL_HEADER_ALIASES = [
  ...DATE_ALIASES,
  ...DESCRIPTION_ALIASES,
  ...AMOUNT_ALIASES,
  ...CURRENCY_ALIASES,
];

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
): NormalizedBankTable {
  // NFC-normalize first: some provider exports store Ukrainian letters in
  // decomposed form (e.g. "ї" as "і" + combining diaeresis), which would break
  // header/table heuristics against precomposed text.
  const rawLines = input.rawText.normalize("NFC").split(/\r?\n/);
  const delimiter = chooseDelimiter(rawLines);
  const parsed = rawLines.map((line, index) => ({
    lineNumber: index + 1,
    cells: parseDelimitedLine(line, delimiter).map((cell) => cell.trim()),
  }));
  const headerIndex = findHeaderIndex(parsed);
  if (headerIndex < 0) {
    throw new BankStatementError("empty-statement", "No statement rows found.");
  }

  const headerRow = parsed[headerIndex];
  const width = Math.max(nonEmptyCellCount(headerRow.cells), headerRow.cells.length);
  const headers = headerRow.cells.slice(0, width).map((cell, index) => headerName(cell, index));
  const rows: NormalizedBankRow[] = [];

  for (const row of parsed.slice(headerIndex + 1)) {
    const cells = row.cells.slice(0, Math.max(width, row.cells.length)).map((cell) => cell.trim());
    if (isNoiseRow(cells)) continue;
    if (isDuplicateHeaderRow(cells, headers)) continue;
    if (!looksLikeDataRow(cells, width)) continue;
    rows.push({ rowNumber: row.lineNumber, rowId: `r${row.lineNumber}`, cells });
  }

  if (rows.length === 0) {
    throw new BankStatementError("empty-statement", "No transaction rows found.");
  }
  return { provider: input.provider, headerRowNumber: headerRow.lineNumber, headers, rows };
}

export function serializeBankRows(table: NormalizedBankTable): string {
  return JSON.stringify(table);
}

// Decode a statement upload to delimited text. Format is detected from the file
// CONTENT (magic bytes), not the extension, because providers routinely ship an
// XLSX workbook with a `.xls` name. `textFallback` is only used when raw bytes
// are unavailable (e.g. unit tests that supply text directly).
export function statementBytesToText(input: {
  fileName: string;
  bytes: Uint8Array;
  textFallback?: string;
}): string {
  const { bytes } = input;
  const extension = input.fileName.split(".").pop()?.toLowerCase() ?? "";

  // XLSX is a ZIP container ("PK\x03\x04"); trust the magic over the extension.
  if (hasZipMagic(bytes) || (extension === "xlsx" && bytes.length > 0)) {
    return xlsxBytesToText(bytes);
  }
  // Legacy binary BIFF .xls is an OLE2 compound document — not supported in v1
  // (only the Excel HTML-table ".xls" export is). Reject it deterministically
  // instead of feeding binary bytes to the delimited-text parser.
  if (isOle2CompoundFile(bytes)) {
    throw new BankStatementError(
      "file-invalid",
      "Legacy binary .xls is not supported; export the statement as CSV or XLSX.",
    );
  }
  // CSV or Excel HTML-table .xls. Decode bytes ourselves (handles Windows-1251,
  // which Ukrainian banks still use) instead of assuming UTF-8.
  const text = bytes.length > 0 ? decodeStatementText(bytes) : (input.textFallback ?? "");
  if (/<table[\s>]/i.test(text)) return htmlTableToDelimited(text);
  return text;
}

function xlsxBytesToText(bytes: Uint8Array): string {
  try {
    const files = unzipFiles(bytes);
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

// ZIP local-file-header signature "PK\x03\x04" — the container XLSX uses.
function hasZipMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

// Decode statement text, falling back from UTF-8 to Windows-1251 (cp1251) when
// the UTF-8 decode produces replacement characters — Ukrainian bank CSV exports
// are frequently cp1251-encoded, which would otherwise become mojibake and
// defeat table/header detection.
function decodeStatementText(bytes: Uint8Array): string {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (!utf8.includes("�")) return utf8;
  try {
    return new TextDecoder("windows-1251").decode(bytes);
  } catch {
    return utf8;
  }
}

// Choose the delimiter by the line that actually looks like a table header, not
// the first non-empty line: provider exports often begin with a preamble whose
// delimiter differs from the table. Prefer the candidate that produces the best
// structural table score; fall back to the densest first non-empty line.
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
    const parsed = lines.map((line, index) => ({
      lineNumber: index + 1,
      cells: parseDelimitedLine(line, delimiter).map((cell) => cell.trim()),
    }));
    const score = bestHeaderScore(parsed);
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
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

function findHeaderIndex(rows: Array<{ lineNumber: number; cells: string[] }>): number {
  let bestIndex = -1;
  let bestScore = 0;
  rows.forEach((_, index) => {
    const score = headerScoreAt(rows, index);
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });
  return bestScore > 0 ? bestIndex : -1;
}

function bestHeaderScore(rows: Array<{ lineNumber: number; cells: string[] }>): number {
  return rows.reduce((best, _, index) => Math.max(best, headerScoreAt(rows, index)), 0);
}

function headerScoreAt(rows: Array<{ lineNumber: number; cells: string[] }>, index: number): number {
  const cells = rows[index]?.cells ?? [];
  const width = nonEmptyCellCount(cells);
  if (width < 2 || !hasTextCell(cells)) return 0;

  const following = rows.slice(index + 1).filter((row) => !isNoiseRow(row.cells)).slice(0, 8);
  const dataRows = following.filter((row) => looksLikeDataRow(row.cells, width));
  if (dataRows.length === 0) return 0;

  const normalized = cells.map(normalizeHeader);
  const semanticHints = STRUCTURAL_HEADER_ALIASES.filter((alias) => findIndex(normalized, [alias]) >= 0).length;
  const uniqueTextCells = new Set(cells.map((cell) => normalizeHeader(cell)).filter(Boolean)).size;
  const textScore = cells.filter((cell) => /[\p{L}A-Za-z]/u.test(cell)).length;
  return dataRows.length * 20 + Math.min(width, 12) * 3 + uniqueTextCells + textScore + semanticHints * 4;
}

function looksLikeDataRow(cells: string[], expectedWidth: number): boolean {
  const nonEmpty = nonEmptyCellCount(cells);
  if (nonEmpty < 2) return false;
  if (expectedWidth >= 4 && nonEmpty < Math.max(2, Math.floor(expectedWidth * 0.35))) return false;
  return cells.some((cell) => /\d/.test(cell)) || cells.some((cell) => /[\p{L}A-Za-z]/u.test(cell));
}

function nonEmptyCellCount(cells: string[]): number {
  return cells.filter((cell) => cell.trim()).length;
}

function hasTextCell(cells: string[]): boolean {
  return cells.some((cell) => /[\p{L}A-Za-z]/u.test(cell));
}

function headerName(value: string, index: number): string {
  const normalized = value.trim().replace(/^\uFEFF/, "").replace(/\s+/g, " ");
  return normalized || `Колонка ${index + 1}`;
}

function normalizeHeader(value: string): string {
  return value.trim().replace(/^\uFEFF/, "").replace(/\s+/g, " ").toLowerCase();
}

// Match a header column by alias as a SUBSTRING, not an exact string. Used only
// as a header-location tie breaker; semantic column mapping belongs to AI.
function findIndex(header: string[], aliases: string[]): number {
  return header.findIndex((name) => aliases.some((alias) => name === alias || name.includes(alias)));
}

function isNoiseRow(cells: string[]): boolean {
  const compact = cells.join(" ").trim().toLowerCase();
  if (!compact) return true;
  return ["разом", "усього", "баланс", "період", "period", "total"].some((prefix) =>
    compact === prefix || compact.startsWith(`${prefix} `) || compact.startsWith(`${prefix}:`),
  );
}

function isDuplicateHeaderRow(cells: string[], headers: string[]): boolean {
  const normalizedCells = cells.map(normalizeHeader).filter(Boolean);
  if (normalizedCells.length < 2) return false;
  const normalizedHeaders = new Set(headers.map(normalizeHeader).filter(Boolean));
  const matches = normalizedCells.filter((cell) => normalizedHeaders.has(cell)).length;
  return matches >= Math.min(3, normalizedCells.length);
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

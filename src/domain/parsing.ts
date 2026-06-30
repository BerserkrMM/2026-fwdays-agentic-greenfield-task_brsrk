// Parsing domain contracts and pure validation/normalization helpers.
// Framework-free (TC-PURE-01). The parser returns drafts only and never writes
// ledger items (FR-PARSE-07).

import { DEFAULT_CATEGORY } from "./money";
import type { ParsedLedgerItemDraft } from "./parsed-draft";
import type { ParserRun } from "./parser-run";

export type ParserPayloadKind = "text" | "bank" | "photo";

export interface ParserPayloadImage {
  /** `data:<mime>;base64,…` of the receipt image; passed through normalization untouched. */
  dataUri: string;
  mimeType: string;
}

interface BaseParserPayload {
  /** Already source-normalized channel content; parsing-level privacy cleanup still runs. */
  content: string;
  locale?: "uk-UA" | string;
  sourceRef?: {
    rowNumber?: number;
    photoIndex?: number;
  };
}

export type ParserPayload =
  | (BaseParserPayload & { kind: "text" | "bank"; image?: never })
  | (BaseParserPayload & {
      kind: "photo";
      /** Image payload required for `kind: "photo"` vision parsing (FR-FILE-04). */
      image: ParserPayloadImage;
    });

export interface AdapterParsingResult {
  drafts: ParsedLedgerItemDraft[];
}

export interface ParsingResult {
  parserRun: ParserRun;
  drafts: ParsedLedgerItemDraft[];
  /** Drafts the parser returned that failed canonicalization (only populated when tolerated). */
  invalidDrafts: InvalidParserDraft[];
}

export interface ParserAdapter {
  parse(payload: ParserPayload): Promise<AdapterParsingResult>;
}

export type ParsingErrorCode =
  | "input-event-not-found"
  | "adapter-failed"
  | "invalid-draft";

export class ParsingError extends Error {
  constructor(
    public readonly code: ParsingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ParsingError";
  }
}

export function normalizeParserPayload(payload: ParserPayload): ParserPayload {
  return {
    ...payload,
    content: normalizeTextContent(payload.content),
  };
}

/**
 * A view of the payload safe to persist on `parser_runs.normalized_payload`: it
 * drops the raw image base64 (already preserved on the input_event's
 * `storage_uri`) so the large blob is not duplicated in parser-run history, while
 * keeping the image's type and size for traceability.
 */
export function redactParserPayloadForStorage(payload: ParserPayload): unknown {
  if (!payload.image) return payload;
  const { image, ...rest } = payload;
  return {
    ...rest,
    image: { mimeType: image.mimeType, byteLength: dataUriByteLength(image.dataUri) },
  };
}

/** Decoded byte length of a base64 `data:` URI payload (not the base64 char count). */
function dataUriByteLength(dataUri: string): number {
  const comma = dataUri.indexOf(",");
  if (comma === -1) return 0;
  const base64 = dataUri.slice(comma + 1);
  if (base64.length === 0) return 0;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function normalizeTextContent(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s().:-]{8,}\d/g, (match) => {
      // Bank-statement rows contain dates like 2026-06-01 or
      // 27.02.2025 18:04:09. Those are critical parser input, not PII phone
      // numbers, so preserve them while still masking long card/account values.
      if (looksLikeDateTime(match)) return match;
      const digits = match.replace(/\D/g, "");
      if (digits.length >= 13) return "[number]";
      return "[phone]";
    });
}

function looksLikeDateTime(value: string): boolean {
  const trimmed = value.trim();
  return (
    /\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?\b/.test(trimmed) ||
    /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{4}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?\b/.test(trimmed)
  );
}

export interface InvalidParserDraft {
  index: number;
  reason: string;
  draft: unknown;
}

export function canonicalizeParserDrafts(input: unknown): ParsedLedgerItemDraft[] {
  if (!Array.isArray(input)) {
    throw new ParsingError("invalid-draft", "Parser result must contain a drafts array.");
  }
  return input.map((draft, index) => canonicalizeDraft(draft, index));
}

export function canonicalizeValidParserDrafts(input: unknown): {
  drafts: ParsedLedgerItemDraft[];
  invalidDrafts: InvalidParserDraft[];
} {
  if (!Array.isArray(input)) {
    throw new ParsingError("invalid-draft", "Parser result must contain a drafts array.");
  }
  const drafts: ParsedLedgerItemDraft[] = [];
  const invalidDrafts: InvalidParserDraft[] = [];
  input.forEach((draft, index) => {
    try {
      drafts.push(canonicalizeDraft(draft, index));
    } catch (error) {
      invalidDrafts.push({
        index,
        reason: error instanceof Error ? error.message : String(error),
        draft,
      });
    }
  });
  return { drafts, invalidDrafts };
}

function canonicalizeDraft(input: unknown, index: number): ParsedLedgerItemDraft {
  if (!isRecord(input)) {
    throw invalid(index, "draft must be an object");
  }

  const description = stringField(input.description).trim();
  if (!description) throw invalid(index, "description is required");

  const amountMinor = canonicalAmount(input.amountMinor, index);
  const type = canonicalType(input.type, index);
  ensureAmountSign(type, amountMinor, index);
  ensureUah(input.currency, index);

  const categoryValue = stringField(input.category);
  const category = categoryValue.trim() ? categoryValue : DEFAULT_CATEGORY;
  const occurredAt = canonicalOccurredAt(input.occurredAt, index);
  const confidence = canonicalConfidence(input.confidence, index);

  const sourceRef = canonicalizeSourceRef(input.sourceRef, index);

  return {
    description,
    amountMinor,
    currency: "UAH",
    type,
    category,
    ...(occurredAt ? { occurredAt } : {}),
    ...(confidence !== undefined ? { confidence } : {}),
    ...(sourceRef ? { sourceRef } : {}),
  };
}

function canonicalAmount(value: unknown, index: number): number {
  if (!Number.isInteger(value) || value === 0) {
    throw invalid(index, "amountMinor must be a non-zero integer");
  }
  return value as number;
}

function canonicalType(value: unknown, index: number): "expense" | "income" {
  if (value !== "expense" && value !== "income") {
    throw invalid(index, "type must be expense or income");
  }
  return value;
}

function ensureAmountSign(type: "expense" | "income", amountMinor: number, index: number): void {
  if ((type === "expense" && amountMinor >= 0) || (type === "income" && amountMinor <= 0)) {
    throw invalid(index, "amountMinor sign must match type");
  }
}

function ensureUah(value: unknown, index: number): void {
  if (value !== "UAH") throw invalid(index, "currency must be UAH");
}

function canonicalOccurredAt(value: unknown, index: number): string | undefined {
  const occurredAt = optionalString(value, index, "occurredAt");
  if (occurredAt && Number.isNaN(Date.parse(occurredAt))) {
    throw invalid(index, "occurredAt must be parseable as a date/time");
  }
  return occurredAt;
}

function canonicalConfidence(value: unknown, index: number): number | undefined {
  const confidence = optionalNumber(value, index, "confidence");
  if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
    throw invalid(index, "confidence must be within [0,1]");
  }
  return confidence;
}

function canonicalizeSourceRef(input: unknown, index: number) {
  if (input === undefined || input === null) return undefined;
  if (!isRecord(input)) throw invalid(index, "sourceRef must be an object");
  const rowNumber = optionalInteger(input.rowNumber, index, "sourceRef.rowNumber");
  const photoIndex = optionalInteger(input.photoIndex, index, "sourceRef.photoIndex");
  if (rowNumber === undefined && photoIndex === undefined) return undefined;
  return {
    ...(rowNumber !== undefined ? { rowNumber } : {}),
    ...(photoIndex !== undefined ? { photoIndex } : {}),
  };
}

function invalid(index: number, reason: string): ParsingError {
  return new ParsingError("invalid-draft", `Invalid parser draft ${index + 1}: ${reason}.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalString(value: unknown, index: number, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw invalid(index, `${field} must be a string`);
  return value;
}

function optionalNumber(value: unknown, index: number, field: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw invalid(index, `${field} must be a finite number`);
  }
  return value;
}

function optionalInteger(value: unknown, index: number, field: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Number.isInteger(value)) throw invalid(index, `${field} must be an integer`);
  return value as number;
}

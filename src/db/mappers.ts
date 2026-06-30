// Mappers: raw DB rows <-> framework-free domain types. The only place that
// knows about column names and DB coercions (TC-STACK-04).

import { CURRENCY } from "@/src/domain/money";
import type { Account } from "@/src/domain/account";
import type { AppConfig } from "@/src/domain/app-config";
import type { InputEvent } from "@/src/domain/input-event";
import type { LedgerItem } from "@/src/domain/ledger-item";
import type { ParserRun } from "@/src/domain/parser-run";
import type {
  AccountRow,
  AppConfigRow,
  InputEventRow,
  LedgerItemRow,
  ParserRunRow,
} from "./rows";

export function toAppConfig(row: AppConfigRow): AppConfig {
  return {
    openAiApiKey: row.openai_api_key,
    openAiModel: row.openai_model,
    updatedAt: row.updated_at,
  };
}

export function toAccount(row: AccountRow): Account {
  if (row.currency !== CURRENCY) {
    throw new Error(`Unexpected accounts.currency: ${row.currency}`);
  }
  return {
    id: row.id,
    name: row.name,
    currency: CURRENCY,
    isDefault: row.is_default,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export function fromAccount(account: Account): AccountRow {
  return {
    id: account.id,
    name: account.name,
    currency: account.currency,
    is_default: account.isDefault,
    archived_at: account.archivedAt,
    created_at: account.createdAt,
  };
}

export function toInputEvent(row: InputEventRow): InputEvent {
  return {
    id: row.id,
    source: row.source,
    provider: row.provider,
    rawText: row.raw_text,
    storageUri: row.storage_uri,
    mimeType: row.mime_type,
    createdAt: row.created_at,
  };
}

export function toParserRun(row: ParserRunRow): ParserRun {
  return {
    id: row.id,
    inputEventId: row.input_event_id,
    status: row.status,
    normalizedPayload: row.normalized_payload,
    resultJson:
      row.result_json == null
        ? null
        : typeof row.result_json === "string"
          ? row.result_json
          : JSON.stringify(row.result_json),
    error: row.error,
    createdAt: row.created_at,
  };
}

export function toLedgerItem(row: LedgerItemRow): LedgerItem {
  const amountMinor =
    typeof row.amount_minor === "string"
      ? Number(row.amount_minor)
      : row.amount_minor;

  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error(`Invalid ledger_items.amount_minor: ${row.amount_minor}`);
  }

  if (row.currency !== CURRENCY) {
    throw new Error(`Unexpected ledger_items.currency: ${row.currency}`);
  }

  const confidence =
    row.confidence == null
      ? null
      : typeof row.confidence === "string"
        ? Number(row.confidence)
        : row.confidence;
  if (confidence !== null && (confidence < 0 || confidence > 1 || !Number.isFinite(confidence))) {
    throw new Error(`Invalid ledger_items.confidence: ${row.confidence}`);
  }

  return {
    id: row.id,
    accountId: row.account_id,
    inputEventId: row.input_event_id,
    parserRunId: row.parser_run_id,
    description: row.description,
    amountMinor,
    currency: CURRENCY,
    type: row.type,
    category: row.category,
    confidence,
    status: row.status,
    importRowNumber: row.import_row_number,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

export function fromLedgerItem(item: LedgerItem): LedgerItemRow {
  return {
    id: item.id,
    account_id: item.accountId,
    input_event_id: item.inputEventId,
    parser_run_id: item.parserRunId,
    description: item.description,
    amount_minor: item.amountMinor,
    currency: item.currency,
    type: item.type,
    category: item.category,
    confidence: item.confidence,
    status: item.status,
    import_row_number: item.importRowNumber,
    occurred_at: item.occurredAt,
    created_at: item.createdAt,
  };
}

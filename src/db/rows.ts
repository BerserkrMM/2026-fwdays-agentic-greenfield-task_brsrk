// Raw database row shapes (snake_case, as returned by the `postgres` client).
// Mappers in ./mappers.ts convert these to framework-free domain types.
// `postgres` returns timestamptz as Date and bigint as string by default.

import type {
  BankProvider,
  InputEventSource,
} from "@/src/domain/input-event";
import type { LedgerItemStatus } from "@/src/domain/ledger-item";
import type { OperationType } from "@/src/domain/money";
import type { ParserRunStatus } from "@/src/domain/parser-run";

export interface AccountRow {
  id: string;
  name: string;
  currency: string;
  is_default: boolean;
  archived_at: Date | null;
  created_at: Date;
}

export interface InputEventRow {
  id: string;
  source: InputEventSource;
  provider: BankProvider | null;
  raw_text: string | null;
  storage_uri: string | null;
  mime_type: string | null;
  created_at: Date;
}

export interface ParserRunRow {
  id: string;
  input_event_id: string;
  status: ParserRunStatus;
  normalized_payload: string | null;
  result_json: unknown | null;
  error: string | null;
  created_at: Date;
}

export interface LedgerItemRow {
  id: string;
  account_id: string;
  input_event_id: string;
  parser_run_id: string | null;
  description: string;
  amount_minor: string | number;
  currency: string;
  type: OperationType;
  category: string;
  status: LedgerItemStatus;
  import_row_number: number | null;
  occurred_at: Date | null;
  created_at: Date;
}

// Postgres-backed repositories — used when DATABASE_URL is set (TC-STACK-03/04).
// All access goes through the single shared `postgres` client; no module builds
// its own client.

import type { Sql } from "postgres";
import type { InputEvent, NewInputEvent } from "@/src/domain/input-event";
import type { LedgerItem } from "@/src/domain/ledger-item";
import type { NewParserRun, ParserRun } from "@/src/domain/parser-run";
import type {
  InputEventRepository,
  LedgerItemRepository,
  ParserRunRepository,
  Repositories,
} from "@/src/domain/ports";
import { fromLedgerItem, toInputEvent, toLedgerItem, toParserRun } from "./mappers";
import type { InputEventRow, LedgerItemRow, ParserRunRow } from "./rows";

class PgInputEventRepository implements InputEventRepository {
  constructor(private readonly sql: Sql) {}

  async create(event: NewInputEvent): Promise<InputEvent> {
    const [row] = await this.sql<InputEventRow[]>`
      INSERT INTO input_events (id, source, provider, raw_text, storage_uri, mime_type)
      VALUES (${event.id ?? globalThis.crypto.randomUUID()}, ${event.source},
              ${event.provider}, ${event.rawText}, ${event.storageUri},
              ${event.mimeType})
      RETURNING *`;
    return toInputEvent(row);
  }

  async findById(id: string): Promise<InputEvent | null> {
    const [row] = await this.sql<InputEventRow[]>`
      SELECT * FROM input_events WHERE id = ${id}`;
    return row ? toInputEvent(row) : null;
  }
}

class PgParserRunRepository implements ParserRunRepository {
  constructor(private readonly sql: Sql) {}

  async create(run: NewParserRun): Promise<ParserRun> {
    const [row] = await this.sql<ParserRunRow[]>`
      INSERT INTO parser_runs (id, input_event_id, status, normalized_payload, result_json, error)
      VALUES (${run.id ?? globalThis.crypto.randomUUID()}, ${run.inputEventId},
              ${run.status}, ${run.normalizedPayload}, ${run.resultJson},
              ${run.error})
      RETURNING *`;
    return toParserRun(row);
  }

  async findById(id: string): Promise<ParserRun | null> {
    const [row] = await this.sql<ParserRunRow[]>`
      SELECT * FROM parser_runs WHERE id = ${id}`;
    return row ? toParserRun(row) : null;
  }
}

class PgLedgerItemRepository implements LedgerItemRepository {
  constructor(private readonly sql: Sql) {}

  async insert(item: LedgerItem): Promise<LedgerItem> {
    const r = fromLedgerItem(item);
    const [row] = await this.sql<LedgerItemRow[]>`
      INSERT INTO ledger_items
        (id, account_id, input_event_id, parser_run_id, description, amount_minor,
         currency, type, category, status, import_row_number, occurred_at)
      VALUES
        (${r.id}, ${r.account_id}, ${r.input_event_id}, ${r.parser_run_id},
         ${r.description}, ${r.amount_minor}, ${r.currency}, ${r.type},
         ${r.category}, ${r.status}, ${r.import_row_number}, ${r.occurred_at})
      RETURNING *`;
    return toLedgerItem(row);
  }

  async findById(id: string): Promise<LedgerItem | null> {
    const [row] = await this.sql<LedgerItemRow[]>`
      SELECT * FROM ledger_items WHERE id = ${id}`;
    return row ? toLedgerItem(row) : null;
  }
}

export function createPostgresRepositories(sql: Sql): Repositories {
  return {
    inputEvents: new PgInputEventRepository(sql),
    parserRuns: new PgParserRunRepository(sql),
    ledgerItems: new PgLedgerItemRepository(sql),
  };
}

// Postgres-backed repositories — used when DATABASE_URL is set (TC-STACK-03/04).
// All access goes through the single shared `postgres` client; no module builds
// its own client.

import type { Sql } from "postgres";
import type { Account } from "@/src/domain/account";
import type { InputEvent, NewInputEvent } from "@/src/domain/input-event";
import type { LedgerItem } from "@/src/domain/ledger-item";
import type { NewParserRun, ParserRun } from "@/src/domain/parser-run";
import type {
  AccountRepository,
  InputEventRepository,
  LedgerItemRepository,
  ParserRunRepository,
  Repositories,
} from "@/src/domain/ports";
import {
  fromAccount,
  fromLedgerItem,
  toAccount,
  toInputEvent,
  toLedgerItem,
  toParserRun,
} from "./mappers";
import type {
  AccountRow,
  InputEventRow,
  LedgerItemRow,
  ParserRunRow,
} from "./rows";

class PgAccountRepository implements AccountRepository {
  constructor(private readonly sql: Sql) {}

  async list(opts?: { includeArchived?: boolean }): Promise<Account[]> {
    const rows = opts?.includeArchived
      ? await this.sql<AccountRow[]>`SELECT * FROM accounts ORDER BY created_at`
      : await this.sql<AccountRow[]>`
          SELECT * FROM accounts WHERE archived_at IS NULL ORDER BY created_at`;
    return rows.map(toAccount);
  }

  async findById(id: string): Promise<Account | null> {
    const [row] = await this.sql<AccountRow[]>`
      SELECT * FROM accounts WHERE id = ${id}`;
    return row ? toAccount(row) : null;
  }

  async findDefault(): Promise<Account | null> {
    const [row] = await this.sql<AccountRow[]>`
      SELECT * FROM accounts WHERE archived_at IS NULL AND is_default LIMIT 1`;
    return row ? toAccount(row) : null;
  }

  async countActive(): Promise<number> {
    const [row] = await this.sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM accounts WHERE archived_at IS NULL`;
    return row?.n ?? 0;
  }

  async insert(account: Account): Promise<Account> {
    const r = fromAccount(account);
    const [row] = await this.sql<AccountRow[]>`
      INSERT INTO accounts (id, name, currency, is_default, archived_at, created_at)
      VALUES (${r.id}, ${r.name}, ${r.currency}, ${r.is_default}, ${r.archived_at},
              ${r.created_at})
      RETURNING *`;
    return toAccount(row);
  }

  async update(account: Account): Promise<Account> {
    const r = fromAccount(account);
    const [row] = await this.sql<AccountRow[]>`
      UPDATE accounts
         SET name = ${r.name}, currency = ${r.currency}, is_default = ${r.is_default},
             archived_at = ${r.archived_at}
       WHERE id = ${r.id}
      RETURNING *`;
    return toAccount(row);
  }

  async setDefault(id: string): Promise<void> {
    // Validate and lock the target inside the transaction before changing any
    // default flags. If the target is gone/archived, the UPDATE touches no rows
    // and the previous active default remains in place.
    await this.sql.begin(async (tx) => {
      await tx`
        WITH target AS (
          SELECT id
            FROM accounts
           WHERE id = ${id}
             AND archived_at IS NULL
           FOR UPDATE
        )
        UPDATE accounts AS a
           SET is_default = (a.id = target.id)
          FROM target
         WHERE a.archived_at IS NULL
           AND (a.is_default OR a.id = target.id)`;
    });
  }
}

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
    accounts: new PgAccountRepository(sql),
  };
}

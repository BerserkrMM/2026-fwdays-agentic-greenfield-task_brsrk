// Postgres-backed repositories — used when DATABASE_URL is set (TC-STACK-03/04).
// All access goes through the single shared `postgres` client; no module builds
// its own client.

import type { Sql } from "postgres";
import type { Account } from "@/src/domain/account";
import type { AppConfig } from "@/src/domain/app-config";
import type { InputEvent, NewInputEvent } from "@/src/domain/input-event";
import type { LedgerItem } from "@/src/domain/ledger-item";
import type { NewParserRun, ParserRun } from "@/src/domain/parser-run";
import type {
  AccountRepository,
  AppConfigRepository,
  InputEventRepository,
  LedgerItemRepository,
  ParserRunRepository,
  Repositories,
} from "@/src/domain/ports";
import {
  fromAccount,
  fromLedgerItem,
  toAccount,
  toAppConfig,
  toInputEvent,
  toLedgerItem,
  toParserRun,
} from "./mappers";
import type {
  AccountRow,
  AppConfigRow,
  InputEventRow,
  LedgerItemRow,
  ParserRunRow,
} from "./rows";

class PgAppConfigRepository implements AppConfigRepository {
  constructor(private readonly sql: Sql) {}

  async get(): Promise<AppConfig | null> {
    const [row] = await this.sql<AppConfigRow[]>`
      SELECT * FROM app_config WHERE id LIMIT 1`;
    return row ? toAppConfig(row) : null;
  }

  async upsert(patch: {
    openAiApiKey: string | null;
    openAiModel: string | null;
  }): Promise<AppConfig> {
    const [row] = await this.sql<AppConfigRow[]>`
      INSERT INTO app_config (id, openai_api_key, openai_model)
      VALUES (true, ${patch.openAiApiKey}, ${patch.openAiModel})
      ON CONFLICT (id) DO UPDATE
        SET openai_api_key = EXCLUDED.openai_api_key,
            openai_model = EXCLUDED.openai_model,
            updated_at = now()
      RETURNING *`;
    return toAppConfig(row);
  }
}

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
         currency, type, category, confidence, status, import_row_number, occurred_at)
      VALUES
        (${r.id}, ${r.account_id}, ${r.input_event_id}, ${r.parser_run_id},
         ${r.description}, ${r.amount_minor}, ${r.currency}, ${r.type},
         ${r.category}, ${r.confidence}, ${r.status}, ${r.import_row_number}, ${r.occurred_at})
      RETURNING *`;
    return toLedgerItem(row);
  }

  async findById(id: string): Promise<LedgerItem | null> {
    const [row] = await this.sql<LedgerItemRow[]>`
      SELECT * FROM ledger_items WHERE id = ${id}`;
    return row ? toLedgerItem(row) : null;
  }

  async findByInputEventRow(inputEventId: string, rowNumber: number): Promise<LedgerItem | null> {
    const [row] = await this.sql<LedgerItemRow[]>`
      SELECT * FROM ledger_items
       WHERE input_event_id = ${inputEventId}
         AND import_row_number = ${rowNumber}
       LIMIT 1`;
    return row ? toLedgerItem(row) : null;
  }

  async listNonDeleted(): Promise<LedgerItem[]> {
    // Inclusion follows item status, not account archive state, so archived
    // accounts' historical items are returned (FR-LEDGER-02/03, FR-ACCT-05).
    // `id` tiebreaks `created_at` so the row order (and thus the first-seen group
    // order in computeAccountBalances/computeCategoryTotals) is deterministic even
    // when a bulk import shares one `now()` timestamp.
    const rows = await this.sql<LedgerItemRow[]>`
      SELECT * FROM ledger_items WHERE status <> 'deleted' ORDER BY created_at, id`;
    return rows.map(toLedgerItem);
  }

  async listAll(): Promise<LedgerItem[]> {
    // Every status, including `deleted`, so the review screen can show the log
    // (FR-ITEM-01/05). The domain re-sorts authoritatively (selectLedgerPage); a
    // sensible newest-first DB order keeps results stable for any direct reader.
    const rows = await this.sql<LedgerItemRow[]>`
      SELECT * FROM ledger_items
       ORDER BY COALESCE(occurred_at, created_at) DESC, id DESC`;
    return rows.map(toLedgerItem);
  }

  async update(item: LedgerItem): Promise<LedgerItem> {
    // Only mutable fields (FR-ITEM-03/04/05); provenance columns stay untouched.
    const r = fromLedgerItem(item);
    const [row] = await this.sql<LedgerItemRow[]>`
      UPDATE ledger_items
         SET account_id = ${r.account_id}, description = ${r.description},
             amount_minor = ${r.amount_minor}, type = ${r.type},
             category = ${r.category}, confidence = ${r.confidence}, status = ${r.status},
             occurred_at = ${r.occurred_at}
       WHERE id = ${r.id}
      RETURNING *`;
    return toLedgerItem(row);
  }
}

export function createPostgresRepositories(sql: Sql): Repositories {
  return {
    inputEvents: new PgInputEventRepository(sql),
    parserRuns: new PgParserRunRepository(sql),
    ledgerItems: new PgLedgerItemRepository(sql),
    accounts: new PgAccountRepository(sql),
    appConfig: new PgAppConfigRepository(sql),
  };
}

// Ports & contracts — framework-free (TC-PURE-01, TC-MOD-01).
// Business modules integrate through these interfaces, re-exported via each
// module's `src/modules/*/ports.ts`. Implementations live in `src/db` (repos)
// and `src/modules/*` (services).

import type { Account } from "./account";
import type { InputEvent, NewInputEvent } from "./input-event";
import type { LedgerItem } from "./ledger-item";
import type {
  AccountBalance,
  CategoryTotal,
  LedgerAggregates,
  MonthlyTrendPoint,
} from "./ledger-query";
import type { NewParserRun, ParserRun } from "./parser-run";
import type { ParsedLedgerItemDraft } from "./parsed-draft";

// --- Repository ports (implemented by src/db: postgres or in-memory) ---

export interface InputEventRepository {
  create(event: NewInputEvent): Promise<InputEvent>;
  findById(id: string): Promise<InputEvent | null>;
}

/**
 * Persistence primitives for accounts. Invariants (single default, archive
 * guards) are owned by the accounts service, not the repository, except the
 * single-default *write* which `setDefault` performs atomically.
 */
export interface AccountRepository {
  /** Active accounts by default; pass `includeArchived` to list everything. */
  list(opts?: { includeArchived?: boolean }): Promise<Account[]>;
  findById(id: string): Promise<Account | null>;
  /** The current default among active accounts, or null. */
  findDefault(): Promise<Account | null>;
  /** Count of active (non-archived) accounts. */
  countActive(): Promise<number>;
  insert(account: Account): Promise<Account>;
  update(account: Account): Promise<Account>;
  /** Atomically make `id` the only default among active accounts. */
  setDefault(id: string): Promise<void>;
}

export interface ParserRunRepository {
  create(run: NewParserRun): Promise<ParserRun>;
  findById(id: string): Promise<ParserRun | null>;
}

export interface LedgerItemRepository {
  insert(item: LedgerItem): Promise<LedgerItem>;
  findById(id: string): Promise<LedgerItem | null>;
  /** Finds an existing bank-import row item for retry insert-if-absent behavior. */
  findByInputEventRow(inputEventId: string, rowNumber: number): Promise<LedgerItem | null>;
  /**
   * All non-deleted items (`status <> 'deleted'`) across every account — the read
   * primitive the Ledger capability folds into balances/aggregates. Independent
   * of account archive state, so archived accounts' items are included
   * (FR-LEDGER-02/03, FR-ACCT-05).
   */
  listNonDeleted(): Promise<LedgerItem[]>;
  /**
   * Every item across every account and status, including `deleted` — the read
   * primitive the Ledger-items review screen filters/sorts/paginates in the
   * domain (FR-ITEM-01/02). Deleted items are returned so the journal can show
   * them as a log (FR-ITEM-05).
   */
  listAll(): Promise<LedgerItem[]>;
  /**
   * Persists mutable fields of an existing item (edit / approve / delete —
   * FR-ITEM-03/04/05). Provenance columns (input_event_id, parser_run_id,
   * import_row_number, currency, created_at) are immutable and not updated.
   */
  update(item: LedgerItem): Promise<LedgerItem>;
}

export interface Repositories {
  inputEvents: InputEventRepository;
  parserRuns: ParserRunRepository;
  ledgerItems: LedgerItemRepository;
  accounts: AccountRepository;
}

// --- Accounts port (default-account resolution; owned by `accounts` later) ---

/**
 * Resolves the single default account (FR-ACCT-01, FR-ITEM-06). Foundation
 * defines the seam; the `accounts` capability implements it. Returns null when
 * no default account exists.
 */
export interface AccountsPort {
  getDefaultAccountId(): Promise<string | null>;
}

// --- Ledger query port (read-side balances/aggregates; owned by `ledger`) ---

/**
 * The single balance/aggregate read API downstream modules (Accounts, Dashboard)
 * depend on, so no module recomputes balances independently (FR-LEDGER-05). All
 * results derive from non-deleted `ledger_items` (FR-LEDGER-02/03/04); nothing is
 * stored (FR-ACCT-06). Implemented by the `ledger` capability.
 */
export interface LedgerQueryPort {
  /** Sum of all non-deleted items across accounts. */
  getOverallBalance(): Promise<number>;
  /** Per-account balances over non-deleted items (includes archived accounts). */
  getAccountBalances(): Promise<AccountBalance[]>;
  /** One account's balance over its non-deleted items. */
  getAccountBalance(accountId: string): Promise<number>;
  /** Income/expense split over non-deleted items. */
  getAggregates(): Promise<LedgerAggregates>;
  /** Per-category totals over non-deleted items, by raw category text. */
  getCategoryTotals(): Promise<CategoryTotal[]>;
  /**
   * Income/expense grouped by calendar month (Europe/Kyiv) over non-deleted
   * items, ascending — the all-time Dashboard trend (FR-DASH-04, FR-LEDGER-04).
   */
  getMonthlyTrends(): Promise<MonthlyTrendPoint[]>;
}

// --- Item-creation contract (the only sanctioned ledger-item write path) ---

export interface CreateLedgerItemInput {
  draft: ParsedLedgerItemDraft;
  /** Required: the originating input event (referential ordering). */
  inputEventId: string;
  /** The parser run that produced the draft; null for direct manual creation. */
  parserRunId?: string | null;
  /** Explicit account; when omitted the default account is resolved. */
  accountId?: string;
}

/**
 * Creates a single `pending` LedgerItem from a parsed draft (FR-PARSE-07,
 * FR-ITEM-06, FR-CAT-03). Server-side only (TC-STACK-02).
 */
export interface ItemCreationContract {
  createPendingItem(input: CreateLedgerItemInput): Promise<LedgerItem>;
}

/** Thrown when no account is supplied and no default account can be resolved. */
export class NoDefaultAccountError extends Error {
  constructor() {
    super("No account_id supplied and no default account is available.");
    this.name = "NoDefaultAccountError";
  }
}

/** Thrown when a referenced input event does not exist. */
export class MissingInputEventError extends Error {
  constructor(inputEventId: string) {
    super(`Referenced input_event '${inputEventId}' does not exist.`);
    this.name = "MissingInputEventError";
  }
}

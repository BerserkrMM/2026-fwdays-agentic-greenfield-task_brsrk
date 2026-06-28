// Ports & contracts — framework-free (TC-PURE-01, TC-MOD-01).
// Business modules integrate through these interfaces, re-exported via each
// module's `src/modules/*/ports.ts`. Implementations live in `src/db` (repos)
// and `src/modules/*` (services).

import type { InputEvent, NewInputEvent } from "./input-event";
import type { LedgerItem } from "./ledger-item";
import type { NewParserRun, ParserRun } from "./parser-run";
import type { ParsedLedgerItemDraft } from "./parsed-draft";

// --- Repository ports (implemented by src/db: postgres or in-memory) ---

export interface InputEventRepository {
  create(event: NewInputEvent): Promise<InputEvent>;
  findById(id: string): Promise<InputEvent | null>;
}

export interface ParserRunRepository {
  create(run: NewParserRun): Promise<ParserRun>;
  findById(id: string): Promise<ParserRun | null>;
}

export interface LedgerItemRepository {
  insert(item: LedgerItem): Promise<LedgerItem>;
  findById(id: string): Promise<LedgerItem | null>;
}

export interface Repositories {
  inputEvents: InputEventRepository;
  parserRuns: ParserRunRepository;
  ledgerItems: LedgerItemRepository;
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

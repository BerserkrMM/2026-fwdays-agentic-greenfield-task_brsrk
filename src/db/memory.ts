// Named in-memory repositories — the fallback used when DATABASE_URL is unset so
// the app runs on a clean checkout (TC-DATA-01). They implement the same domain
// repository ports as the postgres-backed repositories.

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

function newId(): string {
  return globalThis.crypto.randomUUID();
}

class MemoryAccountRepository implements AccountRepository {
  private readonly store = new Map<string, Account>();

  private active(): Account[] {
    return [...this.store.values()].filter((a) => a.archivedAt === null);
  }

  async list(opts?: { includeArchived?: boolean }): Promise<Account[]> {
    const all = [...this.store.values()];
    return (opts?.includeArchived ? all : all.filter((a) => a.archivedAt === null)).map(
      (a) => ({ ...a }),
    );
  }

  async findById(id: string): Promise<Account | null> {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }

  async findDefault(): Promise<Account | null> {
    const found = this.active().find((a) => a.isDefault);
    return found ? { ...found } : null;
  }

  async countActive(): Promise<number> {
    return this.active().length;
  }

  async insert(account: Account): Promise<Account> {
    if (account.isDefault && this.active().some((a) => a.isDefault)) {
      throw new Error("default-account-conflict");
    }
    this.store.set(account.id, { ...account });
    return { ...account };
  }

  async update(account: Account): Promise<Account> {
    this.store.set(account.id, { ...account });
    return { ...account };
  }

  async setDefault(id: string): Promise<void> {
    const target = this.store.get(id);
    if (!target || target.archivedAt !== null) return;
    for (const [key, account] of this.store) {
      if (account.isDefault) this.store.set(key, { ...account, isDefault: false });
    }
    this.store.set(id, { ...target, isDefault: true });
  }
}

class MemoryInputEventRepository implements InputEventRepository {
  private readonly store = new Map<string, InputEvent>();

  async create(event: NewInputEvent): Promise<InputEvent> {
    const created: InputEvent = {
      id: event.id ?? newId(),
      source: event.source,
      provider: event.provider,
      rawText: event.rawText,
      storageUri: event.storageUri,
      mimeType: event.mimeType,
      createdAt: new Date(),
    };
    this.store.set(created.id, created);
    return created;
  }

  async findById(id: string): Promise<InputEvent | null> {
    return this.store.get(id) ?? null;
  }
}

class MemoryParserRunRepository implements ParserRunRepository {
  private readonly store = new Map<string, ParserRun>();

  async create(run: NewParserRun): Promise<ParserRun> {
    const created: ParserRun = {
      id: run.id ?? newId(),
      inputEventId: run.inputEventId,
      status: run.status,
      normalizedPayload: run.normalizedPayload,
      resultJson: run.resultJson,
      error: run.error,
      createdAt: new Date(),
    };
    this.store.set(created.id, created);
    return created;
  }

  async findById(id: string): Promise<ParserRun | null> {
    return this.store.get(id) ?? null;
  }
}

class MemoryLedgerItemRepository implements LedgerItemRepository {
  private readonly store = new Map<string, LedgerItem>();

  async insert(item: LedgerItem): Promise<LedgerItem> {
    this.store.set(item.id, item);
    return item;
  }

  async findById(id: string): Promise<LedgerItem | null> {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }

  async findByInputEventRow(inputEventId: string, rowNumber: number): Promise<LedgerItem | null> {
    const found = [...this.store.values()].find(
      (item) => item.inputEventId === inputEventId && item.importRowNumber === rowNumber,
    );
    return found ? { ...found } : null;
  }

  async listNonDeleted(): Promise<LedgerItem[]> {
    return [...this.store.values()]
      .filter((item) => item.status !== "deleted")
      .map((item) => ({ ...item }));
  }

  async listAll(): Promise<LedgerItem[]> {
    return [...this.store.values()].map((item) => ({ ...item }));
  }

  async update(item: LedgerItem): Promise<LedgerItem> {
    this.store.set(item.id, { ...item });
    return { ...item };
  }
}

export function createInMemoryRepositories(): Repositories {
  return {
    inputEvents: new MemoryInputEventRepository(),
    parserRuns: new MemoryParserRunRepository(),
    ledgerItems: new MemoryLedgerItemRepository(),
    accounts: new MemoryAccountRepository(),
  };
}

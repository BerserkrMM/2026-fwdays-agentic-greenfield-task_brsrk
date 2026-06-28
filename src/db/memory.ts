// Named in-memory repositories — the fallback used when DATABASE_URL is unset so
// the app runs on a clean checkout (TC-DATA-01). They implement the same domain
// repository ports as the postgres-backed repositories.

import type { InputEvent, NewInputEvent } from "@/src/domain/input-event";
import type { LedgerItem } from "@/src/domain/ledger-item";
import type { NewParserRun, ParserRun } from "@/src/domain/parser-run";
import type {
  InputEventRepository,
  LedgerItemRepository,
  ParserRunRepository,
  Repositories,
} from "@/src/domain/ports";

function newId(): string {
  return globalThis.crypto.randomUUID();
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
    return this.store.get(id) ?? null;
  }
}

export function createInMemoryRepositories(): Repositories {
  return {
    inputEvents: new MemoryInputEventRepository(),
    parserRuns: new MemoryParserRunRepository(),
    ledgerItems: new MemoryLedgerItemRepository(),
  };
}

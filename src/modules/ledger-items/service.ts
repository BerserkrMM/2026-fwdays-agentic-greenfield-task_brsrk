// Ledger-items review service — owns the review/write use-cases for existing
// ledger items (TC-MOD-01): list a filtered page, edit, approve, delete. It folds
// items with the single canonical selection in `src/domain/ledger-filter.ts` and
// performs status transitions via `src/domain/ledger-item-edit.ts`. It never
// recomputes balances (FR-LEDGER-05) — the ledger query side already excludes
// deleted items. Framework-free: persistence is injected, so this is unit-testable
// against the in-memory fallback with no Next/DB import here.

import type { LedgerItem } from "@/src/domain/ledger-item";
import {
  selectLedgerPage,
  type LedgerFilter,
  type LedgerPage,
} from "@/src/domain/ledger-filter";
import {
  approveLedgerItem,
  deleteLedgerItem,
  editLedgerItem,
  LedgerItemError,
  type LedgerItemEdit,
} from "@/src/domain/ledger-item-edit";
import type { AccountRepository, LedgerItemRepository } from "@/src/domain/ports";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class LedgerItemsService {
  constructor(
    private readonly items: LedgerItemRepository,
    private readonly accounts: AccountRepository,
  ) {}

  /** A filtered, sorted, paginated page of the journal (FR-ITEM-01/02). */
  async listPage(criteria: LedgerFilter): Promise<LedgerPage> {
    return selectLedgerPage(await this.items.listAll(), criteria);
  }

  /**
   * Resolves an item by id or throws `not-found`. A malformed id is treated as
   * `not-found` rather than reaching the repository, so a hand-crafted POST cannot
   * turn a bad id into a raw 500 in Postgres mode (uuid column).
   */
  private async requireItem(id: string): Promise<LedgerItem> {
    if (!UUID_RE.test(id)) {
      throw new LedgerItemError("not-found", "Операцію не знайдено.");
    }
    const item = await this.items.findById(id);
    if (!item) throw new LedgerItemError("not-found", "Операцію не знайдено.");
    return item;
  }

  /** Validates the target account is an active account (FR-ITEM-03 edit, FR-ITEM-06). */
  private async requireActiveAccount(id: string): Promise<void> {
    if (!UUID_RE.test(id)) {
      throw new LedgerItemError("account-not-found", "Рахунок не знайдено.");
    }
    const account = await this.accounts.findById(id);
    if (!account || account.archivedAt !== null) {
      throw new LedgerItemError("account-not-found", "Рахунок не знайдено.");
    }
  }

  /** Edits a pending/approved item (FR-ITEM-03); validates the chosen account. */
  async editItem(id: string, edit: LedgerItemEdit): Promise<LedgerItem> {
    const item = await this.requireItem(id);
    await this.requireActiveAccount(edit.accountId);
    return this.items.update(editLedgerItem(item, edit));
  }

  /** Approves a pending item (FR-ITEM-04). */
  async approveItem(id: string): Promise<LedgerItem> {
    const item = await this.requireItem(id);
    return this.items.update(approveLedgerItem(item));
  }

  /** Soft-deletes an item (FR-ITEM-05); idempotent. */
  async deleteItem(id: string): Promise<LedgerItem> {
    const item = await this.requireItem(id);
    return this.items.update(deleteLedgerItem(item));
  }
}

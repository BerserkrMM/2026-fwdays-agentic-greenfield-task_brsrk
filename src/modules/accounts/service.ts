// Accounts service — owns the account use-cases and invariants (TC-MOD-01):
// single default account, soft-archive with default/last-active guards, and the
// seeded `Готівка` default. It also implements the narrow `AccountsPort`
// (`getDefaultAccountId`) that Foundation's item-creation contract consumes.
// Framework-free: persistence is injected as an `AccountRepository`, so this is
// unit-testable against the in-memory fallback with no Next/DB import here.

import {
  AccountError,
  CASH_ACCOUNT_NAME,
  isArchived,
  validateAccountName,
  type Account,
} from "@/src/domain/account";
import { CURRENCY } from "@/src/domain/money";
import type { AccountsPort, AccountRepository } from "@/src/domain/ports";

function newId(): string {
  return globalThis.crypto.randomUUID();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound(): never {
  throw new AccountError("not-found", "Рахунок не знайдено.");
}

export class AccountsService implements AccountsPort {
  constructor(private readonly repo: AccountRepository) {}

  /**
   * Resolves an active account by id, or throws `not-found`. A malformed id
   * (not a UUID) is treated as `not-found` rather than reaching the repository,
   * so a hand-crafted POST cannot turn a bad id into a raw 500 in Postgres mode
   * (uuid column) — the in-memory and Postgres backends behave identically.
   */
  private async requireActive(id: string): Promise<Account> {
    if (!UUID_RE.test(id)) notFound();
    const account = await this.repo.findById(id);
    if (!account || isArchived(account)) notFound();
    return account;
  }

  /** Active (non-archived) accounts (FR-ACCT-01). */
  async listActive(): Promise<Account[]> {
    return this.repo.list();
  }

  /**
   * Guarantees a default account exists (FR-ACCT-06). No-op when one already
   * does; promotes the first active account if accounts exist but none is
   * default; otherwise seeds a `Готівка` UAH default. Idempotent.
   */
  async ensureSeededDefault(): Promise<Account> {
    const current = await this.repo.findDefault();
    if (current) return current;

    const active = await this.repo.list();
    if (active.length > 0) {
      await this.repo.setDefault(active[0].id);
      return (await this.repo.findById(active[0].id)) ?? notFound();
    }

    const seeded: Account = {
      id: newId(),
      name: CASH_ACCOUNT_NAME,
      currency: CURRENCY,
      isDefault: true,
      archivedAt: null,
      createdAt: new Date(),
    };
    try {
      return await this.repo.insert(seeded);
    } catch (error) {
      // Cold-start race: a concurrent first render may have seeded already,
      // tripping the single-default unique index. Re-read instead of surfacing
      // a raw error; only rethrow if there is still no default.
      const raced = await this.repo.findDefault();
      if (raced) return raced;
      throw error;
    }
  }

  /**
   * Creates a UAH account (FR-ACCT-04). The first-ever account becomes the
   * default; later ones are non-default until the user switches.
   */
  async createAccount(rawName: string): Promise<Account> {
    const name = validateAccountName(rawName);
    const hasDefault = (await this.repo.findDefault()) !== null;
    const account: Account = {
      id: newId(),
      name,
      currency: CURRENCY,
      isDefault: !hasDefault,
      archivedAt: null,
      createdAt: new Date(),
    };
    return this.repo.insert(account);
  }

  /** Renames an active account, keeping it UAH (FR-ACCT-03). */
  async renameAccount(id: string, rawName: string): Promise<Account> {
    const name = validateAccountName(rawName);
    const account = await this.requireActive(id);
    return this.repo.update({ ...account, name });
  }

  /** Switches the default to an active account, keeping exactly one (FR-ACCT-04). */
  async setDefaultAccount(id: string): Promise<void> {
    await this.requireActive(id);
    await this.repo.setDefault(id);
  }

  /**
   * Soft-archives an account (FR-ACCT-05): hidden from the active list + default
   * selection, but retained so its ledger items keep contributing to balances.
   * Refuses the last active account and the current default.
   */
  async archiveAccount(id: string): Promise<Account> {
    const account = await this.requireActive(id);
    if ((await this.repo.countActive()) <= 1) {
      throw new AccountError(
        "cannot-archive-last",
        "Не можна архівувати останній активний рахунок.",
      );
    }
    if (account.isDefault) {
      throw new AccountError(
        "cannot-archive-default",
        "Не можна архівувати типовий рахунок.",
      );
    }
    return this.repo.update({ ...account, archivedAt: new Date() });
  }

  /** AccountsPort: resolves the default for item creation, seeding if needed (FR-ITEM-06). */
  async getDefaultAccountId(): Promise<string | null> {
    const current = await this.repo.findDefault();
    if (current) return current.id;
    const seeded = await this.ensureSeededDefault();
    return seeded.id;
  }
}

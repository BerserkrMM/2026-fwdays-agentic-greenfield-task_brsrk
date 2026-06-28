// Account — framework-free (TC-PURE-01). v1 is single-user, UAH-only
// (BC-SCOPE-01/02). Accounts store NO opening balance: account balance is derived
// only from non-deleted ledger items (FR-ACCT-06, FR-LEDGER-05).

import type { Currency } from "./money";

/** Seeded default account name so item creation works on a clean checkout (FR-ACCT-06). */
export const CASH_ACCOUNT_NAME = "Готівка" as const;

/** Upper bound on an account name (after trimming). */
export const MAX_ACCOUNT_NAME_LENGTH = 60;

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  /** Exactly one active account is the default (FR-ACCT-01). */
  isDefault: boolean;
  /** Soft-archive marker; null while active (FR-ACCT-05). No hard delete. */
  archivedAt: Date | null;
  createdAt: Date;
}

export interface NewAccount {
  id?: string;
  name: string;
  isDefault?: boolean;
}

/** Stable codes for account errors; the UI maps each to Ukrainian copy. */
export type AccountErrorCode =
  | "name-required"
  | "name-too-long"
  | "not-found"
  | "cannot-archive-default"
  | "cannot-archive-last";

/** A rejected account operation, carrying a stable `code` for the error surface. */
export class AccountError extends Error {
  constructor(
    readonly code: AccountErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AccountError";
  }
}

/** Is this account soft-archived (hidden from active list + default selection)? */
export function isArchived(account: Account): boolean {
  return account.archivedAt !== null;
}

/**
 * Validates and normalizes an account name: trims, rejects empty/whitespace and
 * over-long names (FR-ACCT-03/04). Returns the cleaned name.
 */
export function validateAccountName(raw: string): string {
  const name = (raw ?? "").trim();
  if (name.length === 0) {
    throw new AccountError("name-required", "Назва рахунку обовʼязкова.");
  }
  if (name.length > MAX_ACCOUNT_NAME_LENGTH) {
    throw new AccountError("name-too-long", "Назва рахунку задовга.");
  }
  return name;
}

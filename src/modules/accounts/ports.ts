// Accounts module ports (TC-MOD-01). Re-exports the account domain surface so the
// rest of the app depends on a stable port, not internals.

export type { Account, AccountErrorCode, NewAccount } from "@/src/domain/account";
export {
  AccountError,
  CASH_ACCOUNT_NAME,
  MAX_ACCOUNT_NAME_LENGTH,
  isArchived,
  validateAccountName,
} from "@/src/domain/account";
export type { AccountRepository } from "@/src/domain/ports";

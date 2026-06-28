// Foundation module ports (TC-MOD-01). Re-exports the shared seams this module
// owns so other capabilities depend on a stable port surface, not internals.

export type {
  AccountsPort,
  CreateLedgerItemInput,
  ItemCreationContract,
  Repositories,
} from "@/src/domain/ports";
export {
  MissingInputEventError,
  NoDefaultAccountError,
} from "@/src/domain/ports";

// fallow-ignore-file unused-file -- intentional module port surface for TC-MOD-01; the review screen + future channel slices depend on this stable port, not internals
// Ledger-items module ports (TC-MOD-01). Re-exports the review/write surface so
// the rest of the app depends on a stable port, not internals. The journal is
// selected/sorted/paginated and mutated through these contracts; balances stay
// owned by the ledger query side (FR-LEDGER-05).

export type {
  LedgerFilter,
  LedgerPage,
} from "@/src/domain/ledger-filter";
export type {
  LedgerItemEdit,
  LedgerItemErrorCode,
} from "@/src/domain/ledger-item-edit";
export { LedgerItemError } from "@/src/domain/ledger-item-edit";
export { LedgerItemsService } from "./service";

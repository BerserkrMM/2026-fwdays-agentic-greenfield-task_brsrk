// fallow-ignore-file unused-file -- intentional module port surface for TC-MOD-01; consumed by upcoming dashboard/ledger-items slices
// Ledger module ports (TC-MOD-01). Re-exports the read-side query surface so the
// rest of the app depends on a stable port, not internals. Balances/aggregates
// derive only from non-deleted ledger items (FR-LEDGER-05).

export type {
  AccountBalance,
  CategoryTotal,
  LedgerAggregates,
} from "@/src/domain/ledger-query";
export type { LedgerQueryPort } from "@/src/domain/ports";

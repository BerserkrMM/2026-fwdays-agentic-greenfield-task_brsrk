// Ledger query service — owns the read-side balance/aggregate use-cases
// (TC-MOD-01) and implements the narrow `LedgerQueryPort` that Accounts and
// Dashboard consume, so no module recomputes balances independently
// (FR-LEDGER-05). It reads ledger items through the injected
// `LedgerItemRepository` and folds them with the single canonical computations in
// `src/domain/ledger-query.ts`. Framework-free: no Next/DB import here, so it is
// unit-testable against the in-memory fallback.

import {
  computeAccountBalance,
  computeAccountBalances,
  computeAggregates,
  computeCategoryTotals,
  computeMonthlyTrends,
  computeOverallBalance,
  type AccountBalance,
  type CategoryTotal,
  type LedgerAggregates,
  type MonthlyTrendPoint,
} from "@/src/domain/ledger-query";
import type { LedgerItemRepository, LedgerQueryPort } from "@/src/domain/ports";

export class LedgerQueryService implements LedgerQueryPort {
  constructor(private readonly ledgerItems: LedgerItemRepository) {}

  async getOverallBalance(): Promise<number> {
    return computeOverallBalance(await this.ledgerItems.listNonDeleted());
  }

  async getAccountBalances(): Promise<AccountBalance[]> {
    return computeAccountBalances(await this.ledgerItems.listNonDeleted());
  }

  async getAccountBalance(accountId: string): Promise<number> {
    return computeAccountBalance(await this.ledgerItems.listNonDeleted(), accountId);
  }

  async getAggregates(): Promise<LedgerAggregates> {
    return computeAggregates(await this.ledgerItems.listNonDeleted());
  }

  async getCategoryTotals(): Promise<CategoryTotal[]> {
    return computeCategoryTotals(await this.ledgerItems.listNonDeleted());
  }

  async getMonthlyTrends(): Promise<MonthlyTrendPoint[]> {
    return computeMonthlyTrends(await this.ledgerItems.listNonDeleted());
  }
}

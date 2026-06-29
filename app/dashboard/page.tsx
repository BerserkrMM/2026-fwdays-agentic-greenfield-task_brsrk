// Dashboard screen (FR-DASH-01..05). Read-only financial overview: it reads
// balances/aggregates/trends through the Ledger query capability and never
// mutates anything (FR-DASH-05, FR-LEDGER-05). Server component — the DB boundary
// is never imported into a client bundle (TC-STACK-02). Each read is isolated so
// one failing aggregate degrades a section instead of blanking the page
// (FR-SHELL-03). Ukrainian-first copy lives in dashboard-content.ts.

import Link from "next/link";
import { getRepositories } from "@/src/db/client";
import { formatUahMinor } from "@/src/domain/money";
import { LedgerQueryService } from "@/src/modules/ledger/service";
import { DASHBOARD } from "@/src/modules/dashboard/ui/dashboard-content";
import {
  isEmptyOverview,
  toExpenseBreakdown,
  toTrendView,
  type CategorySlice,
  type TrendView,
} from "@/src/modules/dashboard/ui/dashboard-view";
import { PageHeader } from "@/src/modules/foundation/ui/PageHeader";
import { EmptyState, ErrorState, PartialState } from "@/src/modules/foundation/ui/states";

export const dynamic = "force-dynamic";

type ReadResult<T> = { ok: true; value: T } | { ok: false };

async function read<T>(fn: () => Promise<T>): Promise<ReadResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch {
    return { ok: false };
  }
}

// Calm spend palette for the breakdown bar — repeats for long category lists.
const BREAKDOWN_COLORS = [
  "#1f8a5b", "#3fa776", "#7cc6a1", "#b9ddca", "#d8ece1", "#9fb0a7",
];

const CARD_CLASS = "rounded-fin border border-fin-border bg-fin-surface p-5 shadow-fin";

/** Expense-by-category card (FR-DASH-03), with unavailable/empty/list states. */
function CategoryBreakdownCard({
  ok,
  breakdown,
}: {
  ok: boolean;
  breakdown: CategorySlice[];
}) {
  return (
    <div className={CARD_CLASS}>
      <h2 className="mb-4 text-base font-semibold text-fin-fg">
        {DASHBOARD.breakdownHeading}{" "}
        <span className="text-xs font-medium text-fin-fg-subtle">
          · {DASHBOARD.breakdownSubtitle}
        </span>
      </h2>
      {!ok ? (
        <p className="text-sm text-fin-fg-muted">{DASHBOARD.sectionUnavailable}</p>
      ) : breakdown.length === 0 ? (
        <p className="text-sm text-fin-fg-muted">{DASHBOARD.breakdownEmpty}</p>
      ) : (
        <>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full">
            {breakdown.map((slice, i) => (
              <div
                key={slice.category}
                style={{
                  width: `${slice.percent}%`,
                  background: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
                }}
              />
            ))}
          </div>
          <ul className="space-y-3">
            {breakdown.map((slice, i) => (
              <li key={slice.category} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] }}
                />
                <span className="text-sm text-fin-fg">{slice.category}</span>
                <span className="ml-auto text-sm tabular-nums text-fin-fg-muted">
                  {formatUahMinor(-slice.spendMinor)}
                </span>
                <span className="w-10 text-right text-xs text-fin-fg-subtle">
                  {slice.percent}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Monthly income/expense trend card (FR-DASH-04): unavailable/insufficient/bars. */
function MonthlyTrendCard({ ok, trend }: { ok: boolean; trend: TrendView }) {
  return (
    <div className={CARD_CLASS}>
      <h2 className="mb-4 text-base font-semibold text-fin-fg">
        {DASHBOARD.trendHeading}
      </h2>
      {!ok ? (
        <p className="text-sm text-fin-fg-muted">{DASHBOARD.sectionUnavailable}</p>
      ) : !trend.hasSufficientTrend ? (
        <div className="rounded-fin border border-fin-border bg-fin-surface-muted px-4 py-6 text-center">
          <p className="text-sm font-medium text-fin-fg">
            {DASHBOARD.trendInsufficientTitle}
          </p>
          <p className="mt-1 text-sm text-fin-fg-muted">
            {DASHBOARD.trendInsufficientDescription}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-3" style={{ height: "96px" }}>
            {trend.bars.map((bar) => (
              <div key={bar.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-20 w-full items-end justify-center gap-1">
                  <span
                    className="w-2.5 rounded-t bg-fin-success-fg"
                    style={{ height: `${bar.incomeHeightPct}%` }}
                    title={`${DASHBOARD.trendIncomeLabel}: ${formatUahMinor(bar.incomeMinor)}`}
                  />
                  <span
                    className="w-2.5 rounded-t bg-fin-error-fg"
                    style={{ height: `${bar.expenseHeightPct}%` }}
                    title={`${DASHBOARD.trendExpenseLabel}: ${formatUahMinor(bar.expenseMinor)}`}
                  />
                </div>
                <span className="text-[11px] text-fin-fg-subtle">{bar.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-fin-fg-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-fin-success-fg" />
              {DASHBOARD.trendIncomeLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-fin-error-fg" />
              {DASHBOARD.trendExpenseLabel}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const ledger = new LedgerQueryService(getRepositories().ledgerItems);

  // Reads run concurrently; each isolates its own failure, so one degraded
  // aggregate never blanks the page (FR-SHELL-03).
  const [balance, aggregates, categoryTotals, trends] = await Promise.all([
    read(() => ledger.getOverallBalance()),
    read(() => ledger.getAggregates()),
    read(() => ledger.getCategoryTotals()),
    read(() => ledger.getMonthlyTrends()),
  ]);

  const header = (
    <PageHeader title={DASHBOARD.title} description={DASHBOARD.subtitle} />
  );

  // Primary read failed → explicit error state with a read-only retry link.
  if (!balance.ok) {
    return (
      <>
        {header}
        <ErrorState
          title={DASHBOARD.errorTitle}
          description={DASHBOARD.errorDescription}
          action={
            <Link
              href="/dashboard"
              className="min-h-11 rounded-fin border border-fin-border px-4 py-2 text-sm font-medium text-fin-fg transition-colors hover:border-fin-border-strong hover:bg-fin-surface-muted"
            >
              {DASHBOARD.retryLabel}
            </Link>
          }
        />
      </>
    );
  }

  const categories = categoryTotals.ok ? categoryTotals.value : [];
  const trendPoints = trends.ok ? trends.value : [];

  // Truly empty (no non-deleted items) → onboarding CTA. Only when the reads that
  // decide emptiness actually succeeded, so a failed read is treated as partial.
  if (categoryTotals.ok && trends.ok && isEmptyOverview(categories.length, trendPoints.length)) {
    return (
      <>
        {header}
        <EmptyState
          title={DASHBOARD.emptyTitle}
          description={DASHBOARD.emptyDescription}
          action={
            <Link
              href="/imports"
              className="min-h-11 rounded-fin bg-fin-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-fin-primary-hover"
            >
              {DASHBOARD.emptyCta}
            </Link>
          }
        />
      </>
    );
  }

  const hasPartial = !aggregates.ok || !categoryTotals.ok || !trends.ok;
  const breakdown = toExpenseBreakdown(categories);
  const trend = toTrendView(trendPoints);

  return (
    <>
      {header}

      {hasPartial ? (
        <div className="mb-6">
          <PartialState
            title={DASHBOARD.partialTitle}
            description={DASHBOARD.partialDescription}
          />
        </div>
      ) : null}

      {/* Balance + income/expense summary (FR-DASH-01, FR-DASH-02). */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-fin bg-fin-fg p-5 text-fin-surface shadow-fin sm:col-span-1">
          <div className="text-sm text-fin-surface/70">{DASHBOARD.balanceLabel}</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
            {formatUahMinor(balance.value)}
          </div>
          <p className="mt-3 text-xs text-fin-surface/60">{DASHBOARD.balanceHint}</p>
        </div>

        <div className="rounded-fin border border-fin-border bg-fin-surface p-5 shadow-fin">
          <div className="text-sm text-fin-fg-muted">{DASHBOARD.incomeLabel}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-fin-success-fg">
            {aggregates.ok ? formatUahMinor(aggregates.value.incomeMinor) : "—"}
          </div>
        </div>

        <div className="rounded-fin border border-fin-border bg-fin-surface p-5 shadow-fin">
          <div className="text-sm text-fin-fg-muted">{DASHBOARD.expenseLabel}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-fin-error-fg">
            {aggregates.ok ? formatUahMinor(aggregates.value.expenseMinor) : "—"}
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <CategoryBreakdownCard ok={categoryTotals.ok} breakdown={breakdown} />
        <MonthlyTrendCard ok={trends.ok} trend={trend} />
      </section>

      <p className="mt-6 text-xs text-fin-fg-subtle">{DASHBOARD.readOnlyNote}</p>
    </>
  );
}

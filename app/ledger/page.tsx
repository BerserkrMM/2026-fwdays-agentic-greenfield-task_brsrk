// Ledger (journal) screen — the ledger-items review surface (FR-ITEM-01..05).
// Server component: it reads items + accounts through the shared DB boundary and
// mutates only via the server actions, so the DB boundary is never imported into a
// client bundle (TC-STACK-02). Filtering/sorting/pagination is a GET form (no
// client state); "load more" grows the cumulative limit while preserving filters.
// Ukrainian-first copy lives in ledger-content.ts.

import { getRepositories } from "@/src/db/client";
import type { Account } from "@/src/domain/account";
import type { LedgerItem, LedgerItemStatus } from "@/src/domain/ledger-item";
import { formatUahMinor, type OperationType } from "@/src/domain/money";
import { AccountsService } from "@/src/modules/accounts/service";
import { LedgerItemsService } from "@/src/modules/ledger-items/service";
import {
  LEDGER_PAGE,
  STATUS_LABELS,
  TYPE_LABELS,
  ledgerErrorMessage,
} from "@/src/modules/ledger-items/ui/ledger-content";
import {
  emptyStateKind,
  firstParam,
  hasActiveFilters,
  loadMoreHref,
  parseLedgerParams,
  type RawParams,
} from "@/src/modules/ledger-items/ui/ledger-params";
import { PageHeader } from "@/src/modules/foundation/ui/PageHeader";
import { EmptyState, ErrorState } from "@/src/modules/foundation/ui/states";
import {
  approveItemAction,
  deleteItemAction,
  editItemAction,
} from "./actions";

export const dynamic = "force-dynamic";

const STATUSES: LedgerItemStatus[] = ["pending", "approved", "deleted"];
const TYPES: OperationType[] = ["expense", "income"];

/** YYYY-MM-DDTHH:mm for a datetime-local input (UTC wall-clock; deterministic). */
function toDateTimeLocal(d: Date): string {
  return d.toISOString().slice(0, 16);
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = await searchParams;
  const errorMessage = ledgerErrorMessage(firstParam(params.formError));
  const { filter, raw } = parseLedgerParams(params);

  const repos = getRepositories();
  // Seed the default account so the edit account dropdown is never empty on a
  // clean checkout (FR-ACCT-06); harmless if one already exists.
  await new AccountsService(repos.accounts).ensureSeededDefault();
  const service = new LedgerItemsService(repos.ledgerItems, repos.accounts);

  const allAccounts = await repos.accounts.list({ includeArchived: true });
  const activeAccounts = allAccounts.filter((a) => a.archivedAt === null);
  const accountName = new Map(allAccounts.map((a) => [a.id, a.name] as const));

  const page = await service.listPage(filter);

  const moreHref = loadMoreHref(raw, page.items.length);
  const hasFilters = hasActiveFilters(raw);
  const emptyKind = emptyStateKind(page.matched, raw);

  return (
    <>
      <PageHeader title={LEDGER_PAGE.title} description={LEDGER_PAGE.description} />

      {errorMessage ? (
        <div className="mb-6">
          <ErrorState title="Дію не виконано" description={errorMessage} />
        </div>
      ) : null}

      <section
        aria-labelledby="ledger-filters-heading"
        className="mb-8 rounded-fin border border-fin-border bg-fin-surface p-5 shadow-fin"
      >
        <h2 id="ledger-filters-heading" className="mb-3 text-base font-semibold text-fin-fg">
          {LEDGER_PAGE.filtersHeading}
        </h2>
        <form method="get" action="/ledger" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-3">
            <span className="text-fin-fg-muted">{LEDGER_PAGE.searchLabel}</span>
            <input
              type="search"
              name="q"
              defaultValue={raw.q ?? ""}
              placeholder={LEDGER_PAGE.searchPlaceholder}
              className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg placeholder:text-fin-fg-subtle focus:border-fin-border-strong focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fin-fg-muted">{LEDGER_PAGE.statusLabel}</span>
            <select name="status" defaultValue={raw.status ?? ""} className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none">
              <option value="">{LEDGER_PAGE.anyOption}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fin-fg-muted">{LEDGER_PAGE.typeLabel}</span>
            <select name="type" defaultValue={raw.type ?? ""} className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none">
              <option value="">{LEDGER_PAGE.anyOption}</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fin-fg-muted">{LEDGER_PAGE.accountLabel}</span>
            <select name="account" defaultValue={raw.account ?? ""} className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none">
              <option value="">{LEDGER_PAGE.allAccountsOption}</option>
              {allAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fin-fg-muted">{LEDGER_PAGE.categoryLabel}</span>
            <input
              name="category"
              defaultValue={raw.category ?? ""}
              className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fin-fg-muted">{LEDGER_PAGE.fromLabel}</span>
            <input type="date" name="from" defaultValue={raw.from ?? ""} className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none" />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fin-fg-muted">{LEDGER_PAGE.toLabel}</span>
            <input type="date" name="to" defaultValue={raw.to ?? ""} className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none" />
          </label>

          <div className="flex items-end gap-2">
            <button type="submit" className="min-h-11 rounded-fin bg-fin-primary px-4 font-medium text-white transition-colors hover:bg-fin-primary-hover">
              {LEDGER_PAGE.applyLabel}
            </button>
            {hasFilters ? (
              <a href="/ledger" className="min-h-11 rounded-fin border border-fin-border px-4 py-2 text-sm text-fin-fg transition-colors hover:border-fin-border-strong hover:bg-fin-surface-muted">
                {LEDGER_PAGE.resetLabel}
              </a>
            ) : null}
          </div>
        </form>
      </section>

      {emptyKind ? (
        <EmptyState
          title={emptyKind === "filtered" ? LEDGER_PAGE.filteredEmptyTitle : LEDGER_PAGE.emptyTitle}
          description={emptyKind === "filtered" ? LEDGER_PAGE.filteredEmptyDescription : LEDGER_PAGE.emptyDescription}
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-fin-fg-subtle">
            {LEDGER_PAGE.countSummary(page.items.length, page.matched)}
          </p>
          <ul className="space-y-4">
            {page.items.map((item) => (
              <LedgerRow
                key={item.id}
                item={item}
                accountName={accountName.get(item.accountId) ?? "—"}
                activeAccounts={activeAccounts}
              />
            ))}
          </ul>
          {page.hasMore ? (
            <div className="mt-6 flex justify-center">
              <a href={moreHref} className="min-h-11 rounded-fin border border-fin-border px-4 py-2 text-sm text-fin-fg transition-colors hover:border-fin-border-strong hover:bg-fin-surface-muted">
                {LEDGER_PAGE.loadMoreLabel}
              </a>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

const STATUS_TONE: Record<LedgerItemStatus, string> = {
  pending: "bg-fin-warning-bg text-fin-warning-fg",
  approved: "bg-fin-info-bg text-fin-info-fg",
  deleted: "bg-fin-surface-muted text-fin-fg-subtle",
};

function LedgerRow({
  item,
  accountName,
  activeAccounts,
}: {
  item: LedgerItem;
  accountName: string;
  activeAccounts: Account[];
}) {
  const when = item.occurredAt ?? item.createdAt;
  const editable = item.status !== "deleted";

  return (
    <li className="rounded-fin border border-fin-border bg-fin-surface p-5 shadow-fin">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-fin-fg">{item.description}</span>
            <span className={`rounded-fin px-2 py-0.5 text-xs font-medium ${STATUS_TONE[item.status]}`}>
              {STATUS_LABELS[item.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-fin-fg-subtle">
            {accountName} · {item.category} · {when.toISOString().slice(0, 10)}
          </p>
        </div>
        <span className={`text-base font-semibold tabular-nums ${item.amountMinor < 0 ? "text-fin-fg" : "text-fin-success-fg"}`}>
          {formatUahMinor(item.amountMinor)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {item.status === "pending" ? (
          <form action={approveItemAction}>
            <input type="hidden" name="id" value={item.id} />
            <button type="submit" className="min-h-11 rounded-fin border border-fin-border px-3 text-sm text-fin-fg transition-colors hover:border-fin-border-strong hover:bg-fin-surface-muted">
              {LEDGER_PAGE.approveLabel}
            </button>
          </form>
        ) : null}
        {editable ? (
          <form action={deleteItemAction}>
            <input type="hidden" name="id" value={item.id} />
            <button type="submit" className="min-h-11 rounded-fin border border-fin-border px-3 text-sm text-fin-fg-muted transition-colors hover:border-fin-error-border hover:text-fin-error-fg">
              {LEDGER_PAGE.deleteLabel}
            </button>
          </form>
        ) : null}
      </div>

      {editable ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-fin-fg-muted">{LEDGER_PAGE.editHeading}</summary>
          <form action={editItemAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={item.id} />
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-fin-fg-muted">{LEDGER_PAGE.descriptionLabel}</span>
              <input name="description" required defaultValue={item.description} className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-fin-fg-muted">{LEDGER_PAGE.amountLabel}</span>
              <input name="amount" required inputMode="decimal" defaultValue={(Math.abs(item.amountMinor) / 100).toFixed(2)} className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-fin-fg-muted">{LEDGER_PAGE.typeLabel}</span>
              <select name="type" defaultValue={item.type} className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none">
                {TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-fin-fg-muted">{LEDGER_PAGE.categoryEditLabel}</span>
              <input name="category" defaultValue={item.category} className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-fin-fg-muted">{LEDGER_PAGE.dateLabel}</span>
              <input type="datetime-local" name="occurredAt" required defaultValue={toDateTimeLocal(when)} className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-fin-fg-muted">{LEDGER_PAGE.accountLabel}</span>
              <select name="accountId" defaultValue={item.accountId} className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none">
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
                {activeAccounts.some((a) => a.id === item.accountId) ? null : (
                  // The item sits on an archived account: show it labelled so the
                  // forced reassignment to an active account is discoverable
                  // (saving it unchanged is rejected with `account-not-found`).
                  <option value={item.accountId}>
                    {accountName} ({LEDGER_PAGE.archivedAccountNote})
                  </option>
                )}
              </select>
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="min-h-11 rounded-fin bg-fin-primary px-4 font-medium text-white transition-colors hover:bg-fin-primary-hover">
                {LEDGER_PAGE.saveLabel}
              </button>
            </div>
          </form>
        </details>
      ) : null}
    </li>
  );
}

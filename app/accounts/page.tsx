// Accounts screen (FR-ACCT-01/03/04/05/06). Server component: it reads accounts
// through the shared DB boundary and mutates only via the server actions, so the
// DB boundary is never imported into a client bundle (TC-STACK-02). Ukrainian-first
// copy lives in accounts-content.ts; the inline error banner reuses the shared
// states.

import { getRepositories } from "@/src/db/client";
import { formatUahMinor } from "@/src/domain/money";
import { AccountsService } from "@/src/modules/accounts/service";
import { LedgerQueryService } from "@/src/modules/ledger/service";
import {
  ACCOUNTS_PAGE,
  accountErrorMessage,
} from "@/src/modules/accounts/ui/accounts-content";
import { PageHeader } from "@/src/modules/foundation/ui/PageHeader";
import { EmptyState, ErrorState } from "@/src/modules/foundation/ui/states";
import {
  archiveAccountAction,
  createAccountAction,
  renameAccountAction,
  setDefaultAccountAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ formError?: string }>;
}) {
  const { formError } = await searchParams;
  const errorMessage = accountErrorMessage(formError);

  const repos = getRepositories();
  const service = new AccountsService(repos.accounts);
  await service.ensureSeededDefault();

  const accounts = await service.listActive();

  // Balances are derived from non-deleted ledger items via the Ledger capability,
  // never stored on the account (FR-ACCT-02, FR-LEDGER-03/05). Archived accounts'
  // items still count, but only active accounts are listed here (FR-ACCT-05).
  // The balance read is isolated: if it fails, account management still renders
  // with a "balance unavailable" indicator instead of a blank/500 page (FR-SHELL-03).
  const ledger = new LedgerQueryService(repos.ledgerItems);
  let balancesAvailable = true;
  let balanceByAccount = new Map<string, number>();
  try {
    const balances = await ledger.getAccountBalances();
    balanceByAccount = new Map(balances.map((b) => [b.accountId, b.balanceMinor]));
  } catch {
    balancesAvailable = false;
  }

  return (
    <>
      <PageHeader title={ACCOUNTS_PAGE.title} description={ACCOUNTS_PAGE.description} />

      {errorMessage ? (
        <div className="mb-6">
          <ErrorState title="Дію не виконано" description={errorMessage} />
        </div>
      ) : null}

      <section
        aria-labelledby="accounts-create-heading"
        className="mb-8 rounded-fin border border-fin-border bg-fin-surface p-5 shadow-fin"
      >
        <h2
          id="accounts-create-heading"
          className="mb-3 text-base font-semibold text-fin-fg"
        >
          {ACCOUNTS_PAGE.createHeading}
        </h2>
        <form
          action={createAccountAction}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-fin-fg-muted">{ACCOUNTS_PAGE.nameLabel}</span>
            <input
              name="name"
              required
              maxLength={60}
              placeholder={ACCOUNTS_PAGE.namePlaceholder}
              className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg placeholder:text-fin-fg-subtle focus:border-fin-border-strong focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-fin bg-fin-primary px-4 font-medium text-white transition-colors hover:bg-fin-primary-hover"
          >
            {ACCOUNTS_PAGE.createLabel}
          </button>
        </form>
      </section>

      {/* Defensive: ensureSeededDefault() above guarantees ≥1 active account, so
          this empty state is normally unreachable. It is kept as the screen's
          required empty state (FR-SHELL-03) and a safety net if seeding changes. */}
      {accounts.length === 0 ? (
        <EmptyState
          title={ACCOUNTS_PAGE.emptyTitle}
          description={ACCOUNTS_PAGE.emptyDescription}
        />
      ) : (
        <ul className="space-y-4">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="rounded-fin border border-fin-border bg-fin-surface p-5 shadow-fin"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-fin-fg">
                    {account.name}
                  </span>
                  <span className="text-xs text-fin-fg-subtle">
                    {account.currency}
                  </span>
                  {account.isDefault ? (
                    <span className="rounded-fin bg-fin-info-bg px-2 py-0.5 text-xs font-medium text-fin-info-fg">
                      {ACCOUNTS_PAGE.defaultBadge}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex flex-col items-end leading-tight">
                    <span className="text-xs text-fin-fg-subtle">
                      {ACCOUNTS_PAGE.balanceLabel}
                    </span>
                    {balancesAvailable ? (
                      <span className="text-base font-semibold tabular-nums text-fin-fg">
                        {formatUahMinor(balanceByAccount.get(account.id) ?? 0)}
                      </span>
                    ) : (
                      <span className="text-sm text-fin-fg-subtle">
                        {ACCOUNTS_PAGE.balanceUnavailable}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {account.isDefault ? null : (
                    <form action={setDefaultAccountAction}>
                      <input type="hidden" name="id" value={account.id} />
                      <button
                        type="submit"
                        className="min-h-11 rounded-fin border border-fin-border px-3 text-sm text-fin-fg transition-colors hover:border-fin-border-strong hover:bg-fin-surface-muted"
                      >
                        {ACCOUNTS_PAGE.setDefaultLabel}
                      </button>
                    </form>
                  )}
                  <form action={archiveAccountAction}>
                    <input type="hidden" name="id" value={account.id} />
                    <button
                      type="submit"
                      className="min-h-11 rounded-fin border border-fin-border px-3 text-sm text-fin-fg-muted transition-colors hover:border-fin-error-border hover:text-fin-error-fg"
                    >
                      {ACCOUNTS_PAGE.archiveLabel}
                    </button>
                  </form>
              </div>

              <form
                action={renameAccountAction}
                className="mt-3 flex flex-wrap items-end gap-2"
              >
                <input type="hidden" name="id" value={account.id} />
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="sr-only">{ACCOUNTS_PAGE.renameLabel}</span>
                  <input
                    name="name"
                    required
                    maxLength={60}
                    defaultValue={account.name}
                    aria-label={`${ACCOUNTS_PAGE.renameLabel}: ${account.name}`}
                    className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg focus:border-fin-border-strong focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="min-h-11 rounded-fin border border-fin-border px-3 text-sm text-fin-fg transition-colors hover:border-fin-border-strong hover:bg-fin-surface-muted"
                >
                  {ACCOUNTS_PAGE.renameSubmitLabel}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-fin-fg-subtle">{ACCOUNTS_PAGE.balanceHint}</p>
    </>
  );
}

// Settings screen (FR-SET-01/02/03). Server component: it reads AI-provider status
// (never the key value — write-only over the wire, FR-SET-02) and the export link
// through the shared DB boundary, and mutates only via the server actions, so the
// DB boundary is never imported into a client bundle (TC-STACK-02). Ukrainian-first
// copy lives in settings-content.ts; the inline banners reuse the shared states.

import { getRepositories } from "@/src/db/client";
import { SettingsService } from "@/src/modules/settings/service";
import {
  SETTINGS,
  settingsErrorMessage,
} from "@/src/modules/settings/ui/settings-content";
import { PageHeader } from "@/src/modules/foundation/ui/PageHeader";
import { ErrorState, StateView } from "@/src/modules/foundation/ui/states";
import { removeApiKeyAction, saveAiProviderAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ formError?: string; saved?: string }>;
}) {
  const { formError, saved } = await searchParams;
  const errorMessage = settingsErrorMessage(formError);
  const savedNotice =
    saved === "removed"
      ? SETTINGS.removedNotice
      : saved === "config"
        ? SETTINGS.savedNotice
        : null;

  const repos = getRepositories();
  const settings = new SettingsService(
    repos.appConfig,
    repos.ledgerItems,
    repos.accounts,
  );
  const status = await settings.getAiProviderStatus();

  return (
    <>
      <PageHeader title={SETTINGS.title} description={SETTINGS.description} />

      {errorMessage ? (
        <div className="mb-6">
          <ErrorState title={SETTINGS.errorBannerTitle} description={errorMessage} />
        </div>
      ) : null}

      {savedNotice ? (
        <div className="mb-6">
          <StateView tone="info" glyph="✓" title={savedNotice} role="status" />
        </div>
      ) : null}

      <section
        aria-labelledby="settings-ai-heading"
        className="mb-8 rounded-fin border border-fin-border bg-fin-surface p-5 shadow-fin"
      >
        <h2
          id="settings-ai-heading"
          className="mb-1 text-base font-semibold text-fin-fg"
        >
          {SETTINGS.aiHeading}
        </h2>
        <p className="mb-4 text-sm text-fin-fg-muted">{SETTINGS.aiDescription}</p>

        {status.configured ? (
          <p className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-fin bg-fin-info-bg px-3 py-1 text-sm font-medium text-fin-info-fg">
            <span aria-hidden>✓</span>
            <span>{SETTINGS.configuredBadge}</span>
            {status.model ? (
              <span className="font-normal text-fin-fg-muted">· {status.model}</span>
            ) : null}
          </p>
        ) : (
          <div className="mb-4">
            <StateView
              tone="warning"
              glyph="⚠"
              title={SETTINGS.notConfiguredTitle}
              description={SETTINGS.notConfiguredDescription}
            />
          </div>
        )}

        <form action={saveAiProviderAction} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fin-fg-muted">{SETTINGS.apiKeyLabel}</span>
            <input
              type="password"
              name="apiKey"
              autoComplete="off"
              maxLength={512}
              placeholder={SETTINGS.apiKeyPlaceholder}
              className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg placeholder:text-fin-fg-subtle focus:border-fin-border-strong focus:outline-none"
            />
            <span className="text-xs text-fin-fg-subtle">{SETTINGS.apiKeyHelp}</span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fin-fg-muted">{SETTINGS.modelLabel}</span>
            <input
              type="text"
              name="model"
              maxLength={120}
              defaultValue={status.model ?? ""}
              placeholder={SETTINGS.modelPlaceholder}
              className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 text-fin-fg placeholder:text-fin-fg-subtle focus:border-fin-border-strong focus:outline-none"
            />
            <span className="text-xs text-fin-fg-subtle">{SETTINGS.modelHelp}</span>
          </label>

          <button
            type="submit"
            className="min-h-11 rounded-fin bg-fin-primary px-4 font-medium text-white transition-colors hover:bg-fin-primary-hover"
          >
            {SETTINGS.saveLabel}
          </button>
        </form>

        {status.configured ? (
          <form action={removeApiKeyAction} className="mt-3">
            <button
              type="submit"
              className="min-h-11 rounded-fin border border-fin-border px-3 text-sm text-fin-fg-muted transition-colors hover:border-fin-error-border hover:text-fin-error-fg"
            >
              {SETTINGS.removeKeyLabel}
            </button>
          </form>
        ) : null}
      </section>

      <section
        aria-labelledby="settings-export-heading"
        className="rounded-fin border border-fin-border bg-fin-surface p-5 shadow-fin"
      >
        <h2
          id="settings-export-heading"
          className="mb-1 text-base font-semibold text-fin-fg"
        >
          {SETTINGS.exportHeading}
        </h2>
        <p className="mb-4 text-sm text-fin-fg-muted">{SETTINGS.exportDescription}</p>

        <a
          href="/settings/export"
          download
          className="inline-flex min-h-11 items-center rounded-fin border border-fin-border px-4 text-sm font-medium text-fin-fg transition-colors hover:border-fin-border-strong hover:bg-fin-surface-muted"
        >
          {SETTINGS.exportLabel}
        </a>

        <p className="mt-4 text-xs text-fin-fg-subtle">{SETTINGS.exportHint}</p>
      </section>
    </>
  );
}

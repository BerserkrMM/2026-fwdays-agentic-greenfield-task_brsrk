// Settings service — owns the technical-configuration use-cases (TC-MOD-01):
// AI-provider config (write-only key over the wire, FR-SET-02) and read-only CSV
// export of ledger items (FR-SET-03). Framework-free: persistence is injected as
// repository ports, so it is unit-testable against the in-memory fallback with no
// Next/DB import here.

import {
  normalizeOpenAiModel,
  toAiProviderStatus,
  validateOpenAiApiKey,
  type AiProviderStatus,
} from "@/src/domain/app-config";
import { toLedgerCsv } from "@/src/domain/csv-export";
import { OpenAiParserAdapter } from "@/src/modules/parsing/adapters";
import type {
  AccountRepository,
  AppConfigRepository,
  LedgerItemRepository,
  Repositories,
} from "@/src/domain/ports";

export class SettingsService {
  constructor(
    private readonly appConfig: AppConfigRepository,
    private readonly ledgerItems: LedgerItemRepository,
    private readonly accounts: AccountRepository,
  ) {}

  /** Client-safe AI-provider status (configured?/model) — never the key value. */
  async getAiProviderStatus(): Promise<AiProviderStatus> {
    return toAiProviderStatus(await this.appConfig.get());
  }

  /**
   * Server-only resolution of the stored OpenAI config for the parsing adapter.
   * This is the single read path that returns the key value; it is never shaped
   * toward the client (FR-SET-02).
   */
  async getOpenAiAdapterConfig(): Promise<{
    apiKey: string | null;
    model: string | null;
  }> {
    const config = await this.appConfig.get();
    return {
      apiKey: config?.openAiApiKey ?? null,
      model: config?.openAiModel ?? null,
    };
  }

  /**
   * Saves AI-provider settings. The model is always updated (blank → null = use
   * the adapter default). A blank API key leaves the previously stored key
   * unchanged, so re-saving the model never wipes the key; a non-blank key is
   * validated before it replaces the stored one. (FR-SET-02)
   */
  async saveAiProvider(input: { apiKey?: string; model?: string }): Promise<void> {
    // A blank key short-circuits to "keep existing", so validateOpenAiApiKey only
    // ever sees a non-empty string here — its `api-key-required` branch is reached
    // only by direct validation (unit-tested in app-config.test.ts), not this path.
    const rawKey = (input.apiKey ?? "").trim();
    const current = await this.appConfig.get();
    const nextKey =
      rawKey.length === 0 ? (current?.openAiApiKey ?? null) : validateOpenAiApiKey(rawKey);
    await this.appConfig.upsert({
      openAiApiKey: nextKey,
      openAiModel: normalizeOpenAiModel(input.model),
    });
  }

  /** Clears the stored API key (status becomes not-configured), keeping the model. */
  async removeOpenAiApiKey(): Promise<void> {
    const current = await this.appConfig.get();
    await this.appConfig.upsert({
      openAiApiKey: null,
      openAiModel: current?.openAiModel ?? null,
    });
  }

  /**
   * Read-only CSV export of every ledger item (including deleted, which carry a
   * status column) — a full, honest export. Reads through the ledger repository
   * and writes nothing (FR-SET-03).
   */
  async exportLedgerCsv(): Promise<string> {
    // Resolve the readable «Рахунок» column. Archived accounts are included
    // because deleted/old items may still reference them (FR-ACCT-05).
    const [items, accounts] = await Promise.all([
      this.ledgerItems.listAll(),
      this.accounts.list({ includeArchived: true }),
    ]);
    const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
    return toLedgerCsv(items, accountNames);
  }
}

/**
 * Builds the OpenAI parser adapter from the stored Settings config (FR-PARSE-06).
 * When no key is stored the adapter falls back to `OPENAI_API_KEY` (its existing
 * behavior), so parsing ships a working default and Settings only overrides it —
 * the soft `settings -.-> parsing` link. Server-only (constructs from repos).
 */
export async function configuredOpenAiAdapter(
  repos: Repositories,
): Promise<OpenAiParserAdapter> {
  const settings = new SettingsService(
    repos.appConfig,
    repos.ledgerItems,
    repos.accounts,
  );
  const config = await settings.getOpenAiAdapterConfig();
  return new OpenAiParserAdapter({
    apiKey: config.apiKey ?? undefined,
    model: config.model ?? undefined,
  });
}

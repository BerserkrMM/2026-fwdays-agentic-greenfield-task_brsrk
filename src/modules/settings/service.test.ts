import { describe, expect, it } from "vitest";
import { createInMemoryRepositories } from "@/src/db/memory";
import type { LedgerItem } from "@/src/domain/ledger-item";
import { SettingsError } from "@/src/domain/app-config";
import { SettingsService } from "@/src/modules/settings/service";

function service() {
  const repos = createInMemoryRepositories();
  return {
    repos,
    settings: new SettingsService(repos.appConfig, repos.ledgerItems, repos.accounts),
  };
}

let seq = 0;
function ledgerItem(overrides: Partial<LedgerItem> = {}): LedgerItem {
  seq += 1;
  return {
    id: `i${seq}`,
    accountId: "acc-1",
    inputEventId: "ev-1",
    parserRunId: null,
    description: `опис ${seq}`,
    amountMinor: -6000,
    currency: "UAH",
    type: "expense",
    category: "Їжа",
    confidence: null,
    status: "pending",
    importRowNumber: null,
    occurredAt: new Date("2025-05-12T08:00:00Z"),
    createdAt: new Date("2025-05-12T08:00:00Z"),
    ...overrides,
  };
}

describe("SettingsService — AI provider config (FR-SET-02)", () => {
  it("is not-configured until a key is saved, and never returns the key", async () => {
    const { settings } = service();
    expect(await settings.getAiProviderStatus()).toEqual({
      configured: false,
      model: null,
    });

    await settings.saveAiProvider({ apiKey: "sk-live-123", model: "gpt-4o-mini" });

    const status = await settings.getAiProviderStatus();
    expect(status).toEqual({ configured: true, model: "gpt-4o-mini" });
    expect(JSON.stringify(status)).not.toContain("sk-live-123");
  });

  it("rejects an invalid key with a SettingsError (no silent persist)", async () => {
    const { settings } = service();
    await expect(
      settings.saveAiProvider({ apiKey: "sk bad key", model: "" }),
    ).rejects.toBeInstanceOf(SettingsError);
    expect(await settings.getAiProviderStatus()).toEqual({
      configured: false,
      model: null,
    });
  });

  it("a blank key on save preserves the previously stored key", async () => {
    const { settings } = service();
    await settings.saveAiProvider({ apiKey: "sk-keep-me", model: "gpt-4o-mini" });
    // re-save with a blank key but a new model — the key must remain configured
    await settings.saveAiProvider({ apiKey: "", model: "gpt-4o" });

    const status = await settings.getAiProviderStatus();
    expect(status).toEqual({ configured: true, model: "gpt-4o" });
    expect((await settings.getOpenAiAdapterConfig()).apiKey).toBe("sk-keep-me");
  });

  it("a blank key with no prior config stays not-configured", async () => {
    const { settings } = service();
    await settings.saveAiProvider({ apiKey: "  ", model: "gpt-4o" });
    const status = await settings.getAiProviderStatus();
    expect(status).toEqual({ configured: false, model: "gpt-4o" });
  });

  it("removing a key with no prior config is a harmless no-op", async () => {
    const { settings } = service();
    await settings.removeOpenAiApiKey();
    expect((await settings.getAiProviderStatus()).configured).toBe(false);
  });

  it("removes a stored key on request", async () => {
    const { settings } = service();
    await settings.saveAiProvider({ apiKey: "sk-remove", model: "gpt-4o-mini" });
    await settings.removeOpenAiApiKey();

    const status = await settings.getAiProviderStatus();
    expect(status.configured).toBe(false);
    expect((await settings.getOpenAiAdapterConfig()).apiKey).toBeNull();
  });

  it("exposes the stored key to the server-side parsing wiring only", async () => {
    const { settings } = service();
    await settings.saveAiProvider({ apiKey: "sk-for-parsing", model: "gpt-4o" });
    expect(await settings.getOpenAiAdapterConfig()).toEqual({
      apiKey: "sk-for-parsing",
      model: "gpt-4o",
    });
  });
});

describe("SettingsService — CSV export (FR-SET-03)", () => {
  it("folds all ledger items into CSV without mutating them", async () => {
    const { repos, settings } = service();
    await repos.ledgerItems.insert(ledgerItem({ category: "Їжа" }));
    await repos.ledgerItems.insert(
      ledgerItem({ amountMinor: 50000, type: "income", category: "Зарплата" }),
    );

    const before = (await repos.ledgerItems.listAll()).length;
    const csv = await settings.exportLedgerCsv();
    const after = (await repos.ledgerItems.listAll()).length;

    expect(csv).toContain("Їжа");
    expect(csv).toContain("Зарплата");
    expect(after).toBe(before); // read-only export
  });

  it("resolves the readable account name in the «Рахунок» column", async () => {
    const { repos, settings } = service();
    const account = await repos.accounts.insert({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Картка ПриватБанк",
      currency: "UAH",
      isDefault: true,
      archivedAt: null,
      createdAt: new Date("2025-01-01T00:00:00Z"),
    });
    await repos.ledgerItems.insert(ledgerItem({ accountId: account.id }));

    const csv = await settings.exportLedgerCsv();
    expect(csv).toContain("Картка ПриватБанк"); // name, not the UUID
    expect(csv).not.toContain(account.id);
  });
});

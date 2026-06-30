import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryRepositories } from "@/src/db/memory";
import { SettingsService } from "@/src/modules/settings/service";
import type { Repositories } from "@/src/domain/ports";

// Exercises the /settings server actions end-to-end over the real SettingsService
// and in-memory repositories, controlling only the Next runtime hooks.
const h = vi.hoisted(() => ({ repos: undefined as unknown as Repositories }));

vi.mock("@/src/db/client", () => ({ getRepositories: () => h.repos }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

function saveForm(apiKey: string, model = ""): FormData {
  const form = new FormData();
  form.set("apiKey", apiKey);
  form.set("model", model);
  return form;
}

describe("settings actions (FR-SET-02)", () => {
  beforeEach(() => {
    h.repos = createInMemoryRepositories();
  });

  // @trace FR-SET-02
  it("saves a valid key and redirects to the saved state (key persisted, never echoed)", async () => {
    const { saveAiProviderAction } = await import("@/app/settings/actions");
    await expect(saveAiProviderAction(saveForm("sk-live-xyz", "gpt-4o"))).rejects.toThrow(
      "redirect:/settings?saved=config",
    );
    const status = await new SettingsService(
      h.repos.appConfig,
      h.repos.ledgerItems,
      h.repos.accounts,
    ).getAiProviderStatus();
    expect(status).toEqual({ configured: true, model: "gpt-4o" });
  });

  // @trace FR-SET-02
  it("maps an invalid key to the inline error surface and persists nothing", async () => {
    const { saveAiProviderAction } = await import("@/app/settings/actions");
    await expect(saveAiProviderAction(saveForm("sk has spaces"))).rejects.toThrow(
      "redirect:/settings?formError=api-key-whitespace",
    );
    const status = await new SettingsService(
      h.repos.appConfig,
      h.repos.ledgerItems,
      h.repos.accounts,
    ).getAiProviderStatus();
    expect(status.configured).toBe(false);
  });

  // @trace FR-SET-02
  it("removes the stored key and redirects to the removed state", async () => {
    await h.repos.appConfig.upsert({ openAiApiKey: "sk-old", openAiModel: "gpt-4o" });
    const { removeApiKeyAction } = await import("@/app/settings/actions");
    await expect(removeApiKeyAction()).rejects.toThrow("redirect:/settings?saved=removed");
    const status = await new SettingsService(
      h.repos.appConfig,
      h.repos.ledgerItems,
      h.repos.accounts,
    ).getAiProviderStatus();
    expect(status.configured).toBe(false);
  });
});

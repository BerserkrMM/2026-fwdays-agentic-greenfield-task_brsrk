import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRepositories, resetDbBoundaryForTests } from "@/src/db/client";
import { collectServerTreeText as collectText } from "@/src/test-support/server-tree";
import {
  SETTINGS,
  SETTINGS_ERRORS,
} from "@/src/modules/settings/ui/settings-content";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => ({
    type: "a",
    props: { href, children },
  }),
}));

// The page imports the server actions, which import next/cache + next/navigation
// at module load; stub them so importing the page does not pull the Next runtime.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

let savedDatabaseUrl: string | undefined;

beforeEach(async () => {
  savedDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL; // force the in-memory fallback
  await resetDbBoundaryForTests();
});

afterEach(async () => {
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
  await resetDbBoundaryForTests();
});

async function render(
  searchParams: { formError?: string; saved?: string } = {},
) {
  const { default: SettingsPage } = await import("@/app/settings/page");
  return collectText(await SettingsPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("SettingsPage (FR-SET-01/02/03)", () => {
  // @trace FR-SET-01, FR-SET-02, FR-SHELL-03
  it("shows the not-configured state and an export link before any key is saved", async () => {
    getRepositories(); // initialize empty in-memory repo
    const text = await render();

    expect(text).toContain(SETTINGS.title);
    expect(text).toContain(SETTINGS.notConfiguredTitle);
    expect(text).toContain(SETTINGS.exportLabel);
    expect(text).toContain("/settings/export");
  });

  // @trace FR-SET-02
  it("shows the configured badge but never the stored key value", async () => {
    const repos = getRepositories();
    await repos.appConfig.upsert({
      openAiApiKey: "sk-super-secret-value",
      openAiModel: "gpt-4o",
    });

    const text = await render();
    expect(text).toContain(SETTINGS.configuredBadge);
    expect(text).toContain("gpt-4o");
    expect(text).not.toContain("sk-super-secret-value");
  });

  // @trace FR-SET-02, FR-SHELL-03
  it("renders the validation error banner from a ?formError param", async () => {
    getRepositories();
    const text = await render({ formError: "api-key-whitespace" });
    expect(text).toContain(SETTINGS_ERRORS["api-key-whitespace"]);
  });

  // @trace FR-SET-02
  it("renders the saved-confirmation notice from a ?saved param", async () => {
    getRepositories();
    const text = await render({ saved: "config" });
    expect(text).toContain(SETTINGS.savedNotice);
  });

  // @trace FR-SET-02
  it("renders the removed notice from ?saved=removed", async () => {
    getRepositories();
    const text = await render({ saved: "removed" });
    expect(text).toContain(SETTINGS.removedNotice);
  });

  // @trace FR-SET-02
  it("shows the configured badge without a model when none is set", async () => {
    const repos = getRepositories();
    await repos.appConfig.upsert({ openAiApiKey: "sk-no-model", openAiModel: null });
    const text = await render();
    expect(text).toContain(SETTINGS.configuredBadge);
    expect(text).not.toContain("sk-no-model");
  });
});

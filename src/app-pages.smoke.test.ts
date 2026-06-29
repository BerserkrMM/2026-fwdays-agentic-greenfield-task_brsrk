import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => ({
    type: "a",
    props: { href, children },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

// @trace FR-SHELL-03, FR-IMPORT-01, FR-FILE-01, FR-DASH-01, FR-SET-01
describe("static app pages", () => {
  it("renders placeholder/static routes without server dependencies", async () => {
    const { default: DashboardPage } = await import("@/app/dashboard/page");
    const { default: ImportsHubPage } = await import("@/app/imports/page");
    const { default: ImportFilesPage } = await import("@/app/imports/files/page");
    const { default: SettingsPage } = await import("@/app/settings/page");

    expect(DashboardPage()).toBeTruthy();
    expect(ImportsHubPage()).toBeTruthy();
    expect(ImportFilesPage()).toBeTruthy();
    expect(SettingsPage()).toBeTruthy();
  });

  it("redirects the home route to dashboard", async () => {
    const { default: Home } = await import("@/app/page");

    expect(() => Home()).toThrow("redirect:/dashboard");
  });
});

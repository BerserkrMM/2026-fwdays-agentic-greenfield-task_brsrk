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

// @trace FR-SHELL-03, FR-IMPORT-01, FR-FILE-01
// NOTE: /settings is no longer a static placeholder — it is a real server
// component that reads the DB boundary, covered by app-settings-page.smoke.test.ts
// (with DATABASE_URL isolation), so it is intentionally not exercised here.
describe("static app pages", () => {
  it("renders placeholder/static routes without server dependencies", async () => {
    const { default: ImportsHubPage } = await import("@/app/imports/page");
    const { default: ImportFilesPage } = await import("@/app/imports/files/page");

    expect(ImportsHubPage()).toBeTruthy();
    expect(await ImportFilesPage({ searchParams: Promise.resolve({}) })).toBeTruthy();
  });

  it("renders the receipt-photo page error state from a formError param", async () => {
    const { default: ImportFilesPage } = await import("@/app/imports/files/page");
    // An array param exercises the `firstParam` array branch and the error ternary.
    const rendered = await ImportFilesPage({
      searchParams: Promise.resolve({ formError: ["file-invalid", "ignored"] }),
    });
    expect(rendered).toBeTruthy();
  });

  it("redirects the home route to the about presentation page", async () => {
    const { default: Home } = await import("@/app/page");

    expect(() => Home()).toThrow("redirect:/about");
  });
});

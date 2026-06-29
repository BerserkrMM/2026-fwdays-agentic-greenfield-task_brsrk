import { describe, expect, it, vi } from "vitest";

const getRepositories = vi.fn(() => {
  throw new Error("unexpected db access");
});

vi.mock("@/src/db/client", () => ({ getRepositories }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

// @trace FR-TEXT-01
// Server-action boundary regression: a malformed multipart payload must not let
// a File masquerade as manual text and reach input_event/parser creation.
describe("importTextAction", () => {
  it("rejects a non-string text field before parsing", async () => {
    const { importTextAction } = await import("@/app/imports/text/actions");
    const formData = new FormData();
    formData.append("text", new Blob(["not text"]), "payload.txt");

    await expect(importTextAction(formData)).rejects.toThrow(
      "redirect:/imports/text?formError=empty-text",
    );
    expect(getRepositories).not.toHaveBeenCalled();
  });

  it("rejects blank text before seeding the default account", async () => {
    const { importTextAction } = await import("@/app/imports/text/actions");
    const formData = new FormData();
    formData.set("text", "   ");

    await expect(importTextAction(formData)).rejects.toThrow(
      "redirect:/imports/text?formError=empty-text",
    );
    expect(getRepositories).not.toHaveBeenCalled();
  });
});

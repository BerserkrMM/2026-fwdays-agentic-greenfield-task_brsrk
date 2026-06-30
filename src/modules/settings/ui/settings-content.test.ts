import { describe, expect, it } from "vitest";
import {
  SETTINGS_ERRORS,
  settingsErrorMessage,
} from "@/src/modules/settings/ui/settings-content";

// @trace FR-SET-02, NFR-I18N-01
describe("settingsErrorMessage", () => {
  it("returns null when there is no error code", () => {
    expect(settingsErrorMessage(undefined)).toBeNull();
  });

  it("maps a known code to its Ukrainian message", () => {
    expect(settingsErrorMessage("api-key-required")).toBe(
      SETTINGS_ERRORS["api-key-required"],
    );
  });

  it("falls back to a generic Ukrainian message for an unknown code", () => {
    expect(settingsErrorMessage("totally-unknown")).toBe(
      "Не вдалося зберегти налаштування. Спробуйте ще раз.",
    );
  });

  it("does not resolve inherited object keys from the query string", () => {
    expect(settingsErrorMessage("__proto__")).toBe(
      "Не вдалося зберегти налаштування. Спробуйте ще раз.",
    );
    expect(settingsErrorMessage("constructor")).toBe(
      "Не вдалося зберегти налаштування. Спробуйте ще раз.",
    );
  });
});

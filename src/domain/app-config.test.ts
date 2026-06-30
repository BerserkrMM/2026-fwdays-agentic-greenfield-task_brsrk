import { describe, expect, it } from "vitest";
import {
  MAX_OPENAI_API_KEY_LENGTH,
  SettingsError,
  normalizeOpenAiModel,
  toAiProviderStatus,
  validateOpenAiApiKey,
  type AppConfig,
} from "@/src/domain/app-config";

describe("validateOpenAiApiKey (FR-SET-02)", () => {
  it("trims and returns a valid key", () => {
    expect(validateOpenAiApiKey("  sk-abc123  ")).toBe("sk-abc123");
  });

  it("rejects an empty/whitespace-only key", () => {
    expect(() => validateOpenAiApiKey("   ")).toThrowError(SettingsError);
    try {
      validateOpenAiApiKey("");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(SettingsError);
      expect((error as SettingsError).code).toBe("api-key-required");
    }
  });

  it("rejects a key with internal whitespace", () => {
    try {
      validateOpenAiApiKey("sk abc");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(SettingsError);
      expect((error as SettingsError).code).toBe("api-key-whitespace");
    }
  });

  it("rejects an over-long key", () => {
    try {
      validateOpenAiApiKey("s".repeat(MAX_OPENAI_API_KEY_LENGTH + 1));
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as SettingsError).code).toBe("api-key-too-long");
    }
  });
});

describe("normalizeOpenAiModel (FR-SET-02)", () => {
  it("trims a provided model", () => {
    expect(normalizeOpenAiModel("  gpt-4o-mini  ")).toBe("gpt-4o-mini");
  });

  it("maps blank/undefined to null (use the adapter default)", () => {
    expect(normalizeOpenAiModel("")).toBeNull();
    expect(normalizeOpenAiModel("   ")).toBeNull();
    expect(normalizeOpenAiModel(undefined)).toBeNull();
    expect(normalizeOpenAiModel(null)).toBeNull();
  });
});

describe("toAiProviderStatus (FR-SET-02 — write-only over the wire)", () => {
  function config(overrides: Partial<AppConfig> = {}): AppConfig {
    return {
      openAiApiKey: "sk-secret",
      openAiModel: "gpt-4o-mini",
      updatedAt: new Date("2026-06-30T00:00:00Z"),
      ...overrides,
    };
  }

  it("reports configured + model but never the key value", () => {
    const status = toAiProviderStatus(config());
    expect(status).toEqual({ configured: true, model: "gpt-4o-mini" });
    expect(JSON.stringify(status)).not.toContain("sk-secret");
  });

  it("reports not-configured when no key is stored", () => {
    expect(toAiProviderStatus(config({ openAiApiKey: null }))).toEqual({
      configured: false,
      model: "gpt-4o-mini",
    });
  });

  it("reports not-configured for a missing config row", () => {
    expect(toAiProviderStatus(null)).toEqual({ configured: false, model: null });
  });
});

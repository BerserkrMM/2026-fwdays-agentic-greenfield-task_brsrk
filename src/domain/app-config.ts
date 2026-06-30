// App configuration — framework-free (TC-PURE-01). Owns the AI-provider config
// model and its write-only-over-the-wire projection (FR-SET-02). The full
// `AppConfig` (with the key) is server-only; only `AiProviderStatus` — which never
// carries the key value — is ever shaped toward the client.

/** Persisted AI-provider configuration. Server-only: includes the secret key. */
export interface AppConfig {
  openAiApiKey: string | null;
  openAiModel: string | null;
  updatedAt: Date;
}

/**
 * Client-safe projection of {@link AppConfig}: whether a key is configured and
 * the (non-secret) model. It deliberately omits the key value so the stored key
 * is write-only over the wire (FR-SET-02).
 */
export interface AiProviderStatus {
  configured: boolean;
  model: string | null;
}

export type SettingsErrorCode =
  | "api-key-required"
  | "api-key-too-long"
  | "api-key-whitespace";

/** Domain error for invalid settings input; carries a stable code for the UI. */
export class SettingsError extends Error {
  constructor(
    public readonly code: SettingsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SettingsError";
  }
}

/** Upper bound on a stored OpenAI key length (defensive; real keys are short). */
export const MAX_OPENAI_API_KEY_LENGTH = 512;

/**
 * Validates and normalizes an OpenAI API key. Trims surrounding whitespace, then
 * rejects an empty value, one with internal whitespace (a real key has none), or
 * one that is implausibly long. Returns the trimmed key on success.
 */
export function validateOpenAiApiKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new SettingsError("api-key-required", "Вкажіть API-ключ OpenAI.");
  }
  if (trimmed.length > MAX_OPENAI_API_KEY_LENGTH) {
    throw new SettingsError(
      "api-key-too-long",
      "API-ключ задовгий. Перевірте, що скопіювали лише ключ.",
    );
  }
  if (/\s/.test(trimmed)) {
    throw new SettingsError(
      "api-key-whitespace",
      "API-ключ не може містити пробіли. Перевірте скопійоване значення.",
    );
  }
  return trimmed;
}

/** Normalizes an optional model override: trimmed text, or null when blank. */
export function normalizeOpenAiModel(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Projects the (server-only) config into the client-safe status (no key). */
export function toAiProviderStatus(config: AppConfig | null): AiProviderStatus {
  return {
    configured: Boolean(config?.openAiApiKey),
    model: config?.openAiModel ?? null,
  };
}

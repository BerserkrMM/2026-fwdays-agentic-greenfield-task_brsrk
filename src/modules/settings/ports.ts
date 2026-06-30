// Settings module ports (TC-MOD-01). Re-exports the settings domain surface so the
// rest of the app depends on a stable port, not internals.

export type {
  AppConfig,
  AiProviderStatus,
  SettingsErrorCode,
} from "@/src/domain/app-config";
export {
  MAX_OPENAI_API_KEY_LENGTH,
  SettingsError,
  normalizeOpenAiModel,
  toAiProviderStatus,
  validateOpenAiApiKey,
} from "@/src/domain/app-config";
export { CSV_HEADER, csvCell, toLedgerCsv } from "@/src/domain/csv-export";
export type { AppConfigRepository } from "@/src/domain/ports";
export { SettingsService, configuredOpenAiAdapter } from "./service";

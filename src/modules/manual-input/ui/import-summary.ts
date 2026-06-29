// Pure helper for the post-import summary surfaced on the Ledger screen
// (FR-TEXT-05). Owned by manual-input; the Ledger route imports it to render the
// banner from `?imported`/`?failed` query params. Framework-free (TC-PURE-01).

export interface ImportSummary {
  created: number;
  failed: number;
}

type RawParam = string | string[] | undefined;

function toCount(value: RawParam): number | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === undefined) return null;
  if (!/^\d+$/.test(first)) return null;
  return Number.parseInt(first, 10);
}

/**
 * Reads a created/failed summary from query params, or null when neither is
 * present/valid. A missing-but-valid side defaults to zero.
 */
export function parseImportSummary(params: {
  imported?: RawParam;
  failed?: RawParam;
}): ImportSummary | null {
  const created = toCount(params.imported);
  const failed = toCount(params.failed);
  if (created === null && failed === null) return null;
  return { created: created ?? 0, failed: failed ?? 0 };
}

/** True when the import recognized nothing (no items created, none failed). */
export function isEmptyImport({ created, failed }: ImportSummary): boolean {
  return created === 0 && failed === 0;
}

/** Ukrainian banner text for an import summary. */
export function importSummaryMessage(summary: ImportSummary): string {
  const { created, failed } = summary;
  if (isEmptyImport(summary)) {
    return "Не вдалося розпізнати жодної операції. Перевірте текст і спробуйте ще раз.";
  }
  const createdPart = `Створено операцій: ${created}.`;
  if (failed > 0) {
    return `${createdPart} Не вдалося зберегти: ${failed}.`;
  }
  return createdPart;
}

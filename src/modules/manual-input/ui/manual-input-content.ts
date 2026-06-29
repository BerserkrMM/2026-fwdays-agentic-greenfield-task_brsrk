// Ukrainian-first copy for the `/imports/text` screen (NFR-I18N-01). Single
// source of truth so the page and tests share one set of strings.

export const MANUAL_TEXT_PAGE = {
  title: "Текст",
  description:
    "Вставте вільний текст про витрати чи доходи — ШІ розпізнає окремі операції зі статусом «очікує перевірки».",
  fieldLabel: "Текст операцій",
  placeholder: "Напр.: 40 грн ковбаса, 20 грн хліб",
  hint: "Кожен рядок або фразу буде розпізнано як окрему операцію. Оригінальний текст зберігається.",
  submitLabel: "Розпізнати та зберегти",
  errorTitle: "Не вдалося обробити текст",
} as const;

const ERROR_MESSAGES: Record<string, string> = {
  "empty-text": "Введіть текст для імпорту.",
  "parse-failed":
    "Не вдалося розпізнати текст. Перевірте налаштування ШІ або спробуйте ще раз.",
};

/** Maps a `?formError=` code to a Ukrainian message, or null when unknown/absent. */
export function manualTextErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? "Сталася помилка. Спробуйте ще раз.";
}

export const BANK_IMPORT_PAGE = {
  title: "Виписка банку",
  description:
    "Завантажте CSV/XLS/XLSX виписку, оберіть банк — ми створимо операції зі статусом «очікує перевірки».",
  providerLabel: "Банк",
  fileLabel: "Файл виписки",
  submitLabel: "Імпортувати виписку",
  hint:
    "Оригінал зберігається перед обробкою. Рядки потраплять у Журнал, де їх можна перевірити, змінити або видалити.",
  errorTitle: "Не вдалося імпортувати виписку",
  providerOptions: [
    { value: "monobank", label: "Monobank" },
    { value: "privatbank", label: "PrivatBank" },
  ],
} as const;

export function bankImportErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "provider-invalid":
      return "Оберіть підтримуваного провайдера: Monobank або PrivatBank.";
    case "file-invalid":
      return "Завантажте файл виписки у форматі CSV, XLS або XLSX.";
    case "empty-statement":
      return "У виписці не знайдено рядків, які можна імпортувати.";
    case "parse-failed":
      return "Не вдалося розпізнати рядки виписки. Перевірте файл або спробуйте ще раз.";
    default:
      return "Сталася помилка. Спробуйте ще раз.";
  }
}

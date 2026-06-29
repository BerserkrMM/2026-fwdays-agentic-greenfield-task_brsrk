// Ukrainian-first copy for the receipt-photo import channel (NFR-I18N-01,
// BC-BRAND-01). Pure data so it can be unit-tested and graded by the eval case.

export const FILE_IMPORT_PAGE = {
  title: "Фото чека",
  description:
    "Завантажте одне фото чека — ми розпізнаємо позиції та створимо операції зі статусом «очікує перевірки».",
  fileLabel: "Фото чека",
  submitLabel: "Розпізнати чек",
  hint:
    "Підтримуються зображення JPEG, PNG або WEBP. PDF не підтримується. Оригінал зберігається перед обробкою; позиції потраплять у Журнал, де їх можна перевірити, змінити або видалити.",
  errorTitle: "Не вдалося імпортувати чек",
} as const;

export function fileImportErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "file-invalid":
      return "Завантажте одне фото чека у форматі JPEG, PNG або WEBP. PDF не підтримується.";
    case "parse-failed":
      return "Не вдалося розпізнати чек. Перевірте, що фото чітке, або спробуйте ще раз.";
    default:
      return "Сталася помилка. Спробуйте ще раз.";
  }
}

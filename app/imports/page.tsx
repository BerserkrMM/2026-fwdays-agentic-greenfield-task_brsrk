import Link from "next/link";
import { PageHeader } from "@/src/modules/foundation/ui/PageHeader";

// Imports hub (FR-IMPORT-01): links the three input channels and explains the
// pipeline. The channels themselves ship later as their own capabilities.

const CHANNELS = [
  {
    href: "/imports/text",
    glyph: "✎",
    title: "Текст",
    description: "Напишіть витрати словами, напр. «40 грн ковбаса, 20 грн хліб».",
  },
  {
    href: "/imports/bank",
    glyph: "↥",
    title: "Виписка банку",
    description: "Завантажте виписку Monobank або PrivatBank (CSV/XLS/XLSX).",
  },
  {
    href: "/imports/files",
    glyph: "▣",
    title: "Фото чека",
    description: "Сфотографуйте один чек — система розпізнає операції.",
  },
] as const;

export default function ImportsHubPage() {
  return (
    <>
      <PageHeader
        title="Імпорт"
        description="Оберіть спосіб внесення. Будь-яке джерело перетворюється на операції зі статусом «очікує перевірки», які ви потім перевіряєте."
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {CHANNELS.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="flex h-full min-h-11 flex-col gap-2 rounded-fin border border-fin-border bg-fin-surface p-5 shadow-fin transition-colors hover:border-fin-border-strong hover:bg-fin-surface-muted"
            >
              <span aria-hidden className="text-2xl leading-none text-fin-primary">
                {c.glyph}
              </span>
              <span className="text-base font-semibold text-fin-fg">
                {c.title}
              </span>
              <span className="text-sm text-fin-fg-muted">{c.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-fin-fg-subtle">
        Потік: джерело → операції «очікує перевірки» → перевірка. Імпорт PDF поки
        не підтримується.
      </p>
    </>
  );
}

import Link from "next/link";
import { PageHeader } from "@/src/modules/foundation/ui/PageHeader";
import { IMPORTS_HUB } from "@/src/modules/foundation/ui/imports-hub-content";

// Imports hub (FR-IMPORT-01): links the three input channels and explains the
// pipeline. The channels themselves ship later as their own capabilities. Copy
// is the single source of truth in `imports-hub-content.ts`.

export default function ImportsHubPage() {
  return (
    <>
      <PageHeader title={IMPORTS_HUB.title} description={IMPORTS_HUB.description} />
      <ul className="grid gap-4 sm:grid-cols-2">
        {IMPORTS_HUB.channels.map((c) => (
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
      <p className="mt-6 text-xs text-fin-fg-subtle">{IMPORTS_HUB.footer}</p>
    </>
  );
}

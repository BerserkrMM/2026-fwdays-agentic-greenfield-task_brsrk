"use client";

// Desktop sidebar navigation with an active-route indicator (FR-SHELL-01/02).
// Hidden on mobile, where MobileNav takes over.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, NAV_ITEMS } from "./nav-items";

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-fin-border bg-fin-surface md:flex md:w-60 md:flex-col">
      <div className="flex h-16 items-center gap-2 px-6">
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-fin-sm bg-fin-primary text-sm font-semibold text-white"
        >
          F
        </span>
        <span className="text-lg font-semibold tracking-tight text-fin-fg">
          Finup
        </span>
      </div>
      <nav aria-label="Головна навігація" className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex min-h-11 items-center gap-3 rounded-fin px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-fin-primary-soft text-fin-primary"
                  : "text-fin-fg-muted hover:bg-fin-surface-muted hover:text-fin-fg",
              ].join(" ")}
            >
              <span aria-hidden className="text-base leading-none">
                {item.glyph}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

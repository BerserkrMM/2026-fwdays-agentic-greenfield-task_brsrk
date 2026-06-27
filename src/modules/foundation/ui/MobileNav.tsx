"use client";

// Mobile/PWA bottom navigation (FR-SHELL-02). Shows the primary items, honors the
// bottom safe-area inset, and uses ≥44px touch targets with no hover-only action
// (NFR-A11Y-01).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, NAV_ITEMS } from "./nav-items";

export function MobileNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.primary);

  return (
    <nav
      aria-label="Головна навігація"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-fin-border bg-fin-surface md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium transition-colors",
                  active ? "text-fin-primary" : "text-fin-fg-subtle",
                ].join(" ")}
              >
                <span aria-hidden className="text-lg leading-none">
                  {item.glyph}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

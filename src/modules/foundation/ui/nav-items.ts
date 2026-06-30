// Global navigation config (FR-SHELL-01). Ukrainian-first labels (NFR-I18N-01),
// routes per docs/requirements.md. `primary` items also appear in the mobile
// bottom nav (DESIGN.md §4).

export interface NavItem {
  href: string;
  label: string;
  /** Short glyph used in the compact rail / mobile nav. */
  glyph: string;
  /** Shown in the mobile bottom navigation. */
  primary: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Огляд", glyph: "◎", primary: true },
  { href: "/ledger", label: "Журнал", glyph: "≣", primary: true },
  { href: "/imports", label: "Імпорт", glyph: "↥", primary: true },
  { href: "/accounts", label: "Рахунки", glyph: "▤", primary: true },
  { href: "/settings", label: "Налаштування", glyph: "⚙", primary: false },
  { href: "/about", label: "Про проєкт", glyph: "ℹ", primary: false },
];

/** Is `pathname` within the section owned by `href`? */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

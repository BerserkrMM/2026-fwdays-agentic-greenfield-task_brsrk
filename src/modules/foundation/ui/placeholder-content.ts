// Single source of truth for placeholder route copy (FR-SHELL-03). Each
// not-yet-implemented capability route renders PlaceholderScreen with its own
// capability-specific title + description. Shared by the pages AND the foundation
// eval cases, so the graded copy is exactly what the app renders.

// Explicit-state copy shared by PlaceholderScreen and the eval/tests. Kept here
// (a pure module with no JSX imports) so importing it does not pull the UI tree.
export const PLACEHOLDER_STATE_TITLE = "Скоро";
export const PLACEHOLDER_DEFAULT_NOTE =
  "Цей розділ зараз у розробці й з’явиться незабаром.";

export interface PlaceholderCopy {
  href: string;
  title: string;
  description: string;
}

export const PLACEHOLDER_SECTIONS: readonly PlaceholderCopy[] = [
  {
    href: "/dashboard",
    title: "Огляд",
    description: "Баланс, доходи й витрати, розподіл за категоріями та тренди.",
  },
  {
    href: "/ledger",
    title: "Журнал",
    description: "Список операцій зі статусами, фільтром і пошуком.",
  },
  {
    href: "/accounts",
    title: "Рахунки",
    description: "Список рахунків, типовий рахунок і баланси (UAH).",
  },
  {
    href: "/settings",
    title: "Налаштування",
    description: "Технічні налаштування, зокрема параметри AI-провайдера.",
  },
];

export function placeholderFor(href: string): PlaceholderCopy {
  const found = PLACEHOLDER_SECTIONS.find((s) => s.href === href);
  if (!found) throw new Error(`No placeholder copy registered for ${href}`);
  return found;
}

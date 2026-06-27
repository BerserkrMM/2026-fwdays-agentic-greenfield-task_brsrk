// Topbar (FR-SHELL-02): brand on mobile, offline status (DESIGN.md §4). Honors the
// top safe-area inset. Server component embedding the live OfflineIndicator.

import { OfflineIndicator } from "./OfflineIndicator";

export function Topbar() {
  return (
    <header
      className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-fin-border bg-fin-surface/90 px-4 backdrop-blur md:px-6"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-2 md:hidden">
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-fin-sm bg-fin-primary text-sm font-semibold text-white"
        >
          F
        </span>
        <span className="text-base font-semibold tracking-tight text-fin-fg">
          Finup
        </span>
      </div>
      <div className="ml-auto">
        <OfflineIndicator />
      </div>
    </header>
  );
}

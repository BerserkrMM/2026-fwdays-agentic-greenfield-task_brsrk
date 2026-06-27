// AppShell (FR-SHELL-01/02): the responsive frame wrapping every route — desktop
// sidebar + topbar, mobile bottom nav, safe-area aware. Foundation-owned
// (TC-MOD-02).

import type { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import { SideNav } from "./SideNav";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-fin-bg">
      <ServiceWorkerRegister />
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        {/* Bottom padding clears the mobile nav + its safe-area inset. */}
        <main
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 md:px-8 md:pb-10"
          style={{
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
          }}
        >
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

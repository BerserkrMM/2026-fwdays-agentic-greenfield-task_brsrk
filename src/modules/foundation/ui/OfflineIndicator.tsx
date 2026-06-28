"use client";

// Live offline indicator (FR-SHELL-03). Binds to real connectivity via
// navigator.onLine + the online/offline events; clears when connectivity returns.

import { useEffect, useState } from "react";

export function OfflineIndicator() {
  // Default online to avoid a flash before hydration; corrected in effect.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-fin-sm border border-fin-info-border bg-fin-info-bg px-3 py-1 text-xs font-medium text-fin-info-fg"
    >
      <span aria-hidden>⚡</span>
      Офлайн-режим
    </div>
  );
}

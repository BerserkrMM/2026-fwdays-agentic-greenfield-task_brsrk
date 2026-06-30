"use client";

// Registers the shell-only service worker so the app is installable and can
// render offline (FR-SHELL-01/03, TC-STACK-01). Silent on browsers without
// service-worker support; logs nothing on a healthy session (NFR-OBS-01).
//
// Registration is PRODUCTION-ONLY. In dev the SW's cache-first handling of
// /_next/static/* serves stale chunks (dev chunk URLs are stable, not
// content-hashed), so the client can hydrate against an old bundle while the
// server sends fresh HTML — a hydration mismatch. In production those assets are
// immutable hashed URLs, so cache-first is safe. In any non-production build we
// also actively unregister a leftover SW and drop its caches so a session that
// was already controlled by a stale worker self-heals on the next load.

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Self-heal: tear down any SW + caches left over from a prior session so
      // dev never hydrates against a stale, cache-first bundle.
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => undefined);
      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => undefined);
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Registration is best-effort; the app still works without it.
      });
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}

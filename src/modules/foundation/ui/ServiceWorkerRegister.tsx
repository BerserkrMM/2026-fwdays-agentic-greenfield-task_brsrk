"use client";

// Registers the shell-only service worker so the app is installable and can
// render offline (FR-SHELL-01/03, TC-STACK-01). Silent on browsers without
// service-worker support; logs nothing on a healthy session (NFR-OBS-01).

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
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

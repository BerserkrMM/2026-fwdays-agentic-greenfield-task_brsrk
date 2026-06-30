import type { MetadataRoute } from "next";

// Web app manifest (FR-SHELL-01, TC-STACK-01). theme/background colors are literal
// hex kept in sync with the fin-* tokens in app/globals.css — the sanctioned
// JS-only exception to the "no raw hex" rule (FR-SHELL-04).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finup — облік фінансів",
    short_name: "Finup",
    description:
      "Особистий облік фінансів: текст, фото чека або виписка банку → операції.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7faf8", // --fin-bg
    theme_color: "#1f8a5b", // --fin-primary
    lang: "uk",
    dir: "ltr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

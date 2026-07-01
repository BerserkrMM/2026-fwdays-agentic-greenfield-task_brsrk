import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/src/modules/foundation/ui/AppShell";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finup — облік фінансів",
  description:
    "Особистий облік фінансів: записуйте витрати текстом, фото чека або випискою банку.",
  applicationName: "Finup",
  appleWebApp: { capable: true, title: "Finup", statusBarStyle: "default" },
};

// Next.js 16: themeColor + viewport-fit live on the `viewport` export, not
// `metadata`. `viewportFit: "cover"` makes env(safe-area-inset-*) resolve to real
// device values. themeColor literal is kept in sync with the fin-* tokens — the
// one sanctioned place outside globals.css for a literal color (FR-SHELL-04).
export const viewport: Viewport = {
  themeColor: "#1f8a5b",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">
        <AppShell>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  );
}

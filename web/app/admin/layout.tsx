import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { AdminAuthGate } from "./AdminAuthGate";
import "../globals.css";
import "./admin.css";

// Same three faces as the marketing site's (id)/layout.tsx -- the brand's
// real typography, not a fourth pairing invented for this one tool.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-admin-display",
  weight: ["600", "700", "800"],
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-admin-body",
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-admin-mono",
  weight: ["500", "600"],
});

// This is a per-session, client-authenticated tool, not marketing content --
// it must never be statically prerendered (that would run the Supabase
// client's module-init at build time, before env vars or a real user exist).
export const dynamic = "force-dynamic";

// No locale, no SEO metadata, and kept out of search results
// (belt-and-suspenders alongside robots.ts).
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <AdminAuthGate>{children}</AdminAuthGate>
      </body>
    </html>
  );
}

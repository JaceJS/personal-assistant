import type { Metadata } from "next";

import { AdminAuthGate } from "./AdminAuthGate";
import "../globals.css";
import "./admin.css";

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
    <html lang="en">
      <body>
        <AdminAuthGate>{children}</AdminAuthGate>
      </body>
    </html>
  );
}

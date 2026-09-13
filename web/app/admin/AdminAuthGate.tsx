"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * Authentication wall for /admin: shows a Google sign-in button when signed
 * out, renders children when signed in. Whether the signed-in account is
 * actually an admin (ADMIN_ALLOWLIST) is the backend's call, not this gate's
 * -- a page under here that gets a 403 back from adminApi shows that itself.
 */
export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | "loading">("loading");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <main className="admin-shell">
        Admin panel isn&apos;t configured: NEXT_PUBLIC_SUPABASE_URL /
        NEXT_PUBLIC_SUPABASE_ANON_KEY are missing.
      </main>
    );
  }

  if (session === "loading") {
    return <main className="admin-shell">Loading…</main>;
  }

  if (session === null) {
    return (
      <main className="admin-shell admin-shell--centered">
        <button
          type="button"
          className="admin-button"
          onClick={() =>
            supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: window.location.href },
            })
          }
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  return (
    <>
      <header className="admin-header">
        <span>{session.user.email}</span>
        <button type="button" className="admin-link-button" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>
      {children}
    </>
  );
}

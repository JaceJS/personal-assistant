"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { checkAdminAccess } from "@/lib/adminApi";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Access = "checking" | "granted" | "denied";

// Forces Google to always show its account chooser, instead of silently
// re-using whatever Google account is already active in the browser --
// otherwise switching to a different account after a rejection means
// signing out of Google itself first.
function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.href,
      queryParams: { prompt: "select_account" },
    },
  });
}

/**
 * Authentication + authorization wall for /admin: shows a Google sign-in
 * screen when signed out, checks ADMIN_ALLOWLIST once here, then either
 * renders children (granted) or an access-denied screen (denied) --
 * children never mount, so they never attempt their own fetch for an
 * account that's already known not to be an admin.
 */
export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | "loading">("loading");
  const [access, setAccess] = useState<Access>("checking");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || session === "loading") return;
    let cancelled = false;
    setAccess("checking");
    checkAdminAccess()
      .then((isAdmin) => {
        if (!cancelled) setAccess(isAdmin ? "granted" : "denied");
      })
      .catch(() => {
        // A non-403 failure (network, 500, ...) isn't an authorization
        // verdict -- let the page underneath render and surface it there.
        if (!cancelled) setAccess("granted");
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!isSupabaseConfigured) {
    return (
      <main className="adm-config-notice">
        Admin panel isn&apos;t configured: NEXT_PUBLIC_SUPABASE_URL /
        NEXT_PUBLIC_SUPABASE_ANON_KEY are missing.
      </main>
    );
  }

  if (session === "loading") {
    return (
      <main className="adm-login" aria-busy="true">
        <div className="adm-card">
          <p className="adm-brand">Savyn Admin</p>
          <p>Menghubungkan…</p>
        </div>
      </main>
    );
  }

  if (session === null) {
    return (
      <main className="adm-login">
        <div className="adm-card">
          <p className="adm-brand">Savyn Admin</p>
          <h1>Masuk untuk melanjutkan</h1>
          <p>Lihat apa yang dibaca AI dari struk, catatan suara, dan chat.</p>
          <button type="button" className="adm-btn-primary" onClick={signInWithGoogle}>
            Masuk dengan Google
          </button>
        </div>
      </main>
    );
  }

  if (access === "checking") {
    return (
      <main className="adm-login" aria-busy="true">
        <div className="adm-card">
          <p className="adm-brand">Savyn Admin</p>
          <p>Memeriksa akun {session.user.email}…</p>
          <button
            type="button"
            className="adm-link-button"
            onClick={() => supabase.auth.signOut()}
          >
            Batal
          </button>
        </div>
      </main>
    );
  }

  if (access === "denied") {
    return (
      <main className="adm-login">
        <div className="adm-card adm-card--denied">
          <p className="adm-brand">Savyn Admin</p>
          <h1>Akses ditolak</h1>
          <p>{session.user.email} belum terdaftar sebagai admin.</p>
          <div className="adm-card-actions">
            <button type="button" className="adm-btn-primary" onClick={signInWithGoogle}>
              Coba akun lain
            </button>
            <button
              type="button"
              className="adm-link-button"
              onClick={() => supabase.auth.signOut()}
            >
              Keluar
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="adm-topbar">
        <div className="adm-topbar-left">Savyn Admin</div>
        <div className="adm-topbar-user">
          <span className="adm-status-dot" aria-hidden="true" />
          <span>{session.user.email}</span>
          <button
            type="button"
            className="adm-link-button"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </button>
        </div>
      </header>
      {children}
    </>
  );
}

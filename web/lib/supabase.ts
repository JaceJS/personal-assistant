/**
 * Browser Supabase client for the admin panel. Auth only (Google sign-in) --
 * every data read goes through the backend API (see lib/adminApi.ts), same
 * separation of concerns as mobile.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// createClient throws on an empty URL, which would crash the whole page
// (including SSR) before AdminAuthGate gets a chance to show a clear
// message -- fall back to a placeholder so construction always succeeds,
// and let isSupabaseConfigured gate whether it's actually usable.
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder-anon-key",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

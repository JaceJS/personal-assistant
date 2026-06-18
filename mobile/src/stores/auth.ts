import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { queryClient } from "@/lib/queryClient";

type AuthMode = "guest" | "authenticated";

interface AuthState {
  mode: AuthMode;
  isGuest: boolean;
  user: User | null;
  session: Session | null;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  markInitialized: () => void;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  mode: "authenticated",
  isGuest: false,
  user: null,
  session: null,
  initialized: false,
  setSession: (session) => {
    if (session?.user) logger.identifyUser(session.user.id);
    else logger.resetUser();
    set({ session, user: session?.user ?? null, mode: "authenticated", isGuest: false });
  },
  markInitialized: () => set({ initialized: true }),
  enterGuestMode: () => set({ session: null, user: null, mode: "guest", isGuest: true }),
  exitGuestMode: () => set({ mode: "authenticated", isGuest: false }),
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) logger.error("signOut failed", error);
    } catch (err) {
      logger.error("signOut threw", err);
    } finally {
      queryClient.clear();
      logger.resetUser();
      set({ session: null, user: null, mode: "guest", isGuest: true });
    }
  },
}));

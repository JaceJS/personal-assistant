import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { queryClient } from "@/lib/queryClient";

interface AuthState {
  user: User | null;
  session: Session | null;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  markInitialized: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,
  setSession: (session) => {
    if (session?.user) logger.identifyUser(session.user.id);
    else logger.resetUser();
    set({ session, user: session?.user ?? null });
  },
  markInitialized: () => set({ initialized: true }),
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) logger.error("signOut failed", error);
    } catch (err) {
      logger.error("signOut threw", err);
    } finally {
      queryClient.clear();
      logger.resetUser();
      set({ session: null, user: null });
    }
  },
}));

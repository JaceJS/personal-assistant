import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

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
    await supabase.auth.signOut();
    logger.resetUser();
    set({ session: null, user: null });
  },
}));

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { logger } from "@/lib/logger";
import { useSyncOnLogin } from "@/features/sync/useSyncOnLogin";

export function useAuth() {
  const { setSession, markInitialized, enterGuestMode } = useAuthStore();
  const syncOnLogin = useSyncOnLogin();

  useEffect(() => {
    const initSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) logger.error("getSession failed", error);
        if (session) setSession(session);
        else enterGuestMode();
      } catch (err) {
        logger.error("getSession threw", err);
        enterGuestMode();
      } finally {
        markInitialized();
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const wasGuest = useAuthStore.getState().isGuest;
      if (session) {
        setSession(session);
        if (event === "SIGNED_IN" && wasGuest) {
          void syncOnLogin();
        }
      } else {
        enterGuestMode();
      }
      markInitialized();
    });

    return () => subscription.unsubscribe();
  }, [setSession, markInitialized, enterGuestMode, syncOnLogin]);
}

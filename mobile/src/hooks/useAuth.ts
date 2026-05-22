import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { logger } from "@/lib/logger";

export function useAuth() {
  const { setSession, markInitialized } = useAuthStore();

  useEffect(() => {
    const initSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) logger.error("getSession failed", error);
        setSession(session);
      } catch (err) {
        logger.error("getSession threw", err);
      } finally {
        markInitialized();
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      markInitialized();
    });

    return () => subscription.unsubscribe();
  }, [setSession, markInitialized]);
}

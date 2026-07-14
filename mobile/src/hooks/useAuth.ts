import { useCallback, useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useSyncPromptStore } from "@/stores/syncPrompt";
import { logger } from "@/lib/logger";
import { LocalRepository } from "@/features/finance/repository";
import { getLocalDataSummary } from "@/features/sync/syncService";

const localRepo = new LocalRepository();

export function useAuth() {
  const setSession = useAuthStore((s) => s.setSession);
  const markInitialized = useAuthStore((s) => s.markInitialized);
  const enterGuestMode = useAuthStore((s) => s.enterGuestMode);
  const showSyncPrompt = useSyncPromptStore((s) => s.showPrompt);

  // Never syncs silently: this only surfaces the merge-confirmation prompt.
  // The actual import runs when the user confirms it (see GuestDataMergeSheet).
  const checkForLocalDataToMerge = useCallback(async () => {
    try {
      const summary = await getLocalDataSummary(localRepo);
      if (summary) showSyncPrompt(summary);
    } catch (err) {
      logger.error("Guest data summary check failed", err);
    }
  }, [showSyncPrompt]);

  useEffect(() => {
    const initSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) logger.error("getSession failed", error);
        if (session) {
          setSession(session);
          // Cold start with an authenticated session: re-check in case the
          // user previously dismissed the prompt ("Nanti Dulu") and local
          // guest data is still sitting unsynced.
          void checkForLocalDataToMerge();
        } else {
          enterGuestMode();
        }
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
          void checkForLocalDataToMerge();
        }
      } else {
        enterGuestMode();
      }
      markInitialized();
    });

    return () => subscription.unsubscribe();
  }, [setSession, markInitialized, enterGuestMode, checkForLocalDataToMerge]);
}

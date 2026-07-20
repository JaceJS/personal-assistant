import { useCallback, useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
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
      const previous = useAuthStore.getState();
      const wasGuest = previous.isGuest;
      const previousUserId = previous.session?.user.id;
      if (session) {
        // Finance queries (accounts, transactions, budget, ...) are keyed by
        // resource name only, not by user/repo — the repo they hit swaps
        // between local SQLite (guest) and the API (authenticated) based on
        // isGuest, but TanStack Query has no way to know that on its own. A
        // real identity change (guest -> account, or account A -> account B)
        // must wipe the cache, or the new identity's screens briefly (up to
        // staleTime) show the previous identity's cached data — this was the
        // "step 1 always looks done" bug in the setup checklist.
        if (wasGuest || previousUserId !== session.user.id) {
          queryClient.clear();
        }
        setSession(session);
        if (event === "SIGNED_IN" && wasGuest) {
          void checkForLocalDataToMerge();
        }
      } else {
        if (!wasGuest) queryClient.clear();
        enterGuestMode();
      }
      markInitialized();
    });

    return () => subscription.unsubscribe();
  }, [setSession, markInitialized, enterGuestMode, checkForLocalDataToMerge]);
}

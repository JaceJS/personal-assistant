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

  // Only surfaces the prompt; actual merge happens on user confirm (GuestDataMergeSheet).
  const checkForLocalDataToMerge = useCallback(async () => {
    try {
      const summary = await getLocalDataSummary(localRepo);
      if (summary) showSyncPrompt(summary);
    } catch (err) {
      logger.error("Guest data summary check failed", err);
    }
  }, [showSyncPrompt]);

  useEffect(() => {
    // Single source of truth: fires once on subscribe with the existing
    // session (cold start), then again on every real change.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const previous = useAuthStore.getState();
      const wasGuest = previous.isGuest;
      const previousUserId = previous.session?.user.id;
      // Cold start has no prior identity to compare against — never treat it as a change.
      const isColdStart = !previous.initialized;
      const isIdentityChange =
        !isColdStart && (session ? wasGuest || previousUserId !== session.user.id : !wasGuest);

      if (session) {
        // Identity actually changed: finance queries swap local/API repo by
        // isGuest but TanStack Query doesn't know, so stale cache must be wiped.
        // Chat session id is left alone — the backend already scopes it by
        // owner (self-heals a stale/foreign one on the next send).
        if (isIdentityChange) queryClient.clear();
        setSession(session);
        if (isColdStart || (event === "SIGNED_IN" && wasGuest)) {
          void checkForLocalDataToMerge();
        }
      } else {
        if (isIdentityChange) queryClient.clear();
        enterGuestMode();
      }
      markInitialized();
    });

    return () => subscription.unsubscribe();
  }, [setSession, markInitialized, enterGuestMode, checkForLocalDataToMerge]);
}

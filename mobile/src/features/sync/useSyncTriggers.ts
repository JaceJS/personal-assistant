import { useEffect } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useAuthStore } from "@/stores/auth";
import { isSyncedRepositoryUser } from "@/features/finance/repository";
import { logger } from "@/lib/logger";
import { runOutbox } from "./runOutbox";
import { pullDeltas } from "./pullDeltas";

async function runSync(userId: string): Promise<void> {
  try {
    await runOutbox();
    await pullDeltas(userId);
  } catch (err) {
    logger.warn("sync trigger failed", { err });
  }
}

// Keeps the local mirror in sync for local-first authenticated users: pushes
// whatever is still pending (offline writes) and pulls server-side changes
// (including rows the backend created itself, e.g. voice/receipt processing)
// on mount, on reconnect, and whenever the app returns to the foreground.
export function useSyncTriggers(): void {
  const isGuest = useAuthStore((s) => s.isGuest);
  const userId = useAuthStore((s) => s.user?.id);
  const userEmail = useAuthStore((s) => s.user?.email);
  const enabled = !isGuest && !!userId && isSyncedRepositoryUser(userEmail);

  useEffect(() => {
    if (!enabled || !userId) return;

    void runSync(userId);

    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) void runSync(userId);
    });
    const appStateSubscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void runSync(userId);
    });

    return () => {
      netInfoUnsubscribe();
      appStateSubscription.remove();
    };
  }, [enabled, userId]);
}

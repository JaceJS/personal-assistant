import { useCallback } from "react";
import { LocalRepository } from "@/features/finance/repository";
import { logger } from "@/lib/logger";
import { queryClient } from "@/lib/queryClient";
import { syncLocalData } from "./syncService";
import { importLocalData } from "./api";

const localRepo = new LocalRepository();

/** Returns a function that performs the actual guest -> account data import.
 * Never throws: callers (e.g. the merge-confirmation sheet) get a boolean
 * back so they can drive their own retry UI instead of catching exceptions. */
export function useSyncOnLogin() {
  return useCallback(async (): Promise<boolean> => {
    try {
      const result = await syncLocalData(localRepo, importLocalData);
      if (!result.skipped) {
        logger.info("Guest data synced to server", result.imported as unknown as Record<string, unknown>);
      }
      // Cached queries may hold guest-local reads; the repository just
      // switched from local SQLite to the remote API, so refetch everything.
      await queryClient.invalidateQueries();
      return true;
    } catch (err) {
      logger.error("Sync on login failed: local data retained", err);
      return false;
    }
  }, []);
}

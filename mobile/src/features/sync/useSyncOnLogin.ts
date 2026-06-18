import { useCallback } from "react";
import { LocalRepository } from "@/features/finance/repository";
import { logger } from "@/lib/logger";
import { syncLocalData } from "./syncService";
import { importLocalData } from "./api";

const localRepo = new LocalRepository();

export function useSyncOnLogin() {
  return useCallback(async () => {
    try {
      const result = await syncLocalData(localRepo, importLocalData);
      if (!result.skipped) {
        logger.info("Guest data synced to server", result.imported as unknown as Record<string, unknown>);
      }
    } catch (err) {
      logger.error("Sync on login failed — local data retained", err);
    }
  }, []);
}

import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth";
import { LocalRepository } from "./local-repository";
import { RemoteRepository } from "./remote-repository";
import { SyncedRepository } from "./synced-repository";
import type { FinanceRepository } from "./types";

// Phase 5 staged rollout for the local-first authenticated path: only these
// accounts get SyncedRepository. Flip to "every authenticated user" once
// verified, then delete this and RemoteRepository as a screen-facing type.
const SYNCED_REPOSITORY_ALLOWLIST = ["jonathansalendah.work@gmail.com"];

export function isSyncedRepositoryUser(email: string | null | undefined): boolean {
  return !!email && SYNCED_REPOSITORY_ALLOWLIST.includes(email);
}

const localRepo = new LocalRepository();
const remoteRepo = new RemoteRepository();

export function useFinanceRepository(): FinanceRepository {
  const isGuest = useAuthStore((s) => s.isGuest);
  const userId = useAuthStore((s) => s.user?.id);
  const userEmail = useAuthStore((s) => s.user?.email);

  return useMemo(() => {
    if (isGuest) return localRepo;
    if (userId && isSyncedRepositoryUser(userEmail)) {
      return new SyncedRepository(userId);
    }
    return remoteRepo;
  }, [isGuest, userId, userEmail]);
}

export { LocalRepository } from "./local-repository";
export { RemoteRepository } from "./remote-repository";
export { SyncedRepository } from "./synced-repository";
export type { FinanceRepository } from "./types";

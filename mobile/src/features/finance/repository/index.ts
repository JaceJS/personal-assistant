import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth";
import { LocalRepository } from "./local-repository";
import { RemoteRepository } from "./remote-repository";
import type { FinanceRepository } from "./types";

const localRepo = new LocalRepository();
const remoteRepo = new RemoteRepository();

export function useFinanceRepository(): FinanceRepository {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useMemo(() => (isGuest ? localRepo : remoteRepo), [isGuest]);
}

export { LocalRepository } from "./local-repository";
export { RemoteRepository } from "./remote-repository";
export type { FinanceRepository } from "./types";

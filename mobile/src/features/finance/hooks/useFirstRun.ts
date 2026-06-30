import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth";
import { useOnboardingStore } from "@/stores/onboarding";
import { useAccounts } from "./useAccounts";
import { useTransactions } from "./useTransactions";
import { useBudget } from "./useBudget";

export interface FirstRunState {
  isFirstRun: boolean;
  isLoading: boolean;
  hasAccount: boolean;
  hasFirstTransaction: boolean;
  hasBudget: boolean;
  setupStep: 1 | 2 | 3;
}

export function useFirstRun(): FirstRunState {
  const initialized = useAuthStore((s) => s.initialized);
  const isGuest = useAuthStore((s) => s.isGuest);
  const dismissedFirstRun = useOnboardingStore((s) => s.dismissedFirstRun);

  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: txData, isLoading: txLoading } = useTransactions({ limit: 1 });
  const { data: budget, isLoading: budgetLoading } = useBudget();

  return useMemo(() => {
    const accounts = (accountsData ?? []).filter((a) => !a.is_archived);
    const hasAccount = accounts.length > 0;
    const hasFirstTransaction = (txData?.items ?? []).length > 0;
    const hasBudget = budget != null;
    const isLoading = accountsLoading || txLoading || budgetLoading;

    const setupStep: 1 | 2 | 3 = hasFirstTransaction ? 3 : hasAccount ? 2 : 1;

    const isFirstRun =
      !isGuest &&
      !dismissedFirstRun &&
      initialized &&
      !isLoading &&
      !hasAccount &&
      !hasFirstTransaction;

    return { isFirstRun, isLoading, hasAccount, hasFirstTransaction, hasBudget, setupStep };
  }, [accountsData, txData, budget, accountsLoading, txLoading, budgetLoading, isGuest, dismissedFirstRun, initialized]);
}

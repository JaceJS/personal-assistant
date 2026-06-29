import { useMemo } from "react";
import { useTransactions } from "./useTransactions";
import { computeWeeklySummary, getWeekRange } from "@/features/finance/utils/weeklySummary";

export function useWeeklySummary() {
  const weekRange = useMemo(() => getWeekRange(), []);
  const { data, isLoading } = useTransactions({ ...weekRange, limit: 500 });
  const summary = useMemo(
    () => computeWeeklySummary(data?.items ?? []),
    [data]
  );
  return { ...summary, isLoading, dateFrom: weekRange.dateFrom, dateTo: weekRange.dateTo };
}

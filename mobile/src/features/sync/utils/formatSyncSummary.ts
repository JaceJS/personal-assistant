import type { TFunction } from "i18next";
import type { LocalDataSummary } from "../syncService";

/** Human-readable list of what will be merged, e.g. "2 akun, 10 transaksi". */
export function formatSyncSummary(t: TFunction, summary: LocalDataSummary): string {
  const items: string[] = [];
  if (summary.accounts > 0) items.push(t("guest.sync.itemAccounts", { count: summary.accounts }));
  if (summary.transactions > 0) {
    items.push(t("guest.sync.itemTransactions", { count: summary.transactions }));
  }
  if (summary.hasBudget) items.push(t("guest.sync.itemBudget"));
  if (summary.savingsGoals > 0) {
    items.push(t("guest.sync.itemSavingsGoals", { count: summary.savingsGoals }));
  }
  return items.join(", ");
}

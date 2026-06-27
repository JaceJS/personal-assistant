import { apiFetch } from "@/lib/api/client";
import type { ApiResponse } from "@/features/finance/types";
import type { Account, Category, Transaction, Budget, SavingsGoal } from "@/features/finance/types";
import type { ImportCounts } from "./syncService";

interface BulkImportResult {
  imported: ImportCounts;
}

interface BulkImportPayload {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  savings_goals: SavingsGoal[];
}

export function importLocalData(payload: BulkImportPayload): Promise<ImportCounts> {
  return apiFetch<ApiResponse<BulkImportResult>>("/api/v1/sync/import", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((r) => r.data.imported);
}

const WARNING_THRESHOLD = 0.8;

export type AlertLevel = "warning" | "critical";

export interface BudgetAlertResult {
  level: AlertLevel;
  remaining: number;
}

export function computeBudgetAlert(
  limit: number,
  currentSpend: number,
  newAmount: number
): BudgetAlertResult | null {
  if (limit <= 0 || newAmount <= 0) return null;

  const newTotal = currentSpend + newAmount;
  const ratio = newTotal / limit;
  const remaining = Math.max(limit - newTotal, 0);

  if (ratio >= 1) return { level: "critical", remaining };
  if (ratio >= WARNING_THRESHOLD) return { level: "warning", remaining };
  return null;
}

export function computeProgressPct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
}

export function isCompleted(current: number, target: number): boolean {
  return current >= target;
}

export function daysRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const [year, month, day] = targetDate.split('-').map(Number);
  const target = Date.UTC(year, month - 1, day);
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - todayUTC) / (1000 * 60 * 60 * 24));
}

export function requiredMonthlyContribution(
  current: number,
  target: number,
  targetDate: string | null,
): number | null {
  if (!targetDate) return null;
  if (current >= target) return null;
  const days = daysRemaining(targetDate);
  if (days === null || days <= 0) return null;
  const months = days / 30.44;
  return Math.ceil((target - current) / months);
}

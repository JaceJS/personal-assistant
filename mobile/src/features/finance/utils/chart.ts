import type { Transaction } from '@/features/finance/types';

export interface ChartPoint extends Record<string, unknown> {
  x: number;
  label: string;
  y: number;
}

export function buildDailyBuckets(items: Transaction[], now: Date): ChartPoint[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return {
      x: day,
      label: String(day),
      y: items
        .filter((tx) => {
          if (tx.amount >= 0) return false;
          const d = new Date(tx.occurred_at);
          return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        })
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
    };
  });
}

export function buildWeeklyBuckets(items: Transaction[], now: Date): ChartPoint[] {
  return [0, 1, 2, 3].map((week) => ({
    x: week + 1,
    label: `W${week + 1}`,
    y: items
      .filter((tx) => {
        if (tx.amount >= 0) return false;
        const day = new Date(tx.occurred_at).getDate();
        return Math.min(Math.floor((day - 1) / 7), 3) === week;
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
  }));
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildMonthlyBuckets(items: Transaction[], year: number): ChartPoint[] {
  return MONTH_LABELS.map((label, i) => ({
    x: i + 1,
    label,
    y: items
      .filter((tx) => {
        if (tx.amount >= 0) return false;
        const d = new Date(tx.occurred_at);
        return d.getFullYear() === year && d.getMonth() === i;
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
  }));
}

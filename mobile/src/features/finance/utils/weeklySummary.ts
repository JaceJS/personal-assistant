import type { Transaction } from "@/features/finance/types";

export interface WeeklySummary {
  income: number;
  expense: number;
  net: number;
}

export interface WeekRange {
  dateFrom: string;
  dateTo: string;
}

export function computeWeeklySummary(transactions: Transaction[]): WeeklySummary {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.amount > 0) income += t.amount;
    else expense += Math.abs(t.amount);
  }
  return { income, expense, net: income - expense };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getWeekRange(now: Date = new Date()): WeekRange {
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMonday = (day + 6) % 7; // Sun→6, Mon→0, Tue→1 ...
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { dateFrom: toDateString(monday), dateTo: toDateString(sunday) };
}

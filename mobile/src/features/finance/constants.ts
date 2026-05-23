import type { AccountType } from "./types";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Tunai",
  bank: "Bank",
  ewallet: "E-Wallet",
  credit: "Kartu Kredit",
};

export const ACCOUNT_TYPE_EMOJI: Record<AccountType, string> = {
  cash: "💵",
  bank: "🏦",
  ewallet: "📱",
  credit: "💳",
};

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Tunai" },
  { value: "bank", label: "Bank" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "credit", label: "Kartu Kredit" },
];

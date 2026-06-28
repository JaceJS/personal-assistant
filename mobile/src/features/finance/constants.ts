import type { AccountType } from "./types";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Tunai",
  bank: "Bank",
  ewallet: "E-Wallet",
  credit: "Kartu Kredit",
};

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Tunai" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "credit", label: "Kartu Kredit" },
];

export const PRESET_COLORS = [
  "#E17055", // Red-orange
  "#00CEC9", // Teal
  "#6C5CE7", // Purple
  "#00B894", // Green
  "#FDCB6E", // Yellow
  "#A29BFE", // Light purple
  "#FD79A8", // Pink
  "#F0932B", // Orange
];

export const PRESET_ICONS = [
  "🍔", "🍕", "🍜", "🍰", "☕", "🥤", "🍻", "🍎", "🍳",
  "🚗", "🛵", "🚲", "✈️", "🚇", "🚢", "🏨", "🏠", "⚡",
  "💧", "📶", "📺", "🧹", "🛍️", "🛒", "👕", "👠", "💄",
  "💇", "💊", "🏥", "🏋️", "🏃", "🩺", "🎮", "🎬", "🎤",
  "🎪", "🎨", "📖", "💰", "💳", "💼", "📈", "🏢", "💵",
  "🎁", "💖", "👶", "🐱", "🏷️"
];

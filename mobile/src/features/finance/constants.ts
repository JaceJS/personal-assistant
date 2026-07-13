import type { TFunction } from "i18next";

import type { AccountType } from "./types";

export const ACCOUNT_TYPE_ORDER: AccountType[] = ["bank", "cash", "ewallet", "credit"];

export function accountTypeLabel(t: TFunction, type: AccountType): string {
  switch (type) {
    case "bank":
      return t("accounts.type.bank");
    case "cash":
      return t("accounts.type.cash");
    case "ewallet":
      return t("accounts.type.ewallet");
    case "credit":
      return t("accounts.type.credit");
  }
}

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

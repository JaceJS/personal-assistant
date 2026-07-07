import type { CategoryCreate } from "../types";

export interface DefaultCategory extends CategoryCreate {
  id: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // ── Expense (27) ──────────────────────────────────────────────────────────
  { id: "default-cat-makan",       name: "Makan & Jajan",         type: "expense", icon: "🍔", color: "#E17055" },
  { id: "default-cat-groceries",   name: "Groceries",             type: "expense", icon: "🛒", color: "#FDCB6E" },
  { id: "default-cat-transport",   name: "Ojek & Transport",      type: "expense", icon: "🛵", color: "#00CEC9" },
  { id: "default-cat-bensin",      name: "Bensin & Service",      type: "expense", icon: "⛽", color: "#E67E22" },
  { id: "default-cat-shopping",    name: "Shopping",              type: "expense", icon: "🛍️", color: "#6C5CE7" },
  { id: "default-cat-gadget",      name: "Gadget & Elektronik",   type: "expense", icon: "📱", color: "#0984E3" },
  { id: "default-cat-health",      name: "Kesehatan",             type: "expense", icon: "💊", color: "#00B894" },
  { id: "default-cat-skincare",    name: "Skincare & Self Care",  type: "expense", icon: "🧴", color: "#81ECEC" },
  { id: "default-cat-beauty",      name: "Beauty & Wellness",     type: "expense", icon: "💆", color: "#FAB1A0" },
  { id: "default-cat-gym",         name: "Gym & Olahraga",        type: "expense", icon: "🏃", color: "#55EFC4" },
  { id: "default-cat-entertainment", name: "Hiburan",             type: "expense", icon: "🎬", color: "#FFEAA7" },
  { id: "default-cat-selfreward",  name: "Self Reward",           type: "expense", icon: "🎉", color: "#E84393" },
  { id: "default-cat-utilities",   name: "Tagihan",               type: "expense", icon: "⚡", color: "#A29BFE" },
  { id: "default-cat-pulsa",       name: "Pulsa & Internet",      type: "expense", icon: "📶", color: "#45AAF2" },
  { id: "default-cat-rent",        name: "Kos & Rumah",           type: "expense", icon: "🏠", color: "#FD79A8" },
  { id: "default-cat-household",   name: "Perlengkapan Rumah",    type: "expense", icon: "🧹", color: "#95AFC0" },
  { id: "default-cat-education",   name: "Pendidikan",            type: "expense", icon: "📚", color: "#74B9FF" },
  { id: "default-cat-family",      name: "Keluarga & Anak",       type: "expense", icon: "🧸", color: "#F8A5C2" },
  { id: "default-cat-pet",         name: "Pet Care",              type: "expense", icon: "🐾", color: "#C7ECEE" },
  { id: "default-cat-travel",      name: "Liburan & Travel",      type: "expense", icon: "✈️", color: "#FF7675" },
  { id: "default-cat-subscription", name: "Subscription",         type: "expense", icon: "📲", color: "#636E72" },
  { id: "default-cat-insurance",   name: "Asuransi",              type: "expense", icon: "🛡️", color: "#22A6B3" },
  { id: "default-cat-debt",        name: "Cicilan & Utang",       type: "expense", icon: "💳", color: "#EB2F06" },
  { id: "default-cat-tax",         name: "Pajak",                 type: "expense", icon: "🧾", color: "#576574" },
  { id: "default-cat-gift",        name: "Hadiah & Donasi",       type: "expense", icon: "🎗️", color: "#F368E0" },
  { id: "default-cat-zakat",       name: "Zakat & Charity",       type: "expense", icon: "🕌", color: "#10AC84" },
  { id: "default-cat-savings",     name: "Nabung & Savings",      type: "expense", icon: "🐷", color: "#786FA6" },
  // ── Income (8) ────────────────────────────────────────────────────────────
  { id: "default-cat-salary",      name: "Gaji",                  type: "income",  icon: "💼", color: "#F6B93B" },
  { id: "default-cat-freelance",   name: "Freelance",             type: "income",  icon: "💻", color: "#4834D4" },
  { id: "default-cat-investment",  name: "Investasi",             type: "income",  icon: "📈", color: "#F9CA24" },
  { id: "default-cat-business",    name: "Bisnis",                type: "income",  icon: "🏪", color: "#F0932B" },
  { id: "default-cat-bonus",       name: "Bonus & THR",           type: "income",  icon: "🎁", color: "#EB4D4B" },
  { id: "default-cat-rentalincome", name: "Rental Income",        type: "income",  icon: "🏘️", color: "#6AB04C" },
  { id: "default-cat-refund",      name: "Refund & Reimburse",    type: "income",  icon: "💵", color: "#2E86DE" },
  { id: "default-cat-otherincome", name: "Other Income",          type: "income",  icon: "💰", color: "#8E44AD" },
];

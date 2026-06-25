import type { CategoryCreate } from "../types";

export interface DefaultCategory extends CategoryCreate {
  id: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { id: "default-cat-food",          name: "Makan & Minum",       type: "expense", icon: "🍜", color: "#FF6B6B" },
  { id: "default-cat-rent",          name: "Kos & Rumah",         type: "expense", icon: "🏠", color: "#F7DC6F" },
  { id: "default-cat-utilities",     name: "Tagihan",             type: "expense", icon: "💡", color: "#98D8C8" },
  { id: "default-cat-transport",     name: "Ojek & Transportasi", type: "expense", icon: "🛵", color: "#4ECDC4" },
  { id: "default-cat-pulsa",         name: "Pulsa & Internet",    type: "expense", icon: "📱", color: "#74B9FF" },
  { id: "default-cat-shopping",      name: "Belanja",             type: "expense", icon: "🛍️", color: "#45B7D1" },
  { id: "default-cat-entertainment", name: "Hiburan",             type: "expense", icon: "🎬", color: "#96CEB4" },
  { id: "default-cat-health",        name: "Kesehatan",           type: "expense", icon: "💊", color: "#FFEAA7" },
  { id: "default-cat-education",     name: "Pendidikan",          type: "expense", icon: "📚", color: "#DDA0DD" },
  { id: "default-cat-salary",        name: "Gaji",                type: "income",  icon: "💼", color: "#82E0AA" },
  { id: "default-cat-freelance",     name: "Freelance",           type: "income",  icon: "💻", color: "#85C1E9" },
  { id: "default-cat-investment",    name: "Investasi",           type: "income",  icon: "📈", color: "#F0B27A" },
  { id: "default-cat-savings",       name: "Tabungan",            type: "expense", icon: "🐷", color: "#A29BFE" },
];

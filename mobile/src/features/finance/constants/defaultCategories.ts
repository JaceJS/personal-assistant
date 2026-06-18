import type { CategoryCreate } from "../types";

export interface DefaultCategory extends CategoryCreate {
  id: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { id: "default-cat-food", name: "Food & Drinks", type: "expense", icon: "🍽️", color: "#FF6B6B" },
  { id: "default-cat-transport", name: "Transport", type: "expense", icon: "🚗", color: "#4ECDC4" },
  { id: "default-cat-shopping", name: "Shopping", type: "expense", icon: "🛍️", color: "#45B7D1" },
  { id: "default-cat-entertainment", name: "Entertainment", type: "expense", icon: "🎬", color: "#96CEB4" },
  { id: "default-cat-health", name: "Health", type: "expense", icon: "💊", color: "#FFEAA7" },
  { id: "default-cat-education", name: "Education", type: "expense", icon: "📚", color: "#DDA0DD" },
  { id: "default-cat-utilities", name: "Utilities", type: "expense", icon: "💡", color: "#98D8C8" },
  { id: "default-cat-rent", name: "Rent & Housing", type: "expense", icon: "🏠", color: "#F7DC6F" },
  { id: "default-cat-salary", name: "Salary", type: "income", icon: "💼", color: "#82E0AA" },
  { id: "default-cat-freelance", name: "Freelance", type: "income", icon: "💻", color: "#85C1E9" },
  { id: "default-cat-investment", name: "Investment", type: "income", icon: "📈", color: "#F0B27A" },
  { id: "default-cat-transfer", name: "Transfer", type: "expense", icon: "↔️", color: "#AEB6BF" },
];

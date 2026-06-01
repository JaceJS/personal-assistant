import {
  Banknote,
  Car,
  Film,
  Home,
  Monitor,
  ShoppingBag,
  ShoppingCart,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

export function categoryIcon(name?: string | null): LucideIcon {
  const n = name?.toLowerCase() ?? '';
  if (n.includes('food') || n.includes('dining') || n.includes('restaurant') || n.includes('groceries')) return Utensils;
  if (n.includes('transport') || n.includes('travel') || n.includes('car')) return Car;
  if (n.includes('rent') || n.includes('house') || n.includes('home') || n.includes('living')) return Home;
  if (n.includes('utilities') || n.includes('electric') || n.includes('water')) return Zap;
  if (n.includes('entertainment') || n.includes('film') || n.includes('movie')) return Film;
  if (n.includes('shopping')) return ShoppingBag;
  if (n.includes('tech') || n.includes('electronic')) return Monitor;
  if (n.includes('income') || n.includes('salary')) return Banknote;
  if (n.includes('grocery') || n.includes('supermarket')) return ShoppingCart;
  return Wallet;
}

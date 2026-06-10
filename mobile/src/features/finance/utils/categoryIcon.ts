import {
  Activity,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Car,
  CreditCard,
  Film,
  Gift,
  Heart,
  Home,
  Plane,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

export function categoryIcon(name?: string | null): LucideIcon {
  const n = name?.toLowerCase() ?? '';

  // Food
  if (n.includes('food') || n.includes('dining') || n.includes('restaurant') || n.includes('cafe')) return Utensils;
  // Groceries
  if (n.includes('groceries') || n.includes('grocery') || n.includes('supermarket') || n.includes('market')) return ShoppingCart;
  // Transport
  if (n.includes('transport') || n.includes('car') || n.includes('taxi') || n.includes('commute') || n.includes('ride')) return Car;
  // Travel / Flight
  if (n.includes('travel') || n.includes('flight') || n.includes('hotel') || n.includes('trip') || n.includes('vacation')) return Plane;
  // Rent / Housing
  if (n.includes('rent') || n.includes('house') || n.includes('home') || n.includes('housing') || n.includes('kos')) return Home;
  // Bills / Utilities
  if (n.includes('utilities') || n.includes('electric') || n.includes('water') || n.includes('bills') || n.includes('gas')) return Zap;
  // Health / Medical
  if (n.includes('health') || n.includes('medical') || n.includes('doctor') || n.includes('pharmacy') || n.includes('hospital')) return Heart;
  // Fitness / Sports
  if (n.includes('fitness') || n.includes('sport') || n.includes('gym') || n.includes('exercise')) return Activity;
  // Entertainment
  if (n.includes('entertainment') || n.includes('film') || n.includes('movie') || n.includes('game') || n.includes('fun')) return Film;
  // Shopping / Fashion
  if (n.includes('shopping') || n.includes('fashion') || n.includes('clothes') || n.includes('apparel')) return ShoppingBag;
  // Education
  if (n.includes('education') || n.includes('school') || n.includes('course') || n.includes('book') || n.includes('study')) return BookOpen;
  // Beauty / Wellness
  if (n.includes('beauty') || n.includes('wellness') || n.includes('salon') || n.includes('spa') || n.includes('personal care')) return Sparkles;
  // Subscriptions / Tech
  if (n.includes('subscription') || n.includes('app') || n.includes('software') || n.includes('streaming')) return Smartphone;
  // Salary / Income
  if (n.includes('salary') || n.includes('wage') || n.includes('gaji')) return Banknote;
  // Freelance / Work
  if (n.includes('freelance') || n.includes('work') || n.includes('project') || n.includes('konsultan')) return Briefcase;
  // Investment / Returns
  if (n.includes('investment') || n.includes('invest') || n.includes('return') || n.includes('dividen') || n.includes('saham')) return TrendingUp;
  // Business
  if (n.includes('business') || n.includes('usaha') || n.includes('toko') || n.includes('shop')) return Building2;
  // Gift / Bonus
  if (n.includes('gift') || n.includes('bonus') || n.includes('hadiah') || n.includes('reward')) return Gift;
  // Savings / Transfer
  if (n.includes('savings') || n.includes('tabungan') || n.includes('deposito')) return CreditCard;

  return Wallet;
}

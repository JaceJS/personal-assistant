import type { User } from '@supabase/supabase-js';

export function getDisplayName(user: User | null): string {
  if (!user) return 'there';
  const fullName: string | undefined = user.user_metadata?.full_name;
  if (fullName) return fullName.split(' ')[0];
  return user.email?.split('@')[0] ?? 'there';
}

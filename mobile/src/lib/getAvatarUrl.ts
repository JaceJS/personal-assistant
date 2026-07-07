import type { User } from '@supabase/supabase-js';

export function getAvatarUrl(user: User | null): string | null {
  return user?.user_metadata?.avatar_url ?? null;
}

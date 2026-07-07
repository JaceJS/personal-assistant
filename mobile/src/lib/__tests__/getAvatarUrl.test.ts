import type { User } from '@supabase/supabase-js';
import { getAvatarUrl } from '@/lib/getAvatarUrl';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'test-id',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
    ...overrides,
  }) as User;

describe('getAvatarUrl', () => {
  it('returns avatar_url from user_metadata', () => {
    const user = makeUser({ user_metadata: { avatar_url: 'https://cdn.example.com/a.jpg' } });
    expect(getAvatarUrl(user)).toBe('https://cdn.example.com/a.jpg');
  });

  it('returns null when no avatar_url set', () => {
    const user = makeUser({ user_metadata: {} });
    expect(getAvatarUrl(user)).toBeNull();
  });

  it('returns null when user is null', () => {
    expect(getAvatarUrl(null)).toBeNull();
  });
});

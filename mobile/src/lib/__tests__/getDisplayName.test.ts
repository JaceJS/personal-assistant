import type { User } from '@supabase/supabase-js';
import { getDisplayName } from '@/lib/getDisplayName';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'test-id',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
    ...overrides,
  }) as User;

describe('getDisplayName', () => {
  it('returns first word of full_name', () => {
    const user = makeUser({ user_metadata: { full_name: 'Jace Smith' } });
    expect(getDisplayName(user)).toBe('Jace');
  });

  it('returns single full_name as-is', () => {
    const user = makeUser({ user_metadata: { full_name: 'Jace' } });
    expect(getDisplayName(user)).toBe('Jace');
  });

  it('falls back to email prefix when no full_name', () => {
    const user = makeUser({ email: 'johndoe123@gmail.com' });
    expect(getDisplayName(user)).toBe('johndoe123');
  });

  it('returns "there" when user is null', () => {
    expect(getDisplayName(null)).toBe('there');
  });

  it('returns "there" when no email and no full_name', () => {
    const user = makeUser({ email: undefined, user_metadata: {} });
    expect(getDisplayName(user)).toBe('there');
  });
});

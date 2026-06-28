import { signInWithGoogle } from '../signInWithGoogle';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';

// Mock dependencies
jest.mock('@react-native-google-signin/google-signin', () => {
  return {
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: jest.fn(),
      signIn: jest.fn(),
    },
  };
});

jest.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        signInWithIdToken: jest.fn(),
      },
    },
  };
});

describe('signInWithGoogle - Native Login Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully log in and return "success"', async () => {
    // Setup mocks
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      data: { idToken: 'valid-id-token-123' },
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { session: {} },
      error: null,
    });

    const result = await signInWithGoogle();

    expect(GoogleSignin.hasPlayServices).toHaveBeenCalled();
    expect(GoogleSignin.signIn).toHaveBeenCalled();
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'valid-id-token-123',
    });
    expect(result).toBe('success');
  });

  it('should return "cancelled" when the user cancels the login', async () => {
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    const cancelError = new Error('User cancelled the sign in flow');
    (cancelError as any).code = 'SIGN_IN_CANCELLED';
    (GoogleSignin.signIn as jest.Mock).mockRejectedValue(cancelError);

    const result = await signInWithGoogle();

    expect(GoogleSignin.hasPlayServices).toHaveBeenCalled();
    expect(GoogleSignin.signIn).toHaveBeenCalled();
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
    expect(result).toBe('cancelled');
  });

  it('should return "error" when play services are unavailable', async () => {
    (GoogleSignin.hasPlayServices as jest.Mock).mockRejectedValue(new Error('No Play Services'));

    const result = await signInWithGoogle();

    expect(GoogleSignin.hasPlayServices).toHaveBeenCalled();
    expect(GoogleSignin.signIn).not.toHaveBeenCalled();
    expect(result).toBe('error');
  });

  it('should return "error" when Google sign-in fails without specific cancel code', async () => {
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (GoogleSignin.signIn as jest.Mock).mockRejectedValue(new Error('Network Error'));

    const result = await signInWithGoogle();

    expect(result).toBe('error');
  });

  it('should return "error" when Supabase fails to sign in with the token', async () => {
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      data: { idToken: 'valid-token' },
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: null,
      error: new Error('Invalid token ID'),
    });

    const result = await signInWithGoogle();

    expect(result).toBe('error');
  });
});

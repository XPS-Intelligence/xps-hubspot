import { getAnonClient } from '../db/client';
import { createLogger } from '../logger';

const log = createLogger('auth');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

/**
 * Initiates the Google OAuth sign-in flow.
 * Returns the URL the client should redirect to.
 */
export async function signInWithGoogle(redirectTo?: string): Promise<string> {
  const client = getAnonClient();

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo ?? process.env.AUTH_CALLBACK_URL,
      scopes: 'openid email profile',
    },
  });

  if (error) {
    log.error('Google OAuth sign-in failed', { error: error.message });
    throw new Error(`Auth error: ${error.message}`);
  }

  log.info('Google OAuth redirect URL generated');
  return data.url;
}

/**
 * Exchanges an OAuth code for a session. Called from the callback route.
 */
export async function exchangeCodeForSession(code: string): Promise<AuthUser> {
  const client = getAnonClient();

  const { data, error } = await client.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    log.error('Code exchange failed', { error: error?.message });
    throw new Error(`Auth code exchange failed: ${error?.message ?? 'No session returned'}`);
  }

  log.info('Session established', { userId: data.user.id });
  return {
    id: data.user.id,
    email: data.user.email ?? '',
    role: data.user.role ?? 'authenticated',
  };
}

/**
 * Validates a JWT access token and returns the associated user.
 */
export async function verifyToken(accessToken: string): Promise<AuthUser> {
  const client = getAnonClient();

  const { data, error } = await client.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error(`Token verification failed: ${error?.message ?? 'No user found'}`);
  }

  return {
    id: data.user.id,
    email: data.user.email ?? '',
    role: data.user.role ?? 'authenticated',
  };
}

/**
 * Signs the current user out, revoking the session.
 */
export async function signOut(): Promise<void> {
  const client = getAnonClient();
  const { error } = await client.auth.signOut();
  if (error) log.warn('Sign-out error (non-fatal)', { error: error.message });
}

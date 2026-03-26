import { Router, Request, Response } from 'express';
import { signInWithGoogle, exchangeCodeForSession } from '../auth';
import { createLogger } from '../logger';

const log = createLogger('api:auth');
export const authRouter = Router();

// ─── Google OAuth Initiation ──────────────────────────────────────────────────

authRouter.get('/login/google', async (_req: Request, res: Response) => {
  try {
    const url = await signInWithGoogle();
    res.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auth initiation failed';
    log.error('Google auth init failed', { error: msg });
    res.status(500).json({ success: false, error: msg, timestamp: new Date().toISOString() });
  }
});

// ─── OAuth Callback ───────────────────────────────────────────────────────────

authRouter.get('/callback', async (req: Request, res: Response) => {
  const code = req.query['code'] as string | undefined;

  if (!code) {
    res.status(400).json({
      success: false,
      error: 'Missing OAuth code',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const user = await exchangeCodeForSession(code);
    log.info('Auth callback success', { userId: user.id });

    res.json({
      success: true,
      data: { user },
      message: 'Authentication successful',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auth callback failed';
    log.error('Auth callback failed', { error: msg });
    res.status(401).json({ success: false, error: msg, timestamp: new Date().toISOString() });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out. Clear token on client.',
    timestamp: new Date().toISOString(),
  });
});

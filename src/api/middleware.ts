import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth';
import { createLogger } from '../logger';

const log = createLogger('middleware');

// ─── Auth Middleware ──────────────────────────────────────────────────────────

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Missing or invalid Authorization header',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const user = await verifyToken(token);
    (req as Request & { user: typeof user }).user = user;
    next();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    log.warn('Auth failed', { error: msg });
    res.status(401).json({
      success: false,
      error: msg,
      timestamp: new Date().toISOString(),
    });
  }
}

// ─── Error Handler ────────────────────────────────────────────────────────────

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  log.error('Unhandled error', { error: err.message, stack: err.stack });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
  });
}

// ─── Not Found Handler ────────────────────────────────────────────────────────

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
}

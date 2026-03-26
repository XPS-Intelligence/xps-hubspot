import express from 'express';
import 'express-async-errors';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { router } from './routes';
import { authRouter } from './auth';
import { errorHandler, notFoundHandler } from './middleware';
import { createLogger } from '../logger';
import { config } from '../config';

const log = createLogger('api');

// ─── Rate Limiters ────────────────────────────────────────────────────────────

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

const jobLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many scrape requests. Rate limit: 20/min.' },
});

const hubspotSyncLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many HubSpot sync requests. Rate limit: 10/min.' },
});

export function createApp(): express.Application {
  const app = express();

  // ─── Security & Parsing ─────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({ origin: config.NODE_ENV === 'development' ? '*' : false }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Global Rate Limit ──────────────────────────────────────────────────────
  app.use(globalLimiter);

  // ─── Logging ────────────────────────────────────────────────────────────────
  if (config.NODE_ENV !== 'test') {
    app.use(
      morgan('combined', {
        stream: { write: (msg) => log.http(msg.trim()) },
      }),
    );
  }

  // ─── Routes ─────────────────────────────────────────────────────────────────
  app.use('/auth', authRouter);

  // Apply tighter rate limits to mutation endpoints
  app.use('/api/v1/jobs', jobLimiter);
  app.use('/api/v1/hubspot', hubspotSyncLimiter);

  app.use('/api/v1', router);

  // ─── Error Handling ─────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

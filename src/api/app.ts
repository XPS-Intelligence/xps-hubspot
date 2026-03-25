import express from 'express';
import 'express-async-errors';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { router } from './routes';
import { authRouter } from './auth';
import { errorHandler, notFoundHandler } from './middleware';
import { createLogger } from '../logger';
import { config } from '../config';

const log = createLogger('api');

export function createApp(): express.Application {
  const app = express();

  // ─── Security & Parsing ─────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({ origin: config.NODE_ENV === 'development' ? '*' : false }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

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
  app.use('/api/v1', router);

  // ─── Error Handling ─────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

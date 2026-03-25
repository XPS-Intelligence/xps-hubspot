/**
 * Main application entry point.
 * Starts the Express API server.
 */

import { createApp } from './api/app';
import { createLogger } from './logger';
import { config } from './config';
import { checkDbHealth } from './db/client';

const log = createLogger('main');

async function main(): Promise<void> {
  log.info('XPS HubSpot starting up', { env: config.NODE_ENV, port: config.PORT });

  // DB health check
  const dbOk = await checkDbHealth();
  if (!dbOk) {
    log.warn('Database health check failed – proceeding anyway (migrations may be pending)');
  } else {
    log.info('Database connection OK');
  }

  const app = createApp();

  const server = app.listen(config.PORT, config.HOST, () => {
    log.info(`Server listening on http://${config.HOST}:${config.PORT}`);
  });

  // Graceful shutdown
  const shutdown = (): void => {
    log.info('Shutdown signal received');
    server.close(() => {
      log.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  process.on('unhandledRejection', (reason) => {
    log.error('Unhandled promise rejection', { reason });
  });

  process.on('uncaughtException', (err) => {
    log.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', msg);
  process.exit(1);
});

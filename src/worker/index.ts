/**
 * Background worker entry point.
 * Runs independently from the API server.
 */

import { createLogger } from '../logger';
import { startWorker, stopWorker } from './worker';

const log = createLogger('worker:main');

async function main(): Promise<void> {
  log.info('XPS HubSpot Worker starting up');

  startWorker();

  // Graceful shutdown
  const shutdown = (): void => {
    log.info('Shutdown signal received');
    stopWorker();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  log.info('Worker running. Waiting for jobs...');
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  log.error('Worker fatal error', { error: msg });
  process.exit(1);
});

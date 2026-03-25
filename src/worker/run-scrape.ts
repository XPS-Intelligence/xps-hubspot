#!/usr/bin/env ts-node
/**
 * CLI entry point for running a one-shot batch scrape.
 * Usage: ts-node src/worker/run-scrape.ts [url1] [url2] ...
 * Or via: npm run scrape -- https://example.com https://another.com
 */

import { createLogger } from '../logger';
import { runBatchScrape } from './worker';
import { browserPool } from '../scraper';
import type { ScrapeJob } from '../types';
import * as fs from 'fs';

const log = createLogger('run-scrape');

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let urls: string[] = [];
  let type: ScrapeJob['type'] = 'company';

  // Support --type flag
  const typeIdx = args.indexOf('--type');
  if (typeIdx !== -1 && args[typeIdx + 1]) {
    type = args[typeIdx + 1] as ScrapeJob['type'];
    args.splice(typeIdx, 2);
  }

  // Support --file flag to read URLs from a file
  const fileIdx = args.indexOf('--file');
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    const filePath = args[fileIdx + 1];
    const content = fs.readFileSync(filePath, 'utf-8');
    urls = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http'));
    args.splice(fileIdx, 2);
  } else {
    urls = args.filter((a) => a.startsWith('http'));
  }

  if (urls.length === 0) {
    log.error('No URLs provided. Pass URLs as arguments or use --file <path>');
    process.exit(1);
  }

  log.info('Starting batch scrape', { urlCount: urls.length, type });

  try {
    const result = await runBatchScrape(urls, type);

    log.info('Batch scrape finished', result);

    // Write artifact for GitHub Actions
    if (process.env.GITHUB_ACTIONS) {
      const artifactPath = process.env.SCRAPE_ARTIFACT_PATH ?? '/tmp/scrape-results.json';
      fs.writeFileSync(artifactPath, JSON.stringify({ ...result, timestamp: new Date().toISOString() }, null, 2));
      log.info('Artifact written', { path: artifactPath });
    }
  } finally {
    await browserPool.close();
  }

  process.exit(0);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  log.error('Fatal error', { error: msg });
  process.exit(1);
});

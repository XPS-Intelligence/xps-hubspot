import { createLogger } from '../logger';
import { getQueue } from '../queue';
import { scrapeUrl } from '../scraper';
import { persistLead, deduplicateBatch } from '../pipeline';
import { validateAndPersist } from '../validation';
import { syncValidatedLeads } from '../hubspot';
import { getPendingScrapeJobs, updateScrapeJobStatus, getLeadsByStatus } from '../db/queries';
import { config } from '../config';
import type { ScrapeJob, RawScrapedData } from '../types';

const log = createLogger('worker');

// ─── Worker State ─────────────────────────────────────────────────────────────

let isRunning = false;
let pollTimer: NodeJS.Timeout | null = null;
let syncTimer: NodeJS.Timeout | null = null;

// ─── Process a single scrape job ──────────────────────────────────────────────

async function processJob(dbJob: {
  id: string;
  url: string;
  type: string;
  priority: number;
  max_retries: number;
  timeout_ms: number;
  metadata: Record<string, unknown> | null;
}): Promise<void> {
  const job: ScrapeJob = {
    id: dbJob.id,
    url: dbJob.url,
    type: dbJob.type as ScrapeJob['type'],
    priority: dbJob.priority,
    maxRetries: dbJob.max_retries,
    timeout: dbJob.timeout_ms,
    metadata: dbJob.metadata ?? undefined,
    createdAt: new Date(),
  };

  await updateScrapeJobStatus(job.id, 'processing');

  try {
    const raw: RawScrapedData = await scrapeUrl(job);
    const { lead, isDuplicate } = await persistLead(raw);

    if (!isDuplicate) {
      await validateAndPersist(lead);
    }

    await updateScrapeJobStatus(job.id, 'completed');
    log.info('Job processed', { jobId: job.id, leadId: lead.id, isDuplicate });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('Job processing error', { jobId: job.id, error: msg });
    await updateScrapeJobStatus(job.id, 'failed');
    throw err;
  }
}

// ─── Poll Loop ────────────────────────────────────────────────────────────────

async function pollAndProcess(): Promise<void> {
  if (!isRunning) return;

  const q = getQueue();

  if (q.size + q.pending >= config.SCRAPER_CONCURRENCY * 2) {
    log.debug('Queue full, skipping poll', { size: q.size, pending: q.pending });
    return;
  }

  try {
    const jobs = await getPendingScrapeJobs(config.SCRAPER_CONCURRENCY);

    if (jobs.length === 0) {
      log.debug('No pending jobs');
      return;
    }

    log.info('Picked up jobs', { count: jobs.length });

    for (const dbJob of jobs) {
      q.enqueue(
        {
          id: dbJob.id,
          url: dbJob.url,
          type: dbJob.type as ScrapeJob['type'],
          priority: dbJob.priority,
          maxRetries: dbJob.max_retries,
          timeout: dbJob.timeout_ms,
          metadata: dbJob.metadata ?? undefined,
          createdAt: new Date(dbJob.created_at),
        },
        () => processJob(dbJob),
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('Poll cycle error', { error: msg });
  }
}

// ─── HubSpot Sync Cycle ───────────────────────────────────────────────────────

async function syncToHubSpot(): Promise<void> {
  try {
    const leads = await getLeadsByStatus('validated', 50);

    if (leads.length === 0) {
      log.debug('No validated leads to sync to HubSpot');
      return;
    }

    log.info('Syncing validated leads to HubSpot', { count: leads.length });
    const result = await syncValidatedLeads(leads);
    log.info('HubSpot sync complete', result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('HubSpot sync error', { error: msg });
  }
}

// ─── Worker Lifecycle ─────────────────────────────────────────────────────────

export function startWorker(): void {
  if (isRunning) {
    log.warn('Worker already running');
    return;
  }

  isRunning = true;
  log.info('Worker started', {
    concurrency: config.SCRAPER_CONCURRENCY,
    pollInterval: config.QUEUE_POLL_INTERVAL_MS,
  });

  // Kick off immediately
  void pollAndProcess();

  pollTimer = setInterval(() => {
    void pollAndProcess();
  }, config.QUEUE_POLL_INTERVAL_MS);

  // Sync to HubSpot every 5 minutes
  syncTimer = setInterval(() => {
    void syncToHubSpot();
  }, 5 * 60 * 1000);
}

export function stopWorker(): void {
  isRunning = false;

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }

  log.info('Worker stopped');
}

export function isWorkerRunning(): boolean {
  return isRunning;
}

// ─── One-shot batch scrape (for GitHub Actions / CLI) ─────────────────────────

export async function runBatchScrape(urls: string[], type: ScrapeJob['type'] = 'company'): Promise<{
  processed: number;
  failed: number;
  leads: string[];
}> {
  log.info('Starting batch scrape', { count: urls.length, type });

  const rawResults: RawScrapedData[] = [];
  let failed = 0;
  const processedLeadIds: string[] = [];

  const q = getQueue();

  await Promise.allSettled(
    urls.map((url) => {
      const job: ScrapeJob = {
        id: crypto.randomUUID(),
        url,
        type,
        priority: 5,
        maxRetries: config.SCRAPER_MAX_RETRIES,
        timeout: config.SCRAPER_TIMEOUT_MS,
        createdAt: new Date(),
      };

      return new Promise<void>((resolve, reject) => {
        q.enqueue(job, async (j) => {
          try {
            const raw = await scrapeUrl(j);
            rawResults.push(raw);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    }),
  );

  await q.drain();

  const deduped = deduplicateBatch(rawResults);

  for (const raw of deduped) {
    try {
      const { lead, isDuplicate } = await persistLead(raw);
      if (!isDuplicate) {
        await validateAndPersist(lead);
        processedLeadIds.push(lead.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error('Lead persistence error', { url: raw.url, error: msg });
      failed++;
    }
  }

  log.info('Batch scrape complete', {
    processed: processedLeadIds.length,
    failed,
    deduped: rawResults.length - deduped.length,
  });

  return { processed: processedLeadIds.length, failed, leads: processedLeadIds };
}

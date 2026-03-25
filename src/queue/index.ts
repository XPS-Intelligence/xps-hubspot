import PQueue from 'p-queue';
import { v4 as uuidv4 } from 'uuid';
import type { QueueItem, ScrapeJob } from '../types';
import { createLogger } from '../logger';
import { config } from '../config';

const log = createLogger('queue');

// ─── Async Scrape Queue ───────────────────────────────────────────────────────

export class ScrapeQueue {
  private readonly pq: PQueue;
  private readonly items: Map<string, QueueItem<ScrapeJob>> = new Map();
  private completedCount = 0;
  private failedCount = 0;

  constructor(concurrency?: number) {
    this.pq = new PQueue({
      concurrency: concurrency ?? config.SCRAPER_CONCURRENCY,
    });

    this.pq.on('active', () => {
      log.debug('Queue worker picked up task', {
        size: this.pq.size,
        pending: this.pq.pending,
      });
    });

    this.pq.on('idle', () => {
      log.info('Queue drained – all tasks completed', {
        completed: this.completedCount,
        failed: this.failedCount,
      });
    });
  }

  // ─── Enqueue ───────────────────────────────────────────────────────────────

  enqueue(job: ScrapeJob, handler: (job: ScrapeJob) => Promise<void>): string {
    const itemId = uuidv4();
    const item: QueueItem<ScrapeJob> = {
      id: itemId,
      payload: job,
      priority: job.priority,
      attempts: 0,
      maxRetries: job.maxRetries,
      enqueuedAt: new Date(),
    };

    this.items.set(itemId, item);

    this.pq.add(
      async () => {
        item.attempts += 1;
        item.lastAttemptAt = new Date();

        try {
          await handler(job);
          this.completedCount++;
          this.items.delete(itemId);
          log.info('Job completed', { jobId: job.id, itemId, attempts: item.attempts });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          item.error = errMsg;
          this.failedCount++;
          log.error('Job failed', { jobId: job.id, itemId, attempts: item.attempts, error: errMsg });
          this.items.delete(itemId);
        }
      },
      { priority: job.priority },
    );

    log.debug('Job enqueued', { jobId: job.id, itemId, priority: job.priority });
    return itemId;
  }

  // ─── Status ────────────────────────────────────────────────────────────────

  get size(): number {
    return this.pq.size;
  }

  get pending(): number {
    return this.pq.pending;
  }

  get completed(): number {
    return this.completedCount;
  }

  get failed(): number {
    return this.failedCount;
  }

  isPaused(): boolean {
    return this.pq.isPaused;
  }

  // ─── Control ───────────────────────────────────────────────────────────────

  pause(): void {
    this.pq.pause();
    log.info('Queue paused');
  }

  resume(): void {
    this.pq.start();
    log.info('Queue resumed');
  }

  async drain(): Promise<void> {
    await this.pq.onIdle();
  }

  clear(): void {
    this.pq.clear();
    this.items.clear();
    log.info('Queue cleared');
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _queueInstance: ScrapeQueue | null = null;

export function getQueue(concurrency?: number): ScrapeQueue {
  if (!_queueInstance) {
    _queueInstance = new ScrapeQueue(concurrency);
    log.info('Scrape queue initialised', {
      concurrency: concurrency ?? config.SCRAPER_CONCURRENCY,
    });
  }
  return _queueInstance;
}

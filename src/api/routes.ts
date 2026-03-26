import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getQueue } from '../queue';
import { insertScrapeJob, getPendingScrapeJobs, getLeadsPaginated } from '../db/queries';
import { scrapeUrl } from '../scraper';
import { persistLead } from '../pipeline';
import { validateAndPersist } from '../validation';
import { syncLeadToHubSpot, syncValidatedLeads } from '../hubspot';
import { getLeadsByStatus } from '../db/queries';
import { requireAuth } from './middleware';
import { createLogger } from '../logger';
import type { ApiResponse } from '../types';

const log = createLogger('api:routes');
export const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePageParams(query: Request['query']): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(String(query['page'] ?? '1'), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(query['pageSize'] ?? '20'), 10)));
  return { page, pageSize };
}

// ─── Health ───────────────────────────────────────────────────────────────────

router.get('/health', (_req, res: Response) => {
  res.json({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── Queue Status ─────────────────────────────────────────────────────────────

router.get('/queue/status', requireAuth, (_req, res: Response) => {
  const q = getQueue();
  res.json({
    success: true,
    data: {
      size: q.size,
      pending: q.pending,
      completed: q.completed,
      failed: q.failed,
      paused: q.isPaused(),
    },
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── Submit Scrape Job ────────────────────────────────────────────────────────

const SubmitJobSchema = z.object({
  url: z.string().url(),
  type: z.enum(['company', 'contact', 'event', 'custom']).default('company'),
  priority: z.number().int().min(1).max(10).optional().default(5),
  maxRetries: z.number().int().min(0).max(5).optional().default(3),
  timeout: z.number().int().min(5000).max(120000).optional().default(30000),
  metadata: z.record(z.unknown()).optional(),
});

router.post('/jobs', requireAuth, async (req: Request, res: Response) => {
  const parsed = SubmitJobSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const { url, type, priority, maxRetries, timeout, metadata } = parsed.data;

  const dbJob = await insertScrapeJob({
    id: uuidv4(),
    url,
    type,
    priority,
    max_retries: maxRetries,
    timeout_ms: timeout,
    metadata: metadata ?? null,
  });

  const job = {
    id: dbJob.id,
    url: dbJob.url,
    type: dbJob.type as 'company' | 'contact' | 'event' | 'custom',
    priority: dbJob.priority,
    maxRetries: dbJob.max_retries,
    timeout: dbJob.timeout_ms,
    metadata: dbJob.metadata ?? undefined,
    createdAt: new Date(dbJob.created_at),
  };

  const q = getQueue();
  q.enqueue(job, async (j) => {
    const raw = await scrapeUrl(j);
    const { lead, isDuplicate } = await persistLead(raw);

    if (!isDuplicate) {
      await validateAndPersist(lead);
    } else {
      log.info('Skipping validation for duplicate', { leadId: lead.id });
    }
  });

  log.info('Job submitted', { jobId: dbJob.id, url });

  res.status(202).json({
    success: true,
    data: { jobId: dbJob.id, status: 'queued' },
    message: 'Scrape job queued',
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── List Jobs ────────────────────────────────────────────────────────────────

router.get('/jobs', requireAuth, async (_req, res: Response) => {
  const jobs = await getPendingScrapeJobs(50);
  res.json({
    success: true,
    data: jobs,
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── List Leads ───────────────────────────────────────────────────────────────

router.get('/leads', requireAuth, async (req: Request, res: Response) => {
  const { page, pageSize } = parsePageParams(req.query);

  const { leads, total } = await getLeadsPaginated(page, pageSize);

  res.json({
    success: true,
    data: { leads, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── Trigger HubSpot Sync ─────────────────────────────────────────────────────

router.post('/hubspot/sync', requireAuth, async (_req, res: Response) => {
  const validatedLeads = await getLeadsByStatus('validated', 100);

  if (validatedLeads.length === 0) {
    res.json({
      success: true,
      data: { synced: 0, failed: 0, errors: [] },
      message: 'No validated leads to sync',
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const result = await syncValidatedLeads(validatedLeads);

  res.json({
    success: true,
    data: result,
    message: `Synced ${result.synced}/${validatedLeads.length} leads to HubSpot`,
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── Single Lead HubSpot Sync ─────────────────────────────────────────────────

router.post('/hubspot/sync/:leadId', requireAuth, async (req: Request, res: Response) => {
  const { leadId } = req.params;

  const { getServiceClient } = await import('../db/client');
  const client = getServiceClient();
  const { data, error } = await client.from('leads').select('*').eq('id', leadId).maybeSingle();

  if (error || !data) {
    res.status(404).json({
      success: false,
      error: 'Lead not found',
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const hubspotId = await syncLeadToHubSpot(data);

  res.json({
    success: true,
    data: { hubspotContactId: hubspotId, leadId },
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

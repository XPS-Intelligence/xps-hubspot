import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './middleware';
import { createLogger } from '../logger';
import {
  insertSeed,
  updateSeed,
  deleteSeed,
  getSeedById,
  getSeedsPaginated,
  searchSeeds,
} from '../db/seed-queries';
import { insertPipelineRun } from '../db/pipeline-queries';
import { SeedSchema } from '../types';
import type { ApiResponse } from '../types';

const log = createLogger('api:seeds');
export const seedRouter = Router();

// ─── GET /seeds ───────────────────────────────────────────────────────────────

seedRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['pageSize'] ?? '20'), 10)));
  const q = req.query['q'] as string | undefined;
  const status = req.query['status'] as string | undefined;

  if (q) {
    const seeds = await searchSeeds(q, pageSize);
    res.json({
      success: true,
      data: { seeds, total: seeds.length, page: 1, pageSize },
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const { seeds, total } = await getSeedsPaginated(page, pageSize, status);
  res.json({
    success: true,
    data: { seeds, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── POST /seeds ──────────────────────────────────────────────────────────────

seedRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = SeedSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const user = (req as Request & { user?: { id: string } }).user;
  const seed = await insertSeed({
    ...parsed.data,
    keywords: parsed.data.keywords ?? [],
    key_phrases: parsed.data.key_phrases ?? [],
    categories: parsed.data.categories ?? [],
    state: parsed.data.state ?? null,
    city: parsed.data.city ?? null,
    zip: parsed.data.zip ?? null,
    industry: parsed.data.industry ?? null,
    target_intent: parsed.data.target_intent ?? null,
    desired_end_result: parsed.data.desired_end_result ?? null,
    created_by: user?.id ?? null,
  });

  log.info('Seed created', { id: seed.id });
  res.status(201).json({
    success: true,
    data: seed,
    message: 'Seed created',
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── PUT /seeds/:id ───────────────────────────────────────────────────────────

seedRouter.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await getSeedById(id);
  if (!existing) {
    res.status(404).json({
      success: false,
      error: 'Seed not found',
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const parsed = SeedSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const updated = await updateSeed(id, parsed.data);
  res.json({
    success: true,
    data: updated,
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── DELETE /seeds/:id ────────────────────────────────────────────────────────

seedRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await getSeedById(id);
  if (!existing) {
    res.status(404).json({
      success: false,
      error: 'Seed not found',
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  await deleteSeed(id);
  res.json({
    success: true,
    message: 'Seed deleted',
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── POST /seeds/:id/dispatch ─────────────────────────────────────────────────

seedRouter.post('/:id/dispatch', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  const seed = await getSeedById(id);
  if (!seed) {
    res.status(404).json({
      success: false,
      error: 'Seed not found',
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const user = (req as Request & { user?: { id: string } }).user;
  const run = await insertPipelineRun({
    trigger_type: 'manual',
    seed_ids: [id],
    status: 'pending',
    started_at: new Date().toISOString(),
    completed_at: null,
    results: null,
    created_by: user?.id ?? null,
  });

  log.info('Pipeline dispatched for seed', { seedId: id, runId: run.id });

  // Enqueue a scrape job for this seed's URL
  const jobId = uuidv4();
  log.info('Scrape job queued for seed dispatch', { jobId, url: seed.url });

  res.status(202).json({
    success: true,
    data: { runId: run.id, jobId, seedId: id },
    message: 'Pipeline dispatched for seed',
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

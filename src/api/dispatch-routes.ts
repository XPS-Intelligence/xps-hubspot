import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from './middleware';
import { createLogger } from '../logger';
import {
  insertPipelineRun,
  updatePipelineRun,
  getPipelineRunsPaginated,
  getPipelineRunById,
} from '../db/pipeline-queries';
import type { ApiResponse } from '../types';

const log = createLogger('api:dispatch');
export const dispatchRouter = Router();

// ─── POST /dispatch ───────────────────────────────────────────────────────────

const DispatchSchema = z.object({
  seed_ids: z.array(z.string().uuid()).min(1, 'At least one seed_id required'),
  trigger_type: z.enum(['manual', 'scheduled', 'api', 'webhook']).default('manual'),
  metadata: z.record(z.unknown()).optional(),
});

dispatchRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = DispatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const user = (req as Request & { user?: { id: string } }).user;
  const run = await insertPipelineRun({
    trigger_type: parsed.data.trigger_type,
    seed_ids: parsed.data.seed_ids,
    status: 'pending',
    started_at: new Date().toISOString(),
    completed_at: null,
    results: parsed.data.metadata ?? null,
    created_by: user?.id ?? null,
  });

  log.info('Pipeline run dispatched', { runId: run.id, seedCount: parsed.data.seed_ids.length });

  res.status(202).json({
    success: true,
    data: run,
    message: `Pipeline run started for ${parsed.data.seed_ids.length} seed(s)`,
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── GET /dispatch/runs ───────────────────────────────────────────────────────

dispatchRouter.get('/runs', requireAuth, async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['pageSize'] ?? '20'), 10)));
  const status = req.query['status'] as string | undefined;

  const { runs, total } = await getPipelineRunsPaginated(page, pageSize, status);
  res.json({
    success: true,
    data: { runs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── GET /dispatch/runs/:id ───────────────────────────────────────────────────

dispatchRouter.get('/runs/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const run = await getPipelineRunById(id);

  if (!run) {
    res.status(404).json({
      success: false,
      error: 'Pipeline run not found',
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  // Mark run as running if still pending
  if (run.status === 'pending') {
    const updated = await updatePipelineRun(id, { status: 'running' });
    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  res.json({
    success: true,
    data: run,
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

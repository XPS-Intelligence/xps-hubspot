import { Router, Request, Response } from 'express';
import { requireAuth } from './middleware';
import { createLogger } from '../logger';
import {
  insertPrompt,
  updatePrompt,
  deletePrompt,
  getPromptByName,
  getPromptsByCategory,
  getAllPrompts,
} from '../db/prompt-queries';
import { PromptSchema } from '../types';
import type { ApiResponse } from '../types';

const log = createLogger('api:prompts');
export const promptRouter = Router();

// ─── GET /prompts ─────────────────────────────────────────────────────────────

promptRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const category = req.query['category'] as string | undefined;
  const activeOnly = req.query['active'] === 'true';

  const prompts = category
    ? await getPromptsByCategory(category)
    : await getAllPrompts(activeOnly);

  res.json({
    success: true,
    data: prompts,
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── POST /prompts ────────────────────────────────────────────────────────────

promptRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = PromptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const existing = await getPromptByName(parsed.data.name);
  if (existing) {
    res.status(409).json({
      success: false,
      error: `Prompt with name "${parsed.data.name}" already exists`,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const prompt = await insertPrompt({
    ...parsed.data,
    category: parsed.data.category ?? null,
    description: parsed.data.description ?? null,
  });

  log.info('Prompt created', { name: prompt.name });
  res.status(201).json({
    success: true,
    data: prompt,
    message: 'Prompt created',
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── PUT /prompts/:id ─────────────────────────────────────────────────────────

promptRouter.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = PromptSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const updated = await updatePrompt(id, parsed.data);
  res.json({
    success: true,
    data: updated,
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

// ─── DELETE /prompts/:id ──────────────────────────────────────────────────────

promptRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  await deletePrompt(id);
  log.info('Prompt deleted', { id });
  res.json({
    success: true,
    message: 'Prompt deleted',
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
});

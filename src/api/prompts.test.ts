import request from 'supertest';
import { createApp } from '../api/app';
import type { Application } from 'express';

jest.mock('../db/client', () => ({
  getAnonClient: jest.fn(),
  getServiceClient: jest.fn(),
  checkDbHealth: jest.fn().mockResolvedValue(true),
}));

jest.mock('../auth', () => ({
  verifyToken: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com', role: 'authenticated' }),
  signInWithGoogle: jest.fn(),
  exchangeCodeForSession: jest.fn(),
}));

jest.mock('../db/prompt-queries', () => {
  const mp = {
    id: 'prompt-123',
    name: 'lead-extraction',
    category: 'extraction',
    template: 'Extract leads from: {{html}}',
    variables: [{ name: 'html', type: 'string' }],
    description: 'Extracts lead data from raw HTML',
    is_active: true,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return {
    insertPrompt: jest.fn().mockResolvedValue(mp),
    updatePrompt: jest.fn().mockResolvedValue({ ...mp, template: 'Updated template' }),
    deletePrompt: jest.fn().mockResolvedValue(undefined),
    getPromptByName: jest.fn().mockImplementation((name: string) =>
      name === 'existing-prompt' ? Promise.resolve(mp) : Promise.resolve(null),
    ),
    getPromptsByCategory: jest.fn().mockResolvedValue([mp]),
    getAllPrompts: jest.fn().mockResolvedValue([mp]),
  };
});

// Keep other mocks satisfied
jest.mock('../queue', () => ({
  getQueue: jest.fn().mockReturnValue({
    size: 0, pending: 0, completed: 0, failed: 0,
    isPaused: jest.fn().mockReturnValue(false),
    enqueue: jest.fn(),
  }),
}));

jest.mock('../db/queries', () => ({
  insertScrapeJob: jest.fn(),
  getPendingScrapeJobs: jest.fn().mockResolvedValue([]),
  getLeadsPaginated: jest.fn().mockResolvedValue({ leads: [], total: 0 }),
  getLeadsByStatus: jest.fn().mockResolvedValue([]),
}));

jest.mock('../db/seed-queries', () => ({
  insertSeed: jest.fn(),
  updateSeed: jest.fn(),
  deleteSeed: jest.fn(),
  getSeedById: jest.fn().mockResolvedValue(null),
  getSeedsPaginated: jest.fn().mockResolvedValue({ seeds: [], total: 0 }),
  searchSeeds: jest.fn().mockResolvedValue([]),
}));

jest.mock('../db/pipeline-queries', () => ({
  insertPipelineRun: jest.fn(),
  updatePipelineRun: jest.fn(),
  getPipelineRunsPaginated: jest.fn().mockResolvedValue({ runs: [], total: 0 }),
  getPipelineRunById: jest.fn().mockResolvedValue(null),
}));

describe('Prompt API routes', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/v1/prompts', () => {
    it('returns all prompts with auth', async () => {
      const res = await request(app)
        .get('/api/v1/prompts')
        .set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters by category', async () => {
      const res = await request(app)
        .get('/api/v1/prompts?category=extraction')
        .set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/v1/prompts');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/prompts', () => {
    it('creates a valid prompt', async () => {
      const res = await request(app)
        .post('/api/v1/prompts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'lead-extraction',
          category: 'extraction',
          template: 'Extract leads from: {{html}}',
          description: 'Extracts lead data',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('lead-extraction');
    });

    it('returns 409 for duplicate prompt name', async () => {
      const res = await request(app)
        .post('/api/v1/prompts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'existing-prompt',
          template: 'some template',
        });
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/prompts')
        .set('Authorization', 'Bearer valid-token')
        .send({ category: 'extraction' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/v1/prompts')
        .send({ name: 'test', template: 'test' });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/prompts/:id', () => {
    it('updates an existing prompt', async () => {
      const res = await request(app)
        .put('/api/v1/prompts/prompt-123')
        .set('Authorization', 'Bearer valid-token')
        .send({ template: 'Updated template' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/prompts/:id', () => {
    it('deletes a prompt', async () => {
      const res = await request(app)
        .delete('/api/v1/prompts/prompt-123')
        .set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/v1/prompts/prompt-123');
      expect(res.status).toBe(401);
    });
  });
});

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

jest.mock('../db/seed-queries', () => ({
  insertSeed: jest.fn().mockResolvedValue({
    id: 'seed-123',
    url: 'https://example.com',
    keywords: ['test'],
    key_phrases: [],
    categories: [],
    state: 'CA',
    city: 'San Francisco',
    zip: '94105',
    industry: 'Technology',
    target_intent: 'buy',
    desired_end_result: 'lead',
    status: 'active',
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  updateSeed: jest.fn().mockResolvedValue({
    id: 'seed-123',
    url: 'https://updated.com',
    keywords: [],
    key_phrases: [],
    categories: [],
    state: null,
    city: null,
    zip: null,
    industry: null,
    target_intent: null,
    desired_end_result: null,
    status: 'active',
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  deleteSeed: jest.fn().mockResolvedValue(undefined),
  getSeedById: jest.fn().mockImplementation((id: string) => {
    if (id === 'seed-123') {
      return Promise.resolve({
        id: 'seed-123',
        url: 'https://example.com',
        keywords: [],
        key_phrases: [],
        categories: [],
        state: null,
        city: null,
        zip: null,
        industry: null,
        target_intent: null,
        desired_end_result: null,
        status: 'active',
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return Promise.resolve(null);
  }),
  getSeedsPaginated: jest.fn().mockResolvedValue({ seeds: [], total: 0 }),
  searchSeeds: jest.fn().mockResolvedValue([]),
}));

jest.mock('../db/pipeline-queries', () => ({
  insertPipelineRun: jest.fn().mockResolvedValue({
    id: 'run-123',
    trigger_type: 'manual',
    seed_ids: ['seed-123'],
    status: 'pending',
    started_at: new Date().toISOString(),
    completed_at: null,
    results: null,
    created_by: null,
    created_at: new Date().toISOString(),
  }),
  updatePipelineRun: jest.fn(),
  getPipelineRunsPaginated: jest.fn().mockResolvedValue({ runs: [], total: 0 }),
  getPipelineRunById: jest.fn().mockResolvedValue(null),
}));

// Keep existing mocks happy
jest.mock('../queue', () => ({
  getQueue: jest.fn().mockReturnValue({
    size: 0,
    pending: 0,
    completed: 5,
    failed: 1,
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

describe('Seed API routes', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/v1/seeds', () => {
    it('returns paginated seeds with auth', async () => {
      const res = await request(app)
        .get('/api/v1/seeds')
        .set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('seeds');
      expect(res.body.data).toHaveProperty('total');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/v1/seeds');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/seeds', () => {
    it('creates a valid seed', async () => {
      const res = await request(app)
        .post('/api/v1/seeds')
        .set('Authorization', 'Bearer valid-token')
        .send({
          url: 'https://example.com',
          keywords: ['test'],
          industry: 'Technology',
          state: 'CA',
          city: 'San Francisco',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('seed-123');
    });

    it('returns 400 for invalid URL', async () => {
      const res = await request(app)
        .post('/api/v1/seeds')
        .set('Authorization', 'Bearer valid-token')
        .send({ url: 'not-a-url' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/v1/seeds')
        .send({ url: 'https://example.com' });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/seeds/:id', () => {
    it('updates an existing seed', async () => {
      const res = await request(app)
        .put('/api/v1/seeds/seed-123')
        .set('Authorization', 'Bearer valid-token')
        .send({ url: 'https://updated.com' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 for unknown seed', async () => {
      const res = await request(app)
        .put('/api/v1/seeds/nonexistent-id')
        .set('Authorization', 'Bearer valid-token')
        .send({ url: 'https://updated.com' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/seeds/:id', () => {
    it('deletes an existing seed', async () => {
      const res = await request(app)
        .delete('/api/v1/seeds/seed-123')
        .set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 for unknown seed', async () => {
      const res = await request(app)
        .delete('/api/v1/seeds/nonexistent-id')
        .set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/seeds/:id/dispatch', () => {
    it('dispatches pipeline for existing seed', async () => {
      const res = await request(app)
        .post('/api/v1/seeds/seed-123/dispatch')
        .set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('runId');
    });

    it('returns 404 for unknown seed', async () => {
      const res = await request(app)
        .post('/api/v1/seeds/nonexistent-id/dispatch')
        .set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(404);
    });
  });
});

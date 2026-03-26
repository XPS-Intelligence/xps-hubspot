import request from 'supertest';
import { createApp } from '../api/app';
import type { Application } from 'express';

// Mock all external services
jest.mock('../db/client', () => ({
  getAnonClient: jest.fn(),
  getServiceClient: jest.fn(),
  checkDbHealth: jest.fn().mockResolvedValue(true),
}));

jest.mock('../auth', () => ({
  verifyToken: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com', role: 'authenticated' }),
  signInWithGoogle: jest.fn().mockResolvedValue('https://accounts.google.com/oauth'),
  exchangeCodeForSession: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com', role: 'authenticated' }),
}));

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
  insertScrapeJob: jest.fn().mockResolvedValue({
    id: 'job-123',
    url: 'https://example.com',
    type: 'company',
    priority: 5,
    max_retries: 3,
    timeout_ms: 30000,
    metadata: null,
    status: 'queued',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  getPendingScrapeJobs: jest.fn().mockResolvedValue([]),
  getLeadsPaginated: jest.fn().mockResolvedValue({ leads: [], total: 0 }),
  getLeadsByStatus: jest.fn().mockResolvedValue([]),
}));

describe('API routes', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/v1/health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    });
  });

  describe('GET /api/v1/queue/status', () => {
    it('returns queue status with auth token', async () => {
      const res = await request(app)
        .get('/api/v1/queue/status')
        .set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('size');
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/v1/queue/status');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/jobs', () => {
    it('queues a valid job', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({ url: 'https://example.com', type: 'company' });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobId).toBe('job-123');
    });

    it('returns 400 for invalid URL', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({ url: 'not-a-url' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .send({ url: 'https://example.com' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/leads', () => {
    it('returns paginated leads with auth', async () => {
      const res = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('leads');
      expect(res.body.data).toHaveProperty('total');
    });
  });

  describe('404 handler', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});

import { ScrapeQueue } from '../queue';

describe('ScrapeQueue', () => {
  let queue: ScrapeQueue;

  beforeEach(() => {
    queue = new ScrapeQueue(2);
  });

  it('starts with zero size and pending', () => {
    expect(queue.size).toBe(0);
    expect(queue.pending).toBe(0);
  });

  it('processes enqueued jobs', async () => {
    const results: string[] = [];

    const makeJob = (id: string) => ({
      id,
      url: `https://example.com/${id}`,
      type: 'company' as const,
      priority: 5,
      maxRetries: 0,
      timeout: 5000,
      createdAt: new Date(),
    });

    queue.enqueue(makeJob('job-1'), async () => { results.push('job-1'); });
    queue.enqueue(makeJob('job-2'), async () => { results.push('job-2'); });

    await queue.drain();

    expect(results).toContain('job-1');
    expect(results).toContain('job-2');
    expect(queue.completed).toBe(2);
  });

  it('increments failed count when handler throws', async () => {
    const job = {
      id: 'job-fail',
      url: 'https://example.com/fail',
      type: 'company' as const,
      priority: 5,
      maxRetries: 0,
      timeout: 5000,
      createdAt: new Date(),
    };

    queue.enqueue(job, async () => { throw new Error('test failure'); });

    await queue.drain();

    expect(queue.failed).toBe(1);
    expect(queue.completed).toBe(0);
  });

  it('respects priority ordering', async () => {
    const order: number[] = [];
    const singleQueue = new ScrapeQueue(1); // concurrency 1 to ensure ordering

    const makeJob = (id: string, priority: number) => ({
      id,
      url: `https://example.com/${id}`,
      type: 'company' as const,
      priority,
      maxRetries: 0,
      timeout: 5000,
      createdAt: new Date(),
    });

    singleQueue.pause();

    singleQueue.enqueue(makeJob('low', 1), async () => { order.push(1); });
    singleQueue.enqueue(makeJob('high', 10), async () => { order.push(10); });
    singleQueue.enqueue(makeJob('mid', 5), async () => { order.push(5); });

    singleQueue.resume();
    await singleQueue.drain();

    // High priority should run before low
    expect(order.indexOf(10)).toBeLessThan(order.indexOf(1));
  });

  it('can pause and resume', () => {
    queue.pause();
    expect(queue.isPaused()).toBe(true);
    queue.resume();
    expect(queue.isPaused()).toBe(false);
  });
});

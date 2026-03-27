import { getServiceClient } from './client';
import type { DbPipelineRun } from '../types';
import { createLogger } from '../logger';

const log = createLogger('db:pipeline-queries');

// ─── Insert ───────────────────────────────────────────────────────────────────

export async function insertPipelineRun(
  run: Omit<DbPipelineRun, 'id' | 'created_at'>,
): Promise<DbPipelineRun> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('pipeline_runs')
    .insert(run)
    .select()
    .single();

  if (error) throw new Error(`insertPipelineRun: ${error.message}`);
  log.info('Pipeline run inserted', { id: (data as DbPipelineRun).id });
  return data as DbPipelineRun;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePipelineRun(
  id: string,
  updates: Partial<Omit<DbPipelineRun, 'id' | 'created_at'>>,
): Promise<DbPipelineRun> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('pipeline_runs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updatePipelineRun: ${error.message}`);
  return data as DbPipelineRun;
}

// ─── Paginated list ───────────────────────────────────────────────────────────

export async function getPipelineRunsPaginated(
  page = 1,
  pageSize = 20,
  status?: string,
): Promise<{ runs: DbPipelineRun[]; total: number }> {
  const client = getServiceClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('pipeline_runs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`getPipelineRunsPaginated: ${error.message}`);
  return { runs: (data ?? []) as DbPipelineRun[], total: count ?? 0 };
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getPipelineRunById(id: string): Promise<DbPipelineRun | null> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('pipeline_runs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`getPipelineRunById: ${error.message}`);
  return data as DbPipelineRun | null;
}

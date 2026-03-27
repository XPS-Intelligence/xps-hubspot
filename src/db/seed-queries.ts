import { getServiceClient } from './client';
import type { DbSeed } from '../types';
import { createLogger } from '../logger';

const log = createLogger('db:seed-queries');

// ─── Insert ───────────────────────────────────────────────────────────────────

export async function insertSeed(
  seed: Omit<DbSeed, 'id' | 'created_at' | 'updated_at'>,
): Promise<DbSeed> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('seeds')
    .insert({ ...seed, status: seed.status ?? 'active' })
    .select()
    .single();

  if (error) throw new Error(`insertSeed: ${error.message}`);
  log.info('Seed inserted', { id: (data as DbSeed).id });
  return data as DbSeed;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateSeed(
  id: string,
  updates: Partial<Omit<DbSeed, 'id' | 'created_at' | 'updated_at'>>,
): Promise<DbSeed> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('seeds')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateSeed: ${error.message}`);
  return data as DbSeed;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteSeed(id: string): Promise<void> {
  const client = getServiceClient();
  const { error } = await client.from('seeds').delete().eq('id', id);
  if (error) throw new Error(`deleteSeed: ${error.message}`);
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getSeedById(id: string): Promise<DbSeed | null> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('seeds')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`getSeedById: ${error.message}`);
  return data as DbSeed | null;
}

// ─── Paginated list ───────────────────────────────────────────────────────────

export async function getSeedsPaginated(
  page = 1,
  pageSize = 20,
  status?: string,
): Promise<{ seeds: DbSeed[]; total: number }> {
  const client = getServiceClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('seeds')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`getSeedsPaginated: ${error.message}`);
  return { seeds: (data ?? []) as DbSeed[], total: count ?? 0 };
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchSeeds(
  query: string,
  limit = 20,
): Promise<DbSeed[]> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('seeds')
    .select('*')
    .or(`url.ilike.%${query}%,industry.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`searchSeeds: ${error.message}`);
  return (data ?? []) as DbSeed[];
}

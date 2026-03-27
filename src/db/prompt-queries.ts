import { getServiceClient } from './client';
import type { DbPrompt } from '../types';
import { createLogger } from '../logger';

const log = createLogger('db:prompt-queries');

// ─── Insert ───────────────────────────────────────────────────────────────────

export async function insertPrompt(
  prompt: Omit<DbPrompt, 'id' | 'created_at' | 'updated_at'>,
): Promise<DbPrompt> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('prompts')
    .insert(prompt)
    .select()
    .single();

  if (error) throw new Error(`insertPrompt: ${error.message}`);
  log.info('Prompt inserted', { name: (data as DbPrompt).name });
  return data as DbPrompt;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePrompt(
  id: string,
  updates: Partial<Omit<DbPrompt, 'id' | 'created_at' | 'updated_at'>>,
): Promise<DbPrompt> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('prompts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updatePrompt: ${error.message}`);
  return data as DbPrompt;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deletePrompt(id: string): Promise<void> {
  const client = getServiceClient();
  const { error } = await client.from('prompts').delete().eq('id', id);
  if (error) throw new Error(`deletePrompt: ${error.message}`);
}

// ─── Get by name ──────────────────────────────────────────────────────────────

export async function getPromptByName(name: string): Promise<DbPrompt | null> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('prompts')
    .select('*')
    .eq('name', name)
    .maybeSingle();

  if (error) throw new Error(`getPromptByName: ${error.message}`);
  return data as DbPrompt | null;
}

// ─── Get by category ──────────────────────────────────────────────────────────

export async function getPromptsByCategory(category: string): Promise<DbPrompt[]> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('prompts')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw new Error(`getPromptsByCategory: ${error.message}`);
  return (data ?? []) as DbPrompt[];
}

// ─── Get all ──────────────────────────────────────────────────────────────────

export async function getAllPrompts(activeOnly = false): Promise<DbPrompt[]> {
  const client = getServiceClient();
  let query = client
    .from('prompts')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getAllPrompts: ${error.message}`);
  return (data ?? []) as DbPrompt[];
}

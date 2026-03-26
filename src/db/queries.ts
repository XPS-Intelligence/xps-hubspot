import { getServiceClient } from './client';
import type { DbScrapeJob, DbLead } from '../types';
import { createLogger } from '../logger';

const log = createLogger('db:queries');

// ─── Scrape Jobs ──────────────────────────────────────────────────────────────

export async function insertScrapeJob(
  job: Omit<DbScrapeJob, 'created_at' | 'updated_at' | 'status'>,
): Promise<DbScrapeJob> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('scrape_jobs')
    .insert({ ...job, status: 'queued' })
    .select()
    .single();

  if (error) throw new Error(`insertScrapeJob: ${error.message}`);
  return data as DbScrapeJob;
}

export async function getPendingScrapeJobs(limit = 20): Promise<DbScrapeJob[]> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('scrape_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`getPendingScrapeJobs: ${error.message}`);
  return (data ?? []) as DbScrapeJob[];
}

export async function updateScrapeJobStatus(
  id: string,
  status: DbScrapeJob['status'],
): Promise<void> {
  const client = getServiceClient();
  const { error } = await client
    .from('scrape_jobs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`updateScrapeJobStatus: ${error.message}`);
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function upsertLead(lead: Omit<DbLead, 'created_at' | 'updated_at'>): Promise<DbLead> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('leads')
    .upsert(
      { ...lead, updated_at: new Date().toISOString() },
      { onConflict: 'fingerprint', ignoreDuplicates: false },
    )
    .select()
    .single();

  if (error) throw new Error(`upsertLead: ${error.message}`);
  return data as DbLead;
}

export async function getLeadByFingerprint(fingerprint: string): Promise<DbLead | null> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('leads')
    .select('*')
    .eq('fingerprint', fingerprint)
    .maybeSingle();

  if (error) throw new Error(`getLeadByFingerprint: ${error.message}`);
  return data as DbLead | null;
}

export async function getLeadsByStatus(
  status: DbLead['status'],
  limit = 50,
): Promise<DbLead[]> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('leads')
    .select('*')
    .eq('status', status)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getLeadsByStatus: ${error.message}`);
  return (data ?? []) as DbLead[];
}

export async function updateLeadStatus(
  id: string,
  status: DbLead['status'],
  extra?: Partial<DbLead>,
): Promise<void> {
  const client = getServiceClient();
  const { error } = await client
    .from('leads')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', id);

  if (error) {
    log.error('updateLeadStatus failed', { id, status, error: error.message });
    throw new Error(`updateLeadStatus: ${error.message}`);
  }
}

export async function updateLeadHubSpotId(id: string, hubspotContactId: string): Promise<void> {
  const client = getServiceClient();
  const { error } = await client
    .from('leads')
    .update({
      hubspot_contact_id: hubspotContactId,
      status: 'synced',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`updateLeadHubSpotId: ${error.message}`);
}

export async function getLeadsPaginated(
  page = 1,
  pageSize = 20,
): Promise<{ leads: DbLead[]; total: number }> {
  const client = getServiceClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await client
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`getLeadsPaginated: ${error.message}`);
  return { leads: (data ?? []) as DbLead[], total: count ?? 0 };
}

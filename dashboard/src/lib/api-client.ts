const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  const json = (await res.json()) as { data: T };
  return json.data;
}

// ─── Seeds ────────────────────────────────────────────────────────────────────

export type Seed = {
  id: string;
  url: string;
  keywords: string[];
  key_phrases: string[];
  categories: string[];
  state: string | null;
  city: string | null;
  zip: string | null;
  industry: string | null;
  target_intent: string | null;
  desired_end_result: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type SeedInput = Omit<Seed, 'id' | 'created_at' | 'updated_at'>;

export type PaginatedSeeds = {
  seeds: Seed[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const seedsApi = {
  list: (page = 1, pageSize = 20, q?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (q) params.set('q', q);
    return apiFetch<PaginatedSeeds>(`/seeds?${params}`);
  },
  create: (data: SeedInput) =>
    apiFetch<Seed>('/seeds', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<SeedInput>) =>
    apiFetch<Seed>(`/seeds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/seeds/${id}`, { method: 'DELETE' }),
  dispatch: (id: string) => apiFetch<{ runId: string }>(`/seeds/${id}/dispatch`, { method: 'POST' }),
};

// ─── Leads ────────────────────────────────────────────────────────────────────

export type Lead = {
  id: string;
  source_url: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  score: number;
  status: string;
  created_at: string;
};

export type PaginatedLeads = {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const leadsApi = {
  list: (page = 1, pageSize = 20) =>
    apiFetch<PaginatedLeads>(`/leads?page=${page}&pageSize=${pageSize}`),
};

// ─── Prompts ──────────────────────────────────────────────────────────────────

export type Prompt = {
  id: string;
  name: string;
  category: string | null;
  template: string;
  variables: unknown[];
  description: string | null;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};

export type PromptInput = Omit<Prompt, 'id' | 'created_at' | 'updated_at'>;

export const promptsApi = {
  list: (category?: string) => {
    const params = category ? `?category=${category}` : '';
    return apiFetch<Prompt[]>(`/prompts${params}`);
  },
  create: (data: PromptInput) =>
    apiFetch<Prompt>('/prompts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<PromptInput>) =>
    apiFetch<Prompt>(`/prompts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/prompts/${id}`, { method: 'DELETE' }),
};

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export type PipelineRun = {
  id: string;
  trigger_type: string;
  seed_ids: string[];
  status: string;
  started_at: string | null;
  completed_at: string | null;
  results: Record<string, unknown> | null;
  created_at: string;
};

export type PaginatedRuns = {
  runs: PipelineRun[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const dispatchApi = {
  trigger: (seedIds: string[], triggerType = 'manual') =>
    apiFetch<PipelineRun>('/dispatch', {
      method: 'POST',
      body: JSON.stringify({ seed_ids: seedIds, trigger_type: triggerType }),
    }),
  listRuns: (page = 1, pageSize = 20) =>
    apiFetch<PaginatedRuns>(`/dispatch/runs?page=${page}&pageSize=${pageSize}`),
  getRun: (id: string) => apiFetch<PipelineRun>(`/dispatch/runs/${id}`),
};

// ─── Queue ────────────────────────────────────────────────────────────────────

export type QueueStatus = {
  size: number;
  pending: number;
  completed: number;
  failed: number;
  paused: boolean;
};

export const queueApi = {
  status: () => apiFetch<QueueStatus>('/queue/status'),
};

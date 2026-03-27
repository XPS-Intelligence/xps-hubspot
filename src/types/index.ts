import { z } from 'zod';

// ─── Scrape Job ──────────────────────────────────────────────────────────────

export const ScrapeJobSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  type: z.enum(['company', 'contact', 'event', 'custom']),
  priority: z.number().int().min(1).max(10).default(5),
  maxRetries: z.number().int().min(0).max(5).default(3),
  timeout: z.number().int().min(5000).max(120000).default(30000),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date().default(() => new Date()),
});

export type ScrapeJob = z.infer<typeof ScrapeJobSchema>;

// ─── Raw Scraped Data ────────────────────────────────────────────────────────

export const RawScrapedDataSchema = z.object({
  jobId: z.string().uuid(),
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  emails: z.array(z.string().email()).default([]),
  phones: z.array(z.string()).default([]),
  companyName: z.string().optional(),
  address: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  socialLinks: z.array(z.string().url()).default([]),
  rawHtml: z.string().optional(),
  scrapedAt: z.date().default(() => new Date()),
  durationMs: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type RawScrapedData = z.infer<typeof RawScrapedDataSchema>;

// ─── Normalized Lead ─────────────────────────────────────────────────────────

export const NormalizedLeadSchema = z.object({
  id: z.string().uuid(),
  sourceUrl: z.string().url(),
  companyName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  description: z.string().optional(),
  score: z.number().min(0).max(100).default(0),
  fingerprint: z.string(),
  status: z
    .enum(['pending', 'validated', 'rejected', 'synced', 'duplicate'])
    .default('pending'),
  validationNotes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type NormalizedLead = z.infer<typeof NormalizedLeadSchema>;

// ─── Validation Result ───────────────────────────────────────────────────────

export const ValidationResultSchema = z.object({
  leadId: z.string().uuid(),
  score: z.number().min(0).max(100),
  isValid: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  suggestedFields: z.record(z.string()).optional(),
  validatedAt: z.date().default(() => new Date()),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ─── HubSpot Contact ─────────────────────────────────────────────────────────

export const HubSpotContactSchema = z.object({
  email: z.string().email(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  linkedin_bio: z.string().optional(),
  description: z.string().optional(),
  lead_source: z.string().default('XPS Scraper'),
  xps_score: z.number().optional(),
  xps_source_url: z.string().url().optional(),
});

export type HubSpotContact = z.infer<typeof HubSpotContactSchema>;

// ─── Queue Item ───────────────────────────────────────────────────────────────

export interface QueueItem<T = ScrapeJob> {
  id: string;
  payload: T;
  priority: number;
  attempts: number;
  maxRetries: number;
  enqueuedAt: Date;
  lastAttemptAt?: Date;
  error?: string;
}

// ─── Scrape Result ───────────────────────────────────────────────────────────

export interface ScrapeResult {
  success: boolean;
  jobId: string;
  data?: RawScrapedData;
  error?: string;
  durationMs: number;
  attempts: number;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// ─── Worker Status ───────────────────────────────────────────────────────────

export interface WorkerStatus {
  isRunning: boolean;
  pendingJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  startedAt?: Date;
}

// ─── DB Row Types ─────────────────────────────────────────────────────────────

export interface DbScrapeJob {
  id: string;
  url: string;
  type: string;
  priority: number;
  max_retries: number;
  timeout_ms: number;
  metadata: Record<string, unknown> | null;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface DbLead {
  id: string;
  source_url: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  description: string | null;
  score: number;
  fingerprint: string;
  status: 'pending' | 'validated' | 'rejected' | 'synced' | 'duplicate';
  validation_notes: string | null;
  hubspot_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

export interface DbSeed {
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
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const SeedSchema = z.object({
  url: z.string().url(),
  keywords: z.array(z.string()).default([]),
  key_phrases: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  state: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  industry: z.string().optional(),
  target_intent: z.string().optional(),
  desired_end_result: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export type Seed = z.infer<typeof SeedSchema>;

// ─── Prompt ───────────────────────────────────────────────────────────────────

export interface DbPrompt {
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
}

export const PromptSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  template: z.string().min(1),
  variables: z.array(z.unknown()).default([]),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  version: z.number().int().positive().default(1),
});

export type Prompt = z.infer<typeof PromptSchema>;

// ─── Pipeline Run ─────────────────────────────────────────────────────────────

export interface DbPipelineRun {
  id: string;
  trigger_type: string;
  seed_ids: string[];
  status: string;
  started_at: string | null;
  completed_at: string | null;
  results: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export const PipelineRunSchema = z.object({
  trigger_type: z.enum(['manual', 'scheduled', 'api', 'webhook']),
  seed_ids: z.array(z.string().uuid()).min(1),
  status: z.enum(['pending', 'running', 'completed', 'failed']).default('pending'),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  results: z.record(z.unknown()).optional(),
});

export type PipelineRun = z.infer<typeof PipelineRunSchema>;

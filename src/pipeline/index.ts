import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { RawScrapedData, NormalizedLead } from '../types';
import { createLogger } from '../logger';

const log = createLogger('pipeline');

// ─── Fingerprint ──────────────────────────────────────────────────────────────

/**
 * Creates a deterministic fingerprint for deduplication.
 * Priority: email > (companyName + domain) > url
 */
export function createFingerprint(data: RawScrapedData): string {
  const primaryEmail = data.emails[0]?.toLowerCase().trim();

  if (primaryEmail) {
    return crypto.createHash('sha256').update(`email:${primaryEmail}`).digest('hex').slice(0, 16);
  }

  if (data.companyName) {
    const domain = extractDomain(data.url);
    const key = `company:${data.companyName.toLowerCase().trim()}:${domain}`;
    return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
  }

  const urlNormalized = normalizeUrl(data.url);
  return crypto.createHash('sha256').update(`url:${urlNormalized}`).digest('hex').slice(0, 16);
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, '');
  } catch {
    return url;
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

function parseName(fullName?: string): { firstName?: string; lastName?: string } {
  if (!fullName) return {};
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function computeScore(data: RawScrapedData): number {
  let score = 0;

  if (data.emails.length > 0) score += 30;
  if (data.emails.length > 1) score += 10;
  if (data.companyName) score += 15;
  if (data.phones.length > 0) score += 10;
  if (data.linkedinUrl) score += 15;
  if (data.description && data.description.length > 50) score += 10;
  if (data.address) score += 10;

  // Penalise if the only data we have is a URL
  if (data.emails.length === 0 && !data.companyName) score = Math.max(score - 20, 0);

  return Math.min(score, 100);
}

// ─── Normalize ────────────────────────────────────────────────────────────────

export function normalizeScrapedData(raw: RawScrapedData): NormalizedLead {
  const fingerprint = createFingerprint(raw);
  const score = computeScore(raw);

  // Try to split company name into person name if it looks personal
  const nameGuess = raw.title ? parseName(raw.title) : {};

  return {
    id: uuidv4(),
    sourceUrl: raw.url,
    companyName: raw.companyName,
    firstName: nameGuess.firstName,
    lastName: nameGuess.lastName,
    email: raw.emails[0],
    phone: raw.phones[0] ? normalizePhone(raw.phones[0]) : undefined,
    address: raw.address,
    linkedinUrl: raw.linkedinUrl,
    websiteUrl: raw.websiteUrl,
    description: raw.description,
    score,
    fingerprint,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── Dedupe ───────────────────────────────────────────────────────────────────

/**
 * Deduplicates a list of raw scraped data before persistence.
 * Within a single batch, prefer the item with the higher score.
 */
export function deduplicateBatch(items: RawScrapedData[]): RawScrapedData[] {
  const seen = new Map<string, RawScrapedData>();

  for (const item of items) {
    const fp = createFingerprint(item);
    const existing = seen.get(fp);

    if (!existing || computeScore(item) > computeScore(existing)) {
      seen.set(fp, item);
      log.debug('Dedupe: accepted item', { fp, url: item.url });
    } else {
      log.debug('Dedupe: skipped duplicate', { fp, url: item.url });
    }
  }

  return Array.from(seen.values());
}

// ─── Persist Normalized Lead ─────────────────────────────────────────────────

import { upsertLead, getLeadByFingerprint } from '../db/queries';
import type { DbLead } from '../types';

export async function persistLead(raw: RawScrapedData): Promise<{
  lead: DbLead;
  isDuplicate: boolean;
}> {
  const normalized = normalizeScrapedData(raw);
  const fingerprint = normalized.fingerprint;

  const existing = await getLeadByFingerprint(fingerprint);

  if (existing) {
    log.info('Duplicate lead detected', { fingerprint, existingId: existing.id });
    return { lead: existing, isDuplicate: true };
  }

  const dbLead: Omit<DbLead, 'created_at' | 'updated_at'> = {
    id: normalized.id,
    source_url: normalized.sourceUrl,
    company_name: normalized.companyName ?? null,
    first_name: normalized.firstName ?? null,
    last_name: normalized.lastName ?? null,
    email: normalized.email ?? null,
    phone: normalized.phone ?? null,
    address: normalized.address ?? null,
    linkedin_url: normalized.linkedinUrl ?? null,
    website_url: normalized.websiteUrl ?? null,
    description: normalized.description ?? null,
    score: normalized.score,
    fingerprint,
    status: 'pending',
    validation_notes: null,
    hubspot_contact_id: null,
  };

  const saved = await upsertLead(dbLead);
  log.info('Lead persisted', { id: saved.id, score: saved.score, fingerprint });

  return { lead: saved, isDuplicate: false };
}

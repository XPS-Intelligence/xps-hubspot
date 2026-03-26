import { Client as HubSpotClient } from '@hubspot/api-client';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts/models/Filter';
import { z } from 'zod';
import { config } from '../config';
import { createLogger } from '../logger';
import { updateLeadHubSpotId, updateLeadStatus } from '../db/queries';
import type { DbLead, HubSpotContact } from '../types';
import { HubSpotContactSchema } from '../types';

const log = createLogger('hubspot');

let _hubspot: HubSpotClient | null = null;

function getHubSpot(): HubSpotClient {
  if (!_hubspot) {
    _hubspot = new HubSpotClient({ accessToken: config.HUBSPOT_ACCESS_TOKEN });
    log.debug('HubSpot client initialised');
  }
  return _hubspot;
}

// ─── Schema Validation ────────────────────────────────────────────────────────

function buildContactPayload(lead: DbLead): HubSpotContact {
  const raw: Partial<HubSpotContact> = {
    email: lead.email ?? undefined,
    firstname: lead.first_name ?? undefined,
    lastname: lead.last_name ?? undefined,
    phone: lead.phone ?? undefined,
    company: lead.company_name ?? undefined,
    website: lead.website_url ?? undefined,
    address: lead.address ?? undefined,
    linkedin_bio: lead.linkedin_url ?? undefined,
    description: lead.description?.slice(0, 1000),
    lead_source: 'XPS Scraper',
    xps_score: lead.score,
    xps_source_url: lead.source_url,
  };

  // Validate via Zod — will throw if email is missing/invalid
  return HubSpotContactSchema.parse(raw);
}

// ─── Duplicate Risk Check ─────────────────────────────────────────────────────

async function checkHubSpotDuplicate(email: string): Promise<string | null> {
  const hs = getHubSpot();

  try {
    const response = await hs.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [{ propertyName: 'email', operator: FilterOperatorEnum.Eq, value: email }],
        },
      ],
      properties: ['email', 'firstname', 'lastname'],
      limit: 1,
      after: '0',
      sorts: [],
    });

    if (response.results.length > 0) {
      const existing = response.results[0];
      log.warn('Duplicate HubSpot contact found', {
        email,
        existingId: existing.id,
      });
      return existing.id;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('HubSpot duplicate check failed', { email, error: msg });
    throw new Error(`HubSpot duplicate check failed: ${msg}`);
  }

  return null;
}

// ─── Create / Update Contact ──────────────────────────────────────────────────

export async function syncLeadToHubSpot(lead: DbLead): Promise<string> {
  if (!lead.email) {
    throw new Error(`Lead ${lead.id} has no email; cannot sync to HubSpot`);
  }

  // Validate schema
  let payload: HubSpotContact;
  try {
    payload = buildContactPayload(lead);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`HubSpot payload validation failed: ${msg}`);
    }
    throw err;
  }

  const hs = getHubSpot();

  // Check for duplicate
  const existingId = await checkHubSpotDuplicate(payload.email);

  if (existingId) {
    // Update existing contact
    log.info('Updating existing HubSpot contact', { id: existingId, email: payload.email });

    await hs.crm.contacts.basicApi.update(existingId, {
      properties: payload as unknown as Record<string, string>,
    });

    await updateLeadHubSpotId(lead.id, existingId);
    return existingId;
  }

  // Create new contact
  log.info('Creating new HubSpot contact', { email: payload.email, leadId: lead.id });

  const created = await hs.crm.contacts.basicApi.create({
    properties: payload as unknown as Record<string, string>,
    associations: [],
  });

  await updateLeadHubSpotId(lead.id, created.id);

  log.info('HubSpot contact created', {
    hubspotId: created.id,
    email: payload.email,
    leadId: lead.id,
  });

  return created.id;
}

// ─── Batch Sync ───────────────────────────────────────────────────────────────

export async function syncValidatedLeads(leads: DbLead[]): Promise<{
  synced: number;
  failed: number;
  errors: Array<{ leadId: string; error: string }>;
}> {
  let synced = 0;
  let failed = 0;
  const errors: Array<{ leadId: string; error: string }> = [];

  for (const lead of leads) {
    try {
      await syncLeadToHubSpot(lead);
      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error('Failed to sync lead to HubSpot', { leadId: lead.id, error: msg });
      await updateLeadStatus(lead.id, 'rejected', { validation_notes: `HubSpot sync failed: ${msg}` });
      errors.push({ leadId: lead.id, error: msg });
      failed++;
    }
  }

  log.info('Batch HubSpot sync complete', { synced, failed });
  return { synced, failed, errors };
}

import OpenAI from 'openai';
import { config } from '../config';
import { createLogger } from '../logger';
import type { DbLead, ValidationResult } from '../types';
import { updateLeadStatus } from '../db/queries';

const log = createLogger('validation');

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  return _openai;
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(lead: DbLead): string {
  return `You are a B2B lead quality evaluator for a sales intelligence system.

Evaluate the following scraped lead and return ONLY a valid JSON object with no markdown or extra text.

Lead data:
- Company: ${lead.company_name ?? 'N/A'}
- First name: ${lead.first_name ?? 'N/A'}
- Last name: ${lead.last_name ?? 'N/A'}
- Email: ${lead.email ?? 'N/A'}
- Phone: ${lead.phone ?? 'N/A'}
- Website: ${lead.website_url ?? 'N/A'}
- LinkedIn: ${lead.linkedin_url ?? 'N/A'}
- Description: ${lead.description?.slice(0, 300) ?? 'N/A'}
- Source URL: ${lead.source_url}

Scoring criteria (0-100):
- Valid business email (not gmail/yahoo/etc) = +30
- Phone present = +15
- Company name present = +20
- LinkedIn URL present = +15
- Description non-trivial = +10
- Website URL present = +10

Return JSON:
{
  "score": <0-100>,
  "isValid": <true if score >= ${config.VALIDATION_MIN_SCORE}>,
  "confidence": <0.0-1.0>,
  "reasons": ["reason 1", "reason 2"],
  "suggestedFields": { "fieldName": "correctedValue" }
}`;
}

// ─── Validate Lead ────────────────────────────────────────────────────────────

export async function validateLead(lead: DbLead): Promise<ValidationResult> {
  const openai = getOpenAI();

  log.info('Validating lead with OpenAI', { leadId: lead.id, email: lead.email });

  let raw: string;

  try {
    const completion = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      max_tokens: config.OPENAI_MAX_TOKENS,
      temperature: 0,
      messages: [{ role: 'user', content: buildPrompt(lead) }],
    });

    raw = completion.choices[0]?.message?.content ?? '{}';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('OpenAI API error', { leadId: lead.id, error: msg });
    throw new Error(`OpenAI validation failed: ${msg}`);
  }

  let parsed: {
    score?: number;
    isValid?: boolean;
    confidence?: number;
    reasons?: string[];
    suggestedFields?: Record<string, string>;
  };

  try {
    // Strip any surrounding markdown code fences
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    parsed = JSON.parse(cleaned) as typeof parsed;
  } catch {
    log.error('Failed to parse OpenAI response', { leadId: lead.id, raw });
    throw new Error('OpenAI returned non-JSON response');
  }

  const result: ValidationResult = {
    leadId: lead.id,
    score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 0,
    isValid: parsed.isValid ?? false,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
    suggestedFields: parsed.suggestedFields,
    validatedAt: new Date(),
  };

  log.info('Validation complete', {
    leadId: lead.id,
    score: result.score,
    isValid: result.isValid,
    confidence: result.confidence,
  });

  return result;
}

// ─── Batch Validation ─────────────────────────────────────────────────────────

export async function validateAndPersist(lead: DbLead): Promise<ValidationResult> {
  const result = await validateLead(lead);

  const newStatus = result.isValid ? 'validated' : 'rejected';
  const notes = result.reasons.join('; ');

  await updateLeadStatus(lead.id, newStatus as DbLead['status'], {
    score: result.score,
    validation_notes: notes,
  });

  log.info('Lead status updated after validation', {
    leadId: lead.id,
    newStatus,
    score: result.score,
  });

  return result;
}

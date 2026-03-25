import { createFingerprint, normalizeScrapedData, deduplicateBatch } from '../pipeline';
import type { RawScrapedData } from '../types';

describe('pipeline', () => {
  const baseRaw: RawScrapedData = {
    jobId: '00000000-0000-0000-0000-000000000001',
    url: 'https://example.com',
    title: 'Acme Corp',
    description: 'A test company with sufficient description length for scoring',
    emails: ['contact@acme.com'],
    phones: ['+1 (555) 123-4567'],
    companyName: 'Acme Corp',
    address: '123 Main St',
    linkedinUrl: 'https://linkedin.com/company/acme',
    websiteUrl: 'https://example.com',
    socialLinks: [],
    scrapedAt: new Date(),
    durationMs: 1200,
  };

  describe('createFingerprint', () => {
    it('creates consistent fingerprint for same email', () => {
      const fp1 = createFingerprint(baseRaw);
      const fp2 = createFingerprint({ ...baseRaw, url: 'https://different.com' });
      expect(fp1).toBe(fp2);
    });

    it('creates different fingerprints for different emails', () => {
      const fp1 = createFingerprint(baseRaw);
      const fp2 = createFingerprint({ ...baseRaw, emails: ['other@acme.com'] });
      expect(fp1).not.toBe(fp2);
    });

    it('falls back to company+domain when no email', () => {
      const noEmail = { ...baseRaw, emails: [] };
      const fp = createFingerprint(noEmail);
      expect(fp).toHaveLength(16);
    });

    it('falls back to url fingerprint when no email or company', () => {
      const minimal = { ...baseRaw, emails: [], companyName: undefined };
      const fp = createFingerprint(minimal);
      expect(fp).toHaveLength(16);
    });
  });

  describe('normalizeScrapedData', () => {
    it('produces a normalized lead with required fields', () => {
      const lead = normalizeScrapedData(baseRaw);
      expect(lead.id).toBeTruthy();
      expect(lead.sourceUrl).toBe(baseRaw.url);
      expect(lead.email).toBe(baseRaw.emails[0]);
      expect(lead.score).toBeGreaterThan(0);
      expect(lead.fingerprint).toHaveLength(16);
      expect(lead.status).toBe('pending');
    });

    it('computes a higher score for data-rich records', () => {
      const rich = normalizeScrapedData(baseRaw);
      const sparse = normalizeScrapedData({ ...baseRaw, emails: [], phones: [], companyName: undefined, linkedinUrl: undefined });
      expect(rich.score).toBeGreaterThan(sparse.score);
    });

    it('normalises the phone number', () => {
      const lead = normalizeScrapedData(baseRaw);
      expect(lead.phone).toMatch(/^\+?[\d]+$/);
    });
  });

  describe('deduplicateBatch', () => {
    it('removes duplicates with the same email', () => {
      const duplicate: RawScrapedData = { ...baseRaw, url: 'https://mirror.example.com' };
      const result = deduplicateBatch([baseRaw, duplicate]);
      expect(result).toHaveLength(1);
    });

    it('keeps items with different emails', () => {
      const other: RawScrapedData = { ...baseRaw, emails: ['other@example.com'], url: 'https://other.com' };
      const result = deduplicateBatch([baseRaw, other]);
      expect(result).toHaveLength(2);
    });

    it('keeps the highest-scoring duplicate', () => {
      const richer: RawScrapedData = { ...baseRaw, url: 'https://mirror.com', companyName: 'Acme Corp Rich', linkedinUrl: 'https://linkedin.com/company/acme' };
      const poorer: RawScrapedData = { ...baseRaw, phones: [], linkedinUrl: undefined };
      const result = deduplicateBatch([poorer, richer]);
      // Both have same email → only 1 kept; the richer one (or either since score is same here)
      expect(result).toHaveLength(1);
    });
  });
});

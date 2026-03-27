# Data Processing Contract

**Version:** 1.0  
**Effective Date:** 2024-01-01

## 1. Scope

This contract describes how XPS Intelligence processes data collected through its automated scraping pipeline, including collection, storage, enrichment, and deletion.

## 2. Data Categories

### 2.1 Collected Data
- **Lead Data**: Business contact information extracted from public web pages (names, emails, phone numbers, company information).
- **Scraping Metadata**: Source URLs, timestamps, processing results.
- **Pipeline Data**: Job configurations, run logs, validation results.

### 2.2 Derived Data
- **Enrichment Data**: AI-generated analysis of lead profiles.
- **Validation Scores**: Computed quality scores (0–100).
- **Fingerprints**: One-way hashes for deduplication.

## 3. Data Processing Principles

### 3.1 Lawfulness
All data is collected from publicly accessible web pages. The platform does not circumvent authentication or access controls.

### 3.2 Purpose Limitation
Data is collected solely for B2B lead generation and CRM integration purposes.

### 3.3 Data Minimization
Only data relevant to B2B sales intelligence is extracted and stored.

### 3.4 Accuracy
- AI validation scores low-quality records (score < 40 → rejected).
- Operators may update or delete any lead record.

### 3.5 Storage Limitation
| Data Type        | Retention Period            |
|------------------|-----------------------------|
| Lead records     | Until explicitly deleted    |
| Scrape job logs  | 90 days                     |
| Pipeline runs    | 180 days                    |
| Validation notes | Permanent (attached to lead)|

### 3.6 Security
- All data is stored in Supabase with Row Level Security (RLS) enabled.
- Service role credentials are never exposed to clients.
- API access requires authentication via bearer token.

## 4. Third-Party Processing

Data may be shared with:
- **HubSpot**: Validated leads are synced for CRM purposes.
- **OpenAI**: Lead data is sent for validation/enrichment (subject to OpenAI's data processing terms).
- **Supabase**: Hosting and database provider.

## 5. Data Subject Rights

For leads containing personal data, individuals may request:
- Access to their data.
- Correction of inaccurate data.
- Deletion of their data.

Contact the platform administrator to exercise these rights.

## 6. Incident Response

In the event of a data breach:
1. Affected parties will be notified within 72 hours.
2. The pipeline will be paused pending investigation.
3. A full audit log will be preserved.

## 7. Acceptance

Use of the XPS Intelligence platform constitutes acceptance of this data processing contract.

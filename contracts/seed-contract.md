# Seed Data Entry Contract

**Version:** 1.0  
**Effective Date:** 2024-01-01

## 1. Purpose

This contract governs the entry, management, and use of seed data within the XPS Intelligence platform. Seeds are target URLs and associated metadata used to drive automated lead scraping operations.

## 2. Definitions

- **Seed**: A URL and associated configuration used as a scraping target.
- **Operator**: The individual or organization entering seed data.
- **Pipeline**: The automated scraping and lead processing workflow.

## 3. Seed Data Requirements

### 3.1 Required Fields
- `url`: Must be a valid, publicly accessible URL.

### 3.2 Optional but Recommended Fields
- `keywords`: Relevant keywords to guide extraction (max 20 per seed).
- `key_phrases`: Intent phrases to match against content.
- `categories`: Business category classifications.
- `industry`: Target industry vertical.
- `target_intent`: Specific intent signal to detect (e.g., "hiring", "fundraising").
- `desired_end_result`: Expected output from processing this seed.

### 3.3 Geographic Fields
- `state`, `city`, `zip`: Geographic targeting parameters.

## 4. Operator Responsibilities

### 4.1 Legal Compliance
Operators must ensure:
- Target URLs are publicly accessible and not behind authentication.
- Scraping the target URL does not violate the site's Terms of Service.
- Collected data complies with applicable data protection laws (GDPR, CCPA, etc.).
- Seeds do not target protected classes of individuals.

### 4.2 Data Quality
Operators are responsible for:
- Providing accurate and relevant seed configurations.
- Removing seeds that consistently produce low-quality leads.
- Updating seed metadata when targeting parameters change.

## 5. Prohibited Seeds

The following seed types are strictly prohibited:
- Personal social media profiles without explicit consent.
- URLs containing personally identifiable information (PII) in query parameters.
- Sites that explicitly prohibit automated access (robots.txt disallowed).
- Government, healthcare, or financial institution sites that restrict data collection.

## 6. Seed Lifecycle

| Status   | Description                                    |
|----------|------------------------------------------------|
| `active` | Seed is queued for scraping in the next cycle  |
| `inactive`| Seed is paused; will not be scraped            |
| `archived`| Seed is retained for records but not processed |

## 7. Data Retention

Seed data is retained indefinitely unless explicitly deleted. Deletion of a seed does not delete leads already generated from it.

## 8. Modifications

Seeds may be modified at any time. Changes take effect on the next pipeline run.

## 9. Acceptance

By submitting a seed to the XPS Intelligence platform, the Operator agrees to the terms of this contract.

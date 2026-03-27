# API Usage Contract

**Version:** 1.0  
**Base URL:** `https://{host}/api/v1`  
**Authentication:** Bearer token in `Authorization` header

## 1. Authentication

All API endpoints (except `/health`) require authentication:

```http
Authorization: Bearer <your-api-token>
```

Tokens are obtained through the Supabase authentication flow.

## 2. Rate Limits

| Tier        | Requests/minute | Burst |
|-------------|-----------------|-------|
| Default     | 60              | 10    |
| Scrape jobs | 10              | 3     |
| HubSpot sync| 5               | 1     |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## 3. Response Format

All responses follow the `ApiResponse<T>` envelope:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "message": "Optional human-readable message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 4. Endpoints

### 4.1 Health
```
GET /health
```
No authentication required.

### 4.2 Seeds
```
GET    /seeds              # List seeds (paginated)
POST   /seeds              # Create seed
PUT    /seeds/:id          # Update seed
DELETE /seeds/:id          # Delete seed
POST   /seeds/:id/dispatch # Dispatch pipeline for seed
```

Query parameters for `GET /seeds`:
- `page` (default: 1)
- `pageSize` (default: 20, max: 100)
- `q` (search query)
- `status` (active|inactive|archived)

### 4.3 Leads
```
GET /leads                        # List leads (paginated)
POST /hubspot/sync                # Bulk sync validated leads
POST /hubspot/sync/:leadId        # Sync single lead
```

### 4.4 Jobs
```
POST /jobs                        # Submit scrape job
GET  /jobs                        # List pending jobs
```

### 4.5 Prompts
```
GET    /prompts           # List prompts
POST   /prompts           # Create prompt
PUT    /prompts/:id       # Update prompt
DELETE /prompts/:id       # Delete prompt
```

### 4.6 Dispatch
```
POST /dispatch                    # Trigger pipeline run
GET  /dispatch/runs               # List pipeline runs
GET  /dispatch/runs/:id           # Get specific run
```

## 5. Error Codes

| Status | Description                          |
|--------|--------------------------------------|
| 400    | Validation error – check request body |
| 401    | Missing or invalid authentication     |
| 403    | Insufficient permissions              |
| 404    | Resource not found                    |
| 409    | Conflict (e.g., duplicate name)       |
| 429    | Rate limit exceeded                   |
| 500    | Internal server error                 |

## 6. Pagination

List endpoints return:
```json
{
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

## 7. Versioning

This is API version 1 (`/api/v1`). Breaking changes will be released under a new version prefix with a minimum 90-day deprecation notice.

## 8. SLA

- Uptime: 99.5% monthly
- Response time: p99 < 2000ms for read operations, p99 < 5000ms for scrape jobs
- Support: GitHub Issues

## 9. Acceptable Use

The API may not be used to:
- Circumvent rate limits via multiple accounts.
- Scrape sites that prohibit automated access.
- Process sensitive personal data categories (health, financial, biometric).
- Spam or harass individuals whose data is returned.

Violation of this contract may result in immediate account suspension.

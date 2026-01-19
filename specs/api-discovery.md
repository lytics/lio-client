# Lytics API Reference

## Overview

The Lytics Management and Delivery APIs provide programmatic access to workflow orchestration, content enrichment, and schema introspection.

**Base URL:** `https://api.lytics.io`  
**API Version:** v2  
**Authentication:** Query parameter  
**Response Format:** JSON (envelope pattern)  
**Protocol:** HTTPS only

## Quick Start

```typescript
// All requests require API key as query parameter
GET /v2/job?key=YOUR_API_KEY

// Standard response envelope (all v2 endpoints)
{
  "data": <resource>,
  "status": 200,
  "request_id": "trace-uuid"
}
```

## Authentication

All API requests authenticate via query parameter:

```http
?key=<your-api-key>
```

**Note:** Header-based authentication (e.g., `Authorization: Bearer`) is not supported. The API key must be provided as a query parameter on every request.

---

## Resources

### Workflows

Workflow jobs execute data pipelines for content ingestion and enrichment.

#### List Workflow Jobs

```http
GET /v2/job
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workflow` | string | No | Filter by workflow type (kebab-case, e.g., `contentstack-import`) |
| `show_all` | boolean | No | Include jobs in all states |
| `key` | string | Yes | API authentication key |

**Response:**

```typescript
interface WorkflowListResponse {
  data: Array<{
    id: string;
    name: string;
    workflow: string;        // snake_case in response
    status: 'sleeping' | 'running' | 'completed' | 'failed';
    updated: string;         // ISO 8601 timestamp
    config: {
      url?: string;
      content_types?: string[];
      continuous_update?: boolean;
      enrich?: boolean;
      [key: string]: unknown;
    };
  }>;
  status: number;
  request_id: string;
}
```

**Example:**

```bash
curl "https://api.lytics.io/v2/job?workflow=contentstack-import&key=YOUR_API_KEY"
```

**Important:** Query parameter uses `kebab-case` (e.g., `contentstack-import`), but response `workflow` field uses `snake_case` (e.g., `contentstack_import`).

#### Get Workflow Job

```http
GET /v2/job/{id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Workflow job ID |

**Response:**

```typescript
interface WorkflowResponse {
  data: {
    id: string;
    name: string;
    workflow: string;
    status: string;
    updated: string;
    config: Record<string, unknown>;
  };
  status: number;
  request_id: string;
}
```

#### Get Workflow Logs

```http
GET /v2/job/logs
GET /v2/job/{id}/logs
```

Returns log entries for all jobs or a specific job.

**Response:**

```typescript
interface WorkflowLogsResponse {
  data: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    job_id?: string;
  }>;
  status: number;
  request_id: string;
}
```

---

### Content

Query and retrieve content entities enriched with Lytics data.

#### Get Content by URL

```http
GET /v2/content/entity
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Content URL (protocol optional) |
| `key` | string | Yes | API authentication key |

**Response:**

```typescript
interface ContentEntityResponse {
  data: {
    entity: {
      url: string;                          // Normalized (no protocol)
      hashedurl: string[];                  // URL hash for matching
      lytics: Record<string, number>;       // Topics map (topic → score)
      title: string | null;
      author: string | null;
      description: string | null;
      body: string | null;
      created: string | null;
      _created: string;                     // ISO 8601
      _modified: string;                    // ISO 8601
      _segments: string[];                  // Segment membership
      contentstack_uid: string | null;      // CMS UID (if synced)
      [key: string]: unknown;
    };
    fragments: unknown[];
    keys: string[];
  };
  status: number;
  request_id: string;
}
```

**Example:**

```bash
# With protocol
curl "https://api.lytics.io/v2/content/entity?url=https://example.com/blog/post&key=YOUR_API_KEY"

# Without protocol (recommended)
curl "https://api.lytics.io/v2/content/entity?url=example.com/blog/post&key=YOUR_API_KEY"
```

**Key Fields:**

- `lytics` - Topics extracted from content, scored by relevance (0-1)
- `url` - Normalized URL (protocol stripped)
- `hashedurl` - Content fingerprint for deduplication
- `_segments` - Lytics segments this content belongs to
- `contentstack_uid` - CMS identifier (may be null if not synced)

#### Query Content by LQL

```http
POST /api/segment/scan
```

Execute ad-hoc LQL queries for bulk content retrieval.

**Request Body:**

```typescript
interface SegmentScanRequest {
  ql: string;      // LQL query (e.g., "FROM content LIMIT 100")
  key: string;     // API key
}
```

**Response:**

```typescript
interface SegmentScanResponse {
  data: Array<{
    url: string;
    lytics: Record<string, number>;
    [key: string]: unknown;
  }>;
  cursor?: string;  // Pagination cursor (if available)
  status: number;
  request_id: string;
}
```

**Example:**

```bash
curl -X POST "https://api.lytics.io/api/segment/scan" \
  -H "Content-Type: application/json" \
  -d '{
    "ql": "FROM content WHERE EXISTS url LIMIT 100",
    "key": "YOUR_API_KEY"
  }'
```

**Use Cases:**
- Bulk content queries (100+ entries)
- Stream-based filtering (e.g., `WHERE stream='contentstack'`)
- Efficient batch enrichment

---

### Schema

Introspect data table schemas and field definitions.

#### Get All Schemas

```http
GET /v2/schema
```

Returns schemas for all tables (user, content, etc.).

#### Get Content Schema

```http
GET /v2/schema/content
```

**Response:**

```typescript
interface SchemaResponse {
  data: {
    name: string;
    fields: Array<{
      id: string;
      type: string;           // 'string', 'number', 'map[string]float64', etc.
      description?: string;
    }>;
  };
  status: number;
  request_id: string;
}
```

**Key Content Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `contentstack_uid` | string | CMS entry identifier |
| `url` | string | Content URL |
| `hashedurl` | string | URL fingerprint |
| `lytics` | map[string]float64 | Topics map |
| `title` | string | Content title |
| `author` | string | Content author |
| `body` | string | Content body text |
| `created` | string | Creation timestamp |

#### Get User Schema

```http
GET /v2/schema/user
```

Returns user table schema with audience fields.

---

## Response Patterns

### Envelope Structure

All v2 endpoints return a consistent envelope:

```typescript
interface ApiResponse<T> {
  data: T;              // Resource data
  status: number;       // HTTP status code (duplicates HTTP status)
  request_id: string;   // Correlation ID for support/debugging
}
```

### Error Responses

```typescript
interface ApiError {
  error: string;        // Error message
  status: number;       // HTTP status code
  request_id: string;   // Correlation ID
}
```

**Common Status Codes:**

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 401 | Unauthorized | Missing or invalid API key |
| 404 | Not Found | Resource does not exist |
| 405 | Method Not Allowed | Incorrect HTTP verb |
| 500 | Internal Server Error | Server-side error |

---

## API Versioning

### V2 API (Current)

- Base path: `/v2/*`
- Envelope response format
- Query parameter authentication
- RESTful resource design

### Legacy API

Some older endpoints remain available:

```http
GET /api/content/doc
GET /api/segment/scan
```

These use different response formats and may be deprecated in future versions.

---

## Rate Limits & Constraints

### Rate Limiting

Rate limits are not publicly documented. Monitor response headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

Implement exponential backoff for 429 responses.

### Pagination

Most endpoints do not yet support pagination. For bulk queries:
- Use `/api/segment/scan` with LQL `LIMIT` clauses
- Process results in batches of 100

### Known Limitations

1. **contentstack_uid field:** Present in schema but may be null in actual content
2. **URL matching:** Only URL-based queries supported; UID-based queries return 404
3. **Workflow filtering:** Query param requires kebab-case, response uses snake_case

---

## Best Practices

### URL Normalization

The Content API normalizes URLs by stripping protocols. For consistency:

```typescript
// Recommended: strip protocol before querying
const normalized = url.replace(/^https?:\/\//, '');
const result = await fetch(`/v2/content/entity?url=${normalized}&key=${apiKey}`);
```

### Workflow Naming

Query parameters use kebab-case, but responses use snake_case:

```typescript
// Query with kebab-case
GET /v2/job?workflow=contentstack-import

// Response has snake_case
{ "workflow": "contentstack_import" }
```

### Error Handling

Always check the envelope `status` field in addition to HTTP status:

```typescript
const response = await fetch(url);
const data = await response.json();

if (!response.ok || data.status !== 200) {
  console.error(`Error ${data.status}: ${data.error}`);
  // Log request_id for support
  console.error(`Request ID: ${data.request_id}`);
}
```

### Caching Strategy

Recommended TTLs by resource:

| Resource | TTL | Rationale |
|----------|-----|-----------|
| Workflows | 30s | Status changes frequently |
| Content | 5min | Content updates are batched |
| Schema | 1hr | Schema rarely changes |

---

## SDK Implementation Notes

This API reference supports the `@lytics/lio-client` TypeScript SDK:

- **Core package:** Generic API access (workflows, content, schema)
- **Plugins:** Resource-specific methods and helpers
- **Transport:** Automatic key injection, envelope unwrapping, error handling

See [`architecture.md`](./architecture.md) for SDK design patterns.

---

## References

- [Lytics API Documentation](https://learn.lytics.com/api-docs) - Official API docs
- [go-lytics SDK](https://github.com/lytics/go-lytics) - Official Go client (reference implementation)
- [Lytics Query Language (LQL)](https://learn.lytics.com/documentation/developer/apis/lql) - Query syntax for segment scans

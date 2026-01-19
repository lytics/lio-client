---
paths:
  - "packages/core/src/plugins/**/*"
---

# Lytics API Patterns

## Authentication

**Query parameter** (not Bearer token):

```typescript
// ✅ Correct
const url = `/v2/job?key=${apiKey}`;

// ❌ Wrong
headers: { 'Authorization': `Bearer ${apiKey}` }
```

## Response Envelope

**All `/v2` endpoints use**:

```typescript
interface LyticsResponse<T> {
  data: T;              // Actual data
  status: number;       // HTTP status
  request_id: string;   // Trace ID
}
```

```typescript
// Example response
{
  "data": [{ "id": "123", "workflow": "contentstack_import" }],
  "status": 200,
  "request_id": "abc-def-123"
}
```

## Base URL

```typescript
const DEFAULT_BASE_URL = 'https://api.lytics.io';
```

## Core Endpoints

### Workflows API

**List jobs**:
```typescript
GET /v2/job?workflow=contentstack-import&key=xxx
```

**Get logs**:
```typescript
GET /v2/job/:id/logs?key=xxx
```

**Naming quirk**: Query param uses `kebab-case`, response uses `snake_case`:
```typescript
// Query: contentstack-import
// Response: contentstack_import
```

### Content API

**Get by URL**:
```typescript
GET /v2/content/entity?url=example.com/blog&key=xxx
```

**Normalization**: Strip protocol from URL:
```typescript
// ✅ Correct
const url = 'example.com/blog/post';

// ❌ Wrong
const url = 'https://example.com/blog/post';
```

**Topics location**: In `entity.lytics` field (NOT `entity.topics`):
```typescript
const topics = response.data.entity.lytics; // { "AI": 0.95 }
```

**Scan all content** (batch queries):
```typescript
POST /api/segment/scan?limit=100&key=xxx
Content-Type: text/plain

FILTER EXISTS hashedurl
FROM content
```

Returns paginated results with `next` cursor.

### Schema API

```typescript
GET /v2/schema/content?key=xxx
GET /v2/schema/user?key=xxx
```

## Error Handling

**Non-200 responses**:
```typescript
{
  "status": 404,
  "message": "Entity not found",
  "request_id": "abc-123"
}
```

**Handle gracefully**:
```typescript
async function get(url: string) {
  const response = await transport.get(url);
  
  if (response.status !== 200) {
    throw new Error(`API error: ${response.message}`);
  }
  
  return response.data;
}
```

## Rate Limiting

**Respect rate limits**:
- `/api/segment/size`: 1 request per 10 seconds
- Most other endpoints: Reasonable concurrency

## Tested Patterns

See `/Users/prosseng/workspace/lytics-e2e-dashboard/scripts/test-lio-api.ts` for:
- Working endpoint examples
- Expected response formats
- Authentication patterns
- Error cases

## Related Documentation

- [Lytics API Docs](https://learn.lytics.com/api-docs) - Official reference
- [go-lytics](https://github.com/lytics/go-lytics) - Go SDK patterns
- Private notes: `/Users/prosseng/workspace/notes/projects/marketplace/lio-api-discovery.md`

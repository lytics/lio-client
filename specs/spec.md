# Technical Specification

**Package:** `@lytics/lio-client`  
**Document Type:** Technical Specification  
**Audience:** Engineering Team  
**Status:** Ready for Implementation  
**Last Updated:** 2026-01-19

---

## Overview

JavaScript/TypeScript SDK for the Lytics API with a plugin-based architecture for extensibility.

**Problem Solved:** No JavaScript/TypeScript SDK exists for Lytics API (Go SDK available, but no JS/TS equivalent).

**Solution Approach:** Generic core SDK for API access, extensible via plugins for specific integrations.

**Target Users:** Integration developers, Contentstack marketplace app builders, automation script authors.

---

## Core Capabilities

### Generic API Access

```typescript
import { createLioClient } from '@lytics/lio-client';

const lio = createLioClient({ apiKey: 'xxx' });

// Workflow orchestration
await lio.workflows.list();
await lio.workflows.get('job-id');

// Content enrichment
await lio.content.getByUrl('example.com/blog/post');

// Schema introspection
await lio.schema.get('content');
```

### Plugin Extensibility

```typescript
import { contentstackPlugin } from '@lytics/lio-client-contentstack';

const lio = createLioClient({
  apiKey: 'xxx',
  plugins: [contentstackPlugin()]
});

// CMS-specific methods added by plugin
const enriched = await lio.contentstack.enrich(blogPost);
```

### Type Safety

```typescript
interface WorkflowListResponse {
  data: Array<{
    id: string;
    name: string;
    workflow: string;
    status: 'sleeping' | 'running' | 'completed' | 'failed';
  }>;
}

const workflows = await lio.workflows.list<WorkflowListResponse>();
```

### Universal Runtime

Works in browser, Node.js, edge functions, and serverless environments without modification.

---

## Design Constraints

### What This SDK Does

- Generic Lytics API access (workflows, content, schema, segments)
- Plugin architecture for extensibility
- Type-safe with full TypeScript support
- Universal runtime compatibility

### What This SDK Does NOT Do

- User tracking/analytics (use jstag)
- Full Lytics platform replacement
- CMS-specific features in core (use plugins)
- Real-time personalization

**Design Philosophy:** Generic core, specific via plugins.

---

## Functional Requirements

### Core API Methods

#### Workflows

```typescript
interface WorkflowsAPI {
  list(options?: {
    workflow?: string;
    show_all?: boolean;
  }): Promise<WorkflowListResponse>;
  
  get(id: string): Promise<WorkflowResponse>;
  
  getLogs(id?: string): Promise<WorkflowLogsResponse>;
}
```

**Status:** API tested and documented.

#### Content

```typescript
interface ContentAPI {
  getByUrl(url: string): Promise<ContentEntityResponse>;
  
  scan(options?: {
    filter?: string;
    limit?: number;
    fields?: string[];
  }): AsyncGenerator<ContentEntity[]>;
}
```

**Status:** API tested. `scan()` method uses `/api/segment/scan` with LQL.

**Note:** See [Architecture Guide](./architecture.md) for `scan()` implementation details.

#### Schema

```typescript
interface SchemaAPI {
  get(table: 'content' | 'user'): Promise<SchemaResponse>;
}
```

**Status:** API tested and documented.

### Plugin API Example

```typescript
// Contentstack-specific enrichment
interface ContentstackAPI {
  getSyncStatus(): Promise<WorkflowResponse>;
  
  enrich<T>(entry: T): Promise<T & { _lytics: LyticsData }>;
  
  enrichMany<T>(entries: T[]): Promise<Array<T & { _lytics: LyticsData }>>;
}
```

**Status:** Designed. Awaiting core implementation.

---

## Technical Requirements

### Authentication

**Method:** Query parameter authentication.

```http
GET /v2/job?key=YOUR_API_KEY
```

**Note:** Header-based authentication (e.g., `Authorization: Bearer`) is not supported by the API.

### Response Handling

All v2 endpoints return an envelope:

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  request_id: string;
}
```

**Transport Layer Responsibility:** Automatically unwrap `data` field and provide `request_id` for error logging.

### Topics Extraction

Topics are stored in `entity.lytics`, not `entity.topics`:

```typescript
const response = await lio.content.getByUrl('example.com/blog');
const topics = response.entity.lytics; // { "AI": 1, "Playwright": 0.8 }
```

**Plugin Responsibility:** Extract and normalize topics field.

### URL Normalization

Content API strips protocols from URLs:

```typescript
// Recommended: normalize before querying
const normalized = url.replace(/^https?:\/\//, '');
await lio.content.getByUrl(normalized);
```

**Transport Layer Responsibility:** Normalize URLs consistently.

---

## API Patterns

**Note:** See [API Reference](./api-discovery.md) for complete endpoint documentation.

### Discovered Endpoints

| Endpoint | Method | Status |
|----------|--------|--------|
| `/v2/job` | GET | Tested |
| `/v2/job/{id}` | GET | Tested |
| `/v2/job/logs` | GET | Tested |
| `/v2/content/entity` | GET | Tested |
| `/api/segment/scan` | POST | Tested |
| `/v2/schema` | GET | Tested |
| `/v2/schema/{table}` | GET | Tested |

### Response Envelope

All v2 endpoints use consistent envelope format. Transport plugin must:
1. Unwrap `data` field automatically
2. Preserve `request_id` for debugging
3. Check envelope `status` in addition to HTTP status

### Error Handling

Common error status codes:

| Code | Meaning | Action |
|------|---------|--------|
| 401 | Unauthorized | Check API key |
| 404 | Not Found | Resource does not exist |
| 405 | Method Not Allowed | Check HTTP verb |
| 429 | Rate Limited | Retry with backoff |
| 500 | Server Error | Retry with backoff |

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Transport Plugin:**
- Add `?key=` query parameter to all requests
- Unwrap response envelope (`data` field)
- Handle errors gracefully
- Implement retry logic (429, 5xx)

**Build Tooling:**
- Monorepo setup (pnpm workspaces, Turborepo)
- TypeScript configuration
- tsup for bundling
- Vitest for testing

**Type Definitions:**
- Define core interfaces
- Generate from API responses
- Preserve type safety through plugin chain

### Phase 2: Core Plugins (Week 2)

**Workflows Plugin:**
- Implement `/v2/job` endpoints
- Handle kebab-case workflow names
- Type-safe responses

**Content Plugin:**
- Implement `/v2/content/entity` endpoint
- Extract topics from `entity.lytics`
- URL normalization
- Implement `scan()` using `/api/segment/scan`

**Schema Plugin:**
- Implement `/v2/schema/{table}` endpoint
- Cache schema responses (1hr TTL)

### Phase 3: Contentstack Plugin (Week 3)

**Sync Status:**
```typescript
await lio.contentstack.getSyncStatus();
```

**Single Entry Enrichment:**
```typescript
await lio.contentstack.enrich(entry);
```

**Batch Enrichment:**
```typescript
await lio.contentstack.enrichMany(entries);
// Use scan() for efficient bulk queries (100+ entries)
```

### Phase 4: Integration & Testing (Week 4)

- Integrate with marketplace app
- End-to-end enrichment testing
- Type safety validation
- Performance benchmarking
- Documentation writing

---

## Architecture Overview

**Note:** See [Architecture Guide](./architecture.md) for detailed plugin patterns.

### Package Structure

```
@lytics/lio-client (monorepo)
├── packages/
│   ├── core/                 # Core SDK
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── plugins/
│   │   │   │   ├── workflows.ts
│   │   │   │   ├── content.ts
│   │   │   │   └── schema.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   └── contentstack/         # Contentstack plugin
│       ├── src/
│       │   ├── plugin.ts
│       │   └── types.ts
│       └── package.json
└── specs/                    # Documentation
```

### Plugin Design Pattern

```typescript
// SDK Kit functional plugin pattern
export function workflowsPlugin(plugin, instance, config) {
  plugin.ns('workflows');
  
  plugin.expose({
    async list(options) {
      return await instance.transport.get('/v2/job', options);
    }
  });
}
```

### Bridge Pattern

Users maintain existing CMS SDK usage; lio-client adds enrichment layer:

```typescript
// Existing CMS code (unchanged)
const posts = await cmsStack.contentType('blog_post').query().find();

// Add Lytics enrichment (new)
const enriched = await lio.contentstack.enrichMany(posts.entries);
```

**Design Rationale:** Non-invasive integration. No CMS SDK modifications required.

---

## Success Criteria

### MVP Success Indicators

| Criterion | Validation Method |
|-----------|-------------------|
| Query workflow status | Integration test |
| Enrich Contentstack entries by URL | Integration test |
| Topics appear in `_lytics` field | Data validation |
| TypeScript types preserve shapes | Type tests |
| Works in browser + Node.js + edge | Runtime tests |

### MVP Blockers

| Blocker | Status | Mitigation |
|---------|--------|-----------|
| Stream query endpoint | Resolved | Use `/api/segment/scan` |
| contentstack_uid null | Open | URL matching workaround |
| Pagination support | Unknown | Test and document |

---

## Non-Functional Requirements

**Note:** See [NFR Document](./nfr.md) for complete specifications.

### Performance

| Requirement | Target | Priority |
|------------|--------|----------|
| Bundle size | <20KB gzipped | P0 |
| API latency overhead | <10ms p95 | P0 |
| Cache hit rate | >80% | P1 |

### Reliability

| Requirement | Target | Priority |
|------------|--------|----------|
| Error rate | <1% | P0 |
| Retry success rate | >95% | P0 |
| Uptime | 99.9% | P1 |

### Security

| Requirement | Priority |
|------------|----------|
| No API keys in client-side bundles | P0 |
| Input sanitization (URL encoding) | P0 |
| Dependency vulnerability scanning | P1 |

---

## Comparison with Related Tools

### vs. jstag

| Feature | jstag | lio-client |
|---------|-------|------------|
| Runtime | Browser only | Universal |
| Direction | Write-only (tracking) | Read-only (enrichment) |
| Use Case | User analytics | Content enrichment |
| Relationship | Complementary | Complementary |

**Conclusion:** No overlap. Both SDKs serve distinct purposes.

### vs. Go SDK

| Feature | go-lytics | lio-client |
|---------|-----------|------------|
| Language | Go | JavaScript/TypeScript |
| Completeness | 10+ modules | Core + plugins (MVP) |
| Architecture | Module-based | Plugin-based |
| Relationship | Reference implementation | JS/TS equivalent |

**Strategy:** Use Go SDK as reference for API patterns and coverage.

---

## Open Issues

### Blockers

1. **contentstack_uid always null:** Why is this field not populated? Impact on matching strategy.

### Questions

1. **Pagination:** How do list endpoints paginate? Are there `limit`, `offset`, `cursor` parameters?
2. **Rate limits:** What are the documented rate limits? Are there burst allowances?
3. **Bulk operations:** Are there batch endpoints for efficiency?

### Action Items

1. Test pagination behavior on all list endpoints
2. Document rate limits and retry strategies
3. Verify contentstack_uid population logic

---

## References

### Documentation

| Document | Purpose |
|----------|---------|
| [Product Requirements](./prd.md) | Business context and success criteria |
| [API Reference](./api-discovery.md) | Complete endpoint documentation |
| [Architecture Guide](./architecture.md) | Plugin design patterns |
| [NFR Document](./nfr.md) | Performance and security specs |

### Code References

| Resource | Location |
|----------|----------|
| SDK Kit Framework | `/Users/prosseng/workspace/sdk-kit` |
| Go SDK (reference) | `https://github.com/lytics/go-lytics` |

---

## Next Steps

### Before Implementation

1. Resolve contentstack_uid population question
2. Test pagination behavior
3. Document rate limits

### Implementation Start

1. Set up monorepo infrastructure
2. Configure build tooling
3. Implement transport plugin
4. Build core plugins (workflows, content, schema)
5. Develop Contentstack plugin
6. Integrate with marketplace app

---

**Document Owner:** Pros Seng  
**Status:** Approved for Implementation  
**Version:** 1.0

# Architecture Guide

**Package:** `@lytics/lio-client`  
**Document Type:** Architecture & Design Patterns  
**Audience:** Senior Engineers, Architects  
**Last Updated:** 2026-01-19

---

## Overview

Plugin-based architecture for the Lytics JavaScript/TypeScript SDK, built on SDK Kit framework with functional composition patterns.

**Design Philosophy:**
- **Minimal Core:** Core SDK handles authentication, transport, and plugin orchestration
- **Plugin Extensibility:** Features added via plugins (workflows, content, schema, CMS integrations)
- **Functional Composition:** Plugins are functions, not classes
- **Type Safety:** Full TypeScript support with generics

---

## Architecture Principles

### 1. Plugin-Based Design

Core SDK is minimal. All features are plugins:

```typescript
// Core provides plugin orchestration
const lio = createLioClient({
  apiKey: 'xxx',
  plugins: [
    workflowsPlugin(),
    contentPlugin(),
    schemaPlugin(),
    contentstackPlugin()
  ]
});
```

### 2. Functional Composition

Plugins are functions that expose methods to SDK instance:

```typescript
export function workflowsPlugin(plugin, instance, config) {
  plugin.ns('workflows');
  
  plugin.expose({
    async list(options) {
      return await instance.transport.get('/v2/job', options);
    }
  });
}
```

### 3. Separation of Concerns

| Layer | Responsibility |
|-------|---------------|
| Transport | HTTP requests, auth, envelope unwrapping |
| Cache | Response caching, TTL management |
| Plugins | Resource-specific logic |
| Client | Plugin orchestration, configuration |

### 4. Minimal Dependencies

**Core Dependencies:**
- SDK Kit (plugin framework)
- cross-fetch (universal fetch polyfill)

**No Other Dependencies:** Keep bundle small and security surface minimal.

### 5. Type Safety

TypeScript strict mode enforced. All public APIs fully typed.

---

## Core Architecture

### Client Initialization

```typescript
import { createLioClient } from '@lytics/lio-client';

const lio = createLioClient({
  apiKey: 'xxx',
  baseUrl: 'https://api.lytics.io',
  plugins: [
    workflowsPlugin(),
    contentPlugin(),
    schemaPlugin()
  ],
  cache: {
    enabled: true,
    ttl: {
      workflows: 30,
      content: 300,
      schema: 3600
    }
  },
  retry: {
    maxAttempts: 3,
    initialDelay: 1000
  }
});
```

### Plugin Registration

SDK Kit manages plugin lifecycle:

1. **Plugin registered** → SDK Kit calls plugin function
2. **Plugin initializes** → Exposes methods to namespace
3. **Methods available** → User calls via `lio.{namespace}.{method}()`
4. **Plugin cleanup** → On SDK disposal (if needed)

---

## Plugin Design Patterns

### Core Plugins (Generic)

Core plugins provide generic Lytics API access. No CMS-specific logic.

#### Workflows Plugin

**Responsibility:** Workflow orchestration and monitoring.

```typescript
export function workflowsPlugin(plugin, instance, config) {
  plugin.ns('workflows');
  
  plugin.expose({
    async list(options) {
      const params = new URLSearchParams();
      if (options?.workflow) {
        // API uses kebab-case in query param
        params.set('workflow', options.workflow);
      }
      if (options?.show_all) {
        params.set('show_all', 'true');
      }
      
      return await instance.transport.get(`/v2/job?${params}`);
    },
    
    async get(id) {
      return await instance.transport.get(`/v2/job/${id}`);
    },
    
    async getLogs(id) {
      const endpoint = id ? `/v2/job/${id}/logs` : '/v2/job/logs';
      return await instance.transport.get(endpoint);
    }
  });
}
```

**Type Definition:**

```typescript
interface WorkflowsPlugin {
  list(options?: {
    workflow?: string;
    show_all?: boolean;
  }): Promise<WorkflowListResponse>;
  
  get(id: string): Promise<WorkflowResponse>;
  
  getLogs(id?: string): Promise<WorkflowLogsResponse>;
}
```

#### Content Plugin

**Responsibility:** Content entity queries and bulk operations.

```typescript
export function contentPlugin(plugin, instance, config) {
  plugin.ns('content');
  
  plugin.expose({
    async getByUrl(url) {
      // Normalize URL (strip protocol)
      const normalized = url.replace(/^https?:\/\//, '');
      
      const response = await instance.transport.get(
        `/v2/content/entity?url=${encodeURIComponent(normalized)}`
      );
      
      // Extract topics from entity.lytics field
      return {
        ...response.entity,
        topics: response.entity.lytics // Topics are in .lytics, not .topics
      };
    },
    
    async *scan(options = {}) {
      const { filter = 'EXISTS hashedurl', limit = 100 } = options;
      
      // Build SegmentQL query
      const ql = `FILTER ${filter}\nFROM content`;
      
      let next = null;
      do {
        const params = new URLSearchParams({ limit: String(limit) });
        if (next) params.set('start', next);
        
        const response = await instance.transport.post(
          `/api/segment/scan?${params}`,
          ql,
          { 'Content-Type': 'text/plain' }
        );
        
        yield response.data;
        next = response.next;
      } while (next);
    }
  });
}
```

**Key Design Decision:** `scan()` method uses async generator for memory-efficient pagination.

**Type Definition:**

```typescript
interface ContentPlugin {
  getByUrl(url: string): Promise<ContentEntity>;
  
  scan(options?: {
    filter?: string;
    limit?: number;
  }): AsyncGenerator<ContentEntity[]>;
}
```

#### Schema Plugin

**Responsibility:** Data model introspection.

```typescript
export function schemaPlugin(plugin, instance, config) {
  plugin.ns('schema');
  
  plugin.expose({
    async get(table) {
      return await instance.transport.get(`/v2/schema/${table}`);
    }
  });
}
```

**Type Definition:**

```typescript
interface SchemaPlugin {
  get(table: 'content' | 'user'): Promise<SchemaResponse>;
}
```

### Integration Plugins (CMS-Specific)

Integration plugins bridge Lytics with specific CMS platforms.

#### Contentstack Plugin

**Responsibility:** Contentstack-specific enrichment and sync monitoring.

```typescript
export function contentstackPlugin(plugin, instance, config) {
  plugin.ns('contentstack');
  
  plugin.expose({
    async getSyncStatus() {
      const jobs = await instance.workflows.list({
        workflow: 'contentstack-import'
      });
      return jobs.data[0]; // First contentstack-import job
    },
    
    async enrich<T>(entry: T) {
      const content = await instance.content.getByUrl(entry.url);
      
      return {
        ...entry,
        _lytics: {
          topics: content.entity.lytics || {},
          hashedurl: content.entity.hashedurl?.[0],
          segments: content.entity._segments || []
        }
      } as T & { _lytics: LyticsData };
    },
    
    async enrichMany<T>(entries: T[]) {
      // Efficient batch enrichment
      if (entries.length > 100) {
        // Use scan() for large batches
        const enriched = [];
        for await (const batch of instance.content.scan()) {
          // Match entries to content by URL
          const urlMap = new Map(batch.map(c => [c.url, c]));
          
          for (const entry of entries) {
            const content = urlMap.get(entry.url.replace(/^https?:\/\//, ''));
            if (content) {
              enriched.push({
                ...entry,
                _lytics: {
                  topics: content.lytics || {},
                  hashedurl: content.hashedurl?.[0],
                  segments: content._segments || []
                }
              });
            }
          }
        }
        return enriched;
      } else {
        // Parallel getByUrl for smaller batches
        return await Promise.all(
          entries.map(entry => this.enrich(entry))
        );
      }
    }
  });
}
```

**Type Definition:**

```typescript
interface ContentstackPlugin {
  getSyncStatus(): Promise<WorkflowResponse>;
  
  enrich<T>(entry: T): Promise<T & { _lytics: LyticsData }>;
  
  enrichMany<T>(entries: T[]): Promise<Array<T & { _lytics: LyticsData }>>;
}
```

**Design Rationale:** Generic `enrich<T>()` preserves CMS SDK types while adding Lytics data.

---

## SDK Kit Integration

### Transport Plugin

Custom transport plugin handles Lytics API patterns:

```typescript
export function lyticsTransport(config) {
  return {
    name: 'lytics-transport',
    
    async request(method, path, options) {
      // 1. Build URL with API key
      const url = new URL(path, config.baseUrl);
      url.searchParams.set('key', config.apiKey);
      
      // 2. Make HTTP request
      const response = await fetch(url.toString(), {
        method,
        headers: options?.headers,
        body: options?.body
      });
      
      // 3. Parse JSON response
      const json = await response.json();
      
      // 4. Handle errors
      if (!response.ok) {
        throw new LioApiError({
          message: json.error || 'API request failed',
          statusCode: response.status,
          requestId: json.request_id,
          details: json
        });
      }
      
      // 5. Unwrap envelope and return data
      return json.data;
    }
  };
}
```

**Responsibilities:**
1. Add API key as query parameter
2. Unwrap response envelope (`data` field)
3. Preserve `request_id` for debugging
4. Throw structured errors

### Cache Plugin

Leverage SDK Kit storage plugin for caching:

```typescript
import { storagePlugin } from '@lytics/sdk-kit-plugins';

const lio = createLioClient({
  apiKey: 'xxx',
  plugins: [
    storagePlugin({
      backend: 'memory',
      ttl: {
        'workflows': 30,      // 30 seconds
        'content': 300,       // 5 minutes
        'schema': 3600        // 1 hour
      },
      keyGenerator: (method, path, options) => {
        // Include query params in cache key
        return `${method}:${path}:${JSON.stringify(options)}`;
      }
    })
  ]
});
```

**Cache Strategy:**
- Resource-specific TTLs
- Query parameter awareness
- Memory backend (default)
- Custom backends supported (Redis, localStorage)

---

## Data Flow

### Enrichment Flow

```
1. User Code
   │
   ├─ const csEntry = await contentstack.entry().findOne();
   │
2. Contentstack SDK returns
   │
   ├─ { uid: 'blt123', title: 'Post', url: 'example.com/blog/post' }
   │
3. lio-client enrichment
   │
   ├─ await lio.contentstack.enrich(csEntry)
   │
4. Lytics API request
   │
   ├─ GET /v2/content/entity?url=example.com/blog/post&key=xxx
   │
5. Transport plugin processing
   │
   ├─ Add API key query param
   ├─ Unwrap { data, status, request_id } envelope
   ├─ Extract entity.lytics for topics
   │
6. Return enriched entry
   │
   └─ {
        ...csEntry,
        _lytics: {
          topics: { 'AI': 0.9, 'Playwright': 0.8 },
          hashedurl: '2237712349271977382',
          segments: ['engaged_users']
        }
      }
```

### Error Flow

```
1. API returns error
   │
   ├─ { "error": "Unauthorized", "status": 401, "request_id": "abc-123" }
   │
2. Transport plugin detects error
   │
   ├─ if (!response.ok) throw new LioApiError(...)
   │
3. Retry plugin intercepts (if retryable)
   │
   ├─ 429 → Retry with exponential backoff
   ├─ 5xx → Retry with exponential backoff
   ├─ 4xx → No retry, propagate error
   │
4. Error bubbles to user code
   │
   └─ catch (error) {
        if (error instanceof RateLimitError) { ... }
        else if (error instanceof ApiError) { ... }
      }
```

---

## Design Patterns

### Bridge Pattern

**Principle:** lio-client adds enrichment on top of existing CMS workflows.

**Why Bridge, Not Wrapper?**

| Pattern | Approach | Pros | Cons |
|---------|----------|------|------|
| **Wrapper** | Replace CMS SDK | Full control | Forces migration, tight coupling |
| **Bridge** | Extend CMS SDK | Non-invasive, flexible | Less control |

**Bridge Implementation:**

```typescript
// ❌ Wrapper approach (tight coupling)
const post = await lio.contentstack.getEntry('blt123');

// ✅ Bridge approach (loose coupling)
const post = await contentstack.entry('blt123').fetch();
const enriched = await lio.contentstack.enrich(post);
```

**Benefits:**
1. Users keep existing CMS SDK code
2. Works with any CMS SDK version
3. Optional enrichment (opt-in per component)
4. Type-safe via generics

### Adapter Pattern

Plugins adapt Lytics API responses to match CMS SDK expectations:

```typescript
// Lytics API returns topics in entity.lytics
const apiResponse = { entity: { lytics: { 'AI': 1 } } };

// Adapter normalizes to expected format
return {
  topics: apiResponse.entity.lytics,
  url: apiResponse.entity.url,
  hashedurl: apiResponse.entity.hashedurl[0]
};
```

### Strategy Pattern

Different batch enrichment strategies based on size:

```typescript
async enrichMany<T>(entries: T[]) {
  if (entries.length > 100) {
    // Strategy 1: Use scan() for large batches
    return await this.enrichViaScan(entries);
  } else {
    // Strategy 2: Parallel getByUrl for small batches
    return await Promise.all(entries.map(e => this.enrich(e)));
  }
}
```

---

## Type Safety

### Generic Enrichment

Preserve CMS SDK types while adding Lytics data:

```typescript
interface EnrichedContent<T> {
  // Original CMS content (spread)
  ...T;
  
  // Lytics enrichment (added)
  _lytics: {
    topics?: Record<string, number>;
    hashedurl?: string;
    segments?: string[];
  };
}

// Type-safe usage
interface BlogPost {
  uid: string;
  title: string;
  url: string;
}

const post: BlogPost = await contentstack.entry().fetch();
const enriched = await lio.contentstack.enrich<BlogPost>(post);

// TypeScript knows all fields
enriched.title;              // ✅ From BlogPost
enriched._lytics.topics;     // ✅ From EnrichedContent
```

### Plugin Type Definitions

```typescript
// Plugin exposes typed methods
declare module '@lytics/lio-client' {
  interface LioClient {
    workflows: WorkflowsPlugin;
    content: ContentPlugin;
    schema: SchemaPlugin;
    contentstack: ContentstackPlugin;
  }
}

// User gets full autocomplete
const lio = createLioClient({ apiKey: 'xxx' });
lio.workflows.   // ← IDE shows: list(), get(), getLogs()
```

---

## Repository Structure

### Monorepo Layout

```
@lytics/lio-client/
├── packages/
│   ├── core/                          # Core SDK
│   │   ├── src/
│   │   │   ├── index.ts              # Public exports
│   │   │   ├── client.ts             # Client factory
│   │   │   ├── plugins/
│   │   │   │   ├── workflows.ts
│   │   │   │   ├── content.ts
│   │   │   │   ├── schema.ts
│   │   │   │   └── transport.ts
│   │   │   ├── types/
│   │   │   │   ├── workflows.ts
│   │   │   │   ├── content.ts
│   │   │   │   └── index.ts
│   │   │   └── errors/
│   │   │       └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── contentstack/                  # Contentstack plugin
│       ├── src/
│       │   ├── index.ts
│       │   ├── plugin.ts
│       │   └── types.ts
│       ├── tests/
│       ├── package.json
│       └── tsconfig.json
│
├── specs/                              # Documentation
│   ├── prd.md
│   ├── spec.md
│   ├── nfr.md
│   ├── architecture.md
│   └── api-discovery.md
│
├── .claude/                            # AI guardrails
├── package.json                        # Root config
├── turbo.json                          # Turborepo config
└── README.md
```

### File Naming Conventions

| File Type | Convention | Example |
|-----------|-----------|---------|
| Plugins | `{name}.plugin.ts` | `workflows.plugin.ts` |
| Types | `{name}.ts` | `workflows.ts` |
| Tests | `{name}.test.ts` | `workflows.test.ts` |
| Errors | `{name}.error.ts` | `api.error.ts` |

---

## Extension Points

### Custom Plugins

Users can create custom plugins:

```typescript
// Custom plugin for WordPress
export function wordpressPlugin(plugin, instance, config) {
  plugin.ns('wordpress');
  
  plugin.expose({
    async enrich(post) {
      const content = await instance.content.getByUrl(post.link);
      return {
        ...post,
        _lytics: {
          topics: content.entity.lytics || {}
        }
      };
    }
  });
}

// Use custom plugin
const lio = createLioClient({
  apiKey: 'xxx',
  plugins: [
    wordpressPlugin()
  ]
});
```

### Custom Transport

Users can override transport behavior:

```typescript
import { createLioClient } from '@lytics/lio-client';

const lio = createLioClient({
  apiKey: 'xxx',
  transport: {
    async request(method, path, options) {
      // Custom logic (e.g., add headers, log requests)
      console.log(`${method} ${path}`);
      
      // Delegate to default transport
      return await defaultTransport.request(method, path, options);
    }
  }
});
```

### Custom Cache Backend

Users can provide custom cache implementation:

```typescript
import { createLioClient } from '@lytics/lio-client';

const lio = createLioClient({
  apiKey: 'xxx',
  cache: {
    enabled: true,
    backend: {
      async get(key) {
        // Fetch from Redis
        return await redis.get(key);
      },
      async set(key, value, ttl) {
        // Store in Redis
        await redis.setex(key, ttl, JSON.stringify(value));
      }
    }
  }
});
```

---

## Performance Considerations

### Bundle Size Optimization

| Technique | Implementation | Impact |
|-----------|---------------|--------|
| Tree-shaking | ESM exports | Unused plugins excluded |
| Lazy loading | Dynamic imports | Plugins loaded on demand |
| Minification | tsup + terser | 30-40% reduction |
| Code splitting | Separate plugin packages | Only load what's needed |

**Example:**

```typescript
// Only load Contentstack plugin if needed
const lio = createLioClient({ apiKey: 'xxx' });

if (needsContentstackIntegration) {
  const { contentstackPlugin } = await import('@lytics/lio-client-contentstack');
  lio.use(contentstackPlugin());
}
```

### Response Time Optimization

| Technique | Implementation | Impact |
|-----------|---------------|--------|
| Caching | Memory cache with TTL | 80%+ cache hit rate |
| Request batching | Queue plugin | Reduce HTTP round-trips |
| Async generators | `scan()` method | Streaming, not buffering |
| Connection pooling | fetch keep-alive | Reuse connections |

---

## Security Considerations

### API Key Protection

```typescript
// ❌ Bad: Hardcoded key exposed in bundle
const lio = createLioClient({ apiKey: 'abc123...' });

// ✅ Good: Key from environment
const lio = createLioClient({ apiKey: process.env.LIO_API_KEY });

// ✅ Good: Server-side only
// pages/api/lytics-proxy.ts
export default async function handler(req, res) {
  const lio = createLioClient({ apiKey: process.env.LIO_API_KEY });
  const data = await lio.workflows.list();
  res.json(data);
}
```

### Input Sanitization

```typescript
// URL encoding
const normalized = url.replace(/^https?:\/\//, '');
const encoded = encodeURIComponent(normalized);

// Prevent injection
const ql = `FILTER ${escapeSegmentQL(userFilter)} FROM content`;
```

---

## Testing Strategy

### Unit Tests

Test individual plugin methods in isolation:

```typescript
describe('workflowsPlugin', () => {
  it('should list workflows', async () => {
    const mockTransport = { get: vi.fn().mockResolvedValue({ data: [] }) };
    const lio = createLioClient({
      apiKey: 'test',
      transport: mockTransport
    });
    
    await lio.workflows.list({ workflow: 'contentstack-import' });
    
    expect(mockTransport.get).toHaveBeenCalledWith(
      '/v2/job?workflow=contentstack-import'
    );
  });
});
```

### Integration Tests

Test plugin interactions with real API:

```typescript
describe('Contentstack enrichment', () => {
  it('should enrich entry with Lytics data', async () => {
    const lio = createLioClient({ apiKey: process.env.TEST_API_KEY });
    
    const entry = { uid: 'blt123', url: 'example.com/blog/post' };
    const enriched = await lio.contentstack.enrich(entry);
    
    expect(enriched._lytics).toBeDefined();
    expect(enriched._lytics.topics).toBeInstanceOf(Object);
  });
});
```

---

## References

| Document | Purpose |
|----------|---------|
| [Product Requirements](./prd.md) | Business context |
| [Technical Specification](./spec.md) | Implementation guide |
| [API Reference](./api-discovery.md) | Endpoint documentation |
| [NFR Document](./nfr.md) | Performance & security specs |

**External References:**
- [SDK Kit Documentation](https://github.com/lytics/sdk-kit)
- [Go SDK (reference)](https://github.com/lytics/go-lytics)
- [Lytics API Docs](https://learn.lytics.com/api-docs)

---

**Document Owner:** Architecture Team  
**Status:** Approved  
**Version:** 1.0

# Non-Functional Requirements

**Package:** `@lytics/lio-client`  
**Document Type:** Non-Functional Requirements  
**Audience:** Engineering, QA, Architecture  
**Last Updated:** 2026-01-19

---

## Overview

Performance, reliability, security, and usability requirements for the lio-client SDK.

**Scope:** Requirements apply to core package and all official plugins unless otherwise specified.

---

## Performance Requirements

### Bundle Size

| Component | Target (Gzipped) | Priority | Validation Method |
|-----------|------------------|----------|-------------------|
| Core SDK | <10KB | P0 | Bundle analysis |
| Core + Essential Plugins | <20KB | P0 | Bundle analysis |
| Full Package | <50KB | P1 | Bundle analysis |

**Implementation Strategy:**
- Lazy-load plugins on demand
- Tree-shake unused code paths
- Provide ESM and CJS builds
- Minification and compression in production builds

**Measurement:**
```bash
# Bundle size reporting in CI
npm run build
npm run analyze-bundle
```

### Response Time

| Operation | Target | Priority | Measurement |
|-----------|--------|----------|-------------|
| API call (client overhead) | <10ms p95 | P0 | Performance tests |
| Cache hit | <1ms p95 | P0 | Performance tests |
| First initialization | <50ms | P1 | Performance tests |

**Note:** API latency is measured separately and depends on network and server response time.

### Caching Strategy

| Resource Type | TTL | Rationale | Priority |
|--------------|-----|-----------|----------|
| Workflows | 30 seconds | Status changes frequently | P0 |
| Content | 5 minutes | Content updates are batched | P0 |
| Schema | 1 hour | Schema rarely changes | P1 |

**Configuration:**

```typescript
const lio = createLioClient({
  apiKey: 'xxx',
  cache: {
    enabled: true,
    ttl: {
      workflows: 30,
      content: 300,
      schema: 3600
    },
    backend: 'memory' // or 'redis', 'localStorage'
  }
});
```

**Requirements:**
- Cache key must include query parameters
- Cache invalidation on write operations
- Memory-based cache (default)
- Support custom cache backends (Redis, localStorage)

### Request Optimization

**Request Batching (Nice-to-Have):**

Reduce HTTP round-trips by batching parallel requests:

```typescript
// Automatically batches into fewer requests
const [workflow1, workflow2, content1] = await Promise.all([
  lio.workflows.get('import'),
  lio.workflows.get('export'),
  lio.content.getByUrl('example.com/blog/post')
]);
```

**Implementation:** SDK Kit queue plugin

---

## Reliability Requirements

### Error Handling

**Error Type Hierarchy:**

```typescript
class LioClientError extends Error {
  code: string;
  statusCode?: number;
  details?: unknown;
  requestId?: string;
}

class ApiError extends LioClientError {
  code: 'API_ERROR';
  statusCode: 400 | 401 | 403 | 404 | 429 | 500;
}

class RateLimitError extends LioClientError {
  code: 'RATE_LIMIT';
  retryAfter: number; // seconds
}

class NetworkError extends LioClientError {
  code: 'NETWORK_ERROR';
}

class ValidationError extends LioClientError {
  code: 'VALIDATION_ERROR';
}
```

**Usage:**

```typescript
try {
  await lio.workflows.get('import');
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Retry in ${error.retryAfter}s`);
  } else if (error instanceof ApiError) {
    console.error(`API error: ${error.message} (Request ID: ${error.requestId})`);
  } else if (error instanceof NetworkError) {
    console.error('Network connectivity issue');
  }
}
```

### Retry Strategy

**Auto-Retry Conditions:**

| Condition | Action | Max Attempts |
|-----------|--------|--------------|
| Network errors | Retry with backoff | 3 |
| 5xx errors | Retry with backoff | 3 |
| 429 (Rate limit) | Retry with backoff | 3 |
| 4xx errors (except 429) | No retry | 0 |

**Backoff Strategy:**
- Exponential backoff: 1s, 2s, 4s, 8s
- Max delay: 30 seconds
- Respect `Retry-After` header from API
- Configurable max attempts

**Configuration:**

```typescript
const lio = createLioClient({
  apiKey: 'xxx',
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableStatusCodes: [429, 500, 502, 503, 504]
  }
});
```

### Circuit Breaker (Nice-to-Have)

Prevent cascading failures by stopping requests to failing services:

```typescript
const lio = createLioClient({
  apiKey: 'xxx',
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,        // Open after 5 consecutive failures
    resetTimeout: 60000,         // Try again after 60 seconds
    fallbackToCache: true        // Return stale cache if available
  }
});
```

**States:**
- **Closed:** Normal operation
- **Open:** Blocking requests, returning errors immediately
- **Half-Open:** Testing if service recovered

### Availability

| Metric | Target | Measurement |
|--------|--------|-------------|
| SDK uptime | 99.9% | Error monitoring |
| Successful requests (after retries) | 99% | API logs |
| Mean time to recovery | <5 minutes | Incident logs |

---

## Security Requirements

### Authentication

**Method:** Query parameter authentication (API requirement)

```http
GET /v2/job?key=YOUR_API_KEY
```

**Requirements:**

| Requirement | Priority | Implementation |
|------------|----------|----------------|
| Never log API keys | P0 | Redact from logs |
| Mask keys in error messages | P0 | Show last 4 characters only |
| Support environment variables | P0 | `process.env.LIO_API_KEY` |
| Warn if exposed in browser | P1 | Console warning |

**Implementation:**

```typescript
// Recommended: Use environment variable
const lio = createLioClient({
  apiKey: process.env.LIO_API_KEY
});

// Warning in browser console
const lio = createLioClient({
  apiKey: 'hardcoded-key' // ⚠️ Security warning emitted
});
```

### Data Privacy

**GDPR Compliance:**

| Requirement | Priority | Implementation |
|------------|----------|----------------|
| No PII in cache (default) | P0 | Opt-in for PII caching |
| Configurable retention | P1 | TTL configuration |
| Data deletion support | P1 | Cache clear methods |

**Configuration:**

```typescript
const lio = createLioClient({
  apiKey: 'xxx',
  privacy: {
    cachePII: false,              // Don't cache personally identifiable information
    maxCacheAge: 3600,            // Max cache retention (seconds)
    respectDoNotTrack: true       // Honor browser DNT header
  }
});
```

### Input Validation

| Input Type | Validation | Priority |
|-----------|-----------|----------|
| URLs | Sanitize and encode | P0 |
| API keys | Format validation | P0 |
| Query parameters | Type checking | P0 |
| User-provided data | XSS prevention | P0 |

---

## Usability Requirements

### Type Safety

**TypeScript Support:**

| Requirement | Priority | Validation |
|------------|----------|-----------|
| 100% type coverage | P0 | Type tests |
| Inferred return types | P0 | Type tests |
| Generic type parameters | P0 | Type tests |
| JSDoc comments | P1 | Documentation review |

**Example:**

```typescript
// Automatic type inference
const workflow = await lio.workflows.get('import');
workflow.status; // TypeScript knows: 'running' | 'sleeping' | 'completed' | 'failed'

// Generic type support
const content = await lio.content.query<BlogPost>({
  where: { content_type: 'blog_post' }
});
// content is typed as BlogPost[]

// Plugin type preservation
import type { Entry } from 'contentstack';
const enriched = await lio.contentstack.enrich<Entry>(entry);
// enriched is typed as Entry & { _lytics: LyticsData }
```

### API Design Principles

1. **Resource Namespacing:** Methods organized by resource (`lio.workflows.*`, `lio.content.*`)
2. **CRUD Consistency:** Standard method names (`get`, `list`, `create`, `update`, `delete`)
3. **Options Pattern:** Consistent options object shape across methods
4. **Clear Error Messages:** User-friendly messages ("Workflow 'foo' not found" not "404")
5. **Progressive Disclosure:** Simple defaults, advanced options available

**Example:**

```typescript
// Simple usage (sensible defaults)
await lio.workflows.list();

// Advanced usage (optional configuration)
await lio.workflows.list({
  workflow: 'contentstack-import',
  show_all: true,
  cache: false
});
```

### Developer Experience

| Requirement | Priority | Implementation |
|------------|----------|----------------|
| Auto-complete in IDEs | P0 | TypeScript definitions |
| Inline documentation | P0 | JSDoc comments |
| Helpful error messages | P0 | Contextual error text |
| Debug mode | P1 | Verbose logging option |

**Debug Mode:**

```typescript
const lio = createLioClient({
  apiKey: 'xxx',
  debug: true  // Enables verbose logging
});

// Output:
// [lio-client] GET /v2/job?workflow=contentstack-import&key=****
// [lio-client] Response: 200 (request_id: abc-123)
```

---

## Compatibility Requirements

### Runtime Environments

| Environment | Minimum Version | Priority | Validation |
|------------|-----------------|----------|-----------|
| Chrome | Latest | P0 | E2E tests |
| Firefox | Latest | P0 | E2E tests |
| Safari | Latest | P0 | E2E tests |
| Edge | Latest | P0 | E2E tests |
| Node.js | 18+ | P0 | E2E tests |
| Cloudflare Workers | Current | P1 | E2E tests |
| Vercel Edge | Current | P1 | E2E tests |
| Netlify Edge | Current | P1 | E2E tests |
| React Native | Latest | P2 | Manual testing |

### Module Formats

| Format | Priority | Use Case |
|--------|----------|----------|
| ESM | P0 | Modern bundlers, Node.js |
| CommonJS | P0 | Legacy Node.js, some bundlers |
| UMD | P2 | Script tags (browser globals) |

**Package exports:**

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### Dependency Policy

| Policy | Rationale |
|--------|-----------|
| Minimal dependencies | Reduce bundle size and security surface |
| Peer dependencies for framework integrations | Avoid version conflicts |
| No polyfills in core | Let consumers control polyfill strategy |

**Allowed Core Dependencies:**
- SDK Kit (plugin framework)
- cross-fetch (universal fetch polyfill)
- pino (structured logging, ~5KB)

---

## Testing Requirements

### Coverage Targets

| Test Type | Target | Priority |
|-----------|--------|----------|
| Unit tests | >80% | P0 |
| Integration tests | Critical paths | P0 |
| E2E tests | Happy paths | P1 |
| Type tests | 100% public API | P0 |

### Test Strategy

**Unit Tests:**
- All plugin methods
- Error handling paths
- Cache logic
- Retry logic

**Integration Tests:**
- Real API calls (test account)
- End-to-end enrichment flows
- Multi-plugin interactions

**E2E Tests:**
- Browser environment
- Node.js environment
- Edge function environment

**Performance Tests:**
- Bundle size monitoring
- Response time benchmarks
- Memory leak detection

### Test Infrastructure

```typescript
// Mock mode for testing
const lio = createLioClient({
  apiKey: 'test-key',
  mock: true,  // Use mock responses
  mockData: {
    workflows: { /* mock data */ },
    content: { /* mock data */ }
  }
});
```

---

## Documentation Requirements

| Document Type | Priority | Audience |
|--------------|----------|----------|
| API Reference | P0 | Developers |
| Getting Started Guide | P0 | Developers |
| Plugin Development Guide | P1 | Plugin authors |
| Migration Guide | P2 | Go SDK users |
| Troubleshooting Guide | P1 | Support, Developers |

**Content Requirements:**
- Code examples for all public methods
- TypeScript examples (not just JavaScript)
- Common use cases and recipes
- Error handling examples
- Performance optimization tips

---

## Monitoring & Observability

### Metrics

| Metric | Collection Method | Frequency |
|--------|------------------|-----------|
| API call latency | Client-side timing | Per request |
| Error rate | Error tracking | Per request |
| Cache hit rate | Cache plugin | Per request |
| Bundle size | CI/CD pipeline | Per build |

### Logging

**Built-in Structured Logging with Pino**

Pino is included as a core dependency (~5KB) for production-ready observability:

| Library | Bundle Size | Rationale |
|---------|-------------|-----------|
| **Pino** | ~5KB | Fastest, structured JSON, production-ready |

**Notable Users:** Fastify, NestJS, Gatsby, npm CLI

**Design Principles:**
1. **Smart defaults** - Works out of the box, environment-aware
2. **Simple configuration** - Just set log level for 80% use case
3. **Advanced escape hatch** - Bring your own Pino instance for enterprise integration
4. **Never silent on errors** - Safety net for debugging

**Configuration:**

```typescript
import { createLioClient } from '@lytics/lio-client';

// 1. Simple: Default behavior (environment-aware)
//    - Production: WARN level
//    - Development: INFO level  
//    - Test: SILENT (but still logs errors)
const lio = createLioClient({ 
  apiKey: 'xxx' 
});

// 2. Override log level
const lio = createLioClient({ 
  apiKey: 'xxx',
  logLevel: 'info'  // 'debug' | 'info' | 'warn' | 'error' | 'silent'
});

// 3. Silent mode (still logs errors as safety net)
const lio = createLioClient({ 
  apiKey: 'xxx',
  silent: true
});

// 4. Advanced: Custom Pino instance (enterprise)
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-datadog',  // Custom transport
    options: { 
      apiKey: process.env.DATADOG_API_KEY,
      service: 'lio-client'
    }
  }
});

const lio = createLioClient({
  apiKey: 'xxx',
  logger: logger.child({ service: 'lio-client' })
});

// 5. Company logging setup
const companyLogger = getCompanyLogger();
const lio = createLioClient({
  apiKey: 'xxx',
  logger: companyLogger.child({ component: 'lio-client' })
});
```

**Environment-Aware Defaults:**

```typescript
// Automatic level detection
const defaultLevel = 
  process.env.LOG_LEVEL ||  // Explicit override
  (process.env.NODE_ENV === 'test' ? 'silent' :
   process.env.NODE_ENV === 'development' ? 'info' :
   'warn');  // production default
```

**Log Levels:**

| Level | Use Case | Default Environment |
|-------|----------|---------------------|
| DEBUG | Full request/response details | Never (opt-in only) |
| INFO | Request/response summary | Development |
| WARN | Retries, deprecated usage | Production |
| ERROR | Failed requests, exceptions | Always (cannot disable) |
| SILENT | Minimal output (errors only) | Tests |

**Logger Plugin Implementation:**

```typescript
export function loggerPlugin(config: { logger: Logger }) {
  return function logger(plugin, instance) {
    // Expose logger to instance
    instance.logger = config.logger;
    
    // Intercept transport for automatic request logging
    const originalRequest = instance.transport.request;
    instance.transport.request = async function(method, path, options) {
      const start = Date.now();
      const log = instance.logger.child({ method, path });
      
      try {
        log.debug({ options }, 'API request starting');
        
        const response = await originalRequest.call(this, method, path, options);
        
        log.info({
          duration_ms: Date.now() - start,
          status: 200,
          request_id: response.request_id
        }, 'API request succeeded');
        
        return response;
      } catch (error) {
        log.error({
          duration_ms: Date.now() - start,
          status: error.statusCode,
          request_id: error.requestId,
          error_code: error.code
        }, 'API request failed');
        
        throw error;
      }
    };
  };
}
```

**Structured Log Output:**

```json
{
  "level": "info",
  "time": 1737331200000,
  "component": "lio-client",
  "plugin": "workflows",
  "method": "GET",
  "path": "/v2/job",
  "duration_ms": 145,
  "status": 200,
  "request_id": "abc-123-def-456",
  "msg": "API request succeeded"
}
```

**Child Loggers with Context:**

```typescript
// Plugins can access logger from instance
export function workflowsPlugin(plugin, instance, config) {
  // Logger plugin provides instance.logger
  const log = instance.logger?.child?.({ plugin: 'workflows' }) || instance.logger || { info: () => {}, warn: () => {}, error: () => {} };
  
  plugin.expose({
    async list(options) {
      log.info({ method: 'list', options }, 'Fetching workflows');
      
      const start = Date.now();
      const response = await instance.transport.get('/v2/job', options);
      
      log.info({
        method: 'list',
        duration_ms: Date.now() - start,
        count: response.data.length,
        request_id: response.request_id
      }, 'Workflows fetched');
      
      return response;
    }
  });
}
```

**Error Logging:**

```typescript
try {
  await lio.workflows.get('import');
} catch (error) {
  if (error instanceof RateLimitError) {
    log.warn({
      error_code: error.code,
      retry_after: error.retryAfter,
      request_id: error.requestId
    }, 'Rate limit hit, retrying');
  } else if (error instanceof ApiError) {
    log.error({
      error_code: error.code,
      status_code: error.statusCode,
      request_id: error.requestId,
      error_message: error.message
    }, 'API error');
  }
}
```

---

## Maintenance Requirements

### Versioning Policy

- **Major versions:** Breaking changes
- **Minor versions:** New features, backward compatible
- **Patch versions:** Bug fixes

**Deprecation Policy:**
- 1 minor version warning period before removal
- Clear migration path in documentation
- Runtime warnings in console (development mode only)

### Support Policy

| Version | Support Duration |
|---------|------------------|
| Current major | Full support |
| Previous major | Security fixes only (6 months) |
| Older versions | No support |

---

## Acceptance Criteria

**MVP Success Requirements:**

| Requirement | Target | Priority |
|------------|--------|----------|
| Bundle size | <20KB gzipped | P0 |
| Type coverage | 100% public API | P0 |
| Error rate | <1% (after retries) | P0 |
| Cache hit rate | >80% | P1 |
| Documentation coverage | 100% public API | P0 |

**Performance Benchmarks:**

| Benchmark | Target | Validation |
|-----------|--------|-----------|
| Cold start | <100ms | Automated test |
| API call overhead | <10ms p95 | Automated test |
| Memory footprint | <10MB | Manual test |
| No memory leaks | 0 leaks | Manual test |

---

## References

| Document | Purpose |
|----------|---------|
| [Product Requirements](./prd.md) | Business context |
| [Technical Specification](./spec.md) | Implementation guide |
| [Architecture Guide](./architecture.md) | Design patterns |
| [API Reference](./api-discovery.md) | Endpoint documentation |

---

**Document Owner:** Engineering Team  
**Reviewers:** Architecture, QA, Security  
**Status:** Approved  
**Version:** 1.0

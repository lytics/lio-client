# @lytics/lio-client

Universal TypeScript/JavaScript client for the Lytics API.

## Overview

**Core Lytics API client** - framework-agnostic, CMS-agnostic. Provides generic access to Lytics workflows, content, and schema APIs. CMS-specific integrations (Contentstack, WordPress, etc.) live in separate plugin packages.

**What This Package Does:**
- ✅ Query Lytics content enrichment data
- ✅ Monitor workflow sync status (imports, exports)
- ✅ Introspect table schemas
- ✅ Read from Lytics APIs (read-only operations)
- ✅ Work in any JavaScript runtime (Node.js, browser, edge)

**What This SDK Does NOT Do:**
- ❌ **User tracking** - Use [jstag](https://learn.lytics.com/documentation/product/features/guides/jstag-readme) for client-side analytics
- ❌ **Event collection** - Use jstag or the Events API directly
- ❌ **Real-time personalization** - Use jstag + Lytics Decision Engine
- ❌ **CMS operations** - Use your CMS SDK (Contentstack, WordPress, etc.)
- ❌ **Write operations** - Currently read-only (workflows, segments not supported yet)

**Core Philosophy:**
This SDK reads data from Lytics. For writing data to Lytics (tracking users, sending events), use jstag or the Events API. For CMS operations, use your CMS SDK. This SDK bridges the two by enriching CMS content with Lytics analytics.

**Key Features:**
- ✅ Full TypeScript support with type inference
- ✅ Works everywhere (Node.js, browser, edge functions)
- ✅ Automatic retries and error handling
- ✅ Built-in caching (schema, content)
- ✅ Event system for monitoring
- ✅ Plugin architecture for extensibility

## Installation

```bash
npm install @lytics/lio-client

# Or with yarn
yarn add @lytics/lio-client

# Or with pnpm
pnpm add @lytics/lio-client
```

## Quick Start

```typescript
import { createLioClient } from '@lytics/lio-client';

const lio = createLioClient({
  apiKey: process.env.LYTICS_API_KEY,
  baseUrl: 'https://api.lytics.io' // Optional, defaults to this
});

await lio.init();

// Query content
const content = await lio.content.getByUrl('example.com/blog/post');
console.log(content.lytics); // { "AI": 0.95, "Technology": 0.87 }

// Monitor workflows
const workflows = await lio.workflows.list({ workflow: 'contentstack-import' });
console.log(workflows[0].status); // 'sleeping' | 'running' | 'completed' | 'failed'

// Get schema
const schema = await lio.schema.get('content');
console.log(schema.fields); // Array of field definitions
```

## Core APIs

### Workflows API

Monitor workflow jobs (imports, exports, syncs).

```typescript
// List all workflows
const all = await lio.workflows.list();

// Filter by workflow name
const imports = await lio.workflows.list({ workflow: 'contentstack-import' });

// Get workflow details
const workflow = imports[0];
console.log(workflow.id, workflow.status, workflow.updated);
```

**Response:**
```typescript
interface WorkflowJob {
  id: string;
  name: string;
  workflow: string; // e.g., 'contentstack_import'
  status: 'sleeping' | 'running' | 'completed' | 'failed';
  updated: string; // ISO timestamp
  config: Record<string, unknown>;
}
```

### Content API

Query enriched content from Lytics content table.

```typescript
// Get content by URL
const content = await lio.content.getByUrl('https://example.com/blog/post');
console.log(content.lytics); // Topics with confidence scores
console.log(content._segments); // User segments
console.log(content.hashedurl); // Lytics content ID

// Scan all content (paginated, memory-efficient)
for await (const batch of lio.content.scan({ limit: 100 })) {
  for (const entry of batch) {
    console.log(entry.url, entry.lytics);
  }
}

// Scan with filter (LQL)
for await (const batch of lio.content.scan({ 
  filter: 'stream = "contentstack"',
  fields: ['url', 'lytics', 'hashedurl']
})) {
  // Process filtered results
}
```

**Response:**
```typescript
interface ContentEntity {
  url: string;
  hashedurl?: string[];
  lytics?: Record<string, number>; // Topics: { "AI": 0.95 }
  title?: string | null;
  body?: string | null;
  _segments?: string[]; // Segment membership
  [key: string]: unknown; // Additional fields
}
```

### Schema API

Get table schemas (content, user, etc.) with caching.

```typescript
// Get content table schema
const contentSchema = await lio.schema.get('content');
console.log(contentSchema.fields);

// Get user table schema
const userSchema = await lio.schema.get('user');

// Clear cache (force fresh fetch)
lio.schema.clearCache('content');
lio.schema.clearCache(); // Clear all
```

**Response:**
```typescript
interface Schema {
  name: string;
  fields: Array<{
    id: string;
    type: string; // e.g., 'string', 'map[string]float64'
    description?: string;
  }>;
}
```

## Configuration

```typescript
const lio = createLioClient({
  // Required
  apiKey: 'your-api-key',

  // Optional
  baseUrl: 'https://api.lytics.io', // Default
  
  // Add custom plugins
  plugins: [myCustomPlugin],
});
```

## Lifecycle & Events

```typescript
// Initialize (loads plugins)
await lio.init();

// Check if ready
if (lio.isReady()) {
  console.log('Client initialized');
}

// Listen for events
const unsubscribe = lio.on('content:fetch', (data) => {
  console.log('Content fetched:', data);
});

// Stop listening
unsubscribe();
// Or
lio.off('content:fetch', handler);

// Cleanup when done
await lio.destroy();
```

## Extending with Plugins

Add integration-specific functionality without modifying core:

```typescript
import { contentstackPlugin } from '@lytics/lio-client-contentstack';

const lio = createLioClient({
  apiKey: process.env.LYTICS_API_KEY,
  plugins: [contentstackPlugin]
});

await lio.init();

// Now you have contentstack-specific methods
await lio.contentstack.getSyncStatus();
await lio.contentstack.enrich(entry);
```

**See:** [Building Plugins Guide](../../PLUGINS.md)

## Error Handling

```typescript
import { createLioClient } from '@lytics/lio-client';

try {
  const content = await lio.content.getByUrl('invalid-url');
} catch (error) {
  if (error.status === 404) {
    console.log('Content not found');
  } else if (error.status === 401) {
    console.log('Invalid API key');
  } else {
    console.error('API error:', error.message);
  }
}
```

## Advanced Features

### Caching

Schema responses are cached with 1-hour TTL:

```typescript
const schema1 = await lio.schema.get('content'); // Fetches from API
const schema2 = await lio.schema.get('content'); // Returns cached

// Clear cache
lio.schema.clearCache('content');
```

### Automatic Retries

Transport layer automatically retries failed requests:
- Network errors
- 5xx server errors
- Rate limiting (429)

Exponential backoff with max 3 retries.

### Memory-Efficient Scanning

Content scan uses async generators for large datasets:

```typescript
// Processes 10,000 entries without loading all into memory
for await (const batch of lio.content.scan({ limit: 100 })) {
  // Each batch is ~100 entries
  await processBatch(batch);
}
```

## TypeScript Support

Full type inference for all APIs:

```typescript
// TypeScript knows the shape
const workflow = await lio.workflows.list();
workflow[0].status; // Type: 'sleeping' | 'running' | 'completed' | 'failed'

// Generic types
const content = await lio.content.getByUrl('...');
content.lytics; // Type: Record<string, number> | undefined
```

## Bundle Size

- **Core SDK:** ~14 KB (gzipped)
- **Tree-shakeable:** Only bundle what you use
- **No dependencies:** Self-contained (except SDK Kit framework)

## Runtime Support

- ✅ Node.js (v18+)
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Edge functions (Vercel, Cloudflare Workers, Netlify)
- ✅ Deno (with npm specifier)
- ✅ Bun

## Examples

### Monitor Workflow Status

```typescript
const workflows = await lio.workflows.list({ workflow: 'contentstack-import' });

if (workflows.length === 0) {
  console.log('Workflow not configured');
} else {
  const workflow = workflows[0];
  console.log(`Status: ${workflow.status}`);
  console.log(`Last run: ${workflow.updated}`);
  console.log(`Config:`, workflow.config);
}
```

### Content Analytics

```typescript
const topicCounts = new Map<string, number>();

for await (const batch of lio.content.scan()) {
  for (const entry of batch) {
    if (entry.lytics) {
      for (const topic of Object.keys(entry.lytics)) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    }
  }
}

const topTopics = Array.from(topicCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log('Top 10 topics:', topTopics);
```

### Schema Introspection

```typescript
const schema = await lio.schema.get('content');

console.log('Available fields:');
schema.fields.forEach(field => {
  console.log(`  ${field.id} (${field.type})`);
});
```

## Documentation

- **[API Discovery](../../specs/api-discovery.md)** - Lytics API endpoints
- **[Transport Architecture](../../specs/transport.md)** - HTTP client design
- **[Building Plugins](../../PLUGINS.md)** - Extension guide

## Related Packages

- **[@lytics/lio-client-contentstack](../contentstack)** - Contentstack CMS integration
- **[@lytics/sdk-kit](https://github.com/lytics/sdk-kit)** - SDK framework (used internally)

## License

MIT - Copyright (c) 2026 Lytics Inc.


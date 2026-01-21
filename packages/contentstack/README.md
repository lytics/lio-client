# @lytics/lio-client-contentstack

Contentstack CMS integration plugin for [@lytics/lio-client](../core).

## Overview

Monitors Contentstack sync workflows and enriches CMS entries with Lytics analytics (topics, engagement, segments).

## Installation

```bash
# Requires core client
npm install @lytics/lio-client @lytics/lio-client-contentstack
```

## Usage

```typescript
import { createLioClient } from '@lytics/lio-client';
import { contentstackPlugin } from '@lytics/lio-client-contentstack';

const lio = createLioClient({
  apiKey: process.env.LYTICS_API_KEY,
  plugins: [contentstackPlugin]
});

await lio.init();

// Check sync status
const status = await lio.contentstack.getSyncStatus();
console.log(`Last sync: ${status.lastSync}`);
console.log(`Entries synced: ${status.entriesSynced}`);

// Enrich a Contentstack entry
const entry = await csStack.entry('blt123').fetch();
const enriched = await lio.contentstack.enrich(entry);
console.log(enriched._lytics.topics);

// Batch enrichment
const entries = await csStack.contentType('blog_post').query().find();
const enrichedList = await lio.contentstack.enrichMany(entries.entries);

// Scan all Contentstack content in Lytics
for await (const content of lio.contentstack.scanContent()) {
  console.log(content.url, content.lytics);
}

// Get analytics
const analytics = await lio.contentstack.getAnalytics();
console.log(`Total entries: ${analytics.totalEntries}`);
console.log(`Top topics:`, analytics.topTopics);
```

## API

### `getSyncStatus()`
Returns Contentstack workflow sync status (last sync, entries synced, content types).

**Returns:** `Promise<SyncStatus>`

```typescript
{
  status: 'sleeping' | 'running' | 'completed' | 'failed' | 'not_configured',
  lastSync: string | null,
  entriesSynced: number,
  contentTypes: string[],
  workflowId?: string
}
```

### `getEnrichmentData(entryOrUrl)`
Gets Lytics enrichment data for a specific Contentstack entry or URL.

**Parameters:**
- `entryOrUrl`: Contentstack entry object or URL string

**Returns:** `Promise<ContentEntity>`

### `scanContent(options?)`
Scans all Contentstack content in Lytics. Returns an async generator for memory-efficient iteration.

**Parameters:**
- `options`: Optional scan options (filter, limit, fields)

**Returns:** `AsyncGenerator<ContentEntity[]>`

### `getAnalytics()`
Gets aggregated content analytics for Contentstack entries.

**Returns:** `Promise<ContentAnalytics>`

```typescript
{
  totalEntries: number,
  topTopics: Array<{ topic: string; count: number }>,
  contentTypes: Record<string, number>
}
```

### `enrich(entry)`
Enriches a single Contentstack entry with Lytics data by URL matching.

**Parameters:**
- `entry`: Contentstack entry object with `url` or `href` field

**Returns:** `Promise<T & { _lytics?: LyticsEnrichment }>`

The `_lytics` field contains:
```typescript
{
  topics?: Record<string, number>,
  hashedurl?: string,
  segments?: string[],
  url?: string
}
```

### `enrichMany(entries)`
Efficiently enriches multiple entries (uses batch operations).

**Parameters:**
- `entries`: Array of Contentstack entry objects

**Returns:** `Promise<Array<T & { _lytics?: LyticsEnrichment }>>`

## How It Works

1. Matches Contentstack entries to Lytics content by URL
2. Adds `_lytics` field with topics, hashedurl, segments
3. Uses `/v2/content/entity` for single lookups
4. Uses `/api/segment/scan` for batch operations
5. Monitors `contentstack-import` workflow for sync status

## Configuration

Customize the plugin behavior:

```typescript
const lio = createLioClient({
  apiKey: process.env.LYTICS_API_KEY,
  plugins: [contentstackPlugin],
  contentstack: {
    workflowName: 'contentstack-import',  // Workflow to monitor
    streamName: 'contentstack',            // Stream name in Lytics
  },
});
```

## Use Cases

### Marketplace App Dashboard
```typescript
function DashboardWidget() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    async function fetchStatus() {
      const sync = await lio.contentstack.getSyncStatus();
      setStatus(sync);
    }
    fetchStatus();
  }, []);

  return <div>Last sync: {status?.lastSync}</div>;
}
```

### Entry Sidebar Widget
```typescript
function EntrySidebarWidget({ entry }) {
  const [enrichment, setEnrichment] = useState(null);

  useEffect(() => {
    async function fetchEnrichment() {
      const enriched = await lio.contentstack.enrich(entry);
      setEnrichment(enriched._lytics);
    }
    fetchEnrichment();
  }, [entry]);

  return (
    <div>
      <h3>Topics</h3>
      {enrichment?.topics && Object.keys(enrichment.topics).map(topic => (
        <span key={topic}>{topic}</span>
      ))}
    </div>
  );
}
```

### Content Performance Analytics
```typescript
const analytics = await lio.contentstack.getAnalytics();

console.log(`Total synced entries: ${analytics.totalEntries}`);
console.log('Top topics:');
analytics.topTopics.forEach(({ topic, count }) => {
  console.log(`  ${topic}: ${count} entries`);
});
```

## License

MIT

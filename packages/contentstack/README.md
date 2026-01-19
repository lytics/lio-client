# @lytics/lio-client-contentstack

Contentstack CMS integration plugin for [@lytics/lio-client](../core).

## Overview

Enriches Contentstack entries with Lytics analytics (topics, engagement, segments). Monitors Contentstack sync workflows.

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

// Enrich a single entry
const enriched = await lio.contentstack.enrich(blogPost);
console.log(enriched._lytics.topics);

// Check sync status
const status = await lio.contentstack.getSyncStatus();

// Batch enrichment
const enrichedList = await lio.contentstack.enrichMany(entries);
```

## API

### `getSyncStatus()`
Returns Contentstack workflow sync status (last sync, entries synced, content types).

### `enrich(entry)`
Enriches a single Contentstack entry with Lytics data by URL matching.

### `enrichMany(entries)`
Efficiently enriches multiple entries (uses batch scan for 100+ entries).

## How It Works

1. Matches Contentstack entries to Lytics content by URL
2. Adds `_lytics` field with topics, hashedurl, segments
3. Uses `/v2/content/entity` for single lookups
4. Uses `/api/segment/scan` for batch operations

## License

MIT

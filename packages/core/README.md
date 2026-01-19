# @lytics/lio-client

TypeScript/JavaScript SDK for the Lytics API with a plugin architecture.

## Overview

Generic client for all Lytics API interactions (workflows, content, schema, segments, etc.). Built with SDK Kit patterns, designed to be extended with plugins for specific use cases.

## Installation

```bash
npm install @lytics/lio-client
```

## Usage

```typescript
import { createLioClient } from '@lytics/lio-client';

const lio = createLioClient({
  apiKey: process.env.LYTICS_API_KEY,
  baseUrl: 'https://api.lytics.io'
});

// Access core plugins
await lio.workflows.list();
await lio.content.getByUrl('example.com/blog');
await lio.schema.get('content');
```

## Core Plugins

### Workflows
Monitor sync status, list jobs, get logs.

### Content
Query enriched content, scan all content, get by URL.

### Schema
Get table schemas for content, user, etc.

## Extending

Add integration-specific plugins:

```typescript
import { contentstackPlugin } from '@lytics/lio-client-contentstack';

const lio = createLioClient({
  apiKey: process.env.LYTICS_API_KEY,
  plugins: [contentstackPlugin]
});

// Now you have lio.contentstack.enrich()
```

## Documentation

- [API Discovery](../../../docs/api-discovery.md)
- [Lytics API Docs](https://learn.lytics.com/api-docs)
- [Go SDK Reference](https://github.com/lytics/go-lytics)

## License

MIT

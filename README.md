# @lytics/lio-client

[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.26.2-orange.svg)](https://pnpm.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

TypeScript/JavaScript SDK for the Lytics API. Built with proven SDK patterns from jstag, designed with a plugin architecture for any Lytics integration.

## What is lio-client?

A modern JavaScript/TypeScript SDK for the [Lytics API](https://learn.lytics.com/api-docs). It fills the gap between Lytics' mature [Go SDK](https://github.com/lytics/go-lytics) and the JS/TS ecosystem.

**Core Features:**
- ✅ Full Lytics API access (workflows, content, schema, segments, etc.)
- ✅ Plugin architecture (extend with custom integrations)
- ✅ TypeScript-first with full type safety
- ✅ Works everywhere (Node.js, browser, edge functions)

**Use it for:**
- 🔌 Building custom integrations (CMS, marketing tools, etc.)
- 📊 Querying Lytics data from your applications
- 🔄 Monitoring workflows and sync status
- 🏗️ Creating marketplace apps

**NOT for:**
- ❌ User tracking (use [jstag](https://learn.lytics.com/documentation/product/features/guides/jstag-readme) instead)
- ❌ Real-time personalization (use jstag + Lytics)

## Packages

This is a monorepo with multiple packages:

- **[@lytics/lio-client](./packages/core)** - Core Lytics API SDK (workflows, content, schema, segments)
- **[@lytics/lio-client-contentstack](./packages/contentstack)** - Contentstack CMS integration plugin

## Quick Start

### Installation

```bash
# Core client
npm install @lytics/lio-client

# With Contentstack integration
npm install @lytics/lio-client @lytics/lio-client-contentstack
```

### Basic Usage

```typescript
import { createLioClient } from '@lytics/lio-client';

const lio = createLioClient({
  apiKey: process.env.LYTICS_API_KEY
});

// Query content
const content = await lio.content.getByUrl('example.com/blog/post');
console.log(content.lytics); // Topics: { "AI": 0.95, "Technology": 0.87 }

// Monitor workflows
const workflows = await lio.workflows.list({ workflow: 'contentstack-import' });

// Get schema
const schema = await lio.schema.get('content');
```

### With Plugins (e.g., Contentstack)

```typescript
import { createLioClient } from '@lytics/lio-client';
import { contentstackPlugin } from '@lytics/lio-client-contentstack';

const lio = createLioClient({
  apiKey: process.env.LYTICS_API_KEY,
  plugins: [contentstackPlugin()]
});

// Enrich a Contentstack entry
const enrichedEntry = await lio.contentstack.enrich(blogPost);
console.log(enrichedEntry._lytics.topics); // Lytics topics added!
```

## Development

This project uses modern TypeScript monorepo tooling:

- 📦 **pnpm** for package management
- 🏎️ **Turborepo** for builds
- 📦 **tsup** for bundling
- 🧪 **Vitest** for testing
- 🔍 **Biome** for linting

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run in watch mode
pnpm dev
```

### Project Structure

```
lio-client/
├── packages/
│   ├── core/           # @lytics/lio-client
│   └── contentstack/   # @lytics/lio-client-contentstack
├── pnpm-workspace.yaml
├── turbo.json
└── vitest.config.ts
```

## Documentation

- **[API Reference](./specs/api-discovery.md)** - Formal API documentation
- **[Architecture](./specs/architecture.md)** - Plugin design patterns
- **[Lytics API Docs](https://learn.lytics.com/api-docs)** - Official REST API documentation
- **[Go SDK Reference](https://github.com/lytics/go-lytics)** - Mature Go client for comparison

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow and guidelines.

## License

[MIT](LICENSE) - Copyright (c) 2026 Lytics Inc.

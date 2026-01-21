# Building Plugins for lio-client

Guide for extending `@lytics/lio-client` with custom plugins.

## Overview

Plugins add integration-specific functionality to the core SDK without modifying it. They compose core APIs (workflows, content, schema) with custom logic for specific use cases (CMS integrations, analytics tools, etc.).

## When to Build a Plugin

**Good use cases:**
- ✅ CMS-specific integrations (Contentstack, WordPress, Sanity)
- ✅ Analytics tool bridges (Google Analytics, Mixpanel)
- ✅ Custom workflow monitoring
- ✅ Domain-specific enrichment logic

**Bad use cases:**
- ❌ Generic Lytics APIs (belongs in core)
- ❌ One-off scripts (just use core directly)
- ❌ User tracking (use jstag instead)

## Plugin Architecture

Plugins use the SDK Kit `PluginFunction` pattern:

```typescript
import type { Config, PluginFunction, SDK } from '@lytics/sdk-kit';

export const myPlugin: PluginFunction = (plugin, instance: SDK, config: Config) => {
  // 1. Register namespace
  plugin.ns('myplugin');

  // 2. Set defaults
  plugin.defaults({
    myplugin: {
      option1: 'default',
    },
  });

  // 3. Expose API
  plugin.expose({
    myplugin: {
      async myMethod() {
        // Use core plugins
        const workflows = await instance.workflows.list();
        return workflows;
      },
    },
  });
};
```

## Example: Contentstack Plugin

The Contentstack plugin demonstrates the pattern:

```typescript
import type { Config, PluginFunction, SDK } from '@lytics/sdk-kit';

type WorkflowsPlugin = {
  list(options?: { workflow?: string }): Promise<any[]>;
};

type ContentPlugin = {
  getByUrl(url: string): Promise<any>;
  scan(options?: any): AsyncGenerator<any[], void, undefined>;
};

type LioSDK = SDK & {
  workflows: WorkflowsPlugin;
  content: ContentPlugin;
};

export const contentstackPlugin: PluginFunction = (plugin, instance: SDK, config: Config) => {
  const sdk = instance as LioSDK;

  plugin.ns('contentstack');

  plugin.defaults({
    contentstack: {
      workflowName: 'contentstack-import',
      streamName: 'contentstack',
    },
  });

  plugin.expose({
    contentstack: {
      async getSyncStatus() {
        const workflowName = config.get('contentstack.workflowName');
        const workflows = await sdk.workflows.list({ workflow: workflowName });

        if (!workflows.length) {
          return {
            status: 'not_configured' as const,
            lastSync: null,
            entriesSynced: 0,
            contentTypes: [],
          };
        }

        return {
          status: workflows[0].status,
          lastSync: workflows[0].updated,
          entriesSynced: workflows[0].config?.entries_synced || 0,
          contentTypes: workflows[0].config?.content_types || [],
          workflowId: workflows[0].id,
        };
      },

      async enrich<T extends Record<string, any>>(entry: T): Promise<T & { _lytics?: any }> {
        const url = entry.url || entry.href;
        if (!url) {
          return entry;
        }

        try {
          const lyticsData = await sdk.content.getByUrl(url);

          return {
            ...entry,
            _lytics: {
              topics: lyticsData.lytics,
              hashedurl: lyticsData.hashedurl,
              segments: lyticsData._segments,
            },
          };
        } catch (error) {
          plugin.emit('contentstack:enrich:error', { entry, error });
          return entry;
        }
      },
    },
  });
};
```

## Key Concepts

### 1. Namespace

Register a unique namespace to avoid conflicts:

```typescript
plugin.ns('myplugin'); // User accesses as lio.myplugin.*
```

### 2. Configuration

Set defaults and allow overrides:

```typescript
plugin.defaults({
  myplugin: {
    timeout: 5000,
    retries: 3,
  },
});

// User can override:
const lio = createLioClient({
  apiKey: 'xxx',
  plugins: [myPlugin],
  myplugin: {
    timeout: 10000, // Override
  },
});

// Access in plugin:
const timeout = config.get('myplugin.timeout');
```

### 3. Accessing Core Plugins

Cast the SDK instance to access core plugins:

```typescript
type LioSDK = SDK & {
  workflows: WorkflowsPlugin;
  content: ContentPlugin;
  schema: SchemaPlugin;
};

export const myPlugin: PluginFunction = (plugin, instance: SDK) => {
  const sdk = instance as LioSDK;

  plugin.expose({
    myplugin: {
      async myMethod() {
        // Now TypeScript knows about these
        const workflows = await sdk.workflows.list();
        const content = await sdk.content.getByUrl('...');
        return { workflows, content };
      },
    },
  });
};
```

### 4. Events

Emit events for monitoring and debugging:

```typescript
plugin.expose({
  myplugin: {
    async process(data) {
      plugin.emit('myplugin:start', { data });

      try {
        const result = await doWork(data);
        plugin.emit('myplugin:success', { result });
        return result;
      } catch (error) {
        plugin.emit('myplugin:error', { error });
        throw error;
      }
    },
  },
});

// Users can listen:
lio.on('myplugin:error', (data) => {
  console.error('Plugin error:', data.error);
});
```

### 5. Async Generators

For paginated data, use async generators:

```typescript
plugin.expose({
  myplugin: {
    async *scanData(options = {}) {
      // Delegate to core's scan
      yield* sdk.content.scan({
        filter: 'stream = "my_stream"',
        ...options,
      });
    },
  },
});

// User consumes:
for await (const batch of lio.myplugin.scanData()) {
  console.log(batch);
}
```

## Plugin Structure (Best Practices)

### Separate Package

Create a dedicated package for your plugin:

```
packages/
  my-plugin/
    src/
      plugin.ts    # Plugin implementation
      types.ts     # TypeScript interfaces
      index.ts     # Exports
    package.json
    README.md
    tsconfig.json
```

### Package.json

```json
{
  "name": "@lytics/lio-client-myplugin",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "@lytics/lio-client": "^0.1.0",
    "@lytics/sdk-kit": "^1.0.0"
  },
  "dependencies": {
    "@lytics/sdk-kit": "^1.0.0"
  }
}
```

### Types

Define clear TypeScript interfaces:

```typescript
// types.ts
export interface MyPluginConfig {
  option1: string;
  option2?: number;
}

export interface MyPluginResult {
  id: string;
  data: any;
}

export interface MyPlugin {
  method1(arg: string): Promise<MyPluginResult>;
  method2(args: any[]): Promise<MyPluginResult[]>;
}
```

### Exports

```typescript
// index.ts
export { myPlugin } from './plugin';
export type {
  MyPlugin,
  MyPluginConfig,
  MyPluginResult,
} from './types';
```

## Testing Plugins

Use Vitest to test your plugin:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SDK } from '@lytics/sdk-kit';
import { myPlugin } from './plugin';

describe('myPlugin', () => {
  let sdk: SDK;

  beforeEach(() => {
    sdk = new SDK({
      name: 'test-sdk',
      version: '1.0.0',
    });

    // Register core plugins
    sdk.use(workflowsPlugin);
    sdk.use(contentPlugin);

    // Register your plugin
    sdk.use(myPlugin);
  });

  it('should expose myplugin namespace', () => {
    expect(sdk.myplugin).toBeDefined();
  });

  it('should call core APIs', async () => {
    const result = await sdk.myplugin.myMethod();
    expect(result).toBeDefined();
  });
});
```

## Real-World Example: WordPress Plugin

Hypothetical WordPress plugin:

```typescript
// packages/wordpress/src/plugin.ts
import type { Config, PluginFunction, SDK } from '@lytics/sdk-kit';

type LioSDK = SDK & {
  workflows: any;
  content: any;
};

export const wordpressPlugin: PluginFunction = (plugin, instance: SDK, config: Config) => {
  const sdk = instance as LioSDK;

  plugin.ns('wordpress');

  plugin.defaults({
    wordpress: {
      workflowName: 'wordpress-import',
      streamName: 'wordpress',
    },
  });

  plugin.expose({
    wordpress: {
      async getSyncStatus() {
        const workflowName = config.get('wordpress.workflowName');
        const workflows = await sdk.workflows.list({ workflow: workflowName });

        return workflows.length > 0
          ? {
              status: workflows[0].status,
              lastSync: workflows[0].updated,
              postsSynced: workflows[0].config?.posts_synced || 0,
            }
          : { status: 'not_configured', lastSync: null, postsSynced: 0 };
      },

      async enrichPost(post: any) {
        const url = post.guid || post.link;
        if (!url) return post;

        try {
          const lyticsData = await sdk.content.getByUrl(url);
          return {
            ...post,
            _lytics: {
              topics: lyticsData.lytics,
              engagement: calculateEngagement(lyticsData),
            },
          };
        } catch (error) {
          plugin.emit('wordpress:enrich:error', { post, error });
          return post;
        }
      },

      async *scanPosts(options = {}) {
        const streamName = config.get('wordpress.streamName');
        yield* sdk.content.scan({
          filter: `stream = "${streamName}"`,
          ...options,
        });
      },
    },
  });
};

function calculateEngagement(data: any): number {
  // Custom logic
  return data._segments?.length || 0;
}
```

## Distribution

### Internal Use (Monorepo)

Keep in the same monorepo if it's tightly coupled to the project:

```
packages/
  core/           # @lytics/lio-client
  contentstack/   # @lytics/lio-client-contentstack
  wordpress/      # @lytics/lio-client-wordpress
```

### External Use (Separate Repo)

Publish as a separate npm package for community plugins:

```bash
npm publish @acme/lio-client-drupal
```

Users install:

```bash
npm install @lytics/lio-client @acme/lio-client-drupal
```

## Best Practices

### 1. Compose, Don't Duplicate

✅ **Good:**
```typescript
async enrich(entry) {
  return await sdk.content.getByUrl(entry.url); // Use core
}
```

❌ **Bad:**
```typescript
async enrich(entry) {
  return await fetch(`${baseUrl}/v2/content/entity?url=${entry.url}`); // Don't reimplement
}
```

### 2. Handle Errors Gracefully

```typescript
async enrich(entry) {
  try {
    const data = await sdk.content.getByUrl(entry.url);
    return { ...entry, _lytics: data };
  } catch (error) {
    plugin.emit('enrich:error', { entry, error });
    return entry; // Return original on error
  }
}
```

### 3. Use TypeScript Generics

Preserve user types:

```typescript
async enrich<T extends Record<string, any>>(entry: T): Promise<T & { _lytics?: any }> {
  // TypeScript knows the return type includes original fields + _lytics
}
```

### 4. Emit Meaningful Events

```typescript
plugin.emit('myplugin:start', { count: entries.length });
plugin.emit('myplugin:progress', { processed: 50, total: 100 });
plugin.emit('myplugin:complete', { results });
plugin.emit('myplugin:error', { error });
```

### 5. Document Everything

Include comprehensive examples in your README:

```markdown
# @lytics/lio-client-myplugin

## Usage

\`\`\`typescript
import { myPlugin } from '@lytics/lio-client-myplugin';

const lio = createLioClient({
  apiKey: 'xxx',
  plugins: [myPlugin],
});

await lio.myplugin.myMethod();
\`\`\`

## API

### myMethod()
...
```

## Common Patterns

### Pattern: Sync Status Monitor

```typescript
async getSyncStatus() {
  const workflows = await sdk.workflows.list({ workflow: this.workflowName });
  return workflows.length > 0
    ? { status: workflows[0].status, lastSync: workflows[0].updated }
    : { status: 'not_configured', lastSync: null };
}
```

### Pattern: Entry Enrichment

```typescript
async enrich<T>(entry: T): Promise<T & { _lytics?: any }> {
  const url = this.extractUrl(entry);
  if (!url) return entry;

  const data = await sdk.content.getByUrl(url);
  return { ...entry, _lytics: this.formatData(data) };
}
```

### Pattern: Bulk Operations

```typescript
async enrichMany<T>(entries: T[]): Promise<T[]> {
  return await Promise.all(entries.map(e => this.enrich(e)));
}
```

### Pattern: Content Scanning

```typescript
async *scanContent(options = {}) {
  yield* sdk.content.scan({
    filter: `stream = "${this.streamName}"`,
    ...options,
  });
}
```

## Resources

- **[Core SDK](./packages/core/README.md)** - Core API reference
- **[Contentstack Plugin](./packages/contentstack/src/plugin.ts)** - Reference implementation
- **[SDK Kit Docs](https://github.com/lytics/sdk-kit)** - Plugin framework

## Questions?

Open an issue or discussion in the [lio-client repository](https://github.com/lytics/lio-client).

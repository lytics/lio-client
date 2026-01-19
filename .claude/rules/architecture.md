---
paths:
  - "packages/**/*"
  - "specs/**/*"
---

# lio-client Architecture

## Project Structure

**Monorepo** (pnpm workspaces + Turborepo):

```
lio-client/
├── packages/
│   ├── core/          # @lytics/lio-client
│   │   ├── src/
│   │   │   ├── client.ts   # createLioClient()
│   │   │   ├── types.ts    # Core interfaces
│   │   │   └── plugins/    # Workflows, Content, Schema
│   │   └── package.json
│   │
│   └── contentstack/  # @lytics/lio-client-contentstack
│       ├── src/
│       │   ├── plugin.ts   # contentstackPlugin
│       │   └── types.ts
│       └── package.json
│
└── specs/
    ├── prd.md         # Product requirements
    └── spec.md        # Technical spec
```

## Plugin Architecture (SDK Kit)

**Functional plugins** (not classes):

```typescript
export function myPlugin(
  plugin: Plugin,    // Capabilities: ns, defaults, expose, emit
  instance: SDK,     // SDK instance
  config: Config     // Configuration
): void {
  plugin.ns('my.plugin');
  plugin.expose({
    async myMethod() {
      return await instance.transport.get('/v2/endpoint');
    }
  });
}
```

**Why functional?**
- Explicit dependencies via parameters
- Better tree-shaking
- No `this` binding issues
- Proven pattern from jstag/SDK Kit

## Core vs Plugins

**Core** (`@lytics/lio-client`):
- Generic Lytics API access
- Workflows, Content, Schema plugins
- No CMS-specific logic
- Universal runtime (Node.js, browser, edge)

**Plugins** (`@lytics/lio-client-*`):
- CMS integrations (Contentstack, WordPress, etc.)
- Extend core with use-case-specific features
- Optional dependencies

```typescript
// Core usage (generic)
const lio = createLioClient({ apiKey: 'xxx' });
await lio.workflows.list();
await lio.content.getByUrl('example.com/blog');

// With plugin (CMS-specific)
import { contentstackPlugin } from '@lytics/lio-client-contentstack';
const lio = createLioClient({ apiKey: 'xxx', plugins: [contentstackPlugin] });
await lio.contentstack.enrich(entry);
```

## Build System

**tsup** - Fast, zero-config bundling:
- Output: ESM modules
- Types: Auto-generated
- Source maps: Included
- Tree-shakeable

**Turborepo** - Parallel builds:
- Caches builds
- Runs tests in parallel
- Optimizes task execution

## Dependencies

**Core**:
- Zero runtime dependencies (keep it light)
- Dev: TypeScript, tsup, Vitest

**Plugins**:
- Peer dependency on core
- Add specific deps as needed

## Versioning

**Changesets** - Semantic versioning:
- Each package versioned independently
- Core and plugins can iterate at different speeds
- Automated changelog generation

## Related Projects

- **go-lytics**: Go SDK (reference for API patterns)
- **SDK Kit**: Plugin framework (architectural foundation)
- **jstag**: Proven SDK patterns (inspiration)

## Key Decisions

1. **Monorepo** - Easier development, shared tooling
2. **Functional plugins** - Explicit, tree-shakeable
3. **Type-safe** - Strict TypeScript throughout
4. **Generic core** - Not content-specific (that's plugins)

# lio-client

TypeScript SDK for the Lytics API with a plugin architecture.

## What

**Core** (`@lytics/lio-client`): Generic Lytics API client (workflows, content, schema)  
**Plugins** (`@lytics/lio-client-*`): CMS integrations (Contentstack example)

**Stack**: TypeScript + tsup + Vitest + pnpm/Turborepo

## Why

Fill the gap between Go SDK and JS/TS ecosystem. Enable any Lytics integration.

## How

**Start**: `pnpm install && pnpm build`  
**Dev**: `pnpm dev` (watch mode)  
**Test**: `pnpm test`

**Packages**: `pnpm -F "@lytics/lio-client" <command>`

## Key Principles

1. **Type-safe** - Strict TypeScript, no `any`
2. **Plugin-based** - Functional plugins (SDK Kit patterns)
3. **Not content-specific** - Core is generic, plugins add CMS features
4. **Universal** - Node.js, browser, edge

## Quick Reference

**Specs**: `specs/prd.md`, `specs/spec.md`

**Deep dives** (search when needed):
- @.claude/rules/architecture.md - Monorepo, plugins, SDK Kit
- @.claude/rules/typescript.md - Strict mode, types, patterns
- @.claude/rules/testing.md - Vitest, mocking, patterns
- @.claude/rules/api-patterns.md - Lytics API, auth, responses

## Anti-Patterns

❌ Don't use Jest (use Vitest)  
❌ Don't make core content-specific (use plugins)  
❌ Don't use classes for plugins (use functions)  
❌ Don't call fetch directly (use transport layer)

## Related Projects

- [go-lytics](https://github.com/lytics/go-lytics) - Go SDK reference
- [SDK Kit](/Users/prosseng/workspace/sdk-kit) - Plugin framework

---
description: Review PR for lio-client standards
argument-hint: [pr-number]
---

# Review PR for lio-client

$1 PR provided: !`gh pr view $1` and !`gh pr diff $1`

No PR: !`gh pr view` and !`gh pr diff`

---

Review against lio-client standards:

## Critical Constraints

**Architecture** (@.claude/rules/architecture.md):
- Core is generic (not content-specific)
- Functional plugins (not classes)
- Plugins use SDK Kit patterns

**TypeScript** (@.claude/rules/typescript.md):
- Strict mode compliance
- No `any` in public APIs
- Export types with implementations

**Testing** (@.claude/rules/testing.md):
- Vitest (NOT Jest)
- Mock Lytics API responses
- Test behavior, not implementation

**API Patterns** (@.claude/rules/api-patterns.md):
- Query param auth (`?key=xxx`)
- Use transport layer (no direct fetch)
- Handle response envelope (`{ data, status, request_id }`)

---

Provide:
1. **Summary** - What the PR does
2. **Issues** - Violations of standards (with file:line)
3. **Architecture** - Is core still generic? Are plugins functional?
4. **Type Safety** - Any `any` types? Proper generics?
5. **Recommendation** - Approve/Request Changes

Style/formatting handled by Biome - focus on architecture and logic.

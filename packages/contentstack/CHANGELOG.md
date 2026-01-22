# @lytics/lio-client-contentstack

## 0.1.2

### Patch Changes

- Updated dependencies [c67b8ba]
  - @lytics/lio-client@0.1.1

## 0.1.1

### Patch Changes

- 2e87d3a: Fix content lookup to handle URL changes

  Improve reliability by adding UID fallback when URL lookup fails:

  1. Try URL first (fast, indexed lookup)
  2. Fallback to UID scan if URL fails (handles slug changes, URL updates)

  Fixes edge case where content lookups would fail after URL/slug changes.

---
description: Check test coverage for changes
argument-hint: none
---

# Check Test Coverage

Run tests and verify coverage for changed files.

## Run Tests

!`pnpm test`

## Coverage Report

!`pnpm test --coverage`

## Check Changed Files

!`git diff --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx)$' | grep -v '\.test\.' | grep -v '\.spec\.'`

---

## Review

For each changed file (excluding tests), verify:

1. **Has tests?** - Look for corresponding `.test.ts` or `.spec.ts`
2. **Public API covered?** - All exported functions/methods tested
3. **Edge cases?** - Null, empty, error conditions tested
4. **Behavior not implementation** - Tests check outcomes, not internals

**Missing tests?** Add them before merging:
- New plugins: Test plugin registration and methods
- New API calls: Test request/response handling
- New types: Test type guards and validation

See @.claude/rules/testing.md for patterns.

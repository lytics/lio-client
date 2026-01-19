---
description: Format and lint current changes
argument-hint: [path]
---

# Format and Lint Code

Automatically format and lint current changes. Fixes issues where possible.

## On All Changed Files

!`git diff --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|json|md)$' | xargs -r pnpm biome format --write`

!`git diff --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx)$' | xargs -r pnpm biome lint --write`

## Type Check

!`pnpm typecheck`

## If Specific Path Provided

$1 path: !`pnpm biome format --write $1 && pnpm biome lint --write $1`

---

**Auto-fix applied!** Review changes with `git diff` before committing.

**Note**: Uses Biome (not ESLint/Prettier) for fast linting and formatting.

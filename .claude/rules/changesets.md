# Release Workflow with Changesets

## Overview

We use [Changesets](https://github.com/changesets/changesets) for version management and publishing. Changesets are small markdown files that describe what changed and what version bump is needed.

## Quick Command

```bash
pnpm changeset
```

This interactive command will:
1. Ask which packages changed
2. Ask what type of version bump (patch/minor/major)
3. Ask for a summary of changes
4. Generate a changeset file in `.changeset/`

## When to Create a Changeset

Create a changeset **after** making changes but **before** committing:

```bash
# 1. Make your changes
# ... edit code ...

# 2. Create changeset
pnpm changeset

# 3. Commit both your changes AND the changeset
git add .
git commit -m "feat: add new feature"
```

## Changeset Workflow

### Step 1: Make Changes

```bash
# Work on your feature
# Edit files, add tests, etc.
```

### Step 2: Create Changeset

```bash
pnpm changeset
```

**Interactive prompts:**

1. **Which packages changed?**
   - Use spacebar to select packages
   - Press enter when done
   - Example: Select `@lytics/lio-client` and `@lytics/lio-client-contentstack`

2. **What type of change?**
   - `patch` (0.1.0 → 0.1.1) - Bug fixes, small tweaks
   - `minor` (0.1.0 → 0.2.0) - New features, backwards compatible
   - `major` (0.1.0 → 1.0.0) - Breaking changes

3. **Summary of changes:**
   - Write a clear, user-facing description
   - This becomes part of the changelog
   - Example: "Add support for batch content enrichment"

### Step 3: Commit the Changeset

```bash
git add .changeset/
git commit -m "chore: add changeset"
```

### Step 4: Push to Main

```bash
git push origin main
```

### Step 5: Automated Release (CI/CD)

1. **CI runs** and passes
2. **Changesets bot** creates a "Version Packages" PR
3. **Review the PR** - check versions and changelog
4. **Merge the PR**
5. **Release workflow** automatically publishes to npm via OIDC

## Version Bump Guidelines

### Patch (0.1.0 → 0.1.1)
- Bug fixes
- Documentation updates
- Internal refactoring (no API changes)
- Dependency updates

### Minor (0.1.0 → 0.2.0)
- New features (backwards compatible)
- New API methods
- New plugins
- Deprecations (with warnings)

### Major (0.1.0 → 1.0.0)
- Breaking changes
- API removals
- Changed function signatures
- Removed deprecated features

## Example Changeset Scenarios

### Scenario 1: Bug Fix in Core

```bash
pnpm changeset
# Select: @lytics/lio-client
# Type: patch
# Summary: "Fix content.getByUrl() handling of URLs without protocol"

git add .changeset/
git commit -m "fix: handle URLs without protocol in content.getByUrl"
```

### Scenario 2: New Feature in Contentstack Plugin

```bash
pnpm changeset
# Select: @lytics/lio-client-contentstack
# Type: minor
# Summary: "Add scanContent() method for paginated content iteration"

git add .changeset/
git commit -m "feat(contentstack): add scanContent method"
```

### Scenario 3: Breaking Change

```bash
pnpm changeset
# Select: @lytics/lio-client
# Type: major
# Summary: "Change createLioClient() to require init() before use"

git add .changeset/
git commit -m "feat!: require explicit init() call"
```

### Scenario 4: Multiple Packages

```bash
pnpm changeset
# Select: @lytics/lio-client AND @lytics/lio-client-contentstack (spacebar both)
# Type for core: minor
# Type for contentstack: patch
# Summary: "Add retry configuration and update Contentstack to use it"

git add .changeset/
git commit -m "feat: add configurable retry logic"
```

## What NOT to Do

❌ **Don't create changesets for:**
- Internal dev tool changes (unless affecting users)
- CI/CD workflow updates
- README-only changes (unless it's user-facing docs)
- Dependency updates (unless they affect public API)

✅ **DO create changesets for:**
- Any change to `packages/*/src/` that affects the public API
- Bug fixes users would notice
- New features or methods
- Breaking changes

## Changeset File Format

Changesets are stored in `.changeset/` as markdown files:

```markdown
---
"@lytics/lio-client": minor
"@lytics/lio-client-contentstack": patch
---

Add retry configuration support

Users can now configure retry behavior:
- maxRetries: number of retry attempts
- retryDelay: delay between retries
- retryableErrors: which errors trigger retries
```

## Skipping a Release

If you want to merge changes WITHOUT triggering a release:

**Don't create a changeset.** That's it!

The release workflow only runs when changeset files are merged.

## Tips

1. **Create changeset per logical change** - If you fix 3 unrelated bugs, create 3 changesets
2. **Write user-facing summaries** - Think "what does the user need to know?"
3. **Be specific** - "Fix null handling in getByUrl" > "Fix bug"
4. **Include migration notes for breaking changes** - Tell users what they need to change

## Troubleshooting

### "No changesets found"
- You forgot to run `pnpm changeset`
- Or you didn't commit the `.changeset/` file

### "Which packages should be included?"
- Select all packages that had **public API changes**
- If you changed internal code but API is the same, no changeset needed

### "What version bump?"
- When in doubt, choose `patch` for fixes, `minor` for features
- Only use `major` for true breaking changes
- We're pre-1.0, so `major` bumps are rare

## Reference

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

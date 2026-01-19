# Claude Code Hooks & Settings

## Automatic Hooks (Run After Claude Finishes)

This repository has **team-wide hooks** configured in `.claude/hooks.json`:

✅ **Auto-format** - Runs Biome formatter on all changed files  
✅ **Auto-lint** - Runs Biome linter with auto-fix  
✅ **Auto-test** - Runs Vitest on changed test files (max 5 files, 20 lines output)  
✅ **Automatic** - No manual intervention needed

These hooks ensure all code follows lio-client standards.

## How It Works

**After Claude completes work**, hooks run automatically:

1. **Format** - Biome formats changed `.ts`, `.tsx`, `.json`, `.md` files
2. **Lint** - Biome fixes linting issues in `.ts`, `.tsx` files
3. **Test** - Vitest runs on changed test files (catches broken tests early)

If a hook fails, Claude receives the error output and can fix issues.

## Manual Commands (Slash Commands)

For manual control, use commands in `.claude/commands/`:

- `/format-lint [path]` - Format/lint specific files
- `/review-pr [number]` - Review PR against standards
- `/add-plugin <name>` - Scaffold new plugin package
- `/check-coverage` - Verify test coverage

## Best Practices

**Use deterministic tools** - Linters and formatters are:
- Faster than LLMs
- Cheaper than LLMs
- More consistent
- Better at catching edge cases

**Don't put style rules in CLAUDE.md** - Your codebase follows consistent patterns. Claude learns from the code. Hooks enforce, not teach.

**Configure auto-fix** - Biome auto-fixes what it can, reducing manual work.

## Settings (Permissions)

`.claude/settings.json` configures Claude Code behavior:

**Default Mode**: `plan` - Claude plans before acting (safer)

**Ask Before**:
- `rm -rf` commands
- `git push` / publish commands

**Deny**:
- `sudo` commands
- `git stash` / `git reset --hard` (destructive)

## Testing Your Setup

1. Make a small change with Claude
2. After completion, check `git diff` to verify formatting was applied
3. Verify tests ran if you changed test files

## Troubleshooting

**Hook doesn't run**: Check `.claude/hooks.json` syntax is valid JSON  
**Permission errors**: Ensure pnpm is installed and accessible  
**Performance issues**: Hooks run synchronously - Biome is fast enough

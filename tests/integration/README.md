# Integration Tests

Simple integration test for validating `lio-client` against the live Lytics API.

## Prerequisites

Set your Lytics API key:

```bash
export LYTICS_API_KEY=your-api-key-here
```

## Running Tests

```bash
pnpm test:integration
```

This runs a comprehensive validation of all APIs:
- ✅ Workflows API (list, get, getLogs)
- ✅ Content API (scan, getByUrl, URL normalization)
- ✅ Schema API (get, caching, cache invalidation)
- ✅ Event System

**Time:** ~15-20 seconds

## What It Tests

### Workflows API
- `workflows.list()` returns array
- `workflows.get(id)` retrieves job
- `workflows.getLogs()` returns logs

### Content API
- `content.scan()` yields batches
- `content.getByUrl()` retrieves entity
- URL normalization (with/without protocol)

### Schema API
- `schema.get('content')` returns schema
- `schema.get('user')` returns schema
- Schema caching works (faster on second call)
- `schema.clearCache()` invalidates cache

### Event System
- Events fire and listeners work

## Output

```
🧪 lio-client Integration Tests
============================================================
✅ Client initialized

📋 Workflows API
------------------------------------------------------------
✅ workflows.list() returns array
✅ workflows.get(id) retrieves job
✅ workflows.getLogs() returns logs

📄 Content API
------------------------------------------------------------
✅ content.scan() yields batches
✅ content.getByUrl() retrieves entity
✅ content URL normalization works

📊 Schema API
------------------------------------------------------------
✅ schema.get("content") returns schema
✅ schema.get("user") returns schema
✅ schema caching works
✅ schema.clearCache() invalidates cache

🔔 Event System
------------------------------------------------------------
✅ event system fires events

============================================================
📊 Test Summary
============================================================
✅ Passed: 12
❌ Failed: 0
📈 Total:  12

✅ All tests passed!
```

## Notes

- **Not mocked** - Tests run against live Lytics API
- **Read-only** - No data is modified
- **Manual** - Not part of automated CI/CD
- **Safe** - Can run multiple times

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `LYTICS_API_KEY required` | Set environment variable |
| Connection timeout | Check network/API endpoint |
| No content found | Run content sync workflow first |
| Permission errors | Verify API key permissions |

---
"@lytics/lio-client": minor
---

feat: add content opportunity, segment groups, segment scanning, and sizes support

- Add `content.opportunity()` for content opportunity topic data
- Add `segments.groups()` for segment group listing
- Add `segments.scan()` for generic segment scanning (user-table support)
- Add `sizes` option to `segments.list()` (pass-through to server ?sizes=true)
- Enrich transport events with url, duration, and requestId

---
'@lytics/lio-client': patch
---

Fix SegmentQL syntax for wildcard content scanning

- Fixed `content.scan()` default to use `* FROM content` instead of `FILTER * FROM content`
- Resolves 400 Bad Request when scanning all content without a filter

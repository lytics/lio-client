---
'@lytics/lio-client': patch
---

Fix content scanning with SegmentQL queries

- Fixed SegmentQL syntax: use `FILTER * FROM content` (wildcard still requires FILTER keyword)
- Refactored to use `transport.post()` with `contentType: 'text/plain'` option instead of separate `postPlainText()` method
- Requires `@lytics/sdk-kit-plugins@^0.1.3` for plain text body support
- Resolves 400 Bad Request errors when scanning content

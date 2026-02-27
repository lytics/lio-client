---
"@lytics/lio-client": patch
---

Fix content.enrich() to send text as form-encoded body instead of query params, avoiding URL length limits with large text payloads.

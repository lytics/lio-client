---
"@lytics/lio-client": patch
---

Fix content.scan() API to use query parameters for SegmentQL

The content.scan() method was sending SegmentQL in the request body, but the Lytics API expects it as a query parameter. This caused all content scan requests to fail with HTTP 400.

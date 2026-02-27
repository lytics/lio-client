---
"@lytics/lio-client": patch
---

Add `content.enrich()` and `content.align()` methods to the content plugin.

- `enrich({ text })` or `enrich({ url })` — extract topic scores via Lytics content enrichment
- `align(topics, options?)` — rank audience segments by alignment to given topics

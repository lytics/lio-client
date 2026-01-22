---
'@lytics/lio-client': patch
'@lytics/lio-client-contentstack': patch
---

Fix content.scan() to use plain text SegmentQL and add scanSegment() for saved segments

**Bug Fix:**
- Fixed `content.scan()` to send SegmentQL as plain text in request body (matches Go SDK behavior)
- Previously was sending JSON which caused 400 Bad Request errors

**New Features:**
- Added `transport.postPlainText()` for sending plain text request bodies
- Added `content.scanSegment(segmentId)` for scanning saved segments created in Lytics UI

**Examples:**
```typescript
// Ad-hoc scanning with SegmentQL
for await (const batch of lio.content.scan({ filter: 'EXISTS title' })) {
  console.log(batch);
}

// Scan saved segments
for await (const batch of lio.content.scanSegment('all_documents')) {
  console.log(batch);
}
```

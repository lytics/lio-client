# @lytics/lio-client

## 0.1.4

### Patch Changes

- 94645ae: Fix SegmentQL syntax for wildcard content scanning

  - Fixed `content.scan()` default to use `* FROM content` instead of `FILTER * FROM content`
  - Resolves 400 Bad Request when scanning all content without a filter

## 0.1.3

### Patch Changes

- 7f29cf8: Fix content.scan() to use plain text SegmentQL and add scanSegment() for saved segments

  **Bug Fix:**

  - Fixed `content.scan()` to send SegmentQL as plain text in request body (matches Go SDK behavior)
  - Previously was sending JSON which caused 400 Bad Request errors

  **New Features:**

  - Added `transport.postPlainText()` for sending plain text request bodies
  - Added `content.scanSegment(segmentId)` for scanning saved segments created in Lytics UI

  **Examples:**

  ```typescript
  // Ad-hoc scanning with SegmentQL
  for await (const batch of lio.content.scan({ filter: "EXISTS title" })) {
    console.log(batch);
  }

  // Scan saved segments
  for await (const batch of lio.content.scanSegment("all_documents")) {
    console.log(batch);
  }
  ```

## 0.1.2

### Patch Changes

- b118836: Fix content.scan() API to use query parameters for SegmentQL

  The content.scan() method was sending SegmentQL in the request body, but the Lytics API expects it as a query parameter. This caused all content scan requests to fail with HTTP 400.

## 0.1.1

### Patch Changes

- c67b8ba: Fix content.scan() API format to use query parameters instead of body

  The `content.scan()` method was sending SegmentQL queries in the request body as `{ query: "..." }`, but the Lytics API expects SegmentQL to be passed as a query parameter named `segments`. This caused all content scan requests to fail with HTTP 400.

  **Root Cause:**
  The Lytics `/api/segment/scan` endpoint reads ad-hoc segments from either:

  - Query string parameter: `?segments=FILTER ... FROM content`
  - OR raw HTTP body (as plain text or JSON array)

  When the SDK sent `{ query: "..." }` in the body, the API tried to parse it as a segment array and failed.

  **Fix:**

  - Changed to send SegmentQL as `?segments=` query parameter
  - Added `total` to response type for proper typing
  - Updated tests to verify correct API call format

  This fix enables content scanning to work correctly for all users of the SDK.

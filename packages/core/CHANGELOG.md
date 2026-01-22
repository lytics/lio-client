# @lytics/lio-client

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

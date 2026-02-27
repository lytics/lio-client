# @lytics/lio-client-contentstack

## 1.0.2

### Patch Changes

- Updated dependencies [fedc178]
  - @lytics/lio-client@0.2.2

## 1.0.1

### Patch Changes

- Updated dependencies [91703f9]
  - @lytics/lio-client@0.2.1

## 1.0.0

### Patch Changes

- Updated dependencies [ceaa796]
  - @lytics/lio-client@0.2.0

## 0.1.6

### Patch Changes

- Updated dependencies [215aaf0]
  - @lytics/lio-client@0.1.5

## 0.1.5

### Patch Changes

- Updated dependencies [94645ae]
  - @lytics/lio-client@0.1.4

## 0.1.4

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

- Updated dependencies [7f29cf8]
  - @lytics/lio-client@0.1.3

## 0.1.3

### Patch Changes

- Updated dependencies [b118836]
  - @lytics/lio-client@0.1.2

## 0.1.2

### Patch Changes

- Updated dependencies [c67b8ba]
  - @lytics/lio-client@0.1.1

## 0.1.1

### Patch Changes

- 2e87d3a: Fix content lookup to handle URL changes

  Improve reliability by adding UID fallback when URL lookup fails:

  1. Try URL first (fast, indexed lookup)
  2. Fallback to UID scan if URL fails (handles slug changes, URL updates)

  Fixes edge case where content lookups would fail after URL/slug changes.

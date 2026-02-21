# Phase 1: Segments Plugin + AI Plugin for lio-client

## Context

lio-client needs to expose Lytics segment data and AI prompt context to enable DXP integrations. Downstream consumers need to list/get segments and retrieve LLM-ready context about segments for AI-powered recommendations.

We're adding two new core plugins:
- **segmentsPlugin** — CRUD for `/v2/segment` endpoints (list, get)
- **aiPlugin** — LLM context generation from `/v2/ai/prompt/*` endpoints (segment prompt)

The AI prompt methods live in a separate plugin because they mirror a separate API namespace (`/v2/ai/prompt/*`) and will grow to include entity and experience prompts.

## Files to Modify

| File | Action |
|------|--------|
| `packages/core/src/types.ts` | Modify — add Segment, SegmentsPlugin, AiPlugin, LioClient |
| `packages/core/src/plugins/segments.ts` | **New** — segments plugin |
| `packages/core/src/plugins/ai.ts` | **New** — AI prompt plugin |
| `packages/core/src/plugins/__tests__/segments.test.ts` | **New** — segments tests |
| `packages/core/src/plugins/__tests__/ai.test.ts` | **New** — AI prompt tests |
| `packages/core/src/client.ts` | Modify — register both plugins |
| `packages/core/src/index.ts` | Modify — export plugins + types |

## Step 1: Types — `packages/core/src/types.ts`

Add `Segment` interface with all public API fields (validated against real API response) plus index signature:

```typescript
export interface Segment {
  id: string;
  slug_name: string;
  name: string;
  description?: string;
  kind: string;                      // "segment" | "goal" | "aspect" | "conversion" | "managed"
  table: string;                     // e.g. "user"
  size?: number;
  tags?: string[] | null;
  groups?: string[] | null;
  fields?: string[] | null;
  includes?: string[] | null;
  identities?: string[] | null;
  segment_ql?: string;
  ast?: Record<string, unknown>;     // Parsed filter expression tree
  invalid?: boolean;
  invalid_reason?: string;
  deleted?: boolean;
  is_public?: boolean;
  public_name?: string;
  category?: string;
  save_hist?: boolean;
  field_changes_fields?: string[] | null;
  emit_trigger?: boolean;
  schedule_exit?: boolean;
  expires_at?: string | null;
  datemath_calc?: boolean;
  forward_datemath?: boolean;
  author_id?: string;
  aid?: number;
  account_id?: string;
  eval_segml?: boolean;
  created: string;
  updated: string;
  [key: string]: unknown;
}
```

**Note:** Array fields use `string[] | null` because the API returns `null` (not `[]`) for empty arrays. The index signature catches any fields we haven't explicitly typed.

Add `SegmentListOptions` interface:

```typescript
export interface SegmentListOptions {
  /** Entity table filter (default: "user", use "all" for all tables) */
  table?: string;
  /** Validity filter: "true" | "false" | "all" (default: "all") */
  valid?: string;
  /** Kind filter: "segment" | "goal" | "aspect" | "conversion" | "managed" | "all" */
  kind?: string;
  /** Exclude predefined segments (default: false) */
  filterPredefined?: boolean;
}
```

Add `SegmentGetOptions`:

```typescript
export interface SegmentGetOptions {
  /** Include cached segment sizes (default: false) */
  sizes?: boolean;
}
```

Add plugin interfaces:

```typescript
export interface SegmentsPlugin {
  list(options?: SegmentListOptions): Promise<Segment[]>;
  get(slugOrId: string, options?: SegmentGetOptions): Promise<Segment>;
}

export interface AiPlugin {
  segmentPrompt(segmentId: string): Promise<string>;
}
```

Update `LioClient` interface — add:

```typescript
segments: SegmentsPlugin;
ai: AiPlugin;
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **AI prompt returns non-standard response** — `/v2/ai/prompt/segment/:id` might not wrap in standard `{ data, status, request_id }` envelope | `transport.get()` would throw trying to unwrap | Verified in Go code: `chainAITemplates` returns string placed in `Data` field of standard `ApiResponse`. `unwrapResponse()` in transport.ts does `apiResponse.data` which returns the string. Safe. |
| **`filterPredefined` casing mismatch** — TS uses camelCase, API expects `filterpredefined` | Param silently ignored, all segments returned | Explicitly map in plugin: `{ filterpredefined: options.filterPredefined }` |
| **Empty list returns `null` instead of `[]`** — API might return null data for empty results | Consumer code breaks on `.length` or `.map()` | Normalize in plugin: `return response ?? []` |
| **Segment not found returns non-200** — `get()` for invalid slug returns 404 | Unhandled error with opaque message | Transport already throws with status + request_id. Plugin wraps with context: `Segment not found: ${slugOrId}` |
| **`transport.get()` has no `unwrap: false` option** — only `post()` supports it | If AI prompt endpoint ever changes to non-envelope, we'd need to modify transport | Low risk — Go code confirms envelope format. If needed later, add `unwrap` option to `get()`. |

## Step 2: Segments Plugin — `packages/core/src/plugins/segments.ts` (new)

Follow the `contentPlugin` pattern in `content.ts`:

- `plugin.ns('segments')`
- Get transport: `(instance as SDK & { transport: LyticsTransportPlugin }).transport`
- Two methods:
  - **`list(options?)`** → `transport.get<Segment[]>('/v2/segment', params)` — maps `filterPredefined` to `filterpredefined` query param
  - **`get(slugOrId, options?)`** → `transport.get<Segment>(`/v2/segment/${slugOrId}`, params)`
- Emit events: `segments:list`, `segments:listed`, `segments:get`, `segments:got`
- Input validation: `get()` throws if `slugOrId` is empty

## Step 3: AI Plugin — `packages/core/src/plugins/ai.ts` (new)

- `plugin.ns('ai')`
- Get transport same way as other plugins
- One method:
  - **`segmentPrompt(segmentId)`** → `transport.get<string>(`/v2/ai/prompt/segment/${segmentId}`)` — response is plain text wrapped in standard envelope, so normal `transport.get()` unwraps it and returns the string
- Emit events: `ai:segment-prompt`, `ai:segment-prompt-received`
- Input validation: throws if `segmentId` is empty

## Step 4: Registration — `packages/core/src/client.ts`

- Import `segmentsPlugin` and `aiPlugin`
- Add to the `.use()` chain: `sdk.use(lyticsTransportPlugin).use(workflowsPlugin).use(contentPlugin).use(schemaPlugin).use(segmentsPlugin).use(aiPlugin)`

## Step 5: Exports — `packages/core/src/index.ts`

Add exports:

```typescript
export { segmentsPlugin } from './plugins/segments';
export { aiPlugin } from './plugins/ai';
export type {
  Segment,
  SegmentListOptions,
  SegmentGetOptions,
  SegmentsPlugin,
  AiPlugin,
} from './types';
```

## Step 6: Tests — `packages/core/src/plugins/__tests__/segments.test.ts` (new)

Follow `content.test.ts` pattern (SDK + transport in `beforeEach`, mock `transport.get`).

### Core use cases

**List all segments:**
```
segments.list() → GET /v2/segment → returns Segment[]
```
- Mock transport returns array of 3 segments with different kinds
- Verify correct endpoint called with no extra params
- Verify returns the array directly

**Get a single segment by slug with sizes:**
```
segments.get('enterprise_buyers', { sizes: true }) → GET /v2/segment/enterprise_buyers?sizes=true
```
- Mock transport returns single segment with size field populated
- Verify slug in path, sizes param passed
- Verify returns single Segment object

### Filtering tests

- `list({ table: 'content' })` → passes `table` param
- `list({ kind: 'goal' })` → passes `kind` param
- `list({ kind: 'segment', filterPredefined: true })` → passes `kind` + maps `filterpredefined` (lowercase)
- `list({ valid: 'true' })` → passes `valid` param

### Edge cases

- `list()` when API returns empty array → returns `[]`
- `list()` when API returns `null` data → returns `[]` (normalized)
- `get('')` → throws `'Segment slug or ID is required'`
- `get('nonexistent')` when API returns 404 → propagates error with context
- Namespace registration: `sdk.segments` is defined, `list` and `get` are functions

## Step 7: Tests — `packages/core/src/plugins/__tests__/ai.test.ts` (new)

### Core use case

**Get LLM-ready context for a segment:**
```
ai.segmentPrompt('abc-123') → GET /v2/ai/prompt/segment/abc-123 → returns string
```
- Mock transport returns a rendered text string (the Handlebars template output)
- Verify correct endpoint with segmentId in path
- Verify returns string (not object)

### Edge cases

- `segmentPrompt('')` → throws `'Segment ID is required'`
- `segmentPrompt('nonexistent')` when API returns 404 → propagates error with context
- Namespace registration: `sdk.ai` is defined, `segmentPrompt` is a function

## Verification

1. `pnpm test` — all new and existing tests pass
2. `pnpm build` — produces types including `SegmentsPlugin`, `AiPlugin`, `Segment`
3. `pnpm typecheck` — no type errors
4. Changeset — create changeset for `@lytics/lio-client` with minor version bump

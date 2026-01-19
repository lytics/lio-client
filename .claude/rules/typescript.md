---
paths:
  - "packages/**/*.{ts,tsx}"
---

# TypeScript Standards

## Configuration

**Strict mode enabled**:
- `strict: true` with all sub-checks
- `noImplicitAny`, `strictNullChecks`, `noImplicitReturns`
- No warnings in production builds

## Type vs Interface

**Use `type` for**:
- Unions: `type Status = "pending" | "success" | "error"`
- Intersections: `type Combined = A & B`
- Function types: `type Handler = (e: Event) => void`

**Use `interface` for**:
- Object shapes (public APIs, configs)
- Plugin interfaces
- When you need declaration merging

## Public API Rules

**No `any`**:
```typescript
// ❌ Wrong
function get(url: any): any

// ✅ Correct
function get(url: string): Promise<Response>
```

**Export types**:
```typescript
// ✅ Always export types with implementations
export interface WorkflowsPlugin {
  list(options?: ListOptions): Promise<Workflow[]>;
}

export function workflowsPlugin(...): void {
  // implementation
}
```

## Plugin Types

**Functional signature**:
```typescript
export type Plugin = (
  plugin: PluginAPI,
  instance: SDK,
  config: Config
) => void;
```

**Capability injection**:
```typescript
// Core provides minimal SDK
interface SDK {
  transport: Transport;
  config: Config;
}

// Plugins extend via intersections
type ExtendedSDK = SDK & { 
  workflows: WorkflowsPlugin;
  content: ContentPlugin;
};
```

## Discriminated Unions

Use for type-safe variants:

```typescript
type ApiResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

// TypeScript guarantees correct properties
function handle(res: ApiResponse<User>) {
  if (res.status === "success") {
    console.log(res.data); // ✅ data exists
  } else {
    console.log(res.error); // ✅ error exists
  }
}
```

## Null Handling

`strictNullChecks` enabled:

```typescript
// ✅ Correct - explicit checks
const url = config.baseUrl ?? 'https://api.lytics.io';
const data = response?.data;

if (value != null) {
  // value is not null or undefined
}

// ❌ Wrong - assumes non-null
const data = response.data; // Error if response is null
```

## Generics

**Type parameters** for reusable code:

```typescript
// ✅ Generic plugin loader
function use<T extends Plugin>(plugin: T): SDK & PluginResult<T>

// ✅ Generic response wrapper
interface ApiResponse<T> {
  data: T;
  status: number;
  request_id: string;
}
```

## Utility Types

Use built-ins:
- `Partial<T>` - All properties optional
- `Required<T>` - All properties required
- `Pick<T, K>` - Subset of properties
- `Omit<T, K>` - Exclude properties
- `Record<K, V>` - Object with typed keys/values

## Anti-Patterns

❌ `any` in public APIs (use `unknown` if truly dynamic)  
❌ Type assertions without checks (`as` should be rare)  
❌ Ignoring null/undefined (handle explicitly)  
❌ Mutable config after init (readonly types)

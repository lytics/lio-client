# Transport Layer Architecture

## What Changed

We refactored the Lytics transport to **leverage SDK Kit's transport plugin** instead of reimplementing HTTP logic.

## Benefits of Using SDK Kit Transport

### What We Get for Free

1. **Retry Logic** - Exponential backoff with configurable max retries (default: 3)
2. **Multiple Transport Methods**:
   - `fetch` - Modern, default for most requests
   - `beacon` - For page unload scenarios (guaranteed delivery)
   - `xhr` - Fallback for older environments
   - `pixel` - Ultimate fallback (GET only)
3. **Automatic Transport Selection** - Chooses best transport based on:
   - User preference
   - Page unload state
   - Browser support
4. **Timeout Handling** - Configurable timeouts (default: 10s)
5. **Event System** - Emits `transport:send`, `transport:success`, `transport:error`
6. **Request/Response Hooks** - `beforeSend`, `afterSend` for middleware

### What We Add (Lytics-Specific)

Our `lyticsTransportPlugin` wraps SDK Kit's transport to handle:

1. **Query Param Auth** - Automatically adds `?key=xxx` to all requests
2. **URL Building** - Combines `baseUrl` + `path` + params
3. **Response Envelope Unwrapping** - Extracts `data` from `{ data, status, request_id }`
4. **Error Enrichment** - Adds `request_id` to errors for debugging
5. **Simplified API** - Just `get(path, params)` and `post(path, body, params)`

## Architecture

```typescript
┌─────────────────────────────────────────────────┐
│  lio-client API (workflows, content, schema)    │
│  └─ await lio.workflows.list()                  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  lyticsTransportPlugin                          │
│  • Add ?key=xxx auth                            │
│  • Build full URL                               │
│  • Unwrap { data, status, request_id }          │
│  • Simplify to get()/post()                     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  SDK Kit transportPlugin                        │
│  • Retry with exponential backoff               │
│  • Select best transport (fetch/beacon/xhr)     │
│  • Handle timeouts                              │
│  • Emit events                                  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Actual HTTP (fetch/sendBeacon/XMLHttpRequest)  │
└─────────────────────────────────────────────────┘
```

## Code Comparison

### Before (Custom Implementation)

```typescript
// ❌ Manual retry logic
// ❌ Manual timeout handling
// ❌ Only fetch (no beacon/xhr fallbacks)
// ❌ ~170 lines of transport code

async get<T>(path: string, params?: Record<string, any>): Promise<T> {
  const url = buildUrl(path, params);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      handleError({ response: { ...errorData, status: response.status } });
    }
    
    const data = await response.json() as ApiResponse<T>;
    return unwrapResponse(data);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`);
      (timeoutError as any).code = 'TIMEOUT';
      handleError(timeoutError);
    }
    handleError(error);
  }
}
```

### After (SDK Kit Integration)

```typescript
// ✅ Retry logic from SDK Kit
// ✅ Timeout handling from SDK Kit
// ✅ Multiple transports (fetch/beacon/xhr/pixel)
// ✅ ~40 lines of Lytics-specific logic

async get<T>(path: string, params?: Record<string, any>): Promise<T> {
  const url = buildUrl(path, params);
  
  const request: TransportRequest = {
    url,
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  };

  const response = await sdkTransport.send(request); // SDK Kit handles everything!
  return unwrapResponse<T>(response);
}
```

## Configuration

Users can configure SDK Kit's transport behavior:

```typescript
const lio = createLioClient({
  apiKey: 'xxx',
  transport: {
    baseUrl: 'https://api.lytics.io',
    defaultTimeout: 15000,     // 15 seconds
    defaultRetries: 5,         // Retry 5 times
    defaultTransport: 'fetch', // Or 'beacon', 'xhr'
  }
});
```

## Result

- **70% less code** in our transport layer
- **More robust** - battle-tested retry/timeout logic
- **More flexible** - multiple transport methods
- **Better UX** - beacon transport for reliable page unload tracking
- **Easier to maintain** - SDK Kit handles the hard parts

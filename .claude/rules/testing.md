---
paths:
  - "packages/**/*.{test,spec}.{ts,tsx}"
---

# Testing Standards

## Test Framework

**Vitest** (NOT Jest):
- Modern, fast, Vite-powered
- Compatible with Vitest ecosystem
- Better ESM support

```typescript
// ✅ Correct
import { describe, it, expect, vi } from 'vitest';

// ❌ Wrong
import { describe, it, expect, jest } from '@jest/globals';
```

## Test Structure

**Arrange-Act-Assert**:

```typescript
describe('workflowsPlugin', () => {
  it('should list workflows with filter', async () => {
    // Arrange
    const mockTransport = vi.fn().mockResolvedValue({ data: [] });
    const sdk = createMockSDK({ transport: mockTransport });
    
    // Act
    await sdk.workflows.list({ workflow: 'contentstack-import' });
    
    // Assert
    expect(mockTransport).toHaveBeenCalledWith('/v2/job?workflow=contentstack-import');
  });
});
```

## Mocking Lytics API

**Use `test-lio-api.ts` as reference**:

```typescript
// Mock successful response
const mockResponse = {
  data: [{ id: '123', workflow: 'contentstack_import' }],
  status: 200,
  request_id: 'abc-123'
};

// Mock transport layer
const mockTransport = {
  get: vi.fn().mockResolvedValue(mockResponse),
  post: vi.fn()
};
```

**Response envelope pattern**:
```typescript
// All /v2 endpoints use this envelope
interface LyticsResponse<T> {
  data: T;
  status: number;
  request_id: string;
}
```

## Test Coverage

**Focus on**:
- Public API behavior
- Error handling
- Edge cases (null, empty, malformed)
- Plugin composition

**Don't test**:
- Implementation details
- Third-party libraries
- Type checking (TypeScript does this)

## Integration Tests

**Test against real API shape**:

```typescript
it('should handle workflow naming conversion', async () => {
  // Query uses kebab-case
  const response = await lio.workflows.list({ 
    workflow: 'contentstack-import' 
  });
  
  // Response uses snake_case
  expect(response.data[0].workflow).toBe('contentstack_import');
});
```

## Async Testing

**Always await**:

```typescript
// ✅ Correct
it('should fetch content', async () => {
  const content = await lio.content.getByUrl('example.com/blog');
  expect(content).toBeDefined();
});

// ❌ Wrong - test passes before promise resolves
it('should fetch content', () => {
  lio.content.getByUrl('example.com/blog').then(content => {
    expect(content).toBeDefined();
  });
});
```

## Common Patterns

**Testing plugins**:
```typescript
describe('contentstackPlugin', () => {
  it('should add contentstack namespace', () => {
    const sdk = createLioClient({ 
      apiKey: 'test',
      plugins: [contentstackPlugin]
    });
    
    expect(sdk.contentstack).toBeDefined();
    expect(sdk.contentstack.enrich).toBeInstanceOf(Function);
  });
});
```

**Testing errors**:
```typescript
it('should throw on invalid API key', async () => {
  const lio = createLioClient({ apiKey: '' });
  
  await expect(lio.workflows.list()).rejects.toThrow('Invalid API key');
});
```

## Anti-Patterns

❌ Don't use Jest (use Vitest)  
❌ Don't test implementation (test behavior)  
❌ Don't forget to await async calls  
❌ Don't mock too much (prefer integration tests)

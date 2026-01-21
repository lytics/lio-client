/**
 * Unit Tests - Schema Plugin
 */

import { SDK } from '@lytics/sdk-kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { schemaPlugin } from '../schema';
import { lyticsTransportPlugin } from '../transport';

describe('schemaPlugin', () => {
  let sdk: SDK;

  beforeEach(() => {
    sdk = new SDK({ apiKey: 'test-key' });
    sdk.use(lyticsTransportPlugin);
    sdk.use(schemaPlugin);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should set namespace', () => {
    expect((sdk as any).schema).toBeDefined();
  });

  it('should expose schema API methods', () => {
    const schema = (sdk as any).schema;

    expect(typeof schema.get).toBe('function');
    expect(typeof schema.clearCache).toBe('function');
  });

  describe('schema.get()', () => {
    it('should require table name', async () => {
      await expect((sdk as any).schema.get('')).rejects.toThrow('Table name is required');
    });

    it('should call transport.get with table name', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        columns: [
          { as: 'url', type: 'string' },
          { as: 'title', type: 'string' },
        ],
      });
      (sdk as any).transport.get = mockGet;

      await (sdk as any).schema.get('content');

      expect(mockGet).toHaveBeenCalledWith('/v2/schema/content');
    });

    it('should transform API response to Schema format', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        columns: [
          { as: 'url', type: 'string', description: 'Content URL' },
          { as: 'title', type: 'string' },
        ],
      });
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).schema.get('content');

      expect(result).toEqual({
        name: 'content',
        fields: [
          { id: 'url', type: 'string', description: 'Content URL' },
          { id: 'title', type: 'string', description: undefined },
        ],
      });
    });

    it('should cache schema results', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        columns: [{ as: 'url', type: 'string' }],
      });
      (sdk as any).transport.get = mockGet;

      // First call
      await (sdk as any).schema.get('content');
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await (sdk as any).schema.get('content');
      expect(mockGet).toHaveBeenCalledTimes(1); // Still 1!
    });
  });

  describe('schema.clearCache()', () => {
    it('should clear specific table cache', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        columns: [{ as: 'url', type: 'string' }],
      });
      (sdk as any).transport.get = mockGet;

      // Populate cache
      await (sdk as any).schema.get('content');
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Clear cache
      (sdk as any).schema.clearCache('content');

      // Should fetch again
      await (sdk as any).schema.get('content');
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('should clear all caches when no table specified', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        columns: [{ as: 'url', type: 'string' }],
      });
      (sdk as any).transport.get = mockGet;

      // Populate multiple caches
      await (sdk as any).schema.get('content');
      await (sdk as any).schema.get('user');
      expect(mockGet).toHaveBeenCalledTimes(2);

      // Clear all
      (sdk as any).schema.clearCache();

      // Should fetch both again
      await (sdk as any).schema.get('content');
      await (sdk as any).schema.get('user');
      expect(mockGet).toHaveBeenCalledTimes(4);
    });
  });
});

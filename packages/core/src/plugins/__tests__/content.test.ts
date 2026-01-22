/**
 * Unit Tests - Content Plugin
 */

import { SDK } from '@lytics/sdk-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contentPlugin } from '../content';
import { lyticsTransportPlugin } from '../transport';

describe('contentPlugin', () => {
  let sdk: SDK;

  beforeEach(() => {
    sdk = new SDK({ apiKey: 'test-key' });
    sdk.use(lyticsTransportPlugin);
    sdk.use(contentPlugin);
  });

  it('should set namespace', () => {
    expect((sdk as any).content).toBeDefined();
  });

  it('should expose content API methods', () => {
    const content = (sdk as any).content;

    expect(typeof content.getByUrl).toBe('function');
    expect(typeof content.scan).toBe('function');
  });

  describe('content.getByUrl()', () => {
    it('should require URL', async () => {
      await expect((sdk as any).content.getByUrl('')).rejects.toThrow('URL is required');
    });

    it('should normalize URL (strip protocol)', async () => {
      const mockGet = vi.fn().mockResolvedValue({ entity: { url: 'example.com' } });
      (sdk as any).transport.get = mockGet;

      await (sdk as any).content.getByUrl('https://example.com/blog');

      expect(mockGet).toHaveBeenCalledWith('/v2/content/entity', {
        url: 'example.com/blog',
      });
    });

    it('should return entity from response', async () => {
      const entity = { url: 'example.com', title: 'Test' };
      const mockGet = vi.fn().mockResolvedValue({ entity });
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).content.getByUrl('example.com');

      expect(result).toEqual(entity);
    });
  });

  describe('content.scan()', () => {
    it('should use default filter and limit', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: [] });
      (sdk as any).transport.post = mockPost;

      const generator = (sdk as any).content.scan();
      await generator.next();

      // API expects SegmentQL as query parameter
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/segment\/scan\?segments=.*&limit=100/)
      );

      // Verify SegmentQL is correctly encoded
      const callUrl = mockPost.mock.calls[0][0];
      const params = new URLSearchParams(callUrl.split('?')[1]);
      expect(params.get('segments')).toBe(
        'FILTER EXISTS hashedurl FROM content LIMIT 100 OFFSET 0'
      );
    });

    it('should use custom filter and limit', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: [] });
      (sdk as any).transport.post = mockPost;

      const generator = (sdk as any).content.scan({
        filter: 'EXISTS title',
        limit: 50,
      });
      await generator.next();

      // API expects SegmentQL as query parameter, not in body
      const callUrl = mockPost.mock.calls[0][0];
      const params = new URLSearchParams(callUrl.split('?')[1]);
      expect(params.get('segments')).toBe('FILTER EXISTS title FROM content LIMIT 50 OFFSET 0');
      expect(params.get('limit')).toBe('50');
    });

    it('should yield batches of entities', async () => {
      const batch1 = [{ url: 'test1.com' }, { url: 'test2.com' }];
      const batch2 = [{ url: 'test3.com' }];

      const mockPost = vi
        .fn()
        .mockResolvedValueOnce({ data: batch1 })
        .mockResolvedValueOnce({ data: batch2 })
        .mockResolvedValueOnce({ data: [] });

      (sdk as any).transport.post = mockPost;

      const results: any[] = [];
      for await (const batch of (sdk as any).content.scan({ limit: 2 })) {
        results.push(batch);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(batch1);
      expect(results[1]).toEqual(batch2);
    });
  });
});

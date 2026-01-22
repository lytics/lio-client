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
      const mockPostPlainText = vi.fn().mockResolvedValue({ data: [] });
      (sdk as any).transport.postPlainText = mockPostPlainText;

      const generator = (sdk as any).content.scan();
      await generator.next();

      // Verify it uses postPlainText with SegmentQL in body
      expect(mockPostPlainText).toHaveBeenCalledWith('/api/segment/scan', 'FILTER * FROM content', {
        limit: 100,
        start: undefined,
      });
    });

    it('should use custom filter and limit', async () => {
      const mockPostPlainText = vi.fn().mockResolvedValue({ data: [] });
      (sdk as any).transport.postPlainText = mockPostPlainText;

      const generator = (sdk as any).content.scan({
        filter: 'EXISTS title',
        limit: 50,
      });
      await generator.next();

      // Verify custom SegmentQL and limit
      expect(mockPostPlainText).toHaveBeenCalledWith(
        '/api/segment/scan',
        'FILTER EXISTS title FROM content',
        { limit: 50, start: undefined }
      );
    });

    it('should yield batches of entities', async () => {
      const batch1 = [{ url: 'test1.com' }, { url: 'test2.com' }];
      const batch2 = [{ url: 'test3.com' }];

      const mockPostPlainText = vi
        .fn()
        .mockResolvedValueOnce({ data: batch1, next: 'token123' })
        .mockResolvedValueOnce({ data: batch2 })
        .mockResolvedValueOnce({ data: [] });

      (sdk as any).transport.postPlainText = mockPostPlainText;

      const results: any[] = [];
      for await (const batch of (sdk as any).content.scan({ limit: 2 })) {
        results.push(batch);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(batch1);
      expect(results[1]).toEqual(batch2);

      // Verify pagination with next token
      expect(mockPostPlainText).toHaveBeenNthCalledWith(
        1,
        '/api/segment/scan',
        'FILTER * FROM content',
        { limit: 2, start: undefined }
      );
      expect(mockPostPlainText).toHaveBeenNthCalledWith(
        2,
        '/api/segment/scan',
        'FILTER * FROM content',
        { limit: 2, start: 'token123' }
      );
    });
  });

  describe('content.scanSegment()', () => {
    it('should require segment ID', async () => {
      await expect((sdk as any).content.scanSegment('').next()).rejects.toThrow(
        'Segment ID is required'
      );
    });

    it('should use segment ID in path', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: [] });
      (sdk as any).transport.get = mockGet;

      const generator = (sdk as any).content.scanSegment('all_documents');
      await generator.next();

      // Verify it uses the saved segment endpoint
      expect(mockGet).toHaveBeenCalledWith('/api/segment/all_documents/scan', {
        limit: 100,
        start: undefined,
      });
    });

    it('should use custom limit', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: [] });
      (sdk as any).transport.get = mockGet;

      const generator = (sdk as any).content.scanSegment('blog_articles', { limit: 50 });
      await generator.next();

      expect(mockGet).toHaveBeenCalledWith('/api/segment/blog_articles/scan', {
        limit: 50,
        start: undefined,
      });
    });

    it('should yield batches and paginate', async () => {
      const batch1 = [{ url: 'test1.com' }, { url: 'test2.com' }];
      const batch2 = [{ url: 'test3.com' }];

      const mockGet = vi
        .fn()
        .mockResolvedValueOnce({ data: batch1, next: 'token123' })
        .mockResolvedValueOnce({ data: batch2 });

      (sdk as any).transport.get = mockGet;

      const results: any[] = [];
      for await (const batch of (sdk as any).content.scanSegment('all_documents', { limit: 2 })) {
        results.push(batch);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(batch1);
      expect(results[1]).toEqual(batch2);

      // Verify pagination with next token
      expect(mockGet).toHaveBeenNthCalledWith(1, '/api/segment/all_documents/scan', {
        limit: 2,
        start: undefined,
      });
      expect(mockGet).toHaveBeenNthCalledWith(2, '/api/segment/all_documents/scan', {
        limit: 2,
        start: 'token123',
      });
    });

    it('should include segment ID in error messages', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('Not found'));
      (sdk as any).transport.get = mockGet;

      const generator = (sdk as any).content.scanSegment('invalid_segment');

      await expect(generator.next()).rejects.toThrow(
        "Content segment scan failed for 'invalid_segment': Not found"
      );
    });
  });
});

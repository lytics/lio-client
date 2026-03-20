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

      // Verify it uses post with SegmentQL in body and plain text content type
      expect(mockPost).toHaveBeenCalledWith(
        '/api/segment/scan',
        'FILTER * FROM content',
        { limit: 100, start: undefined },
        { contentType: 'text/plain', unwrap: false }
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

      // Verify custom SegmentQL and limit
      expect(mockPost).toHaveBeenCalledWith(
        '/api/segment/scan',
        'FILTER EXISTS title FROM content',
        { limit: 50, start: undefined },
        { contentType: 'text/plain', unwrap: false }
      );
    });

    it('should yield batches of entities', async () => {
      const batch1 = [{ url: 'test1.com' }, { url: 'test2.com' }];
      const batch2 = [{ url: 'test3.com' }];

      const mockPost = vi
        .fn()
        .mockResolvedValueOnce({ data: batch1, _next: 'token123' })
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

      // Verify pagination with next token
      expect(mockPost).toHaveBeenNthCalledWith(
        1,
        '/api/segment/scan',
        'FILTER * FROM content',
        { limit: 2, start: undefined },
        { contentType: 'text/plain', unwrap: false }
      );
      expect(mockPost).toHaveBeenNthCalledWith(
        2,
        '/api/segment/scan',
        'FILTER * FROM content',
        { limit: 2, start: 'token123' },
        { contentType: 'text/plain', unwrap: false }
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

  describe('content.enrich()', () => {
    it('should require text or url', async () => {
      await expect((sdk as any).content.enrich({})).rejects.toThrow(
        'Either text or url is required'
      );
    });

    it('should POST text as form-encoded body', async () => {
      const enrichResult = {
        input: 'Blog about coffee',
        topics: { Coffee: 0.85, Wellness: 0.72 },
        inferred_topics: { Beverages: 0.6 },
      };
      const mockPost = vi.fn().mockResolvedValue(enrichResult);
      (sdk as any).transport.post = mockPost;

      const result = await (sdk as any).content.enrich({ text: 'Blog about coffee' });

      expect(mockPost).toHaveBeenCalledWith(
        '/v2/content/enrich',
        'text=Blog+about+coffee',
        undefined,
        { contentType: 'application/x-www-form-urlencoded' }
      );
      expect(result).toEqual(enrichResult);
    });

    it('should POST url as form-encoded body', async () => {
      const enrichResult = {
        input: 'https://example.com',
        topics: { Tech: 0.9 },
        inferred_topics: {},
      };
      const mockPost = vi.fn().mockResolvedValue(enrichResult);
      (sdk as any).transport.post = mockPost;

      const result = await (sdk as any).content.enrich({ url: 'https://example.com' });

      expect(mockPost).toHaveBeenCalledWith(
        '/v2/content/enrich',
        'url=https%3A%2F%2Fexample.com',
        undefined,
        { contentType: 'application/x-www-form-urlencoded' }
      );
      expect(result).toEqual(enrichResult);
    });
  });

  describe('content.align()', () => {
    it('should require topics', async () => {
      await expect((sdk as any).content.align({})).rejects.toThrow('Topics are required');
    });

    it('should POST topics as JSON body', async () => {
      const alignResult = [
        {
          segment_id: 'seg-1',
          segment_name: 'Coffee Lovers',
          segment_size: 5000,
          alignment: 0.85,
          segment_topics: { Coffee: 0.9 },
        },
      ];
      const mockPost = vi.fn().mockResolvedValue(alignResult);
      (sdk as any).transport.post = mockPost;

      const result = await (sdk as any).content.align({ Coffee: 0.85, Wellness: 0.72 });

      expect(mockPost).toHaveBeenCalledWith(
        '/v2/content/align',
        { topics: { Coffee: 0.85, Wellness: 0.72 } },
        {}
      );
      expect(result).toEqual(alignResult);
    });

    it('should pass method and limit options', async () => {
      const mockPost = vi.fn().mockResolvedValue([]);
      (sdk as any).transport.post = mockPost;

      await (sdk as any).content.align({ Coffee: 0.85 }, { method: 'cosine', limit: 5 });

      expect(mockPost).toHaveBeenCalledWith(
        '/v2/content/align',
        { topics: { Coffee: 0.85 } },
        { method: 'cosine', limit: 5 }
      );
    });
  });

  describe('content.opportunity()', () => {
    it('should fetch opportunity topics with no params', async () => {
      const mockTopics = [
        {
          topic: 'AI',
          dimensions: [{ label: 'reach', value: 0.9, subject: 'audience' }],
          segments: ['tech_enthusiasts'],
          context_layer: 'global',
        },
      ];
      const mockGet = vi.fn().mockResolvedValue({ topics: mockTopics });
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).content.opportunity();

      expect(mockGet).toHaveBeenCalledWith('/v2/content/opportunity', undefined);
      expect(result).toEqual(mockTopics);
    });

    it('should pass date param', async () => {
      const mockGet = vi.fn().mockResolvedValue({ topics: [] });
      (sdk as any).transport.get = mockGet;

      await (sdk as any).content.opportunity({ date: '2024-06-01' });

      expect(mockGet).toHaveBeenCalledWith('/v2/content/opportunity', { date: '2024-06-01' });
    });

    it('should return empty array when topics is null', async () => {
      const mockGet = vi.fn().mockResolvedValue({});
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).content.opportunity();

      expect(result).toEqual([]);
    });
  });
});

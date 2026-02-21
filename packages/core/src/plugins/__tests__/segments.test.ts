/**
 * Unit Tests - Segments Plugin
 */

import { SDK } from '@lytics/sdk-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { segmentsPlugin } from '../segments';
import { lyticsTransportPlugin } from '../transport';

describe('segmentsPlugin', () => {
  let sdk: SDK;

  beforeEach(() => {
    sdk = new SDK({ apiKey: 'test-key' });
    sdk.use(lyticsTransportPlugin);
    sdk.use(segmentsPlugin);
  });

  it('should set namespace', () => {
    expect((sdk as any).segments).toBeDefined();
  });

  it('should expose segments API methods', () => {
    const segments = (sdk as any).segments;

    expect(typeof segments.list).toBe('function');
    expect(typeof segments.get).toBe('function');
  });

  describe('segments.list()', () => {
    it('should list all segments with no params', async () => {
      const mockSegments = [
        {
          id: '1',
          slug_name: 'high_value',
          name: 'High Value',
          kind: 'segment',
          table: 'user',
          created: '2024-01-01',
          updated: '2024-01-01',
        },
        {
          id: '2',
          slug_name: 'churned',
          name: 'Churned',
          kind: 'goal',
          table: 'user',
          created: '2024-01-01',
          updated: '2024-01-01',
        },
        {
          id: '3',
          slug_name: 'blog_readers',
          name: 'Blog Readers',
          kind: 'aspect',
          table: 'user',
          created: '2024-01-01',
          updated: '2024-01-01',
        },
      ];
      const mockGet = vi.fn().mockResolvedValue(mockSegments);
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).segments.list();

      expect(mockGet).toHaveBeenCalledWith('/v2/segment', undefined);
      expect(result).toEqual(mockSegments);
      expect(result).toHaveLength(3);
    });

    it('should pass table param', async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      (sdk as any).transport.get = mockGet;

      await (sdk as any).segments.list({ table: 'content' });

      expect(mockGet).toHaveBeenCalledWith('/v2/segment', { table: 'content' });
    });

    it('should pass kind param', async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      (sdk as any).transport.get = mockGet;

      await (sdk as any).segments.list({ kind: 'goal' });

      expect(mockGet).toHaveBeenCalledWith('/v2/segment', { kind: 'goal' });
    });

    it('should pass valid param', async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      (sdk as any).transport.get = mockGet;

      await (sdk as any).segments.list({ valid: 'true' });

      expect(mockGet).toHaveBeenCalledWith('/v2/segment', { valid: 'true' });
    });

    it('should map filterPredefined to lowercase filterpredefined', async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      (sdk as any).transport.get = mockGet;

      await (sdk as any).segments.list({ kind: 'segment', filterPredefined: true });

      expect(mockGet).toHaveBeenCalledWith('/v2/segment', {
        kind: 'segment',
        filterpredefined: true,
      });
    });

    it('should return empty array when API returns empty array', async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).segments.list();

      expect(result).toEqual([]);
    });

    it('should return empty array when API returns null', async () => {
      const mockGet = vi.fn().mockResolvedValue(null);
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).segments.list();

      expect(result).toEqual([]);
    });
  });

  describe('segments.get()', () => {
    it('should require slug or ID', async () => {
      await expect((sdk as any).segments.get('')).rejects.toThrow('Segment slug or ID is required');
    });

    it('should get segment by slug', async () => {
      const mockSegment = {
        id: '1',
        slug_name: 'enterprise_buyers',
        name: 'Enterprise Buyers',
        kind: 'segment',
        table: 'user',
        size: 5000,
        created: '2024-01-01',
        updated: '2024-01-01',
      };
      const mockGet = vi.fn().mockResolvedValue(mockSegment);
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).segments.get('enterprise_buyers');

      expect(mockGet).toHaveBeenCalledWith('/v2/segment/enterprise_buyers', undefined);
      expect(result).toEqual(mockSegment);
    });

    it('should pass sizes param', async () => {
      const mockGet = vi
        .fn()
        .mockResolvedValue({
          id: '1',
          slug_name: 'test',
          name: 'Test',
          kind: 'segment',
          table: 'user',
          size: 1000,
          created: '2024-01-01',
          updated: '2024-01-01',
        });
      (sdk as any).transport.get = mockGet;

      await (sdk as any).segments.get('enterprise_buyers', { sizes: true });

      expect(mockGet).toHaveBeenCalledWith('/v2/segment/enterprise_buyers', { sizes: true });
    });

    it('should propagate transport errors', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('Not found'));
      (sdk as any).transport.get = mockGet;

      await expect((sdk as any).segments.get('nonexistent')).rejects.toThrow('Not found');
    });
  });
});

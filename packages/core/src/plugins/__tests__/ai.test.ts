/**
 * Unit Tests - AI Plugin
 */

import { SDK } from '@lytics/sdk-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiPlugin } from '../ai';
import { lyticsTransportPlugin } from '../transport';

describe('aiPlugin', () => {
  let sdk: SDK;

  beforeEach(() => {
    sdk = new SDK({ apiKey: 'test-key' });
    sdk.use(lyticsTransportPlugin);
    sdk.use(aiPlugin);
  });

  it('should set namespace', () => {
    expect((sdk as any).ai).toBeDefined();
  });

  it('should expose AI API methods', () => {
    const ai = (sdk as any).ai;

    expect(typeof ai.segmentPrompt).toBe('function');
  });

  describe('ai.segmentPrompt()', () => {
    it('should require segment ID', async () => {
      await expect((sdk as any).ai.segmentPrompt('')).rejects.toThrow('Segment ID is required');
    });

    it('should get LLM-ready context for a segment', async () => {
      const promptText =
        'This segment contains enterprise buyers who have visited the pricing page at least 3 times in the last 30 days.';
      const mockGet = vi.fn().mockResolvedValue(promptText);
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).ai.segmentPrompt('abc-123');

      expect(mockGet).toHaveBeenCalledWith('/v2/ai/prompt/segment/abc-123');
      expect(result).toBe(promptText);
      expect(typeof result).toBe('string');
    });

    it('should propagate transport errors', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('Not found'));
      (sdk as any).transport.get = mockGet;

      await expect((sdk as any).ai.segmentPrompt('nonexistent')).rejects.toThrow('Not found');
    });
  });
});

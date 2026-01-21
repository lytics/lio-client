/**
 * Unit Tests - Workflows Plugin
 */

import { SDK } from '@lytics/sdk-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lyticsTransportPlugin } from '../transport';
import { workflowsPlugin } from '../workflows';

describe('workflowsPlugin', () => {
  let sdk: SDK;

  beforeEach(() => {
    sdk = new SDK({ apiKey: 'test-key' });
    sdk.use(lyticsTransportPlugin);
    sdk.use(workflowsPlugin);
  });

  it('should set namespace', () => {
    expect((sdk as any).workflows).toBeDefined();
  });

  it('should expose workflows API methods', () => {
    const workflows = (sdk as any).workflows;

    expect(typeof workflows.list).toBe('function');
    expect(typeof workflows.get).toBe('function');
    expect(typeof workflows.getLogs).toBe('function');
  });

  describe('workflows.list()', () => {
    it('should call transport.get with correct path', async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      (sdk as any).transport.get = mockGet;

      await (sdk as any).workflows.list();

      expect(mockGet).toHaveBeenCalledWith('/v2/job', {});
    });

    it('should pass workflow filter as param', async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      (sdk as any).transport.get = mockGet;

      await (sdk as any).workflows.list({ workflow: 'test-workflow' });

      expect(mockGet).toHaveBeenCalledWith('/v2/job', {
        workflow: 'test-workflow',
      });
    });
  });

  describe('workflows.get()', () => {
    it('should require job id', async () => {
      await expect((sdk as any).workflows.get('')).rejects.toThrow('Job ID is required');
    });

    it('should call transport.get with job id', async () => {
      const mockGet = vi.fn().mockResolvedValue({ id: '123' });
      (sdk as any).transport.get = mockGet;

      await (sdk as any).workflows.get('123');

      expect(mockGet).toHaveBeenCalledWith('/v2/job/123');
    });
  });

  describe('workflows.getLogs()', () => {
    it('should call transport.get for all logs', async () => {
      const mockGet = vi.fn().mockResolvedValue({ logs: [] });
      (sdk as any).transport.get = mockGet;

      await (sdk as any).workflows.getLogs();

      expect(mockGet).toHaveBeenCalledWith('/v2/job/logs');
    });

    it('should call transport.get for specific job logs', async () => {
      const mockGet = vi.fn().mockResolvedValue({ logs: [] });
      (sdk as any).transport.get = mockGet;

      await (sdk as any).workflows.getLogs('123');

      expect(mockGet).toHaveBeenCalledWith('/v2/job/123/logs');
    });
  });
});

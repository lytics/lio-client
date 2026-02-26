/**
 * Unit Tests - Jobs Plugin
 */

import { SDK } from '@lytics/sdk-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jobsPlugin } from '../jobs';
import { lyticsTransportPlugin } from '../transport';

describe('jobsPlugin', () => {
  let sdk: SDK;

  beforeEach(() => {
    sdk = new SDK({ apiKey: 'test-key', accountId: 'test-account-id' });
    sdk.use(lyticsTransportPlugin);
    sdk.use(jobsPlugin);
  });

  it('should expose jobs namespace', () => {
    expect((sdk as any).jobs).toBeDefined();
    expect(typeof (sdk as any).jobs.list).toBe('function');
  });

  describe('jobs.list()', () => {
    it('should list jobs with account_id', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          account_id: 'test-account-id',
          name: 'MailChimp Export',
          description: '',
          workflow: 'mailchimp_list',
          workflow_id: 'wf-1',
          status: 'running',
          created: '2025-09-29T06:34:34Z',
          updated: '2025-09-29T06:34:35Z',
          user_id: 'user-1',
          auth_ids: ['auth-1'],
          config: { segment_ids: ['seg-1'] },
          deleted: false,
          expires_at: null,
        },
      ];
      const mockGet = vi.fn().mockResolvedValue(mockJobs);
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).jobs.list();

      expect(mockGet).toHaveBeenCalledWith('/v2/job', { account_id: 'test-account-id' });
      expect(result).toEqual(mockJobs);
    });

    it('should forward showCompleted option as show_completed', async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      (sdk as any).transport.get = mockGet;

      await (sdk as any).jobs.list({ showCompleted: true });

      expect(mockGet).toHaveBeenCalledWith('/v2/job', {
        account_id: 'test-account-id',
        show_completed: true,
      });
    });

    it('should forward showState option as show_state', async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      (sdk as any).transport.get = mockGet;

      await (sdk as any).jobs.list({ showState: true });

      expect(mockGet).toHaveBeenCalledWith('/v2/job', {
        account_id: 'test-account-id',
        show_state: true,
      });
    });

    it('should forward showAll option as show_all', async () => {
      const mockGet = vi.fn().mockResolvedValue([]);
      (sdk as any).transport.get = mockGet;

      await (sdk as any).jobs.list({ showAll: true });

      expect(mockGet).toHaveBeenCalledWith('/v2/job', {
        account_id: 'test-account-id',
        show_all: true,
      });
    });

    it('should throw if accountId not in config', async () => {
      const sdkNoAccount = new SDK({ apiKey: 'test-key' });
      sdkNoAccount.use(lyticsTransportPlugin);
      sdkNoAccount.use(jobsPlugin);

      await expect((sdkNoAccount as any).jobs.list()).rejects.toThrow(
        'accountId is required for jobs.list(). Pass accountId in createLioClient config.'
      );
    });

    it('should return [] when API returns null', async () => {
      const mockGet = vi.fn().mockResolvedValue(null);
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).jobs.list();

      expect(result).toEqual([]);
    });
  });
});

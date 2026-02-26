/**
 * Unit Tests - Providers Plugin
 */

import { SDK } from '@lytics/sdk-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { providersPlugin } from '../providers';
import { lyticsTransportPlugin } from '../transport';

describe('providersPlugin', () => {
  let sdk: SDK;

  beforeEach(() => {
    sdk = new SDK({ apiKey: 'test-key', accountId: 'test-account-id' });
    sdk.use(lyticsTransportPlugin);
    sdk.use(providersPlugin);
  });

  it('should expose providers namespace', () => {
    expect((sdk as any).providers).toBeDefined();
    expect(typeof (sdk as any).providers.list).toBe('function');
  });

  describe('providers.list()', () => {
    it('should list providers with account_id', async () => {
      const mockProviders = [
        {
          id: 'prov-1',
          slug: 'zendesk',
          name: 'Zendesk',
          namespace: 'zd',
          description: 'Import customer support data',
          categories: ['import', 'export'],
          hidden: false,
          custom: false,
          connected: false,
          documentation: 'https://docs.lytics.com/docs/zendesk',
          no_auth: false,
          auth_description: '',
          auths: [],
          created: '2026-02-25T19:23:47.824Z',
          updated: '2026-02-25T19:23:47.824Z',
        },
      ];
      const mockGet = vi.fn().mockResolvedValue(mockProviders);
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).providers.list();

      expect(mockGet).toHaveBeenCalledWith('/v2/provider', { account_id: 'test-account-id' });
      expect(result).toEqual(mockProviders);
    });

    it('should throw if accountId not in config', async () => {
      const sdkNoAccount = new SDK({ apiKey: 'test-key' });
      sdkNoAccount.use(lyticsTransportPlugin);
      sdkNoAccount.use(providersPlugin);

      await expect((sdkNoAccount as any).providers.list()).rejects.toThrow(
        'accountId is required for providers.list(). Pass accountId in createLioClient config.'
      );
    });

    it('should return [] when API returns null', async () => {
      const mockGet = vi.fn().mockResolvedValue(null);
      (sdk as any).transport.get = mockGet;

      const result = await (sdk as any).providers.list();

      expect(result).toEqual([]);
    });
  });
});

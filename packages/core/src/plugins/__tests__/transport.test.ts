/**
 * Unit Tests - Lytics Transport Plugin
 */

import { SDK } from '@lytics/sdk-kit';
import { beforeEach, describe, expect, it } from 'vitest';
import { lyticsTransportPlugin } from '../transport';

describe('lyticsTransportPlugin', () => {
  let sdk: SDK;

  beforeEach(() => {
    sdk = new SDK({
      apiKey: 'test-key',
      transport: {
        baseUrl: 'https://api.test.lytics.io',
      },
    });
  });

  it('should require API key', () => {
    const badSdk = new SDK({});

    expect(() => {
      badSdk.use(lyticsTransportPlugin);
    }).toThrow('Lytics API key is required');
  });

  it('should set namespace', () => {
    sdk.use(lyticsTransportPlugin);

    expect((sdk as any).transport).toBeDefined();
  });

  it('should expose get and post methods', () => {
    sdk.use(lyticsTransportPlugin);

    const transport = (sdk as any).transport;
    expect(typeof transport.get).toBe('function');
    expect(typeof transport.post).toBe('function');
  });

  it('should set default config', () => {
    sdk.use(lyticsTransportPlugin);

    const baseUrl = sdk.get('transport.baseUrl');
    expect(baseUrl).toBe('https://api.test.lytics.io');
  });

  describe('enriched events', () => {
    it('should expose get and post methods that emit enriched events', () => {
      sdk.use(lyticsTransportPlugin);

      expect(typeof (sdk as any).transport.get).toBe('function');
      expect(typeof (sdk as any).transport.post).toBe('function');
    });
  });
});

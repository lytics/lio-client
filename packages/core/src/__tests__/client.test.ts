/**
 * Unit Tests - Client Creation
 */

import { describe, expect, it } from 'vitest';
import { createLioClient } from '../client';

describe('createLioClient', () => {
  it('should throw error if apiKey missing', () => {
    expect(() => {
      createLioClient({ apiKey: '' });
    }).toThrow('apiKey is required');
  });

  it('should create client with apiKey', () => {
    const lio = createLioClient({ apiKey: 'test-key' });

    expect(lio).toBeDefined();
    expect(lio.workflows).toBeDefined();
    expect(lio.content).toBeDefined();
    expect(lio.schema).toBeDefined();
  });

  it('should use default baseUrl', () => {
    const lio = createLioClient({ apiKey: 'test-key' });

    // Check that transport config has default baseUrl
    const baseUrl = (lio as any).get('transport.baseUrl');
    expect(baseUrl).toBe('https://api.lytics.io');
  });

  it('should use custom baseUrl', () => {
    const lio = createLioClient({
      apiKey: 'test-key',
      baseUrl: 'https://custom.api.com',
    });

    const baseUrl = (lio as any).get('transport.baseUrl');
    expect(baseUrl).toBe('https://custom.api.com');
  });

  it('should register custom plugins', () => {
    const customPlugin = vi.fn((plugin) => {
      plugin.ns('custom');
      plugin.expose({ custom: { test: () => 'works' } });
    });

    const lio = createLioClient({
      apiKey: 'test-key',
      plugins: [customPlugin],
    });

    expect(customPlugin).toHaveBeenCalled();
    expect((lio as any).custom).toBeDefined();
  });

  it('should provide SDK lifecycle methods', () => {
    const lio = createLioClient({ apiKey: 'test-key' });

    expect(typeof lio.init).toBe('function');
    expect(typeof lio.destroy).toBe('function');
    expect(typeof lio.isReady).toBe('function');
  });

  it('should provide event system', () => {
    const lio = createLioClient({ apiKey: 'test-key' });

    expect(typeof lio.on).toBe('function');
    expect(typeof lio.off).toBe('function');
    expect(typeof lio.emit).toBe('function');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contentstackCdaPlugin } from './plugin';

// Minimal stub of the SDK Kit plugin API — just enough to test our plugin.
function createPluginHarness() {
  let exposed: Record<string, any> = {};

  const plugin = {
    ns: vi.fn(),
    expose: vi.fn((obj: Record<string, any>) => {
      exposed = obj;
    }),
  };

  const install = contentstackCdaPlugin({
    apiKey: 'test-api-key',
    deliveryToken: 'test-delivery-token',
    environment: 'production',
  });

  // Install the plugin — passes the mock plugin object
  install(plugin as any, {} as any, {} as any);

  return exposed.contentstackCda;
}

describe('contentstackCdaPlugin', () => {
  let cda: ReturnType<typeof createPluginHarness>;
  const fetchSpy =
    vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchSpy.mockReset();
    cda = createPluginHarness();
    globalThis.fetch = fetchSpy as any;
  });

  // Helper to create a mock Response
  function mockResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('getContentTypes() filters out built_io_* system types', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        content_types: [
          { uid: 'product', title: 'Product', description: 'Products' },
          { uid: 'built_io_upload', title: 'Upload', description: 'System uploads' },
          { uid: 'blog_post', title: 'Blog Post', description: 'Blog posts' },
        ],
      })
    );

    const types = await cda.getContentTypes();
    expect(types).toHaveLength(2);
    expect(types.map((t: any) => t.uid)).toEqual(['product', 'blog_post']);
  });

  it('getContentTypes() sends correct headers and environment param', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ content_types: [] }));

    await cda.getContentTypes();

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/v3/content_types');
    expect(String(url)).toContain('environment=production');
    expect(init?.headers).toEqual({
      api_key: 'test-api-key',
      access_token: 'test-delivery-token',
    });
  });

  it('getEntries() defaults to limit 50 and include_count true', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ entries: [], count: 0 }));

    await cda.getEntries('product');

    const [url] = fetchSpy.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get('limit')).toBe('50');
    expect(parsed.searchParams.get('include_count')).toBe('true');
  });

  it('getEntries() passes query param with escaped regex for title search', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ entries: [], count: 0 }));

    await cda.getEntries('product', { query: 'green tea (organic)' });

    const [url] = fetchSpy.mock.calls[0];
    const parsed = new URL(String(url));
    const query = JSON.parse(parsed.searchParams.get('query')!);
    expect(query.title.$regex).toBe('green tea \\(organic\\)');
    expect(query.title.$options).toBe('i');
  });

  it('getEntry() returns single entry', async () => {
    const entry = {
      uid: 'blt123',
      title: 'Jasmine Green',
      created_at: '2025-01-01',
      updated_at: '2025-01-02',
    };
    fetchSpy.mockResolvedValueOnce(mockResponse({ entry }));

    const result = await cda.getEntry('product', 'blt123');

    expect(result).toEqual(entry);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/v3/content_types/product/entries/blt123');
  });

  it('throws descriptive error on auth failure (401)', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ error_message: 'Unauthorized', error_code: 105 }, 401)
    );

    await expect(cda.getContentTypes()).rejects.toThrow(
      'Invalid delivery token or API key for stack'
    );
  });

  it('throws descriptive error on network failure', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('DNS resolution failed'));

    await expect(cda.getContentTypes()).rejects.toThrow(
      'Contentstack CDA request failed: DNS resolution failed'
    );
  });

  it('getContentTypes() returns empty array when CDA returns only system types', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        content_types: [
          { uid: 'built_io_upload', title: 'Upload', description: 'System uploads' },
          { uid: 'built_io_download', title: 'Download', description: 'System downloads' },
        ],
      })
    );

    const types = await cda.getContentTypes();
    expect(types).toEqual([]);
  });
});

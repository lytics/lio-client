import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { brandKitPlugin } from './plugin';

function createPluginHarness(configOverrides?: {
  brandKitUid?: string;
  baseUrl?: string;
  knowledgeVaultBaseUrl?: string;
}) {
  let exposed: Record<string, Record<string, (...args: unknown[]) => unknown>> = {};

  const plugin = {
    ns: vi.fn(),
    expose: vi.fn((obj: Record<string, Record<string, (...args: unknown[]) => unknown>>) => {
      exposed = obj;
    }),
  };

  const install = brandKitPlugin({
    authtoken: 'test-authtoken',
    organizationUid: 'test-org-uid',
    ...configOverrides,
  });

  install(plugin as never, {} as never, {} as never);

  return { brandKit: exposed.brandKit, knowledgeVault: exposed.knowledgeVault };
}

describe('brandKitPlugin', () => {
  const fetchSpy =
    vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchSpy.mockReset();
    globalThis.fetch = fetchSpy as never;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  describe('brandKit.list()', () => {
    it('sends correct URL and headers', async () => {
      const { brandKit } = createPluginHarness();
      fetchSpy.mockResolvedValueOnce(mockResponse({ brand_kits: [] }));

      await brandKit.list();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, init] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain('/v1/brand-kits');
      expect((init?.headers as Record<string, string>).authtoken).toBe('test-authtoken');
      expect((init?.headers as Record<string, string>).organization_uid).toBe('test-org-uid');
    });

    it('unwraps brand_kits array', async () => {
      const { brandKit } = createPluginHarness();
      const kits = [
        { uid: 'bk1', name: 'Kit 1', organization_uid: 'org1' },
        { uid: 'bk2', name: 'Kit 2', organization_uid: 'org1' },
      ];
      fetchSpy.mockResolvedValueOnce(mockResponse({ brand_kits: kits }));

      const result = await brandKit.list();
      expect(result).toEqual(kits);
    });

    it('returns empty array when no brand kits exist', async () => {
      const { brandKit } = createPluginHarness();
      fetchSpy.mockResolvedValueOnce(mockResponse({ brand_kits: [] }));

      const result = await brandKit.list();
      expect(result).toEqual([]);
    });
  });

  describe('brandKit.get()', () => {
    it('sends correct URL and unwraps brand_kit object', async () => {
      const { brandKit } = createPluginHarness();
      const kit = { uid: 'bk1', name: 'Kit 1', organization_uid: 'org1' };
      fetchSpy.mockResolvedValueOnce(mockResponse({ brand_kit: kit }));

      const result = await brandKit.get('bk1');

      expect(result).toEqual(kit);
      const [url] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain('/v1/brand-kits/bk1');
    });

    it('throws descriptive error on 404', async () => {
      const { brandKit } = createPluginHarness();
      fetchSpy.mockResolvedValueOnce(mockResponse({ error_message: 'Brand kit not found' }, 404));

      await expect(brandKit.get('nonexistent')).rejects.toThrow(
        'Brand Kit API error 404: Brand kit not found'
      );
    });
  });

  describe('brandKit.listGuidelines()', () => {
    it('sends correct path', async () => {
      const { brandKit } = createPluginHarness();
      fetchSpy.mockResolvedValueOnce(mockResponse({ guidelines: [] }));

      await brandKit.listGuidelines('bk1');

      const [url] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain('/v1/brand-kits/bk1/guidelines');
    });
  });

  describe('brandKit.getResolvedGuidelines()', () => {
    it('sends correct path with both IDs', async () => {
      const { brandKit } = createPluginHarness();
      const guideline = {
        uid: 'gl1',
        name: 'Main',
        guidelines: {
          voice_profile_context: 'Friendly and professional',
          knowledge_vault_context: 'Product docs context',
        },
      };
      fetchSpy.mockResolvedValueOnce(mockResponse({ guideline }));

      const result = await brandKit.getResolvedGuidelines('bk1', 'gl1');

      expect(result).toEqual(guideline);
      expect(result.guidelines.voice_profile_context).toBe('Friendly and professional');
      expect(result.guidelines.knowledge_vault_context).toBe('Product docs context');
      const [url] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain('/v1/brand-kits/bk1/guidelines/gl1/resolve');
    });
  });

  describe('brandKit.listVoiceProfiles()', () => {
    it('sends correct path', async () => {
      const { brandKit } = createPluginHarness();
      fetchSpy.mockResolvedValueOnce(mockResponse({ voice_profiles: [] }));

      await brandKit.listVoiceProfiles('bk1');

      const [url] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain('/v1/brand-kits/bk1/voice-profiles');
    });
  });

  describe('brandKit.getVoiceProfile()', () => {
    it('sends correct path and unwraps single profile', async () => {
      const { brandKit } = createPluginHarness();
      const profile = {
        uid: 'vp1',
        brand_kit_uid: 'bk1',
        name: 'Professional',
        description: 'Professional tone',
      };
      fetchSpy.mockResolvedValueOnce(mockResponse({ voice_profile: profile }));

      const result = await brandKit.getVoiceProfile('bk1', 'vp1');

      expect(result).toEqual(profile);
      const [url] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain('/v1/brand-kits/bk1/voice-profiles/vp1');
    });
  });

  describe('Brand Kit error handling', () => {
    it('throws descriptive error on auth failure (401)', async () => {
      const { brandKit } = createPluginHarness();
      fetchSpy.mockResolvedValueOnce(mockResponse({ error_message: 'Unauthorized' }, 401));

      await expect(brandKit.list()).rejects.toThrow('Invalid authtoken or organization_uid');
    });

    it('throws descriptive error on auth failure (403)', async () => {
      const { brandKit } = createPluginHarness();
      fetchSpy.mockResolvedValueOnce(mockResponse({ error_message: 'Forbidden' }, 403));

      await expect(brandKit.list()).rejects.toThrow('Invalid authtoken or organization_uid');
    });

    it('throws generic error on server error (500)', async () => {
      const { brandKit } = createPluginHarness();
      fetchSpy.mockResolvedValueOnce(mockResponse({ error_message: 'Internal error' }, 500));

      await expect(brandKit.list()).rejects.toThrow('Brand Kit API error 500: Internal error');
    });

    it('throws descriptive error on network failure', async () => {
      const { brandKit } = createPluginHarness();
      fetchSpy.mockRejectedValueOnce(new Error('DNS resolution failed'));

      await expect(brandKit.list()).rejects.toThrow(
        'Brand Kit API request failed: DNS resolution failed'
      );
    });

    it('does not leak authtoken in error messages', async () => {
      const { brandKit } = createPluginHarness();
      fetchSpy.mockRejectedValueOnce(new Error('Connection refused'));

      try {
        await brandKit.list();
      } catch (error) {
        expect((error as Error).message).not.toContain('test-authtoken');
      }
    });
  });

  describe('knowledgeVault.ingest()', () => {
    it('sends correct POST body, headers, and URL', async () => {
      const { knowledgeVault } = createPluginHarness({ brandKitUid: 'bk1' });
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          message: 'Ingestion started',
          content: {
            task_id: 'task-123',
            path: '/docs/guide.md',
            folder_name: 'docs',
            uid: 'doc-uid',
            tokens: { count: 150, remaining: 9850 },
          },
        })
      );

      const result = await knowledgeVault.ingest({
        content: 'Some document content',
        title: 'Guide',
      });

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, init] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain('/brand-kits/v1/ingest');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual({
        content: 'Some document content',
        title: 'Guide',
      });
      const headers = init?.headers as Record<string, string>;
      expect(headers.authtoken).toBe('test-authtoken');
      expect(headers.organization_uid).toBe('test-org-uid');
      expect(headers.brand_kit_uid).toBe('bk1');
      expect(result.content.task_id).toBe('task-123');
    });

    it('throws immediately if brandKitUid not configured', async () => {
      const { knowledgeVault } = createPluginHarness();

      await expect(knowledgeVault.ingest({ content: 'test' })).rejects.toThrow(
        'brandKitUid is required for Knowledge Vault operations'
      );

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('throws descriptive error on auth failure (401)', async () => {
      const { knowledgeVault } = createPluginHarness({ brandKitUid: 'bk1' });
      fetchSpy.mockResolvedValueOnce(mockResponse({ error_message: 'Unauthorized' }, 401));

      await expect(knowledgeVault.ingest({ content: 'test' })).rejects.toThrow(
        'Invalid authtoken or organization_uid'
      );
    });

    it('throws descriptive error on network failure', async () => {
      const { knowledgeVault } = createPluginHarness({ brandKitUid: 'bk1' });
      fetchSpy.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(knowledgeVault.ingest({ content: 'test' })).rejects.toThrow(
        'Knowledge Vault API request failed: Connection refused'
      );
    });

    it('does not leak authtoken in error messages', async () => {
      const { knowledgeVault } = createPluginHarness({ brandKitUid: 'bk1' });
      fetchSpy.mockRejectedValueOnce(new Error('Timeout'));

      try {
        await knowledgeVault.ingest({ content: 'test' });
      } catch (error) {
        expect((error as Error).message).not.toContain('test-authtoken');
      }
    });
  });

  describe('custom base URLs', () => {
    it('uses custom baseUrl for brand kit requests', async () => {
      const { brandKit } = createPluginHarness({
        baseUrl: 'https://custom-brand-kit.example.com',
      });
      fetchSpy.mockResolvedValueOnce(mockResponse({ brand_kits: [] }));

      await brandKit.list();

      const [url] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain('custom-brand-kit.example.com');
    });

    it('uses custom knowledgeVaultBaseUrl for KV requests', async () => {
      const { knowledgeVault } = createPluginHarness({
        brandKitUid: 'bk1',
        knowledgeVaultBaseUrl: 'https://custom-kv.example.com',
      });
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          message: 'ok',
          content: {
            task_id: 't1',
            path: '/p',
            folder_name: 'f',
            uid: 'u',
            tokens: { count: 1, remaining: 99 },
          },
        })
      );

      await knowledgeVault.ingest({ content: 'test' });

      const [url] = fetchSpy.mock.calls[0];
      expect(String(url)).toContain('custom-kv.example.com');
    });
  });
});

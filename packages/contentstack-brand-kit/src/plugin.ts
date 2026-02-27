import type { PluginFunction } from '@lytics/sdk-kit';
import type {
  AgentGuideline,
  BrandKit,
  BrandKitPluginConfig,
  IngestPayload,
  IngestResponse,
  KVContent,
  ListContentOptions,
  ListContentResponse,
  SearchParams,
  SearchResponse,
  VoiceProfile,
} from './types';

const DEFAULT_BRAND_KIT_BASE_URL = 'https://brand-kits-api.contentstack.com';
const DEFAULT_KV_BASE_URL = 'https://ai.contentstack.com';

export function brandKitPlugin(config: BrandKitPluginConfig): PluginFunction {
  const brandKitBaseUrl = config.baseUrl ?? DEFAULT_BRAND_KIT_BASE_URL;
  const kvBaseUrl = config.knowledgeVaultBaseUrl ?? DEFAULT_KV_BASE_URL;

  return (plugin) => {
    plugin.ns('brandKit');

    async function brandKitFetch<T>(path: string): Promise<T> {
      const url = new URL(`/v1${path}`, brandKitBaseUrl);

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          headers: {
            authtoken: config.authtoken,
            organization_uid: config.organizationUid,
          },
        });
      } catch (error) {
        throw new Error(
          `Brand Kit API request failed: ${error instanceof Error ? error.message : String(error)} (URL: ${url.pathname})`
        );
      }

      if (!response.ok) {
        let message = `Brand Kit API error ${response.status}`;
        try {
          const body = (await response.json()) as { error_message?: string; message?: string };
          if (body.error_message) {
            message = body.error_message;
          } else if (body.message) {
            message = body.message;
          }
        } catch {
          // Ignore JSON parse failures
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error(`Invalid authtoken or organization_uid: ${message}`);
        }
        throw new Error(`Brand Kit API error ${response.status}: ${message}`);
      }

      return (await response.json()) as T;
    }

    async function kvFetch<T>(
      path: string,
      options?: { method?: string; body?: unknown; params?: Record<string, string> }
    ): Promise<T> {
      if (!config.brandKitUid) {
        throw new Error('brandKitUid is required for Knowledge Vault operations');
      }

      const method = options?.method ?? (options?.body ? 'POST' : 'GET');
      const url = new URL(`/brand-kits/v1${path}`, kvBaseUrl);

      if (options?.params) {
        for (const [key, value] of Object.entries(options.params)) {
          url.searchParams.set(key, value);
        }
      }

      const headers: Record<string, string> = {
        authtoken: config.authtoken,
        organization_uid: config.organizationUid,
        brand_kit_uid: config.brandKitUid,
      };

      const init: RequestInit = { method, headers };

      if (options?.body) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(options.body);
      }

      let response: Response;
      try {
        response = await fetch(url.toString(), init);
      } catch (error) {
        throw new Error(
          `Knowledge Vault API request failed: ${error instanceof Error ? error.message : String(error)} (URL: ${url.pathname})`
        );
      }

      if (!response.ok) {
        let message = `Knowledge Vault API error ${response.status}`;
        try {
          const respBody = (await response.json()) as { error_message?: string; message?: string };
          if (respBody.error_message) {
            message = respBody.error_message;
          } else if (respBody.message) {
            message = respBody.message;
          }
        } catch {
          // Ignore JSON parse failures
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error(`Invalid authtoken or organization_uid: ${message}`);
        }
        throw new Error(`Knowledge Vault API error ${response.status}: ${message}`);
      }

      return (await response.json()) as T;
    }

    plugin.expose({
      brandKit: {
        async list(): Promise<BrandKit[]> {
          const data = await brandKitFetch<{ brand_kits: BrandKit[] }>('/brand-kits');
          return data.brand_kits;
        },

        async get(brandKitUid: string): Promise<BrandKit> {
          const data = await brandKitFetch<{ brand_kit: BrandKit }>(`/brand-kits/${brandKitUid}`);
          return data.brand_kit;
        },

        async listGuidelines(brandKitUid: string): Promise<AgentGuideline[]> {
          const data = await brandKitFetch<{ agent_guidelines: AgentGuideline[] }>(
            `/brand-kits/${brandKitUid}/agent-guidelines`
          );
          return data.agent_guidelines;
        },

        async getResolvedGuidelines(
          brandKitUid: string,
          guidelineUid: string
        ): Promise<AgentGuideline> {
          const data = await brandKitFetch<{ data: AgentGuideline }>(
            `/brand-kits/${brandKitUid}/agent-guidelines/${guidelineUid}/resolved`
          );
          return data.data;
        },

        async listVoiceProfiles(brandKitUid: string): Promise<VoiceProfile[]> {
          const data = await brandKitFetch<{ voice_profiles: VoiceProfile[] }>(
            `/brand-kits/${brandKitUid}/voice-profiles`
          );
          return data.voice_profiles;
        },

        async getVoiceProfile(brandKitUid: string, profileUid: string): Promise<VoiceProfile> {
          const data = await brandKitFetch<{ voice_profile: VoiceProfile }>(
            `/brand-kits/${brandKitUid}/voice-profiles/${profileUid}`
          );
          return data.voice_profile;
        },
      },

      knowledgeVault: {
        async ingest(payload: IngestPayload): Promise<IngestResponse> {
          return await kvFetch<IngestResponse>('/knowledge-vault/', { body: payload });
        },

        async search(params: SearchParams): Promise<SearchResponse> {
          return await kvFetch<SearchResponse>('/knowledge-vault/search', { body: params });
        },

        async hybridSearch(params: SearchParams): Promise<SearchResponse> {
          return await kvFetch<SearchResponse>('/knowledge-vault/hybrid-search', { body: params });
        },

        async listContent(options?: ListContentOptions): Promise<ListContentResponse> {
          const params: Record<string, string> = {};
          if (options?.skip != null) params.skip = String(options.skip);
          if (options?.limit != null) params.limit = String(options.limit);
          if (options?.sort) params.sort = options.sort;
          if (options?.order) params.order = options.order;
          if (options?.typeahead) params.typeahead = options.typeahead;
          return await kvFetch<ListContentResponse>('/knowledge-vault/get-context', { params });
        },

        async getContent(contentUid: string): Promise<KVContent> {
          return await kvFetch<KVContent>(`/knowledge-vault/get-context/${contentUid}`);
        },

        async updateContent(contentUid: string, payload: IngestPayload): Promise<unknown> {
          return await kvFetch(`/knowledge-vault/${contentUid}`, {
            method: 'PUT',
            body: payload,
          });
        },

        async deleteContent(contentUid: string): Promise<unknown> {
          return await kvFetch(`/knowledge-vault/${contentUid}`, { method: 'DELETE' });
        },
      },
    });
  };
}

import type { PluginFunction } from '@lytics/sdk-kit';
import type {
  AgentGuideline,
  BrandKit,
  BrandKitPluginConfig,
  IngestPayload,
  IngestResponse,
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

    async function kvFetch<T>(path: string, body: unknown): Promise<T> {
      if (!config.brandKitUid) {
        throw new Error('brandKitUid is required for Knowledge Vault operations');
      }

      const url = new URL(`/brand-kits/v1${path}`, kvBaseUrl);

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authtoken: config.authtoken,
            organization_uid: config.organizationUid,
            brand_kit_uid: config.brandKitUid,
          },
          body: JSON.stringify(body),
        });
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
          const data = await brandKitFetch<{ guidelines: AgentGuideline[] }>(
            `/brand-kits/${brandKitUid}/guidelines`
          );
          return data.guidelines;
        },

        async getResolvedGuidelines(
          brandKitUid: string,
          guidelineUid: string
        ): Promise<AgentGuideline> {
          const data = await brandKitFetch<{ guideline: AgentGuideline }>(
            `/brand-kits/${brandKitUid}/guidelines/${guidelineUid}/resolve`
          );
          return data.guideline;
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
          return await kvFetch<IngestResponse>('/ingest', payload);
        },
      },
    });
  };
}

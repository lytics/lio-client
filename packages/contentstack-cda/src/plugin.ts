import type { PluginFunction } from '@lytics/sdk-kit';
import type { CdaContentType, CdaEntry, ContentstackCdaConfig } from './types';

const DEFAULT_BASE_URL = 'https://cdn.contentstack.io';

/**
 * Escape special regex characters in a string so it can be safely
 * embedded in a CDA `$regex` query.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function contentstackCdaPlugin(config: ContentstackCdaConfig): PluginFunction {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

  return (plugin) => {
    plugin.ns('contentstackCda');

    async function cdaFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
      const url = new URL(`/v3${path}`, baseUrl);
      url.searchParams.set('environment', config.environment);

      if (params) {
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, value);
        }
      }

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          headers: {
            api_key: config.apiKey,
            access_token: config.deliveryToken,
          },
        });
      } catch (error) {
        throw new Error(
          `Contentstack CDA request failed: ${error instanceof Error ? error.message : String(error)} (URL: ${url.pathname}${url.search})`
        );
      }

      if (!response.ok) {
        let message = `Contentstack CDA error ${response.status}`;
        try {
          const body = (await response.json()) as { error_message?: string };
          if (body.error_message) {
            message = body.error_message;
          }
        } catch {
          // Ignore JSON parse failures — use the status-based message
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error(`Invalid delivery token or API key for stack: ${message}`);
        }
        throw new Error(`Contentstack CDA error ${response.status}: ${message}`);
      }

      return (await response.json()) as T;
    }

    plugin.expose({
      contentstackCda: {
        async getContentTypes(): Promise<CdaContentType[]> {
          const data = await cdaFetch<{ content_types: CdaContentType[] }>('/content_types');
          return data.content_types.filter((t) => !t.uid.startsWith('built_io_'));
        },

        async getEntries(
          contentTypeUid: string,
          opts?: { limit?: number; query?: string; include_count?: boolean }
        ): Promise<{ entries: CdaEntry[]; count?: number }> {
          const params: Record<string, string> = {
            limit: String(opts?.limit ?? 50),
            include_count: String(opts?.include_count ?? true),
          };

          if (opts?.query) {
            const escaped = escapeRegex(opts.query);
            params.query = JSON.stringify({
              title: { $regex: escaped, $options: 'i' },
            });
          }

          const data = await cdaFetch<{ entries: CdaEntry[]; count?: number }>(
            `/content_types/${contentTypeUid}/entries`,
            params
          );
          return { entries: data.entries, count: data.count };
        },

        async getEntry(contentTypeUid: string, entryUid: string): Promise<CdaEntry> {
          const data = await cdaFetch<{ entry: CdaEntry }>(
            `/content_types/${contentTypeUid}/entries/${entryUid}`
          );
          return data.entry;
        },
      },
    });
  };
}

import { SDK } from '@lytics/sdk-kit';
import { aiPlugin } from './plugins/ai';
import { contentPlugin } from './plugins/content';
import { jobsPlugin } from './plugins/jobs';
import { providersPlugin } from './plugins/providers';
import { schemaPlugin } from './plugins/schema';
import { segmentsPlugin } from './plugins/segments';
import { lyticsTransportPlugin } from './plugins/transport';
import { workflowsPlugin } from './plugins/workflows';
import type { LioClient, LioClientConfig } from './types';

// Extend SDK type to include Lytics API methods
declare module '@lytics/sdk-kit' {
  interface SDK extends LioClient {}
}

/**
 * Create a new Lytics API client
 *
 * @example
 * ```typescript
 * const lio = createLioClient({
 *   apiKey: process.env.LYTICS_API_KEY,
 *   baseUrl: 'https://api.lytics.io'
 * });
 *
 * // Initialize the client
 * await lio.init();
 *
 * // Use workflows API
 * const jobs = await lio.workflows.list();
 * ```
 */
export function createLioClient(config: LioClientConfig): LioClient {
  // Validate required config
  if (!config.apiKey) {
    throw new Error('apiKey is required in LioClientConfig');
  }

  // Extract Lio-specific config (to avoid duplication in SDK config)
  const { apiKey, baseUrl, accountId, plugins, ...sdkConfig } = config;

  // Create SDK instance with config
  const sdk = new SDK({
    name: 'lio-client',
    version: '0.1.0',
    apiKey,
    accountId,
    transport: {
      baseUrl: baseUrl || 'https://api.lytics.io',
    },
    ...sdkConfig,
  });

  // Register core plugins
  sdk
    .use(lyticsTransportPlugin)
    .use(workflowsPlugin)
    .use(contentPlugin)
    .use(schemaPlugin)
    .use(segmentsPlugin)
    .use(aiPlugin)
    .use(jobsPlugin)
    .use(providersPlugin);

  // Register any additional plugins from config
  if (plugins) {
    for (const plugin of plugins) {
      sdk.use(plugin);
    }
  }

  return sdk as unknown as LioClient;
}

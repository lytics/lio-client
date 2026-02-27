/**
 * Providers Plugin
 *
 * Provides access to Lytics integration providers:
 * - List available integration providers
 */

import type { PluginFunction, SDK } from '@lytics/sdk-kit';
import type { Provider, ProvidersPlugin } from '../types';
import type { LyticsTransportPlugin } from './transport';

export const providersPlugin: PluginFunction = (plugin, instance, config) => {
  plugin.ns('providers');

  plugin.expose({
    providers: {
      async list(): Promise<Provider[]> {
        plugin.emit('providers:list', {});

        const accountId = config.get<string>('accountId');
        if (!accountId) {
          throw new Error(
            'accountId is required for providers.list(). Pass accountId in createLioClient config.'
          );
        }

        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const response = await transport.get<Provider[]>('/v2/provider', {
          account_id: accountId,
        });

        const providers = response ?? [];

        plugin.emit('providers:listed', { count: providers.length });

        return providers;
      },
    } as ProvidersPlugin,
  });
};

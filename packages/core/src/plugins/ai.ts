/**
 * AI Plugin
 *
 * Provides access to Lytics AI prompt endpoints:
 * - Get LLM-ready context for a segment
 */

import type { PluginFunction, SDK } from '@lytics/sdk-kit';
import type { AiPlugin } from '../types';
import type { LyticsTransportPlugin } from './transport';

export const aiPlugin: PluginFunction = (plugin, instance) => {
  plugin.ns('ai');

  plugin.expose({
    ai: {
      async segmentPrompt(segmentId: string): Promise<string> {
        if (!segmentId) {
          throw new Error('Segment ID is required');
        }

        plugin.emit('ai:segment-prompt', { segmentId });

        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const response = await transport.get<string>(`/v2/ai/prompt/segment/${segmentId}`);

        plugin.emit('ai:segment-prompt-received', { segmentId });

        return response;
      },
    } as AiPlugin,
  });
};

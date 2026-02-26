/**
 * Segments Plugin
 *
 * Provides access to Lytics audience segments:
 * - List segments with filtering
 * - Get a single segment by slug or ID
 */

import type { PluginFunction, SDK } from '@lytics/sdk-kit';
import type {
  Segment,
  SegmentGetOptions,
  SegmentListOptions,
  SegmentSize,
  SegmentSizesOptions,
  SegmentsPlugin,
} from '../types';
import type { LyticsTransportPlugin } from './transport';

export const segmentsPlugin: PluginFunction = (plugin, instance) => {
  plugin.ns('segments');

  plugin.expose({
    segments: {
      async list(options?: SegmentListOptions): Promise<Segment[]> {
        plugin.emit('segments:list', { options });

        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const params: Record<string, string | boolean> = {};
        if (options?.table) params.table = options.table;
        if (options?.valid) params.valid = options.valid;
        if (options?.kind) params.kind = options.kind;
        if (options?.filterPredefined != null) params.filterpredefined = options.filterPredefined;

        const response = await transport.get<Segment[]>(
          '/v2/segment',
          Object.keys(params).length > 0 ? params : undefined
        );

        const segments = response ?? [];

        plugin.emit('segments:listed', { count: segments.length });

        return segments;
      },

      async get(slugOrId: string, options?: SegmentGetOptions): Promise<Segment> {
        if (!slugOrId) {
          throw new Error('Segment slug or ID is required');
        }

        plugin.emit('segments:get', { slugOrId });

        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const params: Record<string, boolean> = {};
        if (options?.sizes) params.sizes = options.sizes;

        const segment = await transport.get<Segment>(
          `/v2/segment/${slugOrId}`,
          Object.keys(params).length > 0 ? params : undefined
        );

        plugin.emit('segments:got', { slugOrId });

        return segment;
      },
      // NOTE: Uses the v1 /api/segment/sizes endpoint which returns pre-computed
      // sizes from a bulk KV blob (sub-100ms). Waiting on lio PR to add ?sizes=true
      // support to GET /v2/segment (list), at which point this can be replaced by
      // passing sizes: true to list().
      async sizes(options?: SegmentSizesOptions): Promise<SegmentSize[]> {
        plugin.emit('segments:sizes', { options });

        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const params: Record<string, string> = {};
        if (options?.table) params.table = options.table;
        if (options?.ids) params.ids = options.ids.join(',');

        const response = await transport.get<SegmentSize[]>(
          '/api/segment/sizes',
          Object.keys(params).length > 0 ? params : undefined
        );

        const sizes = response ?? [];

        plugin.emit('segments:sized', { count: sizes.length });

        return sizes;
      },
    } as SegmentsPlugin,
  });
};

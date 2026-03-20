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
  SegmentGroup,
  SegmentListOptions,
  SegmentScanOptions,
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
        if (options?.sizes) params.sizes = true;

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
      async groups(): Promise<SegmentGroup[]> {
        plugin.emit('segments:groups', {});

        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const response = await transport.get<SegmentGroup[]>('/v2/segment/group');
        const groups = response ?? [];

        plugin.emit('segments:grouped', { count: groups.length });

        return groups;
      },

      async scan(
        segmentId: string,
        options?: SegmentScanOptions
      ): Promise<Record<string, unknown>[]> {
        if (!segmentId) {
          throw new Error('Segment ID is required');
        }

        plugin.emit('segments:scan', { segmentId, options });

        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const params: Record<string, string | number> = {};
        if (options?.limit) params.limit = options.limit;
        if (options?.table) params.table = options.table;
        if (options?.fields) params.fields = options.fields.join(',');
        if (options?.sortfield) params.sortfield = options.sortfield;
        if (options?.sortorder) params.sortorder = options.sortorder;

        const response = await transport.get<{ data: Record<string, unknown>[] }>(
          `/api/segment/${segmentId}/scan`,
          Object.keys(params).length > 0 ? params : undefined
        );

        const entities = response.data ?? [];

        plugin.emit('segments:scanned', { segmentId, count: entities.length });

        return entities;
      },
    } as SegmentsPlugin,
  });
};

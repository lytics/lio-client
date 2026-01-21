/**
 * Schema Plugin
 *
 * Provides access to Lytics table schemas:
 * - Get schema for content or user tables
 * - Field definitions with types
 * - Simple in-memory caching (1 hour TTL)
 */

import type { PluginFunction, SDK } from '@lytics/sdk-kit';
import type { Schema, SchemaPlugin } from '../types';
import type { LyticsTransportPlugin } from './transport';

export interface SchemaResponse {
  columns: Array<{
    as: string;
    type: string;
    description?: string;
    froms?: string[];
  }>;
}

/**
 * Cache entry for schemas
 */
interface SchemaCacheEntry {
  schema: Schema;
  timestamp: number;
}

/**
 * Schema plugin
 *
 * @example
 * ```typescript
 * // Get content schema
 * const schema = await lio.schema.get('content');
 * console.log(schema.name);    // 'content'
 * console.log(schema.fields);  // [{ id: 'url', type: 'string', ... }, ...]
 *
 * // Get user schema
 * const userSchema = await lio.schema.get('user');
 * ```
 */
export const schemaPlugin: PluginFunction = (plugin, instance, config) => {
  plugin.ns('schema');

  // Set defaults
  plugin.defaults({
    schema: {
      cacheTTL: 3600000, // 1 hour in milliseconds
    },
  });

  // In-memory cache
  const schemaCache = new Map<string, SchemaCacheEntry>();
  const cacheTTL = config.get<number>('schema.cacheTTL') || 3600000;

  /**
   * Check if cached schema is still valid
   */
  function isCacheValid(entry: SchemaCacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < cacheTTL;
  }

  /**
   * Transform API response to our Schema format
   */
  function transformSchema(table: string, response: SchemaResponse): Schema {
    return {
      name: table,
      fields: response.columns.map((col) => ({
        id: col.as,
        type: col.type,
        description: col.description,
      })),
    };
  }

  // Clear cache on SDK destroy
  instance.on('sdk:destroy', () => {
    schemaCache.clear();
  });

  // Expose API
  plugin.expose({
    schema: {
      /**
       * Get schema for a table
       *
       * Results are cached for 1 hour by default (configurable via schema.cacheTTL).
       *
       * @param table - Table name ('content' or 'user')
       * @returns Schema with field definitions
       *
       * @example
       * ```typescript
       * const schema = await lio.schema.get('content');
       *
       * console.log(schema.name); // 'content'
       * console.log(schema.fields);
       * // [
       * //   { id: 'url', type: 'string', description: 'Content URL' },
       * //   { id: 'title', type: 'string', description: 'Content title' },
       * //   { id: 'lytics', type: 'map', description: 'Topic scores' },
       * //   ...
       * // ]
       *
       * // Find a specific field
       * const urlField = schema.fields.find(f => f.id === 'url');
       * console.log(urlField?.type); // 'string'
       * ```
       */
      async get(table: string): Promise<Schema> {
        if (!table) {
          throw new Error('Table name is required');
        }

        // Check cache
        const cached = schemaCache.get(table);
        if (cached && isCacheValid(cached)) {
          plugin.emit('schema:cache-hit', { table });
          return cached.schema;
        }

        plugin.emit('schema:get', { table });

        // Get transport
        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        // Fetch schema from API
        const response = await transport.get<SchemaResponse>(`/v2/schema/${table}`);

        // Transform and cache
        const schema = transformSchema(table, response);
        schemaCache.set(table, {
          schema,
          timestamp: Date.now(),
        });

        plugin.emit('schema:got', { table, fieldCount: schema.fields.length });

        return schema;
      },

      /**
       * Clear schema cache
       * Useful for testing or if you need fresh schema data
       *
       * @param table - Optional table name. If omitted, clears entire cache.
       *
       * @example
       * ```typescript
       * // Clear specific table
       * lio.schema.clearCache('content');
       *
       * // Clear all cached schemas
       * lio.schema.clearCache();
       * ```
       */
      clearCache(table?: string): void {
        if (table) {
          schemaCache.delete(table);
          plugin.emit('schema:cache-cleared', { table });
        } else {
          schemaCache.clear();
          plugin.emit('schema:cache-cleared', { all: true });
        }
      },
    } as SchemaPlugin & { clearCache(table?: string): void },
  });
};

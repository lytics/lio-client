/**
 * Lytics Transport Plugin
 *
 * Wraps SDK Kit's transport plugin with Lytics API-specific behavior:
 * - Query parameter authentication (?key=xxx)
 * - Response envelope unwrapping (data field)
 * - URL building with baseUrl
 * - Error handling with request IDs
 *
 * Uses SDK Kit's transport under the hood for:
 * - Retry logic with exponential backoff
 * - Multiple transport methods (fetch, beacon, XHR, pixel)
 * - Automatic transport selection
 * - Timeout handling
 */

import type { PluginFunction, SDK } from '@lytics/sdk-kit';
import {
  transportPlugin as sdkTransportPlugin,
  type TransportPlugin,
  type TransportRequest,
  type TransportResponse,
} from '@lytics/sdk-kit-plugins';

export interface LyticsTransportConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  request_id: string;
}

export interface ApiError {
  error: string;
  status: number;
  request_id?: string;
}

type PostContentType = 'application/json' | 'text/plain' | 'application/x-www-form-urlencoded';

export interface LyticsTransportPlugin {
  get<T = any>(path: string, params?: Record<string, any>): Promise<T>;
  post<T = any>(
    path: string,
    body?: any,
    params?: Record<string, any>,
    options?: { contentType?: PostContentType; unwrap?: boolean }
  ): Promise<T>;
}

/**
 * Lytics transport plugin
 *
 * @example
 * ```typescript
 * const lio = createLioClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'https://api.lytics.io'
 * });
 *
 * await lio.init();
 * const data = await lio.workflows.list();
 * ```
 */
export const lyticsTransportPlugin: PluginFunction = (plugin, instance, config) => {
  plugin.ns('transport');

  // Set defaults
  plugin.defaults({
    transport: {
      baseUrl: 'https://api.lytics.io',
      defaultTimeout: 10000,
      defaultRetries: 3,
    },
  });

  // Get configuration
  const apiKey = config.get<string>('apiKey');
  const baseUrl = config.get<string>('transport.baseUrl') || 'https://api.lytics.io';

  if (!apiKey) {
    throw new Error('Lytics API key is required. Provide it via config: { apiKey: "xxx" }');
  }

  // Register SDK Kit's transport plugin first
  instance.use(sdkTransportPlugin);

  // Get reference to SDK transport
  const sdkTransport = (instance as SDK & { transport: TransportPlugin }).transport;

  /**
   * Build full URL with authentication
   */
  function buildUrl(path: string, params?: Record<string, any>): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Build full URL
    const url = new URL(normalizedPath, baseUrl);

    // Add API key as query parameter
    url.searchParams.set('key', apiKey);

    // Add additional params
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Unwrap Lytics API response envelope
   */
  function unwrapResponse<T>(response: TransportResponse): T {
    if (!response.ok) {
      const error = new Error((response.data as ApiError)?.error || `HTTP ${response.status}`);
      (error as any).status = response.status;
      (error as any).request_id = (response.data as ApiError)?.request_id;
      throw error;
    }

    // API returns { data, status, request_id }
    const apiResponse = response.data as ApiResponse<T>;

    // Check envelope status too
    if (apiResponse.status >= 400) {
      const error = new Error(`API error ${apiResponse.status}`);
      (error as any).status = apiResponse.status;
      (error as any).request_id = apiResponse.request_id;
      throw error;
    }

    return apiResponse.data;
  }

  // Expose Lytics-specific API
  plugin.expose({
    transport: {
      /**
       * GET request to Lytics API
       */
      async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
        const url = buildUrl(path, params);
        const startTime = Date.now();

        plugin.emit('lytics:request', { method: 'GET', path, url, params });

        const request: TransportRequest = {
          url,
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        };

        const response = await sdkTransport.send(request);
        const requestId = (response.data as ApiResponse)?.request_id;
        const data = unwrapResponse<T>(response);

        plugin.emit('lytics:response', {
          method: 'GET',
          path,
          url,
          status: response.status,
          duration: Date.now() - startTime,
          requestId,
        });

        return data;
      },

      /**
       * POST request to Lytics API
       */
      async post<T = any>(
        path: string,
        body?: any,
        params?: Record<string, any>,
        options?: { contentType?: PostContentType; unwrap?: boolean }
      ): Promise<T> {
        const contentType = options?.contentType || 'application/json';
        const shouldUnwrap = options?.unwrap !== false; // Default to true

        const url = buildUrl(path, params);
        const startTime = Date.now();

        plugin.emit('lytics:request', { method: 'POST', path, url, params, body });

        // For form-urlencoded, pass the string body directly via text/plain
        // serialization path and override Content-Type in headers.
        const isForm = contentType === 'application/x-www-form-urlencoded';
        const request: TransportRequest = {
          url,
          method: 'POST',
          data: body,
          contentType: isForm ? 'text/plain' : contentType,
          headers: {
            Accept: 'application/json',
            ...(isForm ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
          },
        };

        const response = await sdkTransport.send(request);
        const requestId = (response.data as ApiResponse)?.request_id;

        // Unwrap response if requested (default behavior for JSON endpoints)
        const data = shouldUnwrap ? unwrapResponse<T>(response) : (response.data as T);

        plugin.emit('lytics:response', {
          method: 'POST',
          path,
          url,
          status: response.status,
          duration: Date.now() - startTime,
          requestId,
        });

        return data;
      },
    } as LyticsTransportPlugin,
  });
};

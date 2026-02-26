/**
 * Workflows Plugin
 *
 * Provides access to Lytics workflow orchestration:
 * - List workflow jobs
 * - Get job details
 * - Get job logs
 */

import type { PluginFunction, SDK } from '@lytics/sdk-kit';
import type { WorkflowJob, WorkflowsPlugin } from '../types';
import type { LyticsTransportPlugin } from './transport';

export interface WorkflowListOptions {
  /** Filter by workflow name (kebab-case, e.g., 'contentstack-sync') */
  workflow?: string;
  /** Show all jobs including completed ones */
  show_all?: boolean;
}

export interface WorkflowJobResponse {
  id: string;
  name: string;
  workflow: string;
  status: 'sleeping' | 'running' | 'completed' | 'failed';
  updated: string;
  config: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WorkflowLogsResponse {
  logs: Array<{
    id: string;
    message: string;
    timestamp: string;
    level: string;
  }>;
}

/**
 * Workflows plugin
 *
 * @example
 * ```typescript
 * const jobs = await lio.workflows.list({ workflow: 'contentstack-sync' });
 * const job = await lio.workflows.get('job-123');
 * const logs = await lio.workflows.getLogs('job-123');
 * ```
 */
export const workflowsPlugin: PluginFunction = (plugin, instance, config) => {
  plugin.ns('workflows');

  // Expose API
  plugin.expose({
    workflows: {
      async list(options?: WorkflowListOptions): Promise<WorkflowJob[]> {
        plugin.emit('workflows:list', options);

        // Build query params
        const params: Record<string, string | boolean> = {};

        const accountId = config.get<string>('accountId');
        if (accountId) {
          params.account_id = accountId;
        }

        if (options?.workflow) {
          params.workflow = options.workflow;
        }
        if (options?.show_all) {
          params.show_all = options.show_all;
        }

        // Make API request
        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const jobs = await transport.get<WorkflowJobResponse[]>('/v2/job', params);

        plugin.emit('workflows:listed', { count: jobs.length });

        return jobs;
      },

      async get(id: string): Promise<WorkflowJob> {
        if (!id) {
          throw new Error('Job ID is required');
        }

        plugin.emit('workflows:get', { id });

        // Make API request
        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const params: Record<string, string> = {};
        const accountId = config.get<string>('accountId');
        if (accountId) {
          params.account_id = accountId;
        }

        const job = await transport.get<WorkflowJobResponse>(
          `/v2/job/${id}`,
          Object.keys(params).length > 0 ? params : undefined
        );

        plugin.emit('workflows:got', { id, status: job.status });

        return job;
      },

      async getLogs(id?: string): Promise<WorkflowLogsResponse> {
        plugin.emit('workflows:get-logs', { id });

        // Make API request
        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const params: Record<string, string> = {};
        const accountId = config.get<string>('accountId');
        if (accountId) {
          params.account_id = accountId;
        }

        const path = id ? `/v2/job/${id}/logs` : '/v2/job/logs';
        const logs = await transport.get<WorkflowLogsResponse>(
          path,
          Object.keys(params).length > 0 ? params : undefined
        );

        plugin.emit('workflows:got-logs', { id, count: logs.logs?.length || 0 });

        return logs;
      },
    } as WorkflowsPlugin,
  });
};

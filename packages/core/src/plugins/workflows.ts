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
export const workflowsPlugin: PluginFunction = (plugin, instance) => {
  plugin.ns('workflows');

  // Expose API
  plugin.expose({
    workflows: {
      /**
       * List workflow jobs
       *
       * @param options - Filter options
       * @returns Array of workflow jobs
       *
       * @example
       * ```typescript
       * // List all jobs
       * const allJobs = await lio.workflows.list();
       *
       * // List jobs for a specific workflow
       * const syncJobs = await lio.workflows.list({
       *   workflow: 'contentstack-sync'
       * });
       *
       * // Show completed jobs too
       * const allJobsIncludingCompleted = await lio.workflows.list({
       *   show_all: true
       * });
       * ```
       */
      async list(options?: WorkflowListOptions): Promise<WorkflowJob[]> {
        plugin.emit('workflows:list', options);

        // Build query params
        const params: Record<string, any> = {};
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

      /**
       * Get a specific workflow job by ID
       *
       * @param id - Job ID
       * @returns Workflow job details
       *
       * @example
       * ```typescript
       * const job = await lio.workflows.get('01JJMR5PCMRB7YMZ45P86NAXKK');
       * console.log(job.status); // 'completed'
       * ```
       */
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

        const job = await transport.get<WorkflowJobResponse>(`/v2/job/${id}`);

        plugin.emit('workflows:got', { id, status: job.status });

        return job;
      },

      /**
       * Get logs for a workflow job
       *
       * @param id - Optional job ID. If omitted, returns logs for all jobs.
       * @returns Workflow logs
       *
       * @example
       * ```typescript
       * // Get logs for a specific job
       * const logs = await lio.workflows.getLogs('01JJMR5PCMRB7YMZ45P86NAXKK');
       *
       * // Get logs for all jobs
       * const allLogs = await lio.workflows.getLogs();
       * ```
       */
      async getLogs(id?: string): Promise<WorkflowLogsResponse> {
        plugin.emit('workflows:get-logs', { id });

        // Make API request
        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const path = id ? `/v2/job/${id}/logs` : '/v2/job/logs';
        const logs = await transport.get<WorkflowLogsResponse>(path);

        plugin.emit('workflows:got-logs', { id, count: logs.logs?.length || 0 });

        return logs;
      },
    } as WorkflowsPlugin,
  });
};

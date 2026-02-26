/**
 * Jobs Plugin
 *
 * Provides access to Lytics integration jobs:
 * - List jobs with filtering options
 */

import type { PluginFunction, SDK } from '@lytics/sdk-kit';
import type { Job, JobListOptions, JobsPlugin } from '../types';
import type { LyticsTransportPlugin } from './transport';

export const jobsPlugin: PluginFunction = (plugin, instance, config) => {
  plugin.ns('jobs');

  plugin.expose({
    jobs: {
      async list(options?: JobListOptions): Promise<Job[]> {
        plugin.emit('jobs:list', { options });

        const accountId = config.get<string>('accountId');
        if (!accountId) {
          throw new Error(
            'accountId is required for jobs.list(). Pass accountId in createLioClient config.'
          );
        }

        const transport = (instance as SDK & { transport: LyticsTransportPlugin }).transport;
        if (!transport) {
          throw new Error('Transport plugin not registered. Use lyticsTransportPlugin.');
        }

        const params: Record<string, string | boolean> = {
          account_id: accountId,
        };
        if (options?.showCompleted) params.show_completed = options.showCompleted;
        if (options?.showState) params.show_state = options.showState;
        if (options?.showAll) params.show_all = options.showAll;

        const response = await transport.get<Job[]>('/v2/job', params);

        const jobs = response ?? [];

        plugin.emit('jobs:listed', { count: jobs.length });

        return jobs;
      },
    } as JobsPlugin,
  });
};

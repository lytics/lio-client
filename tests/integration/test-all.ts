/**
 * Integration Test - Complete API Validation
 *
 * Tests all lio-client APIs against live Lytics API.
 *
 * Usage:
 *   LYTICS_API_KEY=your-key pnpm test:integration
 */

import { createLioClient } from '../../packages/core/src/index';

async function main() {
  const apiKey = process.env.LYTICS_API_KEY;
  if (!apiKey) {
    console.error('❌ LYTICS_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('🧪 lio-client Integration Tests\n');
  console.log('='.repeat(60));

  const lio = createLioClient({ apiKey });
  await lio.init();
  console.log('✅ Client initialized\n');

  let passedTests = 0;
  let failedTests = 0;

  // Helper to run tests
  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error: any) {
      console.error(`❌ ${name}`);
      console.error(`   ${error.message}`);
      failedTests++;
    }
  };

  // ==============================================
  // WORKFLOWS API
  // ==============================================
  console.log('📋 Workflows API');
  console.log('-'.repeat(60));

  await test('workflows.list() returns array', async () => {
    const jobs = await lio.workflows.list();
    if (!Array.isArray(jobs)) throw new Error('Expected array');
  });

  await test('workflows.get(id) retrieves job', async () => {
    const jobs = await lio.workflows.list();
    if (jobs.length === 0) throw new Error('No jobs to test');
    const job = await lio.workflows.get(jobs[0].id);
    if (!job.id) throw new Error('Missing job id');
  });

  await test('workflows.getLogs() returns logs', async () => {
    const logs = await lio.workflows.getLogs();
    if (!logs.logs || !Array.isArray(logs.logs)) throw new Error('Expected logs array');
  });

  // ==============================================
  // CONTENT API
  // ==============================================
  console.log('\n📄 Content Api');
  console.log('-'.repeat(60));

  let testUrl: string | null = null;

  await test('content.scan() yields batches', async () => {
    let found = false;
    for await (const batch of lio.content.scan({ limit: 10 })) {
      if (!Array.isArray(batch)) throw new Error('Expected batch array');
      if (batch.length > 0 && batch[0].url) {
        testUrl = batch[0].url;
        found = true;
      }
      break;
    }
    if (!found) throw new Error('No content found');
  });

  await test('content.getByUrl() retrieves entity', async () => {
    if (!testUrl) throw new Error('No test URL available');
    const content = await lio.content.getByUrl(testUrl);
    if (!content.url) throw new Error('Missing URL in response');
  });

  await test('content URL normalization works', async () => {
    if (!testUrl) throw new Error('No test URL available');
    const withProtocol = `https://${testUrl}`;
    const content = await lio.content.getByUrl(withProtocol);
    if (!content.url) throw new Error('URL normalization failed');
  });

  // ==============================================
  // SCHEMA API
  // ==============================================
  console.log('\n📊 Schema API');
  console.log('-'.repeat(60));

  await test('schema.get("content") returns schema', async () => {
    const schema = await lio.schema.get('content');
    if (!schema.name) throw new Error('Missing schema name');
    if (!Array.isArray(schema.fields)) throw new Error('Expected fields array');
    if (schema.fields.length === 0) throw new Error('No fields found');
  });

  await test('schema.get("user") returns schema', async () => {
    const schema = await lio.schema.get('user');
    if (!schema.name) throw new Error('Missing schema name');
    if (schema.fields.length === 0) throw new Error('No fields found');
  });

  await test('schema caching works', async () => {
    const start1 = Date.now();
    await lio.schema.get('content');
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await lio.schema.get('content');
    const time2 = Date.now() - start2;

    if (time2 >= time1) throw new Error(`Cache not working (${time2}ms >= ${time1}ms)`);
  });

  await test('schema.clearCache() invalidates cache', async () => {
    lio.schema.clearCache('content');
    const schema = await lio.schema.get('content');
    if (!schema.name) throw new Error('Failed to fetch after cache clear');
  });

  // ==============================================
  // EVENT SYSTEM
  // ==============================================
  console.log('\n🔔 Event System');
  console.log('-'.repeat(60));

  await test('event system fires events', async () => {
    let eventFired = false;
    const unsubscribe = lio.on('test:event', () => {
      eventFired = true;
    });
    lio.emit('test:event');
    unsubscribe();
    if (!eventFired) throw new Error('Event not fired');
  });

  // ==============================================
  // SUMMARY
  // ==============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Total:  ${passedTests + failedTests}`);

  await lio.destroy();

  if (failedTests > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

main().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});

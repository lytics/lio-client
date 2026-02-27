/**
 * Manual integration test for content.enrich() and content.align()
 *
 * Usage: LYTICS_API_KEY=xxx pnpm vitest run scripts/test-enrich.ts
 */

import { createLioClient } from '@lytics/lio-client';
import { describe, expect, it } from 'vitest';

const apiKey = process.env.LYTICS_API_KEY;

describe.skipIf(!apiKey)('content.enrich() + content.align() integration', () => {
  it('enrich({ text }) returns topics', async () => {
    const lio = createLioClient({ apiKey: apiKey! });
    await lio.init();

    const result = await lio.content.enrich({
      text: 'Jade Leaf Tea Co. has launched a premium milk tea brand featuring direct-trade sourcing from four Asian countries. The teas offer health benefits with half the sugar of lattes and L-theanine for focus.',
    });

    console.log('Topics:', result.topics);
    console.log('Inferred:', result.inferred_topics);

    expect(result.input).toBeTruthy();
    expect(result.topics).toBeDefined();

    await lio.destroy();
  }, 15000);

  it('enrich({ url }) returns topics', async () => {
    const lio = createLioClient({ apiKey: apiKey! });
    await lio.init();

    const result = await lio.content.enrich({ url: 'https://www.lytics.com' });

    console.log('URL topics:', result.topics);
    expect(result.topics).toBeDefined();

    await lio.destroy();
  }, 15000);

  it('align() returns ranked segments', async () => {
    const lio = createLioClient({ apiKey: apiKey! });
    await lio.init();

    const segments = await lio.content.align(
      { Coffee: 0.85, Wellness: 0.72, Tea: 0.9 },
      { limit: 5 }
    );

    console.log('Aligned segments:');
    for (const s of segments) {
      console.log(`  ${s.segment_name} (${s.segment_size}): ${s.alignment.toFixed(3)}`);
    }

    expect(Array.isArray(segments)).toBe(true);

    await lio.destroy();
  }, 15000);
});

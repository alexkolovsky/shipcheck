import { describe, expect, it } from 'vitest';
import { performanceRules } from '../../src/checks/performance';
import type { PageAsset } from '../../src/types/context';
import { byId, ids, imageAsset, makeContext, runRules } from '../helpers/context';

const KB = 1024;

const withAssets = (assets: PageAsset[]) => makeContext({ assets });

describe('Performance checks', () => {
  it('flags images over the size threshold and passes when under it', async () => {
    const big = withAssets([
      imageAsset({ url: 'https://example.com/hero.jpg', sizeBytes: 800 * KB }),
      imageAsset({ url: 'https://example.com/small.jpg', sizeBytes: 40 * KB }),
    ]);
    const results = await runRules(performanceRules, big);
    expect(byId(results, 'perf.image.large')?.status).toBe('warning');
    expect(byId(results, 'perf.image.large')?.title).toContain('1 image');

    const ok = withAssets([imageAsset({ sizeBytes: 100 * KB })]);
    expect(byId(await runRules(performanceRules, ok), 'perf.image.size_ok')?.status).toBe('pass');
  });

  it('flags images missing width/height', async () => {
    const ctx = withAssets([
      imageAsset({ hasDimensions: false }),
      imageAsset({ url: 'x.jpg', hasDimensions: true }),
    ]);
    expect(
      byId(await runRules(performanceRules, ctx), 'perf.image.dimensions_missing')?.title,
    ).toContain('1 image');
  });

  it('warns when total JavaScript exceeds the threshold', async () => {
    const ctx = withAssets([
      { url: 'https://example.com/a.js', type: 'script', thirdParty: false, sizeBytes: 300 * KB },
      { url: 'https://example.com/b.js', type: 'script', thirdParty: false, sizeBytes: 300 * KB },
    ]);
    expect(byId(await runRules(performanceRules, ctx), 'perf.js.too_large')?.status).toBe(
      'warning',
    );
  });

  it('flags too many third-party domains', async () => {
    const assets: PageAsset[] = Array.from({ length: 12 }, (_, i) => ({
      url: `https://cdn${i}.example-vendor-${i}.com/s.js`,
      type: 'script',
      thirdParty: true,
    }));
    expect(ids(await runRules(performanceRules, withAssets(assets)))).toContain(
      'perf.third_party.too_many',
    );
  });

  it('does not report image size issues when no sizes are known', async () => {
    const ctx = withAssets([imageAsset({ sizeBytes: undefined })]);
    const results = await runRules(performanceRules, ctx);
    expect(ids(results)).not.toContain('perf.image.large');
    expect(ids(results)).not.toContain('perf.image.size_ok');
  });
});

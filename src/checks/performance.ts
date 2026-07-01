import type { PageAsset } from '../types/context.js';
import type { ShipCheckRule } from '../types/rule.js';
import { formatBytes, toKb } from '../utils/format-bytes.js';
import { baseDomain, getHost } from '../utils/url.js';
import { info, pass, sample, warn } from './_helpers.js';

const byType = (assets: PageAsset[], type: PageAsset['type']): PageAsset[] =>
  assets.filter((asset) => asset.type === type);

const withSize = (assets: PageAsset[]): PageAsset[] =>
  assets.filter((asset) => typeof asset.sizeBytes === 'number');

const totalBytes = (assets: PageAsset[]): number =>
  assets.reduce((sum, asset) => sum + (asset.sizeBytes ?? 0), 0);

const largeImagesRule: ShipCheckRule = {
  id: 'perf.image_size',
  category: 'performance',
  run(ctx) {
    const images = withSize(byType(ctx.assets, 'image'));
    if (images.length === 0) return [];

    const limit = ctx.config.thresholds.maxImageKb;
    const large = images
      .filter((image) => toKb(image.sizeBytes ?? 0) > limit)
      .sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0));

    if (large.length === 0) {
      return [pass('perf.image.size_ok', `Images are under ${limit} KB`)];
    }
    return [
      warn('perf.image.large', `${large.length} image(s) larger than ${limit} KB`, {
        evidence: sample(large.map((img) => `${img.url} (${formatBytes(img.sizeBytes)})`)),
        suggestion: 'Compress or resize large images, and prefer modern formats (WebP/AVIF).',
      }),
    ];
  },
};

const imageDimensionsRule: ShipCheckRule = {
  id: 'perf.image_dimensions',
  category: 'performance',
  run(ctx) {
    const images = byType(ctx.assets, 'image');
    if (images.length === 0) return [];
    const missing = images.filter((image) => image.hasDimensions === false);
    if (missing.length === 0) return [];
    return [
      info('perf.image.dimensions_missing', `${missing.length} image(s) missing width/height`, {
        evidence: sample(missing.map((img) => img.url)),
        suggestion: 'Set width and height attributes to reserve space and reduce layout shift.',
      }),
    ];
  },
};

const lazyLoadingRule: ShipCheckRule = {
  id: 'perf.image_lazy',
  category: 'performance',
  run(ctx) {
    const images = byType(ctx.assets, 'image');
    if (images.length < 6) return [];
    const anyLazy = images.some((image) => image.loading === 'lazy');
    if (anyLazy) return [];
    return [
      info('perf.image.lazy_loading', 'No images use lazy loading', {
        evidence: `${images.length} images`,
        suggestion: 'Add loading="lazy" to below-the-fold images to speed up first paint.',
      }),
    ];
  },
};

const scriptCountRule: ShipCheckRule = {
  id: 'perf.script_count',
  category: 'performance',
  run(ctx) {
    const scripts = byType(ctx.assets, 'script');
    const limit = ctx.config.thresholds.maxScripts;
    if (scripts.length <= limit) return [];
    return [
      info('perf.scripts.too_many', `${scripts.length} external scripts loaded`, {
        suggestion: `Consider bundling; more than ~${limit} script requests adds overhead.`,
      }),
    ];
  },
};

const thirdPartyRule: ShipCheckRule = {
  id: 'perf.third_party',
  category: 'performance',
  run(ctx) {
    const domains = new Set<string>();
    for (const asset of ctx.assets) {
      if (!asset.thirdParty) continue;
      const host = getHost(asset.url);
      if (host) domains.add(baseDomain(host));
    }
    const limit = ctx.config.thresholds.maxThirdPartyDomains;
    if (domains.size <= limit) return [];
    return [
      info('perf.third_party.too_many', `Assets load from ${domains.size} third-party domains`, {
        evidence: sample([...domains]),
        suggestion: 'Each third-party origin adds DNS/TLS cost; trim non-essential ones.',
      }),
    ];
  },
};

function weightRule(
  id: string,
  type: PageAsset['type'],
  label: string,
  thresholdKey: 'maxJsKb' | 'maxCssKb',
): ShipCheckRule {
  return {
    id,
    category: 'performance',
    run(ctx) {
      const assets = withSize(byType(ctx.assets, type));
      if (assets.length === 0) return [];
      const limit = ctx.config.thresholds[thresholdKey];
      const total = totalBytes(assets);
      if (toKb(total) <= limit) {
        return [pass(`${id}.ok`, `Total ${label} is under ${limit} KB (${formatBytes(total)})`)];
      }
      return [
        warn(`${id}.too_large`, `Total ${label} is ${formatBytes(total)} (over ${limit} KB)`, {
          suggestion: `Reduce ${label} payload via code-splitting, tree-shaking, or minification.`,
        }),
      ];
    },
  };
}

const compressionRule: ShipCheckRule = {
  id: 'perf.compression',
  category: 'performance',
  run(ctx) {
    // Only meaningful when we have response headers (remote scans).
    if (ctx.source !== 'url') return [];
    const textAssets = ctx.assets.filter(
      (asset) => asset.type === 'script' || asset.type === 'stylesheet',
    );
    const uncompressed = textAssets.filter(
      (asset) =>
        typeof asset.sizeBytes === 'number' && toKb(asset.sizeBytes) > 50 && !asset.contentEncoding,
    );
    if (uncompressed.length === 0) return [];
    return [
      info(
        'perf.compression.missing',
        `${uncompressed.length} large text asset(s) not compressed`,
        {
          evidence: sample(uncompressed.map((a) => `${a.url} (${formatBytes(a.sizeBytes)})`)),
          suggestion: 'Enable gzip or Brotli compression for JavaScript and CSS.',
        },
      ),
    ];
  },
};

export const performanceRules: ShipCheckRule[] = [
  largeImagesRule,
  imageDimensionsRule,
  lazyLoadingRule,
  scriptCountRule,
  thirdPartyRule,
  weightRule('perf.js', 'script', 'JavaScript', 'maxJsKb'),
  weightRule('perf.css', 'stylesheet', 'CSS', 'maxCssKb'),
  compressionRule,
];

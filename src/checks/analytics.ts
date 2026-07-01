import type { PartialResult, ShipCheckRule } from '../types/rule.js';
import { error, info, pass, sample, warn } from './_helpers.js';

/** Count non-overlapping literal occurrences of `needle` in `haystack`. */
export function countLiteral(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

function matchIds(haystack: string, re: RegExp): string[] {
  const ids: string[] = [];
  for (const match of haystack.matchAll(re)) {
    if (match[1]) ids.push(match[1]);
  }
  return ids;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function countIn(values: string[], target: string): number {
  return values.filter((value) => value === target).length;
}

const GA4_LOADER = /gtag\/js\?id=(G-[A-Z0-9]+)/gi;
const GA4_CONFIG = /gtag\(\s*['"]config['"]\s*,\s*['"](G-[A-Z0-9]+)['"]/gi;
const GTM_ID = /GTM-[A-Z0-9]+/g;
const FB_INIT = /fbq\(\s*['"]init['"]\s*,\s*['"](\d{6,})['"]/gi;
const UA_ID = /\bUA-\d{4,}-\d+\b/;
const DEV_SRC =
  /(?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)|webpack-dev-server|react-refresh|__vite|hot-update)/i;

const ga4Rule: ShipCheckRule = {
  id: 'analytics.ga4',
  category: 'analytics',
  run(ctx) {
    const html = ctx.html;
    const loaderIds = matchIds(html, GA4_LOADER);
    const configIds = matchIds(html, GA4_CONFIG);
    const allIds = unique([...loaderIds, ...configIds]);
    if (allIds.length === 0) return [];

    const results: PartialResult[] = [];
    const duplicates = allIds.filter((id) => {
      const loaderCount = countLiteral(html, `gtag/js?id=${id}`);
      return loaderCount >= 2 || countIn(configIds, id) >= 2;
    });

    if (duplicates.length > 0) {
      for (const id of duplicates) {
        const loaderCount = countLiteral(html, `gtag/js?id=${id}`);
        const configCount = countIn(configIds, id);
        results.push(
          error('analytics.ga4.duplicate', 'Duplicate GA4 tag detected', {
            description: 'The same GA4 measurement ID is loaded or configured more than once.',
            evidence: `${id} (loaded ${Math.max(loaderCount, 1)}×, configured ${configCount}×)`,
            suggestion:
              'Load GA4 either directly or through GTM — not both — to avoid double-counting.',
          }),
        );
      }
    } else {
      results.push(
        pass('analytics.ga4.ok', 'No duplicate GA4 tag detected', { evidence: allIds.join(', ') }),
      );
    }

    if (allIds.length > 1) {
      results.push(
        info('analytics.ga4.multiple', `Multiple GA4 measurement IDs found (${allIds.length})`, {
          evidence: allIds.join(', '),
          suggestion: 'Confirm that loading several GA4 properties on one page is intentional.',
        }),
      );
    }
    return results;
  },
};

const gtmRule: ShipCheckRule = {
  id: 'analytics.gtm',
  category: 'analytics',
  run(ctx) {
    const html = ctx.html;
    const ids = unique(html.match(GTM_ID) ?? []);
    if (ids.length === 0) return [];

    const results: PartialResult[] = [];
    const duplicates = ids.filter((id) => {
      const loaderCount =
        countLiteral(html, `gtm.js?id=${id}`) +
        countLiteral(html, `,'${id}')`) +
        countLiteral(html, `,"${id}")`);
      return loaderCount >= 2;
    });

    if (duplicates.length > 0) {
      for (const id of duplicates) {
        results.push(
          error('analytics.gtm.duplicate', 'Duplicate GTM container detected', {
            evidence: `${id} loaded more than once`,
            suggestion: 'Include each Google Tag Manager container snippet only once.',
          }),
        );
      }
    } else {
      results.push(
        pass('analytics.gtm.ok', 'No duplicate GTM container detected', {
          evidence: ids.join(', '),
        }),
      );
    }
    return results;
  },
};

const metaPixelRule: ShipCheckRule = {
  id: 'analytics.meta_pixel',
  category: 'analytics',
  run(ctx) {
    const initIds = matchIds(ctx.html, FB_INIT);
    const ids = unique(initIds);
    if (ids.length === 0) return [];

    const duplicates = ids.filter((id) => countIn(initIds, id) >= 2);
    if (duplicates.length === 0) {
      return [
        pass('analytics.meta_pixel.ok', 'No duplicate Meta Pixel detected', {
          evidence: ids.join(', '),
        }),
      ];
    }
    return duplicates.map((id) =>
      error('analytics.meta_pixel.duplicate', 'Duplicate Meta Pixel detected', {
        evidence: `${id} initialized ${countIn(initIds, id)}×`,
        suggestion: 'Call fbq("init", ...) once per pixel to avoid duplicate events.',
      }),
    );
  },
};

const universalAnalyticsRule: ShipCheckRule = {
  id: 'analytics.universal_analytics',
  category: 'analytics',
  run(ctx) {
    const html = ctx.html;
    const present =
      /www\.google-analytics\.com\/(ga|analytics)\.js/.test(html) ||
      /ga\(\s*['"]create['"]/.test(html) ||
      UA_ID.test(html);
    if (!present) return [];
    return [
      warn('analytics.universal_analytics.deprecated', 'Deprecated Universal Analytics detected', {
        description: 'Universal Analytics stopped processing new data and is deprecated.',
        suggestion: 'Migrate to GA4 and remove the legacy analytics.js / ga() code.',
      }),
    ];
  },
};

const dataLayerRule: ShipCheckRule = {
  id: 'analytics.datalayer',
  category: 'analytics',
  run(ctx) {
    const inits = (ctx.html.match(/dataLayer\s*=\s*\[\s*\{/g) ?? []).length;
    if (inits < 2) return [];
    return [
      info('analytics.datalayer.multiple_init', `dataLayer initialized with data ${inits} times`, {
        suggestion:
          'Multiple "dataLayer = [ … ]" assignments overwrite earlier events; use dataLayer.push().',
      }),
    ];
  },
};

const debugScriptRule: ShipCheckRule = {
  id: 'analytics.debug_script',
  category: 'analytics',
  run(ctx) {
    const $ = ctx.document;
    const srcs = $('script[src]')
      .map((_, el) => $(el).attr('src') ?? '')
      .get();
    const offenders = srcs.filter((src) => DEV_SRC.test(src));
    const inlineDev = /webpack-dev-server|__vite_plugin_react_preamble|react-refresh/.test(
      ctx.html,
    );
    if (offenders.length === 0 && !inlineDev) return [];
    return [
      warn('analytics.debug_script', 'Development/debug script detected', {
        evidence: offenders.length ? sample(offenders) : 'inline dev runtime',
        suggestion: 'Remove local dev-server or debug scripts before deploying to production.',
      }),
    ];
  },
};

export const analyticsRules: ShipCheckRule[] = [
  ga4Rule,
  gtmRule,
  metaPixelRule,
  universalAnalyticsRule,
  dataLayerRule,
  debugScriptRule,
];

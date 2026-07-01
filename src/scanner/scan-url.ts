import * as cheerio from 'cheerio';
import type { ResolvedConfig } from '../types/config.js';
import type { ShipCheckContext } from '../types/context.js';
import type { Logger } from '../utils/logger.js';
import { normalizeUrl } from '../utils/url.js';
import { extractAssets, enrichAssetSizes } from './collect-assets.js';
import { fetchPage, probeOriginFile, type FetchedPage } from './collect-page.js';
import { fetchRenderedPage } from './render-page.js';

export interface ScanUrlOptions {
  config: ResolvedConfig;
  logger?: Logger;
  /** Probe each asset for its transfer size (adds network round-trips). */
  probeAssets?: boolean;
  /** Override how the page is loaded (used by tests). */
  loadPage?: (url: string) => Promise<FetchedPage>;
}

/** Fetch a remote URL and build a scan context for the checks to consume. */
export async function scanUrl(target: string, options: ScanUrlOptions): Promise<ShipCheckContext> {
  const { config } = options;
  const url = normalizeUrl(target);

  const loadPage =
    options.loadPage ??
    (config.rendered
      ? (pageUrl: string) =>
          fetchRenderedPage(pageUrl, {
            timeoutMs: config.timeoutMs,
            waitUntil: config.renderWaitUntil,
            logger: options.logger,
          })
      : (pageUrl: string) =>
          fetchPage(pageUrl, { timeoutMs: config.timeoutMs, logger: options.logger }));

  const page = await loadPage(url);

  if (page.status >= 400) {
    options.logger?.warn(`Server responded with HTTP ${page.status} for ${page.finalUrl}`);
  }

  const document = cheerio.load(page.html);
  const assets = extractAssets(document, page.finalUrl);

  if (options.probeAssets !== false && assets.length > 0) {
    options.logger?.debug(`Probing ${assets.length} asset(s) for size`);
    await enrichAssetSizes(assets, {
      timeoutMs: options.config.timeoutMs,
      logger: options.logger,
    });
  }

  const origin = new URL(page.finalUrl).origin;
  const [robotsTxt, sitemapXml] = await Promise.all([
    probeOriginFile(origin, '/robots.txt', options.config.timeoutMs),
    probeOriginFile(origin, '/sitemap.xml', options.config.timeoutMs),
  ]);

  return {
    url,
    finalUrl: page.finalUrl,
    status: page.status,
    html: page.html,
    document,
    headers: page.headers,
    assets,
    source: 'url',
    rendered: config.rendered,
    robotsTxt,
    sitemapXml,
    config,
  };
}

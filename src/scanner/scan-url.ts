import * as cheerio from 'cheerio';
import type { ResolvedConfig } from '../types/config.js';
import type { ShipCheckContext } from '../types/context.js';
import type { Logger } from '../utils/logger.js';
import { normalizeUrl } from '../utils/url.js';
import { extractAssets, enrichAssetSizes } from './collect-assets.js';
import { fetchPage, fetchRobotsTxt, probeOriginFile, type FetchedPage } from './collect-page.js';
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
            userAgent: config.userAgent,
            logger: options.logger,
          })
      : (pageUrl: string) =>
          fetchPage(pageUrl, {
            timeoutMs: config.timeoutMs,
            userAgent: config.userAgent,
            logger: options.logger,
          }));

  const page = await loadPage(url);

  if (page.status >= 400) {
    options.logger?.warn(`Server responded with HTTP ${page.status} for ${page.finalUrl}`);
  }

  const document = cheerio.load(page.html);
  const assets = extractAssets(document, page.finalUrl);

  // Don't waste round-trips sizing the assets of an error page.
  if (options.probeAssets !== false && assets.length > 0 && page.status < 400) {
    options.logger?.debug(`Probing ${assets.length} asset(s) for size`);
    await enrichAssetSizes(assets, {
      timeoutMs: options.config.timeoutMs,
      userAgent: config.userAgent,
      logger: options.logger,
    });
  }

  // Sitemaps are commonly declared in robots.txt rather than living at
  // /sitemap.xml, so honor Sitemap: directives before probing the default path.
  const origin = new URL(page.finalUrl).origin;
  const probeOptions = { timeoutMs: config.timeoutMs, userAgent: config.userAgent };
  const robots = await fetchRobotsTxt(origin, probeOptions);
  const sitemapXml =
    robots.sitemaps.length > 0
      ? { exists: true, url: robots.sitemaps[0] }
      : await probeOriginFile(origin, '/sitemap.xml', probeOptions);

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
    robotsTxt: robots.probe,
    sitemapXml,
    config,
  };
}

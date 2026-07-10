import type { OriginFileProbe } from '../types/context.js';
import type { Logger } from '../utils/logger.js';
import { VERSION } from '../version.js';

export const USER_AGENT = `ShipCheck/${VERSION} (+https://github.com/alexkolovsky/shipcheck)`;

export interface FetchedPage {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  html: string;
  headers: Headers;
}

/** Fetch a page's HTML and headers, following redirects, with a timeout. */
export async function fetchPage(
  url: string,
  options: { timeoutMs: number; userAgent?: string; logger?: Logger },
): Promise<FetchedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    options.logger?.debug(`GET ${url}`);
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': options.userAgent ?? USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const html = await response.text();
    return {
      requestedUrl: url,
      finalUrl: response.url || url,
      status: response.status,
      html,
      headers: response.headers,
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${options.timeoutMs}ms`);
    }
    throw new Error(`Failed to fetch ${url}: ${(error as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

export interface ProbeOptions {
  timeoutMs: number;
  userAgent?: string;
}

/**
 * Classify a probe response status. Only a definitive 404/410 counts as
 * "missing" — other failures (403/406/429 bot filtering, server errors) leave
 * the probe inconclusive rather than producing a false "missing" finding.
 */
function probeResult(url: string, status: number, ok: boolean): OriginFileProbe {
  if (ok) return { exists: true, url };
  if (status === 404 || status === 410) return { exists: false, url };
  return { exists: false, url, unknown: true };
}

/** Check whether a well-known origin file (robots.txt, sitemap.xml) exists. */
export async function probeOriginFile(
  origin: string,
  pathname: string,
  options: ProbeOptions,
): Promise<OriginFileProbe> {
  const url = new URL(pathname, origin).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': options.userAgent ?? USER_AGENT },
    });
    await response.body?.cancel().catch(() => {});
    return probeResult(url, response.status, response.ok);
  } catch {
    return { exists: false, url, unknown: true };
  } finally {
    clearTimeout(timer);
  }
}

/** Extract the URLs of all `Sitemap:` directives from a robots.txt body. */
export function parseSitemapDirectives(robotsTxt: string): string[] {
  const urls: string[] = [];
  for (const line of robotsTxt.split(/\r?\n/)) {
    const match = /^\s*sitemap\s*:\s*(\S+)/i.exec(line);
    if (match) urls.push(match[1]);
  }
  return urls;
}

export interface RobotsTxtProbe {
  probe: OriginFileProbe;
  /** Sitemap URLs declared via `Sitemap:` directives, when robots.txt exists. */
  sitemaps: string[];
}

/** Fetch robots.txt and collect any `Sitemap:` directives it declares. */
export async function fetchRobotsTxt(
  origin: string,
  options: ProbeOptions,
): Promise<RobotsTxtProbe> {
  const url = new URL('/robots.txt', origin).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': options.userAgent ?? USER_AGENT },
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      return { probe: probeResult(url, response.status, false), sitemaps: [] };
    }
    const body = await response.text();
    return { probe: { exists: true, url }, sitemaps: parseSitemapDirectives(body) };
  } catch {
    return { probe: { exists: false, url, unknown: true }, sitemaps: [] };
  } finally {
    clearTimeout(timer);
  }
}

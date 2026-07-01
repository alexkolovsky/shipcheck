import type { OriginFileProbe } from '../types/context.js';
import type { Logger } from '../utils/logger.js';

export const USER_AGENT = 'ShipCheck/0.1 (+https://github.com/alexkolovsky/shipcheck)';

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
  options: { timeoutMs: number; logger?: Logger },
): Promise<FetchedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    options.logger?.debug(`GET ${url}`);
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
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

/** Check whether a well-known origin file (robots.txt, sitemap.xml) exists. */
export async function probeOriginFile(
  origin: string,
  pathname: string,
  timeoutMs: number,
): Promise<OriginFileProbe> {
  const url = new URL(pathname, origin).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT },
    });
    await response.body?.cancel().catch(() => {});
    return { exists: response.ok, url };
  } catch {
    return { exists: false, url };
  } finally {
    clearTimeout(timer);
  }
}

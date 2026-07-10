import type { RenderWaitUntil } from '../types/config.js';
import type { Logger } from '../utils/logger.js';
import { USER_AGENT, type FetchedPage } from './collect-page.js';

/**
 * Minimal structural typing for the slice of Playwright we use. Declared locally
 * so ShipCheck compiles and its default install stays lightweight *without*
 * Playwright present — it is an optional peer dependency, resolved at runtime.
 */
interface PwResponse {
  status(): number;
  headers(): Record<string, string>;
}
interface PwPage {
  goto(
    url: string,
    options: { waitUntil?: RenderWaitUntil; timeout?: number },
  ): Promise<PwResponse | null>;
  content(): Promise<string>;
  url(): string;
}
interface PwContext {
  newPage(): Promise<PwPage>;
}
interface PwBrowser {
  newContext(options?: { userAgent?: string }): Promise<PwContext>;
  close(): Promise<void>;
}
interface PwBrowserType {
  launch(options?: { headless?: boolean }): Promise<PwBrowser>;
}
interface PlaywrightModule {
  chromium: PwBrowserType;
}

export interface RenderOptions {
  timeoutMs: number;
  waitUntil?: RenderWaitUntil;
  userAgent?: string;
  logger?: Logger;
}

/** Load Playwright on demand, with a friendly error if it isn't installed. */
async function loadPlaywright(): Promise<PlaywrightModule> {
  try {
    // Non-literal specifier: keeps the optional peer dependency out of the
    // compile-time module graph so ShipCheck builds without Playwright present.
    const moduleName = 'playwright';
    return (await import(moduleName)) as unknown as PlaywrightModule;
  } catch {
    throw new Error(
      'Rendered mode (--rendered) requires Playwright, which is not installed.\n' +
        'Install it with:  npm i -D playwright && npx playwright install chromium',
    );
  }
}

/**
 * Build a {@link Headers} object from Playwright's header map. Playwright joins
 * repeated headers (e.g. two `content-security-policy` values) with a newline,
 * which `new Headers()` rejects — so split those back out and skip any single
 * value the WHATWG parser still refuses, rather than crashing the whole scan.
 */
export function toHeaders(raw: Record<string, string>): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(raw)) {
    for (const part of value.split('\n')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      try {
        headers.append(name, trimmed);
      } catch {
        // Ignore an individual malformed header value; keep the rest.
      }
    }
  }
  return headers;
}

/**
 * Load a page in headless Chromium, let its JavaScript run, and return the
 * post-hydration HTML plus the main response's status and headers — the same
 * shape as {@link fetchPage}, so the rest of the URL scanner is unchanged.
 */
export async function fetchRenderedPage(url: string, options: RenderOptions): Promise<FetchedPage> {
  const { chromium } = await loadPlaywright();
  const waitUntil = options.waitUntil ?? 'load';
  options.logger?.debug(`Rendering ${url} in headless Chromium (waitUntil=${waitUntil})`);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ userAgent: options.userAgent ?? USER_AGENT });
    const page = await context.newPage();

    let response: PwResponse | null;
    try {
      response = await page.goto(url, { waitUntil, timeout: options.timeoutMs });
    } catch (error) {
      const message = (error as Error).message;
      if (/timeout/i.test(message)) {
        throw new Error(`Rendering ${url} timed out after ${options.timeoutMs}ms`);
      }
      throw new Error(`Failed to render ${url}: ${message}`);
    }

    return {
      requestedUrl: url,
      finalUrl: page.url() || url,
      status: response?.status() ?? 0,
      html: await page.content(),
      headers: toHeaders(response?.headers() ?? {}),
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyticsRules } from '../../src/checks/analytics';
import { defaultConfig } from '../../src/config/default-config';
import { fetchRenderedPage, toHeaders } from '../../src/scanner/render-page';
import { scanUrl } from '../../src/scanner/scan-url';
import type { FetchedPage } from '../../src/scanner/collect-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

// Playwright is an optional peer dependency. Detect whether it's resolvable so
// the "not installed" test runs only when it's genuinely absent (as in CI). The
// specifier is a variable so `tsc` never tries to resolve it at build time.
const playwrightSpecifier = 'playwright';
const playwrightInstalled = await import(playwrightSpecifier).then(() => true).catch(() => false);

describe('rendered mode', () => {
  it.skipIf(playwrightInstalled)(
    'throws a helpful error when Playwright is not installed',
    async () => {
      await expect(fetchRenderedPage('https://example.com', { timeoutMs: 1000 })).rejects.toThrow(
        /Playwright/i,
      );
    },
  );

  it('builds Headers from Playwright maps with newline-joined duplicate headers', () => {
    // Playwright joins repeated headers with "\n"; a raw `new Headers()` throws
    // on this. Seen in the wild on sites that send two CSP headers.
    const headers = toHeaders({
      'content-security-policy': "frame-ancestors 'self' https://a.example\ndefault-src 'self'",
      'x-content-type-options': 'nosniff',
    });
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('content-security-policy')).toContain('frame-ancestors');
    // Both CSP values are preserved (comma-joined by Headers).
    expect(headers.get('content-security-policy')).toContain('default-src');
  });

  it('feeds the rendered HTML into the context and downstream checks', async () => {
    // Origin-file probes use fetch; stub it so the test stays offline.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    );

    // A duplicate GA4 tag that only exists after "rendering" (not in source).
    const loader = 'https://www.googletagmanager.com/gtag/js?id=G-DUP1234567';
    const renderedHtml = `<!doctype html><html lang="en"><head><title>Rendered</title>
      <script src="${loader}"></script>
      <script src="${loader}"></script>
      </head><body><h1>Hi</h1></body></html>`;

    const loadPage = async (url: string): Promise<FetchedPage> => ({
      requestedUrl: url,
      finalUrl: url,
      status: 200,
      html: renderedHtml,
      headers: new Headers(),
    });

    const ctx = await scanUrl('https://example.com', {
      config: { ...defaultConfig, rendered: true },
      probeAssets: false,
      loadPage,
    });

    expect(ctx.rendered).toBe(true);
    expect(ctx.html).toContain('G-DUP1234567');

    const results = [];
    for (const rule of analyticsRules) results.push(...(await rule.run(ctx)));
    expect(results.some((r) => r.id === 'analytics.ga4.duplicate')).toBe(true);
  });
});

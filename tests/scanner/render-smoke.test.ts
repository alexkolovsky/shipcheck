import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveConfig } from '../../src/config/load-config';
import { scanUrl } from '../../src/scanner/scan-url';

/**
 * Real-browser smoke test: launches actual headless Chromium via Playwright.
 * Opt-in (SHIPCHECK_SMOKE=1) because Playwright is an optional peer dependency
 * and isn't installed in a default dev setup. CI runs it in a dedicated job.
 */
const smoke = process.env.SHIPCHECK_SMOKE === '1';

const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <title>Smoke</title>
    <script>
      document.head.insertAdjacentHTML(
        'beforeend',
        '<meta name="description" content="injected-by-js">',
      );
    </script>
  </head>
  <body><h1>Smoke</h1></body>
</html>`;

describe.skipIf(!smoke)('rendered mode smoke (real Chromium)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/robots.txt' || req.url === '/sitemap.xml') {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' }).end(PAGE);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('sees DOM injected by JavaScript', { timeout: 120_000 }, async () => {
    const config = resolveConfig({}, { rendered: true });
    const ctx = await scanUrl(baseUrl, { config, probeAssets: false });

    expect(ctx.rendered).toBe(true);
    expect(ctx.status).toBe(200);
    // The static source doesn't contain this meta tag; only the rendered DOM does.
    expect(ctx.document('meta[name="description"]').attr('content')).toBe('injected-by-js');
  });
});

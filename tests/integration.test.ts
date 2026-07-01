import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/config/default-config';
import { runChecks } from '../src/runner';
import { scanLocal } from '../src/scanner/scan-local';
import type { ResolvedConfig } from '../src/types/config';
import { makeContext } from './helpers/context';

const siteDir = fileURLToPath(new URL('./fixtures/site', import.meta.url));

const config = (overrides: Partial<ResolvedConfig> = {}): ResolvedConfig => ({
  ...defaultConfig,
  ...overrides,
});

describe('local scan (end to end, offline)', () => {
  it('scans a directory, sizes local assets, and probes origin files', async () => {
    const ctx = await scanLocal(siteDir, { config: config() });
    expect(ctx.source).toBe('local');
    expect(ctx.robotsTxt?.exists).toBe(true);
    expect(ctx.sitemapXml?.exists).toBe(false);

    const css = ctx.assets.find((asset) => asset.type === 'stylesheet');
    expect(css?.sizeBytes).toBeGreaterThan(0);

    const report = await runChecks(ctx);
    expect(report.results.length).toBeGreaterThan(0);
    const issueIds = report.issues.map((issue) => issue.id);
    expect(issueIds).toContain('a11y.html_lang.missing');
    expect(issueIds).toContain('seo.title.missing');
    // Security header checks must not fire for local scans.
    expect(issueIds).not.toContain('security.csp.missing');
  });
});

describe('config: ignore + severity overrides', () => {
  it('drops ignored rules and applies severity overrides', async () => {
    const ctx = makeContext({
      html: '<html><head></head><body></body></html>',
      headers: {},
      config: {
        ignore: ['seo.title.missing'],
        severityOverrides: { 'security.csp.missing': 'error' },
      },
    });
    const report = await runChecks(ctx);
    const byId = new Map(report.issues.map((issue) => [issue.id, issue]));

    expect(byId.has('seo.title.missing')).toBe(false);
    expect(byId.get('security.csp.missing')?.severity).toBe('error');
  });
});

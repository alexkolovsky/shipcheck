import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyticsRules, countLiteral } from '../../src/checks/analytics';
import { byId, ids, makeContext, runRules } from '../helpers/context';

const fixture = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`../fixtures/pages/${name}`, import.meta.url)), 'utf8');

const GA4_SNIPPET = (id: string) => `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');
  </script>`;

describe('countLiteral', () => {
  it('counts non-overlapping occurrences', () => {
    expect(countLiteral('aXbXc', 'X')).toBe(2);
    expect(countLiteral('none here', 'Z')).toBe(0);
    expect(countLiteral('anything', '')).toBe(0);
  });
});

describe('Analytics checks', () => {
  it('passes a single, correctly installed GA4 tag', async () => {
    const ctx = makeContext({
      html: `<html><head>${GA4_SNIPPET('G-SINGLE1234')}</head><body></body></html>`,
    });
    const results = await runRules(analyticsRules, ctx);
    expect(byId(results, 'analytics.ga4.ok')?.status).toBe('pass');
    expect(ids(results)).not.toContain('analytics.ga4.duplicate');
  });

  it('detects a duplicated GA4 loader as an error', async () => {
    const ctx = makeContext({ html: fixture('duplicate-ga4.html') });
    const results = await runRules(analyticsRules, ctx);
    const dup = byId(results, 'analytics.ga4.duplicate');
    expect(dup?.status).toBe('error');
    expect(dup?.evidence).toContain('G-ABCDE12345');
  });

  it('flags multiple distinct GA4 IDs as info', async () => {
    const ctx = makeContext({
      html: `<html><head>${GA4_SNIPPET('G-AAAA1111')}${GA4_SNIPPET('G-BBBB2222')}</head><body></body></html>`,
    });
    const results = await runRules(analyticsRules, ctx);
    expect(byId(results, 'analytics.ga4.multiple')?.status).toBe('info');
  });

  it('passes a single GTM container and flags a duplicated one', async () => {
    const single = makeContext({
      html: `<html><head><script async src="https://www.googletagmanager.com/gtm.js?id=GTM-AAA111"></script></head><body></body></html>`,
    });
    expect(byId(await runRules(analyticsRules, single), 'analytics.gtm.ok')?.status).toBe('pass');

    const duplicated = makeContext({
      html: `<html><head>
        <script async src="https://www.googletagmanager.com/gtm.js?id=GTM-DUP999"></script>
        <script>(function(w,d,s,l,i){})(window,document,'script','dataLayer','GTM-DUP999')</script>
      </head><body></body></html>`,
    });
    expect(
      byId(await runRules(analyticsRules, duplicated), 'analytics.gtm.duplicate')?.status,
    ).toBe('error');
  });

  it('detects duplicate Meta Pixel initialization', async () => {
    const ctx = makeContext({
      html: `<html><head><script>fbq('init','123456789012345');fbq('init','123456789012345');</script></head><body></body></html>`,
    });
    expect(
      byId(await runRules(analyticsRules, ctx), 'analytics.meta_pixel.duplicate')?.status,
    ).toBe('error');
  });

  it('warns about deprecated Universal Analytics', async () => {
    const ctx = makeContext({
      html: `<html><head><script>ga('create','UA-12345-1','auto');</script></head><body></body></html>`,
    });
    expect(ids(await runRules(analyticsRules, ctx))).toContain(
      'analytics.universal_analytics.deprecated',
    );
  });

  it('flags a local dev-server script left in the page', async () => {
    const ctx = makeContext({
      html: `<html><head><script src="http://localhost:5173/@vite/client"></script></head><body></body></html>`,
    });
    expect(byId(await runRules(analyticsRules, ctx), 'analytics.debug_script')?.status).toBe(
      'warning',
    );
  });
});

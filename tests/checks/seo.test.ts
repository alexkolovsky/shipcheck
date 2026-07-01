import { describe, expect, it } from 'vitest';
import { seoRules } from '../../src/checks/seo';
import { byId, ids, makeContext, runRules } from '../helpers/context';

const page = (head: string, body = '<h1>Hi</h1>') =>
  makeContext({
    html: `<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`,
  });

describe('SEO checks', () => {
  it('flags a missing title as an error', async () => {
    const results = await runRules(seoRules, page(''));
    expect(ids(results)).toContain('seo.title.missing');
    expect(byId(results, 'seo.title.missing')?.status).toBe('error');
  });

  it('passes when a reasonable title exists', async () => {
    const results = await runRules(
      seoRules,
      page('<title>A perfectly reasonable page title</title>'),
    );
    expect(byId(results, 'seo.title.present')?.status).toBe('pass');
    expect(ids(results)).not.toContain('seo.title.missing');
  });

  it('warns on a very long title', async () => {
    const long = 'x'.repeat(90);
    const results = await runRules(seoRules, page(`<title>${long}</title>`));
    expect(ids(results)).toContain('seo.title.too_long');
  });

  it('warns when the meta description is missing', async () => {
    const results = await runRules(
      seoRules,
      page('<title>Has a title but no description here</title>'),
    );
    expect(byId(results, 'seo.meta_description.missing')?.status).toBe('warning');
  });

  it('treats an accidental noindex as an error', async () => {
    const results = await runRules(
      seoRules,
      page('<title>Prod page</title><meta name="robots" content="noindex, nofollow">'),
    );
    expect(byId(results, 'seo.noindex')?.status).toBe('error');
    expect(ids(results)).not.toContain('seo.indexable');
  });

  it('detects noindex delivered via the X-Robots-Tag header', async () => {
    const ctx = makeContext({
      html: '<html lang="en"><head><title>Header noindex page</title></head><body></body></html>',
      headers: { 'x-robots-tag': 'noindex' },
    });
    const results = await runRules(seoRules, ctx);
    expect(byId(results, 'seo.noindex')?.status).toBe('error');
  });

  it('warns when there is no H1 and flags multiple H1s', async () => {
    const none = await runRules(seoRules, page('<title>No heading page here</title>', '<p>x</p>'));
    expect(ids(none)).toContain('seo.h1.missing');

    const many = await runRules(
      seoRules,
      page('<title>Two headings page</title>', '<h1>A</h1><h1>B</h1>'),
    );
    expect(ids(many)).toContain('seo.h1.multiple');
  });

  it('reports robots.txt / sitemap.xml probe results when provided', async () => {
    const ctx = makeContext({
      html: '<html lang="en"><head><title>Crawl files page</title></head><body><h1>x</h1></body></html>',
      robotsTxt: { exists: false, url: 'https://example.com/robots.txt' },
      sitemapXml: { exists: true, url: 'https://example.com/sitemap.xml' },
    });
    const results = await runRules(seoRules, ctx);
    expect(ids(results)).toContain('seo.robots_txt.missing');
    expect(byId(results, 'seo.sitemap.present')?.status).toBe('pass');
  });
});

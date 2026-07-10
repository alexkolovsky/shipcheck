import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  USER_AGENT,
  fetchRobotsTxt,
  parseSitemapDirectives,
  probeOriginFile,
} from '../../src/scanner/collect-page';
import { VERSION } from '../../src/version';

const stubFetch = (status: number, body = ''): ReturnType<typeof vi.fn> => {
  const mock = vi.fn().mockResolvedValue(new Response(body, { status }));
  vi.stubGlobal('fetch', mock);
  return mock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('USER_AGENT', () => {
  it('embeds the real package version and repo URL', () => {
    expect(USER_AGENT).toBe(`ShipCheck/${VERSION} (+https://github.com/alexkolovsky/shipcheck)`);
  });
});

describe('parseSitemapDirectives', () => {
  it('extracts Sitemap: lines case-insensitively, with or without spacing', () => {
    const robots = [
      'User-agent: *',
      'Disallow: /admin',
      'Sitemap: https://example.com/sitemap/sitemap.xml',
      'sitemap:https://example.com/sitemap-index.xml',
      '# Sitemap: https://example.com/commented-out.xml',
    ].join('\r\n');
    expect(parseSitemapDirectives(robots)).toEqual([
      'https://example.com/sitemap/sitemap.xml',
      'https://example.com/sitemap-index.xml',
    ]);
  });

  it('returns an empty list when no directives exist', () => {
    expect(parseSitemapDirectives('User-agent: *\nDisallow:')).toEqual([]);
  });
});

describe('probeOriginFile', () => {
  it('reports a 200 as existing', async () => {
    stubFetch(200);
    const probe = await probeOriginFile('https://example.com', '/sitemap.xml', {
      timeoutMs: 1000,
    });
    expect(probe).toEqual({ exists: true, url: 'https://example.com/sitemap.xml' });
  });

  it('reports a 404 as definitively missing', async () => {
    stubFetch(404);
    const probe = await probeOriginFile('https://example.com', '/sitemap.xml', {
      timeoutMs: 1000,
    });
    expect(probe.exists).toBe(false);
    expect(probe.unknown).toBeUndefined();
  });

  it('marks bot-blocking statuses (406) as unknown, not missing', async () => {
    stubFetch(406);
    const probe = await probeOriginFile('https://example.com', '/sitemap.xml', {
      timeoutMs: 1000,
    });
    expect(probe.exists).toBe(false);
    expect(probe.unknown).toBe(true);
  });

  it('marks network failures as unknown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    const probe = await probeOriginFile('https://example.com', '/sitemap.xml', {
      timeoutMs: 1000,
    });
    expect(probe.unknown).toBe(true);
  });

  it('sends the overridden User-Agent when provided', async () => {
    const mock = stubFetch(200);
    await probeOriginFile('https://example.com', '/sitemap.xml', {
      timeoutMs: 1000,
      userAgent: 'CustomAgent/1.0',
    });
    const init = mock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['user-agent']).toBe('CustomAgent/1.0');
  });
});

describe('fetchRobotsTxt', () => {
  it('returns declared sitemap URLs when robots.txt exists', async () => {
    stubFetch(200, 'User-agent: *\nSitemap: https://example.com/sitemap/sitemap.xml');
    const robots = await fetchRobotsTxt('https://example.com', { timeoutMs: 1000 });
    expect(robots.probe.exists).toBe(true);
    expect(robots.sitemaps).toEqual(['https://example.com/sitemap/sitemap.xml']);
  });

  it('returns no sitemaps when robots.txt has no directives', async () => {
    stubFetch(200, 'User-agent: *\nDisallow:');
    const robots = await fetchRobotsTxt('https://example.com', { timeoutMs: 1000 });
    expect(robots.probe.exists).toBe(true);
    expect(robots.sitemaps).toEqual([]);
  });

  it('reports a 404 robots.txt as missing and a 403 as unknown', async () => {
    stubFetch(404);
    const missing = await fetchRobotsTxt('https://example.com', { timeoutMs: 1000 });
    expect(missing.probe).toEqual({ exists: false, url: 'https://example.com/robots.txt' });

    stubFetch(403);
    const blocked = await fetchRobotsTxt('https://example.com', { timeoutMs: 1000 });
    expect(blocked.probe.unknown).toBe(true);
  });
});

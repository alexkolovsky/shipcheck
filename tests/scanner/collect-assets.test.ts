import * as cheerio from 'cheerio';
import { describe, expect, it } from 'vitest';
import { extractAssets, largestSrcsetCandidate } from '../../src/scanner/collect-assets';

const PAGE = 'https://example.com/page/';

describe('largestSrcsetCandidate', () => {
  it('picks the largest width descriptor', () => {
    expect(largestSrcsetCandidate('small.jpg 480w, large.jpg 1600w, mid.jpg 800w')).toBe(
      'large.jpg',
    );
  });

  it('picks the largest density descriptor', () => {
    expect(largestSrcsetCandidate('a.jpg 1x,b.jpg 2x')).toBe('b.jpg');
  });

  it('handles URLs containing commas (Cloudinary-style transforms)', () => {
    const srcset =
      'https://res.example.com/w_300,c_scale/a.jpg 300w, https://res.example.com/w_900,c_scale/a.jpg 900w';
    expect(largestSrcsetCandidate(srcset)).toBe('https://res.example.com/w_900,c_scale/a.jpg');
  });

  it('treats a descriptor-less candidate as 1x', () => {
    expect(largestSrcsetCandidate('only.jpg')).toBe('only.jpg');
  });

  it('returns undefined for empty or data: candidates', () => {
    expect(largestSrcsetCandidate('')).toBeUndefined();
    expect(largestSrcsetCandidate('data:image/png;base64,xyz 2x')).toBeUndefined();
  });
});

describe('extractAssets (modern image patterns)', () => {
  it('prefers the largest srcset candidate over the img src', () => {
    const $ = cheerio.load(
      '<img src="/fallback.jpg" srcset="/img-480.jpg 480w, /img-1600.jpg 1600w" width="800" height="600" loading="lazy">',
    );
    const assets = extractAssets($, PAGE);
    expect(assets).toHaveLength(1);
    expect(assets[0].url).toBe('https://example.com/img-1600.jpg');
    expect(assets[0].hasDimensions).toBe(true);
    expect(assets[0].loading).toBe('lazy');
  });

  it('collects <picture><source> variants and inherits the img dimensions', () => {
    const $ = cheerio.load(
      `<picture>
        <source srcset="/desktop.jpg 1200w" media="(min-width: 800px)">
        <img src="/mobile.jpg" width="400" height="300">
      </picture>`,
    );
    const assets = extractAssets($, PAGE);
    const urls = assets.map((asset) => asset.url);
    expect(urls).toContain('https://example.com/mobile.jpg');
    expect(urls).toContain('https://example.com/desktop.jpg');
    expect(assets.every((asset) => asset.type === 'image' && asset.hasDimensions)).toBe(true);
  });

  it('collects video posters as images', () => {
    const $ = cheerio.load('<video poster="/poster.jpg"></video>');
    const assets = extractAssets($, PAGE);
    expect(assets).toEqual([
      expect.objectContaining({ url: 'https://example.com/poster.jpg', type: 'image' }),
    ]);
  });

  it('collects preload and modulepreload links with mapped types', () => {
    const $ = cheerio.load(
      `<link rel="preload" href="/hero.avif" as="image">
       <link rel="preload" href="/app.css" as="style">
       <link rel="preload" href="/font.woff2" as="font">
       <link rel="modulepreload" href="/chunk.js">`,
    );
    const byUrl = new Map(extractAssets($, PAGE).map((asset) => [asset.url, asset.type]));
    expect(byUrl.get('https://example.com/hero.avif')).toBe('image');
    expect(byUrl.get('https://example.com/app.css')).toBe('stylesheet');
    expect(byUrl.get('https://example.com/font.woff2')).toBe('other');
    expect(byUrl.get('https://example.com/chunk.js')).toBe('script');
  });

  it('dedupes a preloaded stylesheet against its <link rel=stylesheet>', () => {
    const $ = cheerio.load(
      '<link rel="preload" href="/app.css" as="style"><link rel="stylesheet" href="/app.css">',
    );
    const assets = extractAssets($, PAGE);
    expect(assets).toHaveLength(1);
    expect(assets[0].type).toBe('stylesheet');
  });
});

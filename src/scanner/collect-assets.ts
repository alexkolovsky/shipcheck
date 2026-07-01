import type { CheerioAPI } from 'cheerio';
import type { AssetType, PageAsset } from '../types/context.js';
import type { Logger } from '../utils/logger.js';
import { absoluteUrl, getHost } from '../utils/url.js';
import { USER_AGENT } from './collect-page.js';

/** A resource reference as found in the HTML, before URL/size resolution. */
export interface AssetRef {
  src: string;
  type: AssetType;
  hasDimensions?: boolean;
  loading?: string;
}

/**
 * Walk the DOM and collect referenced images, scripts, and stylesheets. Returns
 * raw refs (unresolved `src`) so both the URL and local scanners can resolve
 * them against their own base.
 */
export function collectAssetRefs($: CheerioAPI): AssetRef[] {
  const refs: AssetRef[] = [];

  $('img[src]').each((_, el) => {
    const src = ($(el).attr('src') ?? '').trim();
    if (!src || src.startsWith('data:')) return;
    const width = $(el).attr('width');
    const height = $(el).attr('height');
    refs.push({
      src,
      type: 'image',
      hasDimensions: Boolean(width && height),
      loading: $(el).attr('loading'),
    });
  });

  $('script[src]').each((_, el) => {
    const src = ($(el).attr('src') ?? '').trim();
    if (!src || src.startsWith('data:')) return;
    refs.push({ src, type: 'script' });
  });

  $('link[rel~="stylesheet"][href]').each((_, el) => {
    const src = ($(el).attr('href') ?? '').trim();
    if (!src) return;
    refs.push({ src, type: 'stylesheet' });
  });

  return refs;
}

/** Resolve asset refs to absolute URLs relative to a page URL. */
export function extractAssets($: CheerioAPI, pageUrl: string): PageAsset[] {
  const pageHost = getHost(pageUrl);
  const pageIsHttps = pageUrl.startsWith('https://');
  const assets: PageAsset[] = [];
  const seen = new Set<string>();

  for (const ref of collectAssetRefs($)) {
    const url = absoluteUrl(ref.src, pageUrl);
    if (!url) continue;
    const key = `${ref.type}:${url}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const host = getHost(url);
    assets.push({
      url,
      type: ref.type,
      thirdParty: Boolean(host && pageHost && host !== pageHost),
      hasDimensions: ref.hasDimensions,
      loading: ref.loading,
      insecure: pageIsHttps && url.startsWith('http://'),
    });
  }

  return assets;
}

interface AssetMeta {
  sizeBytes?: number;
  contentType?: string;
  contentEncoding?: string;
}

async function fetchMeta(
  url: string,
  method: 'HEAD' | 'GET',
  timeoutMs: number,
): Promise<(AssetMeta & { ok: boolean }) | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT },
    });
    const lengthHeader = response.headers.get('content-length');
    const parsed = lengthHeader ? Number(lengthHeader) : NaN;
    const meta = {
      ok: response.ok,
      sizeBytes: Number.isFinite(parsed) ? parsed : undefined,
      contentType: response.headers.get('content-type') ?? undefined,
      contentEncoding: response.headers.get('content-encoding') ?? undefined,
    };
    // Don't download the whole body just to read its headers.
    await response.body?.cancel().catch(() => {});
    return meta;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function probeAsset(asset: PageAsset, timeoutMs: number): Promise<void> {
  // Prefer HEAD; fall back to GET for servers that reject or under-report it.
  const head = await fetchMeta(asset.url, 'HEAD', timeoutMs);
  let meta = head;
  if (!head || !head.ok || head.sizeBytes === undefined) {
    const get = await fetchMeta(asset.url, 'GET', timeoutMs);
    if (get) meta = get;
  }
  if (!meta) return;
  asset.contentType = meta.contentType ?? asset.contentType;
  asset.contentEncoding = meta.contentEncoding ?? asset.contentEncoding;
  if (meta.sizeBytes !== undefined) asset.sizeBytes = meta.sizeBytes;
}

/**
 * Enrich assets with transfer sizes by probing each URL. Runs with bounded
 * concurrency and swallows per-asset failures (size checks simply skip assets
 * whose size stays unknown).
 */
export async function enrichAssetSizes(
  assets: PageAsset[],
  options: { timeoutMs: number; concurrency?: number; logger?: Logger },
): Promise<void> {
  const concurrency = Math.max(1, options.concurrency ?? 8);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < assets.length) {
      const asset = assets[cursor];
      cursor += 1;
      await probeAsset(asset, options.timeoutMs);
    }
  };

  const workerCount = Math.min(concurrency, assets.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

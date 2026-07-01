import type { CheerioAPI } from 'cheerio';
import type { ResolvedConfig } from './config.js';

export type AssetType = 'image' | 'script' | 'stylesheet' | 'other';

/** A resource referenced by the page, optionally enriched with size metadata. */
export interface PageAsset {
  /** Absolute URL of the asset. */
  url: string;
  type: AssetType;
  /** Transferred/declared size in bytes, when the server reported it. */
  sizeBytes?: number;
  contentType?: string;
  /** Value of `Content-Encoding` (e.g. `gzip`, `br`), when present. */
  contentEncoding?: string;
  /** True when the asset is served from a different host than the page. */
  thirdParty: boolean;
  /** Images only: whether both `width` and `height` attributes were set. */
  hasDimensions?: boolean;
  /** Images only: the value of the `loading` attribute, if any. */
  loading?: string;
  /** True when referenced over `http://` while the page itself is `https://`. */
  insecure?: boolean;
}

/** Result of probing the origin for a well-known file. */
export interface OriginFileProbe {
  exists: boolean;
  url: string;
}

/**
 * Everything a check needs to evaluate a single page. Built by the scanner and
 * passed (read-only) to each rule. Constructed entirely in-memory, so it can be
 * created directly in tests without any network access.
 */
export interface ShipCheckContext {
  /** The URL (or local path) the user asked to scan. */
  url: string;
  /** The final URL after following redirects (same as `url` for local scans). */
  finalUrl: string;
  /** HTTP status of the document response (200 for local scans). */
  status: number;
  /** Raw HTML source as transferred (pre-JavaScript). */
  html: string;
  /** Parsed HTML, queryable like jQuery. */
  document: CheerioAPI;
  /** Response headers for the document (empty for local scans). */
  headers: Headers;
  /** Resources discovered in the HTML, enriched with sizes where possible. */
  assets: PageAsset[];
  /** Whether the scan source was a remote URL or the local filesystem. */
  source: 'url' | 'local';
  /**
   * True when `html`/`document` reflect the post-JavaScript rendered DOM
   * (Playwright) rather than the raw transferred source.
   */
  rendered: boolean;
  robotsTxt?: OriginFileProbe;
  sitemapXml?: OriginFileProbe;
  config: ResolvedConfig;
}

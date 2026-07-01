import * as cheerio from 'cheerio';
import { defaultConfig } from '../../src/config/default-config';
import type { ResolvedConfig } from '../../src/types/config';
import type { OriginFileProbe, PageAsset, ShipCheckContext } from '../../src/types/context';
import type { PartialResult } from '../../src/types/rule';
import type { ShipCheckRule } from '../../src/types/rule';

export interface MakeContextOptions {
  html?: string;
  url?: string;
  headers?: Record<string, string>;
  status?: number;
  assets?: PageAsset[];
  source?: 'url' | 'local';
  rendered?: boolean;
  robotsTxt?: OriginFileProbe;
  sitemapXml?: OriginFileProbe;
  config?: Partial<ResolvedConfig>;
}

/** Build a fully in-memory scan context for unit tests (no network). */
export function makeContext(options: MakeContextOptions = {}): ShipCheckContext {
  const html = options.html ?? '<!doctype html><html><head></head><body></body></html>';
  const url = options.url ?? 'https://example.com/';
  const config: ResolvedConfig = {
    ...defaultConfig,
    ...options.config,
    thresholds: { ...defaultConfig.thresholds, ...options.config?.thresholds },
  };

  return {
    url,
    finalUrl: url,
    status: options.status ?? 200,
    html,
    document: cheerio.load(html),
    headers: new Headers(options.headers ?? {}),
    assets: options.assets ?? [],
    source: options.source ?? 'url',
    rendered: options.rendered ?? false,
    robotsTxt: options.robotsTxt,
    sitemapXml: options.sitemapXml,
    config,
  };
}

/** Run a set of rules against a context and flatten the results. */
export async function runRules(
  rules: ShipCheckRule[],
  context: ShipCheckContext,
): Promise<PartialResult[]> {
  const results: PartialResult[] = [];
  for (const rule of rules) {
    results.push(...(await rule.run(context)));
  }
  return results;
}

export function ids(results: PartialResult[]): string[] {
  return results.map((result) => result.id);
}

export function byId(results: PartialResult[], id: string): PartialResult | undefined {
  return results.find((result) => result.id === id);
}

/** Convenience for building an image {@link PageAsset}. */
export function imageAsset(overrides: Partial<PageAsset> = {}): PageAsset {
  return {
    url: 'https://example.com/image.jpg',
    type: 'image',
    thirdParty: false,
    ...overrides,
  };
}

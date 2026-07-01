import { existsSync, statSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as cheerio from 'cheerio';
import type { ResolvedConfig } from '../types/config.js';
import type { PageAsset, ShipCheckContext } from '../types/context.js';
import type { Logger } from '../utils/logger.js';
import { isHttpUrl } from '../utils/url.js';
import { collectAssetRefs } from './collect-assets.js';

export interface ScanLocalOptions {
  config: ResolvedConfig;
  logger?: Logger;
}

/** Locate the HTML entry file and the directory to treat as the site root. */
function resolveEntry(target: string): { htmlFile: string; baseDir: string } {
  const resolved = path.resolve(target);
  if (!existsSync(resolved)) {
    throw new Error(`Path not found: ${resolved}`);
  }
  if (statSync(resolved).isDirectory()) {
    const indexFile = path.join(resolved, 'index.html');
    if (!existsSync(indexFile)) {
      throw new Error(`No index.html found in directory: ${resolved}`);
    }
    return { htmlFile: indexFile, baseDir: resolved };
  }
  return { htmlFile: resolved, baseDir: path.dirname(resolved) };
}

/** Resolve a relative asset ref to an absolute path inside the build dir. */
function localAssetPath(src: string, htmlFile: string, baseDir: string): string | undefined {
  if (src.startsWith('/')) return path.join(baseDir, src.slice(1));
  return path.resolve(path.dirname(htmlFile), src);
}

/** Scan a local HTML file (or a directory containing index.html), offline. */
export async function scanLocal(
  target: string,
  options: ScanLocalOptions,
): Promise<ShipCheckContext> {
  const { htmlFile, baseDir } = resolveEntry(target);
  options.logger?.debug(`Reading local file ${htmlFile}`);

  const html = await readFile(htmlFile, 'utf8');
  const document = cheerio.load(html);
  const fileUrl = pathToFileURL(htmlFile).toString();

  const assets: PageAsset[] = [];
  const seen = new Set<string>();

  for (const ref of collectAssetRefs(document)) {
    const external = isHttpUrl(ref.src) || ref.src.startsWith('//');
    const identity = external ? ref.src : (localAssetPath(ref.src, htmlFile, baseDir) ?? ref.src);
    const key = `${ref.type}:${identity}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const asset: PageAsset = {
      url: external ? (ref.src.startsWith('//') ? `https:${ref.src}` : ref.src) : identity,
      type: ref.type,
      thirdParty: external,
      hasDimensions: ref.hasDimensions,
      loading: ref.loading,
      insecure: false,
    };

    // Size local files straight from disk; external refs stay unknown (offline).
    if (!external && existsSync(identity)) {
      try {
        asset.sizeBytes = (await stat(identity)).size;
      } catch {
        // ignore unreadable files
      }
    }
    assets.push(asset);
  }

  const robotsPath = path.join(baseDir, 'robots.txt');
  const sitemapPath = path.join(baseDir, 'sitemap.xml');

  return {
    url: htmlFile,
    finalUrl: fileUrl,
    status: 200,
    html,
    document,
    headers: new Headers(),
    assets,
    source: 'local',
    robotsTxt: { exists: existsSync(robotsPath), url: pathToFileURL(robotsPath).toString() },
    sitemapXml: { exists: existsSync(sitemapPath), url: pathToFileURL(sitemapPath).toString() },
    config: options.config,
  };
}

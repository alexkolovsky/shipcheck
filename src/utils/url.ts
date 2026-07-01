import { existsSync } from 'node:fs';

/** True when the string already starts with an http(s) scheme. */
export function isHttpUrl(input: string): boolean {
  return /^https?:\/\//i.test(input.trim());
}

/** Heuristic: does this look like a bare domain (example.com, foo.dev/x)? */
export function looksLikeDomain(input: string): boolean {
  const value = input.trim();
  if (value.length === 0 || /\s/.test(value)) return false;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(value);
}

/** Add a scheme if missing and return a canonical URL string. */
export function normalizeUrl(input: string): string {
  let value = input.trim();
  if (!isHttpUrl(value)) value = `https://${value}`;
  return new URL(value).toString();
}

/**
 * Decide whether a CLI target refers to a remote URL or a local path. Existing
 * filesystem paths win; otherwise anything that looks like a domain is treated
 * as a URL. Unknown strings fall through to `local` so the local scanner can
 * emit a clear "not found" error.
 */
export function classifyTarget(input: string): 'url' | 'local' {
  const value = input.trim();
  if (isHttpUrl(value)) return 'url';
  if (existsSync(value)) return 'local';
  if (looksLikeDomain(value)) return 'url';
  return 'local';
}

/** Safely resolve `href` against `base`. Returns undefined when invalid. */
export function absoluteUrl(href: string, base: string): string | undefined {
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
}

/** Extract a host from a URL, or undefined if it cannot be parsed. */
export function getHost(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

/** Registrable-ish base domain (last two labels) for grouping third parties. */
export function baseDomain(host: string): string {
  const labels = host.split('.').filter(Boolean);
  if (labels.length <= 2) return host;
  return labels.slice(-2).join('.');
}

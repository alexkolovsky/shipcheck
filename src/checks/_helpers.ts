import type { CheerioAPI } from 'cheerio';
import type { PartialResult } from '../types/rule.js';

/** A Cheerio-wrapped node, e.g. the result of `$(el)`. */
export type CheerioEl = ReturnType<CheerioAPI>;

type Extra = Omit<Partial<PartialResult>, 'id' | 'title' | 'status'>;

export function pass(id: string, title: string, extra: Extra = {}): PartialResult {
  return { ...extra, id, title, status: 'pass' };
}

export function info(id: string, title: string, extra: Extra = {}): PartialResult {
  return { ...extra, id, title, status: 'info' };
}

export function warn(id: string, title: string, extra: Extra = {}): PartialResult {
  return { ...extra, id, title, status: 'warning' };
}

export function error(id: string, title: string, extra: Extra = {}): PartialResult {
  return { ...extra, id, title, status: 'error' };
}

/** Collapse runs of whitespace and trim; tolerant of null/undefined. */
export function collapse(value: string | undefined | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

/** Shorten a string for use as compact evidence. */
export function truncate(value: string, max = 80): string {
  const clean = collapse(value);
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Best-effort accessible name for an interactive element: aria-label,
 * aria-labelledby, visible text, `value`, or a nested image's alt text.
 */
export function accessibleName($: CheerioAPI, $el: CheerioEl): string {
  const aria = collapse($el.attr('aria-label'));
  if (aria) return aria;
  if (collapse($el.attr('aria-labelledby'))) return '[aria-labelledby]';

  const text = collapse($el.text());
  if (text) return text;

  const value = collapse($el.attr('value'));
  if (value) return value;

  const imgAlt = collapse(
    $el
      .find('img[alt]')
      .map((_, img) => $(img).attr('alt') ?? '')
      .get()
      .join(' '),
  );
  if (imgAlt) return imgAlt;

  // Icon-only controls commonly name themselves via a descendant SVG's
  // <title> or an aria-label on the SVG/inner element.
  const svgTitle = collapse($el.find('svg title').first().text());
  if (svgTitle) return svgTitle;

  const descendantAria = collapse($el.find('[aria-label]').first().attr('aria-label'));
  if (descendantAria) return descendantAria;

  return collapse($el.attr('title'));
}

/**
 * True when the element (or any ancestor) is removed from the accessibility
 * tree via `aria-hidden="true"` or the `hidden` attribute. Such elements should
 * not be flagged for missing names/labels.
 */
export function isHiddenFromA11y($el: CheerioEl): boolean {
  return $el.closest('[aria-hidden="true"], [hidden]').length > 0;
}

/** Join a small sample of items for evidence, noting how many were omitted. */
export function sample(items: string[], max = 3): string {
  if (items.length === 0) return '';
  const shown = items.slice(0, max);
  const suffix = items.length > max ? ` (+${items.length - max} more)` : '';
  return shown.map((item) => truncate(item, 60)).join(', ') + suffix;
}

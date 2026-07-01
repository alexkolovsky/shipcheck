import type { Category, Severity } from './issue.js';

/** Playwright navigation wait condition used by rendered mode. */
export type RenderWaitUntil = 'load' | 'domcontentloaded' | 'networkidle' | 'commit';

/** Numeric limits used by the performance and SEO checks. */
export interface Thresholds {
  /** Flag individual images larger than this (KB). */
  maxImageKb: number;
  /** Flag when the total JavaScript transferred exceeds this (KB). */
  maxJsKb: number;
  /** Flag when the total CSS transferred exceeds this (KB). */
  maxCssKb: number;
  /** Flag when more than this many external `<script src>` are present. */
  maxScripts: number;
  /** Flag when assets are loaded from more than this many third-party hosts. */
  maxThirdPartyDomains: number;
  titleMinLength: number;
  titleMaxLength: number;
  descriptionMinLength: number;
  descriptionMaxLength: number;
}

/**
 * Fully resolved configuration handed to every check via the scan context.
 * Built from {@link defaultConfig} merged with any user config file and CLI
 * flags.
 */
export interface ResolvedConfig {
  thresholds: Thresholds;
  /** Whether to run the e-commerce check group. */
  ecommerce: boolean;
  /** Rule ids (or category names) to suppress entirely. */
  ignore: string[];
  /** Per-rule severity overrides; `'off'` is equivalent to ignoring the rule. */
  severityOverrides: Record<string, Severity | 'off'>;
  /** Per-request network timeout in milliseconds. */
  timeoutMs: number;
  /** Load pages in a headless browser (Playwright) before checking them. */
  rendered: boolean;
  /** Navigation wait condition used when {@link rendered} is true. */
  renderWaitUntil: RenderWaitUntil;
}

/** The shape of an optional `shipcheck.config.json` file. All keys optional. */
export interface UserConfig {
  thresholds?: Partial<Thresholds>;
  ecommerce?: boolean;
  ignore?: string[];
  checks?: Record<string, Severity | 'off'>;
  timeoutMs?: number;
  rendered?: boolean;
  renderWaitUntil?: RenderWaitUntil;
}

export type CategoryFilter = Category;

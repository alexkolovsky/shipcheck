/**
 * Core result types shared across checks and reporters.
 *
 * A {@link CheckResult} is what every rule emits — it may represent a passing
 * check (`status: 'pass'`) or a problem (`info` / `warning` / `error`). A
 * {@link ShipCheckIssue} is the public, problem-only shape used in the JSON and
 * Markdown reports and for scoring.
 */

export type Severity = 'info' | 'warning' | 'error';

/** A check either passes or reports a problem at a given severity. */
export type CheckStatus = 'pass' | Severity;

export type Category =
  'seo' | 'accessibility' | 'performance' | 'analytics' | 'security' | 'ecommerce';

/**
 * The raw output of a single rule. Passing checks are kept so the terminal
 * report can render a reassuring checklist (✅), while non-passing results are
 * surfaced as {@link ShipCheckIssue}s.
 */
export interface CheckResult {
  /** Stable, namespaced identifier, e.g. `seo.meta_description.missing`. */
  id: string;
  /** Short human-readable headline. */
  title: string;
  status: CheckStatus;
  category: Category;
  /** Longer explanation of what was (or wasn't) found. */
  description?: string;
  /** CSS-ish selector pointing at the offending element, when relevant. */
  selector?: string;
  /** A short snippet of the evidence, e.g. the duplicated tag id. */
  evidence?: string;
  /** Actionable, one-line fix suggestion. */
  suggestion?: string;
}

/**
 * A problem found on the page. This is the documented public shape used in the
 * JSON report. It is a {@link CheckResult} narrowed to a real severity, plus the
 * scanned `url`.
 */
export interface ShipCheckIssue {
  id: string;
  title: string;
  description?: string;
  severity: Severity;
  category: Category;
  url: string;
  selector?: string;
  evidence?: string;
  suggestion?: string;
}

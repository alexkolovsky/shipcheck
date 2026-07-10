import type { CheckResult, ShipCheckIssue, Severity } from './types/issue.js';
import type { ReportSummary } from './types/report.js';

/** Points deducted from a perfect 100 per issue severity. */
export const SCORE_WEIGHTS: Record<Severity, number> = {
  error: 10,
  warning: 4,
  info: 1,
};

/**
 * Issues reported for information only and never counted against the score —
 * either because virtually no site passes (Permissions-Policy is absent even
 * on MDN and Stripe) or because they are advice about the scan itself.
 */
export const SCORE_EXEMPT_IDS: ReadonlySet<string> = new Set([
  'security.permissions_policy.missing',
  'ecommerce.render_hint',
]);

export function summarize(results: CheckResult[]): ReportSummary {
  const summary: ReportSummary = { errors: 0, warnings: 0, info: 0, passes: 0 };
  for (const result of results) {
    switch (result.status) {
      case 'error':
        summary.errors += 1;
        break;
      case 'warning':
        summary.warnings += 1;
        break;
      case 'info':
        summary.info += 1;
        break;
      default:
        summary.passes += 1;
    }
  }
  return summary;
}

/** Project the raw results down to the public, problem-only issue list. */
export function toIssues(results: CheckResult[], url: string): ShipCheckIssue[] {
  const issues: ShipCheckIssue[] = [];
  for (const result of results) {
    if (result.status === 'pass') continue;
    issues.push({
      id: result.id,
      title: result.title,
      description: result.description,
      severity: result.status,
      category: result.category,
      url,
      selector: result.selector,
      evidence: result.evidence,
      suggestion: result.suggestion,
    });
  }
  return issues;
}

export function computeScore(issues: ShipCheckIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (SCORE_EXEMPT_IDS.has(issue.id)) continue;
    score -= SCORE_WEIGHTS[issue.severity];
  }
  return Math.max(0, score);
}

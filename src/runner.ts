import { getRules } from './checks/index.js';
import { computeScore, summarize, toIssues } from './scoring.js';
import type { ResolvedConfig } from './types/config.js';
import type { ShipCheckContext } from './types/context.js';
import type { CheckResult } from './types/issue.js';
import type { ShipCheckReport } from './types/report.js';

/** Apply the config's ignore list and severity overrides to raw results. */
function applyConfig(results: CheckResult[], config: ResolvedConfig): CheckResult[] {
  const output: CheckResult[] = [];
  for (const result of results) {
    const override = config.severityOverrides[result.id];
    if (override === 'off') continue;
    if (config.ignore.includes(result.id) || config.ignore.includes(result.category)) continue;

    if (override && result.status !== 'pass') {
      output.push({ ...result, status: override });
    } else {
      output.push(result);
    }
  }
  return output;
}

/**
 * Run every applicable rule against a scan context and assemble a report. A rule
 * that throws is recorded as an info-level result rather than aborting the scan.
 */
export async function runChecks(context: ShipCheckContext): Promise<ShipCheckReport> {
  const rules = getRules(context.config);
  const results: CheckResult[] = [];

  for (const rule of rules) {
    try {
      const partials = await rule.run(context);
      for (const partial of partials) {
        results.push({ ...partial, category: rule.category });
      }
    } catch (error) {
      results.push({
        id: `${rule.id}.error`,
        title: `Check "${rule.id}" failed to run`,
        status: 'info',
        category: rule.category,
        description: (error as Error).message,
      });
    }
  }

  const processed = applyConfig(results, context.config);
  const issues = toIssues(processed, context.finalUrl);

  return {
    target: context.url,
    finalUrl: context.finalUrl,
    rendered: context.rendered,
    score: computeScore(issues),
    summary: summarize(processed),
    issues,
    results: processed,
  };
}

import type { Severity } from '../types/issue.js';
import type { ShipCheckReport } from '../types/report.js';
import { CATEGORY_LABELS, CATEGORY_ORDER } from './_shared.js';

const SEVERITY_EMOJI: Record<Severity, string> = {
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

/** Render a Markdown report suitable for PR comments or artifacts. */
export function renderMarkdown(report: ShipCheckReport): string {
  const lines: string[] = [];
  lines.push('# ShipCheck Report', '');
  lines.push(`**Target:** ${report.target}  `);
  if (report.finalUrl !== report.target) {
    lines.push(`**Final URL:** ${report.finalUrl}  `);
  }
  lines.push(`**Score:** ${report.score}/100`, '');

  lines.push('## Summary', '');
  lines.push('| Severity | Count |', '|---|---:|');
  lines.push(`| Errors | ${report.summary.errors} |`);
  lines.push(`| Warnings | ${report.summary.warnings} |`);
  lines.push(`| Info | ${report.summary.info} |`);
  lines.push(`| Passed | ${report.summary.passes} |`, '');

  if (report.issues.length === 0) {
    lines.push('No issues found. 🎉', '');
    return lines.join('\n');
  }

  lines.push('## Issues', '');
  for (const category of CATEGORY_ORDER) {
    const issues = report.issues.filter((issue) => issue.category === category);
    if (issues.length === 0) continue;
    lines.push(`### ${CATEGORY_LABELS[category]}`, '');
    for (const issue of issues) {
      lines.push(`#### ${SEVERITY_EMOJI[issue.severity]} ${issue.title}`, '');
      if (issue.description) lines.push(issue.description, '');
      if (issue.evidence) lines.push(`- **Evidence:** ${issue.evidence}`);
      if (issue.suggestion) lines.push(`- **Suggestion:** ${issue.suggestion}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

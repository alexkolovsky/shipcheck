import pc from 'picocolors';
import type { Category, CheckResult, CheckStatus } from '../types/issue.js';
import type { ShipCheckReport } from '../types/report.js';
import { CATEGORY_LABELS, CATEGORY_ORDER } from './_shared.js';

const ICONS: Record<CheckStatus, string> = {
  pass: '✅',
  info: 'ℹ️ ',
  warning: '⚠️ ',
  error: '❌',
};

function paint(status: CheckStatus, text: string): string {
  switch (status) {
    case 'error':
      return pc.red(text);
    case 'warning':
      return pc.yellow(text);
    case 'info':
      return pc.cyan(text);
    default:
      return pc.green(text);
  }
}

function scoreColor(score: number): (text: string) => string {
  if (score >= 90) return pc.green;
  if (score >= 70) return pc.yellow;
  return pc.red;
}

function formatLine(result: CheckResult): string {
  const icon = ICONS[result.status];
  const title = paint(result.status, result.title);
  const evidence = result.evidence ? pc.dim(` — ${result.evidence}`) : '';
  return `${icon} ${title}${evidence}`;
}

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\[[0-9;]*m/g;

function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}

/** Render a human-friendly, grouped terminal report. */
export function renderTerminal(report: ShipCheckReport, options: { color?: boolean } = {}): string {
  const lines: string[] = [];
  lines.push(pc.bold(`ShipCheck report for ${report.target}`));
  if (report.finalUrl !== report.target) {
    lines.push(pc.dim(`Final URL: ${report.finalUrl}`));
  }
  lines.push('');

  const byCategory = new Map<Category, CheckResult[]>();
  for (const result of report.results) {
    const list = byCategory.get(result.category) ?? [];
    list.push(result);
    byCategory.set(result.category, list);
  }

  for (const category of CATEGORY_ORDER) {
    const results = byCategory.get(category);
    if (!results || results.length === 0) continue;
    lines.push(pc.bold(pc.underline(CATEGORY_LABELS[category])));
    for (const result of results) {
      lines.push(formatLine(result));
      if (result.status !== 'pass' && result.suggestion) {
        lines.push(pc.dim(`     ↳ ${result.suggestion}`));
      }
    }
    lines.push('');
  }

  const { errors, warnings, info, passes } = report.summary;
  const summary = [
    pc.green(`${passes} passed`),
    pc.red(`${errors} errors`),
    pc.yellow(`${warnings} warnings`),
    pc.cyan(`${info} info`),
  ].join(pc.dim(' · '));
  lines.push(summary);
  lines.push(pc.bold(scoreColor(report.score)(`Score: ${report.score}/100`)));

  const output = lines.join('\n');
  return options.color === false ? stripAnsi(output) : output;
}

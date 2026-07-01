import type { CheckResult, ShipCheckIssue } from './issue.js';

export interface ReportSummary {
  errors: number;
  warnings: number;
  info: number;
  passes: number;
}

/**
 * The complete output of a scan.
 *
 * `issues` is the problem-only, serializable list (used by the JSON/Markdown
 * reporters and scoring). `results` additionally carries passing checks so the
 * terminal reporter can render a full checklist; it is not included in JSON
 * output.
 */
export interface ShipCheckReport {
  target: string;
  finalUrl: string;
  /** 0–100, where 100 means no issues found. */
  score: number;
  summary: ReportSummary;
  issues: ShipCheckIssue[];
  /** All raw results, including passes. Not serialized to JSON. */
  results: CheckResult[];
}

/** The exact object shape emitted by the JSON reporter. */
export interface JsonReport {
  target: string;
  finalUrl: string;
  score: number;
  summary: ReportSummary;
  issues: ShipCheckIssue[];
}

import type { JsonReport, ShipCheckReport } from '../types/report.js';

/** Project a full report down to the serializable JSON shape (issues only). */
export function toJsonReport(report: ShipCheckReport): JsonReport {
  return {
    target: report.target,
    finalUrl: report.finalUrl,
    score: report.score,
    summary: report.summary,
    issues: report.issues,
  };
}

export function renderJson(report: ShipCheckReport): string {
  return JSON.stringify(toJsonReport(report), null, 2);
}

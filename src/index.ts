/**
 * ShipCheck public API.
 *
 * The most common entry point is {@link runShipCheck}, which scans a URL or
 * local build and returns a {@link ShipCheckReport}. Lower-level building
 * blocks (scanners, the runner, individual rule sets, and reporters) are
 * exported too, so ShipCheck can be embedded in other tools.
 */

export { runShipCheck } from './run.js';
export type { RunShipCheckOptions } from './run.js';

export { runChecks } from './runner.js';

export { scanUrl } from './scanner/scan-url.js';
export type { ScanUrlOptions } from './scanner/scan-url.js';
export { scanLocal } from './scanner/scan-local.js';
export type { ScanLocalOptions } from './scanner/scan-local.js';

export {
  getRules,
  coreRules,
  ecommerceRules,
  seoRules,
  accessibilityRules,
  performanceRules,
  analyticsRules,
  securityRules,
} from './checks/index.js';

export { defaultConfig, defaultThresholds } from './config/default-config.js';
export { loadUserConfig, resolveConfig } from './config/load-config.js';

export { renderTerminal } from './reporters/terminal.js';
export { renderJson, toJsonReport } from './reporters/json.js';
export { renderMarkdown } from './reporters/markdown.js';

export { computeScore, summarize, toIssues, SCORE_WEIGHTS } from './scoring.js';
export { VERSION } from './version.js';

export type * from './types/issue.js';
export type * from './types/context.js';
export type * from './types/report.js';
export type * from './types/config.js';
export type * from './types/rule.js';

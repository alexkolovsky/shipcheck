import { runChecks } from './runner.js';
import { scanLocal } from './scanner/scan-local.js';
import { scanUrl } from './scanner/scan-url.js';
import type { ResolvedConfig } from './types/config.js';
import type { ShipCheckReport } from './types/report.js';
import type { Logger } from './utils/logger.js';
import { classifyTarget } from './utils/url.js';

export interface RunShipCheckOptions {
  config: ResolvedConfig;
  logger?: Logger;
  /** Probe asset sizes over the network (URL scans only). */
  probeAssets?: boolean;
}

/**
 * High-level entry point: classify the target, scan it, and run all checks.
 * This is what the CLI uses and what most library consumers want.
 */
export async function runShipCheck(
  target: string,
  options: RunShipCheckOptions,
): Promise<ShipCheckReport> {
  const kind = classifyTarget(target);
  const context =
    kind === 'url'
      ? await scanUrl(target, {
          config: options.config,
          logger: options.logger,
          probeAssets: options.probeAssets,
        })
      : await scanLocal(target, { config: options.config, logger: options.logger });
  return runChecks(context);
}

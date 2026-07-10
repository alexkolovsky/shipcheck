#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { Command } from 'commander';
import pc from 'picocolors';
import { loadUserConfig, resolveConfig } from './config/load-config.js';
import { renderJson } from './reporters/json.js';
import { renderMarkdown } from './reporters/markdown.js';
import { renderTerminal } from './reporters/terminal.js';
import { runChecks } from './runner.js';
import { scanLocal } from './scanner/scan-local.js';
import { scanUrl } from './scanner/scan-url.js';
import type { ShipCheckReport } from './types/report.js';
import { createLogger } from './utils/logger.js';
import { classifyTarget } from './utils/url.js';
import { VERSION } from './version.js';

interface CliOptions {
  json?: boolean;
  report: string;
  output?: string;
  ecommerce?: boolean;
  failOn?: string;
  minScore?: number;
  timeout?: number;
  maxPages?: number;
  config?: string;
  /** Commander sets this false when `--no-probe-assets` is passed. */
  probeAssets?: boolean;
  rendered?: boolean;
  waitUntil?: string;
  userAgent?: string;
  verbose?: boolean;
}

const WAIT_EVENTS = ['load', 'domcontentloaded', 'networkidle', 'commit'] as const;

function computeExitCode(report: ShipCheckReport, failOn?: string, minScore?: number): number {
  if (minScore !== undefined && report.score < minScore) return 1;
  if (!failOn) return 0;
  const { errors, warnings } = report.summary;
  if (failOn === 'error') return errors > 0 ? 1 : 0;
  if (failOn === 'warning') return errors + warnings > 0 ? 1 : 0;
  return 0;
}

async function main(target: string, options: CliOptions): Promise<void> {
  const logger = createLogger(Boolean(options.verbose));

  const reportType = options.json ? 'json' : options.report;
  if (!['terminal', 'json', 'markdown'].includes(reportType)) {
    logger.error(`Unknown report type: ${reportType} (use terminal, json, or markdown)`);
    process.exitCode = 1;
    return;
  }
  if (options.failOn && !['warning', 'error'].includes(options.failOn)) {
    logger.error(`Unknown --fail-on level: ${options.failOn} (use warning or error)`);
    process.exitCode = 1;
    return;
  }
  if (
    options.minScore !== undefined &&
    (!Number.isInteger(options.minScore) || options.minScore < 0 || options.minScore > 100)
  ) {
    logger.error(`Invalid --min-score: expected an integer between 0 and 100`);
    process.exitCode = 1;
    return;
  }
  if (
    options.rendered &&
    options.waitUntil &&
    !WAIT_EVENTS.includes(options.waitUntil as (typeof WAIT_EVENTS)[number])
  ) {
    logger.error(`Unknown --wait-until: ${options.waitUntil} (use ${WAIT_EVENTS.join(', ')})`);
    process.exitCode = 1;
    return;
  }

  try {
    const userConfig = await loadUserConfig({ configPath: options.config });
    const config = resolveConfig(userConfig, {
      ecommerce: options.ecommerce ? true : undefined,
      timeoutMs: options.timeout,
      rendered: options.rendered ? true : undefined,
      renderWaitUntil:
        options.rendered && options.waitUntil
          ? (options.waitUntil as (typeof WAIT_EVENTS)[number])
          : undefined,
      userAgent: options.userAgent,
    });

    const kind = classifyTarget(target);
    logger.debug(`Target "${target}" classified as ${kind}`);

    const context =
      kind === 'url'
        ? await scanUrl(target, { config, logger, probeAssets: options.probeAssets })
        : await scanLocal(target, { config, logger });

    const report = await runChecks(context);

    const output =
      reportType === 'json'
        ? renderJson(report)
        : reportType === 'markdown'
          ? renderMarkdown(report)
          : renderTerminal(report, { color: !options.output });

    if (options.output) {
      const contents = output.endsWith('\n') ? output : `${output}\n`;
      await writeFile(options.output, contents, 'utf8');
      process.stdout.write(
        `${pc.green('✓')} Report written to ${options.output} (score ${report.score}/100)\n`,
      );
    } else {
      process.stdout.write(`${output}\n`);
    }

    process.exitCode = computeExitCode(report, options.failOn, options.minScore);
  } catch (error) {
    logger.error((error as Error).message);
    if (options.verbose) console.error(error);
    process.exitCode = 1;
  }
}

const program = new Command();
program
  .name('shipcheck')
  .description('Catch common website launch mistakes before your users do.')
  .version(VERSION, '-v, --version')
  .argument('<target>', 'URL or local directory/file to scan')
  .option('--json', 'Output a JSON report (shorthand for --report json)')
  .option('--report <type>', 'Report type: terminal, json, or markdown', 'terminal')
  .option('--output <path>', 'Write the report to a file instead of stdout')
  .option('--ecommerce', 'Enable e-commerce product checks')
  .option('--fail-on <level>', 'Exit 1 when issues at this level exist: warning | error')
  .option('--min-score <n>', 'Exit 1 when the score is below this number (0-100)', (value) =>
    Number.parseInt(value, 10),
  )
  .option('--timeout <ms>', 'Per-request network timeout in ms', (value) =>
    Number.parseInt(value, 10),
  )
  .option('--max-pages <n>', 'Reserved for future crawl mode', (value) =>
    Number.parseInt(value, 10),
  )
  .option('--config <path>', 'Path to a shipcheck config file')
  .option(
    '--rendered',
    'Load the page in a headless browser (requires Playwright) so checks see the rendered DOM',
  )
  .option(
    '--wait-until <event>',
    'With --rendered: navigation wait (load, domcontentloaded, networkidle, commit)',
    'load',
  )
  .option(
    '--user-agent <string>',
    'Override the User-Agent header sent with every request (some servers vary their response by UA)',
  )
  .option('--no-probe-assets', 'Skip network probing of asset sizes (faster URL scans)')
  .option('--verbose', 'Print verbose debug output to stderr')
  .action((target: string, options: CliOptions) => main(target, options));

program.parseAsync(process.argv).catch((error: unknown) => {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exitCode = 1;
});

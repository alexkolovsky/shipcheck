import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ResolvedConfig, UserConfig } from '../types/config.js';
import { defaultConfig } from './default-config.js';

const CONFIG_FILE_NAMES = ['shipcheck.config.json', '.shipcheckrc.json', '.shipcheckrc'];

/**
 * Read a user config file. If `configPath` is given it must exist; otherwise we
 * look for well-known names in `cwd`. Returns `{}` when none is found.
 */
export async function loadUserConfig(
  options: { configPath?: string; cwd?: string } = {},
): Promise<UserConfig> {
  const cwd = options.cwd ?? process.cwd();
  let filePath: string | undefined;

  if (options.configPath) {
    filePath = path.resolve(cwd, options.configPath);
    if (!existsSync(filePath)) {
      throw new Error(`Config file not found: ${filePath}`);
    }
  } else {
    for (const name of CONFIG_FILE_NAMES) {
      const candidate = path.join(cwd, name);
      if (existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }
  }

  if (!filePath) return {};

  const raw = await readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw) as UserConfig;
  } catch (error) {
    throw new Error(`Failed to parse config file ${filePath}: ${(error as Error).message}`);
  }
}

/** Merge defaults, a user config file, and CLI overrides into one config. */
export function resolveConfig(
  user: UserConfig = {},
  overrides: Partial<ResolvedConfig> = {},
): ResolvedConfig {
  return {
    thresholds: {
      ...defaultConfig.thresholds,
      ...user.thresholds,
      ...overrides.thresholds,
    },
    ecommerce: overrides.ecommerce ?? user.ecommerce ?? defaultConfig.ecommerce,
    ignore: [...(user.ignore ?? []), ...(overrides.ignore ?? [])],
    severityOverrides: { ...user.checks, ...overrides.severityOverrides },
    timeoutMs: overrides.timeoutMs ?? user.timeoutMs ?? defaultConfig.timeoutMs,
    rendered: overrides.rendered ?? user.rendered ?? defaultConfig.rendered,
    renderWaitUntil:
      overrides.renderWaitUntil ?? user.renderWaitUntil ?? defaultConfig.renderWaitUntil,
    userAgent: overrides.userAgent ?? user.userAgent,
  };
}

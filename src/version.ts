import { createRequire } from 'node:module';

/**
 * Resolved from package.json at runtime (works from both src/ and dist/), so
 * the reported version can never drift from the published one.
 */
export const VERSION = (createRequire(import.meta.url)('../package.json') as { version: string })
  .version;

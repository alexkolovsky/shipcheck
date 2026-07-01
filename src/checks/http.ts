import type { ShipCheckRule } from '../types/rule.js';
import { error, pass } from './_helpers.js';

const statusRule: ShipCheckRule = {
  id: 'http.status',
  category: 'http',
  run(ctx) {
    // Local scans have no real response; a status of 0 means the browser
    // navigation produced no main response to inspect.
    if (ctx.source !== 'url' || ctx.status === 0) return [];

    if (ctx.status >= 400) {
      return [
        error('http.status.error', `Page responded with HTTP ${ctx.status}`, {
          evidence: ctx.finalUrl,
          suggestion:
            'Fix the URL or the server response — every other finding below describes the error page, not the real page.',
        }),
      ];
    }
    return [pass('http.status.ok', `Page responded with HTTP ${ctx.status}`)];
  },
};

export const httpRules: ShipCheckRule[] = [statusRule];

import type { PartialResult, ShipCheckRule } from '../types/rule.js';
import { error, info, pass, sample, truncate, warn } from './_helpers.js';

const httpsRule: ShipCheckRule = {
  id: 'security.https',
  category: 'security',
  run(ctx) {
    if (ctx.source !== 'url') return [];
    if (ctx.finalUrl.startsWith('https://')) {
      return [pass('security.https.enabled', 'HTTPS is enabled')];
    }
    return [
      error('security.https.missing', 'Page is not served over HTTPS', {
        suggestion: 'Serve the site over HTTPS and redirect http:// to https://.',
      }),
    ];
  },
};

const securityHeadersRule: ShipCheckRule = {
  id: 'security.headers',
  category: 'security',
  run(ctx) {
    if (ctx.source !== 'url') return [];
    const headers = ctx.headers;
    const results: PartialResult[] = [];
    const csp = headers.get('content-security-policy') ?? '';

    const check = (
      present: boolean,
      okId: string,
      okTitle: string,
      badId: string,
      badTitle: string,
      severity: 'warning' | 'info',
      suggestion: string,
    ): void => {
      if (present) {
        results.push(pass(okId, okTitle));
      } else {
        results.push(
          severity === 'warning'
            ? warn(badId, badTitle, { suggestion })
            : info(badId, badTitle, { suggestion }),
        );
      }
    };

    check(
      Boolean(headers.get('strict-transport-security')),
      'security.hsts.present',
      'HSTS header is set',
      'security.hsts.missing',
      'Missing Strict-Transport-Security header',
      'warning',
      'Add Strict-Transport-Security to enforce HTTPS on future visits.',
    );
    check(
      Boolean(csp),
      'security.csp.present',
      'Content-Security-Policy is set',
      'security.csp.missing',
      'Missing Content-Security-Policy header',
      'warning',
      'Add a Content-Security-Policy to reduce XSS and injection risk.',
    );
    check(
      (headers.get('x-content-type-options') ?? '').toLowerCase().includes('nosniff'),
      'security.content_type_options.present',
      'X-Content-Type-Options is set',
      'security.content_type_options.missing',
      'Missing X-Content-Type-Options: nosniff',
      'warning',
      'Add X-Content-Type-Options: nosniff to prevent MIME sniffing.',
    );
    check(
      Boolean(headers.get('referrer-policy')),
      'security.referrer_policy.present',
      'Referrer-Policy is set',
      'security.referrer_policy.missing',
      'Missing Referrer-Policy header',
      'info',
      'Add a Referrer-Policy (e.g. strict-origin-when-cross-origin).',
    );
    check(
      Boolean(headers.get('permissions-policy')),
      'security.permissions_policy.present',
      'Permissions-Policy is set',
      'security.permissions_policy.missing',
      'Missing Permissions-Policy header',
      'info',
      'Add a Permissions-Policy to restrict powerful browser features.',
    );
    check(
      Boolean(headers.get('x-frame-options')) || /frame-ancestors/i.test(csp),
      'security.frame.protected',
      'Clickjacking protection is set',
      'security.frame.missing',
      'Missing clickjacking protection (X-Frame-Options / frame-ancestors)',
      'warning',
      'Add X-Frame-Options: DENY or a CSP frame-ancestors directive.',
    );

    const poweredBy = headers.get('x-powered-by');
    if (poweredBy) {
      results.push(
        info('security.powered_by.exposed', 'X-Powered-By header exposes stack details', {
          evidence: truncate(poweredBy),
          suggestion: 'Remove or obscure the X-Powered-By header.',
        }),
      );
    }
    return results;
  },
};

const mixedContentRule: ShipCheckRule = {
  id: 'security.mixed_content',
  category: 'security',
  run(ctx) {
    if (ctx.source !== 'url' || !ctx.finalUrl.startsWith('https://')) return [];
    const insecure = ctx.assets.filter((asset) => asset.insecure);
    if (insecure.length === 0) return [];
    return [
      warn('security.mixed_content', `${insecure.length} asset(s) loaded over http://`, {
        evidence: sample(insecure.map((asset) => asset.url)),
        suggestion: 'Load all assets over HTTPS; browsers block or downgrade mixed content.',
      }),
    ];
  },
};

const sourceMapRule: ShipCheckRule = {
  id: 'security.source_map',
  category: 'security',
  run(ctx) {
    const hasInlineMap = /sourceMappingURL=/.test(ctx.html);
    const mapAssets = ctx.assets.filter((asset) => asset.url.endsWith('.map'));
    if (!hasInlineMap && mapAssets.length === 0) return [];
    return [
      info('security.source_map.exposed', 'Source map reference detected', {
        evidence: mapAssets.length
          ? sample(mapAssets.map((a) => a.url))
          : 'inline sourceMappingURL',
        suggestion: 'Avoid shipping source maps to production, or restrict access to them.',
      }),
    ];
  },
};

export const securityRules: ShipCheckRule[] = [
  httpsRule,
  securityHeadersRule,
  mixedContentRule,
  sourceMapRule,
];

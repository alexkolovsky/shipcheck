import { describe, expect, it } from 'vitest';
import { securityRules } from '../../src/checks/security';
import { byId, ids, imageAsset, makeContext, runRules } from '../helpers/context';

const SECURE_HEADERS = {
  'strict-transport-security': 'max-age=63072000',
  'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'geolocation=()',
};

describe('Security checks', () => {
  it('passes HTTPS and reports all header warnings when headers are absent', async () => {
    const ctx = makeContext({ url: 'https://example.com/', headers: {} });
    const results = await runRules(securityRules, ctx);
    expect(byId(results, 'security.https.enabled')?.status).toBe('pass');
    expect(ids(results)).toEqual(
      expect.arrayContaining([
        'security.hsts.missing',
        'security.csp.missing',
        'security.content_type_options.missing',
        'security.frame.missing',
      ]),
    );
  });

  it('passes when the recommended headers are present', async () => {
    const ctx = makeContext({ headers: SECURE_HEADERS });
    const results = await runRules(securityRules, ctx);
    expect(byId(results, 'security.csp.present')?.status).toBe('pass');
    expect(byId(results, 'security.frame.protected')?.status).toBe('pass');
    expect(ids(results)).not.toContain('security.hsts.missing');
  });

  it('flags a non-HTTPS page as an error', async () => {
    const ctx = makeContext({ url: 'http://example.com/' });
    ctx.finalUrl = 'http://example.com/';
    expect(byId(await runRules(securityRules, ctx), 'security.https.missing')?.status).toBe(
      'error',
    );
  });

  it('detects mixed content on an HTTPS page', async () => {
    const ctx = makeContext({
      url: 'https://example.com/',
      assets: [
        imageAsset({ url: 'http://cdn.example.com/logo.png', thirdParty: true, insecure: true }),
      ],
    });
    expect(byId(await runRules(securityRules, ctx), 'security.mixed_content')?.status).toBe(
      'warning',
    );
  });

  it('skips header checks for local scans', async () => {
    const ctx = makeContext({ source: 'local', headers: {} });
    const results = await runRules(securityRules, ctx);
    expect(ids(results)).not.toContain('security.csp.missing');
    expect(ids(results)).not.toContain('security.https.enabled');
  });
});

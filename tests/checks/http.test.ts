import { describe, expect, it } from 'vitest';
import { httpRules } from '../../src/checks/http';
import { byId, ids, makeContext, runRules } from '../helpers/context';

describe('http checks', () => {
  it('reports an error for 4xx/5xx responses', async () => {
    const results = await runRules(httpRules, makeContext({ status: 404 }));
    const issue = byId(results, 'http.status.error');
    expect(issue?.status).toBe('error');
    expect(issue?.title).toContain('404');
  });

  it('passes for 2xx responses', async () => {
    const results = await runRules(httpRules, makeContext({ status: 200 }));
    expect(byId(results, 'http.status.ok')?.status).toBe('pass');
  });

  it('stays silent for local scans', async () => {
    const results = await runRules(httpRules, makeContext({ source: 'local', status: 200 }));
    expect(results).toHaveLength(0);
  });

  it('stays silent when no main response was captured (status 0)', async () => {
    const results = await runRules(httpRules, makeContext({ status: 0 }));
    expect(ids(results)).toHaveLength(0);
  });
});

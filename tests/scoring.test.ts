import { describe, expect, it } from 'vitest';
import { computeScore, summarize, toIssues } from '../src/scoring';
import type { CheckResult } from '../src/types/issue';

const results: CheckResult[] = [
  { id: 'a', title: 'a', status: 'error', category: 'seo' },
  { id: 'b', title: 'b', status: 'error', category: 'seo' },
  { id: 'c', title: 'c', status: 'warning', category: 'security' },
  { id: 'd', title: 'd', status: 'info', category: 'performance' },
  { id: 'e', title: 'e', status: 'pass', category: 'analytics' },
];

describe('scoring', () => {
  it('summarizes counts by status', () => {
    expect(summarize(results)).toEqual({ errors: 2, warnings: 1, info: 1, passes: 1 });
  });

  it('keeps only non-pass results as issues and stamps the url + severity', () => {
    const issues = toIssues(results, 'https://example.com/');
    expect(issues).toHaveLength(4);
    expect(issues.every((issue) => issue.url === 'https://example.com/')).toBe(true);
    expect(issues.find((issue) => issue.id === 'a')?.severity).toBe('error');
  });

  it('computes the score from severity weights and clamps at zero', () => {
    // 100 - (2*10) - (1*4) - (1*1) = 75
    expect(computeScore(toIssues(results, 'https://example.com/'))).toBe(75);

    const many: CheckResult[] = Array.from({ length: 20 }, (_, i) => ({
      id: `e${i}`,
      title: 'x',
      status: 'error',
      category: 'seo',
    }));
    expect(computeScore(toIssues(many, 'https://example.com/'))).toBe(0);
  });
});

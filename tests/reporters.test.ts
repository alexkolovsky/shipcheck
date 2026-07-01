import { describe, expect, it } from 'vitest';
import { renderJson } from '../src/reporters/json';
import { renderMarkdown } from '../src/reporters/markdown';
import { renderTerminal } from '../src/reporters/terminal';
import { runChecks } from '../src/runner';
import { makeContext } from './helpers/context';

const ESC = String.fromCharCode(27);

const buildReport = () =>
  runChecks(
    makeContext({
      html: '<html><head></head><body><img src="a.jpg"></body></html>',
      headers: {},
    }),
  );

describe('reporters', () => {
  it('produces valid, documented JSON', async () => {
    const parsed = JSON.parse(renderJson(await buildReport()));
    expect(parsed).toHaveProperty('target');
    expect(parsed).toHaveProperty('score');
    expect(parsed.summary).toEqual(
      expect.objectContaining({ errors: expect.any(Number), warnings: expect.any(Number) }),
    );
    expect(Array.isArray(parsed.issues)).toBe(true);
    for (const issue of parsed.issues) {
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('category');
    }
  });

  it('renders a Markdown report with a summary table', async () => {
    const md = renderMarkdown(await buildReport());
    expect(md).toContain('# ShipCheck Report');
    expect(md).toContain('## Summary');
    expect(md).toContain('| Severity | Count |');
  });

  it('renders terminal output and strips ANSI when color is disabled', async () => {
    const report = await buildReport();
    const plain = renderTerminal(report, { color: false });
    expect(plain).toContain('ShipCheck report for');
    expect(plain).toContain('Score:');
    expect(plain.includes(ESC)).toBe(false);
  });
});

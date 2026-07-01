import { describe, expect, it } from 'vitest';
import { accessibilityRules } from '../../src/checks/accessibility';
import { byId, ids, makeContext, runRules } from '../helpers/context';

const doc = (bodyOrHtml: { body?: string; htmlAttrs?: string }) =>
  makeContext({
    html: `<!doctype html><html ${bodyOrHtml.htmlAttrs ?? 'lang="en"'}><head><title>t</title></head><body>${bodyOrHtml.body ?? ''}</body></html>`,
  });

describe('Accessibility checks', () => {
  it('warns when <html> has no lang attribute', async () => {
    const results = await runRules(accessibilityRules, doc({ htmlAttrs: '' }));
    expect(byId(results, 'a11y.html_lang.missing')?.status).toBe('warning');
  });

  it('counts images without an alt attribute but ignores decorative alt=""', async () => {
    const results = await runRules(
      accessibilityRules,
      doc({
        body: '<img src="a.jpg"><img src="b.jpg"><img src="c.jpg" alt=""><img src="d.jpg" alt="ok">',
      }),
    );
    const missing = byId(results, 'a11y.image_alt.missing');
    expect(missing?.status).toBe('warning');
    expect(missing?.title).toContain('2 image');
  });

  it('passes when every image has alt text or is decorative', async () => {
    const results = await runRules(
      accessibilityRules,
      doc({ body: '<img src="a.jpg" alt="a"><img src="b.jpg" alt="">' }),
    );
    expect(byId(results, 'a11y.image_alt.ok')?.status).toBe('pass');
  });

  it('flags buttons and links without accessible text', async () => {
    const results = await runRules(
      accessibilityRules,
      doc({ body: '<button></button><button aria-label="Close">x</button><a href="/x"></a>' }),
    );
    expect(byId(results, 'a11y.button_text.missing')?.title).toContain('1 button');
    expect(byId(results, 'a11y.link_text.missing')?.title).toContain('1 link');
  });

  it('flags inputs without labels but accepts aria-label and wrapping label', async () => {
    const results = await runRules(
      accessibilityRules,
      doc({
        body: '<input type="text"><input type="text" aria-label="Search"><label>Name <input type="text"></label><input type="hidden">',
      }),
    );
    const missing = byId(results, 'a11y.input_label.missing');
    expect(missing?.title).toContain('1 form control');
  });

  it('detects skipped heading levels', async () => {
    const results = await runRules(
      accessibilityRules,
      doc({ body: '<h1>Title</h1><h4>Way too deep</h4>' }),
    );
    expect(ids(results)).toContain('a11y.heading.order');
  });
});

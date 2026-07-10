import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ecommerceRules } from '../../src/checks/ecommerce';
import { byId, makeContext, runRules } from '../helpers/context';

const productHtml = readFileSync(
  fileURLToPath(new URL('../fixtures/pages/ecommerce-product.html', import.meta.url)),
  'utf8',
);

describe('E-commerce checks', () => {
  it('passes a well-formed product page', async () => {
    const results = await runRules(ecommerceRules, makeContext({ html: productHtml }));
    expect(byId(results, 'ecommerce.product_schema.present')?.status).toBe('pass');
    expect(byId(results, 'ecommerce.product_name.present')?.status).toBe('pass');
    expect(byId(results, 'ecommerce.product_price.present')?.status).toBe('pass');
    expect(byId(results, 'ecommerce.availability.present')?.status).toBe('pass');
    expect(byId(results, 'ecommerce.add_to_cart.present')?.status).toBe('pass');
    expect(byId(results, 'ecommerce.cart_link.present')?.status).toBe('pass');
  });

  it('flags a page that is missing product signals', async () => {
    const ctx = makeContext({
      html: '<html lang="en"><head><title>Not a product</title></head><body><p>hello</p></body></html>',
    });
    const results = await runRules(ecommerceRules, ctx);
    expect(byId(results, 'ecommerce.product_schema.missing')?.status).toBe('warning');
    expect(byId(results, 'ecommerce.product_price.missing')?.status).toBe('warning');
    expect(byId(results, 'ecommerce.add_to_cart.missing')?.status).toBe('warning');
    // A content page with no scripts is not a client-rendered shell.
    expect(byId(results, 'ecommerce.render_hint')).toBeUndefined();
  });

  const spaShell =
    '<html lang="en"><head><title>Store</title>' +
    '<script src="/runtime.js"></script><script src="/vendor.js"></script>' +
    '<script src="/app.js"></script></head><body><div id="root"></div></body></html>';

  it('hints at --rendered when a static scan of an app shell finds nothing', async () => {
    const results = await runRules(ecommerceRules, makeContext({ html: spaShell }));
    expect(byId(results, 'ecommerce.render_hint')?.status).toBe('info');
  });

  it('does not hint when the scan is already rendered', async () => {
    const results = await runRules(ecommerceRules, makeContext({ html: spaShell, rendered: true }));
    expect(byId(results, 'ecommerce.render_hint')).toBeUndefined();
  });

  it('does not hint when any e-commerce signal is present', async () => {
    const withCartLink = spaShell.replace('<div id="root">', '<a href="/cart">Cart</a><div>');
    const results = await runRules(ecommerceRules, makeContext({ html: withCartLink }));
    expect(byId(results, 'ecommerce.render_hint')).toBeUndefined();
  });
});

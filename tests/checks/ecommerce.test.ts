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
  });
});

import type { ShipCheckContext } from '../types/context.js';
import type { PartialResult, ShipCheckRule } from '../types/rule.js';
import { collapse, info, pass, truncate, warn } from './_helpers.js';

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

/** Recursively collect JSON-LD nodes, flattening arrays and @graph blocks. */
function collectNodes(value: unknown, out: JsonObject[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectNodes(item, out);
    return;
  }
  if (isObject(value)) {
    out.push(value);
    if ('@graph' in value) collectNodes(value['@graph'], out);
  }
}

function hasType(node: JsonObject, type: string): boolean {
  const value = node['@type'];
  const matches = (candidate: unknown): boolean =>
    typeof candidate === 'string' && (candidate === type || candidate.endsWith(`/${type}`));
  return Array.isArray(value) ? value.some(matches) : matches(value);
}

/** Find the first JSON-LD Product node on the page, if any. */
function findProduct(ctx: ShipCheckContext): JsonObject | undefined {
  const nodes: JsonObject[] = [];
  ctx.document('script[type="application/ld+json"]').each((_, el) => {
    const raw = ctx.document(el).text();
    if (!raw.trim()) return;
    try {
      collectNodes(JSON.parse(raw), nodes);
    } catch {
      // ignore malformed JSON-LD blocks
    }
  });
  return nodes.find((node) => hasType(node, 'Product'));
}

function offersOf(product: JsonObject | undefined): JsonObject[] {
  const offers = product?.offers;
  if (Array.isArray(offers)) return offers.filter(isObject);
  return isObject(offers) ? [offers] : [];
}

function hasPrice(ctx: ShipCheckContext, product: JsonObject | undefined): boolean {
  for (const offer of offersOf(product)) {
    if (offer.price || offer.lowPrice) return true;
    const spec = offer.priceSpecification;
    if (isObject(spec) && spec.price) return true;
  }
  const $ = ctx.document;
  if (collapse($('meta[property="product:price:amount"]').attr('content'))) return true;
  if (collapse($('meta[property="og:price:amount"]').attr('content'))) return true;
  if ($('[itemprop="price"]').length > 0) return true;
  return false;
}

function availabilityOf(product: JsonObject | undefined): string | undefined {
  for (const offer of offersOf(product)) {
    if (typeof offer.availability === 'string') return offer.availability;
  }
  return undefined;
}

const ADD_TO_CART = /\badd(ed)?\s+to\s+(cart|bag|basket)\b/i;

function hasAddToCart(ctx: ShipCheckContext): boolean {
  const $ = ctx.document;
  const candidates = $(
    'button, a, input[type="submit"], input[type="button"], [role="button"]',
  ).toArray();
  for (const el of candidates) {
    const $el = $(el);
    const text = `${collapse($el.text())} ${collapse($el.attr('value'))} ${collapse($el.attr('aria-label'))}`;
    if (ADD_TO_CART.test(text)) return true;
  }
  return (
    $('[data-add-to-cart], [id*="add-to-cart"], [class*="add-to-cart"], [name="add"]').length > 0
  );
}

function hasCartLink(ctx: ShipCheckContext): boolean {
  const $ = ctx.document;
  for (const el of $('a[href]').toArray()) {
    const href = collapse($(el).attr('href')).toLowerCase();
    const text = collapse($(el).text()).toLowerCase();
    if (/\/(cart|checkout|bag|basket)(\/|\?|#|$)/.test(href)) return true;
    if (/\b(cart|checkout|basket)\b/.test(text)) return true;
  }
  return false;
}

/**
 * Heuristic for a client-rendered app shell: almost no static text content but
 * several scripts. Static mode can't see anything such a page renders later.
 */
function looksClientRendered(ctx: ShipCheckContext): boolean {
  const bodyText = collapse(ctx.document('body').text());
  return bodyText.length < 500 && ctx.document('script').length >= 3;
}

const renderHintRule: ShipCheckRule = {
  id: 'ecommerce.render_hint',
  category: 'ecommerce',
  run(ctx) {
    if (ctx.rendered || ctx.source !== 'url') return [];
    const product = findProduct(ctx);
    if (product || hasPrice(ctx, product) || hasAddToCart(ctx) || hasCartLink(ctx)) return [];
    if (!looksClientRendered(ctx)) return [];
    return [
      info('ecommerce.render_hint', 'Page appears client-side rendered', {
        description:
          'Every e-commerce signal is missing and the page is an app shell (little text, ' +
          'heavy JavaScript), so the findings above are likely artifacts of static scanning.',
        suggestion: 'Re-run with --rendered so the checks see the JavaScript-rendered DOM.',
      }),
    ];
  },
};

const productRule: ShipCheckRule = {
  id: 'ecommerce.product',
  category: 'ecommerce',
  run(ctx) {
    const results: PartialResult[] = [];
    const product = findProduct(ctx);
    const $ = ctx.document;

    // Schema
    if (product) {
      results.push(pass('ecommerce.product_schema.present', 'Product JSON-LD schema found'));
    } else {
      results.push(
        warn('ecommerce.product_schema.missing', 'No Product structured data (JSON-LD) found', {
          suggestion: 'Add schema.org Product JSON-LD so search engines show rich results.',
        }),
      );
    }

    // Name
    const name =
      (typeof product?.name === 'string' && collapse(product.name)) ||
      collapse($('meta[property="og:title"]').attr('content')) ||
      collapse($('h1').first().text());
    if (name) {
      results.push(
        pass('ecommerce.product_name.present', 'Product name is present', {
          evidence: truncate(name),
        }),
      );
    } else {
      results.push(
        warn('ecommerce.product_name.missing', 'Product name could not be found', {
          suggestion: 'Expose the product name in JSON-LD, og:title, or an <h1>.',
        }),
      );
    }

    // Price
    if (hasPrice(ctx, product)) {
      results.push(pass('ecommerce.product_price.present', 'Product price is present'));
    } else {
      results.push(
        warn('ecommerce.product_price.missing', 'Product price could not be found', {
          suggestion: 'Include the price in Product/Offer JSON-LD or product:price:amount meta.',
        }),
      );
    }

    // Availability
    const availability = availabilityOf(product);
    if (availability) {
      if (/outofstock|soldout/i.test(availability)) {
        results.push(
          info('ecommerce.availability.out_of_stock', 'Product is marked out of stock', {
            evidence: truncate(availability),
          }),
        );
      } else {
        results.push(pass('ecommerce.availability.present', 'Product availability is declared'));
      }
    } else {
      results.push(
        info('ecommerce.availability.missing', 'Product availability is not declared', {
          suggestion: 'Add offers.availability (e.g. schema.org/InStock) to the Product schema.',
        }),
      );
    }

    // Image
    const hasImage =
      Boolean(product?.image) || Boolean(collapse($('meta[property="og:image"]').attr('content')));
    if (hasImage) {
      results.push(pass('ecommerce.product_image.present', 'Product image is present'));
    } else {
      results.push(
        warn('ecommerce.product_image.missing', 'Product image could not be found', {
          suggestion: 'Provide a product image via JSON-LD image or og:image.',
        }),
      );
    }

    return results;
  },
};

const addToCartRule: ShipCheckRule = {
  id: 'ecommerce.add_to_cart',
  category: 'ecommerce',
  run(ctx) {
    if (hasAddToCart(ctx)) {
      return [pass('ecommerce.add_to_cart.present', 'Add-to-cart control found')];
    }
    return [
      warn('ecommerce.add_to_cart.missing', 'No add-to-cart control detected', {
        suggestion: 'Ensure the add-to-cart button is present in the initial HTML where possible.',
      }),
    ];
  },
};

const cartLinkRule: ShipCheckRule = {
  id: 'ecommerce.cart_link',
  category: 'ecommerce',
  run(ctx) {
    if (hasCartLink(ctx)) {
      return [pass('ecommerce.cart_link.present', 'Cart or checkout link found')];
    }
    return [
      info('ecommerce.cart_link.missing', 'No cart or checkout link detected', {
        suggestion: 'Expose a link to the cart/checkout so shoppers can complete a purchase.',
      }),
    ];
  },
};

export const ecommerceRules: ShipCheckRule[] = [
  productRule,
  addToCartRule,
  cartLinkRule,
  renderHintRule,
];

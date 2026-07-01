# Checks

Every check emits a result with a stable **rule ID** and a status: `pass` (✅,
no penalty), `info` (ℹ️, −1), `warning` (⚠️, −4), or `error` (❌, −10).

Rule IDs are stable and can be used in the [`ignore`](configuration.md) list or
given a custom severity via the `checks` map. The tables below list the
**problem** IDs; most have a `pass` counterpart shown in the terminal report.

## SEO

| Rule ID                          | Default | Meaning                                     |
| -------------------------------- | ------- | ------------------------------------------- |
| `seo.title.missing`              | error   | No `<title>` in the document head           |
| `seo.title.too_short`            | warning | Title shorter than the configured minimum   |
| `seo.title.too_long`             | warning | Title likely to be truncated in results     |
| `seo.meta_description.missing`   | warning | No `<meta name="description">`              |
| `seo.meta_description.too_short` | info    | Meta description shorter than recommended   |
| `seo.meta_description.too_long`  | info    | Meta description likely to be truncated     |
| `seo.h1.missing`                 | warning | No `<h1>` on the page                       |
| `seo.h1.multiple`                | warning | More than one `<h1>`                        |
| `seo.noindex`                    | error   | `noindex` via meta robots or `X-Robots-Tag` |
| `seo.canonical.missing`          | info    | No `<link rel="canonical">`                 |
| `seo.open_graph.incomplete`      | info    | Missing one of og:title/description/image   |
| `seo.twitter_card.missing`       | info    | No `<meta name="twitter:card">`             |
| `seo.robots_txt.missing`         | info    | `/robots.txt` not found (URL scans)         |
| `seo.sitemap.missing`            | info    | `/sitemap.xml` not found (URL scans)        |

## Accessibility

| Rule ID                    | Default | Meaning                                         |
| -------------------------- | ------- | ----------------------------------------------- |
| `a11y.html_lang.missing`   | warning | `<html>` has no `lang` attribute                |
| `a11y.image_alt.missing`   | warning | Images with no `alt` attribute (`alt=""` is OK) |
| `a11y.button_text.missing` | warning | Buttons with no accessible name                 |
| `a11y.link_text.missing`   | warning | Links with no readable text / accessible name   |
| `a11y.input_label.missing` | warning | Form controls with no associated label          |
| `a11y.heading.empty`       | warning | Heading elements with no text                   |
| `a11y.heading.order`       | info    | Heading levels skip (e.g. H2 → H4)              |

## Performance

Size-based checks require asset sizes, which come from `Content-Length` on URL
scans (see `--no-probe-assets`) or from disk on local scans.

| Rule ID                         | Default | Meaning                                      |
| ------------------------------- | ------- | -------------------------------------------- |
| `perf.image.large`              | warning | Image larger than `maxImageKb`               |
| `perf.image.dimensions_missing` | info    | Image missing `width`/`height` attributes    |
| `perf.image.lazy_loading`       | info    | Many images, none using `loading="lazy"`     |
| `perf.scripts.too_many`         | info    | More external scripts than `maxScripts`      |
| `perf.third_party.too_many`     | info    | Assets from more than `maxThirdPartyDomains` |
| `perf.js.too_large`             | warning | Total JS over `maxJsKb`                      |
| `perf.css.too_large`            | warning | Total CSS over `maxCssKb`                    |
| `perf.compression.missing`      | info    | Large text asset served without gzip/br      |

## Analytics

| Rule ID                                    | Default | Meaning                                   |
| ------------------------------------------ | ------- | ----------------------------------------- |
| `analytics.ga4.duplicate`                  | error   | Same GA4 ID loaded/configured twice       |
| `analytics.ga4.multiple`                   | info    | Multiple distinct GA4 IDs on the page     |
| `analytics.gtm.duplicate`                  | error   | Same GTM container included twice         |
| `analytics.meta_pixel.duplicate`           | error   | Same Meta Pixel `init` called twice       |
| `analytics.universal_analytics.deprecated` | warning | Legacy Universal Analytics / `UA-` code   |
| `analytics.datalayer.multiple_init`        | info    | `dataLayer = [ … ]` reassigned repeatedly |
| `analytics.debug_script`                   | warning | Dev-server / debug script left in page    |

> Detection is based on the **static HTML**. Tags injected at runtime (e.g. via
> GTM) are not visible; a `pass` therefore means "no duplicate in page source".

## Security

Header checks run for URL scans only (a local build has no response headers).

| Rule ID                                 | Default | Meaning                                    |
| --------------------------------------- | ------- | ------------------------------------------ |
| `security.https.missing`                | error   | Page not served over HTTPS                 |
| `security.hsts.missing`                 | warning | No `Strict-Transport-Security`             |
| `security.csp.missing`                  | warning | No `Content-Security-Policy`               |
| `security.content_type_options.missing` | warning | No `X-Content-Type-Options: nosniff`       |
| `security.referrer_policy.missing`      | info    | No `Referrer-Policy`                       |
| `security.permissions_policy.missing`   | info    | No `Permissions-Policy`                    |
| `security.frame.missing`                | warning | No `X-Frame-Options` / CSP frame-ancestors |
| `security.powered_by.exposed`           | info    | `X-Powered-By` reveals stack details       |
| `security.mixed_content`                | warning | HTTPS page loads `http://` assets          |
| `security.source_map.exposed`           | info    | Source map reference detected              |

## E-commerce (`--ecommerce`)

| Rule ID                               | Default | Meaning                            |
| ------------------------------------- | ------- | ---------------------------------- |
| `ecommerce.product_schema.missing`    | warning | No Product JSON-LD structured data |
| `ecommerce.product_name.missing`      | warning | Product name not found             |
| `ecommerce.product_price.missing`     | warning | Product price not found            |
| `ecommerce.availability.missing`      | info    | No availability declared           |
| `ecommerce.availability.out_of_stock` | info    | Product marked out of stock        |
| `ecommerce.product_image.missing`     | warning | No product image found             |
| `ecommerce.add_to_cart.missing`       | warning | No add-to-cart control detected    |
| `ecommerce.cart_link.missing`         | info    | No cart/checkout link detected     |

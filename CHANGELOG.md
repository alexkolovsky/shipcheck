# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-07-01

### Added

- **Rendered mode (`--rendered`).** Optionally load a page in a headless browser
  (Playwright) and run all checks against the post-JavaScript DOM instead of the
  raw HTML source — so SPA-injected analytics tags, meta, and content are seen.
  Playwright is an **optional peer dependency**, so the default install stays
  lightweight; `--rendered` prints install instructions if it's missing. Includes
  `--wait-until <event>` (`load` | `domcontentloaded` | `networkidle` | `commit`)
  and matching `rendered` / `renderWaitUntil` config keys. Reports note
  `Mode: rendered` and expose `"rendered": true` in JSON.

### Fixed

- **Accessibility:** inline `display:none` and `visibility:hidden` styles are now
  treated as hidden from the accessibility tree. Elements hidden this way (and
  their descendants) no longer produce false positives for missing button/link
  text, input labels, empty headings, or image `alt`. Hiding via an external CSS
  class still can't be detected by static analysis and is intentionally not
  covered.

## [0.1.1] - 2026-07-01

### Changed

- Maintenance release: version/metadata bump, published to npm as `shipcheckit`.

## [0.1.0] - 2026-07-01

Initial public release. Published to npm as **`shipcheckit`** (CLI command:
`shipcheck`). A fast, static pre-launch checker — `fetch` + [cheerio](https://cheerio.js.org/),
no headless browser.

### Added

- **Scanning** — single public URL, or a local build directory / single HTML file.
- **SEO checks** — `<title>` presence and length, meta description presence and
  length, missing/multiple H1, canonical link, accidental `noindex`, Open Graph
  and Twitter Card metadata, `robots.txt` and `sitemap.xml` probing.
- **Accessibility checks** — `html[lang]`, image `alt`, button/link/input
  accessible names, empty headings, heading-order skips.
- **Performance checks** — oversized images, missing image dimensions, lazy-loading
  hint, script count, third-party domain sprawl, total JS/CSS weight, missing
  text-asset compression.
- **Analytics checks** — duplicate **GA4**, **GTM**, and **Meta Pixel**; multiple
  GA4 IDs; deprecated Universal Analytics; risky `dataLayer` re-initialization;
  stray dev/debug scripts.
- **Security checks** — HTTPS, HSTS, CSP, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, clickjacking protection, mixed
  content, exposed source maps, `X-Powered-By` disclosure.
- **E-commerce checks** (`--ecommerce`) — Product JSON-LD, product name, price,
  availability / out-of-stock, product image, add-to-cart control, cart/checkout
  link.
- **Reporters** — terminal (default, colored, grouped, with fix suggestions),
  JSON (`--json`), and Markdown (`--report markdown`); `--output` to write to a
  file.
- **Scoring** — starts at 100, subtracts per issue (error −10, warning −4,
  info −1), floored at 0.
- **Configuration** — optional `shipcheck.config.json` / `.shipcheckrc` with
  thresholds, per-rule severity overrides, and ignore lists.
- **CLI flags** — `--fail-on warning|error` for CI, `--timeout`,
  `--no-probe-assets`, `--verbose`, `--config`, `-v/--version`.
- **Programmatic API** — `runShipCheck`, `resolveConfig`, and the reporters.

[Unreleased]: https://github.com/alexkolovsky/shipcheck/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/alexkolovsky/shipcheck/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/alexkolovsky/shipcheck/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/alexkolovsky/shipcheck/releases/tag/v0.1.0

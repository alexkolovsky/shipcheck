# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Node.js ≥ 20 is now required** (was ≥ 18). A transitive dependency
  (`undici`, via `cheerio`) dropped Node 18 — which is EOL — so the tool could
  not actually run there. The CI matrix drops Node 18 to match.

### Added

- **HTTP status check (`http.status`).** A 4xx/5xx response is now reported as
  an error-severity finding (new `http` category) instead of a verbose-only
  warning, so `--fail-on error` catches a broken staging URL in CI. Asset
  probing is skipped on error pages.
- **`--min-score <n>`.** Exit 1 when the score falls below a threshold — a
  simpler CI gate than per-severity `--fail-on`.
- **Responsive image collection.** Asset scanning now understands `srcset`
  (largest candidate wins, comma-in-URL safe), `<picture><source>`,
  `<video poster>`, and `<link rel="preload">` / `modulepreload`, so oversized
  responsive/art-directed images are no longer invisible to the size checks.
- **Release automation.** Pushing a `v*` tag now lint/typechecks/tests and
  publishes to npm with provenance (`.github/workflows/release.yml`).
- **CI:** coverage reporting (`vitest --coverage`) and a real-Chromium rendered-
  mode smoke test job.
- **Tests:** end-to-end CLI tests (exit codes, flag validation, `--json`,
  `--output`, `--min-score`).

### Fixed

- `--version` can no longer drift from `package.json`: the version is resolved
  from `package.json` at runtime instead of a hand-synced constant.

## [0.4.0] - 2026-07-01

Version re-baseline — **no functional changes over `0.1.2`.** The `0.1.x`
numbering had fallen several milestones behind the roadmap (the project was
already feature-complete through the e-commerce milestone, v0.4.0), so the
version is bumped to reflect that. Future releases continue from here (crawl
mode → 0.5.0).

### Fixed

- `shipcheck --version` now reports the correct version; `src/version.ts` had
  drifted behind `package.json` (published `0.1.2` reported `0.1.1`).

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

[Unreleased]: https://github.com/alexkolovsky/shipcheck/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/alexkolovsky/shipcheck/compare/v0.1.2...v0.4.0
[0.1.2]: https://github.com/alexkolovsky/shipcheck/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/alexkolovsky/shipcheck/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/alexkolovsky/shipcheck/releases/tag/v0.1.0

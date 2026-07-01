# ShipCheck

> Catch common website launch mistakes before your users do.

**ShipCheck** is a practical pre-launch checker for web developers. It scans a
website — or a local build — for the SEO, accessibility, performance, analytics,
and security mistakes that quietly slip into production, and prints a clear,
actionable report in one command.

```bash
npx shipcheckit https://example.com
```

It is **not** trying to replace Lighthouse, axe, or a full security scanner. It
answers one question well:

> _"Did we miss anything obvious before shipping this page?"_

```txt
ShipCheck report for https://example.com/

SEO
✅ Title exists — Example Domain
⚠️  Meta description is missing
✅ One H1 found
✅ Page is indexable (no noindex)

Accessibility
✅ Document language set (lang="en")
⚠️  2 image(s) missing alt text

Analytics
❌ Duplicate GA4 tag detected — G-ABCDE12345 (loaded 2×, configured 1×)
✅ No duplicate GTM container detected

Security
⚠️  Missing Content-Security-Policy header
✅ HTTPS is enabled

3 passed · 1 errors · 5 warnings · 5 info
Score: 73/100
```

## Why ShipCheck?

Before launching, developers usually need to check a lot of small-but-important
things — and they're scattered across browser extensions, manual QA checklists,
and production debugging sessions:

- Is the `<title>` present and the meta description filled in?
- Are images missing `alt` text or blowing up the page weight?
- Is **GA4 loaded twice**? Is **GTM duplicated**? Is the **Meta Pixel** firing
  twice?
- Is `noindex` accidentally left on?
- Are the security headers (CSP, HSTS, X-Frame-Options…) in place?

ShipCheck turns those checks into one repeatable command. Its strongest angle is
**analytics duplicate detection** — the kind of mistake most other audit tools
don't look for, but which quietly corrupts your conversion numbers.

## Installation

Run it directly with `npx` (no install):

```bash
npx shipcheckit https://example.com
```

Or install it globally / as a dev dependency:

```bash
npm install -g shipcheckit
# or
npm install --save-dev shipcheckit
```

Once installed, the command is just `shipcheck` (the examples below use it).

Requires **Node.js 18+**. ShipCheck is a fast, static analyzer (`fetch` +
[cheerio](https://cheerio.js.org/)) — no headless browser to download.

## Usage

```bash
# Scan a live URL
shipcheck https://example.com

# Scan a local build directory (looks for index.html) or a single file
shipcheck ./dist
shipcheck ./dist/index.html

# Machine-readable output
shipcheck https://example.com --json

# Markdown report saved to a file (great for CI artifacts / PR comments)
shipcheck https://example.com --report markdown --output shipcheck-report.md

# Product-page checks
shipcheck https://example.com/products/shoe --ecommerce

# Fail the command (exit 1) when problems are found — for CI
shipcheck https://example.com --fail-on error
```

### Options

| Option              | Description                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| `--json`            | Output a JSON report (shorthand for `--report json`)                             |
| `--report <type>`   | `terminal` (default), `json`, or `markdown`                                      |
| `--output <path>`   | Write the report to a file instead of stdout                                     |
| `--ecommerce`       | Enable e-commerce product checks                                                 |
| `--fail-on <level>` | Exit `1` when issues at this level exist: `warning`/`error`                      |
| `--min-score <n>`   | Exit `1` when the score is below `n` (0–100)                                     |
| `--timeout <ms>`    | Per-request network timeout (default `15000`)                                    |
| `--config <path>`   | Path to a `shipcheck.config.json` file                                           |
| `--rendered`        | Load the page in a headless browser before checking (see below)                  |
| `--wait-until <e>`  | With `--rendered`: `load` (default), `domcontentloaded`, `networkidle`, `commit` |
| `--no-probe-assets` | Skip network probing of asset sizes (faster URL scans)                           |
| `--verbose`         | Print verbose debug output to stderr                                             |
| `-v, --version`     | Show version                                                                     |
| `--help`            | Show help                                                                        |

### Exit codes

- `0` — the scan completed (default; use `--fail-on` / `--min-score` to change this).
- `1` — a network/runtime error, issues met your `--fail-on` threshold, or the
  score fell below `--min-score`.

## What it checks

Checks are grouped into categories. See [`docs/checks.md`](docs/checks.md)
for the full list of rule IDs and severities.

- **HTTP** — the page responds successfully (a 4xx/5xx page is flagged as an
  error, since every other finding would describe the error page).
- **SEO** — title, meta description, H1s, canonical, accidental `noindex`, Open
  Graph / Twitter cards, robots.txt & sitemap.xml.
- **Accessibility** — `html[lang]`, image `alt`, button/link/input accessible
  names, empty headings, heading order.
- **Performance** — oversized images, missing image dimensions, script count,
  third-party domain sprawl, total JS/CSS weight, missing compression.
- **Analytics** — duplicate **GA4**, **GTM**, and **Meta Pixel**; deprecated
  Universal Analytics; risky `dataLayer` re-init; stray dev/debug scripts.
- **Security** — HTTPS, HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, clickjacking protection, mixed content, exposed source
  maps.
- **E-commerce** (`--ecommerce`) — Product JSON-LD, name, price, availability,
  image, add-to-cart control, cart/checkout link.

> ShipCheck reports **risks**, not guarantees. By default it reads the static
> HTML, so tags injected later by GTM or client-side frameworks won't be seen —
> "no duplicate GA4 detected" means _in the page source_. To check the rendered
> DOM instead, use [`--rendered`](#rendered-mode).

### Rendered mode

By default ShipCheck is a fast static analyzer and only sees the HTML as
transferred. For single-page apps and pages that inject tags, meta, or content
after hydration, pass `--rendered` to load the page in a headless browser and
check the **post-JavaScript DOM**:

```bash
shipcheck https://example.com --rendered
# give late-loading scripts (analytics, etc.) more time to appear:
shipcheck https://example.com --rendered --wait-until networkidle
```

Rendered mode uses [Playwright](https://playwright.dev/), which is an **optional
peer dependency** — the default install stays lightweight. Install it once to use
`--rendered`:

```bash
npm i -D playwright
npx playwright install chromium
```

Everything else works the same; the report is just computed against the rendered
DOM (and notes `Mode: rendered`).

## Reports

- **Terminal** (default) — grouped, colored, with fix suggestions.
- **JSON** (`--json`) — stable schema for scripting; see below.
- **Markdown** (`--report markdown`) — see
  [`examples/basic-report.md`](examples/basic-report.md).

```json
{
  "target": "https://example.com",
  "score": 76,
  "summary": { "errors": 2, "warnings": 5, "info": 3, "passes": 12 },
  "issues": [
    {
      "id": "seo.meta_description.missing",
      "title": "Meta description is missing",
      "severity": "warning",
      "category": "seo",
      "url": "https://example.com",
      "suggestion": "Add a concise meta description of about 50–160 characters."
    }
  ]
}
```

## Scoring

The score starts at `100` and subtracts per issue: **error −10**, **warning −4**,
**info −1** (floored at `0`). The score is a quick signal — the real value is the
issue list and its suggestions.

## Configuration

Configuration is optional; the defaults are sensible. Drop a
`shipcheck.config.json` next to your project (or point at one with `--config`):

```json
{
  "thresholds": { "maxImageKb": 500, "maxJsKb": 500, "maxCssKb": 250 },
  "checks": { "security.csp.missing": "error" },
  "ignore": ["seo.open_graph.incomplete"]
}
```

See [`docs/configuration.md`](docs/configuration.md) for all keys.

## GitHub Actions

```yaml
name: ShipCheck
on: pull_request
jobs:
  shipcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx shipcheckit https://staging.example.com --fail-on error
```

More recipes (build-dir scanning, Markdown artifacts) in
[`docs/github-action.md`](docs/github-action.md).

## Programmatic API

```ts
import { runShipCheck, resolveConfig, renderJson } from 'shipcheckit';

const report = await runShipCheck('https://example.com', {
  config: resolveConfig(),
});

console.log(report.score, report.summary);
console.log(renderJson(report));
```

## Contributing

Adding a check is intentionally small — each rule is independent:

```ts
import type { ShipCheckRule } from 'shipcheckit';

export const myRule: ShipCheckRule = {
  id: 'seo.example',
  category: 'seo',
  run(ctx) {
    const ok = ctx.document('meta[name="example"]').length > 0;
    return ok
      ? [{ id: 'seo.example.present', title: 'Example tag present', status: 'pass' }]
      : [{ id: 'seo.example.missing', title: 'Example tag missing', status: 'warning' }];
  },
};
```

```bash
npm install
npm test          # vitest
npm run lint      # eslint
npm run typecheck # tsc --noEmit
npm run build     # tsup
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide — project layout, how to
add a check, rule-ID conventions, and the PR checklist. Changes are tracked in
[CHANGELOG.md](CHANGELOG.md).

## Status

ShipCheck is in early development (`v0.1`). Feedback and issues welcome.

## License

[MIT](LICENSE)

# Configuration

Configuration is **optional** — ShipCheck ships with sensible defaults. When you
do want to tune it, add a config file to your project root or pass one with
`--config <path>`.

Recognized file names (first match wins):

- `shipcheck.config.json`
- `.shipcheckrc.json`
- `.shipcheckrc`

## Example

```json
{
  "thresholds": {
    "maxImageKb": 500,
    "maxJsKb": 500,
    "maxCssKb": 250,
    "maxScripts": 12,
    "maxThirdPartyDomains": 10,
    "titleMinLength": 10,
    "titleMaxLength": 60,
    "descriptionMinLength": 50,
    "descriptionMaxLength": 160
  },
  "ecommerce": false,
  "timeoutMs": 15000,
  "rendered": false,
  "renderWaitUntil": "load",
  "userAgent": "ShipCheck/<version> (+https://github.com/alexkolovsky/shipcheck)",
  "checks": {
    "security.csp.missing": "error",
    "seo.meta_description.too_long": "off"
  },
  "ignore": ["seo.open_graph.incomplete", "performance"]
}
```

## Keys

### `thresholds`

Numeric limits used by the performance and SEO checks. Any subset can be
overridden; unspecified values fall back to the defaults above.

### `ecommerce`

`true` to always run the e-commerce checks (equivalent to always passing
`--ecommerce`). The `--ecommerce` flag also enables them for a single run.

### `timeoutMs`

Per-request network timeout in milliseconds. Overridden by `--timeout`.

### `rendered`

`true` to load pages in a headless browser (Playwright) and check the rendered,
post-JavaScript DOM instead of the raw HTML source. Equivalent to always passing
`--rendered`. Requires Playwright to be installed
(`npm i -D playwright && npx playwright install chromium`); it is an optional
peer dependency, so the default install stays lightweight.

### `renderWaitUntil`

When `rendered` is on, the navigation wait condition: `"load"` (default),
`"domcontentloaded"`, `"networkidle"`, or `"commit"`. Use `"networkidle"` to give
late, script-injected tags (analytics, etc.) the best chance to appear.
Overridden by `--wait-until`.

### `userAgent`

The `User-Agent` header sent with every request. Defaults to
`ShipCheck/<version> (+https://github.com/alexkolovsky/shipcheck)`. Some
servers vary their response by UA (e.g. serve bots different markup than
browsers) — override this to scan what real visitors see. Overridden by
`--user-agent`.

### `checks`

Map of **rule ID → severity**, used to re-classify a check:

- `"info"`, `"warning"`, `"error"` — force this severity for the rule.
- `"off"` — disable the rule entirely (same as adding it to `ignore`).

Rule IDs are listed in [`checks.md`](checks.md).

### `ignore`

A list of **rule IDs** or **category names** (`seo`, `accessibility`,
`performance`, `analytics`, `security`, `ecommerce`) to suppress. Ignored
results are dropped before scoring, so they don't affect the final score.

## Precedence

For a single run, values are merged in this order (later wins):

1. Built-in defaults
2. Config file
3. CLI flags (`--ecommerce`, `--timeout`, `--rendered`, `--wait-until`, `--user-agent`)

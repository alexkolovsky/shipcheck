# Using ShipCheck in GitHub Actions

ShipCheck is CI-friendly: use `--fail-on` to turn issues into a non-zero exit
code, and `--report markdown --output` to save an artifact.

## Fail a PR when a staging URL has errors

```yaml
name: ShipCheck
on: pull_request

jobs:
  shipcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx shipcheck https://staging.example.com --fail-on error
```

## Scan a build directory (no deploy needed)

```yaml
name: ShipCheck (build)
on: pull_request

jobs:
  shipcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build # produces ./dist
      - run: npx shipcheck ./dist --fail-on warning
```

## Upload a Markdown report as an artifact

```yaml
- name: Run ShipCheck
  run: npx shipcheck https://staging.example.com --report markdown --output shipcheck-report.md
- uses: actions/upload-artifact@v4
  with:
    name: shipcheck-report
    path: shipcheck-report.md
```

## Post the report as a PR comment

Combine the Markdown output with a comment action, for example
[`marocchino/sticky-pull-request-comment`](https://github.com/marocchino/sticky-pull-request-comment):

```yaml
- name: Run ShipCheck
  run: npx shipcheck https://staging.example.com --report markdown --output shipcheck-report.md
- uses: marocchino/sticky-pull-request-comment@v2
  with:
    path: shipcheck-report.md
```

> A dedicated `shipcheck-action` is planned; until then the CLI + a documented
> workflow keeps things simple and transparent.

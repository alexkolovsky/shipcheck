# Contributing to ShipCheck

Thanks for your interest in improving ShipCheck! It's a small, focused CLI, and
contributions — especially new checks and false-positive fixes — are very
welcome.

## Guiding principle

ShipCheck optimizes for being **useful in 60 seconds** and **quiet on false
positives**. A check that cries wolf is worse than no check. When in doubt, lower
the severity (`info` over `warning`), word the finding as a _possible_ issue, and
prefer to skip ambiguous cases rather than flag them.

## Prerequisites

- **Node.js 20+**
- **npm** (the repo uses `package-lock.json`)

## Getting started

```bash
git clone https://github.com/alexkolovsky/shipcheck.git
cd shipcheck
npm install
```

Run the CLI straight from source against any target:

```bash
npm run dev -- https://example.com
npm run dev -- ./tests/fixtures/site
```

## Development workflow

| Command                   | What it does                        |
| ------------------------- | ----------------------------------- |
| `npm run dev -- <target>` | Run the CLI from source (tsx)       |
| `npm test`                | Run the test suite once (Vitest)    |
| `npm run test:watch`      | Run tests in watch mode             |
| `npm run lint`            | ESLint                              |
| `npm run typecheck`       | `tsc --noEmit`                      |
| `npm run format`          | Prettier (write)                    |
| `npm run build`           | Bundle with tsup (ESM + CJS + d.ts) |

Before opening a PR, make sure these all pass:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Project layout

```
src/
  cli.ts            # CLI entry (commander)
  runner.ts         # runs rules, applies config, builds the report
  scanner/          # fetch URL / read local files → ShipCheckContext
  checks/           # one file per category; each exports an array of rules
  reporters/        # terminal / json / markdown
  config/           # defaults + config-file loading
  types/            # shared types (issue, rule, context, config, report)
tests/              # Vitest specs + HTML fixtures
docs/               # checks.md, configuration.md, github-action.md
```

## Adding a check (the most common contribution)

Every check is a small, independent `ShipCheckRule`. A rule inspects the
read-only `ShipCheckContext` and returns results — `pass` for a clean result
(these render as ✅ in the terminal) or `info` / `warning` / `error` for a
problem.

1. **Write the rule** in the relevant `src/checks/<category>.ts`, using the
   helpers in `src/checks/_helpers.ts` (`pass`, `info`, `warn`, `error`,
   `collapse`, `truncate`, `sample`, …):

   ```ts
   const exampleRule: ShipCheckRule = {
     id: 'seo.example',
     category: 'seo',
     run(ctx) {
       const found = ctx.document('meta[name="example"]').length > 0;
       return found
         ? [pass('seo.example.present', 'Example tag present')]
         : [
             warn('seo.example.missing', 'Example tag is missing', {
               suggestion: 'Add <meta name="example"> for …',
             }),
           ];
     },
   };
   ```

2. **Register it** by adding the rule to the exported array at the bottom of the
   category file (e.g. `seoRules`).

3. **Add a test** in `tests/checks/<category>.test.ts`. Build a context with the
   in-memory `makeContext` helper (no network) and assert on result IDs/status:

   ```ts
   const results = await runRules(seoRules, makeContext({ html: '…' }));
   expect(byId(results, 'seo.example.missing')?.status).toBe('warning');
   ```

4. **Document it** in `docs/checks.md`.

### Rule ID conventions

Rule IDs are the **stable public API** — users reference them in `ignore` and
severity overrides — so treat them like a contract:

- Format: `category.subject.state`, e.g. `seo.meta_description.missing`,
  `a11y.image_alt.ok`, `analytics.ga4.duplicate`.
- Categories: `seo`, `a11y`/`accessibility`, `perf`/`performance`, `analytics`,
  `security`, `ecommerce`.
- Don't rename an existing ID without a very good reason (it's a breaking change).

### Choosing a severity

- **`error`** — almost certainly wrong and likely to hurt users/SEO/revenue
  (e.g. `noindex` on a live page, duplicate GA4, no HTTPS).
- **`warning`** — probably a mistake worth fixing before launch.
- **`info`** — a suggestion or a low-confidence signal.
- **`pass`** — the check ran and everything's fine.

Remember the static-analysis limits: ShipCheck sees page _source_, not the
rendered DOM. Word findings so they don't over-claim (e.g. "no duplicate GA4 _in
the page source_").

## Commit messages

Please use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(seo): add hreflang check
fix(a11y): treat inline display:none as hidden
docs: clarify --fail-on behavior
chore: bump dependencies
```

## Pull requests

- Keep PRs focused; one logical change per PR where possible.
- Ensure `lint`, `typecheck`, `test`, and `build` all pass.
- Add/update tests for any behavior change.
- Add a bullet to the **[Unreleased]** section of [`CHANGELOG.md`](CHANGELOG.md).
- Maintainers handle version bumps and npm publishing — you don't need to bump
  the version in your PR.

## Reporting bugs & suggesting checks

Use the issue templates:

- **Bug report** — something scanned incorrectly (please include the target,
  the command, and `shipcheck --version`).
- **Suggest a check** — an idea for a new rule.
- **Feature request** — anything else.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).

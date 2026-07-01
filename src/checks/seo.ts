import type { PartialResult, ShipCheckRule } from '../types/rule.js';
import { collapse, error, info, pass, truncate, warn } from './_helpers.js';

const titleRule: ShipCheckRule = {
  id: 'seo.title',
  category: 'seo',
  run(ctx) {
    const title = collapse(ctx.document('head title').first().text());
    const { titleMinLength, titleMaxLength } = ctx.config.thresholds;

    if (!title) {
      return [
        error('seo.title.missing', 'Missing <title>', {
          description: 'The page has no title, which search engines and browser tabs rely on.',
          suggestion: 'Add a unique, descriptive <title> to the document <head>.',
        }),
      ];
    }

    const results = [pass('seo.title.present', 'Title exists', { evidence: truncate(title) })];
    if (title.length < titleMinLength) {
      results.push(
        warn('seo.title.too_short', `Title is very short (${title.length} chars)`, {
          evidence: truncate(title),
          suggestion: `Aim for roughly ${titleMinLength}–${titleMaxLength} characters.`,
        }),
      );
    } else if (title.length > titleMaxLength) {
      results.push(
        warn('seo.title.too_long', `Title is long (${title.length} chars) and may be truncated`, {
          evidence: truncate(title),
          suggestion: `Keep the title under ~${titleMaxLength} characters so it isn't cut off in results.`,
        }),
      );
    }
    return results;
  },
};

const descriptionRule: ShipCheckRule = {
  id: 'seo.meta_description',
  category: 'seo',
  run(ctx) {
    const description = collapse(ctx.document('meta[name="description"]').attr('content'));
    const { descriptionMinLength, descriptionMaxLength } = ctx.config.thresholds;

    if (!description) {
      return [
        warn('seo.meta_description.missing', 'Meta description is missing', {
          description: 'Search engines may generate a snippet themselves without one.',
          suggestion: `Add a concise meta description of about ${descriptionMinLength}–${descriptionMaxLength} characters.`,
        }),
      ];
    }

    const results = [
      pass('seo.meta_description.present', 'Meta description exists', {
        evidence: truncate(description),
      }),
    ];
    if (description.length < descriptionMinLength) {
      results.push(
        info(
          'seo.meta_description.too_short',
          `Meta description is short (${description.length} chars)`,
        ),
      );
    } else if (description.length > descriptionMaxLength) {
      results.push(
        info(
          'seo.meta_description.too_long',
          `Meta description is long (${description.length} chars)`,
          {
            suggestion: `It may be truncated; ~${descriptionMaxLength} characters is a safe upper bound.`,
          },
        ),
      );
    }
    return results;
  },
};

const headingsRule: ShipCheckRule = {
  id: 'seo.h1',
  category: 'seo',
  run(ctx) {
    const count = ctx.document('h1').length;
    if (count === 0) {
      return [
        warn('seo.h1.missing', 'No H1 heading found', {
          suggestion: 'Add a single, descriptive <h1> that summarizes the page.',
        }),
      ];
    }
    if (count === 1) {
      return [pass('seo.h1.single', 'One H1 found')];
    }
    return [
      warn('seo.h1.multiple', `Multiple H1 headings found (${count})`, {
        evidence: `${count} <h1> elements`,
        suggestion: 'Prefer a single H1 per page; use H2–H6 for sub-sections.',
      }),
    ];
  },
};

const indexabilityRule: ShipCheckRule = {
  id: 'seo.indexability',
  category: 'seo',
  run(ctx) {
    const metaRobots = collapse(ctx.document('meta[name="robots"]').attr('content')).toLowerCase();
    const metaGoogle = collapse(
      ctx.document('meta[name="googlebot"]').attr('content'),
    ).toLowerCase();
    const headerRobots = (ctx.headers.get('x-robots-tag') ?? '').toLowerCase();

    const source = [metaRobots, metaGoogle, headerRobots].find((value) =>
      value.includes('noindex'),
    );

    if (source) {
      return [
        error('seo.noindex', 'Page is set to noindex', {
          description:
            'This page asks search engines not to index it. Common accidental launch blocker.',
          evidence: truncate(source),
          suggestion: 'Remove the noindex directive if this page should appear in search results.',
        }),
      ];
    }
    return [pass('seo.indexable', 'Page is indexable (no noindex)')];
  },
};

const canonicalRule: ShipCheckRule = {
  id: 'seo.canonical',
  category: 'seo',
  run(ctx) {
    const href = collapse(ctx.document('link[rel="canonical"]').attr('href'));
    if (!href) {
      return [
        info('seo.canonical.missing', 'No canonical link found', {
          suggestion: 'Add <link rel="canonical"> to avoid duplicate-content ambiguity.',
        }),
      ];
    }
    return [pass('seo.canonical.present', 'Canonical link is set', { evidence: truncate(href) })];
  },
};

const socialRule: ShipCheckRule = {
  id: 'seo.social',
  category: 'seo',
  run(ctx) {
    const results: PartialResult[] = [];
    const og = (property: string): string =>
      collapse(ctx.document(`meta[property="og:${property}"]`).attr('content'));

    const missing = (['title', 'description', 'image'] as const).filter((key) => !og(key));
    if (missing.length === 0) {
      results.push(pass('seo.open_graph.present', 'Open Graph tags present'));
    } else {
      results.push(
        info('seo.open_graph.incomplete', 'Open Graph tags are incomplete', {
          evidence: `missing: ${missing.map((key) => `og:${key}`).join(', ')}`,
          suggestion: 'Add og:title, og:description, and og:image for rich link previews.',
        }),
      );
    }

    const twitterCard = collapse(ctx.document('meta[name="twitter:card"]').attr('content'));
    if (!twitterCard) {
      results.push(
        info('seo.twitter_card.missing', 'Twitter Card metadata is missing', {
          suggestion: 'Add <meta name="twitter:card"> for better previews on X/Twitter.',
        }),
      );
    }
    return results;
  },
};

const crawlFilesRule: ShipCheckRule = {
  id: 'seo.crawl_files',
  category: 'seo',
  run(ctx) {
    const results: PartialResult[] = [];
    if (ctx.robotsTxt) {
      results.push(
        ctx.robotsTxt.exists
          ? pass('seo.robots_txt.present', 'robots.txt found')
          : info('seo.robots_txt.missing', 'No robots.txt found', {
              suggestion: 'Add a robots.txt to guide crawlers (even a permissive one is fine).',
            }),
      );
    }
    if (ctx.sitemapXml) {
      results.push(
        ctx.sitemapXml.exists
          ? pass('seo.sitemap.present', 'sitemap.xml found')
          : info('seo.sitemap.missing', 'No sitemap.xml found', {
              suggestion: 'Publish a sitemap.xml so crawlers can discover your pages.',
            }),
      );
    }
    return results;
  },
};

export const seoRules: ShipCheckRule[] = [
  titleRule,
  descriptionRule,
  headingsRule,
  indexabilityRule,
  canonicalRule,
  socialRule,
  crawlFilesRule,
];

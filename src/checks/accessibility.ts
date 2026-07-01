import type { ShipCheckRule } from '../types/rule.js';
import { accessibleName, collapse, info, pass, sample, warn } from './_helpers.js';

const langRule: ShipCheckRule = {
  id: 'a11y.html_lang',
  category: 'accessibility',
  run(ctx) {
    const lang = collapse(ctx.document('html').attr('lang'));
    if (!lang) {
      return [
        warn('a11y.html_lang.missing', 'Missing lang attribute on <html>', {
          description: 'Screen readers use the document language to choose pronunciation rules.',
          suggestion: 'Add a lang attribute, e.g. <html lang="en">.',
        }),
      ];
    }
    return [pass('a11y.html_lang.present', `Document language set (lang="${lang}")`)];
  },
};

const imageAltRule: ShipCheckRule = {
  id: 'a11y.image_alt',
  category: 'accessibility',
  run(ctx) {
    const $ = ctx.document;
    const images = $('img').toArray();
    if (images.length === 0) return [];

    const offenders: string[] = [];
    for (const el of images) {
      const $el = $(el);
      // An explicit empty alt ("") marks a decorative image and is valid.
      const hasAlt = $el.attr('alt') !== undefined;
      const hidden = $el.attr('aria-hidden') === 'true' || $el.attr('role') === 'presentation';
      if (!hasAlt && !hidden) {
        offenders.push(collapse($el.attr('src')) || '(inline image)');
      }
    }

    if (offenders.length === 0) {
      return [pass('a11y.image_alt.ok', 'All images have alt text')];
    }
    return [
      warn('a11y.image_alt.missing', `${offenders.length} image(s) missing alt text`, {
        evidence: sample(offenders),
        suggestion: 'Add descriptive alt text, or alt="" for purely decorative images.',
      }),
    ];
  },
};

const buttonTextRule: ShipCheckRule = {
  id: 'a11y.button_text',
  category: 'accessibility',
  run(ctx) {
    const $ = ctx.document;
    const buttons = $(
      'button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]',
    ).toArray();
    if (buttons.length === 0) return [];

    let missing = 0;
    for (const el of buttons) {
      if (!accessibleName($, $(el))) missing += 1;
    }
    if (missing === 0) {
      return [pass('a11y.button_text.ok', 'All buttons have accessible text')];
    }
    return [
      warn('a11y.button_text.missing', `${missing} button(s) have no accessible text`, {
        suggestion: 'Give each button visible text or an aria-label.',
      }),
    ];
  },
};

const linkTextRule: ShipCheckRule = {
  id: 'a11y.link_text',
  category: 'accessibility',
  run(ctx) {
    const $ = ctx.document;
    const links = $('a[href]').toArray();
    if (links.length === 0) return [];

    let missing = 0;
    for (const el of links) {
      if (!accessibleName($, $(el))) missing += 1;
    }
    if (missing === 0) {
      return [pass('a11y.link_text.ok', 'All links have readable text')];
    }
    return [
      warn('a11y.link_text.missing', `${missing} link(s) have no readable text`, {
        suggestion: 'Ensure links contain text or an aria-label (icon-only links need one).',
      }),
    ];
  },
};

const IGNORED_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image']);

const inputLabelRule: ShipCheckRule = {
  id: 'a11y.input_label',
  category: 'accessibility',
  run(ctx) {
    const $ = ctx.document;
    const controls = $('input, select, textarea').toArray();
    let missing = 0;
    let considered = 0;

    for (const el of controls) {
      const $el = $(el);
      const type = (collapse($el.attr('type')) || 'text').toLowerCase();
      if ($el.is('input') && IGNORED_INPUT_TYPES.has(type)) continue;
      considered += 1;

      const id = collapse($el.attr('id'));
      const labelled =
        (id && $(`label[for="${id}"]`).length > 0) ||
        collapse($el.attr('aria-label')).length > 0 ||
        collapse($el.attr('aria-labelledby')).length > 0 ||
        collapse($el.attr('title')).length > 0 ||
        $el.closest('label').length > 0;

      if (!labelled) missing += 1;
    }

    if (considered === 0) return [];
    if (missing === 0) {
      return [pass('a11y.input_label.ok', 'All form controls have labels')];
    }
    return [
      warn('a11y.input_label.missing', `${missing} form control(s) missing a label`, {
        suggestion: 'Associate a <label for>, wrap the control in a <label>, or add aria-label.',
      }),
    ];
  },
};

const emptyHeadingRule: ShipCheckRule = {
  id: 'a11y.heading_empty',
  category: 'accessibility',
  run(ctx) {
    const $ = ctx.document;
    const headings = $('h1, h2, h3, h4, h5, h6').toArray();
    let empty = 0;
    for (const el of headings) {
      const $el = $(el);
      if (!collapse($el.text()) && !accessibleName($, $el)) empty += 1;
    }
    if (empty === 0) return [];
    return [
      warn('a11y.heading.empty', `${empty} empty heading(s) found`, {
        suggestion: 'Remove empty headings or give them meaningful text.',
      }),
    ];
  },
};

const headingOrderRule: ShipCheckRule = {
  id: 'a11y.heading_order',
  category: 'accessibility',
  run(ctx) {
    const $ = ctx.document;
    const levels = $('h1, h2, h3, h4, h5, h6')
      .toArray()
      .map((el) => {
        const tag = String($(el).prop('tagName') ?? 'h1').toLowerCase();
        return Number(tag.replace('h', '')) || 1;
      });

    const skips: string[] = [];
    let previous = 0;
    for (const level of levels) {
      if (previous !== 0 && level > previous + 1) {
        skips.push(`h${previous} → h${level}`);
      }
      previous = level;
    }
    if (skips.length === 0) return [];
    return [
      info('a11y.heading.order', 'Heading levels skip a level', {
        evidence: sample(skips),
        suggestion: "Don't jump heading levels (e.g. H2 → H4); keep the outline sequential.",
      }),
    ];
  },
};

export const accessibilityRules: ShipCheckRule[] = [
  langRule,
  imageAltRule,
  buttonTextRule,
  linkTextRule,
  inputLabelRule,
  emptyHeadingRule,
  headingOrderRule,
];

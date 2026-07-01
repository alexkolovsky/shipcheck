import type { ResolvedConfig } from '../types/config.js';
import type { ShipCheckRule } from '../types/rule.js';
import { accessibilityRules } from './accessibility.js';
import { analyticsRules } from './analytics.js';
import { ecommerceRules } from './ecommerce.js';
import { performanceRules } from './performance.js';
import { securityRules } from './security.js';
import { seoRules } from './seo.js';

/** Rules that always run, in report order. */
export const coreRules: ShipCheckRule[] = [
  ...seoRules,
  ...accessibilityRules,
  ...performanceRules,
  ...analyticsRules,
  ...securityRules,
];

export {
  seoRules,
  accessibilityRules,
  performanceRules,
  analyticsRules,
  securityRules,
  ecommerceRules,
};

/** Resolve the set of rules to run for a given config (adds e-commerce opt-in). */
export function getRules(config: ResolvedConfig): ShipCheckRule[] {
  return config.ecommerce ? [...coreRules, ...ecommerceRules] : coreRules;
}

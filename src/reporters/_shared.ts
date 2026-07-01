import type { Category } from '../types/issue.js';

/** Fixed display order for categories across all reporters. */
export const CATEGORY_ORDER: Category[] = [
  'seo',
  'accessibility',
  'performance',
  'analytics',
  'security',
  'ecommerce',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  seo: 'SEO',
  accessibility: 'Accessibility',
  performance: 'Performance',
  analytics: 'Analytics',
  security: 'Security',
  ecommerce: 'E-Commerce',
};

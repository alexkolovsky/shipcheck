import type { ResolvedConfig, Thresholds } from '../types/config.js';

/** Default numeric limits. Tuned to flag obvious launch mistakes, not nits. */
export const defaultThresholds: Thresholds = {
  maxImageKb: 500,
  maxJsKb: 500,
  maxCssKb: 250,
  maxScripts: 12,
  maxThirdPartyDomains: 10,
  titleMinLength: 10,
  titleMaxLength: 60,
  descriptionMinLength: 50,
  descriptionMaxLength: 160,
};

/** The baseline configuration used when nothing else is provided. */
export const defaultConfig: ResolvedConfig = {
  thresholds: { ...defaultThresholds },
  ecommerce: false,
  ignore: [],
  severityOverrides: {},
  timeoutMs: 15_000,
  rendered: false,
  renderWaitUntil: 'load',
};

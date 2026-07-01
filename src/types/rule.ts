import type { Category, CheckResult } from './issue.js';
import type { ShipCheckContext } from './context.js';

/**
 * What a rule's `run` returns. The owning rule supplies the `category`, so
 * individual results don't have to repeat it — the runner stitches it back on.
 */
export type PartialResult = Omit<CheckResult, 'category'>;

/**
 * A single, independent check. Rules are intentionally small so contributors can
 * add one without touching anything else: give it a stable `id`, a `category`,
 * and a `run` that inspects the {@link ShipCheckContext} and returns results.
 */
export interface ShipCheckRule {
  id: string;
  category: Category;
  run: (context: ShipCheckContext) => PartialResult[] | Promise<PartialResult[]>;
}

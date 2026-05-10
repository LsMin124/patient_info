/**
 * Single source of truth for force unit conversion in the UI.
 *
 * The backend stores measurements as `kgValue` (kilogram-force), but the UI
 * displays Newtons everywhere — see WEB_REBUILD_PLAN.md §10 (decision 3) and
 * IMPL_SPEC §1.5. Any place that renders force MUST go through `kgfToN` /
 * `formatN`; never multiply inline.
 */

export const KGF_TO_N = 9.80665

/**
 * Convert a raw kilogram-force reading to Newtons.
 *
 * Returns `NaN` for non-finite inputs (NaN propagates) and preserves sign for
 * negative values (sensor noise can briefly show negative readings).
 */
export function kgfToN(kgValue: number): number {
  return kgValue * KGF_TO_N
}

/**
 * Render a Newton value with a fixed number of fractional digits and the unit
 * suffix. Used for chart labels, summary stats, CSV cells, and accessibility
 * descriptions.
 *
 * - Non-finite values render as `'-'` so empty/loading UI never shows `NaN N`.
 * - `digits` is clamped to [0, 6].
 */
export function formatN(value: number, digits = 2): string {
  if (!Number.isFinite(value)) {
    return '-'
  }
  const clampedDigits = Math.min(6, Math.max(0, Math.trunc(digits)))
  return `${value.toFixed(clampedDigits)} N`
}

/**
 * Convenience: convert kgf and format in one step. Equivalent to
 * `formatN(kgfToN(kgValue), digits)` but reads cleaner at call sites.
 */
export function formatKgfAsN(kgValue: number, digits = 2): string {
  return formatN(kgfToN(kgValue), digits)
}

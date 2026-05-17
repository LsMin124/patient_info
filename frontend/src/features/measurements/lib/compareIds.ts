const ID_REGEX = /^\d{1,15}$/

export const MAX_COMPARE_IDS = 4

/**
 * Parse the `?ids=A,B,C` query value into a deduplicated, sorted list of
 * positive integers. The compare page is reachable by direct URL crafting,
 * so untrusted segments are clamped:
 *   - regex /^\d{1,15}$/ per segment
 *   - must be a positive Number.isInteger
 *   - cap to MAX_COMPARE_IDS (post-Phase-4 security review)
 *   - dedupe + sort ascending for stable cache keys
 * Anything that fails validation is dropped silently — the caller renders
 * the appropriate EmptyState when the resulting list is < 2.
 */
export function parseCompareIds(raw: string | null | undefined): number[] {
  if (!raw) return []
  // Bound the segment array up-front so a pathological multi-megabyte ?ids=
  // value can't make the parser walk every comma. The cap is 4× MAX so a
  // user with a few duplicates still surfaces enough unique ids.
  const segments = raw.split(',').slice(0, MAX_COMPARE_IDS * 4)
  const seen = new Set<number>()
  for (const segment of segments) {
    const trimmed = segment.trim()
    if (!ID_REGEX.test(trimmed)) continue
    const n = Number(trimmed)
    if (!Number.isInteger(n) || n <= 0) continue
    seen.add(n)
    if (seen.size >= MAX_COMPARE_IDS) break
  }
  return [...seen].sort((a, b) => a - b)
}

/**
 * Count well-formed id segments without dedupe/cap. Used by SessionCompare
 * to distinguish "too many sessions" from "too few valid ones" — counting
 * raw `.split(',')` length over-reports because mostly-garbage input
 * (e.g. `1,abc,xyz`) inflates the apparent count.
 */
export function countValidIdSegments(raw: string | null | undefined): number {
  if (!raw) return 0
  let count = 0
  for (const segment of raw.split(',').slice(0, MAX_COMPARE_IDS * 4)) {
    const trimmed = segment.trim()
    if (!ID_REGEX.test(trimmed)) continue
    const n = Number(trimmed)
    if (Number.isInteger(n) && n > 0) count += 1
  }
  return count
}

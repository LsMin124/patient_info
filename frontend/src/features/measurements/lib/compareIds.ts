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
  const seen = new Set<number>()
  for (const segment of raw.split(',')) {
    const trimmed = segment.trim()
    if (!ID_REGEX.test(trimmed)) continue
    const n = Number(trimmed)
    if (!Number.isInteger(n) || n <= 0) continue
    seen.add(n)
    if (seen.size >= MAX_COMPARE_IDS) break
  }
  return [...seen].sort((a, b) => a - b)
}

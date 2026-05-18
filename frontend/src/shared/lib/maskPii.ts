/**
 * PII masking helpers. The web typically renders patient names and IDs in
 * the clear, but Settings has a "마스킹" toggle for screenshots, demos,
 * and printed reports that leave the clinic. The masking is single-source
 * here so a future audit can grep for `maskName` / `maskPatientId` and find
 * every callsite.
 *
 * Masking is purely cosmetic — it never alters cached/serialized values.
 */

/**
 * Mask a Korean patient name: keep first character, replace the rest with
 * the middle-dot character. '홍길동' → '홍··'. ASCII names: keep first
 * and last, mask the middle. 'John Doe' → 'J······e'.
 *
 * Defenses:
 *   - `normalize('NFC')` so combining-mark sequences collapse to a single
 *     visible grapheme before we count characters.
 *   - Strip Unicode formatting/control characters (zero-width joiner, RTL
 *     marks, BOM) so a "visible first char" can never resolve to an
 *     invisible glyph that looks fully masked while actually leaking the
 *     real first letter on copy/paste.
 *   - Use `Array.from(str)` for length/indexing so supplementary-plane
 *     characters (UTF-16 surrogate pairs) count as one glyph each.
 */

// Strip these invisible characters before counting/indexing:
//   U+200B–U+200F  ZWSP, ZWNJ, ZWJ, LRM, RLM
//   U+202A–U+202E  bidi embedding/override controls
//   U+2060–U+2064  word joiner and inhibitors
//   U+FEFF         BOM
// Constructed from a string so the source carries no literal invisible
// characters (ESLint's `no-irregular-whitespace` would flag the literals).
const ZERO_WIDTH_RE = new RegExp('[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]', 'g')

export function maskName(name: string): string {
  const cleaned = name.normalize('NFC').replace(ZERO_WIDTH_RE, '').trim()
  const chars = Array.from(cleaned)
  if (chars.length <= 1) return chars.join('')
  // True when every code unit is in the basic ASCII printable + space range.
  // Avoids the no-control-regex lint by skipping \x00–\x1F entirely; PII names
  // would not contain control chars in practice.
  const isAscii = /^[\x20-\x7E]+$/.test(cleaned)
  if (isAscii) {
    if (chars.length === 2) return `${chars[0]}·`
    return `${chars[0]}${'·'.repeat(chars.length - 2)}${chars[chars.length - 1]}`
  }
  // Korean / non-ASCII: keep first char only.
  return `${chars[0]}${'·'.repeat(chars.length - 1)}`
}

/**
 * Mask a patientId: keep the first character, the rest become dashes.
 * 'p001' → 'p---'. The first char usually indicates ID class (p/g/…)
 * which is unlikely to be sensitive but enough context for operators
 * to recognize a row at a glance.
 */
export function maskPatientId(patientId: string): string {
  if (patientId.length <= 1) return patientId
  return `${patientId[0]}${'-'.repeat(patientId.length - 1)}`
}

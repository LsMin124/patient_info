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
 * and last, mask the middle. 'John Doe' → 'J····e'.
 */
export function maskName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length <= 1) return trimmed
  // True when every code unit is in the basic ASCII printable + space range.
  // Avoids the no-control-regex lint by skipping \x00–\x1F entirely; PII names
  // would not contain control chars in practice.
  const isAscii = /^[\x20-\x7E]+$/.test(trimmed)
  if (isAscii) {
    if (trimmed.length === 2) return `${trimmed[0]}·`
    return `${trimmed[0]}${'·'.repeat(trimmed.length - 2)}${trimmed.at(-1)}`
  }
  // Korean / non-ASCII: keep first char only.
  return `${trimmed[0]}${'·'.repeat(trimmed.length - 1)}`
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

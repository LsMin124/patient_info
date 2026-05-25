/**
 * Working assumption (until the device contract grows an explicit motion
 * field): a patient's measurements arrive in pairs — flexion first, then
 * extension. Index by chronological order within the patient's session
 * list; the helper just maps even→flexion, odd→extension.
 *
 * This is a label-only convenience. The structural fix (device firmware
 * sends `motion: 'flexion' | 'extension'` per measurement, schema gains
 * an enum column, backend exposes it) is tracked as future work in
 * IMPL_SPEC §8.14.
 */
export type PairMotion = 'flexion' | 'extension'

export function pairMotionForIndex(zeroBasedIndex: number): PairMotion {
  return zeroBasedIndex % 2 === 0 ? 'flexion' : 'extension'
}

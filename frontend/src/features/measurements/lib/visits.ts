import type { MeasurementSummary } from '../schema'

/**
 * A clinical "visit" — flexion measurement immediately followed by an
 * extension measurement. See IMPL_SPEC §8.14: this is the working
 * assumption (consecutive measurements in chronological order form
 * flex+ext pairs) until the device contract grows an explicit motion
 * field. A trailing odd measurement is a partial visit (flexion only).
 */
export interface Visit {
  /** 1-based index in the patient's visit history (oldest = 1). */
  visitNumber: number
  flexion: MeasurementSummary
  /** Missing when the patient only has the flexion side recorded. */
  extension: MeasurementSummary | null
  /** Convenience accessor — startTime of the flexion (the visit start). */
  startTime: string
}

/**
 * Group a patient's sessions into visits. Input order is not assumed —
 * sessions are sorted ascending by startTime internally.
 */
export function groupIntoVisits(sessions: ReadonlyArray<MeasurementSummary>): Visit[] {
  const sorted = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime))
  const visits: Visit[] = []
  for (let i = 0; i < sorted.length; i += 2) {
    const flexion = sorted[i]!
    const extension = sorted[i + 1] ?? null
    visits.push({
      visitNumber: i / 2 + 1,
      flexion,
      extension,
      startTime: flexion.startTime,
    })
  }
  return visits
}

/**
 * Given a flat list of measurementIds (typically from the compare URL's
 * `?ids=` segments), figure out whether they form exactly two complete
 * visits (4 ids, 2 visits of 2 mids each) AND which mids belong to which
 * visit. Returns null when the ids cannot be paired this way — caller
 * should fall back to multi-overlay or figure-mode for 2 ids.
 *
 * The expected URL shape is `?ids=oldFlex,oldExt,newFlex,newExt` but
 * we don't trust the order — we resolve each id to a Visit via the
 * patient's session list and then sort visits by visitNumber.
 */
export interface VisitPair {
  baselineVisit: Visit
  followupVisit: Visit
}

export function pickVisitPairFromIds(
  ids: ReadonlyArray<number>,
  sessions: ReadonlyArray<MeasurementSummary>,
): VisitPair | null {
  if (ids.length !== 4) return null
  const visits = groupIntoVisits(sessions)
  const involved = new Map<number, Visit>()
  for (const id of ids) {
    const v = visits.find(
      (vv) => vv.flexion.measurementId === id || vv.extension?.measurementId === id,
    )
    if (!v) return null
    involved.set(v.visitNumber, v)
  }
  if (involved.size !== 2) return null
  // Every involved visit must contribute exactly two ids (flex + ext both present).
  for (const v of involved.values()) {
    if (!v.extension) return null
    const wanted = [v.flexion.measurementId, v.extension.measurementId]
    if (!wanted.every((id) => ids.includes(id))) return null
  }
  const sortedVisits = [...involved.values()].sort((a, b) => a.visitNumber - b.visitNumber)
  return { baselineVisit: sortedVisits[0]!, followupVisit: sortedVisits[1]! }
}

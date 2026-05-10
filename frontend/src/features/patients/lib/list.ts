import type { Patient } from '../schema'

export type SortKey = 'name' | 'registered'

export interface PaginationResult {
  page: number
  pageSize: number
  totalPages: number
  totalCount: number
  rows: Patient[]
}

/**
 * Case-insensitive substring match against patientId or name. Whitespace-only
 * queries (incl. empty) match all rows.
 */
export function filterPatients(rows: ReadonlyArray<Patient>, query: string): Patient[] {
  const q = query.trim().toLowerCase()
  if (q === '') return [...rows]
  return rows.filter(
    (p) => p.patientId.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
  )
}

/**
 * Stable sort. 'registered' is approximated by the entity PK (id) since the
 * frozen wire shape doesn't expose a registration timestamp; for the
 * intended use (admins glancing at "newest first") that's a faithful proxy.
 */
export function sortPatients(rows: ReadonlyArray<Patient>, key: SortKey): Patient[] {
  const copy = [...rows]
  if (key === 'name') {
    copy.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  } else {
    copy.sort((a, b) => b.id - a.id)
  }
  return copy
}

/**
 * Clamps `page` to [1, totalPages]. Returns 1-based page index in the
 * result so the UI can render "1 / N" without further conversion.
 */
export function paginate(
  rows: ReadonlyArray<Patient>,
  page: number,
  pageSize: number,
): PaginationResult {
  const totalCount = rows.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const clamped = Math.min(Math.max(1, page), totalPages)
  const start = (clamped - 1) * pageSize
  return {
    page: clamped,
    pageSize,
    totalPages,
    totalCount,
    rows: rows.slice(start, start + pageSize),
  }
}

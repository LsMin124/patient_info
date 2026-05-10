import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useDebounce } from '../../shared/hooks/useDebounce'
import { useT } from '../../shared/hooks/useT'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorFallback } from '../../shared/ui/ErrorFallback'
import { Input } from '../../shared/ui/Input'
import { Skeleton } from '../../shared/ui/Loading'
import { Modal } from '../../shared/ui/Modal'
import { Select } from '../../shared/ui/Select'

import { PatientRegisterForm } from './PatientRegisterForm'
import { filterPatients, paginate, sortPatients, type SortKey } from './lib/list'
import { usePatientsQuery } from './usePatients'

import './patient-list.css'

const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 200

/**
 * Patients screen: search + sort + paginated table + register modal trigger.
 * The list query lives in TanStack Query (cached + invalidated on register
 * success). All filter/sort/page transforms are pure functions in
 * `./lib/list.ts` so they're independently unit-tested.
 */
export function PatientList() {
  const { t } = useT()
  const query = usePatientsQuery()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS)
  const [sortKey, setSortKey] = useState<SortKey>('registered')
  const [page, setPage] = useState(1)
  const [registerOpen, setRegisterOpen] = useState(false)

  const view = useMemo(() => {
    const rows = query.data ?? []
    const filtered = filterPatients(rows, debouncedSearch)
    const sorted = sortPatients(filtered, sortKey)
    return paginate(sorted, page, PAGE_SIZE)
  }, [query.data, debouncedSearch, sortKey, page])

  return (
    <section className="patient-list">
      <header className="patient-list__header">
        <h1>{t('patient.list.title')}</h1>
        <div className="patient-list__controls">
          <Input
            label={t('patient.list.search')}
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="p001 / 이름"
          />
          <Select
            label={t('patient.register.title').replace(' 등록', '')}
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value as SortKey)
              setPage(1)
            }}
          >
            <option value="registered">최신 등록순</option>
            <option value="name">이름순</option>
          </Select>
          <div className="patient-list__action">
            <Button onClick={() => setRegisterOpen(true)} aria-haspopup="dialog">
              {t('patient.list.register')}
            </Button>
          </div>
        </div>
      </header>

      <PatientListBody
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        view={view}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(view.totalPages, p + 1))}
      />

      <Modal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title={t('patient.register.title')}
      >
        <PatientRegisterForm onDone={() => setRegisterOpen(false)} />
      </Modal>
    </section>
  )
}

interface BodyProps {
  isLoading: boolean
  isError: boolean
  error: unknown
  onRetry: () => void
  view: ReturnType<typeof paginate>
  onPrev: () => void
  onNext: () => void
}

function PatientListBody({ isLoading, isError, error, onRetry, view, onPrev, onNext }: BodyProps) {
  const { t } = useT()
  if (isLoading) {
    return (
      <div className="patient-list__skeletons" aria-hidden="false">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height="2.5rem" />
        ))}
      </div>
    )
  }
  if (isError) {
    return <ErrorFallback error={error} onReset={onRetry} title={t('common.error')} />
  }
  if (view.totalCount === 0) {
    return (
      <EmptyState
        title={t('patient.list.empty')}
        description="신규 환자 등록 버튼으로 추가하세요."
      />
    )
  }
  return (
    <>
      <table className="patient-list__table" aria-label={t('patient.list.title')}>
        <thead>
          <tr>
            <th scope="col">{t('patient.register.patientId')}</th>
            <th scope="col">{t('patient.register.name')}</th>
            <th scope="col">{t('patient.register.age')}</th>
            <th scope="col">{t('patient.register.sex')}</th>
          </tr>
        </thead>
        <tbody>
          {view.rows.map((p) => (
            <tr key={p.id} className="patient-list__row">
              <td>
                <Link to={`/patients/${p.patientId}`} className="patient-list__link">
                  {p.patientId}
                </Link>
              </td>
              <td>{p.name}</td>
              <td>{p.age}</td>
              <td>{p.sex}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <nav className="patient-list__pager" aria-label="pagination">
        <Button variant="secondary" onClick={onPrev} disabled={view.page === 1}>
          이전
        </Button>
        <span aria-live="polite">
          {view.page} / {view.totalPages} ({view.totalCount}명)
        </span>
        <Button variant="secondary" onClick={onNext} disabled={view.page === view.totalPages}>
          다음
        </Button>
      </nav>
    </>
  )
}

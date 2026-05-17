import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useT } from '../../shared/hooks/useT'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorFallback } from '../../shared/ui/ErrorFallback'
import { Skeleton } from '../../shared/ui/Loading'
import { usePatientsQuery } from '../patients/usePatients'

import { ForceChart } from './ForceChart'
import { SummaryStats } from './SummaryStats'
import { downloadSessionCsv } from './lib/exportCsv'
import { useDataPointsQuery, useSessionsQuery } from './useMeasurements'

import './session-detail.css'

/**
 * Detail page for one measurement session. Composes:
 *   - Patient context (name, patientId) — reused from the patients cache
 *   - Session header (memo + start/end time + in-progress label)
 *   - ForceChart (kgf→N at render time)
 *   - SummaryStats (peak/mean/RFD/impulse)
 *   - CSV download button (raw + Newton columns)
 *
 * URL: /patients/:patientId/sessions/:measurementId.
 * Both segments are URL-derived; the patientId is validated by the parent
 * PatientDetail path guard. measurementId is parsed to a number and
 * non-finite values render the not-found EmptyState rather than triggering
 * a useQuery with garbage input.
 */
export function SessionDetail() {
  const { t } = useT()
  const params = useParams<{ patientId: string; measurementId: string }>()
  const patientId =
    params.patientId && /^[A-Za-z0-9_-]{1,32}$/.test(params.patientId) ? params.patientId : null
  const measurementId = parseMeasurementId(params.measurementId)

  const patientsQuery = usePatientsQuery()
  const sessionsQuery = useSessionsQuery(patientId ?? undefined)
  const dataQuery = useDataPointsQuery(measurementId ?? undefined)

  if (!patientId || measurementId === null) {
    return (
      <SessionShell>
        <NotFound t={t} patientId={patientId} />
      </SessionShell>
    )
  }

  if (patientsQuery.isLoading || sessionsQuery.isLoading || dataQuery.isLoading) {
    return (
      <SessionShell>
        <Skeleton height="2rem" width="40%" />
        <Skeleton height="20rem" />
        <Skeleton height="6rem" />
      </SessionShell>
    )
  }

  if (patientsQuery.isError || sessionsQuery.isError || dataQuery.isError) {
    const err = patientsQuery.error ?? sessionsQuery.error ?? dataQuery.error
    return (
      <SessionShell>
        <ErrorFallback
          error={err}
          onReset={() => {
            patientsQuery.refetch()
            sessionsQuery.refetch()
            dataQuery.refetch()
          }}
          title={t('common.error')}
        />
      </SessionShell>
    )
  }

  const patient = (patientsQuery.data ?? []).find((p) => p.patientId === patientId)
  const session = (sessionsQuery.data ?? []).find((s) => s.measurementId === measurementId)
  if (!patient || !session) {
    return (
      <SessionShell>
        <NotFound t={t} patientId={patientId} />
      </SessionShell>
    )
  }
  const points = dataQuery.data ?? []
  const inProgress = session.endTime === null

  return (
    <SessionShell>
      <header className="session-detail__header">
        <div>
          <h1>
            {patient.name} <span className="session-detail__patient-id">({patient.patientId})</span>
          </h1>
          <p className="session-detail__meta">
            {session.memo ?? '메모 없음'} · {session.startTime}
            {inProgress && (
              <span className="session-detail__badge">{t('session.list.inProgress')}</span>
            )}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => downloadSessionCsv(session.measurementId, session.startTime, points)}
          disabled={points.length === 0}
        >
          {t('session.export.csv')}
        </Button>
      </header>

      {points.length === 0 ? (
        <EmptyState
          title="데이터가 없습니다"
          description={
            inProgress
              ? '측정 진행 중입니다. 데이터가 추가되는 중입니다.'
              : '이 세션은 저장된 데이터 포인트가 없습니다.'
          }
        />
      ) : (
        <>
          <ForceChart points={points} />
          <SummaryStats points={points} />
        </>
      )}
    </SessionShell>
  )
}

function SessionShell({ children }: { children: ReactNode }) {
  return <section className="session-detail">{children}</section>
}

function NotFound({ t, patientId }: { t: ReturnType<typeof useT>['t']; patientId: string | null }) {
  return (
    <EmptyState
      title="세션을 찾을 수 없습니다"
      description="요청한 세션 ID가 잘못되었거나, 이 환자의 세션이 아닙니다."
      action={
        <Link to={patientId ? `/patients/${patientId}` : '/patients'}>
          <Button variant="secondary">{t('patient.list.title')}</Button>
        </Link>
      }
    />
  )
}

function parseMeasurementId(raw: string | undefined): number | null {
  if (!raw || !/^\d{1,15}$/.test(raw)) return null
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

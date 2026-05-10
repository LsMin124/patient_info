import { Link, useParams } from 'react-router-dom'

import { useT } from '../../shared/hooks/useT'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorFallback } from '../../shared/ui/ErrorFallback'
import { Skeleton } from '../../shared/ui/Loading'

import { usePatientsQuery } from './usePatients'

import './patient-detail.css'

/**
 * Detail screen for a single patient. We reuse the list query so the cache
 * is shared (no extra GET /patients/:id endpoint exists in the frozen
 * contract — the device/app only exposes the bulk list). Reading from cache
 * also means navigating from PatientList → detail is instant.
 *
 * The session timeline below the patient card is intentionally empty in
 * Phase 3; T25 (Phase 4) plugs in <SessionList patientId={...} />.
 */
export function PatientDetail() {
  const { t } = useT()
  const { patientId } = useParams<{ patientId: string }>()
  const query = usePatientsQuery()

  if (query.isLoading) {
    return (
      <section className="patient-detail" aria-busy="true">
        <Skeleton height="2.5rem" width="40%" />
        <Skeleton height="6rem" />
      </section>
    )
  }

  if (query.isError) {
    return (
      <section className="patient-detail">
        <ErrorFallback
          error={query.error}
          onReset={() => query.refetch()}
          title={t('common.error')}
        />
      </section>
    )
  }

  const patient = (query.data ?? []).find((p) => p.patientId === patientId)
  if (!patient) {
    return (
      <section className="patient-detail">
        <EmptyState
          title="환자를 찾을 수 없습니다"
          description={`'${patientId ?? ''}' 에 해당하는 환자가 없습니다.`}
          action={
            <Link to="/patients">
              <Button variant="secondary">{t('patient.list.title')}</Button>
            </Link>
          }
        />
      </section>
    )
  }

  return (
    <section className="patient-detail">
      <header className="patient-detail__header">
        <h1>{patient.name}</h1>
        <span className="patient-detail__id">{patient.patientId}</span>
      </header>

      <dl className="patient-detail__card">
        <Field label={t('patient.register.age')} value={`${patient.age}`} />
        <Field label={t('patient.register.sex')} value={patient.sex} />
        <Field label={t('patient.register.height')} value={`${patient.height} cm`} />
        <Field label={t('patient.register.weight')} value={`${patient.weight} kg`} />
      </dl>

      <section aria-labelledby="sessions-heading">
        <h2 id="sessions-heading" className="patient-detail__section-title">
          {t('session.list.title')}
        </h2>
        <EmptyState
          title={t('session.list.empty')}
          description="Phase 4에서 세션 타임라인이 추가됩니다."
        />
      </section>
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="patient-detail__field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

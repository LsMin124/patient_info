import { Link, useParams } from 'react-router-dom'

import { usePiiMask } from '../../shared/hooks/PiiMaskProvider'
import { useT } from '../../shared/hooks/useT'
import { maskName, maskPatientId } from '../../shared/lib/maskPii'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorFallback } from '../../shared/ui/ErrorFallback'
import { Skeleton } from '../../shared/ui/Loading'
import { SessionList } from '../measurements/SessionList'

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
  const { enabled: maskEnabled } = usePiiMask()

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

  // Clamp the URL segment to the patientId shape (1–32 chars of
  // [A-Za-z0-9_-]) before reflecting it in the UI so a crafted link
  // cannot stuff arbitrary glyphs or overlong strings into EmptyState.
  const safePatientId = patientId && /^[A-Za-z0-9_-]{1,32}$/.test(patientId) ? patientId : null
  const patient = safePatientId
    ? (query.data ?? []).find((p) => p.patientId === safePatientId)
    : undefined

  if (!patient) {
    return (
      <section className="patient-detail">
        <EmptyState
          title={t('patient.list.notFound')}
          description={
            safePatientId
              ? `'${safePatientId}' ${t('patient.list.notFoundHint')}`
              : t('patient.list.invalidId')
          }
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
        <h1>{maskEnabled ? maskName(patient.name) : patient.name}</h1>
        <span className="patient-detail__id">
          {maskEnabled ? maskPatientId(patient.patientId) : patient.patientId}
        </span>
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
        <SessionList patientId={patient.patientId} />
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

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ZodError } from 'zod'

import { useT } from '../../shared/hooks/useT'
import { ApiError } from '../../shared/lib/http'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import { useToast } from '../../shared/ui/Toast'

import { CreatePatientSchema, type CreatePatientInput } from './schema'
import { useCreatePatientMutation } from './usePatients'

import './patient-register-form.css'

interface PatientRegisterFormProps {
  onDone: () => void
}

type FieldErrors = Partial<Record<keyof CreatePatientInput, string>>

interface FormState {
  patientId: string
  name: string
  age: string
  sex: string
  height: string
  weight: string
}

const initialState: FormState = {
  patientId: '',
  name: '',
  age: '',
  sex: 'male',
  height: '',
  weight: '',
}

/**
 * Modal-friendly registration form. Form values are kept as strings (HTML
 * input idiom), then coerced and zod-validated on submit. Field-level
 * errors are published via aria-describedby on each Input/Select so screen
 * readers announce them as the user navigates between fields.
 *
 * Submission lifecycle:
 *   1. parse with CreatePatientSchema → FieldErrors on failure
 *   2. mutate via useCreatePatientMutation (which invalidates the list)
 *   3. on success: toast + onDone() (modal close)
 *   4. on backend error: toast with the sanitized ApiError.message
 *      (raw server detail stays on cause, never user-visible)
 */
export function PatientRegisterForm({ onDone }: PatientRegisterFormProps) {
  const { t } = useT()
  const { addToast } = useToast()
  const mutation = useCreatePatientMutation()
  const [state, setState] = useState<FormState>(initialState)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [generalErrors, setGeneralErrors] = useState<string[]>([])

  function update<K extends keyof FormState>(key: K) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setState((prev) => ({ ...prev, [key]: e.target.value }))
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (mutation.isPending) return

    const candidate = {
      patientId: state.patientId.trim(),
      name: state.name.trim(),
      age: state.age === '' ? Number.NaN : Number(state.age),
      sex: state.sex,
      height: state.height === '' ? Number.NaN : Number(state.height),
      weight: state.weight === '' ? Number.NaN : Number(state.weight),
    }

    const parsed = CreatePatientSchema.safeParse(candidate)
    if (!parsed.success) {
      const { fieldErrors, generalErrors: ge } = zodIssuesToFieldErrors(parsed.error)
      setErrors(fieldErrors)
      setGeneralErrors(ge)
      return
    }
    setErrors({})
    setGeneralErrors([])

    mutation.mutate(parsed.data, {
      onSuccess: () => {
        addToast({ message: t('patient.register.success'), variant: 'success' })
        setState(initialState)
        onDone()
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : t('common.error')
        addToast({ message, variant: 'danger' })
      },
    })
  }

  return (
    <form className="patient-register-form" onSubmit={handleSubmit} noValidate>
      {generalErrors.length > 0 && (
        <div role="alert" className="patient-register-form__banner">
          {generalErrors.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>
      )}
      <Input
        label={t('patient.register.patientId')}
        value={state.patientId}
        onChange={update('patientId')}
        autoComplete="off"
        autoFocus
        required
        {...(errors.patientId ? { error: errors.patientId } : {})}
        hint="문자/숫자/-/_ 만, 1–32자"
      />
      <Input
        label={t('patient.register.name')}
        value={state.name}
        onChange={update('name')}
        // 'off' (not 'name') so the browser does not suggest the operator's
        // own name or remember previously-entered patient names across
        // sessions on shared clinical workstations — both can silently
        // mis-enter someone else's medical data.
        autoComplete="off"
        required
        {...(errors.name ? { error: errors.name } : {})}
      />
      <div className="patient-register-form__row">
        <Input
          label={t('patient.register.age')}
          type="number"
          inputMode="numeric"
          autoComplete="off"
          min={0}
          max={150}
          value={state.age}
          onChange={update('age')}
          required
          {...(errors.age ? { error: errors.age } : {})}
        />
        <Select
          label={t('patient.register.sex')}
          value={state.sex}
          onChange={update('sex')}
          {...(errors.sex ? { error: errors.sex } : {})}
        >
          <option value="male">{t('patient.register.sexMale')}</option>
          <option value="female">{t('patient.register.sexFemale')}</option>
          <option value="other">{t('patient.register.sexOther')}</option>
        </Select>
      </div>
      <div className="patient-register-form__row">
        <Input
          label={t('patient.register.height')}
          type="number"
          inputMode="decimal"
          autoComplete="off"
          step={0.1}
          value={state.height}
          onChange={update('height')}
          required
          {...(errors.height ? { error: errors.height } : {})}
        />
        <Input
          label={t('patient.register.weight')}
          type="number"
          inputMode="decimal"
          autoComplete="off"
          step={0.1}
          value={state.weight}
          onChange={update('weight')}
          required
          {...(errors.weight ? { error: errors.weight } : {})}
        />
      </div>
      <div className="patient-register-form__actions">
        <Button variant="secondary" type="button" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" isLoading={mutation.isPending}>
          {t('patient.register.submit')}
        </Button>
      </div>
    </form>
  )
}

interface ParsedZodIssues {
  fieldErrors: FieldErrors
  /** Errors with no recognized field path (cross-field refines etc.). */
  generalErrors: string[]
}

function zodIssuesToFieldErrors(error: ZodError): ParsedZodIssues {
  const fieldErrors: FieldErrors = {}
  const generalErrors: string[] = []
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && key in initialState) {
      fieldErrors[key as keyof CreatePatientInput] = issue.message
    } else {
      // Empty path / cross-field refine / unknown path — surface as a
      // general banner instead of silently dropping the validation
      // failure on the floor.
      generalErrors.push(issue.message)
    }
  }
  return { fieldErrors, generalErrors }
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createPatient, listPatients } from './api'
import type { CreatePatientInput, Patient } from './schema'

/**
 * Query key namespace for all patient-list reads. Centralized so a single
 * `queryClient.invalidateQueries({ queryKey: PATIENTS_KEY })` after a
 * mutation refreshes every consumer (Dashboard recents, PatientList,
 * PatientDetail by id, etc.).
 */
export const PATIENTS_KEY = ['patients'] as const

export function usePatientsQuery() {
  return useQuery<Patient[], Error>({
    queryKey: PATIENTS_KEY,
    queryFn: ({ signal }) => listPatients(signal),
  })
}

export function useCreatePatientMutation() {
  const queryClient = useQueryClient()
  return useMutation<Patient, Error, CreatePatientInput>({
    mutationFn: (input) => createPatient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PATIENTS_KEY })
    },
  })
}

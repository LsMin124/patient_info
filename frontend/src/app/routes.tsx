import { Route, Routes } from 'react-router-dom'

import { AppShell } from '../shared/ui/Layout/AppShell'

import {
  DashboardPage,
  NotFoundPage,
  PatientDetailPage,
  PatientsPage,
  SessionComparePage,
  SessionDetailPage,
  SettingsPage,
} from './pages'

/**
 * Top-level route table. All real pages render inside AppShell so the layout
 * (skip-link, header, nav, main landmark) is consistent. The wildcard NotFound
 * route also runs inside the shell so navigation back to other pages stays
 * one click away.
 */
export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/:patientId" element={<PatientDetailPage />} />
        <Route
          path="/patients/:patientId/sessions/:measurementId"
          element={<SessionDetailPage />}
        />
        <Route path="/sessions/compare" element={<SessionComparePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  )
}

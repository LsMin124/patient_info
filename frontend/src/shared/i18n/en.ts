import type { Translations } from './types'

export const en: Translations = {
  app: {
    title: 'Strength Measurement Dashboard',
    skipToContent: 'Skip to content',
  },
  nav: {
    dashboard: 'Dashboard',
    patients: 'Patients',
    settings: 'Settings',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    retry: 'Retry',
    loading: 'Loading...',
    error: 'Error',
  },
  patient: {
    list: {
      title: 'Patients',
      empty: 'No patients registered yet.',
      search: 'Search by name or ID',
      register: 'Register patient',
    },
    register: {
      title: 'Register patient',
      patientId: 'Patient ID',
      name: 'Name',
      age: 'Age',
      sex: 'Sex',
      height: 'Height (cm)',
      weight: 'Weight (kg)',
      sexMale: 'Male',
      sexFemale: 'Female',
      sexOther: 'Other',
      submit: 'Register',
      success: 'Patient registered.',
    },
  },
  session: {
    list: {
      title: 'Sessions',
      empty: 'No measurement sessions yet.',
      inProgress: 'Measurement in progress',
    },
    chart: {
      forceLabel: 'Force (N)',
      timeLabel: 'Time (s)',
    },
    stats: {
      peak: 'Peak',
      mean: 'Mean',
      timeToPeak: 'Time to peak',
      rfd0_100: 'RFD 0–100 ms',
      rfd100_200: 'RFD 100–200 ms',
      impulse: 'Impulse',
    },
    export: {
      csv: 'Download CSV',
    },
  },
  notFound: {
    title: 'Page not found',
    description: 'The requested path does not exist.',
    home: 'Go home',
  },
}

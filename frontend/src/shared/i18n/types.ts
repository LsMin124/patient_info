/**
 * Translation dictionary structure. Both ko.ts and en.ts implement this
 * interface so the schema is enforced at compile time.
 */
export interface Translations {
  app: {
    title: string
    skipToContent: string
  }
  nav: {
    dashboard: string
    patients: string
    settings: string
  }
  common: {
    save: string
    cancel: string
    confirm: string
    close: string
    retry: string
    loading: string
    error: string
    notifications: string
  }
  patient: {
    list: {
      title: string
      empty: string
      search: string
      register: string
    }
    register: {
      title: string
      patientId: string
      name: string
      age: string
      sex: string
      height: string
      weight: string
      sexMale: string
      sexFemale: string
      sexOther: string
      submit: string
      success: string
    }
  }
  session: {
    list: {
      title: string
      empty: string
      inProgress: string
    }
    chart: {
      forceLabel: string
      timeLabel: string
    }
    stats: {
      peak: string
      mean: string
      timeToPeak: string
      rfd0_100: string
      rfd100_200: string
      impulse: string
    }
    export: {
      csv: string
    }
  }
  notFound: {
    title: string
    description: string
    home: string
  }
}

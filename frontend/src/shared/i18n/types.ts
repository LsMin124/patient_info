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
      emptyHint: string
      search: string
      searchPlaceholder: string
      register: string
      sort: string
      sortRegistered: string
      sortName: string
      prev: string
      next: string
      pagerStatus: string
      notFound: string
      notFoundHint: string
      invalidId: string
    }
    register: {
      title: string
      patientId: string
      patientIdHint: string
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
      emptyHint: string
      inProgress: string
      noMemo: string
      compareSelected: string
      compareSelectAria: string
      visitLabel: string
      visitNeedExactlyTwoHint: string
      partialVisit: string
    }
    detail: {
      notFound: string
      notFoundHint: string
      noData: string
      noDataHint: string
      inProgressHint: string
    }
    compare: {
      title: string
      tooFew: string
      tooFewHint: string
      tooMany: string
      tooManyHint: string
      legend: string
      table: {
        session: string
        memo: string
        peak: string
        impulse: string
      }
    }
    figure: {
      title: string
      baseline: string
      followup: string
      peak: string
      deltaPeak: string
      improvement: string
      regression: string
      unchanged: string
      visitTitle: string
      flexionSection: string
      extensionSection: string
    }
    pair: {
      flexion: string
      extension: string
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
  settings: {
    title: string
    theme: string
    themeLight: string
    themeDark: string
    locale: string
    localeKo: string
    localeEn: string
    piiMask: string
    piiMaskHint: string
    piiMaskOn: string
    piiMaskOff: string
  }
}

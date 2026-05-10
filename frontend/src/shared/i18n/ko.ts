import type { Translations } from './types'

export const ko: Translations = {
  app: {
    title: '근기능 측정 대시보드',
    skipToContent: '본문으로 건너뛰기',
  },
  nav: {
    dashboard: '대시보드',
    patients: '환자',
    settings: '설정',
  },
  common: {
    save: '저장',
    cancel: '취소',
    confirm: '확인',
    close: '닫기',
    retry: '다시 시도',
    loading: '로딩 중...',
    error: '오류',
  },
  patient: {
    list: {
      title: '환자 목록',
      empty: '등록된 환자가 없습니다.',
      search: '이름 또는 ID로 검색',
      register: '신규 환자 등록',
    },
    register: {
      title: '신규 환자 등록',
      patientId: '환자 ID',
      name: '이름',
      age: '나이',
      sex: '성별',
      height: '키 (cm)',
      weight: '체중 (kg)',
      sexMale: '남성',
      sexFemale: '여성',
      sexOther: '기타',
      submit: '등록',
      success: '환자가 등록되었습니다.',
    },
  },
  session: {
    list: {
      title: '측정 세션',
      empty: '측정 기록이 없습니다.',
      inProgress: '측정 진행 중',
    },
    chart: {
      forceLabel: '힘 (N)',
      timeLabel: '시간 (s)',
    },
    stats: {
      peak: '피크',
      mean: '평균',
      timeToPeak: '피크 도달 시간',
      rfd0_100: 'RFD 0–100ms',
      rfd100_200: 'RFD 100–200ms',
      impulse: '면적 (Impulse)',
    },
    export: {
      csv: 'CSV 내려받기',
    },
  },
  notFound: {
    title: '페이지를 찾을 수 없습니다',
    description: '요청하신 경로는 존재하지 않습니다.',
    home: '홈으로',
  },
}

export type { Translations }

# 구현 명세서 (IMPL_SPEC.md)

> 짝 문서: `WEB_REBUILD_PLAN.md` (결정·아키텍처).
> 본 문서는 그 결정을 **서브에이전트가 1태스크 1실행 가능 단위**로 처리하도록 쪼갠 작업 명세이다.
> 작성일: 2026-05-09

---

## 0. 사용 방법

각 태스크는 **self-contained**이며 다음 정보를 포함한다.

- **메타** (Phase / 의존성 / 추천 에이전트 / 예상 소요)
- **목표** — 1문장
- **읽을 컨텍스트** — 태스크 시작 전 반드시 읽을 파일/섹션
- **산출물** — 생성·수정될 파일의 절대 경로
- **수락 기준** — 체크박스로 검증 가능한 완료 조건
- **제약/주의** — 깨면 안 되는 규칙

서브에이전트에게 태스크를 위임할 때는 다음을 함께 첨부한다.

1. 본 문서의 §0, §1, §2
2. 해당 태스크 단일 항목 전체
3. 의존 태스크의 산출물 목록 (이미 머지된 상태로 제공)

---

## 1. 전역 컨텍스트 (모든 태스크 필독)

### 1.1 동결 계약 — 절대 깨지 말 것

`WEB_REBUILD_PLAN.md §3` 표를 그대로 준수한다. 핵심 규칙 재기술:

- 응답 키 `measurement_Id` (대문자 `I`) 보존.
- 데이터 적재 페이로드는 snake_case (`time_offset_ms`, `kg_value`).
- 조회 응답은 camelCase (`timeOffsetMs`, `kgValue`).
- `GET /api/v1/patients`는 엔티티 형태(`id` PK 포함)로 직렬화.
- 모든 엔드포인트는 `/api/v1` prefix.
- 인증/인가 헤더 추가 금지 (디바이스/앱 무인증 의존).

### 1.2 레포 구조 (목표)

```
patient_info/
├─ build.gradle                       # 수정: frontend 빌드 통합
├─ src/main/java/com/project/urp/...   # 수정: 비파괴 보강만 (Phase 7)
├─ src/main/resources/
│   ├─ application.yml                 # 신규 (Phase 7)
│   └─ static/                         # frontend dist/ 산출물 (Gradle copy, .gitignore)
├─ src/test/java/com/project/urp/...   # 신규: 계약 테스트 (Phase 1)
└─ frontend/
    ├─ package.json
    ├─ vite.config.ts
    ├─ tsconfig.json
    ├─ index.html
    ├─ public/
    └─ src/
        ├─ main.tsx
        ├─ App.tsx
        ├─ app/
        │   ├─ providers.tsx
        │   └─ routes.tsx
        ├─ features/
        │   ├─ patients/
        │   └─ measurements/
        ├─ shared/
        │   ├─ ui/
        │   ├─ hooks/
        │   ├─ lib/
        │   └─ i18n/
        └─ styles/
```

### 1.3 코딩 규약 (TypeScript/React)

- TypeScript strict 모드. `any` 금지, 외부 입력은 `unknown` → zod로 narrow.
- React 19 함수 컴포넌트, `React.FC` 미사용.
- 폼·API 응답은 모두 zod 스키마로 파싱.
- 서버 상태는 TanStack Query, 글로벌 클라이언트 상태 store 도입 금지.
- `console.log` 금지 (테스트·개발 디버깅 시 ESLint 경고로 잡힘).
- 스타일: 단일 `tokens.css` + 컴포넌트별 CSS 파일. Tailwind 미사용 (디자인 토큰 일원화).
- 이름: 컴포넌트 PascalCase, 훅 `useXxx`, 클래스 kebab-case.
- 파일 한 개당 ≤ 400줄, 함수 ≤ 50줄.
- 모든 컴포넌트 props에 명시적 인터페이스.

### 1.4 코딩 규약 (Java/Spring)

- Java 17, Lombok 유지.
- 새 파일은 `record` 활용, `final` 필드 기본.
- 컨트롤러는 그대로, 응답 직렬화 변경 금지 (Phase 7도 마찬가지).
- 테스트는 JUnit 5 + AssertJ + MockMvc + Spring Boot Test. Testcontainers는 사용하지 않음 (h2 in-memory + JPA로 충분).

### 1.5 단위 변환 규칙

- 백엔드 `kgValue`는 **kg-force**.
- UI/차트/통계/CSV 표시는 모두 **N(뉴턴)**.
- 변환은 `frontend/src/shared/lib/units.ts`의 `KGF_TO_N = 9.80665` 한 곳에서만.
- 변환 미적용 표시는 ESLint 또는 코드리뷰에서 잡는다.

### 1.6 검증 명령어 (각 태스크 종료 시 실행)

| 범위 | 명령 |
|---|---|
| 프론트 타입체크 | `cd frontend && pnpm tsc --noEmit` |
| 프론트 린트 | `cd frontend && pnpm eslint .` |
| 프론트 단위 테스트 | `cd frontend && pnpm vitest run` |
| 프론트 빌드 | `cd frontend && pnpm build` |
| 백엔드 빌드+테스트 | `./gradlew build` |
| 백엔드 테스트만 | `./gradlew test` |
| E2E (Phase 4 이후) | `cd frontend && pnpm playwright test` |

### 1.7 금지 구역 (변경 시 PR 차단)

- `src/main/java/com/project/urp/controller/*` — Phase 7에서도 시그니처/응답 본문 변경 금지.
- `src/main/java/com/project/urp/dto/*` — 와이어 키 변경 금지.
- `src/main/java/com/project/urp/domain/*` — 컬럼 추가/제거 금지 (이번 리빌드 범위 밖).
- `patient_info/README.md` — API 명세는 동결 계약과 일치하므로 보존.

---

## 2. 태스크 그래프

```
Phase 0 (스캐폴드)
  T01 → T02 → T03

Phase 1 (계약 테스트)        ← T01 완료 후 병렬 가능
  T04 → T05, T06, T07         (T04 = 테스트 인프라; T05/06/07 병렬)

Phase 2 (UI 셸)              ← T03 완료 후
  T08 (tokens) ┐
  T09 (http)   ├─→ T13 (providers) → T14 (router) → T15 (ui) → T16 (i18n) → T17 (units)
  T10 (env)    │
  T11 (zod)    ┘
  T12 (error)

Phase 3 (환자)               ← Phase 2 완료
  T18 → T19, T20, T21         (T18 = api 모듈; T19/20/21 병렬)

Phase 4 (세션 차트)          ← Phase 3 완료
  T22 → T23, T24, T25, T26 → T27   (T22=api; T23~26 병렬, T27=조립)

Phase 5 (비교)               ← T27 완료
  T28

Phase 6 (인쇄)               ← T27 완료, T28과 병렬 가능
  T29

Phase 7 (백엔드 보강)        ← Phase 1 완료 시점부터 병렬 가능
  T30, T31, T32, T33          (모두 병렬)

Phase 8 (운영화 + 컷오버)    ← 모든 Phase 완료
  T34 → T35 → T36
```

병렬화 가능 지점은 각 태스크의 **Depends on**에 명시.

---

## 3. 태스크 명세

### Phase 0 — 기반 마련

#### T01: Vite + React + TS 스캐폴드

| 메타 | 값 |
|---|---|
| Phase | 0 |
| Depends on | – |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 30m |

**목표:** `frontend/` 디렉터리에 React 19 + Vite 6 + TS 5 프로젝트 초기 구조를 만든다.

**읽을 컨텍스트:**
- §1.2 레포 구조
- §1.3 코딩 규약(TS)
- `WEB_REBUILD_PLAN.md §6.1`

**산출물:**
- `frontend/package.json` — pnpm, scripts: `dev`, `build`, `preview`, `tsc`, `lint`, `test`, `e2e`
- `frontend/vite.config.ts` — `base: '/'`, dev server proxy `'/api' -> 'http://localhost:8080'`
- `frontend/tsconfig.json` — `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- `frontend/tsconfig.node.json`
- `frontend/index.html` — `lang="ko"`, viewport meta
- `frontend/src/main.tsx`
- `frontend/src/App.tsx` — 임시 "Hello"
- `frontend/.npmrc` (필요 시)

**의존성 (dependencies):**
`react@19`, `react-dom@19`, `react-router-dom@7`, `@tanstack/react-query@5`, `zod@3`, `chart.js@4`, `react-chartjs-2@5`

**의존성 (devDependencies):**
`vite@6`, `@vitejs/plugin-react@4`, `typescript@5`, `@types/react@19`, `@types/react-dom@19`, `@types/node@22`

**수락 기준:**
- [ ] `cd frontend && pnpm install` 성공
- [ ] `pnpm dev` 실행 시 5173에서 "Hello" 렌더 확인 가능
- [ ] `pnpm build` 성공, `frontend/dist/` 생성
- [ ] `pnpm tsc --noEmit` 0 에러

**제약/주의:**
- 패키지 매니저 = pnpm 고정.
- 동일 오리진 배포이므로 prod base path는 `/`.
- Tailwind/CSS-in-JS 도입 금지.

---

#### T02: 도구 체인 (ESLint, Prettier, Vitest, Playwright)

| 메타 | 값 |
|---|---|
| Phase | 0 |
| Depends on | T01 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 45m |

**목표:** 린트·포맷·테스트 도구를 모두 설치하고 placeholder 테스트 1개씩이 통과되도록 구성한다.

**읽을 컨텍스트:**
- §1.3 코딩 규약
- §1.6 검증 명령어

**산출물:**
- `frontend/.eslintrc.cjs` — `@typescript-eslint`, `react`, `react-hooks`, `import` 룰셋. `no-console: warn` (테스트 파일 제외).
- `frontend/.prettierrc` — singleQuote, semi 자유, printWidth 100.
- `frontend/vitest.config.ts` — jsdom, setup 파일.
- `frontend/src/test/setup.ts` — `@testing-library/jest-dom` import.
- `frontend/playwright.config.ts` — baseURL `http://localhost:5173`, webServer auto-start `pnpm dev`.
- `frontend/e2e/smoke.spec.ts` — 페이지 로드 + h1 보임 검증 placeholder.
- `frontend/src/App.test.tsx` — Vitest placeholder.

**추가 의존성:**
`eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-import`, `prettier`, `eslint-config-prettier`, `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`.

**수락 기준:**
- [ ] `pnpm eslint .` 0 에러
- [ ] `pnpm vitest run` 통과
- [ ] `pnpm playwright install chromium` 후 `pnpm playwright test` 통과
- [ ] `pnpm prettier --check .` 통과

**제약/주의:**
- 룰셋은 `~/.claude/rules/ecc/typescript/coding-style.md`와 충돌 없도록 정렬.
- Playwright 브라우저는 chromium만 우선.

---

#### T03: Gradle 통합 + .gitignore

| 메타 | 값 |
|---|---|
| Phase | 0 |
| Depends on | T01 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 30m |

**목표:** `./gradlew build`가 `frontend/`를 빌드하고 산출물을 `src/main/resources/static/`에 복사하도록 한다.

**읽을 컨텍스트:**
- `patient_info/build.gradle`
- `patient_info/.gitignore`
- §1.2 레포 구조

**산출물:**
- `patient_info/build.gradle` 갱신:
  - `tasks.register('frontendInstall', Exec)` — `pnpm install` (frontend cwd)
  - `tasks.register('frontendBuild', Exec)` — `pnpm build`
  - **`tasks.register('frontendSync', Sync)`** — `from("frontend/dist")`, `into("src/main/resources/static")`. **`Sync` 사용 필수 (Copy 아님)** → 소스에 없는 target 파일 자동 삭제 → 구버전 vanilla `index.html`/`app.js`/`style.css` 자연스럽게 정리.
  - `processResources.dependsOn(frontendSync)`, `frontendSync.dependsOn(frontendBuild)`, `frontendBuild.dependsOn(frontendInstall)`
  - `frontendBuild`에 `inputs.dir("frontend/src")`, `inputs.file("frontend/package.json")`, `outputs.dir("frontend/dist")` 선언으로 up-to-date 체크 활성화
- `patient_info/.gitignore` 갱신:
  - `frontend/node_modules/`
  - `frontend/dist/`
  - `src/main/resources/static/` (빌드 산출물 — 새로 추가)
  - `frontend/playwright-report/`, `frontend/test-results/`, `frontend/coverage/`
- `patient_info/src/main/resources/static/.gitkeep` 또는 디렉터리 비움 처리

**수락 기준:**
- [ ] `./gradlew clean build` 성공
- [ ] 빌드 후 `src/main/resources/static/index.html` 가 새 프론트 산출물로 교체됨
- [ ] `./gradlew bootRun` 후 `http://localhost:8080/` 에서 새 React 앱 표시
- [ ] `git status`에 `frontend/dist/`, `node_modules/`, `static/` 산출물 미노출

**제약/주의:**
- 기존 `static/index.html`, `app.js`, `style.css` **이번 태스크에서는 삭제하지 않는다** (Phase 8 컷오버에서 제거). 그 전에는 새 빌드 산출물이 덮어쓰는 형태.
- `pnpm` 미설치 환경 대비 README 안내 추가는 T34에서.

---

### Phase 1 — 백엔드 계약 테스트 (보호망)

#### T04: 테스트 인프라 + h2 프로파일

| 메타 | 값 |
|---|---|
| Phase | 1 |
| Depends on | – |
| 추천 에이전트 | java-build-resolver / general-purpose |
| 예상 소요 | 45m |

**목표:** Spring Boot 테스트가 h2 in-memory DB를 사용하도록 구성하고, 공통 테스트 베이스를 마련한다.

**읽을 컨텍스트:**
- `patient_info/src/main/resources/application.properties`
- §1.4 코딩 규약(Java)
- `~/.claude/rules/ecc/java/testing.md`

**산출물:**
- `build.gradle` 의존성 추가:
  - `testRuntimeOnly 'com.h2database:h2'`
  - `testImplementation 'org.assertj:assertj-core'` (이미 starter-test에 포함이지만 명시)
- `src/test/resources/application-test.properties`:
  ```
  spring.datasource.url=jdbc:h2:mem:test;MODE=MySQL;DB_CLOSE_DELAY=-1
  spring.datasource.driver-class-name=org.h2.Driver
  spring.datasource.username=sa
  spring.datasource.password=
  spring.jpa.hibernate.ddl-auto=create-drop
  spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect
  spring.jpa.show-sql=false
  ```
- `src/test/java/com/project/urp/support/ApiContractTestBase.java`:
  - `@SpringBootTest(webEnvironment=MOCK)`, `@AutoConfigureMockMvc`, `@ActiveProfiles("test")`, `@Transactional`
  - `protected MockMvc mockMvc;`, `protected ObjectMapper objectMapper;`
  - 테스트 픽스처용 `Patient` seeding 헬퍼

**수락 기준:**
- [ ] `./gradlew test` 통과 (기존 `UrpApplicationTests`도)
- [ ] 새 베이스 클래스가 컴파일됨

**제약/주의:**
- `application.properties`는 이 태스크에서 건드리지 않음 (T30에서 yml 변환).
- `MODE=MySQL`로 MariaDB와 호환 모드.

---

#### T05: 환자 API 계약 테스트

| 메타 | 값 |
|---|---|
| Phase | 1 |
| Depends on | T04 |
| 추천 에이전트 | java-build-resolver / general-purpose |
| 예상 소요 | 45m |

**목표:** `GET /api/v1/patients`, `POST /api/v1/patients` 응답의 키·타입·HTTP 상태를 회귀 방지한다.

**읽을 컨텍스트:**
- `MeasurementController.java`
- `PatientDto.java`, `Patient.java`
- §1.1 동결 계약

**산출물:**
- `src/test/java/com/project/urp/controller/PatientApiContractTest.java`

**테스트 케이스 (모두 필수):**
- `getAllPatients_returnsArrayWithFrozenKeys`:
  - seed 2명 후 GET → 200, `$[0].id`, `$[0].patientId`, `$[0].name`, `$[0].age`, `$[0].sex`, `$[0].height`, `$[0].weight` 존재 검증.
  - 추가 키가 있어도 실패시키지 않음 (정직한 회귀 보호).
- `createPatient_returns201_withFrozenKeys`:
  - body `{patientId,name,age,sex,height,weight}` POST → 201
  - 응답에 `id`, `patientId` 일치 검증.
- `createPatient_duplicatePatientId_returnsClientError`:
  - 같은 `patientId` 두 번 POST → 4xx (현재 500이지만 T31에서 400으로 교정될 예정 → 본 테스트는 우선 `isNot2xxSuccessful()` 만 검증해 두고, T31 완료 후 본 케이스를 4xx로 강화).

**수락 기준:**
- [ ] `./gradlew test --tests PatientApiContractTest` 통과
- [ ] 키 누락 회귀를 만들면 테스트가 실패하는지 수동 확인

---

#### T06: 측정 라이프사이클 계약 테스트

| 메타 | 값 |
|---|---|
| Phase | 1 |
| Depends on | T04 |
| 추천 에이전트 | java-build-resolver / general-purpose |
| 예상 소요 | 1h |

**목표:** `start → data → stop` 시퀀스의 키·타입을 회귀 방지한다.

**산출물:**
- `src/test/java/com/project/urp/controller/MeasurementLifecycleContractTest.java`

**테스트 케이스:**
- `start_returns_measurement_Id_uppercaseI`:
  - body `{"patientId":"p001","memo":"L knee"}` → 200
  - `$.measurement_Id` (대문자 I) 가 number 인지 검증.
  - **소문자 `measurement_id` 키가 없음**도 검증 (회귀 차단).
- `saveData_acceptsSnakeCasePayload`:
  - body `[{"time_offset_ms":10,"kg_value":1.98},{"time_offset_ms":20,"kg_value":2.12}]` → 200
- `saveData_acceptsLargeIntegerTimeOffset`:
  - `time_offset_ms: 2_000_000_000` 도 200 처리 (T33의 Number 캐스팅과 연동).
- `stop_returnsOk`:
  - `/measurements/{id}/stop` POST → 200
  - DB에서 `endTime` 갱신 확인.

**수락 기준:**
- [ ] 모든 케이스 통과
- [ ] `measurement_Id` 키 이름이 변경되면 테스트 실패

---

#### T07: 조회 API 계약 테스트

| 메타 | 값 |
|---|---|
| Phase | 1 |
| Depends on | T04 |
| 추천 에이전트 | java-build-resolver / general-purpose |
| 예상 소요 | 45m |

**목표:** 환자별 측정 이력, 측정 데이터 조회의 응답 키·정렬을 회귀 방지한다.

**산출물:**
- `src/test/java/com/project/urp/controller/ReadApiContractTest.java`

**테스트 케이스:**
- `getMeasurementsByPatient_returnsCamelCaseKeys`:
  - `$[0].measurementId`, `$[0].startTime`, `$[0].endTime`, `$[0].memo` 존재.
- `getMeasurementsByPatient_startTimeIsIso8601String`:
  - `$[0].startTime` 가 정규식 `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$` 과 매치 — Jackson 기본 직렬화(문자열) 회귀 차단.
- `getMeasurementsByPatient_inProgressSession_endTimeIsNull`:
  - stop 호출 안 한 세션의 `endTime`이 JSON `null` 인지 검증.
- `getMeasurementsByPatient_memoCanBeNull`:
  - memo 미입력으로 start한 세션의 `memo`가 `null`인지 검증.
- `getDataPoints_returnsCamelCaseKeysAndOrderedAsc`:
  - 시드 시 의도적으로 `timeOffsetMs` 역순 입력 → 응답이 오름차순 정렬되는지 검증.
  - `$[0].timeOffsetMs`, `$[0].kgValue` 존재.
- `getDataPoints_emptyMeasurement_returnsEmptyArray`.

**수락 기준:**
- [ ] 모든 케이스 통과
- [ ] 정렬 회귀 시 실패
- [ ] Jackson `WRITE_DATES_AS_TIMESTAMPS=true`로 누군가 바꾸면 ISO 정규식 매치가 깨져 즉시 감지

---

### Phase 2 — UI 셸·기반

#### T08: 디자인 토큰 + 글로벌 스타일

| 메타 | 값 |
|---|---|
| Phase | 2 |
| Depends on | T03 |
| 추천 에이전트 | a11y-architect / general-purpose |
| 예상 소요 | 1h |

**목표:** 색·간격·타이포·모션 토큰을 CSS 변수로 정의하고 라이트/다크 테마를 분리한다.

**읽을 컨텍스트:**
- `~/.claude/rules/ecc/web/design-quality.md`
- `~/.claude/rules/ecc/web/coding-style.md`
- `WEB_REBUILD_PLAN.md §6.5`

**산출물:**
- `frontend/src/styles/reset.css` — modern reset.
- `frontend/src/styles/tokens.css` — `:root { --color-bg, --color-fg, --color-accent, --color-border, --color-danger, --space-1..8, --text-xs..xl, --radius-sm..lg, --duration-fast/normal, --ease-out-expo }` + `[data-theme="dark"] { ... }`.
- `frontend/src/styles/global.css` — body, focus-visible, scrollbar, `@media (prefers-reduced-motion)`.
- `frontend/src/main.tsx`에서 위 3개 import.

**수락 기준:**
- [ ] 라이트/다크 토큰 모두 WCAG AA 대비 통과 (4.5:1)
- [ ] `prefers-reduced-motion` 시 transition 0
- [ ] 토큰을 CSS 변수 외에 하드코딩하지 않음 (grep 검증)

---

#### T09: HTTP 클라이언트 래퍼

| 메타 | 값 |
|---|---|
| Phase | 2 |
| Depends on | T01 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 45m |

**목표:** `fetch` 기반 얇은 클라이언트 + `AbortController` + 통일된 에러 모델.

**산출물:**
- `frontend/src/shared/lib/http.ts`:
  - `httpGet<T>(path, schema, signal?)`
  - `httpPost<TReq, TRes>(path, body, resSchema, signal?)`
  - 에러 타입 `ApiError { status, message, cause? }`
  - 응답 본문 zod parse 강제 (T11에서 정의된 스키마 주입)
- `frontend/src/shared/lib/__tests__/http.test.ts`:
  - 정상 응답 파싱 / 비정상 status / zod 실패 / abort 케이스.

**수락 기준:**
- [ ] Vitest 통과
- [ ] `import.meta.env.VITE_API_BASE_URL` 사용 (T10)
- [ ] zod 검증 실패 시 `ApiError` throw

---

#### T10: 환경 설정 모듈

| 메타 | 값 |
|---|---|
| Phase | 2 |
| Depends on | T01 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 20m |

**목표:** 환경변수를 zod로 검증하는 `env.ts`를 제공.

**산출물:**
- `frontend/src/shared/lib/env.ts`:
  - `import.meta.env.VITE_API_BASE_URL` (default: `''` — 동일 오리진).
- `frontend/.env.example`:
  - `VITE_API_BASE_URL=` (비워두면 동일 오리진의 `/api/v1`로 호출)

**수락 기준:**
- [ ] 누락된 필수 변수 시 빌드 시점 에러
- [ ] 단위 테스트로 검증

---

#### T11: zod 스키마 (와이어 계약)

| 메타 | 값 |
|---|---|
| Phase | 2 |
| Depends on | T01 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 45m |

**목표:** 동결 계약의 모든 응답·요청 모양을 zod 스키마로 선언.

**읽을 컨텍스트:**
- §1.1 동결 계약
- `WEB_REBUILD_PLAN.md §3`

**산출물:**
- `frontend/src/features/patients/schema.ts`:
  - `PatientSchema` (`id`, `patientId`, `name`, `age`, `sex`, `height`, `weight`)
  - `CreatePatientSchema` (POST body)
  - `Patient = z.infer<...>`
- `frontend/src/features/measurements/schema.ts`:
  - `MeasurementSummarySchema`:
    - `measurementId: number`
    - `startTime: string` (ISO-8601, 필수)
    - `endTime: string | null` (진행 중 세션은 null)
    - `memo: string | null` (미입력 가능)
  - `DataPointSchema` (`timeOffsetMs: number`, `kgValue: number`)
  - `StartResponseSchema` — `{ measurement_Id: number }` (대문자 I 보존, `.transform()`으로 내부 명칭 `measurementId`로 변환)
- `frontend/src/features/__tests__/schema.test.ts` — 실제 와이어 페이로드 fixture 파싱 검증.

**수락 기준:**
- [ ] `measurement_Id` 키 변환 검증 케이스 포함
- [ ] `kgValue`/`timeOffsetMs` 필수
- [ ] `endTime: null`, `memo: null` 페이로드 모두 파싱 성공
- [ ] 잘못된 ISO 문자열은 거부 (예: `"2025/11/01"`)
- [ ] 추가 키가 있어도 통과 — **strict 사용** 후 새 키 등장 시 명시 추가

---

#### T12: 에러 바운더리 + 글로벌 에러 처리

| 메타 | 값 |
|---|---|
| Phase | 2 |
| Depends on | T01 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 30m |

**목표:** React 에러 바운더리 + TanStack Query 글로벌 onError를 한 곳에서.

**산출물:**
- `frontend/src/app/ErrorBoundary.tsx`
- `frontend/src/shared/ui/ErrorFallback.tsx`
- 단위 테스트.

**수락 기준:**
- [ ] 자식 throw 시 fallback 렌더
- [ ] reset 버튼 동작

---

#### T13: 프로바이더 (QueryClient + Theme + ErrorBoundary)

| 메타 | 값 |
|---|---|
| Phase | 2 |
| Depends on | T08, T12 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 30m |

**산출물:**
- `frontend/src/app/providers.tsx`
- `frontend/src/shared/hooks/useTheme.ts` — localStorage + `prefers-color-scheme`.

**수락 기준:**
- [ ] 테마 토글이 `data-theme` 어트리뷰트 갱신
- [ ] React Query DevTools는 dev 모드에만 마운트

---

#### T14: 라우터 + 레이아웃 셸

| 메타 | 값 |
|---|---|
| Phase | 2 |
| Depends on | T13 |
| 추천 에이전트 | a11y-architect |
| 예상 소요 | 45m |

**산출물:**
- `frontend/src/app/routes.tsx` — `/`, `/patients`, `/patients/:patientId`, `/patients/:patientId/sessions/:measurementId`, `/sessions/compare`, `/settings`. 처음에는 placeholder 컴포넌트.
- `frontend/src/shared/ui/Layout/AppShell.tsx` — `<header>`, `<nav>`, `<main>`, `<footer>` 시맨틱 마크업, skip-link 포함.

**수락 기준:**
- [ ] 키보드 Tab 흐름 검증 (Playwright E2E)
- [ ] skip-link 동작
- [ ] `aria-current="page"` 활성 링크 표시

---

#### T15: UI 프리미티브 (Button, Input, Select, Modal, Toast)

| 메타 | 값 |
|---|---|
| Phase | 2 |
| Depends on | T08 |
| 추천 에이전트 | a11y-architect |
| 예상 소요 | 1.5h |

**산출물:**
- `frontend/src/shared/ui/Button.tsx`
- `frontend/src/shared/ui/Input.tsx` (label 연결, `aria-describedby` 에러)
- `frontend/src/shared/ui/Select.tsx`
- `frontend/src/shared/ui/Modal.tsx` (focus trap, ESC, scroll lock)
- `frontend/src/shared/ui/Toast/` (`ToastProvider`, `useToast`)
- 각 컴포넌트 Vitest 테스트 + axe 검증.

**수락 기준:**
- [ ] 키보드만으로 Modal 열기·닫기·focus 복귀
- [ ] axe 0 violation
- [ ] 다크 테마에서 외관 확인

---

#### T16: i18n (KR/EN)

| 메타 | 값 |
|---|---|
| Phase | 2 |
| Depends on | T13 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 30m |

**산출물:**
- `frontend/src/shared/i18n/index.ts` — 단순 dictionary 기반(외부 라이브러리 미도입).
- `frontend/src/shared/i18n/ko.ts`, `en.ts`.
- `frontend/src/shared/hooks/useT.ts`.

**수락 기준:**
- [ ] 미번역 키는 dev 콘솔 경고 + 키 자체 표시
- [ ] 언어 전환 후 라우트 유지

**제약:** `react-i18next` 미사용 (KISS). 키 ≤ 200개 이내 예상.

---

#### T17: 단위 변환 모듈

| 메타 | 값 |
|---|---|
| Phase | 2 |
| Depends on | T01 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 20m |

**목표:** kgf → N 변환 + 표시 포맷 한 곳에서.

**산출물:**
- `frontend/src/shared/lib/units.ts`:
  - `export const KGF_TO_N = 9.80665;`
  - `kgfToN(kgValue: number): number`
  - `formatN(n: number, digits = 2): string` — 예: `12.34 N`
- `frontend/src/shared/lib/__tests__/units.test.ts` — 변환·포맷·경계값(0, 음수, NaN) 테스트.

**수락 기준:**
- [ ] 100% 라인 커버리지
- [ ] 변환 회귀 시 테스트 실패

---

### Phase 3 — 환자 관리

#### T18: Patients API 모듈 + 훅

| 메타 | 값 |
|---|---|
| Phase | 3 |
| Depends on | T09, T11, T13 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 30m |

**산출물:**
- `frontend/src/features/patients/api.ts` — `listPatients()`, `createPatient(input)`.
- `frontend/src/features/patients/usePatients.ts` — `useQuery`, `useMutation` + invalidate.
- 단위 테스트 (msw 또는 fetch mock).

**의존성 추가:** `msw@2`.

**수락 기준:**
- [ ] zod 검증 통과
- [ ] mutation 성공 시 list 캐시 invalidate

---

#### T19: PatientList 페이지

| 메타 | 값 |
|---|---|
| Phase | 3 |
| Depends on | T18, T15 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 1h |

**기능:**
- 검색(이름/ID 부분일치, debounced 200ms)
- 클라이언트 측 페이지네이션 (page size 25)
- 정렬 (이름, 등록 순)
- 행 클릭 → `/patients/:patientId`
- "신규 등록" 버튼 → Modal로 T20 폼 호출

**산출물:**
- `frontend/src/features/patients/PatientList.tsx`
- 테스트.

**수락 기준:**
- [ ] 100명 시드 시 60fps 유지 (가상 스크롤 불필요, 단순 페이지네이션)
- [ ] 검색 빈 결과 표시
- [ ] 키보드만으로 행 활성화

---

#### T20: PatientRegisterForm

| 메타 | 값 |
|---|---|
| Phase | 3 |
| Depends on | T18, T15 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 1h |

**기능:**
- zod 스키마:
  - `patientId`: 1–32자, `[A-Za-z0-9_-]`만 허용 (실 운영 데이터의 ID 패턴이 `p001` 외에 다양할 수 있으므로 보수적 화이트리스트). 백엔드가 SoT.
  - `name` (1–50)
  - `age` (0–150 정수)
  - `sex` (`'male'|'female'|'other'`)
  - `height` (50–250 cm float)
  - `weight` (10–250 kg float)
- 서버 4xx 시 inline 에러.
- 성공 시 toast + Modal close + 목록 invalidate.

**산출물:**
- `frontend/src/features/patients/PatientRegisterForm.tsx`
- 테스트 (입력 검증 + 성공/실패 플로우).

**수락 기준:**
- [ ] 모든 필드 라벨 연결, `aria-invalid`
- [ ] Submit 중복 방지

---

#### T21: PatientDetail 페이지

| 메타 | 값 |
|---|---|
| Phase | 3 |
| Depends on | T18, T15 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 45m |

**기능:**
- 환자 기본 정보 카드
- 측정 세션 타임라인 placeholder (실제는 T25에서 세션 리스트 연동 — 본 태스크에서는 빈 목록 + "측정 기록 없음" 처리만)

**산출물:**
- `frontend/src/features/patients/PatientDetail.tsx`

**수락 기준:**
- [ ] 잘못된 patientId → 404 라우트 fallback

---

### Phase 4 — 세션 조회·차트

#### T22: Measurements API 모듈 + 훅

| 메타 | 값 |
|---|---|
| Phase | 4 |
| Depends on | T09, T11 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 30m |

**산출물:**
- `frontend/src/features/measurements/api.ts` — `listSessions(patientId)`, `getDataPoints(measurementId)`.
- `frontend/src/features/measurements/useMeasurements.ts`.
- 테스트.

**수락 기준:**
- [ ] `useDataPoints` 데이터에 단위 변환은 **하지 않는다** (변환은 표시 시점에 적용).

---

#### T23: ForceChart 컴포넌트

| 메타 | 값 |
|---|---|
| Phase | 4 |
| Depends on | T17, T22 |
| 추천 에이전트 | a11y-architect |
| 예상 소요 | 1.5h |

**기능:**
- 입력: `dataPoints: { timeOffsetMs; kgValue }[]`, `unitDisplay = 'N'` 고정.
- 내부에서 `kgfToN(kgValue)`로 변환 후 차트.
- X축 동적 max (실제 max + 10% 여유), 1초 단위 grid.
- Y축 라벨 `힘 (N)`, 단위 N 명시.
- `prefers-reduced-motion` 시 애니메이션 0.
- 데이터 ≥10k 포인트일 때 다운샘플링(LTTB 추천).

**산출물:**
- `frontend/src/features/measurements/ForceChart.tsx`
- 테스트 (변환 + 빈 배열 + 큰 배열).

**수락 기준:**
- [ ] 1만 포인트에서 INP < 200ms
- [ ] CDN 미사용 (chart.js 번들에 포함)

---

#### T24: SummaryStats 패널

| 메타 | 값 |
|---|---|
| Phase | 4 |
| Depends on | T17, T22 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 1h |

**계산 (모두 N 단위로 표시):**
- `peak`: max(kgValue) × KGF_TO_N
- `mean`: mean(kgValue) × KGF_TO_N
- `timeToPeak`: peak 시점의 timeOffsetMs (ms)
- `rfd_0_100`: (kg@100ms − kg@0ms) × KGF_TO_N / 0.1 (단위 N/s)
- `rfd_100_200`: ...
- `impulse`: 사다리꼴 적분(kgValue × KGF_TO_N over time)

**산출물:**
- `frontend/src/features/measurements/lib/stats.ts` (순수 함수)
- `frontend/src/features/measurements/SummaryStats.tsx`
- 단위 테스트 (고정 입력 → 기대값) — fixture로 회귀 보호.

**수락 기준:**
- [ ] 빈 배열 시 모든 지표 `'-'` 표시
- [ ] stats.ts 100% 커버리지

---

#### T25: SessionList 컴포넌트

| 메타 | 값 |
|---|---|
| Phase | 4 |
| Depends on | T22, T15 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 45m |

**기능:**
- 환자별 세션 목록(타임라인) — `startTime` 내림차순.
- 다중 선택 체크박스(T28에서 사용).
- 행 클릭 → `/patients/:patientId/sessions/:measurementId`.

**산출물:**
- `frontend/src/features/measurements/SessionList.tsx`

**수락 기준:**
- [ ] 빈 목록 안내
- [ ] 날짜 표시 로컬타임존(Asia/Seoul)

---

#### T26: CSV 내보내기

| 메타 | 값 |
|---|---|
| Phase | 4 |
| Depends on | T17, T22 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 30m |

**기능:**
- 헤더: `time_offset_ms,force_n,kg_value`
- BOM 포함(엑셀 한글 호환).
- 파일명: `session-{measurementId}-{startTimeISO}.csv`.

**산출물:**
- `frontend/src/features/measurements/lib/exportCsv.ts`
- 단위 테스트.

**수락 기준:**
- [ ] 1만 행 < 1s
- [ ] 변환 로직은 `kgfToN` 사용 (직접 곱셈 금지)

---

#### T27: SessionDetail 페이지 (조립)

| 메타 | 값 |
|---|---|
| Phase | 4 |
| Depends on | T23, T24, T25, T26 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 45m |

**산출물:**
- `frontend/src/features/measurements/SessionDetail.tsx` — `Header(환자명, 세션 메모, 시작/종료 시각)` + `<ForceChart>` + `<SummaryStats>` + `[CSV 다운로드]` 버튼.
- E2E 테스트 (`frontend/e2e/session-detail.spec.ts`).

**수락 기준:**
- [ ] msw 모킹 환경에서 E2E 통과
- [ ] 차트·통계·CSV 한 화면 정상 표시

---

### Phase 5 — 세션 비교

#### T28: SessionCompare 페이지

| 메타 | 값 |
|---|---|
| Phase | 5 |
| Depends on | T23, T25 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 1h |

**기능:**
- URL: `/sessions/compare?ids=12,15,17`
- 최대 4개 세션 동시 오버레이 (가독성 한계).
- 세션별 색상 자동 배정(토큰 기반).
- 통계 비교 테이블.

**산출물:**
- `frontend/src/features/measurements/SessionCompare.tsx`

**수락 기준:**
- [ ] 5개 이상 선택 시 안내 메시지
- [ ] 1개만 있어도 정상 동작

---

### Phase 6 — 인쇄/보고서

#### T29: 인쇄 스타일 + 보고서 시트

| 메타 | 값 |
|---|---|
| Phase | 6 |
| Depends on | T27 |
| 추천 에이전트 | a11y-architect |
| 예상 소요 | 45m |

**기능:**
- `@media print` — 헤더/푸터 정리, 차트 흑백 명도 보장, 통계 표 단순화.
- "환자 PII 마스킹" 토글 (Settings에 추가).

**산출물:**
- `frontend/src/styles/print.css`
- `frontend/src/features/measurements/PrintReport.tsx` (옵션 — print 전용 라우트)

**수락 기준:**
- [ ] 크롬 인쇄 미리보기에서 1페이지에 핵심 정보 표시
- [ ] 마스킹 토글 시 이름/ID 가림

---

### Phase 7 — 백엔드 비파괴 보강 (병렬 가능)

#### T30: application.yml 변환 + env 자격증명

| 메타 | 값 |
|---|---|
| Phase | 7 |
| Depends on | T04 |
| 추천 에이전트 | java-build-resolver |
| 예상 소요 | 30m |

**산출물:**
- `src/main/resources/application.yml` (공통, 기존 properties 대체)
  - 8행 오타(`spring,datasource…`) 수정.
  - 공통: `spring.jpa`, `spring.application.name`, **`spring.jackson.serialization.write-dates-as-timestamps: false`** 명시 (계약 보호).
  - 자격증명·URL은 프로파일별로 분리.
- `src/main/resources/application-dev.yml`:
  - `ddl-auto: update`, `show-sql: true`
  - `spring.datasource.username: ${DB_USERNAME:smartbiomed}` (dev에만 default 허용)
  - `spring.datasource.password: ${DB_PASSWORD:smartbiomed}`
- `src/main/resources/application-prod.yml`:
  - `ddl-auto: validate`, `show-sql: false`
  - `spring.datasource.username: ${DB_USERNAME}` (**default 없음 → 미설정 시 부팅 실패**)
  - `spring.datasource.password: ${DB_PASSWORD}`
- 기존 `application.properties` 삭제.

**수락 기준:**
- [ ] `./gradlew bootRun --args="--spring.profiles.active=dev"` 정상
- [ ] prod 프로파일에서 env 미설정 시 부팅 실패 (PlaceholderResolutionException 또는 명확한 메시지)
- [ ] **응답 본문은 변하지 않음** (계약 보호 테스트 모두 통과)
- [ ] Jackson 날짜 직렬화 ISO-8601 유지 (T07 케이스 통과)

---

#### T31: GlobalExceptionHandler

| 메타 | 값 |
|---|---|
| Phase | 7 |
| Depends on | T04 |
| 추천 에이전트 | java-reviewer / general-purpose |
| 예상 소요 | 20m |

**산출물:**
- `src/main/java/com/project/urp/web/GlobalExceptionHandler.java`:
  - `@RestControllerAdvice`
  - `IllegalArgumentException` → 400 + body `{"error":"...메시지..."}`
  - `Exception` → 500 + body `{"error":"Internal server error"}` (스택트레이스 비노출)

**수락 기준:**
- [ ] 기존 200 응답은 변경 없음 (계약 보호 테스트 그린)
- [ ] T05의 duplicate ID 케이스를 4xx 강화로 업데이트

**제약:** body 스키마 추가는 **에러 응답에만 한정**. 성공 응답은 절대 envelope으로 감싸지 않는다 (계약).

---

#### T32: CORS 설정 (방어적, 동일 오리진은 무영향)

| 메타 | 값 |
|---|---|
| Phase | 7 |
| Depends on | T04 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 15m |

**산출물:**
- `src/main/java/com/project/urp/web/CorsConfig.java` — `@Configuration` + `WebMvcConfigurer.addCorsMappings`. 기본은 비활성(동일 오리진), 환경변수 `WEB_ALLOWED_ORIGINS` 있을 때만 화이트리스트 적용.

**수락 기준:**
- [ ] 기본 동작에서 디바이스/앱 호출 영향 없음
- [ ] env 지정 시 OPTIONS preflight 통과

---

#### T33: saveDataPoints Number 캐스팅 안전화

| 메타 | 값 |
|---|---|
| Phase | 7 |
| Depends on | T04 |
| 추천 에이전트 | java-reviewer |
| 예상 소요 | 15m |

**대상 파일:** `src/main/java/com/project/urp/service/MeasurementService.java`

**변경:**
```java
(Integer) data.get("time_offset_ms")
// →
((Number) data.get("time_offset_ms")).intValue()
```

**수락 기준:**
- [ ] T06의 `saveData_acceptsLargeIntegerTimeOffset`가 통과
- [ ] 기존 케이스 회귀 없음

---

### Phase 8 — 운영화 + 컷오버

#### T34: README + RUNBOOK

| 메타 | 값 |
|---|---|
| Phase | 8 |
| Depends on | Phase 0–7 |
| 추천 에이전트 | doc-updater |
| 예상 소요 | 30m |

**산출물 (둘 다 갱신, 신규 생성하지 않음):**
- `patient_info/README.md` — **API 명세 부분은 보존**, 상단에 "개발/실행" 섹션 추가:
  - 요구사항 (Java 17, pnpm, Node 20+)
  - dev: `cd frontend && pnpm dev`(5173) + `./gradlew bootRun`(8080), Vite proxy로 API 라우팅
  - prod: `./gradlew clean build && java -jar build/libs/*.jar`
- 신규 `RUNBOOK.md` (프로젝트 루트):
  - DB 자격증명 env 설정
  - 정전 후 복구 절차
  - 디바이스 펌웨어 호환성 회귀 검증 절차 (Postman 컬렉션 또는 curl 스니펫)

**수락 기준:**
- [ ] 신규 개발자가 README만 보고 5분 내 dev 환경 구동

---

#### T35: GitHub Actions CI

| 메타 | 값 |
|---|---|
| Phase | 8 |
| Depends on | Phase 0–7 |
| 추천 에이전트 | general-purpose |
| 예상 소요 | 45m |

**산출물:**
- `.github/workflows/ci.yml`:
  - jobs: `frontend` (lint, typecheck, vitest, build), `backend` (gradlew test), `e2e` (frontend dev + bootRun + playwright)
  - 캐시: pnpm store, gradle.

**수락 기준:**
- [ ] PR 생성 시 모든 잡 그린
- [ ] 캐시 적중 시 < 5분

---

#### T36: 컷오버 — 기존 정적 파일 제거

| 메타 | 값 |
|---|---|
| Phase | 8 |
| Depends on | T34, T35, 모든 이전 태스크 |
| 추천 에이전트 | refactor-cleaner |
| 예상 소요 | 30m |

**작업:**
- `src/main/resources/static/` 의 기존 `index.html`, `app.js`, `style.css` 제거 (Gradle 빌드가 새 산출물로 대체).
- 빌드 산출물이 정상 배치되는지 재확인.
- 스모크 시나리오 수동 실행 (RUNBOOK.md의 회귀 검증 절차).

**수락 기준:**
- [ ] `./gradlew clean build && ./gradlew bootRun` 후 새 React 앱이 `/` 에서 표시됨
- [ ] `/api/v1/patients` 등 모든 엔드포인트가 디바이스/앱 관점에서 동일한 응답을 반환 (계약 테스트 그린)
- [ ] 기존 vanilla 정적 파일이 더 이상 트리에 없음

---

## 4. 진행 체크리스트 (요약)

```
Phase 0  [ ] T01  [ ] T02  [ ] T03
Phase 1  [ ] T04  [ ] T05  [ ] T06  [ ] T07
Phase 2  [ ] T08  [ ] T09  [ ] T10  [ ] T11  [ ] T12  [ ] T13  [ ] T14  [ ] T15  [ ] T16  [ ] T17
Phase 3  [ ] T18  [ ] T19  [ ] T20  [ ] T21
Phase 4  [ ] T22  [ ] T23  [ ] T24  [ ] T25  [ ] T26  [ ] T27
Phase 5  [ ] T28
Phase 6  [ ] T29
Phase 7  [ ] T30  [ ] T31  [ ] T32  [ ] T33
Phase 8  [ ] T34  [ ] T35  [ ] T36
```

---

## 5. 위임 시 프롬프트 템플릿 (서브에이전트용)

```
당신은 patientInfo_ws 프로젝트의 [태스크 ID] 를 단독으로 완수합니다.

먼저 다음을 읽으세요:
1. /home/lsmin124/patientInfo_ws/IMPL_SPEC.md 의 §0, §1
2. /home/lsmin124/patientInfo_ws/WEB_REBUILD_PLAN.md 의 §3 (동결 계약)
3. 본 태스크 명세 (아래에 첨부됨)

작업 규칙:
- 동결 계약을 절대 깨지 않습니다.
- 산출물 외 파일은 수정하지 않습니다.
- 수락 기준 모두 통과까지 자체 검증합니다.
- 검증 명령은 §1.6에 정의되어 있습니다.

---
[태스크 명세 본문 첨부]
---

작업 후 보고:
1. 변경/생성된 파일 목록
2. 실행한 검증 명령과 결과
3. 수락 기준 체크 결과
4. 다음 태스크가 의존할 수 있는 산출물 요약
```

---

## 6. 다음 단계

본 명세서 컨펌 시 (§7 보완 사항을 함께 적용한 상태):

1. T01 (스캐폴드)부터 순차 시작.
2. Phase 1·Phase 2의 독립 태스크는 §2 그래프에 따라 병렬 위임 가능.
3. 각 태스크 완료 시 §4 체크리스트 갱신.

> 사용자 신호 대기: "go", "T01부터 시작", 또는 특정 태스크 우선순위 변경 지시.

---

## 7. 보완 사항 (Plan Review v1, 2026-05-09)

§3 작성 후 점검에서 발견한 갭. 인라인 수정된 항목과, 본 절에서만 다루는 정책·체크리스트로 구성.

### 7.1 Phase별 Definition of Done

각 Phase 종료 시 다음을 모두 그린으로:

- [ ] Phase 내 모든 태스크의 수락 기준 통과
- [ ] §1.6 검증 명령 모두 그린
- [ ] Phase 1 완료 이후에는 백엔드 계약 테스트 회귀 0
- [ ] §1.3/§1.4 코딩 규약 위반 0
- [ ] §1.7 금지 구역 변경 0
- [ ] 새 의존성 추가 시 본 문서 §7.2의 핀 정책에 따라 반영

### 7.2 의존성 버전 핀 정책

`package.json`은 caret 대신 `~` 또는 정확 핀 사용 (메이저 자동 점프 차단).

핵심 핀 (변경 금지):
- React 19.1.x, react-dom 19.1.x
- Vite 6.x, `@vitejs/plugin-react` 4.x
- TypeScript 5.6.x
- TanStack Query 5.x
- zod 3.23 이상
- chart.js 4.4.x, react-chartjs-2 5.2.x
- react-router-dom 7.x
- msw 2.x
- 백엔드: Spring Boot 3.5.7, Java 17 (`build.gradle` 그대로)

업그레이드 시: 별도 PR + 계약 테스트 그린 + 시각 회귀 점검.

### 7.3 범위 외 (Not in Scope, v2 또는 향후)

- 환자 정보 수정/삭제 — 백엔드 엔드포인트 부재
- 메모 사후 편집 — 계약 변경 필요
- 인증·인가 — 디바이스/앱 무인증 의존
- 실시간 측정 진행상황 스트리밍 — 디바이스가 적재 후 stop 호출 모델
- 측정 시작/종료 웹 트리거 — 동시성 충돌 위험
- 다중 클리닉/멀티테넌시
- 사용자별 커스텀 통계 뷰
- HTTP 보안 헤더(HSTS/CSP) — Phase 7에 미포함, v2

### 7.4 Vitest 커버리지 임계치 (T02 보완)

`frontend/vitest.config.ts`에 명시:

```ts
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
  },
}
```

순수 함수 모듈은 100% 라인 커버리지 강제 (`shared/lib/units.ts`, `features/measurements/lib/stats.ts`, `features/measurements/lib/exportCsv.ts`).

### 7.5 공통 UI 상태 프리미티브 (T15 확장)

T15 산출물에 다음 추가:

- `Skeleton` (텍스트/카드/차트 자리 표시)
- `EmptyState` (아이콘 + 제목 + 설명 + 액션 슬롯)
- `Spinner` (버튼 내부용 작은 스피너)
- `LoadingOverlay` (페이지 단위)

페이지 컴포넌트(`PatientList`/`PatientDetail`/`SessionList`/`SessionDetail`/`SessionCompare`)는 **isLoading / isEmpty / isError / hasData** 4개 분기를 명시적으로 분리해 렌더.

### 7.6 404 NotFound 라우트 (T14 확장)

- `frontend/src/app/NotFound.tsx`
- `routes.tsx`에 `*` 와일드카드 라우트.
- "홈으로" 링크 + 직전 URL 표시.

### 7.7 In-progress 세션 처리

`endTime`이 `null`인 세션은 **"측정 진행 중"** 라벨로 표시 (T25, T27, T28 모두 적용). 진행 중 세션의 차트는 표시 가능하지만 "데이터가 추가되는 중" 안내. 자동 폴링은 **하지 않는다** (계약 외 의도된 트래픽).

### 7.8 다운샘플링 결정 (T23 보완)

- 라이브러리: **`downsample-lttb`** (npm, MIT, ~3KB).
- 적용 기준: 데이터 ≥ 10,000 포인트 → 1,500포인트로 LTTB 다운샘플.
- 단위 테스트: 1만 포인트 다운샘플 후 피크값 손실 < 5% 검증.
- 의존성 추가: T23 작업 시 `pnpm add downsample-lttb`.

### 7.9 MSW 핸들러 허브 (T18 확장)

- `frontend/src/test/handlers.ts` — 와이어 계약 기반 핸들러 모음.
- `frontend/src/test/setup.ts`에서 `setupServer(...handlers)` 등록.
- 모든 페이지·훅 테스트는 이 허브를 재사용 (개별 테스트는 `server.use(...)`로 override).

### 7.10 CI 버전 핀 (T35 확장)

`.github/workflows/ci.yml`:

- `actions/setup-node@v4` + `node-version: '20.x'`
- `actions/setup-java@v4` + `java-version: '17'`, `distribution: 'temurin'`
- `pnpm/action-setup@v4`
- 캐시: `cache: 'pnpm'` + `gradle/actions/setup-gradle@v4`
- 잡: `frontend` (lint/tsc/vitest/build) → `backend` (gradlew test) → `e2e` (concurrent dev + bootRun + playwright). 모두 PR 머지 게이트.

### 7.11 컷오버 롤백 절차 (T36 확장)

- 컷오버 직전: 현재 운영 jar 백업(`build/libs/urp-prev.jar`).
- T36 작업 직전: `git tag pre-cutover` 생성.
- 실패 시 즉시 복구: `git checkout pre-cutover -- src/main/resources/static && ./gradlew bootRun`.
- 디바이스/앱 회귀 발견 시 §7.13 스모크 시나리오로 차이 격리 후 롤백.

### 7.12 보안·관측성 (v2 후보)

- Spring Security + 디바이스/앱은 토큰화 또는 클라이언트 인증서.
- HSTS, X-Frame-Options, CSP.
- 프론트 에러 추적(Sentry).
- 실측 데이터 수신 모니터링.
- 환자 PII 로그 스크러빙.

### 7.13 출시 전 스모크 시나리오 (T36/RUNBOOK 첨부)

수동 또는 Postman으로 다음 10단계 모두 통과:

1. `POST /api/v1/measurements/start { patientId:"p001", memo:"smoke" }` → 200, `measurement_Id` 키(대문자 I) 존재.
2. `POST /api/v1/measurements/{id}/data` snake_case 페이로드 → 200.
3. `POST /api/v1/measurements/{id}/stop` → 200, DB의 `endTime` 갱신.
4. `GET /api/v1/patients` → 응답 키 7종(`id`, `patientId`, `name`, `age`, `sex`, `height`, `weight`).
5. `GET /api/v1/patients/p001/measurements` → camelCase 키 4종, `startTime`이 ISO-8601 문자열.
6. `GET /api/v1/measurements/{id}/data` → camelCase + `timeOffsetMs` 오름차순.
7. `POST /api/v1/patients` 신규 → 201.
8. 새 웹: 환자 검색 → 환자 선택 → 세션 선택 → ForceChart 표시 → CSV 다운로드 (헤더 `time_offset_ms,force_n,kg_value`).
9. 다세션 비교: 2개 선택 → 오버레이 차트 + 통계 비교 표.
10. 인쇄 미리보기: 1페이지에 핵심 정보, PII 마스킹 토글 동작.

### 7.14 위험 관리 (보완)

| 위험 | 영향 | 가능성 | 완화 |
|---|---|---|---|
| Jackson 날짜 형식 회귀 | 프론트 파싱 실패 | 낮음 | T07 ISO 정규식 검증 + T30 yml에 `write-dates-as-timestamps:false` 명시 |
| `patientId` DB unique 제약 부재 | 중복 환자 등록 가능 | 중간 | T31의 4xx 매핑 + 프론트 에러 표시 (DB 스키마 변경은 범위 외) |
| 디바이스 단위(kgf 가정) 미검증 | 임상 데이터 정확성 | 중간 | RUNBOOK에 단위 회귀 검증 항목, 펌웨어 팀과 확정 |
| 운영 자격증명 노출 | 보안 | 중간(완화됨) | T30 prod 프로파일이 default 제거 → fail-fast |
| 구버전 vanilla 정적 파일 잔류 | 배포 혼란 | 낮음(완화됨) | T03 Gradle Sync로 자동 정리 |
| 패키지 메이저 점프 | 빌드/런타임 회귀 | 중간 | §7.2 버전 핀 정책 |
| 1만 포인트 이상 차트 성능 | INP 미달 | 중간 | §7.8 LTTB 다운샘플 |
| 진행 중 세션 차트의 stale 데이터 | UX 혼동 | 낮음 | §7.7 명시적 라벨, 자동 폴링 없음 |

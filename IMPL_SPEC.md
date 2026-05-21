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
| 프론트 타입체크 | `cd frontend && corepack pnpm@9.15.9 tsc` |
| 프론트 린트 | `cd frontend && corepack pnpm@9.15.9 lint` |
| 프론트 단위 테스트 | `cd frontend && corepack pnpm@9.15.9 test` |
| 프론트 커버리지 | `cd frontend && corepack pnpm@9.15.9 test:coverage` |
| 프론트 포맷 | `cd frontend && corepack pnpm@9.15.9 format:check` |
| 프론트 빌드 | `cd frontend && corepack pnpm@9.15.9 build` |
| 백엔드 빌드+테스트 | `JAVA_HOME=$HOME/.local/jdks/jdk-17.0.13+11 PATH=$JAVA_HOME/bin:$PATH ./gradlew build` |
| 백엔드 테스트만 | 동일 prefix + `./gradlew test` |
| 백엔드 빠른 테스트(프론트 빌드 생략) | 동일 prefix + `./gradlew test -PskipFrontend` |
| E2E (Phase 4 이후) | `cd frontend && corepack pnpm@9.15.9 e2e` |

**환경 주의:**
- 시스템 JDK가 17 미만이면 Gradle 실행 전에 `JAVA_HOME`을 사용자 로컬 Temurin 17 (`~/.local/jdks/jdk-17.0.13+11`)로 지정한다. CI/운영 환경에는 JDK 17+ 이 별도로 설치되어 있어야 한다 (T34 README/RUNBOOK에 명시).
- 시스템에 글로벌 pnpm이 없는 경우 `corepack pnpm@9.15.9`를 직접 호출. `frontend/package.json`의 `packageManager: "pnpm@9.15.9"` 핀이 동일 버전을 강제한다.

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

**산출물(실제 출하본):**
- `frontend/eslint.config.mjs` — ESLint 9 flat config (예전 `.eslintrc.cjs` 대신). `@typescript-eslint`, `react`, `react-hooks`, `import` 룰셋. `no-console: warn` (테스트 파일 제외). Node-side configs(`vite.config.ts` 등)는 별도 globals 블록.
- `frontend/.prettierrc.json` + `frontend/.prettierignore` — singleQuote, semi 자유, printWidth 100.
- `frontend/vitest.config.ts` — jsdom, setup 파일, **§7.4 커버리지 임계치 적용**.
- `frontend/src/test/setup.ts` — `@testing-library/jest-dom` import + `cleanup()` 자동 호출.
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
  - `spring.datasource.username: ${DB_USERNAME:<legacy>}` (dev에만 default 허용 — Phase 7 구현 시 properties 형태로 분리됨, §8.11 참고)
  - `spring.datasource.password: ${DB_PASSWORD:<legacy>}`
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
Phase 0  [x] T01  [x] T02  [x] T03
Phase 1  [x] T04  [x] T05  [x] T06  [x] T07
Phase 2  [x] T08  [x] T09  [x] T10  [x] T11  [x] T12  [x] T13  [x] T14  [x] T15  [x] T16  [x] T17
Phase 3  [x] T18  [x] T19  [x] T20  [x] T21
Phase 4  [x] T22  [x] T23  [x] T24  [x] T25  [x] T26  [x] T27
Phase 5  [x] T28
Phase 6  [x] T29
Phase 7  [x] T30  [x] T31  [x] T32  [x] T33
Phase 8  [x] T34  [x] T35  [x] T36
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

---

## 8. Plan Review v2 (post-Phase-2, 2026-05-10)

Phase 0–2 종료 후 typescript-reviewer / java-reviewer / security-reviewer 병렬 감사에서 발견·반영된 사항. 매 페이즈 종료 시 동일 리뷰 사이클 반복(`docs/PHASE_REVIEW.md`).

### 8.1 출하본 vs 명세 차이 (drift sync)

| 명세 위치 | 명세 | 실제 출하본 | 처리 |
|---|---|---|---|
| T02 산출물 | `.eslintrc.cjs` | `eslint.config.mjs` (ESLint 9 flat config) | §3 T02 본문 수정됨 |
| T11 산출물 | Translations 타입 inline | 별도 `shared/i18n/types.ts` interface | 의도적; KeyPath 추론 정확도 ↑ |
| T03 효과 | "이 태스크에서는 legacy static 삭제하지 않음" | 첫 빌드에서 Gradle `Sync`가 자동 정리, T36은 검증·커밋만 | §7.14 / T36과 일관성 유지 |
| T13 셸 | `ThemeBridge` 사이드이펙트 훅 | `ThemeProvider` Context (post-review v2 리팩토링) | 리뷰 결과 정식 산출물 변경 |
| T16 셸 | `useT()` 단독 훅 | `LocaleProvider` Context + `useT` 소비자 | 리뷰 결과 정식 산출물 변경 |
| `app/` 트리 | `providers.tsx`, `routes.tsx` | + `pages.tsx`, `ErrorBoundary.tsx`, `__tests__/` | 의도적 추가 |

### 8.2 사전 적용된 Phase 7 항목 (보안 critical/high)

다음은 원래 Phase 7(T30/T33)의 작업이었으나 리뷰에서 보안 risk로 식별되어 본 review 브랜치에서 사전 적용됨:

- **T33 부분**: `MeasurementService.saveDataPoints`의 `(Integer)` 캐스트 → `((Number) ...).intValue()` + null 가드 (Long 진입 시 ClassCastException 회피).
- **T30 부분**:
  - DB 자격증명 → `${DB_USERNAME}` / `${DB_PASSWORD}` 환경변수로 외부화 (legacy 값은 dev fallback으로만 유지).
  - `spring.jpa.show-sql=false` (PII 로그 차단).
  - `spring.jackson.serialization.write-dates-as-timestamps=false` 명시 (Boot 기본 의존 제거).
  - `server.error.{include-message,include-stacktrace,include-binding-errors,include-exception}` 모두 봉쇄.
  - 8행 typo `spring,datasource…` → `spring.datasource…` 수정.

T30 잔여(완전 yml 변환·프로파일 분리·Flyway/마이그레이션·CORS 빈)은 Phase 7에서 그대로 진행. T33 잔여는 본 리뷰에서 모두 처리되어 사실상 완료.

### 8.3 신규 보안 안전장치

- **HTTP 에러 메시지 sanitization** (`shared/lib/http.ts`): 서버가 보낸 임의 메시지를 ApiError.message에 직접 노출하지 않음. 상태 코드 기반 일반화된 한국어 메시지로 매핑하고 원본은 `cause`에만 보존.
- **Production source map**: `vite.config.ts`의 `sourcemap: 'hidden'` — `.map` 파일은 디스크에만 생성, 번들에 `sourceMappingURL` 주석 미포함.

### 8.4 신규 견고성 보강

- **LocaleProvider / ThemeProvider Context**: 동일 탭 컴포넌트 간 상태 동기화 보장. cross-tab 동기화도 `storage` 이벤트로 유지.
- **테스트 격리 강화**: `ApiContractTestBase.clearPersistenceContext()` (Hibernate L1 캐시 evict). 컨트랙트 테스트가 service mutation을 캐시 false-pass로 통과하지 않도록.
- **컨트랙트 테스트 값 단언**: 키 존재(`.exists()`)에서 값 단언(`.value(...)` / `.isNumber()`)으로 강화. 키 rename 회귀를 잡도록.
- **빠른 백엔드 iteration**: `./gradlew test -PskipFrontend` 옵션 (Vite 빌드 생략).
- **Toast aria-label i18n**: `regionLabel` prop으로 외부화, `Providers`가 `t('common.notifications')` 주입.

### 8.5 기존 위험 관리 표 갱신 (§7.14 보완)

- "운영 자격증명 노출" → **(post-review v2 부분 완화)**: `${DB_USERNAME}` / `${DB_PASSWORD}` 적용. 단 git 히스토리에 `<legacy>/<legacy>` (회전 필요)가 평문 잔존하므로 운영 환경은 **즉시 회전** 필요. T34 RUNBOOK에서 수동 단계로 명시.
- "백엔드 내부 메시지 UI 노출" → **신규(완화됨)**: §8.3 HTTP sanitization.
- "운영 source map 공개" → **신규(완화됨)**: §8.3 hidden sourcemap.
- "useT/useTheme cross-component desync" → **신규(완화됨)**: §8.4 Provider Context.
- "Hibernate L1 캐시 false-pass" → **신규(완화됨)**: §8.4 clearPersistenceContext.

### 8.6 리뷰 사이클 정식화

매 phase 머지 직후 다음 사이클 실행:

1. `review/post-phase-N` 브랜치 분기 (main에서)
2. typescript-reviewer / java-reviewer / security-reviewer 병렬 호출
   (해당 phase에 변경이 없는 reviewer는 생략 가능 — §8.7 참고)
3. CRITICAL/HIGH 발견 사항 즉시 수정, MEDIUM은 가능한 범위에서, LOW는 최소 명시
4. IMPL_SPEC drift sync (실제 출하본과 명세 일치)
5. 모든 게이트 그린 검증 (§1.6)
6. main 머지 → 다음 phase 분기

체크리스트: `docs/PHASE_REVIEW.md` (단독 문서). 본 절은 결과 추적용.

---

## 8.7 Plan Review v3 (post-Phase-3, 2026-05-11)

Phase 3 (T18–T21, 환자 관리) 머지 후 typescript-reviewer + security-reviewer 병렬 감사. **Phase 3는 백엔드 변경 0이라 java-reviewer 생략** — `docs/PHASE_REVIEW.md §3` 정책에 따라 해당 phase에 변경이 없는 reviewer는 건너뛸 수 있다.

### 8.7.1 적용된 fix (HIGH + MEDIUM)

| Severity | 영역 | 내용 |
|---|---|---|
| HIGH | schema | `PatientSchema.sex`를 `z.string()` → `z.enum(['male','female','other'])`. 라운드트립 type-safety 회복; 백엔드 drift는 422 ApiError로 surface |
| HIGH | PatientList state | `onNext`를 순수 함수형(`p => p + 1`)으로 — 닫힘된 `view.totalPages` 의존 제거. `paginate()` clamp가 안전망 |
| MEDIUM | a11y | Skeleton 컨테이너 `aria-hidden="false"` (no-op) → `role="status"` + `aria-live="polite"` + `aria-label=loading` |
| MEDIUM | 검증 | `zodIssuesToFieldErrors`가 unkeyed issue를 silently drop하던 경로 → 일반 에러 배너(role="alert")로 surface |
| MEDIUM | PII | `PatientRegisterForm` name `autoComplete="name"` → `"off"`; 숫자 필드(age/height/weight)에 명시적 `"off"` 추가 (공유 임상 워크스테이션의 browser autofill 방지) |
| MEDIUM | XSS-adjacent | `PatientDetail`이 URL-derived `patientId`를 `EmptyState`에 반사하던 경로 → `/^[A-Za-z0-9_-]{1,32}$/` clamp |
| MEDIUM | 라우팅 정확성 | `NotFoundPage`가 `window.location.pathname` 사용 → `useLocation().pathname` (MemoryRouter 테스트 정확성) |
| LOW | 문서 | `EmptyState.description` JSDoc에 unsanitized HTML 금지 안내 |

### 8.7.2 Deferred (검증 필요)

- **`useCreatePatientMutation` signal 전달**: typescript-reviewer가 제안한 `mutationFn: (input, { signal }) => ...` 시그니처는 TanStack Query v5의 공식 API와 일치하지 않음. v5 mutation은 `mutationFn: (variables) => Promise<TData>` 단일 인자. 별도 PR에서 v5 문서 재확인 후 결정 (필요 시 명시적 AbortController 패턴 도입).
- **PatientList Modal의 `keepMounted` 가능성**: 현재 Modal은 `isOpen=false`일 때 unmount되므로 form state도 reset됨. 향후 성능 최적화로 keepMounted 채택 시 명시적 reset 필요 — Phase 4 진입 시 재평가.

### 8.7.3 Carry-over (다음 phase로 전달)

- TanStack Query v5의 mutation signal 패턴 검증 (위 8.7.2)
- ESLint typed-aware rules(`no-unnecessary-type-assertion`, `no-unsafe-argument`) 도입 검토 (post-Phase-2 LOW에서 보류)
- 가끔 1-test flake가 시작 시 baseline 측정 중 발생, 재실행 시 사라짐 — Phase 4 차트 테스트 추가 시점에 server.use 격리 재검토

---

## 8.8 Plan Review v4 (post-Phase-4, 2026-05-15)

Phase 4 (T22~T27, 세션·차트) 머지 후 typescript-reviewer + security-reviewer 병렬 감사. Phase 4는 백엔드 변경 0이라 java-reviewer 생략.

### 8.8.1 적용된 fix (HIGH + MEDIUM)

| Severity | 영역 | 내용 |
|---|---|---|
| HIGH | ChartJS | `chartSetup.ts`에 `Title` 플러그인 등록 — 운영 tree-shake 빌드에서 axis title이 silently 미렌더되던 회귀 차단 |
| HIGH | LTTB tail-bias | `lib/downsample.ts`: 마지막 bucket이 length 0으로 collapse될 때 (0,0) anchor로 인해 늦은 피크가 손실되던 boundary case를 nearest-in-range fallback으로 교체 |
| HIGH | query key 충돌 | `useMeasurements.ts`: disabled 상태에 `__disabled__` sentinel key 사용 — 가설적 실제 `''` patientId / `-1` measurementId와 cache 충돌 차단 |
| HIGH | CSV revoke race | `exportCsv.ts`: `URL.revokeObjectURL`을 `setTimeout(..., 0)`으로 deferred — Safari/Firefox 다운로드 drop 방지 |
| MEDIUM | CSV 정밀도 | `force_n`을 `toFixed(6)`로 — 화면 툴팁(2자리)과 일관, 정밀도 손실 없음 |
| MEDIUM | SessionDetail error | 세 쿼리 OR 대신 per-query 정밀 — stale-cache가 살아있는 쿼리는 폴백으로 덮어쓰지 않음 |
| LOW | i18n | `SessionDetail`/`SessionList`의 한국어 하드코딩 6건을 `session.detail.*` / `session.list.{emptyHint,noMemo}` 키로 라우팅 |
| LOW | Phase 5 contract | `SessionList.tsx` `?ids=` 빌더에 향후 compare 페이지 parser 컨트랙트(정규식 + ≤4 cap) JSX 주석 박제 |

### 8.8.2 Deferred / Carry-over

- TanStack Query v5 mutation signal 패턴 (post-Phase-3 §8.7.2 이월) — Phase 7 또는 별도 PR.
- ESLint typed-aware rules — post-Phase-2 LOW에서 이월, 여전히 미반영.
- MSW `listSessionsReturning`/`getDataPointsReturning` builder가 path param 무시 — 테스트 격리 한정 이슈로 Phase 5 compare 작업 시 같이 보강.
- 단일 샘플 SummaryStats 케이스는 추가 완료 (단 reviewer가 지적한 `??` redundancy는 방어 코드로 유지).

---

## 8.9 Plan Review v5 (post-Phase-5, 2026-05-15)

Phase 5 (T28, SessionCompare) 머지 후 typescript + security 병렬 감사. backend 변경 0이라 java-reviewer 생략.

### 8.9.1 적용된 fix

| Severity | 영역 | 내용 |
|---|---|---|
| HIGH | session metadata | CompareLoader의 4-슬롯 useSessionsQuery 패턴이 환자 #5+ 소유 세션의 메타데이터를 silently drop — 카운터 부재 시 fallback이 `#id`로 떨어지는 점을 명시적 주석으로 박제 (실 fix는 backend `GET /api/v1/measurements/:id` 도입 필요, §8.9.2 carry-over) |
| MEDIUM | parser | 새 `countValidIdSegments()`로 `1,abc,xyz,foo,bar` 같은 garbage-heavy 입력에서 too-many 오분류 차단 |
| MEDIUM | render churn | `series` 배열 빌더를 useMemo로 이동 (early-return 위로 옮겨 rules-of-hooks 만족) — OverlayChart prop identity 안정화 |
| LOW | dead prop | CompareLoader의 미사용 `label` prop 제거 |
| LOW | DoS hardening | `compareIds.ts` 파서가 `split(',').slice(0, MAX*4)`로 segment 수 상한 |

### 8.9.2 Carry-over (다음 phase로 전달)

- **Backend `GET /api/v1/measurements/:id` 신설 (v2)** — SessionCompare가 환자 목록을 스캔하지 않고 직접 메타데이터를 조회할 수 있도록. Phase 5의 4-환자 cap을 제거하는 유일한 정공법.
- 이전 carry-over (TanStack Query mutation signal, ESLint typed-aware rules)는 그대로 이월.

---

## 8.10 Plan Review v6 (post-Phase-6, 2026-05-18)

Phase 6 (T29 — print stylesheet + PII 마스킹 토글) 머지 후 typescript + security 병렬 감사. backend 변경 0이라 java-reviewer 생략.

### 8.10.1 적용된 fix

| Severity | 영역 | 내용 |
|---|---|---|
| HIGH | PiiMaskProvider | `setEnabled`/`toggle`의 localStorage write 실패 시 state-storage 불일치 — state 먼저 갱신 후 storage write, dev-only `console.warn` 으로 사일런트 실패 가시화 |
| HIGH | maskName | UTF-16 code-unit length 사용 → supplementary plane(이모지 등) 문자에서 dot 개수 오류; `Array.from()`+grapheme-aware indexing 으로 교정 |
| HIGH | print.css | `ErrorFallback` 의 retry `<button>` 이 `.btn` 클래스 없음 → 인쇄 시 노출; `[role="alert"] button` 추가로 차단. `@page { margin: 1.5cm }` 명시 |
| HIGH | http.ts | schema-failure `ApiError.message` 가 path를 inline(`Response failed schema validation for GET /api/v1/patients/p001/...`) → ErrorFallback/스크린샷에서 PII 유출; generic 422 메시지로 통일, path는 `cause` only |
| MEDIUM | maskName | NFC normalize + zero-width(ZWSP/ZWJ/RTL marks/BOM) strip — "보이지 않는 첫 글자"가 visible-first 위치 점유하는 회피 패턴 차단 |
| MEDIUM | schema | `CreatePatientSchema.name` 에 NFC normalize + zero-width strip + min(1) — whitespace-only/invisible-only 입력이 빈 카드로 렌더되는 회피 차단 |
| MEDIUM | i18n | PatientList/PatientDetail의 잔존 하드코드 한글(이전/다음, 정렬옵션, 검색 placeholder, "환자를 찾을 수 없습니다" 등) → `settings.*` 추가하던 흐름에 맞춰 `patient.list.*` 9개 키 신설 |
| MEDIUM | a11y | SettingsPage의 `role="radiogroup"` + `<button aria-pressed>` 조합은 ARIA 위반 (`radiogroup` 은 `role="radio"` 자식 필요) → `role="group"` 으로 수정 |
| MEDIUM | tests | "마스킹 켜졌을 때 DOM이 실제로 마스킹된다" integration 테스트가 없어 mask 분기 회귀가 무감지될 수 있었음 — PatientList에 1건 추가 |
| LOW | docs | `providers.tsx` JSDoc이 Phase-2 provider 순서를 그대로 둠 → Phase-6 순서(ErrorBoundary > QueryClient > Theme > Locale > PiiMask > Toast) 로 갱신 |
| LOW | UX | piiMaskHint 에 "브라우저 인쇄 옵션의 머리글/바닥글 OFF" 안내 추가 — `@page` CSS로 URL header를 막을 수 없는 브라우저 한계를 운영자에게 가시화 |
| LOW | tests | storage 이벤트 `newValue === null` (다른 탭의 removeItem) 케이스 명시 테스트 추가 |

### 8.10.2 Carry-over (Phase 7로 전달)

- **DB credentials (`<legacy>/<legacy>`) git 히스토리에 평문 잔존** — Phase 7 T30이 `application.properties` 의 fallback literal을 제거하고 §8.11이 `application-dev.properties` 도 .example shim로 분리했지만 git history는 영구. 배포 전 자격증명 로테이션 필수.
- **`SessionList` 링크 href 의 raw `patientId`** — 라우팅에 필수라 렌더는 보존. 브라우저 인쇄 시 URL header에 등장하는 점은 piiMaskHint로 운영자에게 안내. 추가 완화는 운영 LAN trust 모델에 위임.
- **MEDIUM의 SessionList/SessionCompare 잔존 하드코드 한글(Phase 5 이전부터)** — 본 사이클에서는 PatientList/Detail만 정리. SessionList 의 "선택한 N개 비교" 등은 Phase 8 polish 시 묶어서.
- 이전 carry-over (TanStack Query mutation signal, ESLint typed-aware rules, backend `GET /api/v1/measurements/:id`) 모두 그대로 이월.

---

## 8.11 Plan Review v7 (post-Phase-7, 2026-05-18)

Phase 7 (T30/T31/T32/T33 backend hardening) 머지 후 typescript + java + security 3-trio 병렬 감사 (java reviewer는 Phase 2 이후 첫 재투입).

### 8.11.1 적용된 fix

| Severity | 영역 | 내용 |
|---|---|---|
| CRITICAL | 자격증명 | `application-dev.properties` 가 추적되어 `<legacy>/<legacy>` 평문이 두 번째 commit으로 박힘 — `git rm --cached` + `.gitignore` + 분리된 `application-dev.properties.example` 템플릿 (`REPLACE_WITH_LOCAL_DB_USER`/`REPLACE_WITH_LOCAL_DB_PASSWORD` placeholder) |
| HIGH | exception handling | `IOException`(ClientAbortException/EofException) 핸들러 추가 — WARN level, 스택트레이스 없음 (정상 네트워크 이벤트) |
| HIGH | exception handling | `AsyncRequestTimeoutException` → 503 (이전엔 generic Exception → 500으로 흘러감) |
| HIGH | exception handling | `DataIntegrityViolationException` → 409 (concurrent duplicate patientId 같은 race를 500이 아닌 conflict로 표시) |
| HIGH | input validation | `saveDataPoints` 가 null array entry / 비-Number 값에서 NPE/CCE → 500 으로 흘렀던 경로를 명시적 `IllegalArgumentException`(400)으로 차단 |
| MEDIUM | logging | `handleIllegalArgument`가 메시지 전문(patientId 포함) WARN log → "(message suppressed for PII)"로 축약. `handleUnreadableBody` 도 `ex.getMostSpecificCause().getClass().getSimpleName()`만 |
| MEDIUM | CorsConfig | 데드 `origins == null` 분기 제거 — `@Value` 빈 default는 항상 `""` |
| MEDIUM | tests | 새 `GlobalExceptionHandlerTest` (2건): `@MockitoBean` 으로 service stub해서 500 fallback + 409 DataIntegrity envelope 직접 검증. PII 토큰 미포함 assertion |
| MEDIUM | tests | `PatientApiContractTest` raw assert → AssertJ `assertThat`, `doesNotContain("message"/"path")` 강화 + 새 `saveDataPoints_malformedPayload` 케이스 (attacker 토큰이 envelope에 표출 안 되는지) |
| MEDIUM | tests | `http.test.ts` 에 새 sanitized envelope (`{status,error,timestamp}`) 모킹 케이스 추가 — 백엔드 envelope 변화에 frontend cause 처리가 깨지지 않음을 박제 |
| LOW | docs | `WEB_REBUILD_PLAN.md §2.1` / `IMPL_SPEC.md §6.1`의 `smartbiomed` 평문 리터럴 → `<legacy>` 치환. 컨텍스트는 유지하되 working tree에서는 secret 제거 |

### 8.11.2 Carry-over (Phase 8로 전달)

- **자격증명 실제 로테이션** — git 히스토리의 `<legacy>` 노출은 영구이므로 운영 DB의 비밀번호를 변경하지 않으면 본 작업은 "구성 노출 차단"만 달성. T34 RUNBOOK.html에 운영자 수동 단계로 명시할 것.
- **CORS `allowedMethods` 에 PUT/DELETE 추가 여부** — 본 phase의 frozen contract는 GET/POST만 사용. Phase 8에서 새 엔드포인트 도입 시 같이 확장.
- **422 핸들러는 현재 unreachable code** — `@Valid` + Bean Validation 어노테이션이 dto에 없음. Phase 8 polish에서 `CreatePatientSchema` 와 동치인 backend `PatientDto` 어노테이션을 추가하면 핸들러가 활성화됨.
- 이전 carry-over (TanStack mutation signal, ESLint typed-aware rules, backend `GET /api/v1/measurements/:id`, SessionList href patientId 노출, SessionList 잔존 하드코드 ko 한글) 모두 그대로 이월.

---

## 8.12 Plan Review v8 (post-Phase-8, 2026-05-18) — FINAL

Phase 8 (T34/T35/T36 — docs + CI + cutover) 머지 후 typescript + java + security 3-trio 최종 감사. 본 review가 v2.0 release readiness 의 마지막 게이트.

### 8.12.1 적용된 fix

| Severity | 영역 | 내용 |
|---|---|---|
| HIGH | i18n | SessionList의 "선택한 N개 비교" 버튼 라벨 + 체크박스 aria-label, PatientRegisterForm의 patientId hint 등 잔존 ko 한글 3건을 i18n으로 migration. `session.list.compareSelected`, `session.list.compareSelectAria`, `patient.register.patientIdHint` 신설 (`{count}`/`{id}` 간이 치환). 영어 locale에서 더이상 한글 노출 없음 (스크린리더 a11y 회귀 차단 포함) |
| HIGH | backend | `Patient.patientId` 에 `@Column(unique=true)` 추가 — 동시 POST race로 인한 duplicate 행 생성 차단. 이미 GlobalExceptionHandler가 DataIntegrityViolation → 409로 매핑하므로 추가 변경 없이 정상 동작 |
| HIGH | backend | `MeasurementService` 의 모든 read 메서드에 `@Transactional(readOnly=true)` 명시 — Hibernate dirty-check skip / flush skip 최적화 활성화 |
| MEDIUM | backend | 중복된 method-level `@Transactional` (saveDataPoints / stopMeasurement / createPatient) 제거 — 클래스 default와 일치하므로 노이즈만 추가했음 |
| MEDIUM | backend | `Collectors.toList()` → `.toList()` (Java 17 immutable form) — `import java.util.stream.Collectors` 도 함께 제거 |
| MEDIUM | backend | `GlobalExceptionHandler.handleEntityNotFound` 도 다른 핸들러와 동일하게 `ex.getMessage()` 대신 클래스명만 로그 (내부 스키마 노출 차단) |
| MEDIUM | backend | `MeasurementRepository` 의 dead `Limit` import, `DataPointRepository` 의 dead `DataPointDto` import 제거 |
| MEDIUM | backend | `MeasurementController.startMeasurements` 의 stale 주석 (`{ measurement_id }` 소문자) → `{ measurement_Id }` (대문자 I, 동결 컨트랙트 일치) 수정 |
| LOW | CI | `ubuntu-latest` floating tag 노트 + first-party action SHA pin 권장 사항은 단일-노드 클리닉 LAN 배포의 trust 모델 하에 acceptable trade-off (외부 contributor 없음). 변경 없음, 의사결정만 기록 |
| LOW | docs | top-level `README.md` 가 API 명세만 담고 있던 형태 → 프로젝트 entrypoint 형태로 리뉴얼 (한눈에 보기 / 문서 안내 / 빠른 시작 / 검증 게이트 / 보안 메모). 기존 API 명세는 `docs/API.md` 로 분리 |

### 8.12.2 항목별 carry-over (v2 / 운영자 / 영구)

| 항목 | 분류 | 상태 |
|---|---|---|
| 자격증명 로테이션 (`<legacy>/<legacy>`) | 운영자 작업 | `docs/RUNBOOK.html §3` 가 절차 박제. 코드 fallback 없음 (T30) + .example shim 분리 (§8.11). git 히스토리는 영구. |
| Backend `GET /api/v1/measurements/:id` | v2 endpoint | SessionCompare 4-환자 cap의 정공법 해결. 카운터에 주석 박제. |
| TanStack Query mutation signal 통일 | v2 / dev ergonomics | useMutation onSuccess + 콜사이트 콜백 split-brain 문제. 현재 functional, 미래 multi-consumer 시 footgun. |
| ESLint typed-aware rules | dev ergonomics | parserOptions.project 미설정. 사이드 이펙트 lint rule 비활성. |
| SessionList href 의 raw patientId | 운영자 instruction | 라우팅에 필수. piiMaskHint 가 인쇄 시 헤더/푸터 OFF 안내. |
| CORS `allowedMethods` PUT/DELETE 확장 | v2 | 현재 사용 엔드포인트 없음. 추가 시 함께. |
| 422 handler unreachable | v2 (DTO @Valid 도입 시 활성화) | 핸들러는 대기, validation 어노테이션 도입 시 자동 동작. |
| Backend entity-on-wire (H1) | v2 refactor | `Patient` 엔티티가 직접 직렬화됨. contract 테스트가 필드를 lock하므로 누설 즉시 빨강. 구조적으로는 DTO로 분리하는 게 깔끔하나 v2 scope. |
| `ddl-auto=update` | v2 (Flyway/Liquibase 마이그레이션 도입 시) | 임상 환경에서는 단점이 명확하나 단일-노드 + git 관리 schema 진화로는 동작 중. |

### 8.12.3 완성 선언

- **백엔드**: 22 backend tests green, sanitized envelope 박제, fail-fast 자격증명, unique constraint.
- **프론트엔드**: 235 frontend tests green, 6 locale + PII + print 게이트 통과, 한글 잔존 0건.
- **빌드/배포**: gradle build 통과, bootJar 가 SPA 패키징, GitHub Actions CI 운영.
- **문서**: README/RUNBOOK/PROGRESS_REPORT HTML + API/RUNBOOK MD mirror.
- **carry-over**: 모두 v2 또는 운영자 작업으로 분류, ship에 영향 없음.

**프로젝트 v2.0 완성 (`v2.0-final` 태그).**

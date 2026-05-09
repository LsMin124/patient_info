# 환자 근력 측정 웹 리빌드 분석 & 계획

> 대상 레포: `patient_info` (Spring Boot 3.5.7 + 정적 SPA)
> 핵심 제약: **앱과 디바이스의 변경 불가** → 백엔드의 HTTP 와이어 계약은 동결.
> 작성일: 2026-05-09

---

## 1. 목표 요약

- **앱·디바이스가 사용하는 REST 인터페이스는 100% 호환 유지.**
- **웹 클라이언트(`src/main/resources/static/*`)는 전면 재구성.**
- 백엔드는 **계약을 깨지 않는 범위**에서 안정성/보안/관측성만 보강.
- 산출물: 새 웹 앱 + 최소한의 백엔드 안전망 + 운영용 기본 문서.

---

## 2. 현재 시스템 인벤토리

### 2.1 백엔드 (그대로 유지)

| 항목 | 내용 |
|---|---|
| 런타임 | Java 17, Spring Boot 3.5.7 |
| ORM | Spring Data JPA, Hibernate (`ddl-auto=update`) |
| DB | MariaDB `patientinfo`, 계정 `smartbiomed/smartbiomed` (소스에 하드코딩) |
| 도메인 | `Patient`, `Measurement`, `DataPoint` |
| API prefix | `/api/v1` |
| 정적 호스팅 | `src/main/resources/static/` 에서 SPA 서빙 |

### 2.2 프론트엔드 (전면 재작성 대상)

| 항목 | 라인 수 | 상태 |
|---|---|---|
| `index.html` | 49 | 단일 페이지, 인라인 컨트롤 |
| `app.js` | 274 | 등록 + 조회 + 차트가 한 파일에 혼재, 섹션 주석 중복 |
| `style.css` | 72 | 디자인 토큰 없음, 반응형 부재 |
| Chart.js | CDN | SRI 없음, 오프라인 시 깨짐 |
| 빌드 시스템 | 없음 | 번들러/린터/타입체커 없음 |

---

## 3. 동결 계약 (Frozen Contract)

> **이 계약은 디바이스/앱이 의존하므로 키 이름·타입·구조를 절대 변경하지 않는다.**
> 새 웹은 이 계약을 그대로 소비한다. 백엔드 정리 작업도 이 표를 깨뜨릴 수 없다.

| Method | Path | Request | Response (핵심 필드) |
|---|---|---|---|
| GET | `/api/v1/patients` | – | `Patient[]` — `id`, `patientId`, `name`, `age`, `sex`, `height`, `weight` (엔티티 직렬화) |
| POST | `/api/v1/patients` | `PatientDto` JSON | `Patient` (HTTP 201) |
| POST | `/api/v1/measurements/start` | `{ "patientId": "...", "memo": "..." }` | `{ "measurement_Id": <Long> }` ← **대문자 I 그대로** |
| POST | `/api/v1/measurements/{id}/data` | `[{ "time_offset_ms": int, "kg_value": number }, ...]` | 200 OK (body 없음) |
| POST | `/api/v1/measurements/{id}/stop` | – | 200 OK |
| GET | `/api/v1/patients/{patientId}/measurements` | – | `MeasurementSummaryDto[]` — `measurementId`, `startTime`, `endTime`, `memo` |
| GET | `/api/v1/measurements/{id}/data` | – | `DataPointDto[]` — `timeOffsetMs`, `kgValue` |

**유의사항(설계 부채지만 깨면 안 되는 부분):**
- `start` 응답 키가 `measurement_Id` (snake_case + 대문자 `I`).
- 데이터 적재 페이로드만 snake_case (`time_offset_ms`, `kg_value`), 조회 응답은 camelCase (`timeOffsetMs`, `kgValue`) — 일관성 없음.
- `GET /patients`는 엔티티(PK `id` 포함)를 그대로 반환.
- 인증/인가 없음 — 디바이스/앱이 무인증으로 호출 중.
- `LocalDateTime` 필드(`startTime`, `endTime`)는 Spring Boot 기본 Jackson 설정에 따라 **ISO-8601 문자열** (`"2025-11-01T10:30:00"`) 로 직렬화됨. `endTime`은 측정 진행 중일 때 `null`. `memo`도 디바이스가 미설정 시 `null`. 이 형식·null 가능성은 새 웹의 zod 스키마와 계약 테스트(T07)에서 함께 보호한다.

---

## 4. 현재 웹 문제점 (재작성 근거)

### 4.1 코드 품질
- 단일 파일 274줄, 등록 폼 코드가 섹션 주석을 복붙해 중복 표기.
- 빌드/번들/타입체크/린트 없음 → 회귀 방지 수단 부재.
- DOM 조회와 비즈니스 로직, 이벤트 바인딩이 한 스코프에 혼재.

### 4.2 UX / 임상 사용성
- 환자 선택이 `<select>` 단 하나 — 50명만 넘어도 사용 불가.
- 세션 비교 불가 (한 번에 1세션만 차트 표시).
- 측정 결과 요약 통계 없음(피크 힘, RFD, 도달시간, 좌우 비대칭 등).
- 측정 데이터 CSV/PDF 내보내기 불가 → 임상 보고에 사용 못 함.
- 차트 X축 `max: 5000` 하드코딩 → 5초 초과 세션은 잘림.
- `alert()` 기반 에러 표시.
- `register-status` 외에 토스트/인라인 검증 없음.
- 메모(memo) 표시·편집 위치 없음.
- 세션 날짜 범위 필터 없음.
- 등록 폼: age/height/weight를 텍스트로 받아서 그대로 전송 → 서버가 Float/Integer 컬럼에서 런타임 실패.

### 4.3 접근성·반응형·디자인
- ARIA, 라벨 연결, 포커스 관리 없음.
- 320–768px 영역에서 입력 필드/차트가 가로로 흘러내림.
- 디자인 토큰 부재(색·여백·타이포). 일반 부트스트랩 템플릿 인상.
- 다크모드/대비 고려 없음 → 임상 환경(밝은 진료실/어두운 실습실) 모두 부적합.

### 4.4 보안·운영
- API URL이 `http://119.194.17.62:8080`로 하드코딩 (HTTP, IP, 평문).
- Chart.js CDN을 SRI 없이 로드.
- 콘솔 로그가 운영에 그대로 노출 (`console.error`).
- 인증 부재 → 같은 LAN에서 누구나 환자 PII 열람·등록 가능.
- DB 자격증명을 소스 트리에 평문 저장.
- `application.properties` 8행 오타: `spring,datasource.driver-class-name` (콤마). 현재는 JDBC URL 자동감지로 묻혀 있지만 결함.

### 4.5 관측성
- 사용자 흐름/에러 트래킹 없음.
- 실측 데이터가 정상적으로 도착했는지 확인할 수단이 차트 시각 점검뿐.

---

## 5. 백엔드 비파괴 보강 (권장, 선택 가능)

> **모두 응답 바디·키·HTTP 시맨틱을 보존**한다. 디바이스/앱은 영향 없음.

1. `application.properties` → `application.yml`로 변환 + 오타 수정.
2. DB 자격증명을 환경변수로 이동 (`SPRING_DATASOURCE_USERNAME`, `…_PASSWORD`).
3. `@RestControllerAdvice`로 `IllegalArgumentException`을 `400`으로 매핑 (현재 500).
4. `CorsConfigurationSource` 빈으로 새 웹 오리진만 허용 (디바이스/앱은 동일 호스트라 무영향).
5. `application-dev.yml`/`application-prod.yml` 분리, `ddl-auto=validate` (운영) + 마이그레이션 도구(Flyway) 도입.
6. `MeasurementService.saveDataPoints`에서 `(Integer)` 캐스팅을 `((Number)...).intValue()` 로 변경 (Long 안전성).
7. `PatientRepository.findByPatientId` 결과의 PII 노출을 줄이기 위해 **새 응답 DTO를 추가하지 말고**, 향후 `/api/v2`를 도입할 때 같이 정리.
8. JUnit 5 + MockMvc + Testcontainers로 컨트롤러 계약 테스트 작성 — 동결 계약을 회귀로부터 보호.
9. `spring.jpa.show-sql=false` (운영), Logback JSON 로거 도입.
10. `/actuator/health`, `/actuator/info` 노출(인증 게이트 뒤).

---

## 6. 새 웹 아키텍처 제안

### 6.1 스택 권장안 (3가지 옵션)

| | A. **React + Vite + TS** _(권장)_ | B. SvelteKit + TS | C. 바닐라 TS + Vite |
|---|---|---|---|
| 학습 곡선 | 낮음 (생태계 ↑) | 중간 | 가장 낮음 |
| 컴포넌트 재사용 | 매우 좋음 | 좋음 | 직접 구성 필요 |
| 차트 라이브러리 | `react-chartjs-2`, `recharts`, `visx` | `chartjs-svelte`, 직접 wrapping | Chart.js 직접 |
| 테스트 | Vitest + Playwright 표준 | Vitest + Playwright | Vitest + Playwright |
| 추천 이유 | 임상 대시보드 사례 다수, 테이블/차트/모달 컴포넌트 풍부 | 번들 사이즈 작음, 성능 ↑ | 의존성 최소, 배포 단순 |

기본 권장 = **옵션 A** (React 19 + Vite 6 + TS 5 + TanStack Query + Chart.js via `react-chartjs-2`).

### 6.2 호스팅 옵션

| | 1. Spring Boot `/static`에 빌드 산출물 카피 _(권장)_ | 2. 별도 정적 호스팅 (Nginx/S3) + 백엔드는 API만 |
|---|---|---|
| CORS | 필요 없음 | 필요 |
| 배포 | `./gradlew build` 한 번에 끝 | 두 파이프라인 운영 |
| 캐시 | 수동 | CDN |
| 리빌드 작업량 | 작음 | 큼 |

기본 권장 = **옵션 1**. `frontend/` 디렉터리에서 Vite 빌드 → `dist/` 산출물을 Gradle `processResources`에서 `src/main/resources/static/`로 복사.

### 6.3 디렉터리 구조 제안

```
patient_info/
├─ build.gradle
├─ src/main/java/...                # 그대로
├─ src/main/resources/
│   └─ static/                      # frontend 빌드 산출물 자동 배치 (커밋 제외)
└─ frontend/
    ├─ package.json
    ├─ vite.config.ts
    ├─ tsconfig.json
    ├─ index.html
    ├─ public/
    └─ src/
        ├─ main.tsx
        ├─ app/
        │   ├─ routes.tsx
        │   └─ providers.tsx          # QueryClient, Theme, Error boundary
        ├─ features/
        │   ├─ patients/
        │   │   ├─ api.ts             # GET /patients, POST /patients
        │   │   ├─ schema.ts          # zod
        │   │   ├─ PatientList.tsx
        │   │   ├─ PatientRegisterForm.tsx
        │   │   └─ usePatients.ts
        │   └─ measurements/
        │       ├─ api.ts
        │       ├─ schema.ts
        │       ├─ SessionList.tsx
        │       ├─ SessionDetail.tsx
        │       ├─ SessionCompare.tsx
        │       ├─ ForceChart.tsx
        │       ├─ SummaryStats.tsx
        │       └─ exportCsv.ts
        ├─ shared/
        │   ├─ ui/                   # Button, Input, Select, Modal, Toast
        │   ├─ hooks/
        │   ├─ lib/                  # http client, env, formatters
        │   └─ tokens.css            # 색·간격·타이포 토큰
        └─ styles/
            ├─ global.css
            └─ reset.css
```

### 6.4 데이터 흐름 / 상태 관리

- **서버 상태**: TanStack Query (캐싱·재시도·SWR).
- **URL 상태**: 환자ID·세션ID·날짜 범위는 쿼리스트링.
- **클라이언트 상태**: 로컬 useState, 글로벌 store 불필요.
- **검증**: zod 스키마로 폼 + API 응답 모두 파싱.
- **HTTP 클라이언트**: `fetch` 얇은 래퍼 + `AbortController`. axios 도입은 보류.

### 6.5 디자인 방향

- 의료/대시보드 톤: **Swiss / 정보 밀도 높음**, 대비 명확, 라이트 디폴트 + 다크 옵션.
- 디자인 토큰(`--color-*`, `--space-*`, `--text-*`) CSS 변수로 정의.
- 차트는 단색 강조 + 그리드 약화, Y축 단위는 **N(뉴턴)** 고정. 백엔드 `kgValue`(kg-force)는 클라이언트에서 `N = kgValue × 9.80665`로 변환해 표시 (계약 무손상).

---

## 7. 기능 명세 (새 웹)

### 7.1 페이지 / 라우트
1. `/` — 대시보드: 최근 세션 5개, 환자 검색.
2. `/patients` — 환자 목록(검색·페이지네이션·정렬), 신규 등록 모달.
3. `/patients/:patientId` — 환자 상세 + 세션 타임라인 + 요약.
4. `/patients/:patientId/sessions/:measurementId` — 세션 상세, 차트, 통계, CSV 다운로드.
5. `/sessions/compare?ids=…` — 다세션 오버레이 비교.
6. `/settings` — API 베이스 URL, 언어(KR/EN), 다크모드. (단위는 **N 고정**, 토글 제공 안 함)

### 7.2 핵심 기능
- 환자 검색(이름·ID 부분일치, 클라이언트 사이드 + 향후 서버 페이징).
- 세션 다중 선택 → 차트 오버레이 비교.
- 통계: 피크(N), 평균(N), RFD(N/s, 0–100ms / 100–200ms), 시간-피크(ms), 면적·impulse(N·s). 모든 표시는 **N 단위**, 변환 상수 `KGF_TO_N = 9.80665`를 단일 모듈에서 관리.
- CSV 내보내기 (브라우저 다운로드).
- 인쇄용 보고서 시트 (`@media print`).
- 에러 토스트 + 폼 인라인 검증.
- i18n 토글(KR 기본, EN 보조).

### 7.3 비기능 요구
- LCP < 2.5s, INP < 200ms (rules/ecc/web/performance.md 준수).
- 오프라인 차트 라이브러리 번들(CDN 의존 제거).
- 타입체크 0 에러, ESLint 0 경고, 단위 테스트 80%+, 핵심 플로우 Playwright E2E.

---

## 8. 단계별 로드맵

> 모든 단계 종료 후 `./gradlew build`가 그린이어야 함. 디바이스/앱 회귀 테스트는 Postman 컬렉션으로.

| Phase | 기간 | 산출물 |
|---|---|---|
| **0. 기반 마련** | 0.5d | `frontend/` Vite+React+TS 스캐폴드, ESLint, Prettier, Vitest, Playwright, Gradle 통합 |
| **1. 계약 보호망** | 0.5d | 백엔드 컨트롤러 계약 테스트(MockMvc) — 7개 엔드포인트 모두 키·타입 검증 |
| **2. UI 토큰·셸** | 0.5d | 디자인 토큰, 레이아웃 셸, 라우터, 에러 바운더리, Toast |
| **3. 환자 관리** | 1d | `/patients` 목록·검색·페이지네이션, 등록 폼(zod 검증) |
| **4. 세션 조회·차트** | 1d | 세션 목록, 차트(가변 X축), 통계 패널, CSV 내보내기 |
| **5. 세션 비교** | 0.5d | 다중 선택 오버레이 |
| **6. 인쇄/보고서** | 0.5d | print 스타일, 환자 PII 마스킹 옵션 |
| **7. 백엔드 비파괴 보강** | 0.5d | §5의 1·2·3·4·6 항목 |
| **8. 운영화** | 0.5d | Logback JSON, 환경 분리, README/RUNBOOK, GitHub Actions(빌드·테스트·아티팩트) |
| **9. 마이그레이션 컷오버** | 0.5d | 기존 `static/*` 제거, 새 빌드 산출물 검증, 스모크 테스트 |

총 추정 5–6일 (1인 풀타임 기준).

---

## 9. 잔존 위험·장기 과제

### A. 단위 변환 정확성
백엔드 `kgValue`는 kg-force, 표시는 N. `N = kgValue × 9.80665`를 `shared/lib/units.ts` 한 곳에서만 정의하고 모든 차트·통계·CSV가 이를 통과. 단위 회귀를 막기 위한 단위 변환 단위 테스트 필수.

### B. 동결 계약의 일관성 결함은 v2 과제로 보류
`measurement_Id` 대문자, snake/camel 혼용 등은 디바이스 펌웨어가 의존. 새 웹은 그대로 따르고, 향후 `/api/v2`에서 정돈.

### C. 인증 부재
지금은 무인증, 임상 PII가 노출됨. 디바이스/앱이 무인증 의존이라 즉시 도입 불가 → **장기 항목**으로 v2와 함께.

### D. 측정 시작/종료 트리거는 디바이스/앱에만 위임
새 웹은 **읽기 전용**으로 확정. `/start`·`/stop`·`/data` POST는 호출하지 않으며, 향후 임상 운영자용 관리자 모드가 필요해지면 별도 기능 플래그로만 노출.

---

## 10. 확정된 결정사항

| # | 항목 | 결정 |
|---|---|---|
| 1 | 프론트 스택 | **React 19 + Vite 6 + TS 5 + TanStack Query + zod + react-chartjs-2** |
| 2 | 호스팅 | **Spring Boot 동일 오리진** — `frontend/` Vite 빌드 산출물을 `src/main/resources/static/`로 카피. CORS 불필요 |
| 3 | 단위 | **N(뉴턴) 고정**. `KGF_TO_N = 9.80665` 단일 모듈, UI 토글 없음 |
| 4 | 측정 시작/종료 | **읽기 전용** — 새 웹은 `/start`·`/data`·`/stop`을 호출하지 않음 |
| 5 | 백엔드 비파괴 보강(§5) 포함 항목 | 1·2·3·4·6·8 (yml 변환 + 오타 수정, env 자격증명, `IllegalArgumentException`→400, CORS 빈, `Number.intValue()` 캐스팅, MockMvc 계약 테스트) |
| 6 | 보강 보류 항목 | §5의 5(Flyway)·7(v2 DTO 정리)·9(Logback JSON)·10(Actuator 게이트) — v2 작업 시 함께 |
| 7 | 디자인 톤 | Swiss/대시보드, 라이트 디폴트 + 다크 옵션, 디자인 토큰 CSS 변수 |
| 8 | 언어 | KR 기본, EN 옵션 (i18n 추상화 처음부터) |

---

## 11. 다음 단계

Phase 0 착수 준비 완료. 사용자 컨펌 시 다음 순서로 진행:

1. **Phase 0** — `frontend/` 스캐폴드, ESLint·Prettier·Vitest·Playwright, Gradle `processResources` 통합, `.gitignore` 갱신.
2. **Phase 1** — 백엔드 MockMvc 계약 테스트 7개 (동결 계약 보호망).
3. **Phase 2 이후** — §8 로드맵대로 진행.

> `/plan` 규칙에 따라 코드는 사용자 컨펌 후에만 작성합니다.
> 진행 신호: "go" / "yes" / "Phase 0 시작" 등.

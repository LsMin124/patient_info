# patientInfo

> 환자 근력측정 디바이스의 임상 모니터링 웹.
> Spring Boot 3.5.7 (Java 17) + React 19 / Vite 6 SPA. 클리닉 LAN 내부 배포 전제.

[![CI](https://github.com/LsMin124/patient_info/actions/workflows/ci.yml/badge.svg)](https://github.com/LsMin124/patient_info/actions/workflows/ci.yml)

---

## 한눈에 보기

- **백엔드** — `src/main/java/com/project/urp/` — JPA 엔티티 3개 (Patient / Measurement / DataPoint),
  단일 컨트롤러, 단일 서비스, `@RestControllerAdvice` 기반 sanitized 에러 envelope.
- **프론트엔드** — `frontend/` — TypeScript strict, TanStack Query, Zod 와이어 검증, Chart.js,
  Vitest + MSW 테스트, Locale/Theme/PiiMask Provider 스택.
- **빌드** — `./gradlew build` 한 번으로 SPA 빌드 → `src/main/resources/static/`에 동기화 → bootJar에 패키징.
- **동결 와이어 컨트랙트** — `measurement_Id` (대문자 I), 인제스트는 snake_case, 응답은 camelCase, **인증 없음**.
  디바이스 펌웨어/Flutter 앱과 합의된 형태이므로 절대 깨면 안 됨. 자세히는
  [`WEB_REBUILD_PLAN.md §3`](WEB_REBUILD_PLAN.md).

## 문서 안내

| 대상 | 문서 | 비고 |
|---|---|---|
| **새 팀원 (Java/Spring 처음)** | [`docs/manual/index.html`](docs/manual/index.html) | 8장 온보딩 튜토리얼 — 설치 → 코드 이해 → 작업 → 배포 → 트러블슈팅. GitHub Pages 활성화 시 `/manual/` 경로로 공개. |
| 처음 보는 사람 | [`docs/README.html`](docs/README.html) | 프로젝트 개요·기능·구조·실행 가이드 (HTML) |
| 운영자 | [`docs/RUNBOOK.html`](docs/RUNBOOK.html) | 배포·자격증명 로테이션·트러블슈팅 (HTML) |
| AI / dev 검색용 | [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | RUNBOOK의 텍스트 미러 |
| 진행 상황 | [`docs/PROGRESS_REPORT.html`](docs/PROGRESS_REPORT.html) | phase별 마일스톤 시각화 |
| 디바이스 API 명세 | [`docs/API.md`](docs/API.md) | 동결 와이어 컨트랙트 (디바이스/앱 합의분) |
| 구현 명세 + 리뷰 trail | [`IMPL_SPEC.md`](IMPL_SPEC.md) | §8 = phase별 review 결과 |
| 전략 / 결정 | [`WEB_REBUILD_PLAN.md`](WEB_REBUILD_PLAN.md) | §3 = 동결 컨트랙트 본문 |
| phase 리뷰 체크리스트 | [`docs/PHASE_REVIEW.md`](docs/PHASE_REVIEW.md) | 매 phase 종료 시 다중 리뷰어 호출 절차 |

> 사람 대상 문서는 HTML로, AI/grep 대상 문서는 Markdown으로 — 두 형태가 의도적으로 분리되어 있습니다.

## 빠른 시작 (로컬 dev)

```bash
# 1) 로컬 dev 자격증명 파일 (gitignored) 만들기 — 단 한 번
cp src/main/resources/application-dev.properties.example \
   src/main/resources/application-dev.properties
# REPLACE_WITH_LOCAL_DB_USER / _PASSWORD 두 줄을 본인 MariaDB에 맞게 수정

# 2) 프론트 dev 서버 (Vite, HMR, http://localhost:5173)
cd frontend
corepack pnpm@9.15.9 install
corepack pnpm@9.15.9 dev

# 3) 백엔드 (dev 프로파일)
JAVA_HOME=$HOME/.local/jdks/jdk-17.0.13+11 PATH=$JAVA_HOME/bin:$PATH \
SPRING_PROFILES_ACTIVE=dev \
./gradlew bootRun -PskipFrontend=true

# 4) 풀빌드 = CI 동일 게이트 (TSC / lint / vitest / vite build + gradle test + bootJar)
JAVA_HOME=$HOME/.local/jdks/jdk-17.0.13+11 PATH=$JAVA_HOME/bin:$PATH \
./gradlew build
```

**운영 환경**(=dev 프로파일 아님)은 `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` env 변수가 반드시 필요합니다.
fallback이 제거되어 미설정 시 부팅이 실패합니다 — 의도된 fail-fast 보호 (Phase 7 T30).

## 검증 게이트

| 게이트 | 명령 | 통과 기준 |
|---|---|---|
| 프론트 타입 | `pnpm tsc` | 0 errors |
| 프론트 lint | `pnpm lint` | 0 errors / 0 warnings |
| 프론트 format | `pnpm exec prettier --check .` | clean |
| 프론트 테스트 | `pnpm test` | 235/235 (Vitest + MSW) |
| 프론트 번들 | `pnpm build` | ~165 KB gzipped |
| 백엔드 빌드+테스트 | `./gradlew build` | 22/22 (h2 contract tests) |
| 전체 CI | `.github/workflows/ci.yml` | 푸시·PR마다 자동 실행 |

## 데모 배포 (Fly.io)

Phase 9에서 추가된 인터넷 데모용 환경. **실 PII 절대 금지** — 동결 컨트랙트에 인증이 없어 URL을 아는 누구나 환자 등록/측정 데이터 위조가 가능합니다. 시연/내부 테스트 외 용도 불가.

- **URL**: `https://patient-info-demo.fly.dev` (초기 `fly apps create` 단계에서 이름이 충돌하면 `fly.toml` + 이 줄을 같이 갱신)
- **호스팅**: Fly.io Tokyo (nrt) 리전, shared-cpu-1x / 1 GB, auto-stop 활성 → 대기 시 ~$0
- **DB**: Fly Managed Postgres (별도 머신, 1 GB 볼륨)
- **자동 배포**: main push → GitHub Actions `deploy` job → `flyctl deploy --remote-only` (FLY_API_TOKEN 시크릿 필요)
- **수동 종료**: `fly scale count 0 --app patient-info-demo` (완전 OFF, $0)

상세 절차/트러블슈팅: [`docs/RUNBOOK.html §9`](docs/RUNBOOK.html#fly) (또는 [`docs/RUNBOOK.md §9`](docs/RUNBOOK.md)).

## 보안 / PII 메모

- **자격증명 로테이션 필수** — 레거시 `<legacy>/<legacy>` 가 git 히스토리에 평문으로 영구히 박혀 있습니다.
  코드 fallback은 Phase 7에서 제거되었지만, 같은 비밀번호를 쓰는 DB 인스턴스가 있다면 즉시 로테이션이 필요합니다.
  절차는 [`docs/RUNBOOK.html §3`](docs/RUNBOOK.html).
- **에러 envelope sanitization** — 모든 4xx/5xx 응답은 `{ status, error, timestamp }` 형태로,
  exception 메시지·request path·patient ID 가 절대 노출되지 않습니다.
- **PII 마스킹 토글** — 설정 페이지(`/settings`)에서 환자 이름/ID 마스킹을 켜면 시연/스크린샷/인쇄에 안전.
  브라우저 인쇄 시에는 다이얼로그의 "머리글/바닥글"도 OFF 해야 URL에 환자 ID가 노출되지 않음.

## 라이선스

이 저장소는 임상 환경 단일-노드 배포를 목적으로 작성된 사내 사용 코드입니다.
외부 공개 시에는 동결 컨트랙트와 보안 carry-over (특히 자격증명 로테이션)를 반드시 먼저 처리하세요.

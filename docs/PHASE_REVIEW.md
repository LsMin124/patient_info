# Phase Review Checklist

> 매 phase 브랜치 머지 직후 새 review 브랜치에서 실행. 첫 적용: post-Phase-2 (2026-05-10).
> 상위 명세: `IMPL_SPEC.md §8.6`. 결과 trail은 `IMPL_SPEC.md §8.x` 또는 신규 `§N` 추가.

---

## 0. 트리거

- 직전 phase 브랜치가 main에 머지된 직후
- 다음 phase 브랜치 분기 **전**

## 1. 브랜치 생성

```bash
git checkout main
git pull --ff-only origin main   # 원격 동기화 후
git checkout -b review/post-phase-N
```

## 2. 다중 시각 리뷰 (병렬)

**reviewer 3개 동시 호출** — 한 메시지에 모두 launch.

| reviewer | 범위 |
|---|---|
| `typescript-reviewer` | `frontend/` TS/React 변경분, 테스트 커버리지 갭, 타입 안전성, 상태/race |
| `java-reviewer` | `src/` 백엔드 변경분, 테스트 격리, h2/MariaDB 호환성, build.gradle |
| `security-reviewer` | 양쪽 cross-cutting — 자격증명/PII/error leak/소스맵/dep 위생 |

각 reviewer 프롬프트 템플릿: `IMPL_SPEC.md §5` 위임 프롬프트 + phase별 산출물 목록 + 직전 머지 SHA range (`git diff main~1..main --stat`).

## 3. 발견 사항 분류 / 처리

| Severity | 처리 |
|---|---|
| CRITICAL | 본 리뷰 브랜치에서 즉시 수정. main 머지 차단 사유. |
| HIGH | 본 리뷰 브랜치에서 수정. 다음 phase 시작 전 머지. |
| MEDIUM | 본 리뷰에서 가능한 범위에서. 다음 phase에 반영해도 됨 (단 IMPL_SPEC에 명시). |
| LOW / 문서 | 최소 IMPL_SPEC §8.x에 기록. 코드 fix는 선택. |

**Phase 7 보안 작업 사전 적용 정책:** 보안 CRITICAL/HIGH는 origin phase가 7이라도 즉시 적용. T30/T33이 부분 완료된 경우 §8.2에 기록.

## 4. 문서 동기화

본 리뷰에서 반드시 수행:

- [ ] `IMPL_SPEC.md` drift 점검 (산출물·디렉토리 트리·검증 명령) — 다른 점은 §8 (또는 §N) 표로 기록
- [ ] 새 보안 안전장치는 §8.3 / §7.14 위험 관리 표에 추가
- [ ] 새 견고성 보강은 §8.4에 추가
- [ ] 본 리뷰가 사전 적용한 future-phase 작업은 §8.2에 기록
- [ ] `WEB_REBUILD_PLAN.md`는 결정/계약 문서이므로 통상 수정 없음. 단 동결 계약 변경 시(거의 없음) §3 보강.

## 5. 수정 commit 분할

표준 commit 순서(권장):

1. `fix(security): …` — credentials / sanitization / sourcemap 등 critical
2. `fix(<area>): …` — 핵심 버그 (HIGH 발견)
3. `test(<area>): …` — 테스트 갭/격리 강화
4. `chore: …` — 픽스처 sanitization / lint config 등
5. `docs: …` — IMPL_SPEC drift sync + (필요 시) 새 §N 추가 + 본 PHASE_REVIEW 갱신

## 6. 검증 게이트 (모두 그린이어야 머지)

`IMPL_SPEC.md §1.6` 표 전체 + 다음:

- [ ] `corepack pnpm@9.15.9 tsc` — 0 errors
- [ ] `corepack pnpm@9.15.9 lint` — 0 errors / 0 warnings
- [ ] `corepack pnpm@9.15.9 format:check` — clean
- [ ] `corepack pnpm@9.15.9 test` — 모든 테스트 통과
- [ ] `corepack pnpm@9.15.9 test:coverage` — §7.4 임계치 만족 (lines 80, branches 75)
- [ ] `corepack pnpm@9.15.9 build` — 번들 사이즈 budget 내 (현재 250kB 대 — Phase 4 이후 차트 추가 시 재평가)
- [ ] `corepack pnpm@9.15.9 e2e` — Phase 4 이후 적용
- [ ] `JAVA_HOME=… ./gradlew build` — 백엔드 + 프론트 통합 빌드
- [ ] `JAVA_HOME=… ./gradlew test` — 모든 컨트랙트 테스트 그린
- [ ] `git status` — 의도한 파일만 변경됨

## 7. main 머지

```bash
git checkout main
git merge --no-ff review/post-phase-N -m "$(cat <<'EOF'
Merge branch 'review/post-phase-N'

Post-Phase-N review cycle (typescript + java + security)
- Critical/High fixes
- Test isolation/coverage hardening
- IMPL_SPEC drift sync (§8.N)
EOF
)"
```

## 8. 다음 phase 분기

```bash
git checkout -b phase/(N+1)-<topic>
```

본 PHASE_REVIEW 체크리스트는 다음 phase 종료 시 다시 호출됨.

---

## 8.1 결과 추적

| 회차 | 시작 | 머지 SHA | reviewer 호출 | 적용된 fix 카테고리 | IMPL_SPEC 절 |
|---|---|---|---|---|---|
| post-Phase-2 | 2026-05-10 | 951e374 | typescript / java / security | 자격증명 외부화, Number 캐스트, sourcemap hidden, Locale/Theme Context, http sanitization, EM clear, 값 단언, Modal/Toast 테스트, fixture 가명화 | `IMPL_SPEC.md §8` |
| post-Phase-3 | 2026-05-11 | 0de65d1 | typescript / security (java 생략 — backend 변경 0) | PatientSchema.sex enum 정렬, PatientList 함수형 setPage, Skeleton a11y(`role="status"`), zod 일반 에러 배너, autoComplete='off' 클리닉 PII 보호, PatientDetail URL clamp, NotFound `useLocation`, EmptyState JSDoc | `IMPL_SPEC.md §8.7` |
| post-Phase-4 | 2026-05-15 | a88a3c8 | typescript / security (java 생략 — backend 변경 0) | ChartJS `Title` 등록, LTTB tail-bias fix, query-key `__disabled__` sentinel, CSV revoke 지연(Safari/Firefox), force_n toFixed(6), SessionDetail per-query 에러 정밀화, 세션 i18n 키 6건, Phase 5 parser contract 박제 | `IMPL_SPEC.md §8.8` |
| post-Phase-5 | 2026-05-15 | 33f9bc1 | typescript / security (java 생략 — backend 변경 0) | CompareLoader 환자-슬롯 cap 명시 + carry-over, `countValidIdSegments` 신설로 too-many 오분류 차단, OverlayChart series useMemo, dead `label` prop 제거, compareIds DoS 하드닝(segment cap) | `IMPL_SPEC.md §8.9` |
| post-Phase-6 | 2026-05-18 | 65c3444 | typescript / security (java 생략 — backend 변경 0) | PiiMaskProvider atomic write + dev warn, maskName grapheme-aware + NFC/ZW strip, http.ts schema-fail message PII-safe, print.css `@page` + role="alert" 버튼 차단, PatientList/Detail i18n migration(9 keys), SettingsPage role="radiogroup" → role="group", PatientList masked-DOM integration test 추가, CreatePatientSchema name NFC+ZW guard | `IMPL_SPEC.md §8.10` |
| post-Phase-7 | 2026-05-18 | 13d5590 | typescript / java / security (3-trio 첫 재투입) | `application-dev.properties` 추적 해제 + .example 템플릿, GlobalExceptionHandler에 IOException/AsyncTimeout/DataIntegrity 추가, IllegalArgumentException 로그에서 PII 제거, saveDataPoints null/비-Number 가드, CorsConfig 데드 null 분기 제거, 새 `GlobalExceptionHandlerTest`(500/409 envelope), `PatientApiContractTest` AssertJ + 새 malformed-payload 케이스, `http.test.ts` sanitized envelope 케이스 추가, docs/IMPL_SPEC 평문 `<legacy>` 치환 | `IMPL_SPEC.md §8.11` |
| post-Phase-8 (FINAL) | 2026-05-18 | b9973de | typescript / java / security (3-trio 최종) | 잔존 ko 한글 3건 i18n migration(`session.list.compareSelected/SelectAria`, `patient.register.patientIdHint`), Patient.patientId UNIQUE 제약, MeasurementService 읽기 메서드 `@Transactional(readOnly=true)`, 중복 `@Transactional` 제거, `.toList()` 마이그레이션, EntityNotFound 로그 PII 제거, dead imports 제거, stale `measurement_id` 주석 수정, top-level README 리뉴얼 + `docs/API.md` 분리 | `IMPL_SPEC.md §8.12` |

> 매 phase 종료 시 위 표에 1행 추가.

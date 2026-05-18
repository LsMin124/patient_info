# RUNBOOK (AI-facing mirror)

> Human-facing canonical: `docs/RUNBOOK.html`.
> This file is the searchable/greppable mirror for AI agents and CLI workflows. Keep both in sync.

## 1. Preflight
- JDK 17 (Temurin 17.0.13+), MariaDB 10.6+, Node 20.x, pnpm 9.15.9 via corepack.
- Clinic-LAN trust model. No auth layer. Do NOT expose to the public internet.

## 2. Deploy
1. Build: `./gradlew build` → `build/libs/urp-*.jar` (includes built SPA).
2. Set env on the target host (NO fallbacks — fail-fast is intentional, Phase 7 T30):
   - `DB_URL=jdbc:mariadb://<db-host>:3306/patientinfo?useSSL=true&serverTimezone=Asia/Seoul`
   - `DB_USERNAME=<rotated_user>`
   - `DB_PASSWORD=<rotated_secret>`
   - `CORS_ALLOWED_ORIGINS=https://<web-host>` (empty for same-origin).
3. Run: `java -jar build/libs/urp-0.0.1-SNAPSHOT.jar` (or systemd).
4. Health: `curl /api/v1/patients` returns 200 JSON array. `curl /api/v1/patients/__noop__/measurements` returns 404 `{status,error,timestamp}` with NO id in body.

## 3. Credential rotation (REQUIRED carry-over from Phase 7 §8.11)
Legacy `<legacy>/<legacy>` is permanently in git history. Rotate if the same password is still in use:
1. `ALTER USER '<old>'@'%' IDENTIFIED BY '<new>';` then `FLUSH PRIVILEGES;`.
2. Update host env `DB_PASSWORD`.
3. Restart service. Confirm `HikariPool-1 - Start completed` and re-run health checks.
4. Eventually `DROP USER '<old>'@'%';`.

## 4. Profiles
- **(none)** = prod: env-only, same-origin CORS.
- `dev`: `SPRING_PROFILES_ACTIVE=dev` — uses gitignored `application-dev.properties` (copy from `.example`); Vite 5173 CORS allowed.
- `test`: `@ActiveProfiles("test")` — h2 in-memory, no CORS.

Dev setup:
```bash
cp src/main/resources/application-dev.properties.example \
   src/main/resources/application-dev.properties
# edit REPLACE_WITH_LOCAL_DB_USER / _PASSWORD
```

## 5. Smoke
- `/` returns SPA index.
- `/api/v1/patients` JSON array.
- `/settings` toggles persist across reload.
- `/patients/:id/sessions/:mid` renders chart + stats; CSV download works.
- PII masking on hides names + IDs in list/detail.
- Print preview hides chrome; browser print dialog must have "Headers and footers" OFF to suppress URL exposure.

## 6. Troubleshooting (most-common)
| Symptom | Cause | Action |
|---|---|---|
| `Could not resolve placeholder 'DB_USERNAME'` | env missing under prod profile | export the 3 DB vars and restart |
| All API 500 | DB unreachable | check Hikari log, firewall, host/port |
| SPA assets 404 | bootJar built without frontend | rerun `./gradlew bootJar` (no `-PskipFrontend`) |
| CORS error on API | CORS_ALLOWED_ORIGINS unset | add SPA origin to CSV, restart |
| patientId visible in printed page footer | browser headers/footers print option ON | disable it in the print dialog (no CSS fix) |
| Compare with >4 sessions blocked | `MAX_COMPARE_IDS=4` by design | see IMPL_SPEC §8.9 |

## 7. Backup
```bash
0 3 * * * mariadb-dump --single-transaction patientinfo | gzip > /var/backups/patientinfo/$(date +\%F).sql.gz
```
Restore: `gunzip -c <file>.sql.gz | mariadb patientinfo`.

## 8. Rollback
Swap jar symlink / systemd ExecStart back, restart, re-run health checks. `ddl-auto=update` only adds columns; destructive schema changes need a manual migration script.

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

## 9. Fly.io demo deployment (Phase 9)
**Demo only — NO real PII.** Frozen contract has no auth; anyone who finds the URL can forge measurements. Internal testing / live demos only.

### 9.1 One-time setup
1. `curl -L https://fly.io/install.sh | sh` then `fly auth login`
2. `fly apps create patient-info-demo --org personal` (update `fly.toml` `app` if the name is taken)
3. Postgres: `fly postgres create --name patient-info-demo-db --region nrt --vm-size shared-cpu-1x --volume-size 1` then `fly postgres attach patient-info-demo-db --app patient-info-demo`
4. Map Fly's `DATABASE_URL` (postgres://...) into our `DB_URL` (jdbc:postgresql://...) via `fly secrets set DB_URL=... DB_USERNAME=postgres DB_PASSWORD=...`
5. `fly secrets set CORS_ALLOWED_ORIGINS=https://patient-info-demo.fly.dev`
6. CI auto-deploy: `fly tokens create deploy --app patient-info-demo --expiry 8760h` → add as GitHub `FLY_API_TOKEN` secret

### 9.2 First manual deploy
```bash
fly deploy --remote-only
fly status && fly logs
open https://patient-info-demo.fly.dev
```

### 9.3 Subsequent deploys
Auto on `git push origin main` via `.github/workflows/ci.yml` `deploy` job (after frontend + backend gates pass). Manual deploy with the command above is always available.

### 9.4 Cost / shutdown
| Action | Command | Cost |
|---|---|---|
| Idle (auto-sleep) | none — `auto_stop_machines = "stop"` in `fly.toml` | ~$0 idle, <$2/mo with demo traffic |
| Full off | `fly scale count 0 --app patient-info-demo` | $0 (Postgres volume only) |
| Postgres off too | `fly machine stop --app patient-info-demo-db <id>` | $0 (volume storage only, ~$0.15/GB/mo) |
| Destroy everything | `fly postgres destroy patient-info-demo-db` then `fly apps destroy patient-info-demo` | $0 |

Enable usage alerts at fly.io/dashboard → Billing → Usage Alerts ($5/$10 thresholds) as a safety net.

### 9.5 Troubleshooting
| Symptom | Cause | Action |
|---|---|---|
| health check 60s timeout → restart loop | Postgres handshake + Hibernate ddl-auto too slow | raise `grace_period` to 90s in `fly.toml`, redeploy |
| API 503, SPA loads | missing/malformed DB secret | `fly secrets list`; verify `DB_URL` starts with `jdbc:postgresql://` |
| ~10s cold start | auto-stop wake-up | normal; `curl` once before a demo to warm |
| Actions deploy `failed to fetch` | `FLY_API_TOKEN` missing/expired | regenerate via 9.1#6 and update GitHub secret |

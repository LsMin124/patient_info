#!/bin/sh
# Container entrypoint. Bridges Fly.io's libpq-style DATABASE_URL into the
# DB_URL/DB_USERNAME/DB_PASSWORD env vars that application.properties reads,
# THEN exec's the JVM.
#
# Doing this in the shell (before java starts) avoids Spring Boot
# EnvironmentPostProcessor packaging quirks: in an executable bootJar, files
# under src/main/resources/META-INF/spring/ get promoted to the jar's root
# META-INF/ rather than landing under BOOT-INF/classes/, so the .imports SPI
# never registers our DatabaseUrlEnvironmentPostProcessor at runtime. The
# Java post-processor stays as belt-and-braces (and is unit-tested), but the
# operational truth on Fly is this script.
#
# No-op when DB_URL is already set explicitly (dev/Pi profile uses MariaDB).
set -eu

if [ -z "${DB_URL:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
    case "$DATABASE_URL" in
        postgres://*|postgresql://*)
            url=$DATABASE_URL
            # scheme://user:pass@host[:port]/db[?query]
            without_scheme=${url#*://}
            creds=${without_scheme%%@*}
            remainder=${without_scheme#*@}
            user=${creds%%:*}
            pass=${creds#*:}
            DB_URL="jdbc:postgresql://${remainder}"
            DB_USERNAME=$user
            DB_PASSWORD=$pass
            export DB_URL DB_USERNAME DB_PASSWORD
            # Log structure only (NEVER the password). Length helps confirm
            # the secret was actually injected without leaking it to the log.
            echo "[entrypoint] DATABASE_URL -> DB_URL=${DB_URL%%\?*} DB_USERNAME=${DB_USERNAME} DB_PASSWORD=*** (len=${#DB_PASSWORD})"
            ;;
        *)
            echo "[entrypoint] DATABASE_URL present but not postgres:// — leaving untouched"
            ;;
    esac
fi

exec java -jar /home/spring/app.jar "$@"

# syntax=docker/dockerfile:1.7
#
# patientInfo · multi-stage Docker build for Fly.io demo deployment.
# Stages:
#   1) frontend — node:20-alpine + pnpm 9.15.9 → frontend/dist
#   2) backend  — eclipse-temurin:17 + gradle bootJar (frontend pre-staged so
#                 frontendSync is skipped; the produced jar packages the SPA)
#   3) runtime  — eclipse-temurin:17-jre minimal layer with just the fat jar
# ---------------------------------------------------------------------------

FROM node:20-alpine AS frontend
WORKDIR /app/frontend
# corepack ships with Node 20; pinning the exact pnpm version matches CI + dev.
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
# Lockfile-first install for cache reuse.
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build
# Output: /app/frontend/dist (index.html + assets/*)

FROM eclipse-temurin:17-jdk-jammy AS backend
WORKDIR /app
# Gradle wrapper + build script + source — keep .dockerignore aligned.
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
COPY src ./src
# Pre-stage the built SPA into the location Spring Boot serves from.
# frontendSync would overwrite this on a fresh checkout, but we pass
# -PskipFrontend=true so processResources copies straight into the jar.
COPY --from=frontend /app/frontend/dist ./src/main/resources/static
RUN chmod +x ./gradlew \
    && ./gradlew bootJar -PskipFrontend=true --no-daemon \
    && mv build/libs/*.jar /app/app.jar

FROM eclipse-temurin:17-jre-jammy AS runtime
# Non-root for runtime hygiene even though the Fly.io container is short-lived.
RUN useradd --system --create-home --uid 10001 spring
WORKDIR /home/spring
COPY --from=backend --chown=spring:spring /app/app.jar /home/spring/app.jar
# Bridge Fly's DATABASE_URL → DB_URL/DB_USERNAME/DB_PASSWORD (libpq → JDBC).
# See docker/entrypoint.sh for the rationale (bootJar META-INF/spring quirk).
COPY --chown=spring:spring --chmod=0755 docker/entrypoint.sh /home/spring/entrypoint.sh
USER spring
# Defaults set here; Fly.io overrides via fly secrets (DB_*, CORS_ALLOWED_ORIGINS).
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
ENTRYPOINT ["/home/spring/entrypoint.sh"]

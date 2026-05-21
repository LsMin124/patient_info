package com.project.urp.config;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Translates Fly.io's {@code DATABASE_URL} (postgres://user:pass@host[:port]/db?...)
 * into the {@code DB_URL}/{@code DB_USERNAME}/{@code DB_PASSWORD} env vars our
 * {@code application.properties} placeholders read. Runs before placeholder
 * resolution, so the existing config keeps working with no template change.
 *
 * No-op when:
 *   - {@code DB_URL} is already set (explicit env / dev profile wins)
 *   - {@code DATABASE_URL} is absent (tests, local non-Fly runs)
 *   - {@code DATABASE_URL} is not a postgres:// URL (defensive)
 *
 * Registered via {@code META-INF/spring/org.springframework.boot.env.EnvironmentPostProcessor.imports}.
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication app) {
        // Explicit override path wins. Pi/dev profile keeps using its own
        // MariaDB DB_URL exactly as before.
        if (env.getProperty("DB_URL") != null) {
            return;
        }
        String raw = env.getProperty("DATABASE_URL");
        if (raw == null || raw.isBlank()) {
            return;
        }
        // Accept both `postgres://` (libpq style) and `postgresql://` (JDBC-like)
        // prefixes — Fly emits the former.
        if (!raw.startsWith("postgres://") && !raw.startsWith("postgresql://")) {
            return;
        }

        URI uri;
        try {
            uri = new URI(raw);
        } catch (URISyntaxException ex) {
            // Leave DB_URL unset so Spring's placeholder resolution fails fast
            // with a clear error rather than us silently swallowing the parse
            // problem and letting Hikari emit a more confusing connection error.
            return;
        }

        String userInfo = uri.getUserInfo();
        if (userInfo == null) {
            return;
        }
        int colon = userInfo.indexOf(':');
        if (colon < 0) {
            return;
        }
        String user = userInfo.substring(0, colon);
        String pass = userInfo.substring(colon + 1);

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            return;
        }
        int port = uri.getPort() == -1 ? 5432 : uri.getPort();
        String path = uri.getPath() == null ? "" : uri.getPath();

        StringBuilder jdbc = new StringBuilder("jdbc:postgresql://")
                .append(host)
                .append(':')
                .append(port)
                .append(path);
        String query = uri.getRawQuery();
        if (query != null && !query.isEmpty()) {
            jdbc.append('?').append(query);
        }

        Map<String, Object> derived = new HashMap<>();
        derived.put("DB_URL", jdbc.toString());
        derived.put("DB_USERNAME", user);
        derived.put("DB_PASSWORD", pass);
        // addFirst so derived values take precedence over later .properties scans
        // but still lose to system env / cmdline (which would have set DB_URL
        // directly and short-circuited this whole method above).
        env.getPropertySources().addFirst(new MapPropertySource("flyDatabaseUrl", derived));
    }
}

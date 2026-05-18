package com.project.urp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS configuration for the JSON API. The Spring Boot app also serves the
 * built SPA assets under the same origin, so CORS only matters when the
 * Vite dev server (or a future split frontend deployment) talks to the
 * {@code /api/**} endpoints.
 *
 * Allowed origins are sourced from {@code app.cors.allowed-origins} —
 * comma-separated, no spaces. The default in {@code application.properties}
 * is empty (production posture: same-origin only). The `dev` profile
 * (application-dev.properties) seeds the Vite dev server origins.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public CorsConfig(@Value("${app.cors.allowed-origins:}") String origins) {
        // Split + trim. Empty / whitespace-only entries are dropped so a
        // bare property value (the production default) yields no origins
        // instead of a single empty string that would match nothing.
        this.allowedOrigins = origins == null || origins.isBlank()
                ? new String[0]
                : java.util.Arrays.stream(origins.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toArray(String[]::new);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (allowedOrigins.length == 0) {
            return; // production same-origin posture; no CORS headers added.
        }
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("Content-Type", "Accept")
                .maxAge(3600);
    }
}

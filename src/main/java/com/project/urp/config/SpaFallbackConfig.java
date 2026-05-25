package com.project.urp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Forwards every non-API, non-asset GET to {@code /index.html} so React Router
 * (the SPA's client-side router) takes over.
 *
 * The frontend defines these top-level routes (see {@code app/routes.tsx}):
 *   /                                                      (Dashboard)
 *   /patients
 *   /patients/{patientId}
 *   /patients/{patientId}/sessions/{measurementId}
 *   /sessions/compare        (?ids=A,B[,C[,D]])
 *   /settings
 *   *                        (NotFoundPage)
 *
 * Without these forwards, a direct hit on /patients hits Spring, matches no
 * controller, falls through to GlobalExceptionHandler's NoResourceFoundException
 * handler, and returns a JSON 404 envelope — defeating the SPA.
 *
 * We deliberately do NOT add a wildcard for /api/** (that path stays under
 * MeasurementController + GlobalExceptionHandler) and we don't touch paths
 * that contain a dot (e.g. /favicon.ico, /assets/index-*.js) — those keep
 * going through Spring Boot's auto-configured static resource handler.
 *
 * Path pattern semantics:
 *   "/{path:[^\\.]*}"          — single segment with no dot   (e.g. /patients)
 *   "/{path:[^\\.]+}/**"       — multi-segment, first segment dotless
 *                                 (e.g. /patients/p001, /sessions/compare)
 */
@Configuration
public class SpaFallbackConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/{path:[^\\.]*}").setViewName("forward:/index.html");
        registry.addViewController("/{path:[^\\.]+}/**").setViewName("forward:/index.html");
    }
}

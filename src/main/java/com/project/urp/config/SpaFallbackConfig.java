package com.project.urp.config;

import java.io.IOException;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * SPA fallback for the React Router routes (/patients, /sessions/compare,
 * /settings, …). The previous {@code addViewController("/{path:[^\\.]+}/**")}
 * approach also matched {@code /assets/index-XXX.js} (first segment is
 * dotless), returning HTML in place of the JS bundle and producing a black
 * screen.
 *
 * Resource-resolver pattern instead: for each requested path under "/**",
 *   1. If a real file exists under classpath:/static/, serve it
 *      (index.html, favicon.ico, assets/index-*.js, assets/index-*.css …).
 *   2. If the path starts with "api/", return null so it falls through to
 *      MeasurementController + GlobalExceptionHandler (JSON envelope).
 *   3. Otherwise, serve /static/index.html so React Router takes over.
 *
 * Reach is intentionally limited to GETs that Spring's static-resource
 * handling already processes — POST /api/v1/measurements/start etc. are
 * not touched.
 */
@Configuration
public class SpaFallbackConfig implements WebMvcConfigurer {

    private static final ClassPathResource SPA_INDEX = new ClassPathResource("/static/index.html");

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new SpaPathResolver());
    }

    private static final class SpaPathResolver extends PathResourceResolver {
        @Override
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
            Resource requested = location.createRelative(resourcePath);
            if (requested.exists() && requested.isReadable()) {
                return requested;
            }
            // /api/** is owned by controllers + GlobalExceptionHandler.
            if (resourcePath.startsWith("api/")) {
                return null;
            }
            // Black-screen guard: a path whose final segment contains a "."
            // (e.g. /assets/index-XXX.js, /favicon.ico) is a file request.
            // Returning the SPA shell here would have the browser load HTML
            // in place of JS/CSS and the SPA would never bootstrap. Let
            // these 404 naturally instead.
            int lastSlash = resourcePath.lastIndexOf('/');
            String last = lastSlash >= 0 ? resourcePath.substring(lastSlash + 1) : resourcePath;
            if (last.contains(".")) {
                return null;
            }
            return SPA_INDEX;
        }
    }
}

package com.project.urp.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.project.urp.support.ApiContractTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Pins the SPA fallback wiring (SpaFallbackConfig).
 *
 * Without it, a refresh on /patients (or any deep SPA route) would land on
 * GlobalExceptionHandler.handleNoResource and return a JSON 404 envelope,
 * breaking React Router. A naïve fallback (e.g. ViewControllerRegistry with
 * a "first segment dotless" pattern) also matches /assets/index-XXX.js and
 * returns index.html in place of the JS bundle — the user-visible symptom
 * is a black screen because the SPA never bootstraps.
 *
 * The current SpaPathResolver:
 *   - returns the actual file when one exists under classpath:/static/
 *     (index.html, favicon.ico, /assets/*.js, /assets/*.css …),
 *   - returns null for /api/** (controllers + GlobalExceptionHandler take over),
 *   - falls back to /static/index.html for any other path so React Router
 *     can route it client-side.
 */
class SpaFallbackContractTest extends ApiContractTestBase {

    @Test
    @DisplayName("GET / returns 200 (welcome-page mapping serves the SPA shell)")
    void root_serves200() throws Exception {
        // Spring's WelcomePageHandlerMapping serves classpath:/static/index.html
        // for "/". MockMvc doesn't render forward bodies eagerly, so we only
        // assert the status here; the SPA shell body assertions live on the
        // explicit SPA route tests below, which exercise our resolver directly.
        mockMvc.perform(get("/")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /patients (top-level SPA route) returns the SPA shell HTML, not JSON 404")
    void spaRoute_servesIndexHtml() throws Exception {
        MvcResult result = mockMvc.perform(get("/patients")).andExpect(status().isOk()).andReturn();
        assertThat(result.getResponse().getContentType()).startsWith("text/html");
        assertThat(result.getResponse().getContentAsString()).contains("<div id=\"root\">");
    }

    @Test
    @DisplayName("GET /patients/p001/sessions/123 (deep SPA route) returns the SPA shell HTML")
    void deepSpaRoute_servesIndexHtml() throws Exception {
        MvcResult result = mockMvc.perform(get("/patients/p001/sessions/123"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(result.getResponse().getContentType()).startsWith("text/html");
        assertThat(result.getResponse().getContentAsString()).contains("<div id=\"root\">");
    }

    @Test
    @DisplayName("GET /sessions/compare?ids=1,3 returns the SPA shell HTML (figure mode)")
    void compareRoute_servesIndexHtml() throws Exception {
        MvcResult result = mockMvc.perform(get("/sessions/compare").param("ids", "1,3"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(result.getResponse().getContentType()).startsWith("text/html");
    }

    @Test
    @DisplayName("GET /settings returns the SPA shell HTML")
    void settingsRoute_servesIndexHtml() throws Exception {
        mockMvc.perform(get("/settings")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /assets/<file>.js MUST NOT be swallowed by the SPA fallback (black-screen guard)")
    void assetPath_isNotForwardedToIndexHtml() throws Exception {
        // Previous ViewController-based fallback wrongly matched
        // /assets/<anything>.js (first segment dotless) and returned the
        // index.html shell — the SPA loaded HTML in place of JS and showed
        // a black screen. A nonexistent asset path must not echo the SPA
        // shell back; the resolver should let it 404 or pass through.
        MvcResult result = mockMvc.perform(get("/assets/does-not-exist.js")).andReturn();
        assertThat(result.getResponse().getContentAsString()).doesNotContain("<div id=\"root\">");
    }

    @Test
    @DisplayName("GET /api/v1/patients/__noop__/measurements still returns the JSON 404 envelope")
    void apiUnknown_still404Envelope() throws Exception {
        // The SPA fallback must NOT swallow /api/** paths — they keep going
        // through MeasurementController + GlobalExceptionHandler.
        mockMvc.perform(get("/api/v1/patients/__noop__/measurements"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"));
    }
}

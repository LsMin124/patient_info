package com.project.urp.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.project.urp.support.ApiContractTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Pins the SPA fallback wiring (SpaFallbackConfig) and confirms that the
 * API 404 envelope is unaffected.
 *
 * Without these forwards, a refresh on /patients (or any deep SPA route)
 * would land on GlobalExceptionHandler.handleNoResource and return a JSON
 * 404, breaking the client-side router.
 */
class SpaFallbackContractTest extends ApiContractTestBase {

    @Test
    @DisplayName("GET /patients forwards to /index.html so React Router takes over")
    void spaRoute_forwardsToIndex() throws Exception {
        mockMvc.perform(get("/patients"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    @DisplayName("GET /patients/p001/sessions/123 (deep SPA route) forwards to /index.html")
    void deepSpaRoute_forwardsToIndex() throws Exception {
        mockMvc.perform(get("/patients/p001/sessions/123"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    @DisplayName("GET /sessions/compare forwards to /index.html (query string ignored)")
    void compareRoute_forwardsToIndex() throws Exception {
        mockMvc.perform(get("/sessions/compare").param("ids", "1,3"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    @DisplayName("GET /settings forwards to /index.html")
    void settingsRoute_forwardsToIndex() throws Exception {
        mockMvc.perform(get("/settings"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
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

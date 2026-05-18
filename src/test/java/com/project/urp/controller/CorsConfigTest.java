package com.project.urp.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CORS preflight contract — verifies that the comma-separated
 * {@code app.cors.allowed-origins} property is parsed and that an OPTIONS
 * preflight from one of those origins receives the expected
 * Access-Control-Allow-Origin echo.
 *
 * Uses a localized {@link TestPropertySource} override so the test does
 * not depend on the global test profile (which leaves origins empty for
 * the existing wire-contract suite).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "app.cors.allowed-origins=http://localhost:5173,http://127.0.0.1:5173"
})
class CorsConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("OPTIONS preflight from allowed origin echoes Access-Control-Allow-Origin")
    void preflight_allowedOrigin_echoesHeader() throws Exception {
        mockMvc.perform(options("/api/v1/patients")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().exists("Access-Control-Allow-Methods"));
    }

    @Test
    @DisplayName("OPTIONS preflight from disallowed origin returns 403 without ACAO header")
    void preflight_disallowedOrigin_rejected() throws Exception {
        mockMvc.perform(options("/api/v1/patients")
                        .header("Origin", "https://evil.example.com")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}

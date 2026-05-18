package com.project.urp.controller;

import com.project.urp.service.MeasurementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Direct coverage for the {@link GlobalExceptionHandler} branches that the
 * normal contract suite can't reach: the {@code Exception.class} fallback
 * (500) and the {@code DataIntegrityViolationException} → 409 mapping.
 * Uses {@code @MockitoBean} to replace the real service with a stub that
 * throws the desired exception on each call.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MeasurementService measurementService;

    @Test
    @DisplayName("Unhandled RuntimeException maps to 500 sanitized envelope")
    void unexpectedException_maps_to500() throws Exception {
        when(measurementService.findAllPatients())
                .thenThrow(new IllegalStateException("simulated INTERNAL token_xyz"));

        mockMvc.perform(get("/api/v1/patients"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                .andExpect(jsonPath("$.message").doesNotExist())
                .andExpect(jsonPath("$.timestamp").isString());
    }

    @Test
    @DisplayName("DataIntegrityViolationException maps to 409 sanitized envelope")
    void dataIntegrity_maps_to409() throws Exception {
        when(measurementService.findAllPatients())
                .thenThrow(new DataIntegrityViolationException(
                        "constraint violation: UQ_patient_xyz"));

        String resp = mockMvc.perform(get("/api/v1/patients"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").doesNotExist())
                .andReturn()
                .getResponse()
                .getContentAsString();
        org.assertj.core.api.Assertions.assertThat(resp)
                .doesNotContain("UQ_patient_xyz")
                .doesNotContain("constraint violation");
    }
}

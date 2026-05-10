package com.project.urp.controller;

import com.project.urp.support.ApiContractTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Wire-contract tests for the Patient endpoints. Any change that breaks these tests is
 * a breaking change for the device firmware and Flutter app — see WEB_REBUILD_PLAN.md §3.
 */
class PatientApiContractTest extends ApiContractTestBase {

    @Test
    @DisplayName("GET /api/v1/patients returns array with frozen keys AND values")
    void getAllPatients_returnsArrayWithFrozenKeys() throws Exception {
        seedPatient("p001", "테스트환자A");
        seedPatient("p002", "테스트환자B");

        // Value asserts (not just .exists()) so a silent key rename like
        // sex -> gender is caught: the new key would still be present under
        // some name and .exists() alone would pass. Type asserts (.isNumber)
        // catch type drift (e.g. id serialized as a string).
        mockMvc.perform(get("/api/v1/patients"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").isNumber())
                .andExpect(jsonPath("$[0].patientId").value("p001"))
                .andExpect(jsonPath("$[0].name").value("테스트환자A"))
                .andExpect(jsonPath("$[0].age").value(30))
                .andExpect(jsonPath("$[0].sex").value("male"))
                .andExpect(jsonPath("$[0].height").value(175.0))
                .andExpect(jsonPath("$[0].weight").value(70.0))
                .andExpect(jsonPath("$[1].patientId").value("p002"));
    }

    @Test
    @DisplayName("POST /api/v1/patients returns 201 with frozen keys")
    void createPatient_returns201_withFrozenKeys() throws Exception {
        Map<String, Object> body = Map.of(
                "patientId", "p100",
                "name", "신환자",
                "age", 25,
                "sex", "female",
                "height", 165.0,
                "weight", 55.0);

        mockMvc.perform(post("/api/v1/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.patientId").value("p100"))
                .andExpect(jsonPath("$.name").value("신환자"))
                .andExpect(jsonPath("$.age").value(25))
                .andExpect(jsonPath("$.sex").value("female"))
                .andExpect(jsonPath("$.height").value(165.0))
                .andExpect(jsonPath("$.weight").value(55.0));
    }

    @Test
    @DisplayName("POST /api/v1/patients with duplicate patientId rejects (no 2xx success)")
    void createPatient_duplicatePatientId_doesNotSucceed() throws Exception {
        Map<String, Object> body = Map.of(
                "patientId", "p001",
                "name", "first",
                "age", 30,
                "sex", "male",
                "height", 175.0,
                "weight", 70.0);

        mockMvc.perform(post("/api/v1/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());

        try {
            int statusCode = mockMvc.perform(post("/api/v1/patients")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andReturn()
                    .getResponse()
                    .getStatus();
            if (statusCode / 100 == 2) {
                throw new AssertionError("Duplicate patientId must not return 2xx (got " + statusCode + ")");
            }
        } catch (jakarta.servlet.ServletException expected) {
            Throwable cause = expected.getCause();
            if (!(cause instanceof IllegalArgumentException)) {
                throw new AssertionError(
                        "Expected IllegalArgumentException cause for duplicate, got: " + cause);
            }
        }
    }
}

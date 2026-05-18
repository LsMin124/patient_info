package com.project.urp.controller;

import com.project.urp.support.ApiContractTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
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
    @DisplayName("POST /api/v1/patients with duplicate patientId returns 400 via GlobalExceptionHandler")
    void createPatient_duplicatePatientId_returns400() throws Exception {
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

        // GlobalExceptionHandler (Phase 7 T31) converts the service-layer
        // IllegalArgumentException into a 400 with the sanitized envelope.
        // The exception message ("Patient ID already exists: p001") must NOT
        // appear in the body — the envelope carries only status / error /
        // timestamp.
        mockMvc.perform(post("/api/v1/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").doesNotExist())
                .andExpect(jsonPath("$.timestamp").isString());
    }

    @Test
    @DisplayName("GET /api/v1/patients/{unknown}/measurements returns 404 sanitized envelope")
    void measurementsByPatient_unknownId_returns404Sanitized() throws Exception {
        String resp = mockMvc.perform(get("/api/v1/patients/unknown_patient_xyz/measurements"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        // No "Invalid patient Id: ..." message leak — the request param must
        // not appear anywhere in the response body, and no Spring-default
        // `message` / `path` field must surface either.
        assertThat(resp)
                .doesNotContain("unknown_patient_xyz")
                .doesNotContain("Invalid patient Id")
                .doesNotContain("\"message\"")
                .doesNotContain("\"path\"");
    }

    @Test
    @DisplayName("POST /api/v1/measurements/{id}/data with malformed body returns 400 sanitized envelope")
    void saveDataPoints_malformedPayload_returns400Sanitized() throws Exception {
        var patient = seedPatient("p001", "테스트환자A");
        var measurement = seedMeasurement(patient, "marker");

        // Attacker token in the JSON body — must not echo back in either
        // the message or any default-shape field.
        String malformed = "[{\"time_offset_ms\": \"DROP_TABLE_marker_xyz\", \"kg_value\": 1.0}]";
        String resp = mockMvc.perform(post("/api/v1/measurements/" + measurement.getId() + "/data")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(malformed))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").doesNotExist())
                .andReturn()
                .getResponse()
                .getContentAsString();
        assertThat(resp).doesNotContain("DROP_TABLE_marker_xyz");
    }
}

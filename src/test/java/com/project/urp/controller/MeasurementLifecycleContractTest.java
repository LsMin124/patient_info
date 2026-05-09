package com.project.urp.controller;

import com.project.urp.domain.Measurement;
import com.project.urp.domain.Patient;
import com.project.urp.support.ApiContractTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Measurement start → data → stop wire-contract tests. The most fragile shape here is
 * the {@code measurement_Id} response key with the uppercase letter {@code I} — the
 * device firmware parses this exact key. See WEB_REBUILD_PLAN.md §3.
 */
class MeasurementLifecycleContractTest extends ApiContractTestBase {

    @Test
    @DisplayName("POST /measurements/start returns measurement_Id (uppercase I) as a number")
    void start_returns_measurement_Id_uppercaseI() throws Exception {
        seedPatient("p001", "이승민");

        Map<String, String> body = Map.of("patientId", "p001", "memo", "L knee");

        mockMvc.perform(post("/api/v1/measurements/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.measurement_Id").isNumber())
                // Lowercase 'measurement_id' is NOT the key — guard against accidental rename
                .andExpect(jsonPath("$.measurement_id").doesNotExist());
    }

    @Test
    @DisplayName("POST /measurements/{id}/data accepts snake_case payload")
    void saveData_acceptsSnakeCasePayload() throws Exception {
        Patient p = seedPatient("p001", "이승민");
        Measurement m = seedMeasurement(p, "smoke");

        List<Map<String, Object>> payload = List.of(
                Map.of("time_offset_ms", 10, "kg_value", 1.98),
                Map.of("time_offset_ms", 20, "kg_value", 2.12),
                Map.of("time_offset_ms", 30, "kg_value", 2.14));

        mockMvc.perform(post("/api/v1/measurements/" + m.getId() + "/data")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        assertThat(dataPointRepository.findByMeasurement_IdOrderByTimeOffsetMsAsc(m.getId()))
                .hasSize(3);
    }

    @Test
    @DisplayName("POST /measurements/{id}/data accepts large integer time_offset_ms")
    void saveData_acceptsLargeIntegerTimeOffset() throws Exception {
        Patient p = seedPatient("p001", "이승민");
        Measurement m = seedMeasurement(p, "long-session");

        // 2_000_000_000 fits in int (max int = 2_147_483_647). The current cast
        // `(Integer) data.get(...)` works, but T33 will harden this to Number.intValue()
        // so any client sending Long-shaped JSON numbers is also accepted.
        List<Map<String, Object>> payload = List.of(
                Map.of("time_offset_ms", 2_000_000_000, "kg_value", 5.0));

        mockMvc.perform(post("/api/v1/measurements/" + m.getId() + "/data")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /measurements/{id}/stop returns 200 and sets endTime")
    void stop_returnsOk_andSetsEndTime() throws Exception {
        Patient p = seedPatient("p001", "이승민");
        Measurement m = seedMeasurement(p, "to-stop");

        assertThat(m.getEndTime()).isNull();

        mockMvc.perform(post("/api/v1/measurements/" + m.getId() + "/stop"))
                .andExpect(status().isOk());

        Measurement reloaded = measurementRepository.findById(m.getId()).orElseThrow();
        assertThat(reloaded.getEndTime()).isNotNull();
    }

    @Test
    @DisplayName("Full lifecycle: start → data → stop preserves wire shapes")
    void fullLifecycle_preservesWireShapes() throws Exception {
        seedPatient("p001", "이승민");

        MvcResult startResult = mockMvc.perform(post("/api/v1/measurements/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("patientId", "p001", "memo", "lifecycle"))))
                .andExpect(status().isOk())
                .andReturn();

        Map<?, ?> startBody = objectMapper.readValue(
                startResult.getResponse().getContentAsString(), Map.class);
        Number measurementIdNumber = (Number) startBody.get("measurement_Id");
        assertThat(measurementIdNumber).isNotNull();
        long measurementId = measurementIdNumber.longValue();

        mockMvc.perform(post("/api/v1/measurements/" + measurementId + "/data")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(
                                Map.of("time_offset_ms", 0, "kg_value", 0.0),
                                Map.of("time_offset_ms", 50, "kg_value", 1.5)))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/measurements/" + measurementId + "/stop"))
                .andExpect(status().isOk());

        Measurement m = measurementRepository.findById(measurementId).orElseThrow();
        assertThat(m.getEndTime()).isNotNull();
        assertThat(m.getMemo()).isEqualTo("lifecycle");
    }
}

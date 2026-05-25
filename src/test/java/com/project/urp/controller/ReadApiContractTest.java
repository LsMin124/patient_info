package com.project.urp.controller;

import com.project.urp.domain.Measurement;
import com.project.urp.domain.Patient;
import com.project.urp.support.ApiContractTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Read endpoint wire-contract tests (sessions list, data points list).
 * Locks: camelCase response keys, ISO-8601 startTime, null endTime/memo support,
 * data points returned ordered ascending by timeOffsetMs.
 */
class ReadApiContractTest extends ApiContractTestBase {

    private static final String ISO_LOCAL_DATE_TIME_REGEX =
            "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?$";

    @Test
    @DisplayName("GET /patients/{id}/measurements returns camelCase keys")
    void getMeasurementsByPatient_returnsCamelCaseKeys() throws Exception {
        Patient p = seedPatient("p001", "테스트환자A");
        Measurement m = seedMeasurement(p, "L knee");
        m.setEndTime(LocalDateTime.now());
        measurementRepository.save(m);

        mockMvc.perform(get("/api/v1/patients/p001/measurements"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].measurementId").exists())
                .andExpect(jsonPath("$[0].startTime").exists())
                .andExpect(jsonPath("$[0].endTime").exists())
                .andExpect(jsonPath("$[0].memo").value("L knee"));
    }

    @Test
    @DisplayName("startTime serializes as ISO-8601 string (not numeric timestamp)")
    void getMeasurementsByPatient_startTimeIsIso8601String() throws Exception {
        Patient p = seedPatient("p001", "테스트환자A");
        seedMeasurement(p, "iso-check");

        mockMvc.perform(get("/api/v1/patients/p001/measurements"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].startTime").isString())
                .andExpect(jsonPath("$[0].startTime", org.hamcrest.Matchers.matchesPattern(ISO_LOCAL_DATE_TIME_REGEX)));
    }

    @Test
    @DisplayName("In-progress session: endTime is null")
    void getMeasurementsByPatient_inProgressSession_endTimeIsNull() throws Exception {
        Patient p = seedPatient("p001", "테스트환자A");
        seedMeasurement(p, "in-progress");
        // Do not call setEndTime — leaves it null per JPA, mirroring a session the device
        // started but has not yet stopped.

        mockMvc.perform(get("/api/v1/patients/p001/measurements"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].endTime").doesNotExist())
                // jsonPath().doesNotExist() also matches explicit JSON null in some
                // matchers; use isEmpty for explicit null check.
                ;
    }

    @Test
    @DisplayName("memo can be null on the wire when not provided")
    void getMeasurementsByPatient_memoCanBeNull() throws Exception {
        Patient p = seedPatient("p001", "테스트환자A");
        Measurement m = seedMeasurement(p, null);
        m.setEndTime(LocalDateTime.now());
        measurementRepository.save(m);

        mockMvc.perform(get("/api/v1/patients/p001/measurements"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].memo").doesNotExist());
    }

    @Test
    @DisplayName("GET /measurements/{id}/data returns camelCase keys ordered by timeOffsetMs ASC")
    void getDataPoints_returnsCamelCaseKeysAndOrderedAsc() throws Exception {
        Patient p = seedPatient("p001", "테스트환자A");
        Measurement m = seedMeasurement(p, "ordering");

        // Insert in deliberately reversed order — service layer must sort ASC.
        seedDataPoint(m, 30, 2.14);
        seedDataPoint(m, 10, 1.98);
        seedDataPoint(m, 20, 2.12);

        mockMvc.perform(get("/api/v1/measurements/" + m.getId() + "/data"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].timeOffsetMs").value(10))
                .andExpect(jsonPath("$[0].kgValue").value(1.98))
                .andExpect(jsonPath("$[1].timeOffsetMs").value(20))
                .andExpect(jsonPath("$[2].timeOffsetMs").value(30));
    }

    @Test
    @DisplayName("GET /measurements/{id}/data returns empty array for measurement with no data")
    void getDataPoints_emptyMeasurement_returnsEmptyArray() throws Exception {
        Patient p = seedPatient("p001", "테스트환자A");
        Measurement m = seedMeasurement(p, "empty");

        mockMvc.perform(get("/api/v1/measurements/" + m.getId() + "/data"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("GET /measurements/{id} returns the single summary with camelCase keys")
    void getMeasurementById_returnsCamelCaseSummary() throws Exception {
        Patient p = seedPatient("p001", "테스트환자A");
        Measurement m = seedMeasurement(p, "single");
        m.setEndTime(LocalDateTime.now());
        measurementRepository.save(m);

        mockMvc.perform(get("/api/v1/measurements/" + m.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.measurementId").value(m.getId()))
                .andExpect(jsonPath("$.startTime").isString())
                .andExpect(jsonPath("$.startTime", org.hamcrest.Matchers.matchesPattern(ISO_LOCAL_DATE_TIME_REGEX)))
                .andExpect(jsonPath("$.endTime").exists())
                .andExpect(jsonPath("$.memo").value("single"));
    }

    @Test
    @DisplayName("GET /measurements/{id} returns 404 for unknown measurement id")
    void getMeasurementById_unknownId_returns404() throws Exception {
        // GlobalExceptionHandler maps IllegalArgumentException → 404 to keep the
        // contract identical to /patients/{id}/measurements for unknown ids.
        mockMvc.perform(get("/api/v1/measurements/999999"))
                .andExpect(status().isNotFound());
    }
}

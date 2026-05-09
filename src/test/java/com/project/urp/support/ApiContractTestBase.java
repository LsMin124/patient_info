package com.project.urp.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.urp.domain.DataPoint;
import com.project.urp.domain.Measurement;
import com.project.urp.domain.Patient;
import com.project.urp.repository.DataPointRepository;
import com.project.urp.repository.MeasurementRepository;
import com.project.urp.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Base class for HTTP wire-contract tests. Subclasses run inside @Transactional so each
 * test rolls back its DB writes; do not commit or assume cross-test state. Tests must
 * verify response shapes that the device firmware and Flutter app depend on — see
 * {@code WEB_REBUILD_PLAN.md §3} (Frozen Contract).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public abstract class ApiContractTestBase {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected PatientRepository patientRepository;

    @Autowired
    protected MeasurementRepository measurementRepository;

    @Autowired
    protected DataPointRepository dataPointRepository;

    /**
     * Seed a Patient with the same shape the device/app currently sends. The patientId is
     * the public-facing string identifier (e.g. "p001"); the entity also gets a numeric PK
     * via JPA on save.
     */
    protected Patient seedPatient(String patientId, String name) {
        Patient p = new Patient(patientId, name, 30, "male", 175.0f, 70.0f);
        return patientRepository.save(p);
    }

    /**
     * Seed a Measurement for the given patient with optional memo. endTime stays null
     * until {@link #stopMeasurement(Measurement)} is called, mirroring the in-progress
     * lifecycle the firmware drives.
     */
    protected Measurement seedMeasurement(Patient patient, String memo) {
        Measurement m = new Measurement();
        m.setPatient(patient);
        m.setMemo(memo);
        return measurementRepository.save(m);
    }

    protected DataPoint seedDataPoint(Measurement measurement, int timeOffsetMs, double kgValue) {
        DataPoint dp = new DataPoint(measurement, timeOffsetMs, kgValue);
        return dataPointRepository.save(dp);
    }
}

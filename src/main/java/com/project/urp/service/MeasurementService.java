package com.project.urp.service;

import com.project.urp.domain.Measurement;
import com.project.urp.domain.DataPoint;
import com.project.urp.domain.Patient;
import com.project.urp.repository.MeasurementRepository;
import com.project.urp.repository.DataPointRepository;
import com.project.urp.repository.PatientRepository;
import com.project.urp.dto.DataPointDto;
import com.project.urp.dto.MeasurementSummaryDto;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MeasurementService {

    private final MeasurementRepository measurementRepository;
    private final PatientRepository patientRepository;
    private final DataPointRepository dataPointRepository;

    // 환자 목록 조회
    public List<Patient> findAllPatients() {
        return patientRepository.findAll();
    }

    //
    public Measurement startMeasurement(Map<String, String> payload) {
        String patientId = payload.get("patientId");
        String memo = payload.get("memo");

        Patient patient = patientRepository.findByPatientId(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Invalid patient Id: " + patientId));

        Measurement measurement = new Measurement();
        measurement.setPatient(patient);
        measurement.setMemo(memo);

        return measurementRepository.save(measurement);
    }

    // 데이터 일괄저장 (Flutter -> DB, JSON 리스트)
    @Transactional
    public void saveDataPoints(Long measurementId, List<Map<String, Object>> dataList) {
        Measurement measurement = measurementRepository.findById(measurementId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid measurement Id: " + measurementId));

        List<DataPoint> dataPoints = dataList.stream()
                .map(data -> new DataPoint(
                        measurement,
                        (Integer) data.get("time_offset_ms"),
                        ((Number) data.get("kg_value")).doubleValue()
                ))
                .collect(Collectors.toList());

        dataPointRepository.saveAll(dataPoints); // List를 db에 모두 저장
    }

    @Transactional
    public void stopMeasurement(Long measurementId) {
        Measurement measurement = measurementRepository.findById(measurementId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid measurement Id: " + measurementId));

        measurement.setEndTime(LocalDateTime.now());
        measurementRepository.save(measurement);
    }

    public List<MeasurementSummaryDto> findMeasurementByPatient(String patientId) {
        patientRepository.findByPatientId(patientId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient Id: " + patientId));

        List<Measurement> measurements = measurementRepository.findByPatient_Patient_Id(patientId);

        return measurements.stream()
                .map(measurement -> new MeasurementSummaryDto(measurement))
                .collect(Collectors.toList());
    }

    public List<DataPointDto> findDataPointsByMeasurement(Long measurementId) {
        if (!measurementRepository.existsById(measurementId)) {
            throw new IllegalArgumentException("Invalid measurement Id: " + measurementId);
        }

        List<DataPoint> dataPoints = dataPointRepository.findByMeasurement_IdOrderByTimeOffsetMsAsc(measurementId);

        return dataPoints.stream()
                .map(dp -> new DataPointDto(dp.getTimeOffsetMs(), dp.getKgValue()))
                .collect(Collectors.toList());
    }
}

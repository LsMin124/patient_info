package com.project.urp.controller;

import com.project.urp.domain.Measurement;
import com.project.urp.domain.Patient;
import com.project.urp.service.MeasurementService;
import com.project.urp.dto.DataPointDto;
import com.project.urp.dto.MeasurementSummaryDto;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class MeasurementController {

    private final MeasurementService measurementService;

    // GET, 모든 환자 목록 조화
    @GetMapping("/patients")
    public ResponseEntity<List<Patient>> getAllPatients() {
        return ResponseEntity.ok(measurementService.findAllPatients());
    }

    // Post, +측정 세션, { measurement_id: 123 } 형태 반환
    @PostMapping("/measurements/start")
    public ResponseEntity<Map<String, Long>> startMeasurements(@RequestBody Map<String, String> payload) {
        Measurement measurement = measurementService.startMeasurement(payload);
        return ResponseEntity.ok(Map.of("measurement_Id", measurement.getId()));
    }

    @PostMapping("/measurements/{id}/data")
    public ResponseEntity<Void> saveData(
            @PathVariable("id") Long measurementId,
            @RequestBody List<Map<String, Object>> dataList) {

        measurementService.saveDataPoints(measurementId, dataList);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/measurements/{id}/stop")
    public ResponseEntity<Void> stopMeasurement(@PathVariable("id") Long measurementId) {
        measurementService.stopMeasurement(measurementId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/patients/{patientId}/measurements")
    public ResponseEntity<List<MeasurementSummaryDto>> getMeasurementsByPatient(
            @PathVariable String patientId) {
        List<MeasurementSummaryDto> measurements = measurementService.findMeasurementByPatient(patientId);
        return ResponseEntity.ok(measurements);
    }

    @GetMapping("/measurements/{id}/data")
    public ResponseEntity<List<DataPointDto>> getDataPointsByMeasurement(
            @PathVariable("id") Long measurementId) {
        List<DataPointDto> dataPoints = measurementService.findDataPointsByMeasurement(measurementId);
        return ResponseEntity.ok(dataPoints);
    }
}

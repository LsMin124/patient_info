package com.project.urp.dto;

import com.project.urp.domain.Measurement;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
public class MeasurementSummaryDto {

    private Long measurementId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String memo;

    // Entity를 DTO로 변환하는 생성자
    public MeasurementSummaryDto(Measurement measurement) {
        this.measurementId = measurement.getId();
        this.startTime = measurement.getStartTime();
        this.endTime = measurement.getEndTime();
        this.memo = measurement.getMemo();
    }
}
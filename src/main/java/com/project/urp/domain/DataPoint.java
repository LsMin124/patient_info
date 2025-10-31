package com.project.urp.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "data_points")
public class DataPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // 데이터 포인트 고유 ID

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "measurement_id") // 'measurements' 테이블의 PK를 참조
    private Measurement measurement;

    private Integer timeOffsetMs; // 세션 시작 후 경과 시간(ms)

    private Double kgValue;       // 측정된 kg 값

    public DataPoint(Measurement measurement, Integer timeOffsetMs, Double kgValue) {
        this.measurement = measurement;
        this.timeOffsetMs = timeOffsetMs;
        this.kgValue = kgValue;
    }
}

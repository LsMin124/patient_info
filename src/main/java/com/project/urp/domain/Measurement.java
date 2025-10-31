package com.project.urp.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "measurements")
public class Measurement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // 측정 세션 고유 ID (PK, 예: 123)

    @ManyToOne(fetch = FetchType.LAZY) // 다대일 관계
    @JoinColumn(name = "patient_id")  // 'patients' 테이블의 PK를 참조
    private Patient patient;

    @CreationTimestamp // 엔티티 생성 시 자동으로 현재 시간 저장
    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private String memo;

    // 이 Measurement에 속한 DataPoint 목록 (DB 컬럼은 아님)
    @OneToMany(mappedBy = "measurement", cascade = CascadeType.ALL)
    private List<DataPoint> dataPoints = new ArrayList<>();
}

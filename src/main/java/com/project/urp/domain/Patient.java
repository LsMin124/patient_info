package com.project.urp.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "patients") // MySQL의 'patients' 테이블과 매핑
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // 환자 고유 ID (PK)

    // DB-level UNIQUE so concurrent POSTs that pass the application-level
    // duplicate check both attempt to commit — one succeeds, the other gets
    // DataIntegrityViolationException → 409 via GlobalExceptionHandler.
    // Without this, two near-simultaneous registrations of the same external
    // patientId would silently create duplicate rows (post-Phase-8 review H4).
    @Column(nullable = false, unique = true)
    private String patientId; // 앱에서 사용할 환자 ID (예: "p001")

    @Column(nullable = false)
    private String name; // 환자 이름

    @Column(nullable = false)
    private Integer age;

    @Column(nullable = false)
    private String sex;

    @Column(nullable = false)
    private Float height;

    @Column(nullable = false)
    private Float weight;

    public Patient(String patientId, String name, Integer age, String sex, Float height, Float weight ) {
        this.patientId = patientId;
        this.name = name;
        this.age = age;
        this.sex = sex;
        this.height = height;
        this.weight = weight;
    }
}
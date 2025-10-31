package com.project.urp.repository;

import com.project.urp.domain.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    // 환자 ID(p001)로 환자 찾기
    Optional<Patient> findByPatientId(String patientId);
}

package com.project.urp.repository;

import com.project.urp.domain.DataPoint;
import com.project.urp.dto.DataPointDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DataPointRepository extends JpaRepository<DataPoint, Long> {
    // DataPoint는 saveAll()로 한번에 저장
    List<DataPoint> findByMeasurement_IdOrderByTimeOffsetMsAsc(Long measurementId);
}

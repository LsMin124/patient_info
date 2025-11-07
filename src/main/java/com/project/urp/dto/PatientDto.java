package com.project.urp.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PatientDto {
    private String patientId;
    private String name;
    private Integer age;
    private String sex;
    private Float  height;
    private Float weight;
}

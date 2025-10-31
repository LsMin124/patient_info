package com.project.urp.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor // 모든 필드를 인자로 받는 생성자
public class DataPointDto {

    private Integer timeOffsetMs;
    private Double kgValue;
}
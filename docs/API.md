# API 명세서 (디바이스/앱 합의 동결 컨트랙트)

> 이 형태는 디바이스 펌웨어와 Flutter 앱이 의존하는 동결 컨트랙트입니다.
> 변경하려면 디바이스 + 앱과 협의해 양쪽을 함께 배포해야 합니다.
> 전략적 결정 배경은 [`../WEB_REBUILD_PLAN.md §3`](../WEB_REBUILD_PLAN.md).

## 🔑 기본 정보

* **Base URL**: `/api/v1`
* **Content-Type**: `application/json`
* **인증**: 없음 (클리닉 LAN 내부 신뢰 모델)
* **에러 응답**: 모든 4xx/5xx 는 `{ status, error, timestamp }` 형태의 sanitized envelope

---

## 1. 환자 (Patient) API

### 1.1. 모든 환자 목록 조회

* **Endpoint**: `GET /api/v1/patients`
* **설명**: 시스템에 등록된 모든 환자 정보를 조회합니다.
* **요청 (Request)**:
    * (없음)
* **응답 (Response)**: `200 OK`
    * **Body**: `List<Patient>`
    * **예시**:
        ```json
        [
          { "id": 1, "patientId": "p001", "name": "환자A", "age": 30, "sex": "male",   "height": 175.0, "weight": 70.0 },
          { "id": 2, "patientId": "p002", "name": "환자B", "age": 42, "sex": "female", "height": 165.0, "weight": 55.0 }
        ]
        ```

### 1.2. 신규 환자 등록

* **Endpoint**: `POST /api/v1/patients`
* **설명**: 새 환자를 등록합니다.
* **요청 (Request)**:
    * **Body**: `PatientDto`
    * **예시**:
        ```json
        { "patientId": "p100", "name": "신환자", "age": 25, "sex": "female", "height": 165.0, "weight": 55.0 }
        ```
* **응답 (Response)**: `201 Created` — 생성된 엔티티의 전체 키 (위 1.1과 동일 shape).

---

## 2. 측정 (Measurement) API

### 2.1. 측정 세션 시작

* **Endpoint**: `POST /api/v1/measurements/start`
* **설명**: 새로운 측정 세션을 생성하고 시작합니다.
* **요청 (Request)**:
    * **Body**: `Map<String, String>`
    * **예시**:
        ```json
        { "patientId": "p001", "memo": "warmup set 1" }
        ```
* **응답 (Response)**: `200 OK`
    * **Body**: `Map<String, Long>` — 키 이름은 정확히 `measurement_Id` (대문자 I, 동결).
    * **예시**:
        ```json
        { "measurement_Id": 123 }
        ```

### 2.2. 측정 데이터 저장 (일괄)

* **Endpoint**: `POST /api/v1/measurements/{id}/data`
* **설명**: 2.1에서 발급받은 `measurement_Id`에 해당하는 세션에 데이터 포인트 리스트를 일괄 저장합니다.
* **요청 (Request)**:
    * **Path Variable**: `id` (측정 세션 ID, 예: `123`)
    * **Body**: `List<Map<String, Object>>` — 각 항목은 `time_offset_ms` (Number) + `kg_value` (Number) 필수.
    * **예시**:
        ```json
        [
          { "time_offset_ms": 10, "kg_value": 1.98 },
          { "time_offset_ms": 20, "kg_value": 2.12 },
          { "time_offset_ms": 30, "kg_value": 2.14 }
        ]
        ```
* **응답 (Response)**: `200 OK` (body 없음). 비-숫자 값 / null 항목 / 누락 필드는 모두 `400 Bad Request` sanitized envelope.

### 2.3. 측정 세션 종료

* **Endpoint**: `POST /api/v1/measurements/{id}/stop`
* **설명**: 2.1에서 시작한 측정 세션을 종료 상태로 변경합니다.
* **요청 (Request)**: Path Variable `id` 만.
* **응답 (Response)**: `200 OK` (body 없음).

---

## 3. 조회 API

### 3.1. 특정 환자의 측정 이력 조회

* **Endpoint**: `GET /api/v1/patients/{patientId}/measurements`
* **설명**: 특정 환자가 수행한 모든 측정 세션의 요약 정보 목록.
* **요청 (Request)**: Path Variable `patientId` (외부 ID, 예: `p001`).
* **응답 (Response)**: `200 OK`
    * **Body**: `List<MeasurementSummaryDto>` — camelCase.
    * **예시**:
        ```json
        [
          { "measurementId": 123, "startTime": "2026-05-01T10:30:00", "endTime": "2026-05-01T10:31:42", "memo": "warmup" },
          { "measurementId": 124, "startTime": "2026-05-02T14:15:00", "endTime": null, "memo": null }
        ]
        ```
    * 알 수 없는 환자 → `404 Not Found` sanitized envelope.

### 3.2. 특정 측정 세션의 상세 데이터 조회

* **Endpoint**: `GET /api/v1/measurements/{id}/data`
* **설명**: 특정 세션의 모든 데이터 포인트 (시간 오름차순).
* **요청 (Request)**: Path Variable `id` (측정 세션 ID).
* **응답 (Response)**: `200 OK`
    * **Body**: `List<DataPointDto>` — camelCase.
    * **예시**:
        ```json
        [
          { "timeOffsetMs": 0,   "kgValue": 0.0 },
          { "timeOffsetMs": 49,  "kgValue": 0.0 },
          { "timeOffsetMs": 103, "kgValue": 0.00917744591680136 },
          { "timeOffsetMs": 165, "kgValue": 0.375255566375878 },
          { "timeOffsetMs": 214, "kgValue": 1.2980987391209 }
        ]
        ```

---

## 컨트랙트 보호

- 모든 와이어 형태는 `src/test/java/com/project/urp/controller/*ContractTest.java` 의 contract 테스트로 박제되어 있습니다.
- `measurement_Id` 의 대문자 I는 `MeasurementLifecycleContractTest` 가 양성 + 음성 양쪽으로 락합니다 (소문자 `measurement_id` 가 존재하면 fail).
- 프론트엔드는 `frontend/src/features/**/schema.ts` 의 Zod 스키마로 같은 컨트랙트를 검증하므로, 백엔드 변경이 있을 경우 양쪽이 동시에 빨갛게 됩니다.

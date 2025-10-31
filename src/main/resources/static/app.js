// app.js

// 🚨 Spring Boot 서버(라즈베리파이)의 주소로 변경하세요.
// Nginx를 쓴다면 "http://your.domain.com"
// 내부망이라면 "http://192.168.0.10:8080"
const API_BASE_URL = "http://119.194.17.62:8080"; // 👈 예시 주소

// --- 1. 전역 변수 및 DOM 요소 ---
let measurementChart; // 차트 인스턴스를 저장할 변수

const patientSelect = document.getElementById("patient-select");
const sessionSelect = document.getElementById("session-select");
const loadingIndicator = document.getElementById("loading-indicator");
const chartCanvas = document.getElementById("measurement-chart").getContext("2d");

// --- 2. 이벤트 리스너 ---

// 페이지가 로드되면 환자 목록을 즉시 불러옵니다.
document.addEventListener("DOMContentLoaded", () => {
    initChart();
    fetchPatients();
});

// 환자 선택이 변경되면 세션 목록을 불러옵니다.
patientSelect.addEventListener("change", (e) => {
    const patientId = e.target.value;
    if (patientId) {
        fetchSessions(patientId);
    } else {
        resetSessionSelect();
        resetChart();
    }
});

// 세션 선택이 변경되면 차트 데이터를 불러옵니다.
sessionSelect.addEventListener("change", (e) => {
    const sessionId = e.target.value;
    if (sessionId) {
        fetchChartData(sessionId);
    } else {
        resetChart();
    }
});


// --- 3. API 호출 함수 ---

/** (GET /api/v1/patients) 환자 목록을 불러와 드롭다운에 채웁니다. */
async function fetchPatients() {
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/patients`);
        if (!response.ok) throw new Error("서버 응답 실패");

        const patients = await response.json();

        patientSelect.innerHTML = '<option value="">-- 환자를 선택하세요 --</option>'; // 초기화
        patients.forEach(patient => {
            // patient.name (이름), patient.patientId (값, 예: "p001")
            const option = new Option(patient.name, patient.patientId);
            patientSelect.add(option);
        });
    } catch (error) {
        console.error("환자 목록 로딩 실패:", error);
        alert("환자 목록 로딩에 실패했습니다.");
    } finally {
        setLoading(false);
    }
}

/** (GET /api/v1/patients/{patientId}/measurements) 세션 목록을 불러옵니다. */
async function fetchSessions(patientId) {
    setLoading(true);
    resetSessionSelect();
    resetChart();
    sessionSelect.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}/measurements`);
        if (!response.ok) throw new Error("서버 응답 실패");

        const sessions = await response.json(); // MeasurementSummaryDto[]

        if (sessions.length === 0) {
            sessionSelect.innerHTML = '<option value="">측정 기록이 없습니다</option>';
            return;
        }

        sessions.forEach(session => {
            // (예: "오른쪽 어깨 (2025-11-01 02:51)")
            const text = `${session.memo} (${new Date(session.startTime).toLocaleString()})`;
            const option = new Option(text, session.measurementId);
            sessionSelect.add(option);
        });
        sessionSelect.disabled = false;

    } catch (error) {
        console.error("세션 목록 로딩 실패:", error);
    } finally {
        setLoading(false);
    }
}

/** (GET /api/v1/measurements/{id}/data) 차트 데이터를 불러옵니다. */
async function fetchChartData(sessionId) {
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/measurements/${sessionId}/data`);
        if (!response.ok) throw new Error("서버 응답 실패");

        const dataPoints = await response.json(); // DataPointDto[]
        updateChart(dataPoints);

    } catch (error) {
        console.error("차트 데이터 로딩 실패:", error);
    } finally {
        setLoading(false);
    }
}


// --- 4. 차트 및 UI 헬퍼 함수 ---

/** 비어있는 차트를 미리 생성합니다. */
function initChart() {
    measurementChart = new Chart(chartCanvas, {
        type: 'line', // 라인 차트
        data: {
            labels: [],
            datasets: [{
                label: '측정 값 (kg)',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1, // 약간 부드럽게
                fill: false,
            }]
        },
        options: {
            scales: {
                x: {
                    title: { display: true, text: '시간 (ms)' }
                },
                y: {
                    title: { display: true, text: '무게 (kg)' },
                    beginAtZero: true
                }
            },
            animation: false // (선택) 데이터 변경 시 애니메이션 끄기
        }
    });
}

/** API로 받은 데이터로 차트를 업데이트합니다. */
function updateChart(dataPoints) {
    if (!measurementChart) return;

    // DataPointDto[]를 Chart.js가 이해하는 형식으로 변환
    const labels = dataPoints.map(dp => dp.timeOffsetMs);
    const data = dataPoints.map(dp => dp.kgValue);

    measurementChart.data.labels = labels;
    measurementChart.data.datasets[0].data = data;
    measurementChart.update();
}

/** 세션 드롭다운을 초기화합니다. */
function resetSessionSelect() {
    sessionSelect.innerHTML = '<option value="">-- 환자를 먼저 선택하세요 --</option>';
    sessionSelect.disabled = true;
}

/** 차트를 비웁니다. */
function resetChart() {
    if (measurementChart) {
        measurementChart.data.labels = [];
        measurementChart.data.datasets[0].data = [];
        measurementChart.update();
    }
}

/** 로딩 인디케이터를 토글합니다. */
function setLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.remove("hidden");
    } else {
        loadingIndicator.classList.add("hidden");
    }
}
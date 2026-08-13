# 습관 트래커 구현 설계 (BF-2047 / plan: BF-2050)

## 0. 개요

이 문서는 습관 트래커의 **frozen 실행 설계**입니다. designer(BF-2048)와 developer(BF-2049)는 아래 명세를
그대로 구현하며, DOM ID/class, 상태, 디자인 토큰, 데이터 스키마, 순수함수 시그니처를 재정의하지 않습니다.

### 산출물 소유권 (frozen — 재배정 금지)

| 파일 | 소유자 |
|---|---|
| `docs/plans/BF-2047/implementation-plan.md` | planner (본 문서) |
| `docs/design/habit-tracker-BF-2047.md` | designer |
| `docs/design/habit-tracker-BF-2047-mockup.html` | designer |
| `habit-tracker/index.html` | developer |
| `habit-tracker/style.css` | developer |
| `habit-tracker/habits.js` | developer |
| `habit-tracker/habits.test.js` | developer |

모든 파일의 상태 계약은 `additive` 입니다 (기존 내용을 재정의하지 않고 추가만 함).

---

## 1. 상태 모델 / 데이터 스키마

### 1.1 localStorage

- key: **`habit-tracker:v1:habits`** (이 키 하나만 사용한다. 버전 세그먼트 `v1`은 향후 스키마 변경 시 `v2`로 마이그레이션하기 위한 예약 자리다)
- value: 아래 구조를 JSON 직렬화한 문자열

```json
{
  "habits": [
    {
      "id": "string",
      "name": "string",
      "createdAt": "string (ISO 8601 날짜, 예: 2026-08-10)",
      "checks": {
        "2026-08-10": true,
        "2026-08-11": true
      }
    }
  ]
}
```

### 1.2 필드 규칙

- `id`: 고유 문자열. 생성 방식은 developer 구현 재량이나 충돌 없는 값이어야 한다 (예: `crypto.randomUUID()`, 실패 시 타임스탬프 fallback).
- `name`: trim 후 1~20자. `validateHabitName`(2장)을 통과한 값만 저장한다.
- `createdAt`: 습관 등록 시점의 `YYYY-MM-DD`.
- `checks`: **체크된 날짜만 key로 존재**하며 값은 항상 `true`다. 체크 해제 시 해당 key를 객체에서 삭제한다 (값을 `false`로 두지 않는다 — sparse 구조 유지).
- `checks`의 key 형식은 `YYYY-MM-DD`.

### 1.3 제약

- **`habits` 배열은 최대 8개까지만 허용한다.** 9번째 습관 추가 시도는 거부하고 `#habit-error-message`에 "최대 8개까지 등록할 수 있습니다" 오류를 표시한다 (저장 값은 변경되지 않는다).
- 습관 이름 중복은 등록 시점에 `validateHabitName`으로 차단한다 (대소문자 구분, trim 후 정확히 일치하는 경우만 중복으로 판정).

### 1.4 주(week) 정의

- 주는 **월요일 시작 ~ 일요일 종료** 7일이다.
- UI 계층이 현재 주의 7개 날짜를 `YYYY-MM-DD` 문자열 배열(월→일 순서, 예: `["2026-08-10", ..., "2026-08-16"]`)로 생성해 `weeklyRate`에 전달할 책임을 진다. 배열 생성 로직 자체는 이 문서의 스코프가 아니다 (developer 구현 재량, 단 순서와 개수는 고정).

---

## 2. 순수 함수 명세

두 함수 모두 `habit-tracker/habits.js`에서 export 하고 `habit-tracker/habits.test.js`에서 검증한다.

### 2.1 `weeklyRate(habit, weekDates)`

```
weeklyRate(habit: { checks: { [date: string]: true }, ... }, weekDates: string[]) -> number
```

- `weekDates`는 반드시 `YYYY-MM-DD` 문자열 7개로 구성된 배열이어야 한다.
- 반환값: `weekDates` 중 `habit.checks[date] === true`인 날짜 수를 7로 나눈 값 (0 이상 1 이하의 소수).
- `habit.checks`가 없거나 빈 객체면 `0`을 반환한다.
- `weekDates.length !== 7`이면 `Error`를 throw 한다 (메시지: `"weekDates must contain exactly 7 dates"`).
- `habit.checks`에 `weekDates` 범위 밖의 날짜가 있어도 그 날짜는 계산에서 제외한다 (교집합만 카운트).

#### 테스트 케이스 (`weeklyRate`)

| # | 입력 | 기대 출력 |
|---|---|---|
| W1 | `checks: {}`, `weekDates` 7개 | `0` |
| W2 | `checks`에 `weekDates` 7일 모두 `true` | `1` |
| W3 | `checks`에 `weekDates` 중 3일만 `true` | `3/7` (≈0.4285714285714286) |
| W4 | `checks`에 `weekDates` 범위 밖 날짜(예: 다음 주)만 `true` | `0` (범위 밖은 제외) |
| W5 | `weekDates.length === 6` (경계값 미만) | `Error` throw |
| W6 | `weekDates.length === 8` (경계값 초과) | `Error` throw |
| W7 | `checks`에 `weekDates` 중 1일만 `true` (경계값: 최소 유효 카운트) | `1/7` |

### 2.2 `validateHabitName(name, existingNames)`

```
validateHabitName(name: string, existingNames: string[]) -> { valid: boolean, error: string | null }
```

처리 순서 (첫 번째로 실패하는 규칙의 오류만 반환):

1. `name.trim()`이 빈 문자열이면 → `{ valid: false, error: "습관 이름을 입력하세요" }`
2. `name.trim().length > 20`이면 → `{ valid: false, error: "습관 이름은 20자 이내로 입력하세요" }`
3. `existingNames`(호출자가 이미 trim한 배열로 전달) 중 `name.trim()`과 정확히 일치(대소문자 구분)하는 항목이 있으면 → `{ valid: false, error: "이미 등록된 습관입니다" }`
4. 위 규칙을 모두 통과하면 → `{ valid: true, error: null }`

#### 테스트 케이스 (`validateHabitName`)

| # | 입력 | 기대 출력 |
|---|---|---|
| N1 | `name: ""`, `existingNames: []` | `valid:false`, 빈 이름 오류 |
| N2 | `name: "   "` (공백만), `existingNames: []` | `valid:false`, 빈 이름 오류 |
| N3 | `name: "운동"`, `existingNames: []` | `valid:true`, `error:null` |
| N4 | `name: "운동"`, `existingNames: ["운동"]` | `valid:false`, 중복 오류 |
| N5 | `name`이 정확히 20자, `existingNames: []` (경계값: 통과) | `valid:true`, `error:null` |
| N6 | `name`이 정확히 21자, `existingNames: []` (경계값: 실패) | `valid:false`, 길이 오류 |
| N7 | `name: "  운동  "` (앞뒤 공백), `existingNames: []` | `valid:true` (trim 후 유효) |
| N8 | `name: "운동"`, `existingNames: ["요가", "독서"]` (다른 이름과만 비교) | `valid:true` (중복 아님) |

---

## 3. UI 인터페이스 계약 (frozen)

designer와 developer는 아래 selector·상태·토큰을 그대로 사용한다. 재정의하지 않는다.

### 3.1 DOM

- root: `#habit-tracker-root`
- 입력: `#habit-name-input`
- 추가 버튼: `#habit-add-button`
- 오류 영역: `#habit-error-message`
- 주간 요약: `#weekly-summary`
- 체크 그리드: `#habit-grid`

### 3.2 CSS class

- `.habit-row`, `.habit-cell`, `.habit-cell--checked`, `.habit-rate`, `.summary-bar`

### 3.3 상태

- `empty` (습관 0개), `idle` (정상 표시), `error` (검증 실패), `success` (등록/체크 성공)
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로도 노출한다.

### 3.4 디자인 토큰

```
--color-action-primary: #2563eb
--color-success: #16a34a
--color-error: #dc2626
--color-cell-checked: #22c55e
--color-cell-empty: #e5e7eb
--font-family-base: system-ui, -apple-system, "Segoe UI", sans-serif
--space-grid-gap: 8px
```

### 3.5 접근성

- `#habit-name-input`은 `aria-label="습관 이름 입력"`을 가진다.
- 체크 그리드 셀은 `button` 요소이며 `aria-pressed`로 완료 상태를 전달한다.
- `#habit-error-message`는 `role="alert"`로 오류 발생 시 스크린리더에 즉시 공지된다.

### 3.6 반응형

- 320px 이상에서 `#habit-grid`는 가로 overflow 없이 표시되거나 `overflow-x:auto`로 스크롤 가능하다.
- 600px 미만에서 요일 헤더 라벨이 축약형(월,화,수,목,금,토,일)으로 표시되어 레이아웃 overflow가 발생하지 않는다.

### 3.7 후조건

- 습관 등록/체크 토글이 성공하면 상태와 `localStorage`가 즉시 갱신되고 `weekly-summary`가 최신 완료율을 반영한다.
- 검증 실패(빈 이름/중복/20자 초과/최대 8개 초과) 후에는 입력값과 진행 표시가 초기 상태로 복원되며 `#habit-name-input`과 `#habit-add-button`을 즉시 다시 사용할 수 있다.

---

## 4. 범위 밖

- 본 문서는 새 파일이나 새 역할을 추가하지 않는다. 위 소유권 표(0장)가 유일한 권위다.
- 서버/백엔드 연동, 다중 기기 동기화는 이번 스코프에 포함하지 않는다 (localStorage 단일 기기 저장으로 한정).

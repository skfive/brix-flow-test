# BF-1933 단위 변환기 구현 설계 (Implementation Plan)

- Jira: BF-1936 (본 문서 작성) / 상위 Epic: BF-1933
- 작성자: 박기획 (planner)
- 후속 소비자: BF-1934 (designer), BF-1935 (developer)
- 상태: frozen — 아래 계약은 designer/developer가 그대로 따르며 재정의하지 않는다.

> 본 문서는 Role Work Packet에 첨부된 frozen blueprint(`planning-contract@v1`, `ui-contract@v1`)를
> 그대로 설명한다. 새로운 파일, 새로운 역할, 새로운 소유권을 추가하지 않는다.

## 1. 파일 소유권 (frozen — 변경 금지)

| 파일 | 소유자 | 상태 |
|---|---|---|
| `docs/plans/BF-1933/implementation-plan.md` | planner (본 문서) | active |
| `docs/design/unit-converter-BF-1933.md` | designer (BF-1934) | additive — 이 계획 문서의 계약을 그대로 구현 |
| `unit-converter.html` | developer (BF-1935) | additive — 이 계획 문서의 계약을 그대로 구현 |

designer와 developer는 서로의 소유 파일을 수정하지 않는다. 각자 자신의 산출물 안에서 아래 §2~§5 계약을 그대로 구현한다.

## 2. 화면 구성 및 DOM 계약 (frozen)

- 파일명: `unit-converter.html` (developer 소유, 저장소 루트)
- Route: 정적 서빙(`serve_root=.`, root-relative-static) 기준 `/unit-converter.html`

### 2.1 DOM ID (exact, 변경/재정의 금지)

| id | 역할 |
|---|---|
| `unit-converter-app` | 전체 위젯 루트 컨테이너 |
| `category-select` | 변환 종류 선택(길이/무게/온도) |
| `input-value` | 입력 값 필드 |
| `input-unit` | 입력 단위 선택 |
| `output-value` | 결과 값 표시 필드(읽기 전용) |
| `output-unit` | 출력 단위 선택 |
| `swap-button` | 입력/출력 단위 맞바꾸기 버튼 |
| `error-message` | 오류 메시지 표시 영역 |

### 2.2 CSS class (exact, 변경/재정의 금지)

- `unit-converter` — 루트 컨테이너
- `unit-converter__field` — 개별 입력/선택 필드 wrapper
- `unit-converter__error` — 오류 메시지 스타일
- `unit-converter__swap-btn` — 맞바꾸기 버튼 스타일

### 2.3 Design Token (exact, 변경/재정의 금지)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-error-text` | `#b91c1c` | `error-message` 텍스트 색상 |
| `--color-border-default` | `#cbd5e1` | 필드 기본 테두리 색상 |
| `--space-field-gap` | `12px` | 필드 간 간격 |

## 3. 상태 모델 (frozen — exact 3개 상태)

| 상태 | 진입 조건 | 화면 표현 |
|---|---|---|
| `idle` | 최초 로드, 또는 `category-select` 변경 직후 | `output-value` 비어 있음, `error-message` 비어 있음. 상태명이 텍스트로 노출됨(색상만으로 구분하지 않음) |
| `result-updated` | `input-value`가 유효한 숫자이고 `input-unit`/`output-unit`이 선택된 상태에서 계산 성공 | `output-value`에 계산 결과 표시, `error-message` 비어 있음 |
| `invalid-input` | `input-value`가 숫자가 아니거나(공백 포함) §5.4 edge case 조건에 해당 | `error-message`에 사유 텍스트 표시(`role="alert"`), `output-value`는 이전 값을 유지하지 않고 비움 |

상태 전이 트리거:
1. `category-select` 변경 → 항상 `idle`로 리셋 (입력값/오류 초기화, `input-unit`/`output-unit`은 새 카테고리의 첫 번째/두 번째 단위로 리셋).
2. `input-value` 변경 또는 `input-unit`/`output-unit` 변경 → 유효성 검사 후 `result-updated` 또는 `invalid-input`으로 전이.
3. `swap-button` 클릭 → `input-unit` ↔ `output-unit`, `input-value` ↔ `output-value`(숫자로 파싱 가능한 경우) 교체 후 재계산하여 `result-updated` 또는 `invalid-input`으로 전이.
4. 위 모든 전이 이후에도 `category-select`, `input-value`, `input-unit`, `output-unit`, `swap-button`은 즉시 재사용 가능해야 한다(비활성화 상태로 고정되지 않음).

## 4. 접근성 요구사항 (frozen)

- `input-value`, `input-unit`, `output-unit`, `category-select`, `swap-button` 각각에 `for`/`id`로 연결된 `<label>`이 있어야 한다.
- 모든 조작(종류 선택, 값 입력, 단위 선택, 맞바꾸기)은 마우스 없이 Tab/Enter만으로 가능해야 한다.
- `error-message`는 `role="alert"`로 선언하여 스크린리더에 즉시 공지되어야 한다.
- 상태(`idle`/`result-updated`/`invalid-input`)는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름(예: `aria-label` 또는 가시 텍스트)으로 노출해야 한다.

## 5. 변환 규칙

### 5.1 길이 (기준 단위: m)

| 단위 | m 환산 계수 (1 단위 = N m) |
|---|---|
| m | 1 |
| km | 1000 |
| cm | 0.01 |
| inch | 0.0254 |
| feet | 0.3048 |

변환식: `결과 = (입력값 × 입력단위_m계수) / 출력단위_m계수`

### 5.2 무게 (기준 단위: kg)

| 단위 | kg 환산 계수 (1 단위 = N kg) |
|---|---|
| kg | 1 |
| g | 0.001 |
| lb | 0.45359237 |
| oz | 0.028349523125 |

변환식: `결과 = (입력값 × 입력단위_kg계수) / 출력단위_kg계수`

### 5.3 온도 (선형 계수 아님 — 공식 사용, 기준: 섭씨 경유)

| 변환 | 공식 |
|---|---|
| C → F | `F = C × 9/5 + 32` |
| F → C | `C = (F − 32) × 5/9` |
| C → K | `K = C + 273.15` |
| K → C | `C = K − 273.15` |
| F → K | `K = (F − 32) × 5/9 + 273.15` |
| K → F | `F = (K − 273.15) × 9/5 + 32` |

구현 시 임의의 입력 단위 → 섭씨(C)로 변환 → 목표 단위로 변환하는 2단계 경유 방식을 권장한다(길이/무게의 기준 단위 경유 방식과 동일한 패턴).

### 5.4 edge case / 실패 케이스 (frozen — `invalid-input` 조건)

- `input-value`가 빈 문자열이거나 숫자로 파싱 불가능한 경우 → `invalid-input`, `error-message`: "숫자를 입력하세요." 계열 텍스트.
- 온도 변환 결과가 절대영도(0K, 즉 -273.15℃, -459.67℉) 미만이 되는 경우 → `invalid-input`, `error-message`: "절대영도 미만은 입력할 수 없습니다." 계열 텍스트.
- 길이/무게 입력값이 음수인 경우 → `invalid-input` (물리적으로 음의 길이/무게는 존재하지 않음).
- 위 조건에서 벗어나 다시 유효한 값이 입력되면, 별도 새로고침 없이 즉시 `result-updated`로 복귀한다(§3의 재사용 가능 요구와 동일 원칙).

## 6. 반응형 breakpoint (frozen)

- 320px 이상 뷰포트에서 좌우 스크롤 없이 모든 필드(카테고리/입력/출력/맞바꾸기)가 표시되어야 한다.
- 600px 미만 뷰포트에서는 입력 필드 그룹과 출력 필드 그룹이 세로로 쌓인다(현재 600px 이상은 가로 배치를 허용하되 필수 요구는 아님 — designer 재량).

## 7. 후속 페르소나 작업 범위

- **designer (BF-1934)**: `docs/design/unit-converter-BF-1933.md`에 §2~§6 계약을 만족하는 시각/상호작용 디자인 명세(레이아웃, 상태별 시각 표현, 반응형 배치 상세)를 작성. DOM id/class/token을 재정의하지 않는다.
- **developer (BF-1935)**: `unit-converter.html`에 §2~§6 계약을 만족하는 실제 마크업/스타일/변환 로직을 구현. §5의 계수·공식을 그대로 사용한다.

이 문서 이후 설계·구현 단계에서 본 계약과 다른 값(다른 DOM id, 다른 변환 계수 등)을 발견하면 새 파일을 만들지 말고 Jira 코멘트로 planner에게 확인을 요청한다.

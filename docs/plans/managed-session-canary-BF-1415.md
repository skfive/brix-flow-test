# 관리형 세션 상태 카드 — 실행 설계 (BF-1418 / Epic BF-1415)

> 본 문서는 planner가 확정하는 **실행 설계(planning-contract@v1)** 이며, frozen
> **ui-contract@v1** 을 그대로 렌더링한 것이다. designer(BF-1416)와 developer(BF-1417)는
> 아래 계약을 병렬로 따르며, selector·token·상태 계약을 변경하거나 재정의하지 않는다.
> 파일 소유권·상태 계약의 유일한 권위는 frozen Execution Blueprint이며, 본 문서는 이를
> 재정의하지 않고 설명·전달만 한다.

## 1. 목표와 범위

- **목표**: 관리형 세션 상태를 페르소나 카드 목록으로 표시하고, 상태 필터로 카드를
  걸러 보는 canary 화면을 추가한다.
- **route**: `/demo/managed-session-canary`
- **불변 원칙 (설계에 명시)**:
  - 기존 **인증(auth)** 로직을 변경하지 않는다.
  - 기존 **공용 레이아웃(shared layout)** 을 변경하지 않는다.
  - **데이터베이스**를 변경하지 않는다 (스키마·마이그레이션 없음).
  - 신규 파일·역할을 추가하지 않으며, frozen blueprint에 명시된 산출물만 생산한다.

## 2. 파일 소유권 (frozen)

| 파일 경로 | 소유자 | artifact policy |
| --- | --- | --- |
| `demo/managed-session-canary/index.html` | developer | additive |
| `demo/managed-session-canary/src/feature.js` | developer | additive |
| `docs/design/managed-session-canary-BF-1415.md` | designer | additive |
| `docs/plans/managed-session-canary-BF-1415.md` | planner (본 문서) | — |

- 각 파일은 **additive** 정책이다: 기존 파일이 있으면 덧붙이며, 공용/인증/DB 영역을 건드리지 않는다.

## 3. 사용자 시나리오

1. 운영자가 `/demo/managed-session-canary` 진입 → 세션 상태를 불러오는 동안 로딩 텍스트 노출.
2. 데이터 도착 → 페르소나 카드 목록과 상태 요약 텍스트 표시, 상태 필터 활성화.
3. 운영자가 상태 필터로 `active`/`idle`/`error` 를 선택 → 해당 상태 카드만 렌더.
4. 선택 필터에 해당 카드가 없으면 빈 상태 안내 + `전체 보기` 복원 control 노출.
5. 상태 로드 실패 시 오류 텍스트 + `다시 시도` control, 재시도하면 로딩 상태로 복원.

## 4. UI 계약 (ui-contract@v1, frozen — 변경 금지)

### 4.1 파일
- `demo/managed-session-canary/index.html`
- `demo/managed-session-canary/src/feature.js`
- `docs/design/managed-session-canary-BF-1415.md`

### 4.2 DOM ID
| ID | 용도 |
| --- | --- |
| `session-canary-root` | 기능 루트 컨테이너 |
| `status-filter` | 상태 필터 control |
| `persona-card-list` | 페르소나 카드 목록 컨테이너 |
| `status-summary` | 상태 요약 텍스트 |

### 4.3 CSS class
- `session-canary` — 루트 스코프
- `session-canary__filter` — 필터 영역
- `persona-card` — 개별 카드
- `persona-card__status` — 카드 내 상태 텍스트
- `persona-card--active` — 활성 상태 변형
- `persona-card--idle` — 유휴 상태 변형
- `persona-card--error` — 오류 상태 변형

### 4.4 상태 (states) 및 화면 텍스트
| 상태 | 화면 동작 및 텍스트 |
| --- | --- |
| `loading` | `세션 상태를 불러오는 중…` 텍스트 표시, 필터 비활성 |
| `loaded` | 페르소나 카드 목록과 상태 요약 텍스트 표시, 필터 활성 |
| `empty` | 선택 필터에 해당 카드 없음 시 `해당 상태의 페르소나가 없습니다` 텍스트 + `전체 보기` 복원 control 활성 |
| `error` | `상태를 불러오지 못했습니다` 텍스트 + `다시 시도` control 표시, 재시도 시 `loading` 으로 복원 |

- **초기화/취소/실패 후조건**: 상태와 진행 표시를 초기값으로 되돌리고, 주 실행 control(필터·복원·재시도)을 다시 사용할 수 있어야 한다.

### 4.5 디자인 토큰 (design tokens, 재정의 금지)
| 토큰 | 값 |
| --- | --- |
| `--color-status-active` | `#16a34a` |
| `--color-status-idle` | `#64748b` |
| `--color-status-error` | `#dc2626` |
| `--space-card-gap` | `16px` |
| `--radius-card` | `8px` |

### 4.6 접근성 (accessibility)
- `status-filter` control은 명시적 `aria-label='상태 필터'` 를 가진다.
- 각 `persona-card__status` 는 색상 외에 상태 텍스트를 함께 노출한다.
- 필터 control은 키보드 Tab/Enter 로 조작 가능하다.
- 모든 상태는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.7 반응형 (responsive)
- `320px` 이상에서 카드 목록이 세로 스택으로 content overflow 없이 렌더된다.
- `640px` 이상에서 카드가 2열 grid로 배치된다.

## 5. 페르소나 상태·필터 데이터 흐름 (planning-contract@v1)

- **상태 모델**: 화면은 `loading → loaded → (empty|error)` 로 전이한다. `error` 재시도는 `loading` 으로 복귀한다.
- **카드 데이터**: 각 페르소나 카드는 `{ personaId, personaName, status }` 형태이며, `status ∈ {active, idle, error}`.
- **필터 데이터 흐름**: `status-filter` 선택값이 `persona-card-list` 렌더를 필터링한다. `전체 보기` 는 필터를 초기값(전체)으로 되돌린다.
- **상태 요약**: `status-summary` 는 현재 로드된 카드의 상태별 합계를 텍스트로 노출한다.
- **경계**: 모든 상태·필터 로직은 `demo/managed-session-canary/src/feature.js` 에 격리되며, 인증·공용 레이아웃·DB에 의존하지 않는다.

## 6. edge case · 실패 케이스

- 상태 로드 실패 → `error` 상태, `다시 시도` 로 `loading` 복원 (무한 오류 루프 없이 재시도 가능).
- 필터 결과 0건 → `empty` 상태, `전체 보기` 로 복원.
- 로딩 중 필터 조작 차단 (필터 비활성) → 경합 상태 방지.
- 320px 미만 유사 좁은 폭에서도 카드 목록이 overflow 없이 세로 스택으로 유지.
- 색맹/저시력 접근성: 색상 토큰과 무관하게 상태명 텍스트가 항상 노출.

## 7. Acceptance Criteria (Given/When/Then)

- **AC-1 (loading)**: Given 화면 진입, When 세션 상태 로드 중, Then `세션 상태를 불러오는 중…` 표시되고 `status-filter` 비활성.
- **AC-2 (loaded)**: Given 상태 로드 성공, When 데이터 도착, Then `persona-card-list` 에 카드 렌더 + `status-summary` 텍스트 + 필터 활성.
- **AC-3 (filter)**: Given loaded, When `status-filter` 로 특정 상태 선택, Then 해당 상태 카드만 표시.
- **AC-4 (empty)**: Given 필터 선택, When 해당 상태 카드 0건, Then `해당 상태의 페르소나가 없습니다` + `전체 보기` control 활성.
- **AC-5 (error/retry)**: Given 로드 실패, When `error` 상태, Then `상태를 불러오지 못했습니다` + `다시 시도` 표시, And 재시도 시 `loading` 복원.
- **AC-6 (a11y)**: Given 임의 상태, Then `status-filter` 는 `aria-label='상태 필터'`, 각 `persona-card__status` 는 상태 텍스트 노출, 필터는 Tab/Enter 조작 가능.
- **AC-7 (responsive)**: Given 320px 이상, Then 카드가 세로 스택 overflow 없이 렌더, And 640px 이상에서 2열 grid.
- **AC-8 (경계)**: Given 전체 구현, Then 인증·공용 레이아웃·DB 미변경, And frozen selector/token 미변경, And 신규 파일/역할 미추가.

## 8. 검증

- 저장소 권위 focused 검증 명령: `node --test demo/managed-session-canary/tests/*.test.js`
- 테스트는 owned_paths(`demo/managed-session-canary/**`)와 위 AC를 검증한다.

## 9. 산출물 경로

- planner: `docs/plans/managed-session-canary-BF-1415.md` (본 문서)
- designer: `docs/design/managed-session-canary-BF-1415.md`
- developer: `demo/managed-session-canary/index.html`, `demo/managed-session-canary/src/feature.js`
- tester(BF-1420): `demo/managed-session-canary/tests/feature.test.js`

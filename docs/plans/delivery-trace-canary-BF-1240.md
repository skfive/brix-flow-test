# 납품 추적 상태 보드 실행 계약 (BF-1240 blueprint / BF-1243 planner freeze)

> 본 문서는 planner(박기획)가 PM 분해를 **동결된 실행 계약**으로 구체화한 planning 산출물이다.
> frozen blueprint(`planning-contract@v1`, `ui-contract@v1`)가 파일 소유권·상태 계약의 **유일한 권위**이며,
> 본 문서는 그 계약을 렌더링할 뿐 파일·역할·요구사항을 새로 추가하거나 재정의하지 않는다.
> downstream 소비자: designer(BF-1241), developer(BF-1242), tester(BF-1245).

## 0. 계약 메타 / 소유권

| 항목 | 값 |
| --- | --- |
| 대상 route | `/demo/delivery-trace-canary` (root-relative static) |
| primary_repo | backend |
| planning-contract 산출물 | `docs/plans/delivery-trace-canary-BF-1240.md` (본 문서) |
| ui-contract availability | blueprint-frozen |
| 권위 검증 명령 | `node --test demo/delivery-trace-canary/tests/*.test.js` |

### 0.1 파일 소유권 (frozen — 재배정 금지)

| 파일 | 소유자 | artifact-policy |
| --- | --- | --- |
| `apps/backend/src/demo/delivery-trace-canary/board.css` | developer | additive |
| `apps/backend/src/demo/delivery-trace-canary/board.ts` | developer | additive |
| `apps/backend/src/demo/delivery-trace-canary/fixtures.ts` | developer | additive |
| `apps/backend/src/demo/delivery-trace-canary/index.d.ts` | developer | additive |
| `docs/design/delivery-trace-canary-BF-1240.md` | designer | additive |
| `docs/design/delivery-trace-canary-mockup.html` | designer | additive |

> ⚠ **ownership 교정 주의**: 요청 URL의 expected_entry_path(`demo/delivery-trace-canary/index.html`)는
> 현재 어떤 역할의 owned_paths에도 포함되지 않는다. developer는 위 표의 owned 파일만 구현하고,
> entry HTML이 별도 owned로 배정되지 않은 점을 fail-honest하게 보고한다. 임의 경로에 구현하지 않는다.

## 1. 요구사항 추적표 (Requirement → Design → Implementation → Review → Test)

| Req | 요구사항 | Design evidence | Implementation evidence | Test evidence |
| --- | --- | --- | --- | --- |
| REQ-1 | 5단계 추적 연결(Requirement→Design→Implementation→Review→Test)을 상태 보드로 표시 | `docs/design/delivery-trace-canary-BF-1240.md`, mockup | `board.ts` ready 상태 렌더 | `board.test.ts` ready 검증 |
| REQ-2 | 상태 필터로 단계 강조/흐림 전환 | mockup 필터 UI | `trace-stage-filter` + `filtered` 상태 | filtered 상태 검증 |
| REQ-3 | 누락 evidence 단계에 경고 텍스트·보완 대상 목록 표시 | mockup 경고 영역 | `trace-evidence-warning` + `missing-evidence` 상태 | missing-evidence 검증 |
| REQ-4 | 단계 선택 시 상세 패널에 evidence 상세 표시 | mockup 상세 패널 | `trace-detail-panel` + `detail-open` 상태 | detail-open 검증 |
| REQ-5 | 로딩/오류 상태를 화면 텍스트로 안내 | mockup 상태 문구 | `loading`/`error` 상태 | loading·error 검증 |
| REQ-6 | 접근성(키보드·aria)·반응형 요구 충족 | mockup 접근성 주석 | `board.css`, `board.ts` | 접근성/반응형 스펙 검증 |

### 1.1 누락 evidence 경고 규칙 (trace 연결)

- 추적표의 각 Req는 Design·Implementation·Review·Test evidence를 **모두** 가져야 한다.
- 어느 단계 evidence가 비어 있으면 해당 단계는 `missing-evidence` 상태로 분류하고,
  화면에 `누락된 evidence — 보완 대상` 경고 텍스트와 보완 대상 목록을 표시한다.
- 경고는 `trace-evidence-warning` 영역에 `aria-live="polite"`로 노출한다(스크린리더 전달).

## 2. 화면/상태/인터페이스 계약 (ui-contract@v1 — blueprint-frozen)

### 2.1 DOM ID / CSS class (exact — 변경·재정의 금지)

- **DOM IDs**: `delivery-trace-board`, `trace-stage-filter`, `trace-detail-panel`, `trace-evidence-warning`
- **CSS classes**: `trace-board`, `trace-board__stage`, `trace-board__filter`, `trace-board__detail`, `trace-board__warning`

### 2.2 상태 모델 (화면 텍스트 포함)

| 상태 | 화면 동작·텍스트 |
| --- | --- |
| `loading` | `추적 데이터를 불러오는 중` 안내 텍스트 표시 |
| `ready` | Requirement→Design→Implementation→Review→Test 5단계 연결과 단계별 완료 상태를 한국어/영문 용어로 표시 |
| `filtered` | 선택된 상태 필터에 해당하는 단계만 강조, 나머지는 흐리게 표시 |
| `missing-evidence` | `누락된 evidence — 보완 대상` 경고 텍스트와 보완 대상 목록 표시 |
| `detail-open` | 상세 패널에 선택 단계의 evidence 상세를 텍스트로 표시 |
| `error` | `추적 데이터를 표시할 수 없습니다` 오류 텍스트와 재시도 안내 표시 |

> **초기화·후조건 불변식**: 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고
> 주 실행 control을 다시 사용할 수 있어야 한다.

### 2.3 Design token / CSS 변수 (exact 값)

| 변수 | 값 |
| --- | --- |
| `--color-stage-complete` | `#16a34a` |
| `--color-stage-pending` | `#9ca3af` |
| `--color-evidence-missing` | `#dc2626` |
| `--space-board-gap` | `16px` |

### 2.4 접근성 요구

- 상태 필터(`trace-stage-filter`)는 키보드 Tab/Enter로 탐색 가능하고, 각 필터에 명시적 `aria-label`을 가진다.
- 상세 패널(`trace-detail-panel`)은 `role="region"`과 `aria-label`을 가지며, 열릴 때 포커스를 받는다.
- 누락 evidence 경고(`trace-evidence-warning`)는 `aria-live="polite"`로 스크린리더에 전달된다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 2.5 반응형 요구

- 320px 이상에서 상태 보드 content overflow가 발생하지 않는다.
- 480px 미만에서 단계 카드가 세로 스택으로 재배치된다.

## 3. 결정론적 fixture 계약

- fixture 소유 파일: `apps/backend/src/demo/delivery-trace-canary/fixtures.ts` (developer, additive).
- 6개 상태(`loading`, `ready`, `filtered`, `missing-evidence`, `detail-open`, `error`)를 각각 재현할 수 있는
  **결정론적** 데이터 셋을 노출한다(랜덤·시각 의존 금지 — 테스트 재현성 보장).
- `ready` fixture는 5단계 전 evidence 완결, `missing-evidence` fixture는 최소 1개 단계 evidence 누락을 포함한다.
- 타입 계약은 `apps/backend/src/demo/delivery-trace-canary/index.d.ts`에 선언한다.

## 4. 역할별 Work Packet

### 4.1 designer (BF-1241)
- 산출물: `docs/design/delivery-trace-canary-BF-1240.md`, `docs/design/delivery-trace-canary-mockup.html` (additive).
- §2의 selector·상태 텍스트·token·접근성·반응형 계약을 **그대로** 시안으로 표현한다. selector/token 재정의 금지.

### 4.2 developer (BF-1242)
- 산출물: `board.css`, `board.ts`, `fixtures.ts`, `index.d.ts` (모두 additive).
- §2 계약 selector/상태/token을 구현하고 §3 fixture 계약을 충족한다.
- entry HTML이 owned로 배정되지 않은 점은 fail-honest 보고 대상(§0.1 참조).

### 4.3 tester (BF-1245)
- 권위 검증 명령 `node --test demo/delivery-trace-canary/tests/*.test.js`로 §5 테스트 명세를 검증한다.

## 5. 테스트 명세

권위 검증 명령: `node --test demo/delivery-trace-canary/tests/*.test.js`

| ID | 대상 | 기대 결과 |
| --- | --- | --- |
| T-1 | ready 상태 | 5단계 연결·단계별 완료 상태가 한국어/영문 용어로 렌더된다 |
| T-2 | filtered 상태 | 선택 필터 단계만 강조되고 나머지는 흐리게 표시된다 |
| T-3 | missing-evidence 상태 | `누락된 evidence — 보완 대상` 경고와 보완 대상 목록이 노출된다 |
| T-4 | detail-open 상태 | 상세 패널에 선택 단계 evidence 상세가 텍스트로 표시된다 |
| T-5 | loading / error 상태 | 각각 로딩 안내 / `추적 데이터를 표시할 수 없습니다` 오류 텍스트가 표시된다 |
| T-6 | 접근성 | 필터 aria-label, 상세 패널 role/포커스, 경고 aria-live가 존재한다 |
| T-7 | 반응형 | 320px overflow 없음, 480px 미만 세로 스택 재배치 |
| T-8 | 초기화 후조건 | 취소·실패 후 상태/진행 표시가 초기값으로 복귀하고 주 control 재사용 가능 |

## 6. 소비 규약 (invariant)

- designer/developer는 승인된 실행 설계와 fixture 계약을 따르며 재정의하지 않는다.
- designer/developer는 selector와 token을 변경하거나 재정의하지 않는다.
- 파일 소유권과 상태 계약은 frozen blueprint가 유일한 권위이며, 본 문서는 이를 재정의하지 않는다.
- 모든 owned 파일 변경은 additive 정책을 따른다.

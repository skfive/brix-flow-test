# managed-session-canary — 구현 설계 및 UI 계약 (BF-1424)

## 1. 개요

관리형 세션 상태를 페르소나별 카드로 보여주는 정적 캔버스(`demo/managed-session-canary-0801`)의 구현 설계 문서다. 본 문서는 PM이 분해한 Story를 바탕으로 designer·developer가 그대로 따를 실행 설계와, 두 역할이 변경하거나 재정의할 수 없는 **frozen UI 계약**을 기술한다.

본 문서는 상위 실행 패킷(`ROLE_WORK_PACKET_V2`)에 이미 동결된 `ui-contract@v1` 인터페이스의 내용을 그대로 옮겨 적은 것이며, 새로운 파일·DOM 구조·상태·역할을 추가하지 않는다.

## 2. 파일 소유권 (Frozen — 재정의 금지)

| 경로 | 소유 역할 | 설명 |
|---|---|---|
| `demo/managed-session-canary-0801/index.html` | developer | 캔버스 마크업. 아래 DOM 계약을 그대로 구현한다. |
| `demo/managed-session-canary-0801/src/feature.js` | developer | 상태 전이·렌더링 로직. |
| `docs/design/managed-session-canary-BF-1421.md` | designer | 시각 명세(레이아웃, 색상 적용, 반응형 브레이크포인트 상세). |
| `docs/plans/managed-session-canary-BF-1421.md` (본 문서) | planner | 실행 설계 및 UI 계약 동결. |

두 산출물(`index.html`, `src/feature.js`, `docs/design/managed-session-canary-BF-1421.md`)은 모두 **additive**로 취급한다 — 기존 파일을 덮어쓰거나 다른 canary의 파일을 재사용하지 않는다.

## 3. DOM 계약 (Frozen)

- **DOM ID**
  - `session-status-root` — 상태 영역의 루트 컨테이너. `aria-live="polite"`로 상태 변경을 알린다.
  - `persona-card-list` — 페르소나별 상태 카드를 담는 목록 컨테이너.
  - `session-refresh` — 새로고침 control. `aria-label="세션 상태 새로고침"`을 가진다.
- **CSS 클래스**
  - `session-card` — 카드 컨테이너.
  - `session-card__persona` — 카드 내 페르소나 표기 영역.
  - `session-card__status` — 카드 내 상태 표기 영역.

designer·developer는 위 selector(ID/class)를 변경하거나 새 이름으로 재정의하지 않는다.

## 4. 상태별 계약 (Frozen)

| 상태 | 화면 텍스트 | 동작 |
|---|---|---|
| `loading` | `세션 데이터를 불러오는 중…` | `session-status-root`에 로딩 텍스트와 진행 표시(progress indicator)를 노출한다. |
| `ready` | (카드 목록) | `persona-card-list`에 페르소나별 상태 카드 목록을 렌더한다. |
| `empty` | `표시할 세션이 없습니다` | 카드가 0건일 때 노출한다. |
| `error` | `데이터를 불러오지 못했습니다. 다시 시도하세요` | 재시도 안내 문구와 함께 노출한다. |

모든 상태는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름(accessible name)으로 함께 노출한다.

### 4.1 재시도(초기화) 및 새로고침 재활성화 규칙 (Frozen)

- `error` 상태에서 사용자가 재시도(초기화)를 실행하면, 상태와 진행 표시를 초기값(`loading`)으로 되돌린다.
- 진행 중 실패가 발생해도 `session-refresh` control은 다시 사용할 수 있는 상태로 복원되어야 한다 — 실패 후 control이 비활성(disabled)으로 고정되는 것을 금지한다.
- 초기화·취소·실패 이후에는 항상 주 실행 control(`session-refresh`)을 재사용할 수 있어야 하며, 상태 표시도 함께 초기값으로 복원되어야 한다.

## 5. 디자인 토큰 (Frozen)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-surface-card` | `#ffffff` | 카드 배경색 |
| `--color-status-pass` | `#16a34a` | 정상/통과 상태 강조색 |
| `--space-card-gap` | `16px` | 카드 간 간격 |

## 6. 접근성 (Frozen)

- `session-refresh` control은 `aria-label="세션 상태 새로고침"`을 가진다.
- `session-status-root`는 `aria-live="polite"` 영역으로 상태 변경을 안내한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

## 7. 반응형 (Frozen)

- 320px 이상: 카드 목록이 세로 스택으로 배치되고 content overflow가 발생하지 않는다.
- 768px 이상: 카드가 다열(multi-column) 그리드로 배치된다.

## 8. 산출물 경로

- `demo/managed-session-canary-0801/index.html` (developer)
- `demo/managed-session-canary-0801/src/feature.js` (developer)
- `docs/design/managed-session-canary-BF-1421.md` (designer)
- 저장소 권위 검증 명령: `node --test demo/managed-session-canary-0801/tests/*.test.js` (tester가 후속 단계에서 `demo/managed-session-canary-0801/tests/feature.test.js`를 작성·실행한다.)

## 9. 후조건

- designer는 본 문서 3~7절의 selector·상태·토큰·접근성·반응형 규칙을 그대로 반영하는 시각 명세를 `docs/design/managed-session-canary-BF-1421.md`에 작성한다.
- developer는 본 문서 3~7절을 그대로 구현하며, DOM ID/class·상태 텍스트·토큰 값을 재정의하지 않는다.
- 파일 소유권과 상태 계약의 유일한 권위는 본 문서가 아니라 상위 frozen blueprint(`ROLE_WORK_PACKET_V2`)이며, 본 문서는 이를 그대로 옮겨 적은 참조본이다.

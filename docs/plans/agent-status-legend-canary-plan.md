# 상태 범례 페이지 구현 설계 및 UI 계약 (BF-1474)

## 개요
에이전트 상태 범례(agent status legend) canary 페이지의 구현 설계와 handoff 계약을 동결한다. 본 문서는 designer(BF-1472)와 developer(BF-1473)가 그대로 따라야 할 frozen UI 계약(selector·상태 텍스트·token·접근성·반응형)과 상태 전이를 명시하며, tester(BF-1476)가 회귀 가드를 작성할 때 참조하는 시나리오를 포함한다.

이 문서는 frozen Execution Blueprint가 정한 파일 소유권과 산출물 경로를 그대로 설명하며, 새로운 파일이나 역할을 추가하지 않는다.

## 파일 소유권 (frozen — 재정의 금지)
| 경로 | 소유 역할 | 비고 |
|---|---|---|
| `demo/agent-status-legend-canary/index.html` | developer | 정적 마크업 |
| `demo/agent-status-legend-canary/src/feature.js` | developer | 선택·초기화 상태 로직 |
| `docs/design/agent-status-legend-canary-contract.md` | designer | 시각 명세·mockup |
| `docs/plans/agent-status-legend-canary-plan.md` | planner (본 문서) | 구현 설계·상태 전이 문서 |
| `demo/agent-status-legend-canary/tests/feature.test.js` | tester | focused 회귀 가드 (read-only 참조) |

## UI 계약 (frozen — selector/token 변경 금지)

### DOM ID
`legend-root`, `legend-status-list`, `legend-detail-panel`, `legend-reset`

### CSS class
`legend`, `legend__item`, `legend__badge`, `legend__detail`, `legend__reset`

### Design token / CSS 변수
- `--color-surface-card: #1e293b`
- `--color-status-running: #3b82f6`
- `--color-status-waiting: #eab308`
- `--color-status-action: #f97316`
- `--color-status-stalled: #ef4444`
- `--color-status-done: #22c55e`
- `--space-card-gap: 16px`

### 5개 상태 모델 및 노출 텍스트
`legend-status-list`는 아래 5개 상태 배지(`legend__badge`)를 고정 순서로 렌더링한다. 각 배지는 색상 토큰과 함께 상태명 텍스트 라벨을 항상 포함한다(색상만으로 구분 금지).

| 상태 키 | 색상 토큰 | 상태명(화면 텍스트) | 의미 | 다음 행동 |
|---|---|---|---|---|
| `running` | `--color-status-running` | 실행 중 | 에이전트가 현재 작업을 수행하고 있다 | 진행 상황을 계속 지켜본다 |
| `waiting` | `--color-status-waiting` | 대기 중 | 에이전트가 선행 작업이나 리소스를 기다리고 있다 | 차단 요인이 해소될 때까지 기다린다 |
| `action-needed` | `--color-status-action` | 조치 필요 | 운영자의 확인·승인이 필요하다 | 지금 확인하고 필요한 조치를 취한다 |
| `stalled` | `--color-status-stalled` | 정체됨 | 예상보다 오래 진행 없이 멈춰 있다 | 원인을 점검하고 필요하면 재시작한다 |
| `done` | `--color-status-done` | 완료 | 작업이 정상적으로 종료되었다 | 결과를 검토하고 다음 단계로 진행한다 |

`legend-detail-panel`은 사용자가 선택한 상태의 "상태명 / 의미 / 다음 행동" 3개 텍스트를 그대로 표시한다.

### 접근성
- 각 `legend__badge`는 색상 외에 상태명 텍스트 라벨을 포함한다(위 표의 "상태명" 값).
- `legend-reset` control은 명시적인 `aria-label`(예: '범례 초기화')을 가진다.
- `legend-status-list`의 각 항목은 Tab/Shift+Tab으로 순회 가능하고 Enter/Space로 선택을 활성화할 수 있다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름(예: `aria-label` 또는 텍스트 노드)으로 함께 노출한다.

### 반응형
- 320px 이상에서 상태 카드(`legend__item`) content overflow가 발생하지 않는다.
- 좁은 화면에서 `legend-status-list`는 세로로 스택된다.

## 상태 모델 (in-memory, 영속화 없음)
서버 API·localStorage 없음 — 선택 상태는 페이지 세션 동안만 메모리에 유지되는 client-only UI 상태다.

- `selectedStatus: 'running' | 'waiting' | 'action-needed' | 'stalled' | 'done' | null`
- 초기값은 `null`(미선택) — 페이지 로드 시 특정 상태를 임의로 미리 선택하지 않는다.

## 상태 전이 (Given/When/Then)

### 1) 기본 전체 보기 (초기 로드)
- Given 페이지가 처음 로드되었을 때
- Then `legend-status-list`에 5개 상태 배지가 모두 표시된다(`selectedStatus = null`)
- And `legend-detail-panel`에는 상태 미선택을 안내하는 기본 placeholder 텍스트가 표시된다(5개 상태 중 어떤 것도 자동 선택하지 않는다)

### 2) 상태 선택 → 상세 보기
- Given `legend-status-list`가 기본 전체 보기 상태일 때
- When 사용자가 특정 상태 배지를 클릭하거나 포커스 후 Enter/Space로 활성화하면
- Then 해당 배지가 선택 상태로 표시되고(`selectedStatus`가 해당 상태 키로 갱신) `legend-detail-panel`에 그 상태의 상태명·의미·다음 행동 텍스트가 표시된다
- And 목록은 선택된 항목만 남기고 나머지는 필터링되어(전체 보기가 아닌 단일 상태 보기로) 표시된다

### 3) 동일 항목 재클릭 → 선택 해제
- Given 특정 상태가 선택되어 있을 때
- When 사용자가 동일한 배지를 다시 클릭/활성화하면
- Then 선택이 해제되고 `legend-reset`을 누른 것과 동일하게 기본 전체 보기로 되돌아간다

### 4) legend-reset → 기본 전체 보기 복원
- Given 임의의 상태가 선택되어 있거나(또는 미선택 상태이거나) `legend-detail-panel`에 상세 텍스트가 표시 중일 때
- When 사용자가 `legend-reset`을 클릭하면
- Then `selectedStatus`가 `null`로 초기화되고 `legend-status-list`에 5개 상태 배지가 모두 다시 표시된다
- And `legend-detail-panel`은 기본 placeholder 텍스트로 되돌아간다
- And `legend-reset` 자신을 포함한 주 실행 control들은 초기화 직후 다시 정상적으로 사용 가능하다(초기화 후 재사용 invariant)

## Edge case / 실패 케이스
- 페이지 최초 로드 시 5개 상태 중 하나를 자동 선택하지 않는다(placeholder 유지, 임의 편향 금지).
- 선택 상태에서 `legend-reset`을 연속으로 여러 번 클릭해도 항상 동일한 기본 전체 보기로 수렴한다(예외 throw 금지).
- 키보드만으로 `legend-status-list` 순회 → 항목 선택 → `legend-reset` 도달까지 전체 흐름이 가능해야 한다(Tab 순서 단절 금지).
- 320px 폭에서 단일 상태 보기(선택 후)와 전체 보기(초기화 후) 모두 텍스트/배지 overflow가 발생하지 않아야 한다.
- 상태 배지의 시각적 강조(선택 표시)는 색상 변경만으로 하지 않고 텍스트 또는 접근성 속성 변화를 동반해야 한다(색상 단독 구분 금지 원칙 재확인).

## API 스펙
해당 없음 — client-only 정적 canary이며 서버 API를 추가하지 않는다.

## 검증 명령
- `node --test demo/agent-status-legend-canary/tests/*.test.js`

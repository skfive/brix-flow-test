# 준비도 대시보드 구현 설계 (BF-1376 · BF-1388 planner)

> 본 문서는 frozen Execution Blueprint(`ui-contract@v1`, `planning-contract@v1`)를
> designer·developer가 병렬로 따를 수 있게 렌더링한 실행 설계입니다.
> **이 문서는 frozen blueprint를 유일한 권위로 설명할 뿐, 파일·소유자·상태 계약을 재정의하지 않습니다.**
> 새 파일·새 역할·계약 밖 요구를 추가하지 않습니다.

- 대상 route: `/demo/managed-session-readiness-canary`
- 대상 엔트리: `demo/managed-session-readiness-canary/index.html`
- 저장소 권위 검증 명령: `node --test demo/managed-session-readiness-canary/tests/*.test.js`
- 데이터 소스: **정적 fixture만 사용** (네트워크·타이머·실서버 연결 없음)

## 0. Ownership 교정 참고 (fail-honest)

현재 planner task(BF-1388)의 owned_paths는 `docs/plans/managed-session-readiness-canary-BF-1376.md` **하나뿐**입니다.
아래 표의 구현 파일은 planner가 만들지 않으며, frozen blueprint의 file_owner에 따라 designer·developer가 소유합니다.
`repo-convention` capsule은 requested URL의 `expected_entry_path`가 planner owned_paths에 없다는 사실을 correction으로 명시합니다 —
이는 정상이며, planner는 계획 문서만 작성하고 구현 파일은 담당 페르소나가 각자 owned_paths에서 생성합니다.

## 1. 파일 소유권 · 상태 · 후조건 (frozen — 그대로 준수)

| 파일 | 소유자 | artifact-policy | 상태 계약 |
|------|--------|-----------------|-----------|
| `demo/managed-session-readiness-canary/index.html` | developer | additive | 신규 생성 후 route에서 서빙 |
| `demo/managed-session-readiness-canary/src/app.js` | developer | additive | fixture 로드·렌더·상태 전환 |
| `demo/managed-session-readiness-canary/src/fixtures.js` | developer | additive | 정적 fixture export |
| `demo/managed-session-readiness-canary/src/styles.css` | developer | additive | 토큰·반응형 레이아웃 |
| `demo/managed-session-readiness-canary/tests/unit.test.js` | developer | additive | 단위 테스트 |
| `docs/design/managed-session-readiness-canary-BF-1376.md` | designer | additive | UI 스펙 문서 |

**불변식(invariant):**
- designer·developer는 selector와 token을 변경하거나 재정의하지 않는다.
- 파일 소유권·상태 계약은 frozen blueprint가 유일한 권위이며 본 문서는 이를 재정의하지 않는다.
- 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control(`#refresh-control`)을 다시 사용할 수 있어야 한다.
- 모든 파일은 `additive` 정책 — 기존 코드를 파괴적으로 수정하지 않고 신규 추가만 한다.

## 2. Exact UI 계약 (frozen — selector·token 변경 금지)

### 2.1 DOM ID (정확히 이 id만 사용)

| DOM ID | 역할 |
|--------|------|
| `readiness-root` | SPA 루트 컨테이너 |
| `session-mode-panel` | managed-session 연결 방식(process-print/managed-session) 표시 패널 |
| `provider-status-list` | provider 상태 목록(healthy/degraded) |
| `handoff-status-list` | handoff 상태 목록(pending/completed) |
| `refresh-control` | 주 실행 control(새로고침 버튼) |

### 2.2 CSS class (정확히 이 class만 사용)

| CSS class | 용도 |
|-----------|------|
| `readiness-dashboard` | 대시보드 레이아웃 래퍼 |
| `readiness-card` | 개별 상태 카드 |
| `status-badge` | 상태 배지 기본 |
| `status-badge--degraded` | degraded 상태 배지 변형 |

### 2.3 design token (정확한 값 — 재정의 금지)

| token | 값 | 의미 |
|-------|----|----|
| `--color-status-healthy` | `#16a34a` | provider healthy / handoff completed |
| `--color-status-degraded` | `#f59e0b` | provider degraded |
| `--color-status-pending` | `#94a3b8` | handoff pending |
| `--color-action-primary` | `#2563eb` | refresh-control 등 주 액션 |
| `--space-card-gap` | `16px` | 카드 간 간격 |

### 2.4 상태(state)와 화면 텍스트 (exact)

`#readiness-root`는 `data-state` 속성으로 아래 4개 상태를 노출한다.

| state | 진입 조건 | 화면 텍스트(정확) |
|-------|-----------|-------------------|
| `loading` | fixture 로드 시작~완료 전 | `준비도 데이터를 불러오는 중입니다…` |
| `ready` | fixture 로드 완료·항목 1개 이상 | (카드 렌더, 상태 텍스트로 표시) |
| `empty` | fixture 로드 완료·항목 0개 | `표시할 준비도 항목이 없습니다.` |
| `error` | fixture 로드 실패 | `준비도 데이터를 불러오지 못했습니다. 다시 시도해 주세요.` |

- 각 상태의 상태명은 **색상만으로 구분하지 않고** 화면 텍스트와 접근성 이름으로 함께 노출한다.
- `refresh-control` 클릭 시 `loading` → (성공)`ready`/`empty` 또는 (실패)`error`로 전환하며,
  전환 후에는 `refresh-control`을 다시 조작할 수 있어야 한다(비활성 잔류 금지).

### 2.5 접근성 요구 (exact)

- 각 status control은 상태 텍스트를 포함한 `aria-label`을 가진다.
  - 예: provider 항목 `aria-label="provider api-gateway 상태 degraded"`.
- 키보드 `Tab`/`Enter`로 `#refresh-control`과 모든 대화형 요소를 조작할 수 있다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.
- `#refresh-control`은 `<button>` 시맨틱을 사용하고 접근성 이름 `새로고침`을 갖는다.

### 2.6 반응형 요구 (exact)

- **320px 이상**: 카드 레이아웃에 content overflow가 발생하지 않는다.
- **640px 이하**: 단일 컬럼으로 재배치된다(카드 세로 스택).
- 640px 초과: 다중 컬럼 그리드 허용(`--space-card-gap` 간격 유지).

## 3. 정적 fixture 데이터 구조

`src/fixtures.js`는 아래 구조를 export한다(정적 상수, 네트워크 없음).

### 3.1 session 연결 방식 (`sessionMode`)

```
sessionMode: {
  connection: "process-print" | "managed-session",   // 연결 방식
  label: string,                                       // 화면 표시 텍스트
}
```

- `#session-mode-panel`에 `connection`과 `label`을 함께 표시한다.
- 두 연결 방식(`process-print`, `managed-session`)을 모두 표현할 수 있어야 한다.

### 3.2 provider 상태 (`providers[]`)

```
providers: [
  { id: string, name: string, status: "healthy" | "degraded" }
]
```

- `#provider-status-list`에 렌더. `healthy`→`--color-status-healthy`,
  `degraded`→`--color-status-degraded` + `status-badge--degraded` class.
- healthy·degraded 두 상태를 모두 포함하는 fixture를 제공한다.

### 3.3 handoff 상태 (`handoffs[]`)

```
handoffs: [
  { id: string, name: string, status: "pending" | "completed" }
]
```

- `#handoff-status-list`에 렌더. `pending`→`--color-status-pending`,
  `completed`→`--color-status-healthy`.
- pending·completed 두 상태를 모두 포함하는 fixture를 제공한다.

### 3.4 empty·error fixture

- `empty` 상태 검증용: `providers`·`handoffs`가 빈 배열인 fixture.
- `error` 상태 검증용: 로드 실패를 모사하는 경로(예: 로드 함수가 reject/throw).

## 4. 사용자 시나리오

- **US-1**: 운영자가 대시보드에 진입하면 managed-session 연결 방식과 provider·handoff 상태를 한 화면에서 확인한다.
- **US-2**: 운영자가 새로고침을 눌러 최신(fixture) 상태를 다시 불러온다.
- **US-3**: 표시할 항목이 없을 때 빈 상태 안내를 본다.
- **US-4**: 데이터 로드 실패 시 오류 안내를 보고 다시 시도한다.
- **US-5**: 좁은 화면(≤640px)에서도 카드가 단일 컬럼으로 정렬되어 겹치지 않는다.

## 5. Acceptance Criteria (Given/When/Then)

- **AC-1 (초기 렌더/ready)**
  - Given fixture에 provider·handoff 항목이 있고
  - When `#readiness-root`가 초기화되면
  - Then `data-state="ready"`가 되고 `#session-mode-panel`·`#provider-status-list`·`#handoff-status-list`가 각 항목을 렌더한다.
- **AC-2 (loading)**
  - Given 초기화 또는 refresh 진행 중
  - When fixture 로드가 완료되기 전이면
  - Then `data-state="loading"`이며 텍스트 `준비도 데이터를 불러오는 중입니다…`를 노출한다.
- **AC-3 (empty)**
  - Given fixture의 provider·handoff가 모두 빈 배열
  - When 로드가 완료되면
  - Then `data-state="empty"`이며 텍스트 `표시할 준비도 항목이 없습니다.`를 노출한다.
- **AC-4 (error·복구)**
  - Given fixture 로드가 실패하는 경로
  - When 로드가 reject되면
  - Then `data-state="error"`이며 텍스트 `준비도 데이터를 불러오지 못했습니다. 다시 시도해 주세요.`를 노출하고, `#refresh-control`을 다시 조작할 수 있다.
- **AC-5 (degraded 표시)**
  - Given provider 중 `status:"degraded"`가 있고
  - When 렌더되면
  - Then 해당 항목은 `status-badge status-badge--degraded` class와 `--color-status-degraded`를 사용하며 화면 텍스트로 `degraded`를 노출한다.
- **AC-6 (접근성)**
  - Given 대시보드가 렌더된 상태
  - When 키보드 `Tab`으로 이동하면
  - Then `#refresh-control` 및 모든 대화형 요소에 포커스가 가고 `Enter`로 조작되며, 각 status control은 상태 텍스트를 포함한 `aria-label`을 갖는다.
- **AC-7 (반응형)**
  - Given viewport 폭이 320px
  - When 대시보드를 렌더하면
  - Then 카드에 content overflow가 없고, 640px 이하에서는 단일 컬럼으로 재배치된다.

## 6. Edge case · 실패 케이스

- fixture 항목 0개 → `empty`(error 아님).
- 로드 실패 → `error`, refresh로 재시도 가능(control 비활성 잔류 금지).
- degraded provider만 있고 healthy 없음 → 정상 렌더(`status-badge--degraded`).
- pending handoff만 있고 completed 없음 → 정상 렌더(`--color-status-pending`).
- 긴 provider/handoff 이름 → 320px에서 overflow 금지(줄바꿈/말줄임).
- refresh 연타 → loading 중 중복 실행이 상태를 손상시키지 않아야 한다.

## 7. 페르소나 handoff 계약

| packet | role | 선행(blocked_by) | 산출물 |
|--------|------|------------------|--------|
| `plan` | planner | — | `docs/plans/managed-session-readiness-canary-BF-1376.md` (본 문서) |
| `design` | designer | `plan` | `docs/design/managed-session-readiness-canary-BF-1376.md` |
| `develop` | developer | `plan` | `index.html`, `src/app.js`, `src/fixtures.js`, `src/styles.css`, `tests/unit.test.js` |
| `review` | reviewer | `design`, `develop` | review verdict |
| `test` | tester | `review` | `node --test demo/managed-session-readiness-canary/tests/*.test.js` 실행 결과 |

- designer·developer는 §2의 selector·token을 **그대로** 사용한다(변경·재정의 금지).
- developer는 §3 fixture 구조와 §5 AC를 만족하는 `tests/unit.test.js`를 작성한다.
- tester는 저장소 권위 명령 `node --test demo/managed-session-readiness-canary/tests/*.test.js`로 검증한다.

## 8. 검증(Definition of Done)

1. §5 AC-1~AC-7 모두 충족.
2. `node --test demo/managed-session-readiness-canary/tests/*.test.js` 통과.
3. selector·token이 §2 frozen 계약과 정확히 일치.
4. 320/640px 반응형 동작 확인, 색상만이 아닌 텍스트/접근성 이름으로 상태 노출.

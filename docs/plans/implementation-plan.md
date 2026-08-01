# 에이전트 큐 상태 범례 — 구현 실행 설계 (BF-1480)

> 본 문서는 planner가 먼저 작성하고 **designer(BF-1478) / developer(BF-1479) / reviewer / tester** 가 그대로 따르는
> 실행 설계(`planning-contract@v1`)이자 동결 UI 계약(`ui-contract@v1`)의 렌더링본입니다.
> **selector·상태 텍스트·token은 아래 값이 유일한 권위**이며 후속 페르소나는 이를 변경·재정의하지 않습니다.
> 본 문서는 frozen blueprint의 파일·소유자·상태·후조건을 설명할 뿐, 새 파일이나 새 역할을 추가하지 않습니다.

- Jira: BF-1480 (planner)
- Epic 형제 Task: BF-1478(designer) · BF-1479(developer)
- executionProfile: `implementation-strict`
- 대상 저장소: backend (vanilla-static / esm / serve_root=`.`)

---

## 1. Problem Statement

### 현재 상황
에이전트 큐를 지켜보는 운영자는 각 에이전트의 처리 상태(대기 / 실행 / 조치 필요)를 색상 배지만으로 구분해야
한다. 범례 자체도 조회 진행 상태(불러오는 중 / 불러오기 실패)를 노출하지 않아, 새로고침이 실패했는지 아직
로딩 중인지 알 수 없다.

### 사용자 페인 포인트
- 상태 구분이 색상에만 의존해 색각 이상·저채도 환경에서 식별이 어렵다.
- 범례 자체의 조회 상태(로딩/실패)를 인지할 수단이 없다.
- 조회 실패 후 재시도 경로가 명확하지 않다.

### 비즈니스 임팩트
색상 의존 상태 표현은 접근성 기준 미충족으로 이어지고, 조회 실패를 인지하지 못하면 운영자가 오래된 정보를
신뢰하게 되는 위험이 있다. 텍스트 병기 범례와 명시적 새로고침 상태는 이 두 문제를 모두 줄인다.

---

## 2. Proposed Solution (Overview)

에이전트 큐 상태 범례를 `idle → loading → loaded | error` 4개 조회 상태로 구현하고, `loaded` 상태에서
**대기 / 실행 / 조치 필요** 3개 상태를 색상 dot + 텍스트 라벨로 함께 표시한다. 새로고침 control
(`queue-legend-refresh`)은 명시적 `aria-label` 을 가진다.

### 파일 소유권 (frozen — 재정의 금지)

| 파일 | 소유자 | 정책 | 역할 |
| --- | --- | --- | --- |
| `demo/agent-queue-legend-canary/index.html` | developer (BF-1479) | additive | 범례 DOM 구조 + token 정의 |
| `demo/agent-queue-legend-canary/src/feature.js` | developer (BF-1479) | additive | 조회 상태 전이·렌더링 로직 (ESM) |
| `demo/agent-queue-legend-canary/tests/feature.test.js` | developer (BF-1479) | additive | 상태 전이·접근성·반응형 검증 |
| `docs/design/contract.md` | designer (BF-1478) | additive | 시각 설계·상태별 스타일 명세 |
| `docs/plans/implementation-plan.md` | planner (BF-1480, 본 문서) | — | 실행 설계 + RTM |

> 위 소유권과 상태 계약의 유일한 권위는 frozen blueprint이며 본 planner 문서는 이를 재정의하지 않는다.
> `additive` 정책: 후속 페르소나는 아래 계약된 selector/token/상태 텍스트를 **추가·구현**하되 변경·삭제·재정의하지 않는다.

---

## 3. Exact UI Contract (frozen — 유일 권위)

### 3.1 파일

- `demo/agent-queue-legend-canary/index.html`
- `demo/agent-queue-legend-canary/src/feature.js`
- `demo/agent-queue-legend-canary/tests/feature.test.js`
- `docs/design/contract.md`

### 3.2 DOM ID (변경 금지)

| 역할 | DOM ID |
| --- | --- |
| 범례 root 컨테이너 | `queue-legend-root` |
| 새로고침 control | `queue-legend-refresh` |

### 3.3 CSS class (변경 금지)

| 역할 | class |
| --- | --- |
| 범례 블록 | `legend` |
| 새로고침 control element | `legend__refresh` |
| 상태 항목 카드 (대기/실행/조치 필요 각 1개) | `legend__item` |

### 3.4 상태 (state) — 조회(fetch) 라이프사이클 (변경 금지)

| state | 화면 텍스트 | 의미 | 진입 조건 |
| --- | --- | --- | --- |
| `idle` | `새로고침을 눌러 상태를 불러오세요` | 초기/미조회 상태 | 초기 렌더, 취소·초기화 후 |
| `loading` | `불러오는 중…` | 조회 진행 중 | `queue-legend-refresh` 실행 시 |
| `loaded` | (§3.4.1 3개 `legend__item` 표시) | 조회 성공 | 조회 성공(성공 응답) |
| `error` | `상태를 불러오지 못했습니다` | 조회 실패 | 조회 실패(실패 응답) |

#### 3.4.1 `loaded` 상태의 범례 항목 (frozen 순서 고정, 3개)

| 상태 키 | 색상 토큰 | 화면 텍스트 |
| --- | --- | --- |
| `waiting` | `--color-status-waiting` (`#f59e0b`) | `대기 중` |
| `running` | `--color-status-running` (`#2563eb`) | `실행 중` |
| `action-needed` | `--color-status-action` (`#dc2626`) | `조치 필요` |

각 `legend__item`은 색상 dot(장식용) + 위 화면 텍스트를 함께 렌더링한다(색상만으로 구분 금지, §3.6).

### 3.5 Design token / CSS 변수 (변경 금지)

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-status-waiting` | `#f59e0b` | `waiting`(대기 중) 항목 강조색 |
| `--color-status-running` | `#2563eb` | `running`(실행 중) 항목 강조색 |
| `--color-status-action` | `#dc2626` | `action-needed`(조치 필요) 항목 강조색 |
| `--space-legend-gap` | `12px` | `legend__item` 사이 간격 |

### 3.6 접근성 (Accessibility — 필수)

1. `queue-legend-refresh` 는 명시적 `aria-label` (예: `"상태 범례 새로고침"`) 을 가진다.
2. 각 `legend__item` (대기 중/실행 중/조치 필요) 은 색상 외에 상태명 텍스트 라벨을 함께 제공한다.
3. 모든 상태(§3.4 조회 상태 포함)는 색상만으로 구분하지 않고 상태명을 **화면 텍스트와 접근성 이름** 양쪽으로 노출한다.

### 3.7 반응형 (Responsive — 필수)

- **320px 이상** 뷰포트에서 `queue-legend-root` 와 `legend__item` 모두 content overflow가 발생하지 않는다.

### 3.8 상태 후조건 / 복구 (필수)

- 초기화·취소·실패 뒤에는 상태와 진행 표시를 **초기값(`idle` / `새로고침을 눌러 상태를 불러오세요`)** 으로
  되돌리고, 주 실행 control(`queue-legend-refresh`)을 다시 사용할 수 있어야 한다.

---

## 4. User Stories & Scenarios (Given/When/Then)

### US-1. 초기 상태 확인
- **Given** 운영자가 큐 상태 범례가 있는 화면을 처음 연다
- **When** 범례가 렌더링된다
- **Then** `idle` 화면 텍스트가 표시되고 `queue-legend-refresh` 가 사용 가능하다

### US-2. 조회(성공)
- **Given** 범례가 `idle` 상태이다
- **When** 운영자가 `queue-legend-refresh` 를 실행한다
- **Then** 범례는 `loading`(`불러오는 중…`)을 거쳐, 성공 응답 시 `loaded` 로 전이하고 대기 중/실행 중/조치 필요
  3개 `legend__item` 을 각각의 색상 토큰 + 텍스트로 표시한다

### US-3. 조회(실패)
- **Given** 범례가 `idle` 또는 `loading` 상태이다
- **When** 조회가 실패한다
- **Then** 범례는 `error`(`상태를 불러오지 못했습니다`)를 표시하며, `queue-legend-refresh` 로 재조회할 수 있다

### US-4. 접근성 노출
- **Given** 스크린리더 사용자가 범례를 사용한다
- **When** 상태가 전이되거나 `legend__item` 이 렌더링된다
- **Then** 각 상태명이 화면 텍스트와 접근성 이름으로 함께 노출되고, 새로고침 control은 명시적 `aria-label` 로 안내된다

### US-5. 반응형
- **Given** 뷰포트 폭이 320px이다
- **When** 범례가 렌더링된다
- **Then** content overflow 없이 `queue-legend-root` 와 `legend__item` 이 온전히 표시된다

### US-6. 초기화/재시도 후 복귀
- **Given** 범례가 `error` 상태이거나 조회가 취소되었다
- **When** 초기화 또는 재진입이 발생한다
- **Then** 상태가 `idle` 로 복귀하고 `queue-legend-refresh` 를 즉시 다시 사용할 수 있다

---

## 5. Edge / 실패 케이스

| # | 케이스 | 기대 동작 |
| --- | --- | --- |
| E-1 | 조회 실패(성공 응답 아님) | `error`(`상태를 불러오지 못했습니다`) + 재조회 가능 |
| E-2 | 조회 중 재실행/취소 | 진행 표시를 정리하고, 취소 시 `idle` 로 복귀 |
| E-3 | 초기화/재진입 | 상태·진행 표시를 초기값(`idle`)으로 되돌리고 control 재사용 가능 |
| E-4 | 색상 미지원 환경(색각 이상/고대비) | `legend__item` 상태명이 화면 텍스트로 유지되어 상태 식별 가능 |
| E-5 | 좁은 뷰포트(320px) | overflow 없음 |
| E-6 | 미지의/알 수 없는 상태 값 | 계약된 4개 조회 state 또는 3개 항목 키 외 값은 렌더하지 않고 `idle` 초기값을 유지 |

---

## 6. 데이터 모델 (상태 표현)

범례는 서버 스키마 변경 없이 **UI 상태 값**만 다룬다. 조회 상태와 범례 항목 상태 값 집합은 각각 계약된
범위로 한정한다.

| 필드 | 타입 | 허용 값 | 비고 |
| --- | --- | --- | --- |
| `state` | enum(string) | `idle` \| `loading` \| `loaded` \| `error` | 조회 라이프사이클, 기본값 `idle` |
| `statusItems[].key` | enum(string) | `waiting` \| `running` \| `action-needed` | `loaded` 상태에서 고정 3개, 순서 고정 |
| `statusItems[].label` | string | §3.4.1 화면 텍스트 | `key` 에 1:1 대응 |

불변식: `state` 는 위 4개 값만 가지며, `loaded` 일 때 `statusItems` 는 항상 3개(대기 중/실행 중/조치 필요)를
고정 순서로 가진다. 각 `label` 은 `key` 에 대응하는 화면 텍스트와 항상 일치한다.

---

## 7. Requirements Traceability Matrix (RTM)

| Req | 수용 기준(요약) | 시나리오 | 검증(TestSpec) | Evidence |
| --- | --- | --- | --- | --- |
| REQ-1 | 파일·DOM ID/class·상태(idle/loading/loaded/error)·token/CSS 변수·접근성·반응형·산출물 경로가 exact UI 계약에 명시 | US-1~US-6 | TS-1 | build_result, test_result |
| REQ-2 | 대기·실행·조치 필요 상태 각각을 색상 외 텍스트로 구분하는 범례 구조 | US-2, US-4 / E-4, E-6 | TS-1 | build_result, test_result |
| REQ-3 | 기획 문서는 frozen blueprint의 파일·소유자·상태·후조건을 그대로 설명하며 새 파일·역할을 추가하지 않음 | 전체 | — | — |

### 마이그레이션 무결
- 서버 데이터 모델·API 스키마 변경 없음(UI 상태 표현만 추가). 기존 저장소 규약(vanilla-static/esm) 유지.
- 파일 정책은 모두 `additive` — 기존 파일 구조를 파괴하지 않는다.

### 롤백
- 신규 추가 파일(`demo/agent-queue-legend-canary/**`) 제거로 무손상 롤백 가능. 공유 utility·전역 상태 변경 없음.

### KPI (Success Metrics)
- 상태 식별 가능성: 조회 4개 상태 + 범례 3개 항목 모두 화면 텍스트로 노출(색상 비의존) = 100%.
- 접근성: 새로고침 `aria-label` + 항목별 텍스트 라벨 노출 = 100%.
- 반응형: 320px에서 overflow 0건.

---

## 8. Handoff 지시 (후속 페르소나)

- **designer (BF-1478)** — `docs/design/contract.md` 에 §3장의 상태별 시각 스타일(token 매핑 포함)을
  명세한다. selector/상태 텍스트/token 값은 §3장을 그대로 사용하고 변경하지 않는다.
- **developer (BF-1479)** — `demo/agent-queue-legend-canary/index.html`(DOM+token),
  `demo/agent-queue-legend-canary/src/feature.js`(조회 상태 전이 로직, ESM),
  `demo/agent-queue-legend-canary/tests/feature.test.js`(검증 테스트)를 구현한다. §3장의 DOM ID/class/상태
  텍스트/token/접근성/반응형/후조건을 그대로 구현한다. 저장소 권위 검증 명령:
  `node --test demo/agent-queue-legend-canary/tests/*.test.js`.
- **reviewer** — §3장 계약값이 selector/token 변경 없이 그대로 구현됐는지, §3.8 후조건(초기화/취소/실패 → idle
  복귀)이 지켜지는지 검토한다.
- **tester** — `node --test demo/agent-queue-legend-canary/tests/*.test.js` 로 조회 상태 전이(4상태), 범례
  항목(3개, 색상 외 텍스트), 접근성(aria-label/색상 비의존), 반응형(320px), 후조건 복귀(E-2/E-3)를 검증한다.

> 모든 후속 페르소나는 본 문서 §3장의 계약값을 유일 권위로 삼으며 selector·token·상태 텍스트를 재정의하지 않는다.

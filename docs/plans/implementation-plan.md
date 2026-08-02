# 2인 스네이크 멀티플레이 — 실행 설계 및 UI 계약 (BF-1504)

> 본 문서는 planner가 먼저 작성하고 **designer(BF-1502) / developer(BF-1503) / reviewer / tester** 가 그대로 따르는
> 실행 설계(`planning-contract@v1`)이자 동결 UI 계약(`ui-contract@v1`)의 렌더링본입니다.
> **selector·상태 텍스트·token·충돌 판정·상태 전이 규칙은 아래 값이 유일한 권위**이며 후속 페르소나는 이를 변경·재정의하지 않습니다.
> 본 문서는 frozen blueprint의 파일·소유자·상태·후조건을 설명할 뿐, 새 파일이나 새 역할을 추가하지 않습니다.

- Jira: BF-1504 (planner)
- Epic 형제 Task: BF-1502(designer) · BF-1503(developer)
- executionProfile: `implementation-strict`
- 대상 저장소: backend (vanilla-static / esm / serve_root=`.`)
- 대상 route: `/demo/neon-snake-fullscreen-0802`
- 저장소 권위 검증 명령: `node --test demo/neon-snake-fullscreen-0802/tests/*.test.js`

---

## 1. Problem Statement

### 현재 상황
단일 플레이 네온 스네이크는 있으나, 한 화면에서 두 사람이 동시에 조작하는 멀티플레이 규칙과 승패 판정이 정의되어
있지 않다. 병렬로 진행되는 designer/developer가 참조할 **조작·tick·충돌·성장·상태 전이·UI selector 계약**이
동결되지 않으면 각자 다른 규칙으로 구현해 handoff 충돌이 발생한다.

### 목표
- 2인 조작(1P WASD / 2P 방향키)과 tick 기반 동시 이동 규칙을 확정한다.
- 벽·자기 몸·상대 몸·head-to-head 동시 충돌을 **결정론적으로** 판정하는 규칙을 문서화한다.
- 공유 먹이 획득 시 성장·득점·재배치 규칙과 시작/일시정지/재개/게임오버/재시작 상태 전이를 명시한다.
- designer/developer가 그대로 소비할 풀스크린 UI 계약(파일·DOM ID/class·상태 텍스트·token·접근성·반응형)을 동결한다.

### 비즈니스 임팩트
동결된 실행 설계와 UI 계약은 병렬 producer의 재작업·머지 충돌을 제거하고, 결정론적 충돌 판정은 승패 결과의
재현성과 테스트 가능성을 보장한다.

---

## 2. Proposed Solution (Overview)

한 개의 풀스크린 보드(`snake-board`)에서 두 뱀이 고정 tick으로 동시에 이동한다. 입력 → tick 진행 → 먹이 판정 →
충돌 판정 → 상태 전이 → 렌더 순서로 한 tick이 처리되며, 승패/무승부는 충돌이 발생한 tick에 결정론적으로 확정된다.

### 파일 소유권 (frozen — 재정의 금지)

| 파일 | 소유자 | 정책 | 역할 |
| --- | --- | --- | --- |
| `demo/neon-snake-fullscreen-0802/index.html` | developer (BF-1503) | additive | 풀스크린 보드/HUD/상태 배너/결과 오버레이 DOM + token 정의 |
| `demo/neon-snake-fullscreen-0802/src/game.js` | developer (BF-1503) | additive | tick·충돌·먹이·성장·상태 전이 로직 (ESM) |
| `demo/neon-snake-fullscreen-0802/tests/game.test.js` | developer (BF-1503) | additive | 규칙·계약 검증 테스트 |
| `docs/design/contract.md` | designer (BF-1502) | additive | 상태별 시각 설계·token 매핑 명세 |
| `docs/plans/implementation-plan.md` | planner (BF-1504, 본 문서) | — | 실행 설계 + RTM |

> 위 소유권과 상태 계약의 유일한 권위는 frozen blueprint이며 본 planner 문서는 이를 재정의하지 않는다.
> `additive` 정책: 후속 페르소나는 아래 계약된 selector/token/상태 텍스트/규칙을 **추가·구현**하되 변경·삭제·재정의하지 않는다.

---

## 3. Exact UI Contract (frozen — 유일 권위)

### 3.1 파일
- `demo/neon-snake-fullscreen-0802/index.html`
- `demo/neon-snake-fullscreen-0802/src/game.js`
- `demo/neon-snake-fullscreen-0802/tests/game.test.js`
- `docs/design/contract.md`

### 3.2 DOM ID (변경 금지)

| 역할 | DOM ID |
| --- | --- |
| 게임 보드(풀스크린) | `snake-board` |
| 1P HUD 컨테이너 | `hud-p1` |
| 2P HUD 컨테이너 | `hud-p2` |
| 1P 점수 | `score-p1` |
| 2P 점수 | `score-p2` |
| 상태 배너 | `status-banner` |
| 결과(승자/무승부) 오버레이 | `result-overlay` |
| 시작 버튼 | `btn-start` |
| 일시정지 버튼 | `btn-pause` |
| 재시작 버튼 | `btn-restart` |

### 3.3 CSS class (변경 금지)

| 역할 | class |
| --- | --- |
| 풀스크린 스테이지 래퍼 | `snake-stage` |
| HUD 블록 공통 | `hud` |
| 1P HUD 변형 | `hud--p1` |
| 2P HUD 변형 | `hud--p2` |
| HUD 점수 요소 | `hud__score` |
| 상태 배너 | `status-banner` |
| 결과 오버레이 | `result-overlay` |
| 결과 오버레이 텍스트 | `result-overlay__text` |
| 조작 버튼 공통 | `control-btn` |

### 3.4 상태(state) 및 화면 텍스트 (변경 금지)

| state | 화면 텍스트 | 의미 |
| --- | --- | --- |
| `ready` | `스페이스로 시작` | 초기/재시작 후 대기 |
| `running` | `게임 진행 중` | tick 진행 중 |
| `paused` | `일시정지 — 스페이스로 재개` | 일시정지 |
| `p1-win` | `1P 승리` | 게임오버(1P 승) |
| `p2-win` | `2P 승리` | 게임오버(2P 승) |
| `draw` | `무승부` | 게임오버(무승부) |

- `status-banner`는 위 화면 텍스트를 항상 노출한다.
- `p1-win` / `p2-win` / `draw` 세 상태는 게임오버 상태이며, `result-overlay`가 §3.6 접근성 규칙으로 결과를 알린다.

### 3.5 Design token / CSS 변수 (변경 금지)

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-p1` | `#00e5ff` | 1P 뱀·HUD 강조색 |
| `--color-p2` | `#ff2fb9` | 2P 뱀·HUD 강조색 |
| `--color-food` | `#ffd400` | 먹이 색 |
| `--color-bg` | `#0a0a12` | 보드 배경 |
| `--space-hud-gap` | `16px` | HUD 요소 간격 |

### 3.6 접근성 (Accessibility — 필수)

1. `result-overlay`는 `role="status"` 와 `aria-live="polite"` 로 승자/무승부 텍스트를 알린다.
2. `btn-start` / `btn-pause` / `btn-restart` 는 명시적 `aria-label` 을 가지며 키보드로 조작 가능하다.
3. `hud-p1` / `hud-p2` 점수는 색상 외 텍스트 라벨(`1P` / `2P`)로도 구분된다.
4. 모든 상태(§3.4)는 색상만으로 구분하지 않고 상태명을 **화면 텍스트와 접근성 이름** 양쪽으로 노출한다.

### 3.7 반응형 (Responsive — 필수)

1. `snake-board`는 브라우저 가용 영역(`100dvw × 100dvh` 내)을 채우고 고정 소형 캔버스를 쓰지 않는다.
2. viewport resize 시 셀/보드 치수를 재계산하되 **진행 중 플레이 상태(뱀 위치·점수·먹이)가 깨지지 않는다.**
3. `320px` 이상 뷰포트에서 HUD와 조작 안내에 content overflow가 발생하지 않는다.

### 3.8 상태 후조건 / 복구 (필수)

- 초기화·취소·실패(게임오버) 뒤에는 상태와 진행 표시를 **초기값(`ready` / `스페이스로 시작`, 점수 0)** 으로
  되돌리고, 주 실행 control(`btn-start` / 스페이스)을 다시 사용할 수 있어야 한다.

---

## 4. 조작 규칙 (Controls)

| 플레이어 | 방향 조작 |
| --- | --- |
| 1P | `W`(위) · `A`(왼쪽) · `S`(아래) · `D`(오른쪽) |
| 2P | `↑` · `←` · `↓` · `→` |

- 공통: `Space` 는 상태에 따라 시작(`ready→running`) / 일시정지(`running→paused`) / 재개(`paused→running`) 역할을 한다.
- **반대 방향 즉시 전환 금지(필수):** 현재 진행 방향과 정반대 방향으로의 입력은 **해당 tick에서 무시**한다.
  (예: 오른쪽 진행 중 왼쪽 입력 무시 → 자기 목으로 즉시 충돌하는 것을 방지.)
- 한 tick 안에 여러 방향 입력이 들어오면 **마지막으로 유효한(반대 방향이 아닌) 입력** 하나만 다음 tick의 진행 방향으로 반영한다.

---

## 5. Tick 진행 및 결정론적 충돌 판정 (필수)

한 tick은 아래 순서로 **두 뱀을 동시에** 처리하며, 동일 입력·동일 상태에서 항상 동일한 결과를 산출한다(결정론).

1. **입력 확정** — 각 뱀의 다음 진행 방향을 §4 규칙으로 확정(반대 방향 무시).
2. **다음 head 계산** — 두 뱀의 다음 head 셀 `P1.next`, `P2.next` 을 동시에 계산.
3. **먹이 판정** — 각 뱀에 대해 `next == food` 이면 성장 플래그를 세운다(§6).
4. **이동 적용(판정용 몸통 구성)** — 각 뱀의 이동 후 몸통을
   `newBody = [next] + oldBody[0..end]` 로 구성한다. 성장하지 않은 경우 마지막 꼬리 1칸을 제거한다(성장 시 유지).
5. **충돌 판정(결정론)** — 각 뱀 X에 대해 아래 중 하나라도 참이면 X는 사망한다.
   - **벽:** `X.next` 가 보드 경계 밖.
   - **자기 몸:** `X.next` 가 `X.newBody` 의 head 이후 몸통 셀과 겹침.
   - **상대 몸:** `X.next` 가 상대 뱀 `newBody` 의 몸통 셀(상대 head 제외)과 겹침.
   - **head-to-head:** `P1.next == P2.next` (두 head가 같은 셀) — 두 뱀 모두 이 조건으로 사망 처리.
6. **승패/무승부 산출(결정론)** — 사망 결과로 상태를 전이한다.

| P1 | P2 | 결과 state |
| --- | --- | --- |
| 생존 | 생존 | (계속) `running` |
| 생존 | 사망 | `p1-win` |
| 사망 | 생존 | `p2-win` |
| 사망 | 사망 | 점수 비교: 높은 쪽 승(`p1-win`/`p2-win`), **동점이면 `draw`** |

> **결정론 불변식:** 충돌 판정은 tick 시작 시점의 두 몸통과 §5.4에서 구성한 이동 후 몸통만으로 계산하며, 난수·시간·
> 처리 순서에 의존하지 않는다. head-to-head 및 양측 동시 사망은 위 표의 규칙(점수 비교 → 동점 draw)으로 유일하게 결정된다.

---

## 6. 공유 먹이 · 성장 · 재배치 (필수)

- 보드에는 **공유 먹이 1개**가 존재한다.
- 어떤 tick에서 뱀 X의 `X.next == food` 이면 **X만** 성장(꼬리 미제거)하고 **X만** 득점(`score += 1`)한다. 상대는 정상 이동한다.
- 먹이를 먹은 tick에는 먹이를 **유효 위치**로 재배치한다.
  - **유효 위치 정의:** 보드 경계 내부이며 두 뱀의 이동 후 몸통 어느 셀과도 겹치지 않는 빈 셀.
- 두 뱀이 **같은 tick에 같은 먹이 셀**로 진입하는 경우(즉 head-to-head가 먹이 셀에서 발생)는 §5의 head-to-head 판정이
  우선하며 두 뱀 모두 사망한다(먹이 획득·재배치는 발생하지 않는다).

---

## 7. 상태 전이 (State Machine)

```
        Space / btn-start
ready ───────────────────────────▶ running
  ▲                                   │  │
  │ btn-restart                       │  │ Space / btn-pause
  │ (상태·점수·먹이 초기화)            │  ▼
  │                                paused
  │                                   │
  │           Space / btn-start(재개) │
  │                                   ▼
  │                               running
  │                                   │ 충돌 tick(§5)
  │                                   ▼
  └────────── p1-win / p2-win / draw (게임오버)
                     ▲ btn-restart → ready
```

| From | 트리거 | To |
| --- | --- | --- |
| `ready` | `Space` / `btn-start` | `running` |
| `running` | `Space` / `btn-pause` | `paused` |
| `paused` | `Space` / `btn-start`(재개) | `running` |
| `running` | 충돌 tick(§5) | `p1-win` / `p2-win` / `draw` |
| `p1-win` / `p2-win` / `draw` / `paused` | `btn-restart` | `ready` (상태·점수·먹이 초기값) |

- `paused` 상태에서는 tick이 진행되지 않으며 뱀 위치·점수·먹이가 보존된다.
- `btn-restart` 는 어느 상태에서든 §3.8 후조건대로 초기값(`ready`, 점수 0, 먹이 재배치)으로 되돌린다.

---

## 8. User Stories & Scenarios (Given/When/Then)

### US-1. 시작
- **Given** 보드가 `ready`(`스페이스로 시작`) 상태이다
- **When** `Space` 또는 `btn-start` 를 실행한다
- **Then** `running`(`게임 진행 중`) 으로 전이하고 두 뱀이 tick마다 이동한다

### US-2. 2인 조작 · 반대 방향 금지
- **Given** 게임이 `running` 이고 1P가 오른쪽으로 진행 중이다
- **When** 1P가 `A`(왼쪽, 반대 방향)를 입력한다
- **Then** 해당 입력은 무시되고 1P는 계속 오른쪽으로 진행한다. 1P(WASD)/2P(방향키)는 서로 독립 조작된다

### US-3. 먹이 획득 · 성장 · 재배치
- **Given** 먹이 셀로 1P의 다음 head가 진입한다
- **When** tick이 처리된다
- **Then** 1P만 성장·득점(`score-p1 += 1`)하고 먹이는 유효 빈 셀로 재배치된다(2P는 변화 없음)

### US-4. 결정론적 충돌 · 승패
- **Given** 어떤 tick에 2P의 다음 head가 벽 또는 상대 몸에 닿는다
- **When** 충돌이 판정된다
- **Then** 2P 사망 → `p1-win` 으로 전이하고 `result-overlay`가 승자 텍스트(`1P 승리`)를 알린다(동일 입력·상태에서 결과가 항상 동일)

### US-5. head-to-head
- **Given** 같은 tick에 두 head가 같은 셀로 진입한다
- **When** 충돌이 판정된다
- **Then** 두 뱀 모두 사망하고 점수 비교로 승자, 동점이면 `draw`(`무승부`)로 전이한다

### US-6. 일시정지/재개
- **Given** 게임이 `running` 이다
- **When** `Space` 또는 `btn-pause` 를 실행한다
- **Then** `paused`(`일시정지 — 스페이스로 재개`)로 전이해 tick이 멈추고 상태가 보존되며, 재개 시 그대로 이어진다

### US-7. 재시작/후조건 복귀
- **Given** 게임오버 또는 일시정지 상태이다
- **When** `btn-restart` 를 실행한다
- **Then** 상태·점수·먹이가 초기값(`ready`)으로 복귀하고 주 실행 control을 다시 사용할 수 있다

### US-8. 접근성 · 반응형
- **Given** 스크린리더 사용자가 좁은(320px) 뷰포트에서 플레이한다
- **When** 상태가 전이되거나 창 크기가 바뀐다
- **Then** 각 상태명이 화면 텍스트·접근성 이름으로 노출되고, 보드는 재계산되며 진행 상태가 깨지지 않고 overflow가 없다

---

## 9. Edge / 실패 케이스

| # | 케이스 | 기대 동작 |
| --- | --- | --- |
| E-1 | 반대 방향 즉시 입력 | 해당 tick 무시(자기 목 즉사 방지) |
| E-2 | 한 tick 다중 방향 입력 | 마지막 유효 입력 1개만 반영 |
| E-3 | 벽/자기 몸/상대 몸 충돌 | 해당 뱀 사망 → 상대 승 |
| E-4 | head-to-head 동시 충돌 | 양측 사망 → 점수 비교, 동점 `draw` |
| E-5 | 양측 동시 사망(각자 다른 충돌) | 점수 비교, 동점 `draw` |
| E-6 | 두 뱀 동시 먹이 셀 진입 | head-to-head 우선 → 양측 사망, 먹이 재배치 없음 |
| E-7 | 먹이 재배치 대상 없음(포화) | 빈 유효 셀이 없으면 재배치 생략(계속 진행) |
| E-8 | viewport resize(진행 중) | 셀/보드 재계산, 뱀 위치·점수·먹이 보존 |
| E-9 | 320px 좁은 뷰포트 | HUD·조작 안내 overflow 없음 |
| E-10 | 게임오버/취소 후 재시작 | 상태·점수·먹이 초기값(`ready`)으로 복귀, control 재사용 |

---

## 10. 데이터 모델 (UI 상태 표현)

서버 스키마·API 변경 없이 **클라이언트 게임 상태 값**만 다룬다.

| 필드 | 타입 | 허용 값 / 비고 |
| --- | --- | --- |
| `state` | enum(string) | `ready` \| `running` \| `paused` \| `p1-win` \| `p2-win` \| `draw`, 기본값 `ready` |
| `p1.body` / `p2.body` | 셀 좌표 배열 | head가 index 0, 이동 시 앞에 추가 |
| `p1.dir` / `p2.dir` | enum | `up`\|`down`\|`left`\|`right`, 반대 방향 즉시 전환 금지 |
| `p1.score` / `p2.score` | 정수 ≥ 0 | 먹이 획득 시 +1 |
| `food` | 셀 좌표 | 유효 빈 셀(경계 내 · 뱀과 비겹침) |
| `grid.cols` / `grid.rows` | 정수 | viewport 기반 재계산, resize 시 갱신 |

불변식: `state` 는 위 6개 값만 가진다. tick당 각 뱀은 한 방향으로만 진행하고 반대 방향은 무시된다. `food` 는 항상
유효 빈 셀이거나(재배치) 포화 시 이전 위치를 유지한다. `score` 는 먹이를 먹은 tick의 해당 플레이어만 증가한다.

---

## 11. Requirements Traceability Matrix (RTM)

| Req | 수용 기준(요약) | 시나리오 | 검증(TestSpec) | Evidence |
| --- | --- | --- | --- | --- |
| REQ-1 | 1P(WASD)/2P(방향키) 조작, 반대 방향 즉시 전환 tick 단위 금지 | US-1,US-2 / E-1,E-2 | TS-1 | build_result, test_result |
| REQ-2 | tick 동시 충돌(벽/자기몸/상대몸/head-to-head) 결정론적 판정 및 승패/무승부 산출 | US-4,US-5 / E-3~E-6 | TS-1 | build_result, test_result |
| REQ-3 | 공유 먹이 획득 시 해당 플레이어만 성장·득점 + 유효 위치 재배치 | US-3 / E-6,E-7 | TS-1 | build_result, test_result |
| REQ-4 | 시작/일시정지/재개/게임오버/재시작 상태 전이 및 초기화 후조건 복귀 | US-1,US-6,US-7 / E-10 | TS-1 | build_result, test_result |
| REQ-5 | 파일·DOM ID/class·상태 텍스트·token·접근성·반응형 exact UI 계약 준수 | US-8 / E-8,E-9 | TS-1 | build_result, test_result |

### 마이그레이션 무결
- 서버 데이터 모델·API 스키마 변경 없음(클라이언트 게임 상태만 추가). 기존 저장소 규약(vanilla-static/esm) 유지.
- 파일 정책은 모두 `additive` — 기존 파일 구조를 파괴하지 않는다.

### 롤백
- 신규 추가 파일(`demo/neon-snake-fullscreen-0802/**`) 제거로 무손상 롤백 가능. 공유 utility·전역 상태 변경 없음.

### KPI (Success Metrics)
- 결정론: 동일 입력·상태에서 충돌·승패 결과 재현율 100%.
- 접근성: 상태 6종 모두 화면 텍스트+접근성 이름 노출, 버튼 `aria-label` 100%.
- 반응형: 320px overflow 0건, resize 중 플레이 상태 보존 100%.

---

## 12. Handoff 지시 (후속 페르소나)

- **designer (BF-1502)** — `docs/design/contract.md` 에 §3장 상태별 시각 스타일(token 매핑, 6개 상태, HUD/오버레이/버튼)
  을 명세한다. selector·상태 텍스트·token 값은 §3장을 그대로 사용하고 변경하지 않는다.
- **developer (BF-1503)** — `index.html`(DOM+token), `src/game.js`(§4~§7 조작·tick·충돌·먹이·상태 로직, ESM),
  `tests/game.test.js`(§5 결정론·§6 먹이·§7 상태·§3 UI 계약 검증)를 구현한다. §3 selector/token/상태 텍스트/접근성/
  반응형/후조건을 그대로 구현한다. 검증 명령: `node --test demo/neon-snake-fullscreen-0802/tests/*.test.js`.
- **reviewer** — §3 계약값이 selector/token 변경 없이 그대로 구현됐는지, §5 결정론적 충돌 판정과 §3.8 후조건
  (초기화/취소/게임오버 → `ready` 복귀)이 지켜지는지 검토한다.
- **tester** — 위 검증 명령으로 조작·반대 방향 금지(§4), 결정론적 충돌 4종(§5), 먹이 성장·재배치(§6), 상태 전이·
  후조건 복귀(§7), 접근성·반응형(§3.6~§3.8)을 검증한다.

> 모든 후속 페르소나는 본 문서 §3~§7 계약값을 유일 권위로 삼으며 selector·token·상태 텍스트·규칙을 재정의하지 않는다.

# 에이전트 큐 상태 범례 시각 명세 — agent-queue-legend-canary (BF-1478)

## 0. 문서 성격

본 문서는 상위 frozen Execution Blueprint(`ui-contract@v1`,
sha256:efa946c0e579a16a5ab965097686c5c6844f4b13459736b5584e4b64f004e305)와
planner 실행 설계(`docs/plans/implementation-plan.md`, `planning-contract@v1`
sha256:3e23b3996439a78fd6df32cb2f8786e75722e6e7e38ac8cfda81cdbe941ae1f6)의 §3장
계약을 **재정의 없이** 시각 명세 형태로 서술한다. selector·상태·token 값은
frozen 목록 그대로이며, 본 문서는 신규 selector·상태·역할을 추가하지 않는다.

이 task(BF-1478)의 산출물 범위는 본 markdown 1개 파일(`docs/design/contract.md`)
이며, 런타임 HTML/CSS/JS(`demo/agent-queue-legend-canary/index.html`,
`demo/agent-queue-legend-canary/src/feature.js`,
`demo/agent-queue-legend-canary/tests/feature.test.js`)는 developer(BF-1479)
소유로 frozen되어 있어 본 task에서 생성하지 않는다. 별도 mockup HTML 파일도
생성하지 않으며, §9의 와이어프레임으로 시각 mockup을 대체 설명한다.

## 1. 시안 개요

- 대상 라우트: `/demo/agent-queue-legend-canary`
- 진입 파일(developer 소유, frozen): `demo/agent-queue-legend-canary/index.html`
- 성격: 서버 데이터 모델·API 스키마 변경 없는 **조회(fetch) 라이프사이클** 캐너리.
  `idle → loading → loaded | error` 4개 상태만 다루며, `loaded` 상태에서 대기 중
  / 실행 중 / 조치 필요 3개 상태 항목을 함께 표시한다.
- 테마: 라이트 테마. frozen 토큰은 색상 상태 강조에만 쓰이므로, 페이지 배경·카드
  표면·텍스트 색상은 §2.2의 보조 토큰으로 채도 낮은 라이트 팔레트를 권장한다.
- 사용자 경험 목표: 대기 중/실행 중/조치 필요 상태를 색상에만 의존하지 않고
  텍스트 라벨로도 즉시 식별할 수 있게 하며, 범례 자체의 조회 진행 상태(로딩 중
  /실패)를 명확히 노출해 오래된 정보를 신뢰하는 위험을 줄인다. 조회 실패 시
  `queue-legend-refresh`로 즉시 재시도할 수 있게 한다.

## 2. 컬러 팔레트

### 2.1 frozen 토큰 (변경 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-status-waiting` | `#f59e0b` | `waiting`(대기 중) 항목 강조색 |
| `--color-status-running` | `#2563eb` | `running`(실행 중) 항목 강조색 |
| `--color-status-action` | `#dc2626` | `action-needed`(조치 필요) 항목 강조색 |
| `--space-legend-gap` | `12px` | `legend__item` 사이 간격 |

### 2.2 라이트 테마 보조 토큰 (신규 색상 상태 추가 아님 — frozen 목록과 충돌 없음)

frozen 계약은 상태 항목 강조색과 간격만 고정하며 페이지 배경·카드 표면·텍스트
색상은 명시하지 않는다. `vanilla-static` 스택 규약(외부 의존성 0건)에 따라
아래 보조 토큰을 권장한다. 이 토큰들은 §2.1 상태 색상을 대체하지 않는다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-page-background` | `#f8fafc` | `queue-legend-root` 페이지 배경 |
| `--color-surface-card` | `#ffffff` | `legend__item` 카드 표면 |
| `--color-text-primary` | `#0f172a` | 상태명, 조회 상태 텍스트 등 1차 텍스트 |
| `--color-text-secondary` | `#475569` | `idle`/`loading` 안내 문구 |
| `--color-border-subtle` | `rgba(15, 23, 42, 0.12)` | 카드/컨테이너 경계선 |
| `--color-focus-ring` | `#0f172a` | `queue-legend-refresh` 키보드 포커스 outline |

## 3. 타이포그래피

frozen 계약에 별도 타이포그래피 토큰이 없으므로 system font 기반 권장값을
아래와 같이 명세한다(신규 색상/상태 토큰이 아니므로 frozen 제약과 충돌하지 않음).

| 용도 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| heading (`queue-legend-root` 제목, 있는 경우) | system-ui, -apple-system, "Segoe UI", sans-serif | 18px | 600 | 1.4 |
| body (조회 상태 텍스트, `legend__item` 상태명) | system-ui, -apple-system, "Segoe UI", sans-serif | 14px | 500 | 1.5 |
| caption (`legend__refresh` 라벨) | system-ui, -apple-system, "Segoe UI", sans-serif | 13px | 500 | 1.5 |

## 4. 레이아웃

### 4.1 구조

```
#queue-legend-root (.legend)
├─ #queue-legend-refresh (.legend__refresh)     ── 새로고침 control (aria-label 필수)
└─ (조회 상태 표시 영역 — 권장, 비-frozen)
    ├─ idle/loading/error 문구 1건                (loaded 아닐 때)
    └─ 상태 항목 목록 — .legend__item × 3          (loaded 일 때, frozen 순서 고정)
```

`queue-legend-root`/`queue-legend-refresh`(ID)와 `legend`/`legend__refresh`/
`legend__item`(class)만 frozen이다. 목록 wrapper나 상태 문구 영역에 별도 ID/class를
둘지는 developer 재량이며, 본 문서의 명칭(예: 상태 표시 영역)은 구현 편의를 위한
권장 표현일 뿐 frozen selector가 아니다.

### 4.2 spacing / breakpoint

- `legend__item` 사이 간격: `--space-legend-gap`(`12px`).
- **320px 이상** 뷰포트에서 `queue-legend-root`와 `legend__item` 모두 content
  overflow가 발생하지 않는다(가로 스크롤 발생 금지) — 상태명 텍스트가 길어도
  줄바꿈으로 흡수한다.
- 좁은 화면(320px~479px 권장 기준)에서 `loaded` 상태의 3개 `legend__item`은
  세로로 스택된다(`flex-direction: column` 또는 `grid-template-columns: 1fr`).
- 480px 이상에서는 가로 배치(행/그리드)로 구현할지 세로 스택을 유지할지는
  developer 재량이나, frozen 계약은 320px 이상 overflow 금지만 강제한다.

## 5. 컴포넌트 명세

### 5.1 `#queue-legend-root` (.legend) — 컨테이너

컴포넌트 상태는 조회 라이프사이클 `state` 값에 따라 아래 4가지 중 하나
(frozen, §3.4 참조).

| state | 화면 텍스트 | 화면 표현 |
| --- | --- | --- |
| `idle` | `새로고침을 눌러 상태를 불러오세요` | 안내 문구 1건(`--color-text-secondary`), `queue-legend-refresh` 사용 가능 |
| `loading` | `불러오는 중…` | 진행 문구 1건(`--color-text-secondary`), `queue-legend-refresh`는 중복 실행 방지 상태 권장(비-frozen) |
| `loaded` | (§5.2 3개 `legend__item` 표시) | 대기 중/실행 중/조치 필요 3개 카드, 각 색상 dot + 상태명 텍스트 |
| `error` | `상태를 불러오지 못했습니다` | 실패 문구 1건(`--color-text-primary` 또는 강조를 위해 `--color-status-action` 사용 가능), `queue-legend-refresh`로 즉시 재조회 가능 |

불변식(§3.8, frozen): 초기화·취소·실패 뒤에는 `state`와 진행 표시가
초기값(`idle`, `새로고침을 눌러 상태를 불러오세요`)으로 되돌아가고,
`queue-legend-refresh`를 즉시 다시 사용할 수 있어야 한다.

### 5.2 `.legend__item` — 상태 항목 카드 (3개, frozen 순서 고정)

| 상태 키 | 색상 토큰 | 화면 텍스트 |
| --- | --- | --- |
| `waiting` | `--color-status-waiting` (`#f59e0b`) | `대기 중` |
| `running` | `--color-status-running` (`#2563eb`) | `실행 중` |
| `action-needed` | `--color-status-action` (`#dc2626`) | `조치 필요` |

구성: 상태 색상을 나타내는 인디케이터(예: 12px 원형 dot, 배경색 = 해당 상태
색상 토큰, `aria-hidden="true"`) + 상태명 텍스트(위 표의 "화면 텍스트" 값)를
나란히 표시. 색상 인디케이터는 장식용이며, 상태명 텍스트가 상태를 식별하는
1차 수단이다(색상만으로 구분 금지, §6). 카드 표면은 `--color-surface-card`,
텍스트 색상은 `--color-text-primary`로 라이트 배경 대비 가독성을 확보한다.

#### 5.2.1 권장 다음 행동 안내 (비-frozen, 참고용)

planner frozen §3.4.1은 상태 키·색상 토큰·화면 텍스트만 고정하며 상태별
"다음 행동" 문구는 정의하지 않는다. 아래는 운영자 이해를 돕기 위한 **참고용
보조 안내**이며 frozen 상태 텍스트를 대체하거나 새 DOM 요소를 요구하지
않는다(예: `title` 속성 또는 상세 tooltip으로 선택 적용 가능, 구현 여부는
developer 재량).

| 상태 키 | 화면 텍스트(frozen) | 권장 다음 행동 안내(비-frozen) |
| --- | --- | --- |
| `waiting` | 대기 중 | 선행 작업/리소스가 해소될 때까지 기다린다 |
| `running` | 실행 중 | 진행 상황을 계속 지켜본다 |
| `action-needed` | 조치 필요 | 지금 확인하고 필요한 조치를 취한다 |

### 5.3 `#queue-legend-refresh` (.legend__refresh) — 새로고침 control

| 속성/상태 | 명세 |
| --- | --- |
| `aria-label` | 명시적 라벨 필요(frozen, 예: `"상태 범례 새로고침"`) |
| 마크업 | 네이티브 `<button>` 권장(Enter/Space 기본 지원) |
| 위치 | `legend` 컨테이너 상단 — `--color-border-subtle` 경계선으로 상태 표시 영역과 구분 |
| 동작 | 실행 시 `idle`/`error` → `loading` → 응답에 따라 `loaded` 또는 `error`로 전이 |
| 후조건 | 초기화·취소·실패 후에도 즉시 다시 사용 가능(비활성화 상태로 고착 금지) |

## 6. 접근성 (frozen)

1. `queue-legend-refresh`는 명시적 `aria-label`을 가진다.
2. 각 `legend__item`(대기 중/실행 중/조치 필요)은 색상 외에 상태명 텍스트
   라벨을 함께 제공한다.
3. 모든 상태(§3.4의 조회 상태 포함)는 색상만으로 구분하지 않고 상태명을
   **화면 텍스트와 접근성 이름** 양쪽으로 노출한다.
4. 320px 폭에서 모든 조회 상태(`idle`/`loading`/`loaded`/`error`)가 텍스트/카드
   overflow 없이 표시된다(§4.2).

## 7. 상태 전이 시각 표현

planner 문서(`docs/plans/implementation-plan.md`)의 Given/When/Then 시나리오를
시각적으로 요약한다(새 시나리오 추가 아님, 서술만).

1. **초기 로드** — `idle` 문구 표시, `queue-legend-refresh` 사용 가능.
2. **새로고침 실행** — `loading` 문구로 전환.
3. **조회 성공** — `loaded`로 전환, 대기 중/실행 중/조치 필요 3개 `legend__item`을
   고정 순서·색상 토큰·텍스트로 표시.
4. **조회 실패** — `error` 문구로 전환, `queue-legend-refresh`로 즉시 재조회 가능.
5. **초기화/취소/재진입** — 언제든 `idle`(초기 문구)로 복귀, control 즉시
   재사용 가능.

## 8. dev 구현 가이드

1. 컨테이너 루트는 `id="queue-legend-root"` + `class="legend"`로 마크업하고,
   배경은 `--color-page-background`를 사용한다.
2. `id="queue-legend-refresh"` + `class="legend__refresh"` 버튼은 명시적
   `aria-label`(예: `"상태 범례 새로고침"`)을 가지며, 클릭 시 `state`를
   `loading`으로 전이시킨다.
3. 조회 상태 문구 영역(비-frozen 권장 구조)에 `state`에 따라 `idle`/`loading`/
   `error` 문구 중 하나 또는 `loaded`의 3개 `legend__item` 목록을 렌더링한다.
4. 각 `legend__item`은 `--color-surface-card` 카드 표면 위에 색상 dot
   (`aria-hidden="true"`) + 상태명 텍스트를 함께 렌더링한다. dot 색상은
   `--color-status-waiting`/`--color-status-running`/`--color-status-action`
   3개 frozen 토큰을 상태 키에 맞게 매핑한다.
5. CSS 커스텀 프로퍼티로 frozen 토큰 4개(`--color-status-waiting`,
   `--color-status-running`, `--color-status-action`, `--space-legend-gap`)와
   §2.2의 라이트 테마 보조 토큰 6개만 정의한다. 신규 상태 색상 토큰을 추가하지
   않는다.
6. 480px 미만에서 `loaded` 상태의 `legend__item` 목록을 세로 스택으로
   전환하고, 320px 이상 전 구간에서 `overflow-x`가 발생하지 않도록 텍스트
   줄바꿈/카드 폭을 확인한다.
7. 초기화·취소·조회 실패 후에는 `state`를 `idle`로 되돌리고 `queue-legend-refresh`
   가 즉시 재사용 가능한지 확인한다(§3.8, §5.1 불변식).
8. 상태 관리(`state`)는 서버 API 스키마 변경 없이 클라이언트 조회 상태로만
   다룬다(`demo/agent-queue-legend-canary/src/feature.js` 소유, ESM).

## 9. mockup 참조 (와이어프레임)

§0에 따라 이번 task는 별도 mockup HTML 파일을 생성하지 않는다. 아래
와이어프레임으로 시각 mockup을 대체 설명한다. 실제 실행 가능한 산출물은
`demo/agent-queue-legend-canary/index.html` / `src/feature.js`
(developer, BF-1479 소유)이다.

### 9.1 `idle` 상태 (초기 로드)

```
┌─ #queue-legend-root (.legend) — 배경 #f8fafc ─────────────────────┐
│ ┌───────────────────────┐                                        │
│ │ #queue-legend-refresh  │ ← aria-label="상태 범례 새로고침"       │
│ │ (.legend__refresh)     │                                        │
│ └───────────────────────┘                                        │
│                                                                    │
│ 새로고침을 눌러 상태를 불러오세요   (--color-text-secondary)       │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 `loading` 상태

```
┌─ #queue-legend-root (.legend) ────────────────────────────────────┐
│ ┌───────────────────────┐                                        │
│ │ #queue-legend-refresh  │                                        │
│ └───────────────────────┘                                        │
│                                                                    │
│ 불러오는 중…                        (--color-text-secondary)      │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 `loaded` 상태 (3개 `legend__item`, 12px gap)

```
┌─ #queue-legend-root (.legend) ────────────────────────────────────┐
│ ┌───────────────────────┐                                        │
│ │ #queue-legend-refresh  │                                        │
│ └───────────────────────┘                                        │
│                                                                    │
│ ┌─ .legend__item ────────┐ ┌─ .legend__item ────────┐ ┌─ .legend__item ─────┐
│ │ ● 대기 중 (#f59e0b)    │ │ ● 실행 중 (#2563eb)    │ │ ● 조치 필요 (#dc2626)│
│ │ (title: 선행 작업/    │ │ (title: 진행 상황을   │ │ (title: 지금 확인하 │
│ │  리소스가 해소될 때까 │ │  계속 지켜본다)        │ │  고 조치를 취한다)   │
│ │  지 기다린다)         │ │                        │ │                      │
│ └────────────────────────┘ └────────────────────────┘ └──────────────────────┘
│  ← --space-legend-gap(12px) 간격, title 문구는 §5.2.1 권장 안내(비-frozen)  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.4 `error` 상태

```
┌─ #queue-legend-root (.legend) ────────────────────────────────────┐
│ ┌───────────────────────┐                                        │
│ │ #queue-legend-refresh  │ ← 즉시 재사용 가능                     │
│ └───────────────────────┘                                        │
│                                                                    │
│ 상태를 불러오지 못했습니다          (--color-status-action 강조 가능)│
└─────────────────────────────────────────────────────────────────┘
```

### 9.5 320px 폭 (세로 스택, `loaded` 상태 예시)

```
┌─ .legend ──────────────┐
│ [ #queue-legend-refresh ]│
│ ┌─────────────────────┐ │
│ │ ● 대기 중            │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ ● 실행 중            │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ ● 조치 필요          │ │
│ └─────────────────────┘ │
└──────────────────────────┘
```

각 `legend__item`의 dot(●)은 색상뿐 아니라 인접 상태명 텍스트를 항상 함께
렌더링하여, 색상 인지가 어려운 환경(스크린리더·흑백 렌더링 포함)에서도 상태를
구분할 수 있게 한다.

---
---

# 풀스크린 2인 스네이크 시각 명세 — neon-snake-fullscreen-0802 (BF-1502)

## 0. 문서 성격

본 절은 상위 frozen Execution Blueprint(`ui-contract@v1`,
sha256:eb62d3d773f9ea261de8c0002ee8d4b13eb3d359aaf05c7a6aa69fbd1ebef15c)와
planner 실행 설계(`docs/plans/implementation-plan.md`, `planning-contract@v1`
sha256:05c1e465b2894ccede1c9e85f8de09e085c255737db3fd096375447a4b8d1c31)의 §3장
계약을 **재정의 없이** 시각 명세 형태로 서술한다. selector·상태 텍스트·token 값은
frozen 목록 그대로이며, 본 절은 신규 selector·상태·역할·token을 추가하지 않는다.

이 task(BF-1502)의 산출물 범위는 본 markdown 절(`docs/design/contract.md`에 추가)
이며, 런타임 HTML/CSS/JS(`demo/neon-snake-fullscreen-0802/index.html`,
`demo/neon-snake-fullscreen-0802/src/game.js`,
`demo/neon-snake-fullscreen-0802/tests/game.test.js`)는 developer(BF-1503)
소유로 frozen되어 있어 본 task에서 생성하지 않는다. 별도 mockup HTML 파일도
생성하지 않으며, §9의 와이어프레임으로 시각 mockup을 대체 설명한다(위 BF-1478
절의 선례와 동일 방식).

> 위 BF-1478(`agent-queue-legend-canary`) 절은 다른 epic의 frozen 산출물이므로
> `additive` 정책에 따라 변경·삭제 없이 보존하고, 본 BF-1502 절만 추가한다.

## 1. 시안 개요

- 대상 라우트: `/demo/neon-snake-fullscreen-0802`
- 진입 파일(developer 소유, frozen): `demo/neon-snake-fullscreen-0802/index.html`
- 성격: 한 화면에서 두 사람이 동시에 조작하는 **풀스크린 네온 스네이크 멀티플레이**.
  단일 플레이 화면의 풀스크린 시각 품질을 유지하면서, 1P/2P 정보 구조(색상 +
  텍스트 라벨 + 머리 구분)와 승자/무승부/일시정지 오버레이를 강화한다.
- 변경 범위: 서버 데이터 모델·API 스키마 변경 없이 클라이언트 게임 상태
  (`ready`/`running`/`paused`/`p1-win`/`p2-win`/`draw`)의 시각 표현만 명세한다.
- 테마: 다크 네온 테마. 보드 배경은 frozen `--color-bg`(`#0a0a12`), 두 뱀·HUD
  강조는 frozen `--color-p1`(`#00e5ff`, 시안)·`--color-p2`(`#ff2fb9`, 마젠타),
  먹이는 frozen `--color-food`(`#ffd400`).
- 사용자 경험 목표:
  1. 1P/2P를 **색상만이 아니라 텍스트 라벨(`1P`/`2P`)과 머리 구분**으로 명확히
     식별해 색약·흑백 환경에서도 두 플레이어를 혼동하지 않게 한다.
  2. 상태 배너와 결과 오버레이로 현재 진행/일시정지/승패/무승부를 텍스트로
     즉시 노출해 색상 인지 없이도 게임 상태를 파악할 수 있게 한다.
  3. 풀스크린 보드로 몰입감을 유지하되 320px 이상 전 구간에서 HUD·조작 안내가
     겹치거나 넘치지 않게 한다.

## 2. 컬러 팔레트

### 2.1 frozen 토큰 (변경 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-p1` | `#00e5ff` | 1P 뱀 · `hud--p1` 강조색 |
| `--color-p2` | `#ff2fb9` | 2P 뱀 · `hud--p2` 강조색 |
| `--color-food` | `#ffd400` | 공유 먹이 색 |
| `--color-bg` | `#0a0a12` | 보드(`snake-board`) 배경 |
| `--space-hud-gap` | `16px` | HUD 요소 간격 |

### 2.2 다크 네온 보조 토큰 (신규 상태 색상 추가 아님 — frozen 목록과 충돌 없음)

frozen 계약은 두 플레이어 강조색·먹이·보드 배경·HUD 간격만 고정하며, 뱀 머리
하이라이트·격자선·텍스트·오버레이 표면 색은 명시하지 않는다. `vanilla-static`
스택 규약(외부 의존성 0건, CSS 변수 자체 정의)에 따라 아래 보조 토큰을 권장한다.
이 토큰들은 §2.1 frozen 색상을 대체하거나 재정의하지 않는다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-snake-head` | `#ffffff` | 두 뱀 머리 공통 하이라이트(각 뱀 몸통색 위에 겹쳐 머리 위치를 색상 외로 구분) |
| `--color-grid-line` | `rgba(255, 255, 255, 0.06)` | 보드 격자선(장식, 저채도) |
| `--color-text-primary` | `#e6f7ff` | 상태 배너·HUD 텍스트·결과 오버레이 텍스트 1차 색 |
| `--color-text-muted` | `#8aa0b4` | 조작 안내 보조 문구 |
| `--color-overlay-scrim` | `rgba(6, 6, 14, 0.72)` | `result-overlay` 반투명 스크림(보드 위 딤 처리) |
| `--color-btn-surface` | `rgba(255, 255, 255, 0.08)` | `control-btn` 기본 표면 |
| `--color-focus-ring` | `#e6f7ff` | 버튼 키보드 포커스 outline |

> 머리 구분 원칙: 두 뱀의 머리 칸은 각 플레이어 몸통색(`--color-p1`/`--color-p2`)
> 위에 `--color-snake-head` 하이라이트(예: 안쪽 흰 사각/테두리)를 겹쳐, 진행
> 방향과 머리 위치를 **색상 대비만이 아니라 형태 차이**로도 식별할 수 있게 한다.

## 3. 타이포그래피

frozen 계약에 타이포그래피 토큰이 없으므로 system font 기반 권장값을 아래와 같이
명세한다(신규 색상/상태 토큰이 아니므로 frozen 제약과 충돌하지 않음).

| 용도 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| 결과 오버레이 텍스트 (`result-overlay__text`) | system-ui, -apple-system, "Segoe UI", sans-serif | clamp(28px, 6vw, 56px) | 700 | 1.2 |
| 상태 배너 (`status-banner`) | system-ui, -apple-system, "Segoe UI", sans-serif | clamp(16px, 2.4vw, 22px) | 600 | 1.3 |
| HUD 점수 (`hud__score`) | system-ui, -apple-system, "Segoe UI", sans-serif | clamp(18px, 3vw, 28px) | 700 | 1.2 |
| HUD 라벨 (`1P`/`2P`) · 조작 안내 | system-ui, -apple-system, "Segoe UI", sans-serif | clamp(12px, 1.8vw, 15px) | 500 | 1.4 |

- `clamp()`로 뷰포트에 따라 가변 크기를 권장해 풀스크린~320px 구간에서 overflow
  없이 가독성을 유지한다(§7 반응형).

## 4. 레이아웃

### 4.1 구조

```
.snake-stage (풀스크린 래퍼, 100dvw × 100dvh)
├─ #hud-p1 (.hud .hud--p1)                 ── 좌측 상단, --color-p1 강조
│   ├─ 라벨 "1P" (색상 외 텍스트 식별)
│   └─ #score-p1 (.hud__score) 점수 숫자
├─ #hud-p2 (.hud .hud--p2)                 ── 우측 상단, --color-p2 강조
│   ├─ 라벨 "2P"
│   └─ #score-p2 (.hud__score) 점수 숫자
├─ #snake-board                            ── 풀스크린 보드(격자·두 뱀·먹이 렌더)
├─ #status-banner (.status-banner)         ── 현재 상태 텍스트(§5.4 6종)
├─ #result-overlay (.result-overlay)       ── 게임오버 시 노출(승자/무승부)
│   └─ .result-overlay__text               ── 결과 텍스트
└─ 조작 control 영역
    ├─ #btn-start (.control-btn)           ── 시작/재개 (aria-label 필수)
    ├─ #btn-pause (.control-btn)           ── 일시정지 (aria-label 필수)
    └─ #btn-restart (.control-btn)         ── 재시작 (aria-label 필수)
```

- 위 ID/class는 모두 frozen이다(§3.2/§3.3 계약). 배치 순서·wrapper 추가 여부는
  overflow 금지·풀스크린 규칙을 지키는 선에서 developer 재량이나, selector 자체는
  변경하지 않는다.
- 조작 안내(1P: WASD / 2P: 방향키 / Space: 시작·정지·재개)는 화면 하단 또는 각
  HUD 인접에 텍스트로 노출한다. 별도 frozen selector가 아니므로 배치는 재량이되
  §7의 320px overflow 금지를 지킨다.

### 4.2 spacing / breakpoint

- HUD 요소 간격: `--space-hud-gap`(`16px`).
- `snake-board`는 고정 소형 캔버스를 쓰지 않고 브라우저 가용 영역(`100dvw ×
  100dvh` 내)을 채운다. HUD/배너/버튼은 보드 위에 겹치거나(overlay) 안전 여백을
  둔 레이어로 배치한다.
- **320px 이상** 전 뷰포트에서 HUD·조작 안내·상태 배너에 content overflow(가로
  스크롤)가 발생하지 않는다. 좁은 폭에서는 HUD를 세로 스택하거나 조작 안내를
  줄바꿈으로 흡수한다.
- HUD는 상단, 조작 안내/버튼은 하단에 배치해 중앙 보드 가시 영역을 최대화하는
  것을 권장한다(단일 플레이 풀스크린 품질 유지, AC).

## 5. 컴포넌트 명세

### 5.1 `#snake-board` — 풀스크린 게임 보드

| 속성 | 명세 |
| --- | --- |
| 배경 | `--color-bg`(`#0a0a12`), 저채도 격자선 `--color-grid-line` 권장(장식) |
| 크기 | `100dvw × 100dvh` 내 가용 영역을 채움, 고정 소형 캔버스 금지(§7) |
| 렌더 요소 | 1P 뱀(몸통 `--color-p1` + 머리 하이라이트), 2P 뱀(몸통 `--color-p2` + 머리 하이라이트), 공유 먹이(`--color-food`) |
| resize | viewport resize 시 셀/보드 치수 재계산, 진행 중 뱀 위치·점수·먹이 보존(§7) |

### 5.2 `#hud-p1` / `#hud-p2` (.hud, .hud--p1 / .hud--p2) — 플레이어 HUD

| 항목 | 1P (`hud-p1` / `hud--p1`) | 2P (`hud-p2` / `hud--p2`) |
| --- | --- | --- |
| 강조색 | `--color-p1`(`#00e5ff`) | `--color-p2`(`#ff2fb9`) |
| 텍스트 라벨(색상 외 식별) | `1P` | `2P` |
| 점수 요소 | `#score-p1` (.hud__score) | `#score-p2` (.hud__score) |
| 초기 점수 | `0` | `0` |

- 각 HUD는 강조색(왼쪽 accent bar/border 등) + **텍스트 라벨(`1P`/`2P`)** +
  점수를 함께 표시한다. 색상만으로 플레이어를 구분하지 않는다(§6 접근성).
- 점수는 먹이 획득 tick의 해당 플레이어만 +1(planner §6). `btn-restart` 시 0으로
  복귀(§5.5, §8 후조건).

### 5.3 `#status-banner` (.status-banner) — 상태 배너

- 현재 `state`에 대응하는 화면 텍스트(§5.4)를 **항상** 노출한다.
- 텍스트 색 `--color-text-primary`, 게임오버 시(§5.4의 p1-win/p2-win/draw)에는
  해당 플레이어 강조색으로 텍스트/테두리를 강조할 수 있으나 텍스트 자체가 1차
  식별 수단이다.

### 5.4 상태(state) 및 화면 텍스트 (frozen — 변경 금지)

| state | 화면 텍스트 | `status-banner` 표현 | `result-overlay` |
| --- | --- | --- | --- |
| `ready` | `스페이스로 시작` | 안내 텍스트, `btn-start`/Space 사용 가능 | 숨김 |
| `running` | `게임 진행 중` | 진행 텍스트, `btn-pause`/Space로 일시정지 | 숨김 |
| `paused` | `일시정지 — 스페이스로 재개` | 일시정지 텍스트, 보드 위 딤 권장, 뱀/점수/먹이 보존 | 숨김(또는 딤 스크림만) |
| `p1-win` | `1P 승리` | 1P 강조색 텍스트 | **노출**, `--color-p1` 강조, `result-overlay__text = "1P 승리"` |
| `p2-win` | `2P 승리` | 2P 강조색 텍스트 | **노출**, `--color-p2` 강조, `result-overlay__text = "2P 승리"` |
| `draw` | `무승부` | 중립 텍스트 | **노출**, 중립 강조, `result-overlay__text = "무승부"` |

- 화면 텍스트 6종은 frozen이며 문구를 변경하지 않는다.
- `p1-win`/`p2-win`/`draw`는 게임오버 상태이며 `result-overlay`가 §6 접근성
  규칙으로 결과를 알린다.

### 5.5 `#result-overlay` (.result-overlay) — 결과 오버레이

| 속성/상태 | 명세 |
| --- | --- |
| 표시 조건 | `p1-win` / `p2-win` / `draw` 상태에서만 노출, 그 외 상태에서 숨김 |
| 표면 | `--color-overlay-scrim` 반투명 스크림으로 보드를 딤 처리(승패 텍스트 가독성) |
| 텍스트 | `.result-overlay__text` = 해당 상태의 frozen 화면 텍스트(`1P 승리`/`2P 승리`/`무승부`) |
| 강조 | 승자 색(`--color-p1`/`--color-p2`) 또는 무승부 중립색으로 텍스트 강조 |
| 접근성 | `role="status"` + `aria-live="polite"`로 결과 텍스트를 알림(§6-1) |
| 후조건 | `btn-restart` 시 `ready`로 복귀하며 오버레이 숨김(§8) |

### 5.6 `#btn-start` / `#btn-pause` / `#btn-restart` (.control-btn) — 조작 버튼

| 버튼 | 역할 | 권장 `aria-label` | 활성 상태 |
| --- | --- | --- | --- |
| `btn-start` (.control-btn) | `ready→running` 시작 / `paused→running` 재개 | `게임 시작 / 재개` | `ready`, `paused`에서 주 실행 control |
| `btn-pause` (.control-btn) | `running→paused` 일시정지 | `일시정지` | `running`에서 사용 |
| `btn-restart` (.control-btn) | 어느 상태든 초기값(`ready`, 점수 0, 먹이 재배치)으로 복귀 | `재시작` | 상시(게임오버·일시정지 포함) 사용 |

- 세 버튼 모두 네이티브 `<button>` 권장(Enter/Space 기본 지원). 단, 게임 조작의
  Space는 상태 전이(시작/정지/재개)에 쓰이므로, 버튼에 포커스가 있을 때의 Space
  기본 동작과 전역 Space 핸들링이 이중 발동하지 않도록 developer가 처리한다
  (frozen selector·상태 텍스트 변경 아님, 구현 유의사항).
- 각 버튼은 명시적 `aria-label`을 가지며 키보드로 조작 가능하다(§6-2).
- 표면 `--color-btn-surface`, 포커스 시 `--color-focus-ring` outline 권장.
- 후조건(§8): 초기화·게임오버·취소 뒤에도 주 실행 control(`btn-start`/Space)이
  즉시 다시 사용 가능해야 하며 비활성 고착 금지.

## 6. 접근성 (frozen)

1. `result-overlay`는 `role="status"` + `aria-live="polite"`로 승자/무승부
   텍스트(`1P 승리`/`2P 승리`/`무승부`)를 알린다.
2. `btn-start`/`btn-pause`/`btn-restart`는 명시적 `aria-label`을 가지며 키보드로
   조작 가능하다.
3. `hud-p1`/`hud-p2` 점수는 색상 외 텍스트 라벨(`1P`/`2P`)로도 구분된다.
4. 모든 상태(§5.4 6종)는 색상만으로 구분하지 않고 상태명을 **화면 텍스트와
   접근성 이름** 양쪽으로 노출한다.
5. (보강) 두 뱀은 색상(`--color-p1`/`--color-p2`) 외에 머리 하이라이트
   (`--color-snake-head`) 형태 차이로도 구분되어, 색약·흑백 환경에서 1P/2P·진행
   방향을 식별할 수 있다.

## 7. 반응형 (frozen)

1. `snake-board`는 브라우저 가용 영역(`100dvw × 100dvh` 내)을 채우고 고정 소형
   캔버스를 쓰지 않는다.
2. viewport resize 시 셀/보드 치수를 재계산하되 **진행 중 플레이 상태(뱀 위치·
   점수·먹이)가 깨지지 않는다.** 재계산은 논리 격자 좌표 유지 + 셀 픽셀 크기만
   갱신하는 방식을 권장한다(좌표 보존).
3. `320px` 이상 뷰포트에서 HUD·조작 안내·상태 배너에 content overflow가 발생하지
   않는다(좁은 폭: HUD 세로 스택, 안내 줄바꿈, `clamp()` 타이포).

## 8. 상태 후조건 / 복구 (frozen)

- 초기화·취소·게임오버 뒤에는 상태와 진행 표시를 **초기값(`ready` /
  `스페이스로 시작`, `score-p1`/`score-p2` = 0)** 으로 되돌리고, `result-overlay`를
  숨기며, 먹이를 유효 위치로 재배치한다.
- 주 실행 control(`btn-start` / Space)이 즉시 다시 사용 가능해야 한다.

## 9. dev 구현 가이드 (BF-1503)

1. `.snake-stage` 래퍼를 `100dvw × 100dvh`로 두고 그 안에 `#snake-board`,
   `#hud-p1`/`#hud-p2`, `#status-banner`, `#result-overlay`, 세 `control-btn`을
   배치한다. selector(ID/class)는 §4.1 목록 그대로 사용한다.
2. `:root`에 frozen 토큰 5개(`--color-p1`, `--color-p2`, `--color-food`,
   `--color-bg`, `--space-hud-gap`)와 §2.2 보조 토큰만 CSS 커스텀 프로퍼티로
   정의한다. 하드코딩 색상 금지, 신규 상태/플레이어 색상 토큰 추가 금지.
3. `#hud-p1`은 `--color-p1`, `#hud-p2`는 `--color-p2` 강조 + 텍스트 라벨
   `1P`/`2P` + `#score-p1`/`#score-p2`(`.hud__score`, 초기 `0`)를 렌더한다.
4. 뱀 렌더: 몸통은 각 플레이어 색, 머리 칸은 몸통색 위 `--color-snake-head`
   하이라이트(안쪽 사각/테두리)를 겹쳐 색상 외로 머리를 구분한다.
5. `#status-banner`는 `state`에 대응하는 §5.4 화면 텍스트를 항상 노출한다.
   문구는 frozen 값을 그대로 사용한다.
6. `#result-overlay`는 `p1-win`/`p2-win`/`draw`에서만 노출하고
   `role="status"` + `aria-live="polite"`를 부여하며 `.result-overlay__text`에
   해당 결과 문구(`1P 승리`/`2P 승리`/`무승부`)를 넣는다. 그 외 상태에서 숨긴다.
7. 세 `control-btn`에 명시적 `aria-label`(§5.6 권장값)을 부여하고 키보드 조작을
   보장한다. 전역 Space 상태 전이와 버튼 포커스 Space 기본동작의 이중 발동을
   방지한다.
8. resize 시 논리 격자 좌표를 보존하고 셀 픽셀 크기만 재계산해 뱀 위치·점수·
   먹이를 유지한다(§7-2). 320px 이상 overflow 없음을 확인한다(§7-3).
9. `btn-restart`는 어느 상태에서든 `ready`(점수 0, 먹이 재배치, 오버레이 숨김)로
   복귀시키고 주 실행 control을 즉시 재사용 가능하게 한다(§8).
10. 게임 로직(tick·충돌·먹이·상태 전이)은 planner §4~§7을 따르며
    `demo/neon-snake-fullscreen-0802/src/game.js`(developer 소유, ESM)에서 구현
    한다. 본 문서는 시각 표현만 명세한다.

## 10. mockup 참조 (와이어프레임)

§0에 따라 본 task는 별도 mockup HTML 파일을 생성하지 않는다(AC #4: 시각 명세
범위는 `docs/design/contract.md`, 런타임 HTML/CSS/JS 미생성). 아래 와이어프레임
으로 시각 mockup을 대체 설명한다. 실제 실행 가능한 산출물은
`demo/neon-snake-fullscreen-0802/index.html` / `src/game.js`(developer, BF-1503
소유)이다.

### 10.1 `ready` 상태 (초기/재시작 후 대기)

```
┌─ .snake-stage (100dvw × 100dvh, --color-bg #0a0a12) ───────────────────────┐
│ ┌─ #hud-p1 .hud--p1 ─────┐                        ┌─ #hud-p2 .hud--p2 ─────┐│
│ │ ▎1P  (#00e5ff)         │                        │        2P (#ff2fb9) ▎  ││
│ │  #score-p1: 0          │                        │  0 :#score-p2          ││
│ └────────────────────────┘   ← --space-hud-gap →  └────────────────────────┘│
│                                                                              │
│                        #snake-board (격자, 두 뱀 대기)                       │
│                                                                              │
│                    ┌────────────────────────────────┐                       │
│                    │ #status-banner: 스페이스로 시작 │                       │
│                    └────────────────────────────────┘                       │
│                                                                              │
│  [ #btn-start 시작/재개 ] [ #btn-pause 일시정지 ] [ #btn-restart 재시작 ]     │
│  1P: W A S D   ·   2P: ↑ ← ↓ →   ·   Space: 시작/정지/재개  (--color-text-muted)│
└──────────────────────────────────────────────────────────────────────────┘
```

### 10.2 `running` 상태 (게임 진행 중)

```
┌─ .snake-stage ─────────────────────────────────────────────────────────────┐
│ ▎1P  #score-p1: 3                                        #score-p2: 2  2P ▎  │
│                                                                              │
│   #snake-board:                                                              │
│     ■■■□  (1P 뱀: 몸통 #00e5ff, 머리 □=흰 하이라이트)                        │
│                    ●  (먹이 #ffd400)                                          │
│               □▓▓▓  (2P 뱀: 몸통 #ff2fb9, 머리 □=흰 하이라이트)              │
│                                                                              │
│            ┌────────────────────────────┐                                    │
│            │ #status-banner: 게임 진행 중 │                                    │
│            └────────────────────────────┘                                    │
│  [ 시작/재개 ] [ 일시정지 ] [ 재시작 ]                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### 10.3 `paused` 상태 (일시정지 — 뱀/점수/먹이 보존, 보드 딤)

```
┌─ .snake-stage ─────────────────────────────────────────────────────────────┐
│ ▎1P  #score-p1: 3                                        #score-p2: 2  2P ▎  │
│   #snake-board (딤 스크림 --color-overlay-scrim, 뱀·먹이 위치 그대로 보존)   │
│            ┌────────────────────────────────────────┐                        │
│            │ #status-banner: 일시정지 — 스페이스로 재개 │                      │
│            └────────────────────────────────────────┘                        │
│  [ 시작/재개 ] [ 일시정지 ] [ 재시작 ]                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### 10.4 게임오버 오버레이 — `p1-win` / `p2-win` / `draw`

```
┌─ .snake-stage ─────────────────────────────────────────────────────────────┐
│ ▎1P  #score-p1: 5                                        #score-p2: 4  2P ▎  │
│  ┌─ #result-overlay .result-overlay (role="status" aria-live="polite") ────┐ │
│  │        (보드 위 --color-overlay-scrim 딤)                                 │ │
│  │                                                                          │ │
│  │              .result-overlay__text:  1P 승리   (#00e5ff 강조)            │ │
│  │              └ p2-win → "2P 승리"(#ff2fb9) / draw → "무승부"(중립)        │ │
│  │                                                                          │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│  #status-banner: 1P 승리 / 2P 승리 / 무승부                                   │
│  [ 시작/재개 ] [ 일시정지 ] [ 재시작 ← ready로 복귀 ]                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 10.5 320px 좁은 뷰포트 (HUD 세로 스택, overflow 없음)

```
┌─ .snake-stage (≥320px) ──────────┐
│ ┌─ #hud-p1 .hud--p1 ───────────┐ │
│ │ ▎1P   #score-p1: 0           │ │
│ └──────────────────────────────┘ │
│ ┌─ #hud-p2 .hud--p2 ───────────┐ │
│ │ ▎2P   #score-p2: 0           │ │
│ └──────────────────────────────┘ │
│ #snake-board (가용 영역 채움)     │
│ ┌──────────────────────────────┐ │
│ │ #status-banner: 스페이스로 시작 │ │
│ └──────────────────────────────┘ │
│ [시작/재개][일시정지][재시작]     │
│ 1P: WASD                          │
│ 2P: 방향키                        │
│ Space: 시작/정지/재개             │
└──────────────────────────────────┘
```

두 뱀의 머리 칸(□)은 색상뿐 아니라 흰 하이라이트 형태로도 구분되고, 상태·승패는
색상 외에 항상 화면 텍스트(`status-banner` / `result-overlay__text`)로 노출되어,
색상 인지가 어려운 환경(스크린리더·흑백 렌더링·색약 포함)에서도 플레이어·진행
상태·결과를 식별할 수 있다.

## 11. Self-critique (BF-1502)

| # | 점검 항목 | 결과 |
| --- | --- | --- |
| 1 | **AC 매핑** | AC1(§2.1/§4.1/§5.4/§6/§7에 frozen domIds·cssClasses·token·상태 텍스트 재정의 없이 반영), AC2(§2.2·§5.2·§5.5·§10.4에 1P/2P 색상 외 텍스트 라벨·머리 구분 + 승자/무승부/일시정지 오버레이 시각 상태 명세), AC3(§1·§4.2·§5.1에 풀스크린 품질 유지 + 2인 정보 구조 강화), AC4(§0·§10에 시각 명세 범위=contract.md, 런타임 HTML/CSS/JS 미생성 명시) 모두 충족. |
| 2 | **dev 구현 가이드** | §9에 selector/token 매핑·머리 구분 렌더·오버레이 접근성·resize 좌표 보존·후조건 복귀를 단계별로 제시. 로직은 planner §4~§7 참조로 위임. |
| 3 | **기존 요소 보존** | 상위 BF-1478 절을 `additive` 정책대로 변경·삭제 없이 보존하고 본 BF-1502 절만 추가. developer 소유 `demo/**` 파일 미생성. |
| 4 | **컴포넌트 매핑** | 10개 DOM ID·9개 CSS class·6개 상태·5개 token을 각각 §4.1/§5/§5.4/§2.1에 1:1 매핑. |
| 5 | **모호함 flag** | 조작 안내 배치·목록 wrapper는 frozen selector가 아님(재량)임을 명시. 전역 Space와 버튼 포커스 Space 이중 발동 방지를 구현 유의사항으로 flag(§5.6/§9-7). frozen 값 변경 없음. |

---
---

# 타이핑 속도 테스트 시각 명세 — typing-test (BF-1917)

## 0. 문서 성격

본 절은 상위 frozen Execution Blueprint(`ui-contract@v1`,
sha256:076a7d2ed4597a916c367779fe0489ff41c3d9c93f4df5e5d01ee23cccab1f22)와
planner 실행 설계(`docs/plans/BF-1916/implementation-plan.md`, `planning-contract@v1`
sha256:98c65e80d185f3f30f9a9ccca8aea1f5a2bf0bf702e7a6ff51ae81ab226a3a5b)의 §3장
UI 계약을 **재정의 없이** 시각 명세 형태로 서술한다. selector·상태 텍스트·color
token 값은 frozen 목록 그대로이며, 본 절은 신규 selector·상태·역할·token을
추가하지 않는다.

이 task(BF-1917)의 산출물 범위는 본 markdown 절(`docs/design/contract.md`에 추가)
뿐이며, 런타임 HTML/CSS/JS(`typing-test.html`)는 developer(BF-1918) 소유로
frozen되어 있어 본 task에서 생성하지 않는다. 별도 mockup HTML 파일도 생성하지
않으며, §10의 와이어프레임으로 시각 mockup을 대체 설명한다(위 BF-1478/BF-1502
절의 선례와 동일 방식).

> 위 BF-1478(`agent-queue-legend-canary`)·BF-1502(`neon-snake-fullscreen-0802`)
> 절은 다른 epic의 frozen 산출물이므로 `additive` 정책에 따라 변경·삭제 없이
> 보존하고, 본 BF-1917 절만 추가한다.

## 1. 시안 개요

- 대상 파일: `typing-test.html`(developer, BF-1918 소유, 단일 파일 — 외부
  의존성 0건, HTML/CSS/JS inline).
- 변경 범위: 서버 데이터 모델·API 스키마 변경 없이, 브라우저 메모리 상의
  타이핑 테스트 런타임 상태(`idle`/`running`/`finished`)의 시각 표현만
  명세한다.
- 테마: 다크 테마. 페이지 배경은 frozen `--color-bg`(`#0f172a`), 카드/입력
  표면은 frozen `--color-surface`(`#1e293b`), 기본 텍스트는 frozen
  `--color-text`(`#e2e8f0`).
- 사용자 경험 목표:
  1. 사용자가 제시된 문장을 입력하면 글자 단위로 정답(`--correct`)/오답
     (`--incorrect`)/현재 커서(`--current`)를 **색상 + 시각적 표식(밑줄·굵기)
     이중으로** 구분해, 색각 이상 사용자도 진행 상황을 인지할 수 있게 한다.
  2. 실시간 지표(경과 시간/WPM/정확도)와 상태 문구를 항상 노출해 측정 진행
     여부를 텍스트로도 확인할 수 있게 한다.
  3. 완료 시 결과 요약을 명확히 제시하고, 어느 state에서든 "다시 시작"으로
     즉시 재도전할 수 있게 한다.

## 2. 컬러 팔레트

### 2.1 frozen 토큰 (변경 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-char-correct` | `#16a34a` | `.typing-test__char--correct` 텍스트/배경 강조 |
| `--color-char-incorrect` | `#dc2626` | `.typing-test__char--incorrect` 텍스트/배경 강조 |
| `--color-char-current` | `#2563eb` | `.typing-test__char--current` 커서 위치 강조 |
| `--color-bg` | `#0f172a` | 페이지 배경 |
| `--color-surface` | `#1e293b` | 카드/입력 영역 표면 |
| `--color-text` | `#e2e8f0` | 기본 텍스트 |
| `--space-control-gap` | `12px` | `.typing-test__stat` 및 control 간 간격 |

### 2.2 다크 테마 보조 색상 권장 (신규 상태 색상 추가 아님 — frozen 목록과 충돌 없음)

frozen 계약은 위 7개 토큰만 고정하며, 테두리·placeholder·비활성 표현 색은
명시하지 않는다. `vanilla-static` 스택 규약(외부 의존성 0건, CSS 변수 자체
정의)에 따라 아래 보조 값을 권장한다. 이 값들은 §2.1 frozen 색상을 대체하거나
재정의하지 않으며, 신규 CSS 커스텀 프로퍼티 추가는 developer 재량이다.

| 권장 용도 | 권장 값 | 비고 |
| --- | --- | --- |
| `typing-test-root`/`typing-test-sentence`/`typing-test-input` 테두리 | `rgba(226, 232, 240, 0.16)` | `--color-text` 저채도 버전, 표면(`--color-surface`) 대비 경계 구분 |
| `typing-test-restart` 기본 표면 | `--color-surface`(`#1e293b`) | 버튼 배경, hover 시 `rgba(226, 232, 240, 0.08)` 오버레이 권장 |
| 키보드 포커스 outline | `--color-char-current`(`#2563eb`) | 신규 토큰 추가 없이 기존 frozen 색상 재사용 |
| `typing-test-input` readonly(`finished`) 표시 | `opacity: 0.72` | 색상 변경 대신 투명도로 비활성 인지(§6-4 원칙 준수) |

## 3. 타이포그래피

frozen 계약에 타이포그래피 토큰이 없으므로 system font 기반 권장값을 아래와
같이 명세한다(신규 색상/상태 토큰이 아니므로 frozen 제약과 충돌하지 않음).

| 용도 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| `#typing-test-sentence` (문장, `.typing-test__char`) | system-ui, -apple-system, "Segoe UI", sans-serif | clamp(18px, 3.2vw, 26px) | 500 | 1.7 |
| `#typing-test-input` | system-ui, -apple-system, "Segoe UI", sans-serif | 16px | 400 | 1.5 |
| `.typing-test__stat` (통계 4종) | system-ui, -apple-system, "Segoe UI", sans-serif | 14px | 600 | 1.4 |
| `#typing-test-restart` | system-ui, -apple-system, "Segoe UI", sans-serif | 14px | 600 | 1.4 |
| `#typing-test-result` (`.typing-test__result`) | system-ui, -apple-system, "Segoe UI", sans-serif | clamp(15px, 2.4vw, 18px) | 600 | 1.5 |

- `#typing-test-input`은 최소 16px을 권장한다(모바일 브라우저 자동 확대 방지,
  비-frozen 구현 권장).
- `clamp()`는 §7 반응형(320px~768px 이상)에서 overflow 없이 가독성을
  유지하기 위한 권장이며, frozen 값이 아니다.

## 4. 레이아웃

### 4.1 구조

```
#typing-test-root (배경 --color-bg)
├─ #typing-test-sentence                          ── 목표 문장, 글자별
│   └─ <span class="typing-test__char [--correct|--incorrect|--current]">
├─ #typing-test-input                              ── aria-label="타이핑 테스트 입력"
├─ (통계 그룹 wrapper — 비-frozen, 권장 구조)
│   ├─ #typing-test-status   (.typing-test__stat)  ── 상태 텍스트
│   ├─ #typing-test-timer    (.typing-test__stat)  ── mm:ss
│   ├─ #typing-test-wpm      (.typing-test__stat)  ── "{n} WPM"
│   └─ #typing-test-accuracy (.typing-test__stat)  ── "정확도 {n}%"
├─ #typing-test-restart                            ── <button> "다시 시작"
└─ #typing-test-result (.typing-test__result)      ── finished에서만 표시
```

`typing-test-root`/`typing-test-sentence`/`typing-test-input`/`typing-test-status`/
`typing-test-timer`/`typing-test-wpm`/`typing-test-accuracy`/`typing-test-restart`/
`typing-test-result`(ID)와 `typing-test__char`/`typing-test__char--correct`/
`typing-test__char--incorrect`/`typing-test__char--current`/`typing-test__stat`/
`typing-test__result`(class)만 frozen이다. 통계 그룹 wrapper에 별도 ID/class를
둘지는 developer 재량이며(planner §6 모호함 flag와 동일), 본 절의 배치는
권장 표현일 뿐 frozen selector가 아니다.

### 4.2 spacing / breakpoint (frozen — §7 참조)

- 통계 항목(`.typing-test__stat`) 간 간격: `--space-control-gap`(`12px`).
- `#typing-test-root`는 최대 폭(예: 640px 권장, 비-frozen)에 카드형 표면
  (`--color-surface`, 모서리 radius 권장)으로 배치하고 뷰포트 중앙 정렬을
  권장한다.
- **320px 이상** 전 뷰포트에서 문장/입력/통계 영역에 content overflow(가로
  스크롤)가 발생하지 않는다(§7-1).

## 5. 컴포넌트 명세

### 5.1 `#typing-test-sentence` — 문장 표시 영역

| 항목 | 명세 |
| --- | --- |
| 렌더 | 문장의 각 글자를 `<span class="typing-test__char">`로 렌더링, 로드/재시작 시마다 §4.1(BF-1919 §4.1) 문장 배열에서 무작위 재선택 |
| `--correct` | 텍스트/배경 `--color-char-correct`(`#16a34a`) + 밑줄(`text-decoration: underline`) 병행 — 색상만 의존 금지(§6-4) |
| `--incorrect` | 텍스트/배경 `--color-char-incorrect`(`#dc2626`) + 물결 밑줄(`text-decoration: wavy underline`) 병행 |
| `--current` | 텍스트/배경 `--color-char-current`(`#2563eb`) + 좌측 caret 형태(예: 얇은 세로 바 `border-left` 또는 배경 강조) 병행 |
| 미입력(modifier 없음) | `--color-text`(`#e2e8f0`) 기본 색, 표식 없음 |

- `--current`/`--correct`/`--incorrect`의 정확한 시각 형태(밑줄/캐럿 스타일)는
  planner 문서 §6 모호함 flag(§3.4-4)가 designer/developer 재량으로 위임한
  항목이며, 위 표가 이 절의 exact 값이다. 색상 값(§2.1) 자체는 frozen이므로
  변경하지 않는다.

### 5.2 `#typing-test-input` — 입력 영역

| 항목 | 명세 |
| --- | --- |
| 마크업 | `<input type="text">` 권장(단일 줄 문장 기준), `aria-label="타이핑 테스트 입력"`(frozen) |
| 표면 | `--color-surface`, 텍스트 `--color-text`, 테두리 §2.2 보조 값 |
| `idle`/`running` | 활성, 값 입력·유지 가능 |
| `finished` | `readonly` 속성 부여(비활성 아님 — 포커스는 가능하되 값 변경 불가), §2.2 `opacity: 0.72`로 시각 구분 |
| 포커스 | 키보드 포커스 시 §2.2 outline(`--color-char-current`) 노출 |

### 5.3 실시간 지표 영역 — `.typing-test__stat` × 4

| 요소 | frozen 표시 값(§상태별) | 비고 |
| --- | --- | --- |
| `#typing-test-status` | §6(state) 표 참조 | 상태명 텍스트, `aria-live="polite"` |
| `#typing-test-timer` | `00:00` 초기, `running` 중 `mm:ss` 카운트업, `finished` 시 고정 | `aria-live="polite"` |
| `#typing-test-wpm` | `0 WPM` 초기, `running` 중 실시간 갱신, `finished` 시 최종값 고정 | `aria-live="polite"` |
| `#typing-test-accuracy` | `정확도 100%` 초기, `running` 중 실시간 갱신, `finished` 시 최종값 고정 | `aria-live="polite"` |

- 4개 요소 모두 `--color-text` 텍스트, `.typing-test__stat` 공통 클래스로
  통일된 카드/칩 형태(표면 `--color-surface`, 내부 padding) 권장.
- `#typing-test-status`가 `finished`(완료!)일 때는 `--color-char-correct`로
  강조 텍스트 색을 줄 수 있으나(선택), 상태 텍스트 자체가 1차 식별 수단이다.

### 5.4 `#typing-test-restart` — 다시 시작 버튼

| 속성/상태 | 명세 |
| --- | --- |
| 마크업 | 네이티브 `<button>`(frozen 원칙 §3.4-3, Enter/Space 기본 지원) |
| 텍스트 | `다시 시작` |
| 표면 | §2.2 권장 표면, hover/focus 시 §2.2 outline |
| 활성 상태 | 모든 state(`idle`/`running`/`finished`)에서 상시 활성(비활성 고착 금지, §8) |
| 동작 | 클릭 시 새 문장 선택 + `state=idle` 복귀 + 모든 지표 초기화(§8) |

### 5.5 `#typing-test-result` (.typing-test__result) — 결과 요약

| 속성/상태 | 명세 |
| --- | --- |
| 표시 조건 | `state=finished`에서만 노출, 그 외(`idle`/`running`) 숨김 |
| 텍스트 | `완료 — {WPM} WPM, 정확도 {정확도}%`(frozen 포맷, §3.2) |
| 표면 | `--color-surface` 카드, 텍스트 `--color-text`, 강조 포인트로 `--color-char-correct` 사용 가능(선택) |
| 위치 | `#typing-test-restart` 인접(위/아래) 배치 권장 — 완료 직후 결과와 재시작 control을 함께 인지 |

## 6. state 및 화면 텍스트 (frozen — 변경 금지)

| state | `#typing-test-status` | `#typing-test-input` | `#typing-test-restart` | `#typing-test-result` |
| --- | --- | --- | --- | --- |
| `idle` | `입력을 시작하면 측정이 시작됩니다` | 비어 있음, 활성 | 활성 | 숨김 |
| `running` | `입력 중…` | 활성, 입력값 유지 | 활성 | 숨김 |
| `finished` | `완료!` | readonly, 값 유지 | 활성(즉시 재사용) | 표시: `완료 — {WPM} WPM, 정확도 {정확도}%` |

- 초기값(모든 state 진입 직후 `idle`): `#typing-test-timer`=`00:00`,
  `#typing-test-wpm`=`0 WPM`, `#typing-test-accuracy`=`정확도 100%`.
- 위 화면 텍스트는 frozen이며 문구를 변경하지 않는다(BF-1919 §3.2 그대로).

## 7. 반응형 (frozen)

1. **320px 폭**에서 `#typing-test-sentence`, `#typing-test-input`, 통계 영역
   (`.typing-test__stat` 그룹)이 가로 스크롤 없이 **세로로 순서대로 쌓인다**
   (`flex-direction: column` 또는 동등 구현). §3 타이포그래피의 `clamp()`로
   문장 글자 크기가 좁은 폭에서 줄어들어 줄바꿈이 자연스럽게 흡수된다.
2. **768px 이상**에서는 `#typing-test-timer`, `#typing-test-wpm`,
   `#typing-test-accuracy` 3개 통계 항목이 `--space-control-gap`(`12px`)
   간격을 두고 **가로 정렬**로 표시된다. `#typing-test-status`는 통계 항목
   행 위 또는 좌측에 별도 배치(developer 재량, 320px 규칙 유지 전제).
3. 320px~767px 사이 모든 폭에서 content overflow(가로 스크롤)가 발생하지
   않는다.

## 8. 접근성 (frozen)

1. `#typing-test-input`은 `aria-label="타이핑 테스트 입력"`을 가진다.
2. `#typing-test-status`, `#typing-test-timer`, `#typing-test-wpm`,
   `#typing-test-accuracy` 4개 요소는 각각 `aria-live="polite"`를 가져 state
   전이·통계 갱신을 스크린리더가 읽어준다.
3. `#typing-test-restart`는 네이티브 `<button>`이며 Tab 이동 후 Enter 또는
   Space만으로 실행 가능하다(별도 키 핸들러 불필요).
4. 모든 state(§6)와 글자별 정오답(`--correct`/`--incorrect`/`--current`)은
   색상만으로 구분하지 않는다 — state는 화면 텍스트로, 글자 상태는 §5.1의
   밑줄/캐럿 시각 표식을 색상과 함께 병행한다.

## 9. 상태 후조건 / 복구 (frozen)

- 초기화·취소(진행 중 다시 시작)·완료 후 다시 시작 뒤에는 `state`와 진행
  표시(타이머, WPM, 정확도, 글자별 정오답 표식)를 **초기값**(`idle`,
  `00:00`, `0 WPM`, `정확도 100%`, 표식 없음)으로 되돌리고, 새 문장을
  표시하며, `#typing-test-input`과 `#typing-test-restart`가 **즉시 다시
  사용 가능**해야 한다(비활성 고착 금지).

## 10. dev 구현 가이드 (BF-1918)

1. `#typing-test-root`를 `--color-bg` 배경 위 카드형 컨테이너로 두고, 그
   안에 `#typing-test-sentence`, `#typing-test-input`, 통계 그룹(4개
   `.typing-test__stat`), `#typing-test-restart`, `#typing-test-result`를
   §4.1 순서로 배치한다. selector(ID/class)는 §4.1 목록 그대로 사용한다.
2. `:root`에 frozen 토큰 7개(`--color-char-correct`, `--color-char-incorrect`,
   `--color-char-current`, `--color-bg`, `--color-surface`, `--color-text`,
   `--space-control-gap`)와 §2.2 보조 값만 CSS 커스텀 프로퍼티로 정의한다.
   하드코딩 색상 금지, 신규 상태 색상 토큰 추가 금지.
3. `#typing-test-sentence`는 문장의 각 글자를 `<span class="typing-test__char">`
   로 렌더링하고, 입력 이벤트마다 §5.1 표대로 `--correct`/`--incorrect`/
   `--current` modifier(색상 + 밑줄/캐럿 시각 표식)를 갱신한다.
4. `#typing-test-input`은 `aria-label="타이핑 테스트 입력"`을 부여하고,
   `idle`/`running`에서 활성, `finished`에서 `readonly` + §2.2 `opacity`로
   비활성을 시각 구분한다(포커스 자체는 유지 가능).
5. `#typing-test-status`/`#typing-test-timer`/`#typing-test-wpm`/
   `#typing-test-accuracy` 4개 요소에 `aria-live="polite"`를 부여하고, §6
   표의 state별 frozen 텍스트를 그대로 반영한다.
6. `#typing-test-restart`는 네이티브 `<button>`으로 구현하고, 어느 state
   에서든 클릭 시 새 문장 선택 + `state=idle` 복귀 + 지표 초기화(§9)를
   수행하며 항상 활성 상태를 유지한다.
7. `#typing-test-result`는 `state=finished`에서만 노출하고 `완료 — {WPM}
   WPM, 정확도 {정확도}%` frozen 포맷 텍스트를 표시하며, 그 외 state에서
   숨긴다.
8. 320px 이상에서 §7-1(세로 스택) overflow 없음을 확인하고, 768px 이상에서
   §7-2(통계 3항목 가로 정렬 + `--space-control-gap`)를 구현한다.
9. WPM·정확도 계산식, 문장 목록, 런타임 상태 모델은 planner 문서
   (`docs/plans/BF-1916/implementation-plan.md`) §4를 따르며 `typing-test.html`
   (developer 소유, 단일 파일)에서 구현한다. 본 문서는 시각 표현만 명세한다.

## 11. mockup 참조 (와이어프레임)

§0에 따라 본 task는 별도 mockup HTML 파일을 생성하지 않는다(AC #4: 시각
명세 범위는 `docs/design/contract.md`, 런타임 HTML/CSS/JS 미생성). 아래
와이어프레임으로 시각 mockup을 대체 설명한다. 실제 실행 가능한 산출물은
`typing-test.html`(developer, BF-1918 소유)이다.

### 11.1 `idle` 상태 (초기 로드)

```
┌─ #typing-test-root (카드, --color-surface 위 --color-bg 배경) ────────────┐
│                                                                            │
│  #typing-test-sentence:                                                   │
│   가을 하늘은 높고 파랗다   (전부 --color-text, 표식 없음)                │
│                                                                            │
│  ┌─ #typing-test-input (aria-label="타이핑 테스트 입력") ──────────────┐  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────┐┌──────────────┐┌──────────┐┌────────────────┐ │
│  │#typing-test-status:   ││#typing-test-  ││#typing-  ││#typing-test-   │ │
│  │입력을 시작하면 측정이 ││timer: 00:00  ││test-wpm: ││accuracy:       │ │
│  │시작됩니다             ││              ││0 WPM     ││정확도 100%     │ │
│  └──────────────────────┘└──────────────┘└──────────┘└────────────────┘ │
│                                    ← --space-control-gap(12px) →          │
│  [ #typing-test-restart 다시 시작 ]                                       │
│  (#typing-test-result 숨김)                                               │
└────────────────────────────────────────────────────────────────────────┘
```

### 11.2 `running` 상태 (입력 중, 오타 1건 포함)

```
┌─ #typing-test-root ───────────────────────────────────────────────────────┐
│  #typing-test-sentence:                                                    │
│   가을 하늘은 [높]고 파랗다                                                │
│   └ "가을 하늘은 " = --correct(#16a34a, 밑줄)                              │
│   └ "높" = --incorrect(#dc2626, 물결 밑줄, 오타 입력됨)                    │
│   └ "고" = --current(#2563eb, 좌측 caret) ← 다음 입력 위치                 │
│   └ " 파랗다" = 미입력(--color-text, 표식 없음)                            │
│                                                                             │
│  ┌─ #typing-test-input: "가을 하늘은 놉" ────────────────────────────┐     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  status: 입력 중…   timer: 00:03   wpm: 42 WPM   accuracy: 정확도 88%      │
│  [ 다시 시작 ]  (result 숨김)                                              │
└────────────────────────────────────────────────────────────────────────┘
```

### 11.3 `finished` 상태 (완료)

```
┌─ #typing-test-root ───────────────────────────────────────────────────────┐
│  #typing-test-sentence: 가을 하늘은 높고 파랗다  (전부 --correct/--incorrect 확정, --current 없음) │
│                                                                             │
│  ┌─ #typing-test-input(readonly, opacity 0.72): "가을 하늘은 놉고 파랗다" ─┐│
│  └───────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  status: 완료!   timer: 00:08(고정)   wpm: 38 WPM(고정)   accuracy: 정확도 92%(고정) │
│                                                                             │
│  ┌─ #typing-test-result (.typing-test__result) ───────────────────────┐   │
│  │ 완료 — 38 WPM, 정확도 92%                                          │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│  [ #typing-test-restart 다시 시작 ] ← 즉시 재사용 가능                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 11.4 320px 좁은 뷰포트 (세로 스택, `running` 상태 예시)

```
┌─ #typing-test-root (≥320px, 세로 스택) ─┐
│ #typing-test-sentence:                    │
│  가을 하늘은 [높]고                       │
│  파랗다  (clamp() 줄바꿈)                 │
│ ┌────────────────────────────────────┐   │
│ │ #typing-test-input                  │   │
│ └────────────────────────────────────┘   │
│ ┌────────────────────────────────────┐   │
│ │ #typing-test-status: 입력 중…       │   │
│ └────────────────────────────────────┘   │
│ ┌────────────────────────────────────┐   │
│ │ #typing-test-timer: 00:03           │   │
│ └────────────────────────────────────┘   │
│ ┌────────────────────────────────────┐   │
│ │ #typing-test-wpm: 42 WPM            │   │
│ └────────────────────────────────────┘   │
│ ┌────────────────────────────────────┐   │
│ │ #typing-test-accuracy: 정확도 88%   │   │
│ └────────────────────────────────────┘   │
│ [ 다시 시작 ]                             │
└────────────────────────────────────────────┘
```

### 11.5 768px 이상 (통계 3항목 가로 정렬)

```
┌─ #typing-test-root (≥768px) ──────────────────────────────────────────────┐
│ #typing-test-sentence: 가을 하늘은 [높]고 파랗다                          │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ #typing-test-input                                                  │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│ #typing-test-status: 입력 중…                                             │
│ [ timer: 00:03 ] ←12px→ [ wpm: 42 WPM ] ←12px→ [ accuracy: 정확도 88% ]   │
│ [ 다시 시작 ]                                                              │
└────────────────────────────────────────────────────────────────────────┘
```

글자별 정오답·커서 표식은 색상뿐 아니라 밑줄/물결 밑줄/caret 형태로도
구분되고, state는 항상 `#typing-test-status` 화면 텍스트로 노출되어, 색상
인지가 어려운 환경(스크린리더·흑백 렌더링·색약 포함)에서도 진행 상황과
결과를 식별할 수 있다.

## 12. Self-critique (BF-1917)

| # | 점검 항목 | 결과 |
| --- | --- | --- |
| 1 | **AC 매핑** | AC1(§4.1/§5에 문장 표시·입력·실시간 지표(`#typing-test-timer`/`#typing-test-wpm`/`#typing-test-accuracy`)·결과 요약(`#typing-test-result`) 레이아웃 반영), AC2(§6에 idle/running/finished 각 state의 `#typing-test-status` exact 화면 텍스트, §5.1에 `--correct`/`--incorrect` exact 색상+표식 반영), AC3(§7에 320px 세로 스택 + 768px 이상 통계 3항목 가로 정렬, selector/token 재정의 없음), AC4(§0·§11에 시각 명세 범위=`docs/design/contract.md`, 런타임 HTML/CSS/JS 미생성 명시) 모두 충족. |
| 2 | **dev 구현 가이드** | §10에 selector/token 매핑·글자 표식 렌더·입력 readonly 처리·지표 aria-live·재시작 후조건·반응형 구현을 단계별로 제시. 계산식·문장 목록·상태 모델은 planner §4 참조로 위임. |
| 3 | **기존 요소 보존** | 상위 BF-1478·BF-1502 절을 `additive` 정책대로 변경·삭제 없이 보존하고 본 BF-1917 절만 추가. developer 소유 `typing-test.html` 미생성. |
| 4 | **컴포넌트 매핑** | 9개 DOM ID·6개 CSS class·3개 state·7개 색상 token을 각각 §4.1/§6/§2.1에 1:1 매핑, 신규 selector/token 추가 없음. |
| 5 | **모호함 flag** | planner §6이 위임한 `--current`/`--correct`/`--incorrect` 정확한 시각 형태(밑줄/캐럿)를 §5.1에서 exact 값으로 확정. 통계 그룹 wrapper·`#typing-test-status` 배치(768px)는 frozen selector가 아니므로 developer 재량임을 §4.1/§7-2에 명시. frozen 값(색상 token·selector·화면 텍스트) 변경 없음. |

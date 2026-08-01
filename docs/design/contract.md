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

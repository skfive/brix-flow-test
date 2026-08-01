# 상태 범례 시각 명세 — agent-status-legend-canary (BF-1472)

## 0. 문서 성격

본 문서는 상위 frozen Execution Blueprint(`ui-contract@v1`,
sha256:f8f5a216c7370ee7274fd5401dc511ca7a9281f90be7963e50903a7a63d7446a)와
planner 실행 설계(`docs/plans/agent-status-legend-canary-plan.md`,
`planning-contract@v1` sha256:bd0f28a15291acc9da2d35ae62ba6b66f813196510166c3c40d05d0b094b5fe0)의
계약을 **재정의 없이** 시각 명세 형태로 서술한다. selector·상태·token 값은 frozen
목록 그대로이며, 본 문서는 신규 selector·상태를 추가하지 않는다.

이 task(BF-1472)의 산출물 범위는 본 markdown 1개 파일이며, 런타임
HTML/CSS/JS(`demo/agent-status-legend-canary/index.html`,
`demo/agent-status-legend-canary/src/feature.js`)는 developer(BF-1473) 소유로
frozen되어 있어 본 task에서 생성하지 않는다. 별도 mockup HTML 파일도 생성하지
않으며, §9의 와이어프레임으로 시각 mockup을 대체 설명한다.

## 1. 시안 개요

- 대상 라우트: `/demo/agent-status-legend-canary`
- 진입 파일(developer 소유, frozen): `demo/agent-status-legend-canary/index.html`
- 성격: 서버 API·localStorage 없는 **client-only** 상태 범례 캐너리. 선택 상태는
  페이지 세션 동안만 메모리에 유지된다.
- 테마: 다크 테마. 카드 표면은 frozen 토큰 `--color-surface-card`(`#1e293b`)를
  사용하고, 페이지 배경은 그보다 어두운 톤으로 대비를 준다(§2.1).
- 사용자 경험 목표: 에이전트의 5개 상태(실행 중/대기 중/조치 필요/정체됨/완료)를
  색상에만 의존하지 않고 텍스트 라벨로도 즉시 식별할 수 있게 하며, 특정 상태를
  선택하면 그 상태의 의미와 다음 행동을 상세 패널에서 확인할 수 있게 한다.

## 2. 컬러 팔레트

### 2.1 frozen 토큰 (재정의 금지)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-surface-card` | `#1e293b` | `legend__item` 카드 표면 |
| `--color-status-running` | `#3b82f6` | `running`(실행 중) 배지 색상 |
| `--color-status-waiting` | `#eab308` | `waiting`(대기 중) 배지 색상 |
| `--color-status-action` | `#f97316` | `action-needed`(조치 필요) 배지 색상 |
| `--color-status-stalled` | `#ef4444` | `stalled`(정체됨) 배지 색상 |
| `--color-status-done` | `#22c55e` | `done`(완료) 배지 색상 |
| `--space-card-gap` | `16px` | `legend__item` 카드 사이 간격 |

### 2.2 다크 테마 보조 토큰 (신규 색상 상태 추가 아님 — frozen 목록과 충돌 없음)

frozen 계약은 배지·카드 색상만 고정하며 페이지 배경/텍스트 색상은 명시하지
않는다. `vanilla-static` 스택 규약(외부 의존성 0건)에 따라 다크 테마 배경·텍스트
보조 토큰을 아래와 같이 권장한다. 이 토큰들은 상태 배지 색상을 대체하지 않는다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-page-background` | `#0f172a` | `legend-root` 페이지 배경 (카드보다 어두운 톤) |
| `--color-text-primary` | `#f1f5f9` | 상태명, 헤딩 등 1차 텍스트 |
| `--color-text-secondary` | `#94a3b8` | 의미/다음 행동 설명, placeholder 텍스트 |
| `--color-border-subtle` | `rgba(148, 163, 184, 0.24)` | 카드/패널 경계선 |
| `--color-focus-ring` | `#f1f5f9` | 키보드 포커스 및 선택 표시 outline |

## 3. 타이포그래피

frozen 계약에 별도 타이포그래피 토큰이 없으므로 system font 기반 권장값을
아래와 같이 명세한다(신규 색상/상태 토큰이 아니므로 frozen 제약과 충돌하지 않음).

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| heading (`legend-root` 제목, 있는 경우) | system-ui, -apple-system, "Segoe UI", sans-serif | 18px | 600 | 1.4 |
| body (`legend__badge` 상태명, `legend__detail` 상태명) | system-ui, -apple-system, "Segoe UI", sans-serif | 14px | 500 | 1.5 |
| caption (`legend__detail` 의미/다음 행동, placeholder) | system-ui, -apple-system, "Segoe UI", sans-serif | 13px | 400 | 1.5 |

## 4. 레이아웃

### 4.1 구조

```
#legend-root (.legend)
├─ #legend-reset (.legend__reset)              ── 범례 초기화 컨트롤
├─ #legend-status-list (ul)                     ── 상태 배지 목록
│   └─ .legend__item × N (기본 5, 선택 시 1)
│       └─ .legend__badge                       ── 색상 표시 + 상태명 텍스트
└─ #legend-detail-panel (.legend__detail)        ── 선택 상태 상세 또는 placeholder
```

### 4.2 spacing / breakpoint

- 카드(`legend__item`) 사이 간격: `--space-card-gap`(`16px`).
- 320px 이상: `legend-root`와 `legend__item` 모두 content overflow 없이 표시(가로
  스크롤 발생 금지) — 상태명 텍스트가 길어도 줄바꿈으로 흡수한다.
- 좁은 화면(320px~479px 권장 기준)에서 `legend-status-list`는 세로로 스택된다
  (`flex-direction: column` 또는 `grid-template-columns: 1fr`).
- 480px 이상에서는 `legend-status-list`를 가로 배치(행/그리드)로 구현할지 세로
  스택을 유지할지는 developer 재량이나, frozen 계약은 좁은 화면 세로 스택만
  강제한다.

## 5. 컴포넌트 명세

### 5.1 `#legend-root` (.legend) — 컨테이너

컴포넌트 상태는 `selectedStatus` 값에 따라 아래 2가지 중 하나.

| 상태 | 트리거 | 화면 표현 |
|---|---|---|
| 전체 보기 (`selectedStatus = null`) | 최초 로드, 동일 항목 재클릭, `legend-reset` | `legend-status-list`에 5개 `legend__item` 모두 표시, `legend-detail-panel`은 placeholder 텍스트 |
| 단일 상태 보기 (`selectedStatus = <key>`) | 특정 `legend__item` 클릭/Enter/Space | `legend-status-list`에 선택된 `legend__item` 1개만 표시(나머지 필터링), `legend-detail-panel`에 해당 상태의 상태명·의미·다음 행동 표시 |

불변식: 초기화(`legend-reset`) 또는 동일 항목 재클릭 이후에는 상태와 목록 표시가
전체 보기로 되돌아가고, `legend-reset`을 포함한 주 실행 control은 즉시 다시
사용 가능해야 한다(연속 클릭에도 항상 동일한 전체 보기로 수렴).

### 5.2 `.legend__item` — 상태 카드 (5개, frozen 순서 고정)

각 `legend__item`은 키보드로 포커스·활성화 가능한 요소(예: 내부에 네이티브
`<button>` 사용 권장)이며, 아래 5개 상태를 고정 순서로 표현한다.

| 상태 키 | 색상 토큰 | 상태명(화면 텍스트) | 의미 | 다음 행동 |
|---|---|---|---|---|
| `running` | `--color-status-running` (`#3b82f6`) | 실행 중 | 에이전트가 현재 작업을 수행하고 있다 | 진행 상황을 계속 지켜본다 |
| `waiting` | `--color-status-waiting` (`#eab308`) | 대기 중 | 에이전트가 선행 작업이나 리소스를 기다리고 있다 | 차단 요인이 해소될 때까지 기다린다 |
| `action-needed` | `--color-status-action` (`#f97316`) | 조치 필요 | 운영자의 확인·승인이 필요하다 | 지금 확인하고 필요한 조치를 취한다 |
| `stalled` | `--color-status-stalled` (`#ef4444`) | 정체됨 | 예상보다 오래 진행 없이 멈춰 있다 | 원인을 점검하고 필요하면 재시작한다 |
| `done` | `--color-status-done` (`#22c55e`) | 완료 | 작업이 정상적으로 종료되었다 | 결과를 검토하고 다음 단계로 진행한다 |

선택 표시(강조)는 색상 변경만으로 하지 않는다. 선택된 `legend__item`은 아래를
함께 동반한다(색상 단독 구분 금지 원칙, §6):
- `aria-pressed="true"`(또는 동등한 접근성 상태 속성)
- `--color-focus-ring` 기반의 시각적 outline/border 강조
- 선택 여부를 알리는 텍스트(예: 화면에 보이는 "선택됨" 표기 또는
  스크린리더 전용 텍스트)

### 5.3 `.legend__badge` — 상태 배지 (각 `legend__item` 내부)

- 구성: 상태 색상을 나타내는 인디케이터(예: 12px 원형 dot, 배경색 = 해당 상태
  색상 토큰) + 상태명 텍스트(§5.2 표의 "상태명(화면 텍스트)" 값)를 나란히 표시.
- 색상 인디케이터는 장식용(`aria-hidden="true"`)이며, 상태명 텍스트가 상태를
  식별하는 1차 수단이다(색상만으로 구분 금지).
- 배지 텍스트 색상은 `--color-text-primary`로 다크 배경(`--color-surface-card`)
  대비 가독성을 확보한다.

### 5.4 `#legend-detail-panel` (.legend__detail) — 상세 패널

| 상태 | 트리거 | 화면 표현 |
|---|---|---|
| placeholder | `selectedStatus = null` | "상태를 선택하면 의미와 다음 행동을 확인할 수 있습니다" 등 안내 텍스트 1건(`--color-text-secondary`) |
| 상세 표시 | `selectedStatus = <key>` | 선택 상태의 "상태명 / 의미 / 다음 행동" 3개 텍스트를 그대로 표시(§5.2 표 값과 동일 문구) |

### 5.5 `#legend-reset` (.legend__reset) — 초기화 컨트롤

| 속성/상태 | 명세 |
|---|---|
| `aria-label` | `"범례 초기화"`(frozen, 변경 금지) |
| 마크업 | 네이티브 `<button>` 권장(Enter/Space 기본 지원) |
| 위치 | `legend-status-list` 상단 또는 하단 — 다크 테마 카드와 시각적으로 구분되도록 `--color-border-subtle` 경계선 사용 |
| 동작 | 클릭 또는 키보드 활성화 시 `selectedStatus`를 `null`로 재설정, `legend-status-list` 전체 보기 복원, `legend-detail-panel` placeholder 복원 |
| 연타 처리 | 이미 전체 보기(`selectedStatus = null`)에서 다시 눌러도 예외 없이 동일한 전체 보기 상태를 유지(멱등) |

## 6. 접근성 (frozen)

- 각 `legend__badge`는 색상 외에 상태명 텍스트 라벨(§5.2 "상태명" 값)을 포함한다.
- `legend-reset` control은 명시적인 `aria-label`(`"범례 초기화"`)을 가진다.
- `legend-status-list`의 각 항목(`legend__item`)은 Tab/Shift+Tab으로 순회
  가능하고 Enter/Space로 선택을 활성화할 수 있다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름
  (`aria-label` 또는 텍스트 노드)으로 함께 노출한다.
- 320px 폭에서 단일 상태 보기와 전체 보기 모두 텍스트/배지 overflow가 발생하지
  않는다(§4.2).

## 7. 상태 전이 시각 표현

planner 문서(`agent-status-legend-canary-plan.md`)의 Given/When/Then 시나리오를
시각적으로 요약한다(새 시나리오 추가 아님, 서술만).

1. **초기 로드** — 전체 보기, 5개 배지 모두 표시, 상세 패널은 placeholder.
2. **배지 선택** — 목록이 선택된 1개 배지만 남기고 필터링, 상세 패널에 상태명·
   의미·다음 행동 표시, 선택된 배지에 §5.2의 비색상 선택 표시 동반.
3. **동일 배지 재클릭** — 선택 해제 → 1번 상태(전체 보기)로 복귀.
4. **`legend-reset` 클릭** — 언제 눌러도 1번 상태(전체 보기)로 복귀, 컨트롤 즉시
   재사용 가능.

## 8. dev 구현 가이드

1. 컨테이너 루트는 `id="legend-root"` + `class="legend"`로 마크업하고, 배경은
   `--color-page-background`, 카드 표면은 frozen `--color-surface-card`를
   사용한다.
2. 상태 목록은 `id="legend-status-list"`인 `<ul>`로 마크업하고, 각 상태는
   `<li>` 안에 `class="legend__item"` 네이티브 `<button type="button">`을
   배치해 키보드 Tab 순회·Enter/Space 활성화를 기본 지원받는다.
3. 각 `legend__item` 내부에 `class="legend__badge"` 요소를 두고, 색상 dot
   (`aria-hidden="true"`) + 상태명 텍스트를 함께 렌더링한다. dot 색상은
   `--color-status-running` 등 5개 frozen 토큰을 상태 키에 맞게 매핑한다.
4. 선택된 `legend__item`에는 `aria-pressed="true"` 부여 + `--color-focus-ring`
   기반 outline 강조 + 선택 여부를 알리는 텍스트(가시 텍스트 또는 스크린리더
   전용)를 함께 적용한다. 색상 변경만으로 선택 상태를 표시하지 않는다.
5. `id="legend-detail-panel"` + `class="legend__detail"` 영역은
   `selectedStatus`에 따라 placeholder 문구 또는 "상태명 / 의미 / 다음 행동"
   3줄 텍스트로 내용을 교체한다. 문구는 §5.2 표 값을 그대로 사용한다.
6. `id="legend-reset"` + `class="legend__reset"` 버튼은 `aria-label="범례
   초기화"`를 가지며, 클릭 시 `selectedStatus`를 `null`로 되돌리고 목록·상세
   패널을 전체 보기로 복원한다.
7. CSS 커스텀 프로퍼티로 frozen 토큰 7개(`--color-surface-card`,
   `--color-status-running/waiting/action/stalled/done`, `--space-card-gap`)와
   §2.2의 다크 테마 보조 토큰 5개만 정의한다. 신규 상태 색상 토큰을 추가하지
   않는다.
8. 480px 미만에서 `legend-status-list`를 세로 스택으로 전환하고, 320px 이상 전
   구간에서 `overflow-x`가 발생하지 않도록 텍스트 줄바꿈/카드 폭을 확인한다.
9. 상태 관리(`selectedStatus`)는 서버 API·localStorage 없이 메모리 변수로만
   유지한다(client-only, 페이지 새로고침 시 초기화됨은 정상 동작).

## 9. mockup 참조 (와이어프레임)

§0에 따라 이번 task는 별도 mockup HTML 파일을 생성하지 않는다. 아래
와이어프레임으로 시각 mockup을 대체 설명한다. 실제 실행 가능한 산출물은
`demo/agent-status-legend-canary/index.html` / `src/feature.js`
(developer, BF-1473 소유)이다.

### 9.1 전체 보기 (초기 로드 / 선택 해제 상태)

```
┌─ #legend-root (.legend) — 배경 #0f172a ───────────────────────────┐
│ ┌───────────────────┐                                            │
│ │ #legend-reset      │ ← aria-label="범례 초기화"                 │
│ │ (.legend__reset)   │                                            │
│ └───────────────────┘                                            │
│                                                                    │
│ #legend-status-list (16px gap)                                    │
│ ┌─ .legend__item ──────┐ ┌─ .legend__item ──────┐ ┌─ ... ──────┐ │
│ │ ● 실행 중 (#3b82f6)   │ │ ● 대기 중 (#eab308)   │ │ ● 조치 필요│ │
│ └───────────────────────┘ └───────────────────────┘ │(#f97316)  ││
│ ┌─ .legend__item ──────┐ ┌─ .legend__item ──────┐ └────────────┘ │
│ │ ● 정체됨 (#ef4444)    │ │ ● 완료   (#22c55e)    │                │
│ └───────────────────────┘ └───────────────────────┘                │
│                                                                    │
│ ┌─ #legend-detail-panel (.legend__detail) ────────────────────┐  │
│ │ 상태를 선택하면 의미와 다음 행동을 확인할 수 있습니다        │  │
│ └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 단일 상태 보기 (예: "조치 필요" 선택 후)

```
┌─ #legend-root (.legend) — 배경 #0f172a ───────────────────────────┐
│ ┌───────────────────┐                                            │
│ │ #legend-reset      │                                            │
│ └───────────────────┘                                            │
│                                                                    │
│ #legend-status-list                                                │
│ ┌─ .legend__item (aria-pressed="true", outline 강조) ───────────┐ │
│ │ ● 조치 필요 (#f97316)                              [선택됨]   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─ #legend-detail-panel (.legend__detail) ────────────────────┐  │
│ │ 상태명: 조치 필요                                             │  │
│ │ 의미: 운영자의 확인·승인이 필요하다                           │  │
│ │ 다음 행동: 지금 확인하고 필요한 조치를 취한다                 │  │
│ └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 320px 폭 (세로 스택)

```
┌─ .legend ─────────────┐
│ [ #legend-reset      ]│
│ ┌────────────────────┐│
│ │ ● 실행 중           ││
│ └────────────────────┘│
│ ┌────────────────────┐│
│ │ ● 대기 중           ││
│ └────────────────────┘│
│ ┌────────────────────┐│
│ │ ● 조치 필요         ││
│ └────────────────────┘│
│ ┌────────────────────┐│
│ │ ● 정체됨            ││
│ └────────────────────┘│
│ ┌────────────────────┐│
│ │ ● 완료              ││
│ └────────────────────┘│
│ ┌────────────────────┐│
│ │ #legend-detail-panel││
│ └────────────────────┘│
└────────────────────────┘
```

각 배지(●)는 색상뿐 아니라 인접 상태명 텍스트를 항상 함께 렌더링하여, 색상
인지가 어려운 환경(스크린리더·흑백 렌더링 포함)에서도 상태를 구분할 수 있게
한다.

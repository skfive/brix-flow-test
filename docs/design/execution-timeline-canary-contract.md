# 타임라인 카드 시각 명세 — execution-timeline-canary (BF-1466)

## 0. 문서 성격

본 문서는 상위 frozen Execution Blueprint(`ui-contract@v1`,
sha256:4aac10680a5ebc89b5d2e23b00f8fbfa3f3e24807d56cb8115d0906d4b89c1f8)와
planner 실행 설계(`docs/plans/execution-timeline-canary-plan.md`)의 계약을
**재정의 없이** 시각 명세 형태로 서술한다. selector·상태·token 값은 frozen
목록 그대로이며, 본 문서는 신규 색상/토큰/상태를 추가하지 않는다.

이 task(BF-1466)의 산출물 범위는 본 markdown 1개 파일이며, 별도 mockup
HTML은 생성하지 않는다(§7의 와이어프레임으로 시각 mockup을 대체 설명한다).

## 1. 시안 개요

- 대상 라우트: `/demo/execution-timeline-canary-0802`
- 진입 파일(developer 소유, frozen): `demo/execution-timeline-canary-0802/index.html`
- 성격: 정적 fixture를 읽어 표시만 하는 **읽기 전용** 타임라인 카드 캔러리. 쓰기/수정 동작 없음.
- 유일한 상호작용: `timeline-refresh` 컨트롤을 통한 재조회(re-render) 트리거.
- 사용자 경험 목표: 실행 단계(step)의 완료/진행/대기 상태를 한눈에, 그리고 색상에 의존하지 않고도(스크린리더·흑백 렌더링 포함) 식별할 수 있게 한다.

## 2. 컬러 팔레트 (frozen — 추가/재정의 금지)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-action-primary` | `#2563eb` | `timeline-refresh` 등 주요 액션 강조. 단계 상태 "진행"에도 재사용(§2.1) |
| `--space-control-gap` | `12px` | 컨트롤 사이 간격 (색상 토큰은 아니나 frozen 토큰 목록에 포함되어 함께 고정) |
| `--color-status-done` | `#16a34a` | 단계 상태 "완료" 표시 |
| `--color-status-waiting` | `#f59e0b` | 단계 상태 "대기" 표시 |

### 2.1 "진행" 상태 색상 매핑 (frozen 결정 재서술)

단계 상태 라벨은 완료/진행/대기 3종이지만, "진행"에 대응하는 전용 색상 토큰은
frozen 목록에 없다. 신규 토큰 추가가 금지되어 있으므로 `--color-action-primary`
(`#2563eb`)를 "진행" 표시 색상으로 재사용한다. designer/developer는 이 매핑을
변경하지 않는다.

| 단계 상태 | 텍스트 라벨 | 색상 토큰 |
|---|---|---|
| `done` | 완료 | `--color-status-done` (`#16a34a`) |
| `in-progress` | 진행 | `--color-action-primary` (`#2563eb`) |
| `waiting` | 대기 | `--color-status-waiting` (`#f59e0b`) |

색상은 보조 신호일 뿐이며, 모든 상태는 §5.2의 텍스트 라벨을 1차 식별 수단으로 명세한다(AC-5, §4 접근성).

## 3. 타이포그래피

frozen 계약에 별도 타이포그래피 토큰이 없으므로, `vanilla-static` 스택 규약(외부
의존성 0건, system font)에 따라 아래를 권장 기본값으로 명세한다. 이는 신규 색상/상태
토큰이 아니므로 frozen 제약과 충돌하지 않는다.

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| heading (`.timeline` 제목 영역, 있는 경우) | system-ui, -apple-system, "Segoe UI", sans-serif | 18px | 600 | 1.4 |
| body (`.timeline__card` 라벨/타임스탬프) | system-ui, -apple-system, "Segoe UI", sans-serif | 14px | 400 | 1.5 |
| caption (`#timeline-status` 안내 텍스트, 상태 배지) | system-ui, -apple-system, "Segoe UI", sans-serif | 13px | 500 | 1.4 |

## 4. 레이아웃

### 4.1 구조

```
#timeline-root (.timeline)
├─ #timeline-refresh (.timeline__refresh)   ── 새로고침 컨트롤
├─ #timeline-status (.timeline__status)     ── loading/empty/error 안내 텍스트 (ready일 때는 비표시 또는 최근 갱신 시각 등 보조 정보)
└─ .timeline__card × N                       ── steps 배열 1건당 1개, ready 상태에서만 렌더링
    ├─ 상태 배지 (완료 | 진행 | 대기, 색상 + 텍스트)
    ├─ 단계 라벨 (step.label)
    └─ 타임스탬프 (step.timestamp, 없으면 미도달 표기)
```

### 4.2 spacing / breakpoint

- 컨트롤 사이 간격: `--space-control-gap` (`12px`) — `timeline-refresh`와 인접 요소 사이.
- 320px 이상: `.timeline` 컨테이너 및 하위 `.timeline__card` 모두 content overflow 없이 표시(가로 스크롤 발생 금지).
- 480px 미만: `.timeline__card` 목록이 가로 배치가 아닌 **세로 스택**으로 전환.
- 480px 이상: `.timeline__card`는 가로 배치(행) 또는 세로 스택 중 developer가 자유롭게 구현 가능 — frozen 계약은 480px 미만 세로 스택만 강제.

## 5. 컴포넌트 명세

### 5.1 `#timeline-root` (.timeline) — 컨테이너

컴포넌트 상태는 아래 4개 중 정확히 하나.

| 상태 | 트리거 | 화면 표현 |
|---|---|---|
| `loading` | 최초 진입, 또는 `timeline-refresh` 활성화 직후 | `#timeline-status`에 로딩 텍스트, `.timeline__card` 비표시 |
| `ready` | fixture 로드 성공, steps ≥ 1 | `.timeline__card` 목록 렌더링 |
| `empty` | fixture 로드 성공, steps = 0 | `#timeline-status`에 빈 상태 안내 텍스트 |
| `error` | fixture 로드 실패 | `#timeline-status`에 오류 안내 텍스트, `timeline-refresh`로 재시도 가능 |

불변식: 초기화·취소·실패 이후에는 상태와 진행 표시가 초기값(대기 가능 상태 또는
최근 `ready`/`empty`/`error` 중 하나)으로 되돌아가고, `timeline-refresh` 컨트롤은
다시 사용 가능해야 한다.

### 5.2 `.timeline__card` — 단계 카드

| 필드 | 소스 | 표현 |
|---|---|---|
| 상태 배지 | `step.status` | 색상(§2.1) + 텍스트 라벨(완료/진행/대기) 동시 표시. 색상만으로 구분 금지 |
| 단계명 | `step.label` | body 타이포 |
| 타임스탬프 | `step.timestamp` (ISO 8601, 미도달 시 null) | null이면 "미도달" 등 텍스트로 표시(값 없음을 빈 칸으로 남기지 않음) |

`status` → 라벨 매핑(frozen): `done` → "완료", `in-progress` → "진행", `waiting` → "대기".

### 5.3 `#timeline-refresh` (.timeline__refresh) — 새로고침 컨트롤

| 속성/상태 | 명세 |
|---|---|
| `aria-label` | `"타임라인 새로고침"` (frozen, 변경 금지) |
| 키보드 | Enter/Space로 활성화 가능 |
| 시각 강조 | `--color-action-primary` (`#2563eb`) |
| 동작 | 클릭 또는 키보드 활성화 시 컨테이너를 `loading`으로 전이 후 fixture 재조회 → `ready`/`empty`/`error` 중 하나로 재전이 |
| 연타 처리 | loading 도중 재활성화 시, 진행 중인 로딩을 취소하고 새 로딩으로 대체하거나 진행 중 컨트롤을 일시 비활성화 — 어느 방식이든 최종적으로 컨트롤은 재사용 가능해야 함 |

### 5.4 `#timeline-status` (.timeline__status) — 상태 안내 텍스트

| 컨테이너 상태 | 노출 텍스트 성격 |
|---|---|
| `loading` | 로딩 중임을 알리는 안내 텍스트 |
| `empty` | steps가 0건임을 알리는 안내 텍스트 |
| `error` | 조회 실패를 알리는 안내 텍스트(재시도 가능함을 함께 안내 권장) |
| `ready` | 비표시 또는 보조 정보(예: `updatedAt` 기반 최근 갱신 시각) — frozen 계약 범위 밖이므로 developer 재량 |

## 6. 접근성 (frozen)

- `timeline-refresh`는 `aria-label="타임라인 새로고침"`을 가진다.
- 각 단계 상태는 색상 외에 명시적 텍스트 라벨(완료/진행/대기)로도 표시한다.
- `timeline-refresh`는 키보드 Enter/Space로 활성화 가능하다.
- 모든 상태(컨테이너 loading/ready/empty/error, 단계별 완료/진행/대기)는 색상만으로
  구분하지 않고 상태명을 화면 텍스트와 접근성 이름(accessible name)으로 노출한다.

## 7. 시각 mockup 설명 (와이어프레임)

별도 mockup HTML 파일은 이번 task 산출물 범위(§0)에 포함되지 않으므로, 아래
와이어프레임으로 시각 구조를 대체 설명한다.

### 7.1 `ready` 상태 (480px 이상, 가로 배치 예시)

```
┌─ #timeline-root (.timeline) ───────────────────────────────┐
│ ┌──────────────────────┐        [12px gap]                 │
│ │ #timeline-refresh     │ ← aria-label="타임라인 새로고침"  │
│ │ (.timeline__refresh)  │   배경/테두리 #2563eb              │
│ └──────────────────────┘                                    │
│                                                              │
│ ┌─ .timeline__card ───┐ ┌─ .timeline__card ───┐ ┌─ ... ──┐ │
│ │ ● 완료  (#16a34a)    │ │ ● 진행  (#2563eb)    │ │ ● 대기 │ │
│ │ 단계명: 요청 접수     │ │ 단계명: 검수 진행     │ │(#f59e0b)│ │
│ │ 2026-08-01T09:00Z    │ │ 2026-08-01T09:12Z    │ │ 미도달  │ │
│ └──────────────────────┘ └──────────────────────┘ └────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 480px 미만 (세로 스택)

```
┌─ .timeline ──────────────┐
│ [ #timeline-refresh    ] │
│ ┌───────────────────────┐│
│ │ ● 완료  단계명  시각    ││
│ └───────────────────────┘│
│ ┌───────────────────────┐│
│ │ ● 진행  단계명  시각    ││
│ └───────────────────────┘│
│ ┌───────────────────────┐│
│ │ ● 대기  단계명  미도달  ││
│ └───────────────────────┘│
└───────────────────────────┘
```

### 7.3 `loading` / `empty` / `error` 상태

```
┌─ .timeline ──────────────┐
│ [ #timeline-refresh    ] │
│ ┌───────────────────────┐│
│ │ #timeline-status       ││
│ │ (loading: "불러오는 중")││
│ │ (empty: "표시할 단계가 ││
│ │   없습니다")            ││
│ │ (error: "불러오지 못했 ││
│ │   습니다. 새로고침을    ││
│ │   시도하세요")          ││
│ └───────────────────────┘│
│  .timeline__card 목록 없음│
└───────────────────────────┘
```

각 상태 배지(●)는 색상뿐 아니라 인접 텍스트 라벨(완료/진행/대기)을 항상 함께
렌더링하여, 색상 인지가 어려운 환경에서도 상태를 구분할 수 있게 한다.

## 8. dev 구현 가이드

1. 컨테이너 루트는 `id="timeline-root"` + `class="timeline"`으로 마크업한다.
2. 새로고침 컨트롤은 `id="timeline-refresh"` + `class="timeline__refresh"`,
   `aria-label="타임라인 새로고침"`을 가지며 네이티브 `<button>` 사용을 권장한다(키보드
   Enter/Space 기본 지원).
3. 상태 안내 영역은 `id="timeline-status"` + `class="timeline__status"`로 마크업하고,
   컨테이너 상태(loading/empty/error)에 따라 텍스트 내용을 교체한다. `ready`일 때는
   비표시하거나 보조 정보만 노출한다.
4. 각 단계는 `class="timeline__card"`로 렌더링하고, 상태 배지는 색상 스타일과
   함께 "완료"/"진행"/"대기" 텍스트 노드(또는 접근성 이름)를 반드시 포함한다.
5. CSS 커스텀 프로퍼티로 `--color-action-primary`, `--space-control-gap`,
   `--color-status-done`, `--color-status-waiting` 4개만 정의한다. "진행" 상태
   색상은 별도 변수를 새로 만들지 말고 `--color-action-primary`를 그대로 참조한다.
6. 480px 미만 미디어쿼리에서 `.timeline__card` 목록을 세로 스택(`flex-direction: column`
   등)으로 전환하고, 320px 이상 전 구간에서 `overflow-x`가 발생하지 않도록 폭 계산을
   확인한다.
7. `timeline-refresh` 재클릭/재입력에 대해 로딩 중 상태를 관리하는 플래그(또는
   `disabled` 토글)를 두어, 연타 시에도 최종적으로 컨트롤이 재사용 가능한 상태로
   복귀하도록 구현한다(§5.1 불변식).
8. fixture 스키마(`steps[].id/label/status/timestamp`, `updatedAt`)는
   `docs/plans/execution-timeline-canary-plan.md` §4를 그대로 따르며, `status`가
   스키마 외 값일 경우의 fallback은 본 문서 범위 밖이다(developer 구현 재량,
   단 신규 상태/토큰 추가 금지 원칙은 유지).

## 9. mockup 참조

이번 task는 별도 mockup HTML 파일을 생성하지 않는다(§0, §7 참조). 시각 mockup은
본 문서 §7의 와이어프레임으로 대체하며, 실제 실행 가능한 산출물은
`demo/execution-timeline-canary-0802/index.html` / `src/feature.js`(developer,
BF-1467 소유)이다.

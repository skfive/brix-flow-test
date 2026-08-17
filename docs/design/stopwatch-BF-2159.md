# 스톱워치 UI 시안 — BF-2160

> 본 문서는 `docs/plans/BF-2159/implementation-plan.md`(frozen ui-contract@v1)를 재정의하지 않고, 그 안에 정의된 DOM ID/class/상태/토큰/접근성/반응형 계약을 시각 명세로 그대로 옮긴 것이다.

## 1. 시안 개요

- 대상 모듈: `stopwatch`
- 변경 범위: 스톱워치 표시부 + 컨트롤(시작/일시정지/재개, 리셋, 랩) + 랩 목록(최단/최장 강조) 레이아웃·컬러·타이포 시안
- 사용자 경험 목표
  - 현재 상태(`idle`/`running`/`paused`)를 색상에만 의존하지 않고 텍스트로도 즉시 인지할 수 있게 한다.
  - 랩 목록에서 최단랩·최장랩을 색상 + 텍스트 라벨로 함께 구분해 스캔하기 쉽게 한다.
  - 320px 이상 모든 뷰포트에서 컨트롤과 랩 목록이 가로 overflow 없이 동작한다.

## 2. 컬러 팔레트

frozen 디자인 토큰(§4.5)을 그대로 사용한다. 신규 토큰 추가·재정의 없음.

| 역할 | 토큰 | HEX |
|---|---|---|
| Background | `--color-bg` | `#101418` |
| Surface (카드/컨트롤 배경) | `--color-surface` | `#1b2129` |
| Text | `--color-text` | `#f5f7fa` |
| Accent (주 버튼, running 상태 강조) | `--color-accent` | `#4f9dff` |
| 최단랩 강조 | `--color-fastest` | `#34d399` |
| 최장랩 강조 | `--color-slowest` | `#f87171` |

## 3. 타이포그래피

- font-family: `--font-family-base` = `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (system font, 외부 폰트 로드 금지)
- Display(경과시간, `stopwatch-display`): 48px / weight 600 / line-height 1.1 / tabular 숫자 정렬感을 위해 `font-variant-numeric: tabular-nums`
- Heading(상태 텍스트): 14px / weight 600 / line-height 1.4 / letter-spacing 0.02em / uppercase
- Body(버튼 라벨): 16px / weight 500 / line-height 1.2
- Caption(랩 목록 항목, 최단/최장 라벨): 13px / weight 400(랩 시간) · 600(최단/최장 라벨) / line-height 1.5

## 4. 레이아웃

### 4.1 섹션 구조
```
.stopwatch (카드, --color-surface 배경)
├── 상태 텍스트 (idle/running/paused 텍스트 노출)
├── .stopwatch__display  (#stopwatch-display)
├── .stopwatch__controls (#stopwatch-start, #stopwatch-pause, #stopwatch-reset, #stopwatch-lap)
└── .stopwatch__lap-list (#stopwatch-lap-list)
    └── .stopwatch__lap-item (× N, 최단랩/최장랩에 lap--fastest / lap--slowest)
```

### 4.2 Spacing / breakpoint
- 카드 내부 패딩: 24px (320px 근접 시 16px로 축소)
- 컨트롤 버튼 사이 간격: `--space-control-gap` = `12px`
- 320px 이상: 컨트롤 버튼은 flex-wrap으로 가로 배치, 넘치면 줄바꿈(overflow 없음)
- 랩 목록(`stopwatch__lap-list`)은 최대 높이를 두고 세로 스크롤(`overflow-y: auto`)로 대체 — 가로 스크롤 금지
- 480px 이상: 컨트롤 버튼 한 줄 배치 여유 있음. 320~479px: 버튼이 2줄로 자동 wrap

## 5. 컴포넌트 명세

### 5.1 상태 텍스트
- 역할: 색상만으로 상태를 구분하지 않기 위한 텍스트 노출(§4.6 접근성)
- 표시 값: "대기 중"(idle) / "측정 중"(running) / "일시정지"(paused)
- 상태 변경 시 텍스트도 함께 갱신(정적 mockup에서는 3개 상태를 별도 섹션으로 나열)

### 5.2 `#stopwatch-display` (`.stopwatch__display`)
- 표시 형식: `MM:SS.CC` (분:초.센티초), 초기값 `00:00.00`
- props/상태: 텍스트 콘텐츠만 변경, 시각 스타일은 상태에 따라 변하지 않음(강조는 accent 컬러로 테두리/배경에 미세 적용 가능하되 색상 단독 상태 구분 금지 원칙 유지)

### 5.3 컨트롤 버튼 (`.stopwatch__controls`)
| 요소 | id | 라벨(상태별) | aria-label(상태별) |
|---|---|---|---|
| 시작/재개 | `stopwatch-start` | idle: "시작" / paused: "재개" | idle: "시작" / paused: "재개" |
| 일시정지 | `stopwatch-pause` | "일시정지" | "일시정지" |
| 리셋 | `stopwatch-reset` | "리셋" | "리셋" |
| 랩 | `stopwatch-lap` | "랩" | "랩" |

- 활성 규칙은 implementation-plan.md §3을 그대로 따른다(재정의 없음). mockup에서는 idle/running/paused 3개 상태 섹션을 각각 렌더링해 버튼 활성/비활성 조합을 시각적으로 보여준다.
- 비활성 버튼: `disabled` 속성 + 낮은 opacity(0.4) 스타일. `stopwatch-lap`은 idle/paused에서 `aria-disabled="true"`도 함께 표기.
- 시각 스타일: 주 액션(시작/재개, 활성 시)은 `--color-accent` 배경, 나머지는 `--color-surface` 배경 + 1px 보더.

### 5.4 랩 목록 (`.stopwatch__lap-list` / `.stopwatch__lap-item`)
- 각 항목: 랩 번호 + 랩 시간(`MM:SS.CC`)
- 랩 2개 이상일 때만 최단/최장 배지 적용(§6 edge case)
- 최단랩: `.lap--fastest` 클래스 → `--color-fastest` 강조(좌측 accent bar 또는 텍스트 컬러) + "최단랩" 텍스트 라벨
- 최장랩: `.lap--slowest` 클래스 → `--color-slowest` 강조 + "최장랩" 텍스트 라벨
- 랩이 1개 이하: 배지/라벨 없음 (mockup에 해당 케이스도 별도 예시로 표시)
- 목록이 카드 높이를 넘으면 세로 스크롤

## 6. dev 구현 가이드 (dev-1 대상)

- CSS 변수는 mockup의 `:root`에 정의된 값을 그대로 `stopwatch/style.css`의 `:root`에 옮겨 사용한다(토큰명 동일 유지: `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-fastest`, `--color-slowest`, `--font-family-base`, `--space-control-gap`).
- 클래스명: `stopwatch`, `stopwatch__display`, `stopwatch__controls`, `stopwatch__lap-list`, `stopwatch__lap-item`, `lap--fastest`, `lap--slowest` — 변경 금지.
- DOM ID: `stopwatch-display`, `stopwatch-start`, `stopwatch-pause`, `stopwatch-reset`, `stopwatch-lap`, `stopwatch-lap-list` — 변경 금지.
- 상태 텍스트 요소는 mockup의 `.stopwatch__status`처럼 별도 텍스트 노드로 두고, JS에서 상태 전이마다 textContent를 갱신하는 방식을 권장(색상만으로 상태 구분 금지 원칙 충족).
- 버튼 라벨/aria-label 전환(시작 ↔ 재개)은 텍스트 노드 + aria-label 속성을 함께 갱신.
- 랩 최단/최장 계산은 랩 배열에서 매 랩 추가 시 재계산하여 해당 `.stopwatch__lap-item`에만 `lap--fastest`/`lap--slowest` 클래스를 토글(이전 최단/최장 항목의 클래스 제거 필요).
- 반응형은 mockup의 `@media (max-width: 479px)` 규칙(버튼 wrap, 패딩 축소)을 참고해 구현.

## 7. mockup 참조

- 시각 mockup: `docs/design/stopwatch-BF-2159-mockup.html`
- mockup은 idle/running(랩 2개 이상, 최단·최장 포함)/paused 3개 상태를 각각의 `<section>`으로 나열하여 상태별 버튼 활성/비활성과 랩 강조 표현을 한 화면에서 비교할 수 있도록 구성했다.

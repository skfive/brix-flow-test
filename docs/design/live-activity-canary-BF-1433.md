# 실시간 활동 스트림 카나리 — 시각 명세 (BF-1434)

> 이 문서는 `docs/plans/live-activity-canary-BF-1433.md`에서 planner가 동결한 UI 계약(파일 경로, DOM ID/class, 상태 텍스트, 토큰, 접근성, 반응형)을 **재정의 없이** 시각적으로 구현한 명세다. DOM ID/class/상태 텍스트/토큰 값은 frozen 원본과 동일하며, 이 문서에서 새로 정의하지 않는다.

## 1. 시안 개요

- **변경 범위**: `demo/live-activity-canary` 카나리 페이지 — 에이전트가 tool을 실행하는 동안의 활동 로그(activity list)와 진행률(token progress)을 idle → streaming → complete/error 4개 상태로 시각화한다.
- **사용자 경험 목표**:
  - 운영자가 현재 실행 단계(대기/진행/완료/실패)를 화면 텍스트만으로 즉시 판별할 수 있어야 한다(색상 의존 금지).
  - streaming 중 새 tool 활동이 추가될 때 시각적으로 목록이 자연스럽게 늘어나며, 진행률 바가 활동 수신과 동기화되어 갱신되는 느낌을 준다.
  - 실패 시 재시도 진입점(`activity-retry`)이 명확히 눈에 띄고, 재시도 후에는 idle 초기값으로 화면이 즉시 리셋된 것처럼 보여야 한다.
- 본 문서는 시안 시각화만 다루며, DOM/class/상태 텍스트/토큰/접근성/반응형 계약은 재정의하지 않고 `docs/plans/live-activity-canary-BF-1433.md` 5장을 그대로 따른다.

## 2. 컬러 팔레트

frozen 토큰(계약 5.4)을 그대로 사용한다. 추가 색상은 배경/표면/텍스트 등 계약에 없는 보조 용도로만 최소 정의한다.

| 역할 | 값 | 용도 |
|---|---|---|
| primary / accent | `--color-activity-accent: #2563eb` | streaming 진행 상태 강조, `token-progress__bar` 채움색, primary 실행 control |
| error | `--color-activity-error: #dc2626` | `activity-status--error` 텍스트/보더, `activity-retry` control 강조 |
| background | `#f8fafc` (보조 정의) | 카나리 페이지 배경 |
| surface | `#ffffff` (보조 정의) | `activity-stream` 카드 배경 |
| text primary | `#0f172a` (보조 정의) | 본문/상태 텍스트 기본색 |
| text muted | `#64748b` (보조 정의) | 타임스탬프, 보조 라벨 |
| border | `#e2e8f0` (보조 정의) | 카드/아이템 구분선 |

- 색상은 상태 판별의 유일한 수단이 되지 않는다 — 모든 상태는 `activity-status` 텍스트로 함께 노출한다(계약 5.3, 5.5).

## 3. 타이포그래피

시스템 폰트 스택 사용(vanilla-static, 외부 의존성 0건 원칙).

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| heading (`activity-stream` 제목) | system-ui, -apple-system, "Segoe UI", sans-serif | 18px | 600 | 1.4 |
| body (`activity-status`, `activity-stream__item`) | 위와 동일 | 14px | 400 | 1.5 |
| caption (타임스탬프, `token-progress` 라벨) | 위와 동일 | 12px | 500 | 1.4 |

## 4. 레이아웃

- **섹션 구조** (상단 → 하단): 제목 → `activity-status`(상태 텍스트 + `activity-retry` control) → `token-progress`(진행률) → `activity-list`(활동 로그).
- **spacing**: 섹션 간 간격은 계약 토큰 `--space-activity-gap: 12px`를 기본 gap 단위로 사용한다.
- **breakpoint 동작** (계약 5.6):
  - 320px 이상: `activity-stream` 콘텐츠는 overflow 없이 카드 폭 안에 감싸진다(긴 활동 텍스트는 줄바꿈).
  - 480px 미만: `token-progress`와 `activity-list`가 세로 스택(위→아래)으로 배치된다.
  - 480px 이상: `token-progress`와 `activity-list`를 좌우 2열로 배치 가능(선택적 시각 여유 레이아웃, 계약이 강제하지 않는 범위의 향상).

## 5. 컴포넌트 명세

계약(5.1, 5.2)의 DOM ID/class를 그대로 사용한다 — 아래는 각 요소의 props/상태/인터랙션 정의다.

### 5.1 `#activity-stream-root` (`.activity-stream`)
- **역할**: 카나리 전체 컨테이너.
- **접근성**: `aria-live="polite"` — `activity-list`에 새 항목이 추가될 때 스크린리더에 알림(계약 5.5).
- **상태**: 자체 상태 없음, 하위 요소 상태를 감싸는 wrapper.

### 5.2 `#activity-status`
- **역할**: 현재 상태 텍스트 표시.
- **상태별 텍스트** (재정의 금지, 계약 5.3 원문 그대로):
  | 상태 | 텍스트 |
  |---|---|
  | idle | "대기 중" |
  | streaming | "실행 중 — tool 활동 수신" |
  | complete | "완료" |
  | error | "실패 — 다시 시도" |
- **modifier**: error 상태에서만 `.activity-status--error` class 적용(텍스트 색상 `--color-activity-error`, 좌측 보더 강조).
- **인터랙션**: 표시 전용, 클릭 불가.

### 5.3 `#token-progress` (`.token-progress`)
- **역할**: 진행률 표시 컨테이너.
- **접근성**: `role="progressbar"`, `aria-valuenow`가 진행률 갱신마다 시각적 폭과 동기화(계약 5.5, 8절 edge case).
- **상태별 값**:
  | 상태 | `aria-valuenow` / 시각 폭 |
  |---|---|
  | idle | 0% |
  | streaming | 실시간 갱신(0~100 사이) |
  | complete | 100% |
  | error | 직전 값 유지 |
- **하위 요소**: `.token-progress__bar` — 채움 바, 폭은 `aria-valuenow`와 항상 일치.

### 5.4 `#activity-list` (`.activity-stream__item`을 자식으로 가짐)
- **역할**: tool 활동 로그 목록.
- **상태**: streaming 중 항목이 순차적으로 append. idle에서는 빈 상태 placeholder 텍스트(예: "아직 활동이 없습니다") 표시 가능(계약이 강제하지 않는 시각 보완).
- **`.activity-stream__item` 구성**: 활동 라벨(예: "tool: search 실행") + 타임스탬프(caption 스타일).
- **인터랙션**: 표시 전용 목록, 스크롤 가능.

### 5.5 `#activity-retry`
- **역할**: 재시도 control.
- **상태**: error 상태에서만 활성화되어 노출(계약 5.3, 8절). idle/streaming/complete에서는 비활성 또는 숨김.
- **접근성**: 명시적 `aria-label`(예: `aria-label="활동 스트림 다시 시도"`) 필수(계약 5.5).
- **인터랙션**: 클릭 시 상태/`token-progress`가 idle 초기값으로 리셋된 뒤 streaming 재개(계약 6장 상태 전이, AC5).

### 5.6 주 실행 control (계약에 명시된 "스트림을 다시 시작하는 주 실행 control")
- **역할**: idle 상태에서 streaming을 시작하는 primary 버튼. 초기화·취소·실패 이후 즉시 재사용 가능해야 한다(계약 5.3 하단 유의사항, AC5).
- **시각**: `--color-activity-accent` 배경의 primary 버튼 스타일.

## 6. dev 구현 가이드

- 아래 CSS 변수명을 `demo/live-activity-canary/index.html` 또는 `src/feature.js`가 주입하는 스타일에서 그대로 사용 권장(계약 5.4 값과 동일, 재정의 금지):
  ```css
  :root {
    --color-activity-accent: #2563eb;
    --color-activity-error: #dc2626;
    --space-activity-gap: 12px;
  }
  ```
- 클래스명은 계약 5.2 그대로 사용: `.activity-stream`, `.activity-stream__item`, `.token-progress`, `.token-progress__bar`, `.activity-status--error`.
- `#token-progress`의 `aria-valuenow` 갱신 로직과 `.token-progress__bar`의 width 스타일 갱신 로직은 반드시 같은 값 소스에서 동시에 갱신해(8절 edge case) 값이 어긋나지 않도록 한다.
- `#activity-retry`는 error 상태 진입 시에만 `disabled` 속성을 제거/`hidden` 해제하고, 클릭 핸들러에서 idle 리셋 → streaming 재개 순서를 따른다(계약 6장).
- 480px 미만 세로 스택 전환은 미디어쿼리로 `.token-progress`와 `#activity-list`를 감싸는 컨테이너의 `flex-direction`을 `row → column`으로 전환하는 방식을 권장(본 mockup의 `<style>` 참고).
- 본 명세는 시각/구조 가이드이며 dev는 픽셀 단위로 mockup과 일치시킬 의무가 없다(1차 산출물 markdown + 2차 mockup 모두 참조용).

## 7. mockup 참조

시각 mockup 파일: [`docs/design/mockups/live-activity-canary-BF-1433.html`](mockups/live-activity-canary-BF-1433.html)

- idle / streaming / complete / error 4개 상태를 각각 별도 `<section>`으로 정적 시뮬레이션했다.
- `token-progress` 진행 표시(0% / 진행 중 / 100% / 직전 값 유지)를 상태별로 시각 표현했다.
- placeholder 활동 로그 텍스트를 포함한다(예: "tool: search 실행").

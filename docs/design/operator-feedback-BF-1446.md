# 피드백 카드 시각 명세 — BF-1448 (operator-feedback)

> 이 문서는 `docs/plans/operator-feedback-BF-1446.md`에 동결된 `ui-contract@v1`(sha256:51af5d40...)의 selector·상태·token·접근성·반응형 계약을 그대로 시각화한다. 새로운 selector/class/token/상태를 추가하거나 재정의하지 않는다.

## 1. 시안 개요

- **변경 범위**: BF-1446에서 동결된 피드백 카드 UI 계약(idle → confirming → submitting → success | warning | failure)을 색상·타이포·레이아웃으로 구체화.
- **사용자 경험 목표**: 운영자가 확인 → 제출 흐름을 진행하는 동안 현재 상태를 색상과 화면 텍스트로 동시에 인지하고, 스크린리더 사용자도 `aria-live` 영역을 통해 동일한 정보를 즉시 받을 수 있도록 한다.
- **범위 제한**: 이 문서와 mockup은 정적 시각 자료이며 런타임 HTML/CSS/JS를 생성하지 않는다. 실제 구현은 developer(`phase21-validation/operator-feedback/`)가 담당한다.

## 2. 컬러 팔레트

### Frozen token (변경 금지 — `docs/plans/operator-feedback-BF-1446.md` 원문 그대로)

| 용도 | CSS 변수 | HEX |
|---|---|---|
| 주요 액션 (확인/제출 버튼) | `--color-action-primary` | `#2563eb` |
| 성공 상태 | `--color-status-success` | `#16a34a` |
| 경고 상태 | `--color-status-warning` | `#d97706` |
| 실패 상태 | `--color-status-failure` | `#dc2626` |

### 보조 컬러 (designer 추가 — frozen 계약 아님, 배경/텍스트 참고용)

| 용도 | HEX | 비고 |
|---|---|---|
| 카드 배경 | `#ffffff` | |
| 카드 테두리 | `#e2e8f0` | |
| 본문 텍스트 | `#1e293b` | |
| 보조/캡션 텍스트 | `#64748b` | idle 안내, 캡션 |
| 페이지 배경 (mockup 전용) | `#f8fafc` | |
| 비활성 버튼 배경 | `#e2e8f0` | disabled 상태 |
| 비활성 버튼 텍스트 | `#94a3b8` | disabled 상태 |

## 3. 타이포그래피

vanilla-static 규약에 따라 system font stack만 사용한다 (외부 폰트 의존성 0건).

- font-family: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", sans-serif`
- **heading** (카드 타이틀 등 부가 콘텐츠): 16px / weight 600 / line-height 1.4
- **body** (`.feedback-card__message`): 14px / weight 400 / line-height 1.5
- **status 강조** (`.feedback-card__status` 내부 텍스트): 14px / weight 600 / line-height 1.4 — 색상뿐 아니라 굵기로도 상태를 강조해 색맹 사용자 인지를 보완
- **caption** (보조 안내, 프레임 라벨 등): 12px / weight 400 / line-height 1.4 / color `#64748b`

## 4. 레이아웃

- `.feedback-card`: 카드 컨테이너 — `max-width: 360px`, `padding: 16px`, `border-radius: 8px`, `border: 1px solid #e2e8f0`, `background: #ffffff`, `box-sizing: border-box`
- 카드 내부 요소 간 간격: `--space-card-gap: 12px` (frozen token) — 카드 자식 요소(제목/actions/status) 사이 gap과 `.feedback-card__actions` 내부 버튼 사이 gap에 동일하게 적용
- `.feedback-card__actions`: flex 컨테이너
  - **≥480px**: `flex-direction: row` — 버튼 가로 배치
  - **<480px**: `flex-direction: column` — 버튼 세로 스택 (frozen 반응형 계약), 각 버튼 `width: 100%`
- **320px 이상에서 overflow 방지**: `box-sizing: border-box` + `word-break: keep-all`(한국어 줄바꿈 고려) + 버튼/카드 모두 퍼센트 기반 폭 사용
- `#feedback-status-live` 위치: `.feedback-card__actions` 바로 아래, 카드 하단 — 시각적 위치와 스크린리더 발화 순서(버튼 조작 직후 상태 안내)를 일치시킨다.

### Breakpoint 표

| 뷰포트 | `.feedback-card__actions` 방향 | 카드 폭 |
|---|---|---|
| 320px–479px | column (세로 스택) | 100% (여백 고려 최대 328px) |
| ≥480px | row (가로 배치) | max-width 360px |

## 5. 컴포넌트 명세

### `#feedback-card-root` (`.feedback-card`)

- 카드 루트 컨테이너. idle/confirming/submitting/success/warning/failure 6개 상태를 자식 요소의 텍스트·활성 여부로 표현한다.
- 루트 자체에는 상태별 modifier class를 새로 추가하지 않는다 (frozen — 계약에 없는 class 임의 추가 금지).

### `#feedback-confirm-btn`

| 상태 | 활성/비활성 | 표시 텍스트 | 색상 |
|---|---|---|---|
| idle | 활성 | "확인" | `--color-action-primary` 배경, 흰 텍스트 |
| confirming | 비활성 | "확인" | 비활성 배경 `#e2e8f0`, 텍스트 `#94a3b8` |
| submitting | 비활성 | "확인" | 비활성 배경 `#e2e8f0`, 텍스트 `#94a3b8` |
| success / warning / failure | 활성(초기화됨) | "확인" | `--color-action-primary` 배경, 흰 텍스트 |

- `aria-label="피드백 확인"` (명시적, frozen)

### `#feedback-submit-btn`

| 상태 | 활성/비활성 | 표시 텍스트 | 색상 |
|---|---|---|---|
| idle | 비활성(숨김 또는 disabled) | "제출" | 표시 안 함 또는 비활성 배경 |
| confirming | 활성 | "제출" | `--color-action-primary` 배경, 흰 텍스트 |
| submitting | 비활성(진행 표시) | "제출 중..." | 비활성 배경 + 진행 인디케이터 |
| success / warning / failure | 비활성 | "제출" | 비활성 배경 `#e2e8f0`, 텍스트 `#94a3b8` |

- `aria-label="피드백 제출"` (명시적, frozen)

### `#feedback-status-live` (`.feedback-card__status` > `.feedback-card__message`)

- `aria-live="polite"` (frozen)
- 상태별 정확 문구 및 색상 (exact — 재문구화 금지):

| 상태 | 화면 텍스트 (exact) | 텍스트 색상 |
|---|---|---|
| idle | "피드백을 확인해 주세요" (또는 비어있음) | 보조 텍스트 `#64748b` |
| confirming | "확인됨 — 제출을 눌러주세요" | 본문 텍스트 `#1e293b` |
| submitting | "제출 중..." | 본문 텍스트 `#1e293b` |
| success | "성공: 처리 완료" | `--color-status-success` (`#16a34a`) |
| warning | "경고: 확인이 필요합니다" | `--color-status-warning` (`#d97706`) |
| failure | "실패: 다시 시도해주세요" | `--color-status-failure` (`#dc2626`) |

- 색상만으로 상태를 구분하지 않는다 — 상태명이 텍스트에 포함되어 색맹 사용자도 텍스트로 상태를 인지할 수 있다 (frozen 접근성 계약).

## 6. dev 구현 가이드

1. selector·class·token 이름은 위 표와 완전히 동일하게 사용한다 — 재정의·리네이밍 금지 (frozen).
2. `:root`에 아래 CSS 변수를 그대로 선언:
   ```css
   :root {
     --color-action-primary: #2563eb;
     --color-status-success: #16a34a;
     --color-status-warning: #d97706;
     --color-status-failure: #dc2626;
     --space-card-gap: 12px;
   }
   ```
3. `.feedback-card__actions`의 방향 전환은 `@media (max-width: 479px) { flex-direction: column; }` 기준으로 구현한다 (mockup과 동일 breakpoint).
4. `#feedback-status-live`는 상태 전이마다 `textContent`를 위 표의 exact 문구로 교체한다. 색상은 `.feedback-card__message` 내부에서 상태별 CSS 변수를 적용하되, 계약에 없는 새 modifier class가 필요하면 구현 전 reviewer와 사전 협의한다 (계약에 없는 class 임의 추가는 계약 위반 소지).
5. 취소/실패 뒤에는 `#feedback-confirm-btn`을 다시 focus 가능한 활성 상태로 되돌린다 (frozen 후조건).
6. 키보드 전용 흐름을 보장한다 — Tab으로 confirm → submit 이동, Enter/Space로 클릭과 동일하게 동작.

## 7. mockup 참조

- 파일: `docs/design/operator-feedback-mockup.html`
- 위 6개 상태의 화면 텍스트·색상 token을 정적으로 시각화하고, 320px/480px 반응형 동작(`.feedback-card__actions` 스택 여부)과 `#feedback-status-live` 배치 위치를 함께 표현한다.
- 이 mockup은 dev의 실제 산출물이 아니며 참조 가이드로만 사용한다. 픽셀 단위 일치 의무는 없다.

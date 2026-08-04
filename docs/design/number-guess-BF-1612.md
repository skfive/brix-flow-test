# 숫자 맞히기 게임 — UI 시안 명세 (BF-1612)

> designer: 이디자인 · task: BF-1613 · frozen contract: `ui-contract@v1`
>
> 본 명세는 planner가 동결한 UI 계약(`docs/plans/number-guess-plan-BF-1612.md` §3)의
> **selector·design token·상태·접근성·반응형 값을 그대로 시각화**한 것입니다.
> designer는 selector와 token을 **변경하거나 재정의하지 않으며**, frozen blueprint가
> 유일한 권위입니다. 아래 색·간격·클래스·ID·상태명은 모두 동결 계약값입니다.

---

## 1. 시안 개요

- **변경 범위**: 1~100 비밀 숫자를 맞히는 단일 플레이어 게임 카드 1개 화면.
  숫자 입력 → 제출 → "더 높게 / 더 낮게 / 정답" 피드백 → 시도 횟수·best score 표시 → 새 게임.
- **사용자 경험 목표**
  - 한 화면에서 입력·제출·피드백·통계·새 게임이 한눈에 들어오는 세로 카드 레이아웃.
  - 상태 변화(higher/lower/win)를 **색과 텍스트 라벨 두 채널**로 동시에 전달 —
    색각 이상·스크린리더 사용자도 상태를 텍스트로 인지.
  - 320px 뷰포트에서도 overflow 없이 중앙 정렬된 카드로 표시.
- **stack 규약**: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의.

---

## 2. 컬러 팔레트

### 2.1 동결 토큰 (ui-contract@v1 — 값 변경 금지)

| 토큰 | 값 (HEX) | 용도 |
| --- | --- | --- |
| `--color-action-primary` | `#2563eb` | 주 실행 컨트롤(제출 버튼) 배경색 |
| `--color-feedback-higher` | `#f59e0b` | `higher` 상태("더 높게") 피드백 강조색 |
| `--color-feedback-lower` | `#3b82f6` | `lower` 상태("더 낮게") 피드백 강조색 |
| `--color-feedback-win` | `#16a34a` | `win` 상태("정답") 피드백 강조색 |
| `--space-control-gap` | `12px` | 컨트롤 간 간격 (color 아닌 spacing 토큰) |

### 2.2 보조 색 (시안 표현용 — dev 참고, 값은 재량)

동결 토큰만으로 카드 배경·경계·텍스트를 다 표현할 수 없어 아래 중립색을 mockup에서 보조로 씁니다.
**dev는 아래 값을 강제받지 않으며**, 동결 토큰만 고정 준수하면 됩니다.

| 이름 | 값 | 용도 |
| --- | --- | --- |
| 페이지 배경 | `#f1f5f9` | body 배경 |
| 카드 표면 | `#ffffff` | `game` 카드 배경 |
| 본문 텍스트 | `#0f172a` | 기본 텍스트 |
| 보조 텍스트 | `#64748b` | 라벨·caption |
| 경계선 | `#e2e8f0` | 입력·카드 border |

---

## 3. 타이포그래피

system font stack 사용 (외부 웹폰트 0건):
`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`

| 역할 | font-size | font-weight | line-height |
| --- | --- | --- | --- |
| heading (게임 제목) | `1.5rem` (24px) | 700 | 1.25 |
| body / 피드백 텍스트 | `1rem` (16px) | 500 | 1.4~1.5 |
| stat 값 | `1.25rem` (20px) | 700 | 1.2 |
| caption / 라벨 | `0.8125rem` (13px) | 600 | 1.4 |

기준 크기 `16px`, 상대 단위(rem) 사용으로 사용자 확대 대응.

---

## 4. 레이아웃

### 4.1 섹션 구조 (세로 카드)

```
┌──────────────── .game (max-width 420px, 중앙) ────────────────┐
│  헤더: 제목 + 안내문                                            │
│  .game__stats  : [ 시도 attempts ] [ best-score ]  (가로 2분할) │
│  입력행        : [ .game__input #guess-input ] [ 제출 버튼 ]     │
│  .game__feedback #feedback : [상태 라벨] + [피드백 텍스트]        │
│  [ 새 게임 버튼 #new-game-btn ]                                  │
└───────────────────────────────────────────────────────────────┘
```

### 4.2 spacing

- 카드 내부 요소 세로 간격: `16px`
- stat·입력·제출 등 **컨트롤 간 간격**: `var(--space-control-gap)` = `12px` (동결)
- 카드 padding: `24px`

### 4.3 breakpoint 별 동작 (반응형 — 동결)

- `game` 컨테이너는 **`max-width: 420px`** + `margin: 0 auto`로 뷰포트 **중앙 정렬**.
- **320px 이상**에서 content overflow 없음:
  - 입력행은 `flex-wrap: wrap`, 입력 필드는 `min-width: 0`으로 축소 허용.
  - 좁은 폭에서 제출 버튼이 다음 줄로 자연스럽게 래핑.
- 카드 `width: 100%`로 작은 화면에서 좌우 여백만 두고 꽉 차게.

---

## 5. 컴포넌트 명세

selector는 동결 계약값 그대로입니다. **ID·class 변경 금지.**

### 5.1 게임 카드 루트 — `section.game`

- class: `game` (카드 루트 컨테이너)
- 상태 시각화를 위한 상태 훅으로 `data-state="idle|higher|lower|win|reset"`을 mockup에서 사용
  (dev는 상태 반영 방식 재량 — 계약은 상태명 5종을 화면 텍스트·접근성 이름으로 노출하는 것).

### 5.2 추측 입력 — `#guess-input.game__input`

| 속성 | 값 |
| --- | --- |
| id | `guess-input` |
| class | `game__input` |
| type | `number` (`min="1" max="100"`) |
| `aria-label` | `추측할 숫자` (동결) |
| 인터랙션 | **Enter 키로 추측 제출** 지원(동결), `:focus` 시 primary 색 outline |

### 5.3 제출 버튼 — `#submit-btn.game__button`

| 속성 | 값 |
| --- | --- |
| id | `submit-btn` |
| class | `game__button` |
| `aria-label` | `추측 제출` (동결) |
| 배경색 | `var(--color-action-primary)` = `#2563eb` |
| 상태 | 기본 / `:hover`(약간 어둡게) |

### 5.4 피드백 영역 — `#feedback.game__feedback`

| 속성 | 값 |
| --- | --- |
| id | `feedback` |
| class | `game__feedback` |
| `aria-live` | `polite` (동결 — 상태 변화 음성 안내) |
| 구성 | **상태 라벨 텍스트** + **피드백 문장** (색과 무관하게 상태명 항상 노출) |

상태별 표현:

| 상태 | 상태 라벨 텍스트 | 강조색 토큰 | 피드백 문장(예) |
| --- | --- | --- | --- |
| `idle` | 준비됨 | (중립) | "1~100 사이의 숫자를 입력하고 제출하세요." |
| `higher` | 더 높게 | `--color-feedback-higher` `#f59e0b` | "정답은 더 높아요. 더 큰 수를 입력해 보세요." |
| `lower` | 더 낮게 | `--color-feedback-lower` `#3b82f6` | "정답은 더 낮아요. 더 작은 수를 입력해 보세요." |
| `win` | 정답! | `--color-feedback-win` `#16a34a` | "정답이에요! 5번 만에 맞혔어요." |
| `reset` | 준비됨 | (중립) | "새 게임을 시작했어요. 다시 숫자를 입력해 보세요." |

> `reset`은 초기화 전이 상태로, 진행 표시(시도·피드백)를 초기값으로 되돌린 뒤 `idle`로 안정화합니다.
> mockup에서는 "새 게임 직후" 화면(시도 0·입력 재활성화·best score 유지)으로 표현합니다.

### 5.5 통계 영역 — `.game__stats`

| 요소 | id | 표시 |
| --- | --- | --- |
| 시도 횟수 | `attempts` | 현재까지 시도 횟수 (초기 `0`) |
| best score | `best-score` | 최소 시도 횟수. 저장값 없으면 "기록 없음" 대체 텍스트(빈 값 금지) |

### 5.6 새 게임 버튼 — `#new-game-btn.game__button`

| 속성 | 값 |
| --- | --- |
| id | `new-game-btn` |
| class | `game__button` |
| 동작 | `reset` 상태 전이 → 정답 재생성·시도 0·피드백 초기화, **best score 유지** |
| 스타일 | 보조(outline) 버튼 — 주 실행 버튼(제출)과 시각적 위계 구분 |

---

## 6. dev 구현 가이드

dev-1이 `number-guess/{index.html,style.css,game.js}` 구현 시 아래를 따르세요.
(mockup HTML은 참조용이며 픽셀 일치 의무 없음.)

1. **CSS 변수 정의**: `style.css`의 `:root`에 동결 토큰 5개를 **정확한 값**으로 선언.
   ```css
   :root {
     --color-action-primary: #2563eb;
     --color-feedback-higher: #f59e0b;
     --color-feedback-lower: #3b82f6;
     --color-feedback-win: #16a34a;
     --space-control-gap: 12px;
   }
   ```
2. **DOM 마크업**: 아래 ID·class를 **그대로** 사용.
   - `#guess-input.game__input`, `#submit-btn.game__button`, `#feedback.game__feedback`,
     `#attempts`, `#best-score`, `#new-game-btn.game__button`, 루트 `section.game`.
3. **접근성 속성**: `guess-input`→`aria-label="추측할 숫자"`, `submit-btn`→`aria-label="추측 제출"`,
   `feedback`→`aria-live="polite"`. Enter 제출은 `keydown`/form submit으로 처리.
4. **상태 반영**: `judge` 반환값(`higher`/`lower`/`win`)에 맞춰 `feedback`의 **상태 라벨 텍스트**와
   강조색을 갱신. 상태명은 색만이 아니라 **텍스트로도** 노출(색각 대응).
5. **피드백 강조색 매핑**:
   - `higher` → `--color-feedback-higher`, `lower` → `--color-feedback-lower`, `win` → `--color-feedback-win`.
6. **반응형**: `.game { max-width: 420px; margin: 0 auto; width: 100%; }`, 입력행 `flex-wrap: wrap`,
   `game__input { min-width: 0; }`로 320px overflow 방지.
7. **컨트롤 간격**: 컨트롤 사이 gap은 `var(--space-control-gap)` 사용(하드코딩 금지).

권장 CSS 클래스 훅(재량): 상태별 modifier `.game__feedback--higher/--lower/--win`.

---

## 7. mockup 참조

- 시각 mockup HTML: `docs/design/number-guess-mockup.html`
- 위 명세의 컬러·타이포·레이아웃·상태(idle/higher/lower/win/reset)를 그대로 시각화한
  self-contained 단일 HTML(외부 의존성 0건). 5개 상태를 나란히 배치해 상태별 화면 텍스트를 확인 가능.

---

## 8. Self-critique

PR commit 직전 자기 점검 (designer-spec-self-critique 5개 항목):

1. **AC 매핑**: plan §7의 AC1~AC7을 §5.4 상태표(higher/lower/win 텍스트)·§5.5(best score)·
   §5.2(Enter·aria-label)·§4.3(320px 반응형)로 모두 커버. ✅
2. **dev 구현 가이드**: §6에 CSS 변수·ID/class·접근성·상태 매핑·반응형·간격을 단계별 명시. ✅
3. **기존 요소 보존**: 본 task는 **additive** — 기존 `guess-number-*`(BF-1607) 파일을 건드리지 않고
   frozen 계약(BF-1612) 전용 신규 파일 2개만 생성. ✅
4. **컴포넌트 매핑**: 동결 DOM ID 6개(`guess-input`/`submit-btn`/`feedback`/`attempts`/`best-score`/
   `new-game-btn`)·class 5개(`game`/`game__input`/`game__feedback`/`game__stats`/`game__button`)·
   토큰 5개를 §2·§5에 1:1 매핑. selector·token 재정의 없음. ✅
5. **모호함 flag**: `reset` 상태는 전이 상태(초기화 후 `idle`로 안정화)이며 별도 지속 색 없음 —
   mockup에서 "새 게임 직후" 화면으로 표현함을 §5.4에 명시. best score의 "기록 없음" 대체 텍스트도 명시.
   추가 모호함 없음. ✅

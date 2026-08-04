# 숫자 맞히기 게임 UI 시안 (BF-1607 / ui-contract@v1)

> 본 문서는 planner 가 동결한 **ui-contract@v1** 를 시각 시안으로 표현한 **designer 산출물**이다.
> selector·상태명·디자인 토큰·접근성·반응형 계약을 **재정의하지 않고 그대로** 시각화한다.
> 상세 요구사항·AC 는 `docs/plans/guess-number-plan.md` 를 권위로 삼는다.

- **참조 mockup**: `docs/design/guess-number-mockup.html` (본 명세의 시각 동기화본)
- **동결 계약 원본**: `docs/plans/guess-number-plan.md` §5 Frozen UI 계약

---

## 1. 시안 개요

- **변경 범위**: 1~100 숫자 맞히기 게임의 단일 카드형 화면. 입력 → 제출 → 피드백 → 반복, 정답 시 최소 시도(best score) 갱신, "새 게임"으로 초기화.
- **사용자 경험 목표**
  - 한 화면에서 입력 control·진행 표시·피드백이 한눈에 들어오는 **집중형 단일 카드** 레이아웃.
  - 상태(`ready`/`guess-higher`/`guess-lower`/`win`)를 **색상만이 아니라 상태 라벨 텍스트**로 명확히 구분 → 색각·스크린리더 사용자 포함 누구나 판별 가능.
  - "새 게임" 이후 진행 표시가 초기값으로 돌아가고 입력 control 이 다시 활성화되는 흐름을 시각적으로 분명히 전달.
- **표현 대상 상태**: `ready`, `guess-higher`, `guess-lower`, `win` (mockup 에 4개 상태를 나란히 시뮬레이션).

---

## 2. 컬러 팔레트

동결 토큰 4종(`--color-action-primary`, `--color-feedback-win`, `--space-control-gap`, `--font-scale-base`)은 **값 변경 금지**. 아래 표에서 ⭐ 표시가 동결 토큰이며, 나머지는 시안 표현을 돕는 보조 색(dev 는 참고, 픽셀 일치 의무 없음).

| 역할 | HEX | CSS 변수(권장) | 비고 |
| --- | --- | --- | --- |
| ⭐ Action / Primary | `#2563eb` | `--color-action-primary` | **동결** — 제출 버튼, primary 강조 |
| ⭐ Feedback / Win | `#16a34a` | `--color-feedback-win` | **동결** — 정답(win) 피드백 강조 |
| Background (page) | `#f1f5f9` | `--color-bg-page` | 카드 뒤 배경(보조) |
| Surface (card) | `#ffffff` | `--color-surface` | 게임 카드 표면(보조) |
| Text / Primary | `#0f172a` | `--color-text` | 본문·수치 텍스트(보조) |
| Text / Muted | `#64748b` | `--color-text-muted` | 라벨·caption(보조) |
| Border | `#e2e8f0` | `--color-border` | 카드·입력 테두리(보조) |
| Feedback / Higher | `#b45309` | `--color-feedback-higher` | "더 큰 수" 상태 강조(보조, amber) |
| Feedback / Lower | `#4338ca` | `--color-feedback-lower` | "더 작은 수" 상태 강조(보조, indigo) |

> ⚠️ 색상은 **보조 신호**일 뿐이다. 모든 상태는 상태 라벨 텍스트(§5)로 1차 구분하며, 색상은 그 위에 얹는 강조에 불과하다.

---

## 3. 타이포그래피

- **폰트 패밀리**: system font stack 만 사용(외부 웹폰트 0건).
  `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
- **기준 크기**: ⭐ `--font-scale-base = 16px` (동결). 아래 스케일은 base 기준 상대값 권장.

| 역할 | font-size | weight | line-height | 용도 |
| --- | --- | --- | --- | --- |
| Title (h1) | 1.5rem (24px) | 700 | 1.25 | 게임 제목 |
| Feedback | 1.125rem (18px) | 600 | 1.4 | `feedback` 상태 안내 텍스트 |
| Stat value | 1.25rem (20px) | 700 | 1.2 | 시도 횟수·best score 수치 |
| Body / Input | 1rem (16px = base) | 400 | 1.5 | 입력값·본문 |
| Caption / Label | 0.8125rem (13px) | 500 | 1.4 | stat 라벨·보조 안내 |

---

## 4. 레이아웃

```
┌───────────────────────────────────────┐  ← .game (카드, max-width 420px, 중앙 정렬)
│  숫자 맞히기 (h1)                        │
│  1~100 사이의 숫자를 맞혀보세요 (caption) │
│                                         │
│  ┌── .game__stats ──────────────────┐  │
│  │  시도  #attempt-count  최고  #best-score │  │
│  └──────────────────────────────────┘  │
│                                         │
│  [ #guess-input        ] [ #guess-submit ]  ← gap = --space-control-gap(12px)
│                                         │
│  ┌── #feedback (.game__feedback) ────┐ │  ← aria-live="polite"
│  │ [상태 라벨] 상태 안내 텍스트          │ │
│  └──────────────────────────────────┘ │
│                                         │
│           [ #new-game ]                 │
└───────────────────────────────────────┘
```

- **섹션 구조**(위→아래): 헤더(제목+설명) → `game__stats`(시도/best) → 입력행(`guess-input` + `guess-submit`) → `feedback` → `new-game`.
- **spacing**: 카드 padding 24px, 섹션 간 세로 간격 16px. 입력 control 사이 가로 간격은 ⭐ `--space-control-gap = 12px`(동결) 사용.
- **breakpoint 별 동작**
  - **≥ 480px**: 입력행은 `guess-input`(flex-grow) + `guess-submit`(고정폭) 가로 배치.
  - **320px ~ 479px**: 카드 폭은 `width: 100%` + `max-width` 로 뷰포트에 맞춰 축소. 입력행이 좁아지면 `flex-wrap` 으로 버튼이 아래줄로 내려가되 **가로 overflow(스크롤/잘림) 0**. (AC-8)
  - 카드는 `box-sizing: border-box`, 콘텐츠는 `min-width: 0` 로 넘침 방지.

---

## 5. 컴포넌트 명세

각 컴포넌트의 selector 는 동결 계약(§7)을 그대로 따른다. 상태/인터랙션은 dev 가 구현하되, 아래 상태별 화면 텍스트·접근성 이름 규칙을 지킨다.

### 5.1 게임 카드 `.game`
- **역할**: 전체 컨테이너. 단일 카드.
- **props/상태**: 현재 게임 상태(`ready`/`guess-higher`/`guess-lower`/`win`)를 나타내는 데이터 속성(예: `data-state`) 권장 — 색상만이 아니라 아래 텍스트 규칙과 병행.

### 5.2 통계 영역 `.game__stats`
- **자식**: 시도 횟수 `#attempt-count`(초기 `0`), 최고 기록 `#best-score`(없으면 `–` 또는 `기록 없음`).
- **상태**: `win` 확정 시 `#attempt-count` 로 best score 갱신 후보 비교 → 갱신되면 `#best-score` 최신값 반영(AC-4, AC-5).
- **인터랙션**: 표시 전용(비인터랙티브). 각 수치 앞에 라벨 텍스트("시도", "최고") 노출.

### 5.3 입력 `#guess-input` (`.game__input`)
- **props**: `type="number"`(권장), `min=1`, `max=100`, placeholder 예 `"1 ~ 100"`.
- **상태**: 활성(기본) / 포커스. `win` 상태에서는 추가 판정을 막되(§6 edge), "새 게임" 후 **다시 활성화**되어 입력 가능해야 한다(AC-6).
- **인터랙션**: **Enter 키로 제출**(= `guess-submit` 동작). (AC-7)

### 5.4 제출 버튼 `#guess-submit` (`.game__submit`)
- **props**: 라벨 텍스트 "확인"(또는 "제출"), **`aria-label="추측 제출"`** (동결 접근성 요구).
- **상태**: 기본 / hover / active / focus-visible. 색은 ⭐ `--color-action-primary(#2563eb)`.
- **인터랙션**: 클릭 시 입력값을 정답과 비교 → 상태 전이 + `feedback` 갱신 + 유효 제출 시 시도 횟수 +1.

### 5.5 피드백 `#feedback` (`.game__feedback` / win 시 `.game__feedback--win`)
- **역할**: 현재 상태의 안내 텍스트 노출 영역.
- **접근성**: **`aria-live="polite"`** (동결). 텍스트가 갱신되면 스크린리더가 읽어준다.
- **상태별 표현**: 아래 §5.6 표대로 **상태 라벨 텍스트 + 안내 문구**를 함께 노출. `win` 일 때만 `game__feedback--win` 을 추가해 `--color-feedback-win(#16a34a)` 강조.

### 5.6 상태별 화면 텍스트 / 접근성 이름 (색상 비의존 — 핵심)

| 상태 | 상태 라벨(화면 텍스트) | feedback 안내 문구 예시 | 추가 class | 색 강조(보조) |
| --- | --- | --- | --- | --- |
| `ready` | `준비됨` | `1~100 사이의 숫자를 입력하고 확인을 누르세요.` | — | muted |
| `guess-higher` | `더 큰 수` | `입력한 수보다 큰 값이에요. 더 큰 수를 입력해 보세요.` | — | amber(보조) |
| `guess-lower` | `더 작은 수` | `입력한 수보다 작은 값이에요. 더 작은 수를 입력해 보세요.` | — | indigo(보조) |
| `win` | `정답!` | `정답이에요! N번 만에 맞혔어요.` | `game__feedback--win` | green ⭐ |

> 규칙: **상태 라벨 텍스트는 색상과 무관하게 항상 노출**한다. 색상 강조는 라벨 위 보조 신호일 뿐이며, 색을 제거해도 상태 구분이 가능해야 한다(AC-7).

### 5.7 새 게임 `#new-game`
- **props**: 라벨 텍스트 "새 게임".
- **인터랙션**: 클릭 시 정답 재설정 → 상태 `ready`, `#attempt-count` `0`, `#feedback` 초기 문구, **`#guess-input` 재활성화**. `#best-score` 는 유지(AC-6).

---

## 6. dev 구현 가이드 (BF-1608 developer 참고)

> selector·token·상태명은 **그대로** 사용. 아래는 시안 재현을 돕는 권장 사항이며 픽셀 일치 의무는 없다.

1. **CSS 변수 선언**: `:root` 또는 `.game` 스코프에 동결 토큰 4종을 **정확한 값으로** 선언.
   ```css
   :root {
     --color-action-primary: #2563eb;
     --color-feedback-win: #16a34a;
     --space-control-gap: 12px;
     --font-scale-base: 16px;
   }
   ```
   보조 색(§2)은 필요 시 추가 변수로 선언(값은 dev 재량, 시안 참고).
2. **마크업 골격**(selector 동결):
   - 카드 `<section class="game">` 안에 제목 → `.game__stats`(`#attempt-count`, `#best-score`) → 입력행(`#guess-input.game__input` + `#guess-submit.game__submit`) → `#feedback.game__feedback` → `#new-game`.
3. **접근성**:
   - `#guess-submit` 에 `aria-label="추측 제출"`.
   - `#feedback` 에 `aria-live="polite"`.
   - `#guess-input` 의 Enter 키 제출 핸들링(form submit 또는 keydown).
   - 상태 전이 시 `#feedback` 에 **상태 라벨 텍스트(§5.6)를 반드시 포함**해 색상 비의존 구분 보장.
4. **입력행 간격**: 두 control 사이 gap 은 `var(--space-control-gap)` 사용.
5. **win 강조**: `win` 일 때만 `#feedback` 에 `game__feedback--win` 추가 → `color: var(--color-feedback-win)`.
6. **반응형**: 카드 `max-width` + `width:100%`, `box-sizing:border-box`, 입력행 `display:flex; flex-wrap:wrap; gap:var(--space-control-gap)`. 320px 에서 **가로 overflow 0** 확인.
7. **리셋 후 재활성화**: `new-game` 핸들러에서 `#guess-input` 의 `disabled` 해제(win 중 비활성화했다면) + 값/피드백/시도 초기화.

### 권장 selector 요약(동결)
- **DOM ID**: `guess-input`, `guess-submit`, `new-game`, `attempt-count`, `best-score`, `feedback`
- **CSS class**: `game`, `game__input`, `game__submit`, `game__feedback`, `game__feedback--win`, `game__stats`

---

## 7. 동결 계약 준수 요약 (재정의 없음)

| 항목 | 동결 값 | 시안 반영 |
| --- | --- | --- |
| DOM ID | `guess-input`, `guess-submit`, `new-game`, `attempt-count`, `best-score`, `feedback` | §5 컴포넌트에 1:1 매핑 |
| CSS class | `game`, `game__input`, `game__submit`, `game__feedback`, `game__feedback--win`, `game__stats` | §4~5 레이아웃/컴포넌트에 매핑 |
| 상태 | `ready`, `guess-higher`, `guess-lower`, `win` | §5.6 상태별 텍스트/색 표 + mockup 4상태 |
| 토큰 | `--color-action-primary=#2563eb`, `--color-feedback-win=#16a34a`, `--space-control-gap=12px`, `--font-scale-base=16px` | §2·§3·§6 그대로 |
| 접근성 | `aria-label="추측 제출"`, `feedback` `aria-live="polite"`, Enter 제출, 상태 색상 비의존 텍스트 | §5.3~5.6, §6 |
| 반응형 | 320px+ overflow 0 | §4 breakpoint, §6-6 |

---

## 8. mockup 참조

- **파일**: `docs/design/guess-number-mockup.html`
- **내용**: system font 만 사용하는 단일 self-contained HTML. `ready`/`guess-higher`/`guess-lower`/`win` 4개 상태를 나란히 시뮬레이션하고, 각 상태를 **상태 라벨 텍스트 + 색 강조**로 함께 표현. 별도 섹션에서 "새 게임 직후"(진행 표시 초기화 + 입력 재활성화) 상태를 시각화.
- dev 는 mockup 을 **참조 가이드**로 사용하되 픽셀 단위 일치 의무는 없다.

---

## 9. Self-critique (PR 직전 자기 점검)

1. **AC 매핑**: AC-1~AC-8 을 §5.6 상태 표 / §4 반응형 / §5.3 Enter / §5.4 aria-label / §5.5 aria-live / §5.7 리셋 재활성화에 각각 반영 ✅
2. **dev 구현 가이드**: §6 에 CSS 변수·selector 골격·접근성·반응형·리셋 재활성화 단계 명시 ✅
3. **기존 요소 보존**: 신규 파일(`guess-number-BF-1606.md`, `guess-number-mockup.html`)만 additive 생성 — 다른 module/mockup 미변경 ✅
4. **컴포넌트 매핑**: 동결 DOM ID·class·상태·토큰을 §7 표에서 1:1 확인 ✅
5. **모호함 flag**:
   - feedback/상태 라벨 **문구 자체**는 예시(권장)이며 상태 라벨 텍스트 노출 규칙만 계약(색상 비의존). dev 가 문구를 조정해도 무방하되 상태명은 유지.
   - `#guess-input` `type`/`min`/`max`, best score 저장 키/직렬화는 계약 미명시 → dev 재량(plan §4.3). 시안은 UX 의도만 제시.

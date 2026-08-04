# 숫자 맞히기 게임 UI 시안 명세 (BF-1588)

> 본 문서는 planner가 동결한 UI 계약(`docs/plans/number-guess-BF-1588.md`)을 **시각화**한 designer 산출물이다.
> selector·design token·상태별 화면 텍스트·파일 소유권은 frozen 계약이 유일한 권위이며, 본 문서는
> 이를 **재정의하지 않고** 색·간격·타이포·레이아웃으로 표현만 한다.
> 시각 mockup: `docs/design/number-guess-mockup-BF-1588.html`

---

## 1. 시안 개요

### 변경 범위
1부터 100 사이의 정수를 맞히는 단일 화면 웹 게임의 UI 시안. 하나의 중앙 정렬 카드 안에
제목·상태 피드백·입력 폼·통계(시도/best)·초기화 버튼을 담는다. 서버·라우팅·영속 저장소 없음.

### 사용자 경험 목표
- **한눈에 이해**: 화면을 열면 무엇을 해야 하는지(`idle` 안내)가 카드 상단에 즉시 보인다.
- **명확한 피드백**: 제출할 때마다 힌트(더 큰/작은 수) 또는 정답 메시지가 색+텍스트로 동시에 전달된다.
- **색맹 안전**: 상태는 색상만으로 구분하지 않고, 항상 상태명을 담은 화면 텍스트를 함께 노출한다.
- **좁은 화면 대응**: 320px 폭에서도 overflow 없이 카드가 중앙에 유지된다.

---

## 2. 컬러 팔레트

### 2.1 Frozen design token (변경 금지 — planner 계약 §5)

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-action-primary` | `#2563eb` | 주 실행 버튼(`guess-submit`) 색 |
| `--color-feedback-success` | `#16a34a` | 정답(`won`) 피드백 텍스트 색 |
| `--color-feedback-hint` | `#64748b` | 힌트(`hint-higher`/`hint-lower`) 피드백 텍스트 색 |
| `--space-control-gap` | `12px` | control 간 간격 |

> developer는 위 4개 token을 그대로 `style.css`에서 사용한다. 값을 바꾸거나 이름을 재정의하지 않는다.

### 2.2 보조 시각값 (frozen 아님 — 시각 표현용 권장값)

frozen token은 상태 색과 주 버튼 색만 정의하므로, 배경·텍스트·테두리 등 **표현에 필요한 나머지 값**을
아래와 같이 권장한다. 이 값은 계약이 아니며 developer가 접근성(대비)만 지키면 조정할 수 있다.

| 역할 | 권장 CSS 변수(권장 이름) | 값 | 비고 |
| --- | --- | --- | --- |
| 페이지 배경 | `--color-bg-page` | `#f8fafc` | 카드 뒤 옅은 슬레이트 |
| 카드 배경 | `--color-bg-card` | `#ffffff` | 카드 표면 |
| 본문 텍스트 | `--color-text` | `#0f172a` | 제목·통계 기본색 (대비 AA 충족) |
| 보조 텍스트 | `--color-text-muted` | `#64748b` | 라벨·캡션 (= hint 색과 동일 계열) |
| 입력 테두리 | `--color-border` | `#cbd5e1` | 기본 input border |
| 입력 포커스 테두리 | (`--color-action-primary` 재사용) | `#2563eb` | 포커스 링에 primary 재사용 |
| 버튼 hover | `--color-action-primary-hover` | `#1d4ed8` | primary의 어두운 변형 |
| `invalid` 강조(선택) | `--color-feedback-invalid` | `#b91c1c` | 유효하지 않은 입력 텍스트 강조. 필수 아님 |

> `invalid` 상태의 화면 텍스트는 `idle`과 동일(`1부터 100 사이의 숫자를 입력하세요`)하므로,
> 색은 보조 신호일 뿐이며 상태 구분은 텍스트가 담당한다.

---

## 3. 타이포그래피

vanilla-static 제약 — 외부 폰트 로드 없이 **system font stack**만 사용한다.

```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Apple SD Gothic Neo", "Noto Sans KR",
             sans-serif;
```

| 역할 | 요소 | font-size | font-weight | line-height |
| --- | --- | --- | --- | --- |
| heading | 게임 제목(`<h1>`) | `1.5rem` (24px) | 700 | 1.3 |
| feedback | 피드백 텍스트(`.game__feedback`) | `1.125rem` (18px) | 600 | 1.5 |
| body/label | 입력 라벨·버튼 | `1rem` (16px) | 500 | 1.5 |
| stats | 시도/best(`.game__stats`) | `0.875rem` (14px) | 500 | 1.5 |

- 최소 본문 16px 이상으로 모바일 확대 방지(iOS 입력 확대 회피 위해 `guess-input` ≥16px).
- 피드백은 굵게(600) 처리해 상태 변화가 시각적으로 두드러지게 한다.

---

## 4. 레이아웃

### 4.1 섹션 구조 (위→아래)

```
┌─ .game (카드) ────────────────┐
│  h1  게임 제목                 │
│  #guess-feedback  상태 텍스트   │  ← aria-live="polite"
│  .game__form                   │
│    label + #guess-input        │
│    #guess-submit (.game__submit)│
│  .game__stats                  │
│    #guess-attempts · #best-score│
│  #new-game (초기화)            │
└───────────────────────────────┘
        (페이지 중앙 정렬)
```

### 4.2 Spacing

- 카드 내부 padding: `24px`.
- 카드 내 세로 요소 간격: `16px` (섹션 리듬).
- **control 간 가로/세로 간격: `--space-control-gap`(12px)** — 입력↔제출 버튼, 통계 항목 사이.
- 카드 상단 여백(뷰포트): 세로 중앙 정렬, 좁은 화면에선 상단 `24px` 여백 확보.

### 4.3 Breakpoint별 동작

| 구간 | 동작 |
| --- | --- |
| ~ 479px (모바일) | 카드 `width: 100%`, 좌우 `16px` 여백. `.game__form`은 세로 스택(입력 위, 버튼 아래 full-width). |
| 480px ~ | `.game__form`은 입력 + 제출을 가로 배치(`gap: --space-control-gap`), 카드 `max-width: 420px` 중앙. |

- 카드는 항상 `max-width: 420px` + `margin: 0 auto`로 **최대 너비 제한·중앙 정렬** 유지(계약 §8).
- 320px 폭에서 어떤 요소도 카드를 넘지 않음(input `min-width: 0`, 버튼 `flex-shrink` 허용).

---

## 5. 컴포넌트 명세

frozen DOM 계약(planner §3)을 그대로 사용한다. props/상태/인터랙션을 시각 관점에서 명세한다.

### 5.1 게임 카드 — `.game`
- 역할: 모든 요소를 감싸는 표면. `background: --color-bg-card`, `border-radius: 12px`,
  `box-shadow: 0 1px 3px rgba(15,23,42,.1)`, `padding: 24px`.
- 상태: 없음(정적 컨테이너).

### 5.2 상태 피드백 — `#guess-feedback` / `.game__feedback`
- 역할: 현재 상태의 **화면 텍스트**를 노출. `aria-live="polite"`(planner §7).
- props(상태별 텍스트·색):

| 상태명 | 화면 텍스트 | 텍스트 색 |
| --- | --- | --- |
| `idle` | `1부터 100 사이의 숫자를 입력하세요` | `--color-text-muted` (#64748b) |
| `hint-higher` | `더 큰 수를 입력하세요` | `--color-feedback-hint` (#64748b) |
| `hint-lower` | `더 작은 수를 입력하세요` | `--color-feedback-hint` (#64748b) |
| `won` | `정답입니다! N번 만에 맞혔습니다` | `--color-feedback-success` (#16a34a) |
| `invalid` | `1부터 100 사이의 숫자를 입력하세요` | `--color-feedback-invalid` (#b91c1c, 선택) |

- 인터랙션: `game.js`가 상태 전이 시 텍스트를 교체한다. 색은 상태에 매핑되는 보조 신호.
- 색맹 안전: 색이 달라도 텍스트만으로 상태를 알 수 있어야 한다(`won`만 유일하게 텍스트가 다름;
  `idle`/`invalid`는 텍스트 동일 → 색으로만 구분하지 않고 시도 횟수 미증가 등 동작으로 구분).

### 5.3 입력 필드 — `#guess-input` / `.game__input`
- 역할: `<input type="number">`, 연결된 `<label for="guess-input">`(planner §7).
- props: `min="1" max="100" step="1"`, `inputmode="numeric"`, placeholder `1~100`.
- 상태: 기본 / 포커스(테두리 `--color-action-primary`, 2px 포커스 링) / 값 있음.
- 인터랙션: Enter 제출 지원(폼 submit). `font-size: 16px` 이상으로 모바일 확대 방지.

### 5.4 제출 버튼 — `#guess-submit` / `.game__submit`
- 역할: 주 실행 control. `<button type="submit">`, 명시적 `aria-label="추측 제출"`(planner §7).
- 스타일: `background: --color-action-primary`(#2563eb), 흰색 텍스트, `border-radius: 8px`,
  `padding: 10px 16px`.
- 상태: 기본 / hover(`--color-action-primary-hover` #1d4ed8) / active / focus-visible(포커스 링).
- 인터랙션: 클릭·Enter로 현재 입력값 판정. 정답(`won`) 이후에도 계속 사용 가능하나
  추가 입력은 카운트하지 않음(planner §11) — 시각적으로 비활성 처리하지는 않는다.

### 5.5 통계 — `.game__stats` (`#guess-attempts`, `#best-score`)
- 역할: 현재 시도 횟수와 최소(best) 시도를 나란히 표시.
- 표기 예: `시도: 3회` · `최고 기록: 5회`(best 없으면 `최고 기록: -`).
- 상태: 값 변화 시 텍스트만 갱신. 색 강조 없음(`--color-text` 기본).

### 5.6 새 게임 — `#new-game`
- 역할: 게임 초기화 control. `<button type="button">`, 명시적 `aria-label="새 게임 시작"`(planner §7).
- 스타일: secondary — 투명 배경 + `--color-border` 테두리 + `--color-text` 텍스트(primary와 위계 구분).
- 상태: 기본 / hover(옅은 배경) / focus-visible.
- 인터랙션: 클릭 시 상태·시도·피드백을 `idle` 초기값으로 복귀, 주 실행 control 재사용 가능(planner AC-6).

---

## 6. dev 구현 가이드 (developer 참조)

> developer는 `number-guess/{index.html,style.css,game.js,judge.js,judge.test.js}`를 소유한다.
> mockup은 픽셀 일치 의무가 아닌 **참조 가이드**다. selector·token·상태 텍스트는 frozen 계약을 따른다.

1. **CSS 변수 선언** — `style.css` `:root`에 frozen token 4개를 그대로 선언:
   ```css
   :root{
     --color-action-primary:#2563eb;
     --color-feedback-success:#16a34a;
     --color-feedback-hint:#64748b;
     --space-control-gap:12px;
     /* 이하 보조값(§2.2) — 조정 가능 */
     --color-bg-page:#f8fafc; --color-bg-card:#fff; --color-text:#0f172a;
     --color-text-muted:#64748b; --color-border:#cbd5e1;
     --color-action-primary-hover:#1d4ed8;
   }
   ```
2. **클래스 매핑** — `.game`(카드), `.game__form`(폼), `.game__input`, `.game__submit`,
   `.game__feedback`, `.game__stats`를 planner §3.2 그대로 사용.
3. **DOM ID** — `guess-input`/`guess-submit`/`guess-feedback`/`guess-attempts`/`best-score`/`new-game`
   를 planner §3.1 그대로 부여.
4. **상태 렌더링** — `game.js`가 `judge.js` 반환 상태명에 따라 `#guess-feedback` 텍스트를
   §5.2 표의 화면 텍스트로 교체하고, 상태별 색 클래스를 토글(예: `.is-won`, `.is-hint`, `.is-invalid`).
   색 클래스는 시각 보조일 뿐 상태 판정 근거가 아니다.
5. **접근성** — `#guess-feedback`에 `aria-live="polite"`; `#guess-submit`·`#new-game`에 `aria-label`;
   `<label for="guess-input">` 연결.
6. **반응형** — 카드 `max-width:420px; margin:0 auto`; `@media (max-width:479px)`에서 `.game__form`
   세로 스택 + 버튼 full-width. `--space-control-gap`으로 control 간격.
7. **vanilla-static** — 외부 폰트/라이브러리 금지, classic `<script src>`, `file://` 직접 실행.

---

## 7. 상태별 화면 요약 (mockup 대응)

mockup HTML은 각 상태를 별도 `<section>` 카드로 나란히 그려 한 화면에서 비교하도록 구성한다.

| # | 상태 | 피드백 텍스트 | 시도 표시 | 색 신호 |
| --- | --- | --- | --- | --- |
| 1 | `idle` | 1부터 100 사이의 숫자를 입력하세요 | 시도: 0회 | muted |
| 2 | `hint-higher` | 더 큰 수를 입력하세요 | 시도: 1회 | hint(회색) |
| 3 | `hint-lower` | 더 작은 수를 입력하세요 | 시도: 2회 | hint(회색) |
| 4 | `won` | 정답입니다! 4번 만에 맞혔습니다 | 시도: 4회 · 최고 기록: 4회 | success(초록) |
| 5 | `invalid` | 1부터 100 사이의 숫자를 입력하세요 | 시도: 2회 (미증가) | invalid(빨강, 선택) |

---

## 8. mockup 참조

- 시각 mockup: **`docs/design/number-guess-mockup-BF-1588.html`**
- 단일 self-contained HTML, 외부 의존성 0, system font, `file://` 직접 열람 가능.
- 위 5개 상태를 나란히 시각화 + primary/hover/secondary 버튼 상태 예시 포함.

---

## 9. Self-critique (PR 직전 자기 점검)

| 체크 | 결과 |
| --- | --- |
| **AC 매핑** | AC-1~AC-7 모두 §5·§7·§6에 시각/텍스트로 반영(idle 초기 상태, higher/lower 힌트, won, invalid, new-game 복귀, 접근성·반응형). |
| **dev 구현 가이드** | §6에 CSS 변수·클래스·ID·상태 렌더링·접근성·반응형 단계별 명시. |
| **기존 요소 보존** | frozen selector/token/상태 텍스트를 재정의하지 않고 그대로 인용. 신규 파일·역할 추가 없음. |
| **컴포넌트 매핑** | planner §3 DOM 계약의 6개 ID·6개 class를 §5 컴포넌트에 1:1 매핑. |
| **모호함 flag** | ① `invalid` 텍스트가 `idle`과 동일 → 색은 보조, 상태 구분은 동작(시도 미증가)에 의존함을 §5.2에 명시. ② §2.2 보조 색값은 frozen 아님을 명확히 표기(대비만 지키면 dev 조정 가능). |

frozen 계약과의 충돌 없음. 재정의 없이 시각 표현만 추가하는 additive 산출물.

<!-- bf:tech-stack:vanilla-static -->
# 숫자 맞히기 게임 — UI 시안 명세 (BF-1619)

- **Jira**: BF-1619 (designer) · 계약: BF-1618 planning-contract@v1 + ui-contract@v1
- **기술 스택**: vanilla-static (외부 의존성 0건, system font, CSS 변수 자체 정의)
- **mockup 참조**: [`docs/design/number-guess-BF-1618-mockup.html`](./number-guess-BF-1618-mockup.html)
- **소비 페르소나**: developer(BF-1620) — 본 명세와 mockup을 참조 가이드로 런타임 구현

> 이 명세는 planner가 동결한 ui-contract@v1을 **시각적으로 렌더링**한 시안이다.
> `domId`·`cssClass`·`designToken`·상태 텍스트·접근성·반응형 계약을 재정의하지 않고
> 그대로 시각화한다. 색상·타이포·레이아웃·spacing만 designer 권한으로 구체화한다.

---

## 1. 시안 개요

### 변경 범위
브라우저에서 동작하는 1~100 숫자 맞히기 게임의 **단일 화면 UI**. 하나의 카드 안에
게임 제목, 통계(시도 횟수·best-score), 피드백 영역, 입력 폼(숫자 입력 + 제출), 새
게임 버튼을 세로로 배치한다. 라우트·페이지 전환 없음.

### 사용자 경험 목표
- **즉시 이해**: 로드 즉시 무엇을 해야 하는지 idle 안내 텍스트로 전달.
- **명확한 피드백**: 힌트(더 큼/더 작음)·정답·오류를 **색상 + 텍스트 + 아이콘 문자**로
  중복 표현해 색각 이상 사용자도 구분 가능(접근성 계약 5.6).
- **부담 없는 재도전**: best-score를 항상 노출해 "더 적은 시도" 동기를 부여하고,
  새 게임 버튼은 언제나 눌러 초기화 가능.
- **좁은 화면 대응**: 360px 미만에서 입력·버튼이 세로로 stack되어 터치 타깃 확보.

---

## 2. 컬러 팔레트

계약(ui-contract 5.5) 동결 토큰을 그대로 사용하고, 시안 완성을 위한 중립 배경·표면·
경계·텍스트 색상만 designer가 추가로 정의한다. 추가 색상은 계약 토큰과 충돌하지 않는
grayscale 계열로 한정한다.

### 2.1 계약 동결 토큰 (변경 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-action-primary` | `#2563eb` | 제출 버튼 배경, 포커스 링, 강조 |
| `--color-feedback-correct` | `#16a34a` | 정답(win) 피드백 텍스트 |
| `--color-feedback-hint` | `#d97706` | 힌트(더 큼/더 작음) 피드백 텍스트 |
| `--color-feedback-error` | `#dc2626` | 잘못된 입력(invalid) 오류 텍스트 |

### 2.2 시안 보조 토큰 (designer 추가 — 중립 계열)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-bg` | `#f1f5f9` | 페이지 배경 |
| `--color-surface` | `#ffffff` | 게임 카드 표면 |
| `--color-border` | `#e2e8f0` | 카드·입력 경계선 |
| `--color-text` | `#0f172a` | 본문·제목 텍스트 |
| `--color-text-muted` | `#64748b` | 통계 라벨·보조 텍스트 |
| `--color-action-primary-hover` | `#1d4ed8` | 제출 버튼 hover(계약 primary의 명도 하강) |

> 보조 토큰은 mockup 시각화를 위한 것이며, developer는 런타임에서 동일 의도를 유지하되
> 계약 토큰(`--color-action-primary` 등)의 값·이름은 변경하지 않는다.

---

## 3. 타이포그래피

`--font-stack: system-ui` 단일 스택만 사용(계약 5.5). 외부 폰트 로드 없음.

| 역할 | 요소 | font-size | font-weight | line-height |
| --- | --- | --- | --- | --- |
| heading | 게임 제목 `<h1>` | 20px | 700 | 1.3 |
| feedback | `#guess-feedback` | 18px | 600 | 1.4 |
| body | 입력·버튼 라벨 | 16px | 500 | 1.5 |
| stat-value | `#attempts-count`·`#best-score` 값 | 18px | 700 | 1.2 |
| caption | 통계 라벨(시도·최고) | 13px | 500 | 1.4 |

- 입력 `#guess-input`의 `font-size`는 **16px 이상**을 권장(모바일 브라우저 자동 확대
  방지).
- 피드백 텍스트는 상태별 아이콘 문자(`↑ ↓ ✓ ⚠`)를 텍스트에 포함해 색상 비의존.

---

## 4. 레이아웃

### 4.1 섹션 구조 (위→아래)

```
┌───────────────────────────────┐  .game (카드)
│  h1  숫자 맞히기               │
│                               │
│  .game__stats                 │  시도 횟수 · 최고 기록 (좌우 2열)
│   시도 0        최고 --        │
│                               │
│  #guess-feedback (.game__feedback)  ← 상태 텍스트 영역, aria-live=polite
│                               │
│  #guess-form (.game__form)    │  [ #guess-input ] [ #guess-submit ]
│                               │
│  #new-game                    │  전체폭 secondary 버튼
└───────────────────────────────┘
```

### 4.2 spacing

- 카드 내부 padding: `24px`.
- 섹션 간 세로 간격: `20px`.
- 입력·버튼 사이 간격: `--space-control-gap: 12px`(계약 5.5 동결 토큰 사용).
- 통계 2열 사이 간격: `16px`.

### 4.3 컨테이너

- 카드 `max-width: 400px`, 페이지 중앙 정렬(`margin: 0 auto`), 상하 여백 `40px`.
- 카드 `border-radius: 16px`, `border: 1px solid var(--color-border)`, 옅은 그림자.

### 4.4 breakpoint별 동작 (계약 5.7 동결)

| 뷰포트 | 동작 |
| --- | --- |
| **≥ 360px** | `#guess-form`이 가로 배치: `#guess-input`(flex-grow) + `#guess-submit`(고정폭). |
| **< 360px** | `#guess-form`이 **세로 stack**: 입력 → 제출 버튼 순서, 각 요소 전체폭. |
| **≥ 320px** | 어떤 뷰포트에서도 content overflow 없음(가로 스크롤 미발생). 카드 `width: 100%` + 좌우 페이지 padding `16px`로 320px 안에 수용. |

- 반응형 stack은 `@media (max-width: 359px)`로 구현 권장(`.game__form`의
  `flex-direction: column`).

---

## 5. 컴포넌트 명세

각 컴포넌트의 `domId`/`cssClass`는 계약(5.2·5.3) 동결 값. developer는 이름을
변경하지 않는다.

### 5.1 게임 카드 — `.game`

- **역할**: 전체 게임 UI를 감싸는 컨테이너.
- **상태**: 없음(정적 컨테이너).
- **인터랙션**: 없음.

### 5.2 통계 — `.game__stats`

- **구성**: 두 개의 stat 항목.
  - 시도 횟수: 라벨 "시도" + 값 `#attempts-count`(초기 `0`).
  - 최고 기록: 라벨 "최고" + 값 `#best-score`(미기록 시 placeholder `--`).
- **상태**:
  - `#attempts-count`: 유효 제출마다 +1, 새 게임 시 `0`으로 초기화.
  - `#best-score`: `localStorage['number-guess-best-score']` 로드 값. 미존재 시 `--`.
- **인터랙션**: 없음(표시 전용).

### 5.3 피드백 — `#guess-feedback` (`.game__feedback`)

- **역할**: 게임 상태 텍스트를 노출하는 단일 영역. `aria-live="polite"`.
- **상태별 표시**(계약 5.4 동결 텍스트 — 아이콘 문자는 시안 보강):

  | 상태 | 화면 텍스트(시안) | 색상 토큰 |
  | --- | --- | --- |
  | `idle` | `1~100 사이 숫자를 입력하세요` | `--color-text-muted` |
  | `hint-higher` | `더 큼 ↑` | `--color-feedback-hint` |
  | `hint-lower` | `더 작음 ↓` | `--color-feedback-hint` |
  | `win` | `정답! N번 만에 맞혔습니다` | `--color-feedback-correct` |
  | `invalid` | `1~100 사이 정수를 입력하세요` | `--color-feedback-error` |

  > 계약 5.4의 상태 텍스트는 그대로 유지한다. 화살표(`↑ ↓`)는 계약 텍스트에 이미
  > 포함되어 있고, win/invalid에는 색상 비의존을 위해 상태를 텍스트로 명시한다.

- **인터랙션**: 상태 전이 시 텍스트·색상 교체. `aria-live="polite"`로 스크린리더가
  변경을 읽어준다.

### 5.4 입력 폼 — `#guess-form` (`.game__form`)

- **구성**: `#guess-input`(숫자 입력) + `#guess-submit`(제출 버튼).
- **`#guess-input`** (`.game__input`)
  - `type="number"`, `min="1"`, `max="100"`, `inputmode="numeric"`.
  - `aria-label="1부터 100 사이 숫자 입력"`(계약 5.6 동결).
  - placeholder: `1~100`.
  - **인터랙션**: **Enter 키로 제출 지원**(계약 5.6). 포커스 시 primary 색 포커스 링.
- **`#guess-submit`** (`.game__submit`)
  - primary 버튼: 배경 `--color-action-primary`, 텍스트 흰색.
  - `aria-label="추측 제출"`(계약 5.6 동결). 표시 텍스트 "제출".
  - **상태**:
    - 기본(idle/hint/invalid): **활성**.
    - `win`: **비활성**(`disabled`) — 추가 제출 차단.
  - **인터랙션**: hover 시 `--color-action-primary-hover`. disabled 시 저채도·커서 차단.

### 5.5 새 게임 — `#new-game`

- **역할**: 상태·시도 횟수·피드백을 초기값으로 되돌리고 `#guess-submit` 재활성화.
  best-score는 유지(계약 AC-6).
- **스타일**: secondary(윤곽선) 버튼, 전체폭. 항상 활성.
- **인터랙션**: 클릭 시 idle 상태 복귀.

### 5.6 상태 전이 요약

| 트리거 | 결과 상태 | submit | attempts |
| --- | --- | --- | --- |
| 로드 | `idle` | 활성 | 0 |
| 정답보다 작은 값 제출 | `hint-higher` | 활성 | +1 |
| 정답보다 큰 값 제출 | `hint-lower` | 활성 | +1 |
| 정답 제출 | `win` | 비활성 | +1 |
| 범위 밖/비정수/빈 값 제출 | `invalid` | 활성 유지 | 변화 없음 |
| `#new-game` 클릭 | `idle` | 활성 | 0 |

---

## 6. dev 구현 가이드

> developer(BF-1620)가 `number-guess/index.html`·`style.css`·`game.js`를 구현할 때
> 참조. mockup은 픽셀 단위 일치 의무가 없는 시각 가이드다. **domId·cssClass·상태
> 텍스트·designToken·접근성·반응형 계약은 계약(5장)을 그대로 따른다.**

### 6.1 CSS 변수 (`:root`에 선언)

```css
:root {
  /* 계약 동결 토큰 — 이름·값 변경 금지 */
  --color-action-primary: #2563eb;
  --color-feedback-correct: #16a34a;
  --color-feedback-hint: #d97706;
  --color-feedback-error: #dc2626;
  --space-control-gap: 12px;
  --font-stack: system-ui, -apple-system, sans-serif;

  /* 시안 보조 토큰 — 중립 계열 */
  --color-bg: #f1f5f9;
  --color-surface: #ffffff;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-text-muted: #64748b;
  --color-action-primary-hover: #1d4ed8;
}
```

### 6.2 마크업 구조 권장 (클래스·id 계약값)

```html
<main class="game">
  <h1>숫자 맞히기</h1>

  <div class="game__stats">
    <div><span>시도</span> <strong id="attempts-count">0</strong></div>
    <div><span>최고</span> <strong id="best-score">--</strong></div>
  </div>

  <p id="guess-feedback" class="game__feedback" aria-live="polite">
    1~100 사이 숫자를 입력하세요
  </p>

  <form id="guess-form" class="game__form">
    <input id="guess-input" class="game__input" type="number"
           min="1" max="100" inputmode="numeric" placeholder="1~100"
           aria-label="1부터 100 사이 숫자 입력" />
    <button id="guess-submit" class="game__submit" type="submit"
            aria-label="추측 제출">제출</button>
  </form>

  <button id="new-game" type="button">새 게임</button>
</main>
```

### 6.3 상태 반영 지침

1. **피드백 색상**: 상태별로 `#guess-feedback`의 색상 토큰을 교체(5.3 표). 상태
   구분용 modifier 클래스(예: `.game__feedback--hint`) 사용 권장 — 색상만이 아닌
   텍스트로도 상태를 구분(계약 5.6).
2. **submit 비활성**: `win` 도달 시 `#guess-submit`에 `disabled` 부여, 새 게임 시 해제.
3. **Enter 제출**: `#guess-form`의 `submit` 이벤트를 사용하면 Enter 키가 자동 지원됨
   (계약 5.6). `event.preventDefault()`로 페이지 리로드 방지.
4. **best-score placeholder**: 미존재 시 `#best-score`에 `--` 표시, 첫 승리 시 기록.

### 6.4 반응형 지침

```css
.game__form { display: flex; gap: var(--space-control-gap); }
.game__input { flex: 1 1 auto; min-width: 0; }   /* overflow 방지 */
@media (max-width: 359px) {
  .game__form { flex-direction: column; }          /* 세로 stack */
  .game__submit { width: 100%; }
}
```

- `.game__input`에 `min-width: 0`을 주어 flex item이 320px 안에서 넘치지 않게 한다
  (계약 5.7 overflow 금지).

### 6.5 접근성 체크(계약 5.6 — 필수)

- [ ] `#guess-input` `aria-label="1부터 100 사이 숫자 입력"`.
- [ ] `#guess-submit` `aria-label="추측 제출"`.
- [ ] `#guess-feedback` `aria-live="polite"`.
- [ ] Enter 키 제출 동작.
- [ ] 모든 상태가 색상만이 아닌 화면 텍스트로 구분됨.
- [ ] 포커스 가시성: 입력·버튼에 primary 색 포커스 링.

---

## 7. mockup 참조

- **파일**: [`docs/design/number-guess-BF-1618-mockup.html`](./number-guess-BF-1618-mockup.html)
- **내용**: 본 명세의 컬러·타이포·레이아웃을 그대로 시각화한 단일 self-contained HTML.
  외부 의존성 0건, `:root`에 계약 토큰 + 보조 토큰 정의, system font 사용.
- **상태 시각화**: `idle`·`hint-higher`·`hint-lower`·`win`·`invalid` 5개 상태를 각각
  `<section>`으로 나열해 한 화면에서 비교. 반응형은 320px·360px 프레임으로 함께 표현.
- **주의**: mockup은 시안 시각화 전용이며 dev의 런타임 산출물이 아니다. dev는 참조
  가이드로 사용하되 픽셀 단위 일치 의무는 없다.

---

## Self-critique

PR 커밋 직전 자기 점검(designer-spec-self-critique 5항목).

1. **AC 매핑**: 계약 AC-1~AC-7 및 상태 5종을 5.3·5.6 표에서 `domId`/텍스트/토큰으로
   매핑함. idle·hint-higher·hint-lower·win·invalid 텍스트를 계약 5.4와 동일하게 유지.
2. **dev 구현 가이드**: 6장에 CSS 변수 선언, 마크업 구조(계약 id/class), 상태 반영,
   반응형(<360 stack), 접근성 체크리스트를 단계별로 제공. 픽셀 일치 비강제 명시.
3. **기존 요소 보존**: 신규 게임 UI로 보존 대상 기존 요소 없음. 계약 6개 파일은
   additive 정책이며 designer는 `docs/design/**`의 신규 2파일만 생성.
4. **컴포넌트 매핑**: 7개 `domId`(guess-form/input/submit/feedback, attempts-count,
   best-score, new-game)와 6개 `cssClass`(game, game__form/input/submit/feedback/stats)를
   5장 컴포넌트 명세에 1:1 매핑.
5. **모호함 flag**: `#best-score` 미기록 시 placeholder를 `--`로 시안에서 확정(계약은
   "미표시/placeholder"까지만 규정). 보조 중립 토큰은 계약 토큰과 분리해 값 변경 아님을
   명시. 그 외 계약 밖 재정의·추가 요구사항 없음.

## AI-Generated
이 명세는 brix-Flow designer 페르소나(이디자인)가 planner 동결 ui-contract@v1을
시각 시안으로 렌더링해 작성했다. domId·cssClass·designToken·상태 텍스트·접근성·반응형
계약을 재정의하지 않았다.

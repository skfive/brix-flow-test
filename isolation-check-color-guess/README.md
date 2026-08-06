# Color Guess — 시각 명세 (Visual Spec, BF-1767)

> 이 문서는 planner가 동결한 **UI 계약**([`docs/plans/BF-1766/implementation-plan.md`](../docs/plans/BF-1766/implementation-plan.md))을
> **눈으로 확인 가능한 시각 명세**로 정리한 것이다.
> designer는 frozen selector·상태·토큰을 **재정의하지 않고 그대로 반영**하며, 실행 HTML/CSS/JS는 생성하지 않는다.
> 실행 코드·정적 HTML(`index.html`, `docs/design/*.html`, `src/*`, `styles.css`, `tests/*`)의 소유자는 **developer(BF-1768)** 이다.

이 명세는 developer가 `design-tokens.html`·`design-mockup.html`·`styles.css`를 구현할 때 따르는 **시각 참조 계약**이다.
아래 값·selector·상태 텍스트는 frozen blueprint의 사본이며, 새 이름을 추가하거나 값을 바꾸지 않는다.

---

## 1. 모듈 개요

- **게임**: Color Guess (색상 맞히기)
- **tech-stack**: vanilla-static (HTML/CSS/vanilla ESM JS, 빌드 도구 없음, 외부 의존성 0건)
- **격리 루트**: `isolation-check-color-guess/`
- **serve-root**: `.` (root-relative static)
- **실행 방법**: 격리 루트에서 정적 서버 기동 후 진입 화면 접속.

```bash
cd isolation-check-color-guess
python3 -m http.server 8000
# → http://localhost:8000/index.html            (게임 진입 화면)
# → http://localhost:8000/docs/design/design-tokens.html   (토큰 미리보기)
# → http://localhost:8000/docs/design/design-mockup.html   (상태별 정적 mockup)
```

**UX 목표**: 플레이어에게 목표 색상 값을 텍스트로 제시하고, 여러 색상 견본(swatch) 중 목표와 일치하는 것을 고르게 한다.
정답이면 점수 +1, 오답이면 목숨 −1. 목숨이 모두 소진되면 gameover로 전환되어 최종 점수와 다시 시작 버튼을 노출한다.
색맹/저시력 사용자를 포함해 **색상만으로 상태를 구분하지 않고** 상태명을 항상 텍스트로 노출한다.

---

## 2. 파일 맵 (frozen — 소유권)

모든 경로는 `isolation-check-color-guess/` 기준. artifact-policy는 전부 **additive**(신규 생성).

| 파일 | 소유자 | 역할 |
| --- | --- | --- |
| `README.md` | **designer (본 문서)** | frozen UI 계약의 시각 명세 |
| `docs/design/design-tokens.html` | developer | §4 토큰 미리보기 (색상/타이포/간격/반경 견본) |
| `docs/design/design-mockup.html` | developer | §3 상태(playing/correct/wrong/gameover) 정적 mockup |
| `index.html` | developer | 게임 진입 화면 (DOM 골격), `src/main.js`를 ESM 로드 |
| `src/game.js` | developer | 순수 게임 로직 (렌더링 분리, RNG 주입) |
| `src/main.js` | developer | DOM 바인딩·렌더·이벤트 |
| `styles.css` | developer | §4 토큰·§6 반응형·상태별 시각 표현 |
| `tests/game.test.js` | developer | `game.js` 단위 테스트 |

> designer는 위 파일 중 `README.md` 외에는 **생성·수정하지 않는다**. 실행/정적 산출물은 developer가 만든다.

---

## 3. DOM selector · 상태 계약 (frozen — 변경 금지)

### 3.1 DOM ID

| ID | 요소 | 시각 역할 |
| --- | --- | --- |
| `color-target` | 목표 색상 표시 | 맞혀야 할 색상 값을 큰 텍스트로 노출 (`--font-size-target`) |
| `swatch-options` | 색상 견본 컨테이너 | 선택 가능한 `swatch` button들을 담는 영역 |
| `score-value` | 점수 표시 | 현재 점수(정답 수) — HUD |
| `lives-value` | 목숨 표시 | 남은 목숨 수 — HUD |
| `feedback-message` | 피드백 영역 | 정답/오답 결과 안내 (`aria-live="polite"`) |
| `gameover-panel` | 종료 패널 | `gameover` 상태에서만 표시 |
| `final-score` | 최종 점수 | gameover 시 최종 점수 |
| `restart-button` | 다시 시작 버튼 | 초기화 후 `playing` 상태로 복귀 |

### 3.2 CSS class

| class | 시각 역할 |
| --- | --- |
| `game` | 최상위 게임 컨테이너 (`--color-surface` 카드) |
| `game__hud` | 점수·목숨 HUD 영역 (가로 배치) |
| `swatch` | 개별 색상 견본 button 기본 |
| `swatch--correct` | 정답 견본 선택 시 강조 (`--color-correct` 테두리/글로우) |
| `swatch--wrong` | 오답 견본 선택 시 강조 (`--color-wrong` 테두리/글로우) |
| `gameover` | gameover 상태 컨테이너/패널 표현 |

> 위 ID/class 집합이 유일한 권위다. developer/designer는 이름을 추가·변경·재정의하지 않는다.

### 3.3 상태 모델 · 화면 텍스트 (frozen)

상태 집합: `playing | correct | wrong | gameover`

| 상태 | 진입 조건 | `feedback-message` 텍스트 | 시각 표현 |
| --- | --- | --- | --- |
| `playing` | 게임 시작 / 다음 라운드 | `색상을 맞혀보세요` | 견본 기본 상태, HUD 표시, gameover 패널 숨김 |
| `correct` | 정답 견본 선택 | `정답입니다` | 선택 견본에 `swatch--correct`, feedback 텍스트 |
| `wrong` | 오답 견본 선택 | `오답입니다 — 목숨이 하나 줄었습니다` | 선택 견본에 `swatch--wrong`, 목숨 감소, feedback 텍스트 |
| `gameover` | 목숨 0 도달 | `게임 오버 — 최종 점수 N` | `gameover-panel`/`gameover` 표시, `final-score`·`restart-button` 노출 |

**상태 전이**

```
playing ──정답 선택──▶ correct ──다음 라운드──▶ playing
playing ──오답(목숨>0)─▶ wrong   ──다음 라운드──▶ playing
playing ──오답(목숨=0)─▶ gameover
gameover ──restart-button──▶ playing   (점수·목숨·feedback 초기값 복귀)
```

**초기화 후조건**: 다시 시작·실패 후에는 상태와 진행 표시(점수·목숨·feedback)를 초기값으로 되돌리고,
주 실행 control(`restart-button` 및 견본 선택)을 다시 사용할 수 있어야 한다.

**원칙**: 모든 상태는 **색상만으로 구분하지 않는다**. 상태명을 화면 텍스트와 접근성 이름 양쪽으로 노출한다.
`correct`/`wrong`는 견본에 class로 시각 표현하되, 결과 문구를 `feedback-message`에 **항상 함께** 쓴다.

---

## 4. 디자인 토큰 (frozen — exact 값)

`design-tokens.html`·`styles.css`는 아래 토큰을 `:root` CSS custom property로 선언하고,
색상 견본·타이포·간격·반경 견본이 그 변수를 **실제로 참조**한다(값 하드코딩 금지).
developer/designer는 값을 변경하지 않는다.

### 4.1 컬러 팔레트

| 토큰 | 값 | 용도 | 견본 |
| --- | --- | --- | --- |
| `--color-bg` | `#0f172a` | 페이지 배경 | ▓ 짙은 남색 |
| `--color-surface` | `#1e293b` | 카드/HUD 표면 | ▓ 슬레이트 |
| `--color-text-primary` | `#f8fafc` | 주 텍스트 | ░ 거의 흰색 |
| `--color-text-muted` | `#94a3b8` | 보조 텍스트 (HUD 라벨 등) | ▒ 회청색 |
| `--color-correct` | `#22c55e` | 정답 상태 강조 (`swatch--correct`) | ▓ 초록 |
| `--color-wrong` | `#ef4444` | 오답 상태 강조 (`swatch--wrong`) | ▓ 빨강 |
| `--color-accent` | `#3b82f6` | 포커스 링/액센트 (button focus) | ▓ 파랑 |

- **대비**: 주 텍스트(`--color-text-primary`)는 표면(`--color-surface`) 위에서 고대비를 유지한다.
- **포커스**: 키보드 포커스 시 `--color-accent` 기반 outline/ring으로 위치를 명확히 표시한다.

### 4.2 타이포그래피

| 토큰 | 값 | 적용 |
| --- | --- | --- |
| `--font-size-target` | `28px` | `color-target` (목표 색상 값 텍스트) — 화면에서 가장 큰 텍스트 |
| `--font-size-body` | `16px` | 본문/HUD/feedback/button 텍스트 기본 |

- **font-family**: vanilla-static 규약에 따라 **system font stack** 사용 (외부 폰트 CDN 없이). 예: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- 목표 색상 값 텍스트는 굵게(강조) 처리하여 라운드의 초점임을 나타낸다.

### 4.3 간격 · 반경

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--space-sm` | `8px` | 견본 내부/요소 간 좁은 간격 |
| `--space-md` | `16px` | 컴포넌트 기본 간격 (카드 패딩, 견본 gap) |
| `--space-lg` | `24px` | 섹션/카드 간 넓은 간격 |
| `--radius-md` | `12px` | 카드·견본·button 모서리 반경 |

---

## 5. 레이아웃 명세

### 5.1 구조 (위 → 아래)

```
┌───────────────────────────── .game (카드, --color-surface, --radius-md) ─┐
│  .game__hud  ┆  점수: [#score-value]      목숨: [#lives-value]           │
│  ─────────────────────────────────────────────────────────────────────  │
│  #color-target      (목표 색상 값, --font-size-target, 굵게)              │
│                                                                          │
│  #swatch-options    [.swatch][.swatch][.swatch][.swatch] ...             │
│                     (button 그리드/행, gap=--space-md)                    │
│                                                                          │
│  #feedback-message  (aria-live=polite, 상태별 문구)                       │
│                                                                          │
│  #gameover-panel .gameover  (gameover 상태에서만 표시)                    │
│     └ 게임 오버 — 최종 점수 [#final-score]                                │
│     └ [#restart-button "다시 시작"]                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

- 카드(`.game`)는 페이지 중앙 정렬, 배경은 `--color-bg`.
- `game__hud`는 점수/목숨을 가로로 배치, 라벨은 `--color-text-muted`.
- `swatch-options`의 견본은 정사각형에 가까운 button으로, 각 견본 배경이 후보 색상을 나타낸다.
- `gameover-panel`은 기본 숨김이며 `gameover` 상태에서만 노출된다.

### 5.2 spacing 규칙

- 카드 내부 패딩: `--space-lg`.
- HUD ↔ target ↔ swatch ↔ feedback 세로 간격: `--space-lg`.
- 견본 사이 gap: `--space-md`.
- 견본 내부 패딩 및 소요소 간격: `--space-sm` ~ `--space-md`.

---

## 6. 접근성 · 반응형 계약 (frozen)

### 6.1 접근성

- 각 색상 견본은 **키보드 포커스 가능한 `<button>`**이며 `N번 색상 견본` 형식의 `aria-label`을 가진다. (예: `1번 색상 견본`)
- `restart-button`은 `다시 시작` `aria-label`을 가진다.
- `feedback-message`는 `aria-live="polite"` 영역으로 정답/오답 결과를 안내한다.
- 모든 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.
- 포커스 표시는 `--color-accent` 기반으로 명확히 렌더하여 키보드 사용자가 현재 위치를 알 수 있게 한다.

### 6.2 반응형

| breakpoint | 동작 |
| --- | --- |
| **≥ 480px** | 색상 견본이 가로(행/그리드)로 배치, HUD는 가로 정렬 |
| **< 480px** | 색상 견본이 **세로로 재배치**(1열) |
| **≥ 320px (전 구간)** | 색상 견본과 HUD가 **가로 overflow 없이** 배치 |

- 최소 지원 폭 320px에서 텍스트·button이 잘리거나 가로 스크롤이 생기지 않아야 한다.

---

## 7. dev 구현 가이드 (developer 참조)

developer(BF-1768)가 `design-tokens.html`·`design-mockup.html`·`styles.css`·`index.html`을 구현할 때 참조한다.

1. **토큰 선언**: `:root { --color-bg:#0f172a; ... --font-size-body:16px; }` — §4 표의 exact 값 그대로. 이후 모든 색상/간격/반경/폰트크기는 `var(--token)`으로만 참조하고 리터럴 값 하드코딩 금지.
2. **`design-tokens.html`**: 각 토큰마다 견본(색상 스와치·타이포 샘플·간격 바·반경 박스)을 렌더하고, 견본 스타일이 해당 CSS 변수를 실제로 참조하도록 한다. 정적 서버로 열었을 때 그 자체로 렌더돼야 한다.
3. **`design-mockup.html`**: §3.3의 네 상태(`playing`/`correct`/`wrong`/`gameover`)를 모두 **정적으로** 렌더한다(각 상태를 별도 `<section>`으로 나열해도 됨). 값 하드코딩 없이 `design-tokens.html`과 동일한 CSS 변수를 사용한다.
4. **selector**: §3.1 ID / §3.2 class 이름을 그대로 사용. 추가·변경·재정의 금지.
5. **상태 텍스트**: §3.3 `feedback-message` 문구를 exact 문자열로 사용.
6. **접근성**: §6.1의 `aria-label`·`aria-live`를 그대로 부여.
7. **반응형**: §6.2 breakpoint(480px, 320px 하한) 규칙을 media query로 구현.

> 이 문서는 frozen blueprint의 selector·token·상태를 **설명·시각화**할 뿐, 새 파일·이름·값을 추가하지 않는다.

---

## 8. handoff 계약 요약

- **consume**: `planning-contract@v1`, `ui-contract@v1` (planner BF-1769, packet=`plan`)
- **produce**: `isolation-check-color-guess/README.md` (visual spec) — packet=`design`
- **downstream**: developer(BF-1768)가 본 명세를 참조하여 실행/정적 산출물을 구현
- **invariant**:
  - designer는 selector·token·상태·접근성·반응형 계약을 **변경하거나 재정의하지 않는다**.
  - 실행 HTML/CSS/JS는 designer가 생성하지 않는다(developer 소유).
  - 모든 산출물은 `isolation-check-color-guess/` 안에서만 생성한다.

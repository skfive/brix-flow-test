# Pong 키보드 조작·포커스 UI 디자인 명세 — BF-960 (유지보수)

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 관련 티켓: BF-959(planner) · **BF-960(본 designer task)** · BF-961(developer) · BF-963(tester)
> 대상 모듈: `phase18-games/pong/`(기존 구현, BF-913) — **신규 모듈 아님, 유지보수 시안**
> 선행 산출물: `docs/plan/pong-BF-959.md`(범위 계약·AC SSOT) · `docs/design/pong-BF-910.md`(원본 디자인·토큰 SSOT, BF-912)
> 개선 축 3개(디자인 대상): ① **포커스 표시**(오버레이 타이틀 `:focus-visible` 링) ② **조작 안내(hint) 보강**(키보드 단축키 전체) ③ **일시정지 상태 시각 피드백**(동결된 공·포커스·재개 안내)
> mockup: `docs/design/mockups/pong-maintenance-BF-960.html`

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**전제 1 — 본 task는 "유지보수 시안"이지 신규 디자인이 아니다.** 원본 Pong 디자인(`docs/design/pong-BF-910.md`)의 컬러 팔레트(§2)·타이포(§3)·레이아웃(§4)·컴포넌트(§5) 계약은 **값 불변으로 승계**한다. 본 문서는 planner(`docs/plan/pong-BF-959.md`)가 실측·확정한 **3건의 gap** 중 디자인 영역(GAP-1 포커스 표시·GAP-2 조작 안내 문구)의 **시각 규칙만** 추가로 명세한다. GAP-3(회귀 테스트)은 tester(BF-963) 영역이라 본 문서 범위 밖이다.

**전제 2 — 신규 토큰/색 리터럴을 발명하지 않는다(Simplicity First).** 포커스 링은 기존 `:root`(styles.css 19행)에 이미 정의된 `--color-focus-ring: rgba(91, 130, 240, 0.55)`를 재사용하며, 버튼(`.pong-btn:focus-visible`)과 **동일 값**(3px solid, offset 2px)을 쓴다(planner AC-F3). 신규 색 HEX·신규 토큰 0건.

**전제 3 — 기존 동작·요소 보존이 명시적 계약이다.** 터치(Pointer Events) 조작, `logic.js` 물리·CPU·득점 공식, 상태 모델(`status` enum), 기존 버튼 3 variant 포커스 링(`.pong-btn:focus-visible`)은 **변경 대상이 아니며** 회귀 없이 유지된다(planner §4 nonGoals·AC-F2). 본 시안은 CSS `:focus-visible` 규칙 1건 추가 + DOM 문구(텍스트 콘텐츠) 3곳 갱신 방향만 다룬다.

**전제 4 — 조작 안내의 "정확한 워딩"은 designer가 본 문서에서 확정한다.** planner §6은 워딩을 designer/dev 재량으로 열어두었다. 본 문서 §5.2·§5.3에서 360px 제약(AC-H3)을 만족하는 확정 워딩을 제시하되, dev는 문자 단위 일치 의무 없이 "키 세트 누락 없음 + 가로 스크롤 없음"만 지키면 된다.

---

## 목차

1. 시안 개요
2. 컬러 팔레트 (승계 + 포커스 링)
3. 타이포그래피 (승계)
4. 레이아웃 (문구 배치·360px 동작)
5. 컴포넌트 명세 (포커스 링·hint·오버레이 문구)
6. dev 구현 가이드 (BF-961용 단계별 지침)
7. mockup 참조
8. AC 매핑 및 Self-critique

---

## 1. 시안 개요

### 1.1 변경 범위 (as-is → to-be)

| 축 | as-is (실측, planner §0 가정 4) | to-be (본 시안) |
|---|---|---|
| ① 포커스 표시 | `.pong-overlay__title { outline: none; }`(styles.css 202~207행)가 프로그램 포커스 대상의 시각 표시를 제거 — 상태 전환 시 포커스 위치가 안 보임 | 오버레이 타이틀에 버튼과 동일한 `:focus-visible` 포커스 링 표시(`--color-focus-ring`, 3px, offset 2px) |
| ② 조작 안내(hint) | 하단 `.pong-hint`·start 오버레이 본문에 ↑/↓·드래그만 언급, P/Esc·R·Enter/Space 미언급 | hint + start 오버레이 본문에 키보드 단축키 전체(이동·일시정지/재개·재시작·시작) 요약 반영 |
| ③ 일시정지 상태 시각 피드백 | 오버레이 scrim + "일시정지" 타이틀 + "계속하려면 계속하기를 누르세요" — 키(P/Esc) 재개 안내 없음, 동결 상태 시각 규칙 미문서화 | scrim 위 "일시정지" 타이틀(포커스 링) + 동결된 공·패들이 코트에 정지 상태로 계속 보임(사라지지 않음) + 재개 키(P/Esc) 안내 |

### 1.2 사용자 경험 목표

- **키보드 사용자가 "지금 포커스가 어디 있는지" 항상 안다** — 상태 전환(시작/일시정지/게임오버)마다 오버레이 타이틀로 프로그램 포커스가 이동하며, 그 위치가 시각적으로 드러난다(AC-F1).
- **조작 방법을 화면만 보고 완전히 파악한다** — 마우스·터치 없이 키보드만으로 시작·이동·일시정지·재개·재시작 전부 가능함을 hint/오버레이 문구가 빠짐없이 안내한다(AC-H1·H2).
- **일시정지가 "멈춤"임을 시각적으로 확신한다** — 공이 사라지지 않고 코트에 정지된 채 보이고, 재개 방법(버튼/키)을 명확히 안내한다(AC-P2 시각 대응).

### 1.3 상태 → 시각 매핑 (원본 §1.3 승계 + 본 축 강조점)

| status | 오버레이 | 본 시안이 추가/강조하는 시각 규칙 |
|---|---|---|
| `start` | 표시 | 타이틀 "Pong 아케이드"에 포커스 링 · 본문에 시작/이동 키 안내(§5.3) |
| `playing` | 숨김 | 하단 `.pong-hint`에 이동·일시정지·재시작 키 상시 노출(§5.2) |
| `point-paused` | 표시(비인터랙티브) | 포커스 이동 없음(기존) — 변경 없음 |
| `paused` | 표시 | 타이틀 "일시정지"에 포커스 링 · 본문에 재개 키(P/Esc) 안내 · 코트에 동결된 공/패들이 계속 보임(§5.4) |
| `gameover` | 표시 | 타이틀(승자 색)에 포커스 링 · 본문 최종 점수(기존) |

---

## 2. 컬러 팔레트 (원본 §2 승계 — 값 불변)

원본 `docs/design/pong-BF-910.md` §2 팔레트를 **값 그대로 승계**한다. 본 축에서 **새 색을 추가하지 않는다**. 아래는 본 시안이 직접 참조하는 토큰만 발췌(전체는 원본 §2·styles.css `:root` 참조).

### 2.1 본 시안이 참조하는 토큰

| 토큰 | 값 | 본 시안에서의 용도 |
|---|---|---|
| `--color-focus-ring` | `rgba(91, 130, 240, 0.55)` | **오버레이 타이틀 포커스 링**(신규 적용) + 기존 버튼 포커스 링(유지) |
| `--color-text-primary` | `#e8edf4` | 오버레이 타이틀·hint 강조 텍스트 |
| `--color-text-secondary` | `#9aa7b8` | 오버레이 본문·hint 본문 텍스트 |
| `--color-bg-subtle` | `#1c2431` | `.pong-hint` 배경 |
| `--paddle-player` | `#4ade80` | gameover 플레이어 승리 타이틀 색(기존) |
| `--paddle-cpu` | `#f59e6b` | gameover CPU 승리 타이틀 색(기존) |
| `--ball-color` | `#f5f7fa` | 일시정지 중 동결된 공(코트에 계속 보임) |
| `--overlay-scrim` | `rgba(5, 7, 12, 0.72)` | 오버레이 배경 scrim(기존) |

### 2.2 신규 색 리터럴 최소화 근거

포커스 링은 기존 `--color-focus-ring` 재사용(신규 0건). 일시정지 동결 시각도 기존 `--ball-color`/`--paddle-*` 재사용. **본 축에서 추가되는 색 HEX·rgba 리터럴은 0건**이다(planner AC-F3, Simplicity First 준수).

---

## 3. 타이포그래피 (원본 §3 승계 — 값 불변)

원본 §3 폰트 스택·스케일을 **값 그대로 승계**한다. 본 축은 문구 **콘텐츠**만 바꾸고 **타이포 스타일(폰트/사이즈/굵기/행간)은 변경하지 않는다**.

| 요소 | 폰트 규칙(기존 유지) | 비고 |
|---|---|---|
| 오버레이 타이틀 `.pong-overlay__title` | `700 clamp(24px, 7vw, 34px)/1.2 var(--font-mono)` | 포커스 링만 추가, 타이포 불변 |
| 오버레이 본문 `.pong-overlay__body` | `400 15px/1.5 var(--font-sans)` | 문구만 갱신 |
| 하단 안내 `.pong-hint` | `400 15px/1.5 var(--font-sans)` (≤360px: `13px`) | 문구만 갱신, 반응형 규칙 유지 |

> **키 표기 규칙(신규, 타이포 스타일 변경 아님)**: 문구 안의 키 이름(`↑`, `↓`, `P`, `Esc`, `R`, `Enter`, `Space`)은 **가독성을 위해 원문 그대로 표기**하되, 별도 `<kbd>` 요소나 신규 폰트를 도입하지 않는다(Simplicity First — 순수 텍스트 콘텐츠 갱신). 키 구분자는 원본 문구가 쓰던 가운뎃점(` · `)을 그대로 사용해 시각 일관성을 유지한다.

---

## 4. 레이아웃 (문구 배치 · 360px 동작)

### 4.1 배치 원칙 (원본 §4 구조 불변)

페이지 구조(상단바 → 스코어보드 → 코트+오버레이 → 하단 조작 안내+버튼)는 **원본 §4 그대로**다. 본 축은 기존 슬롯 안의 **텍스트만** 바꾸므로 **레이아웃 박스·spacing·breakpoint는 변경하지 않는다**.

- 하단 조작 안내: 기존 `.pong-hint`(가운데 정렬, `--color-bg-subtle` 배경, `--radius-md`, `--space-3 --space-4` 패딩) 박스 안 텍스트만 교체.
- 오버레이 본문: 기존 `.pong-overlay__body`(가운데 정렬) 텍스트만 교체.

### 4.2 360px 반응형 동작 (AC-H3 — 가로 스크롤 금지)

문구가 길어지므로 **줄바꿈이 발생할 수 있으나 가로 스크롤은 절대 발생하지 않아야 한다**. 이를 위한 시각 규칙:

- `.pong-hint`·`.pong-overlay__body`는 **자연 줄바꿈 허용**(기본 `white-space: normal`) — 별도 `nowrap` 금지.
- 키 세트 사이 구분자 ` · ` 앞뒤에 일반 공백을 두어 좁은 폭에서 **구분자 단위로 줄바꿈**되게 한다(단어 중간 끊김 방지).
- ≤360px에서 `.pong-hint` 폰트는 기존 규칙(`13px`)을 그대로 사용(축소로 2줄 이내 수용 목표, 3줄도 스크롤만 없으면 허용).
- **검증 기준**: 320px·360px 폭에서 `document.documentElement.scrollWidth <= clientWidth`(가로 스크롤 0). mockup의 360px 시뮬레이션 섹션(§7)에서 시각 확인.

### 4.3 줄바꿈 우선순위 (좁은 폭에서)

문구를 논리 구획으로 나누어, 좁은 폭에서 아래 순서로 줄바꿈되도록 구분자를 배치한다.

```
[이동 안내] · [일시정지/재개 안내] · [재시작 안내]
   ↑ 1구획        ↑ 2구획              ↑ 3구획
```

각 구획은 그 자체로 완결된 의미 단위라, 어느 지점에서 줄바꿈돼도 안내가 깨지지 않는다.

---

## 5. 컴포넌트 명세

### 5.1 오버레이 타이틀 포커스 링 `.pong-overlay__title:focus-visible` (GAP-1 / AC-F1·F3)

**대상**: `#overlay-title`(`.pong-overlay__title`, `tabindex="-1"`). `main.js syncUi()`가 `start`/`paused`/`gameover` 진입마다 `overlayTitle.focus()`로 프로그램 포커스를 준다(기존 동작, 변경 없음).

| 속성 | 값 | 근거 |
|---|---|---|
| 트리거 | `:focus-visible` | 프로그램 포커스(키보드 흐름)에서 링 노출, 마우스 클릭성 포커스는 브라우저 판단에 위임(버튼과 동일 정책) |
| outline | `3px solid var(--color-focus-ring)` | 버튼(`.pong-btn:focus-visible`)과 **완전 동일 값**(AC-F3) |
| outline-offset | `2px` | 동일 — 타이틀 글자와 링 사이 여백 확보 |
| 기존 `outline: none` | **제거** | GAP-1의 직접 원인. 제거 후 `:focus-visible`만 남김 |

**상태별 표현**:
- `start`/`paused`: 타이틀 텍스트색 `--color-text-primary` + 파란 포커스 링.
- `gameover`: 타이틀 텍스트색이 승자색(`--paddle-player`/`--paddle-cpu`, `data-winner` 기존 규칙)으로 바뀌어도 **포커스 링은 동일한 파란 `--color-focus-ring`** 유지(승자색과 링색이 분리되어 대비 확보).

**인터랙션(E3 대응)**: 타이틀에 포커스가 있는 상태에서 사용자가 `Tab`을 누르면 → 타이틀 링이 사라지고 다음 버튼의 기존 링이 나타난다. 두 규칙 모두 동일 토큰·동일 두께라 **시각적으로 충돌하지 않고 자연스럽게 이어진다**.

**reduced-motion(E7)**: 포커스 링은 색·두께 표시일 뿐 애니메이션이 아니므로 `prefers-reduced-motion`과 무관(원본 §7.3 방침 영향 없음).

### 5.2 하단 조작 안내 `.pong-hint` (GAP-2 / AC-H1·H3)

**대상**: `index.html`의 `.pong-hint`(현재 "↑ / ↓ 또는 코트를 드래그해 패들을 움직이세요").

**확정 워딩(권장)**:

```
↑ / ↓ 또는 드래그로 이동 · P / Esc 일시정지·재개 · R 재시작
```

- **포함 키 세트(필수)**: 이동(↑/↓ + 드래그) · 일시정지/재개(P/Esc) · 재시작(R). 세 구획을 ` · `로 구분(§4.3).
- **드래그 언급 유지**: 터치/포인터 조작 안내를 없애지 않는다(기존 요소 보존, planner nonGoals — 터치 회귀 금지).
- **props/상태**: 정적 텍스트, 상태 무관 상시 노출(기존과 동일). 상태별 문구 분기 없음.
- **360px**: §4.2 규칙에 따라 줄바꿈 허용·가로 스크롤 0.

### 5.3 start 오버레이 본문 `.pong-overlay__body` (GAP-2 / AC-H2)

**대상**: `main.js syncUi()`의 `status==='start'` 분기(현재 "11점 먼저 내면 승리 · ↑ / ↓ 또는 코트를 드래그해 조작").

**확정 워딩(권장)**:

```
11점 먼저 내면 승리 · Enter / Space 또는 시작 버튼으로 시작 · ↑ / ↓·드래그로 조작
```

- **포함(필수)**: 승리 조건(기존) + **시작 키(Enter/Space) 및 버튼** + 이동(↑/↓·드래그).
- start 화면에서는 아직 플레이 전이므로 일시정지/재시작 키는 생략(정보 과부하 방지) — 그 키들은 플레이 중 하단 `.pong-hint`(§5.2)가 상시 안내하므로 중복 불필요.

### 5.4 paused 오버레이 본문 `.pong-overlay__body` (③ 일시정지 상태 시각 피드백 / AC-P2·P4 시각 대응)

**대상**: `main.js syncUi()`의 `status==='paused'` 분기(현재 "계속하려면 계속하기를 누르세요").

**확정 워딩(권장)**:

```
계속하기 버튼 또는 P / Esc 로 재개
```

- **포함(필수)**: 재개 수단 두 가지 — "계속하기" 버튼(기존) + **키(P/Esc)**. 키보드 사용자가 버튼으로 Tab 이동 없이도 재개 가능함을 안내.
- **동결 시각 규칙(문서화)**: paused 상태에서 코트 뒤 canvas는 scrim(`--overlay-scrim`) 아래로 **어둡게 비치되, 동결된 공(`--ball-color`)과 양쪽 패들이 정지 위치 그대로 계속 보인다**(사라지지 않음). 이는 `main.js render()`가 공을 `playing`/`paused` 모두에서 그리는 기존 동작의 **시각 계약을 명문화**한 것(AC-P2). 별도 CSS/JS 변경 불필요 — 문서화로 회귀 가드 기준 제공.

### 5.5 버튼 포커스 링 `.pong-btn:focus-visible` (AC-F2 — 보존 확인, 변경 대상 아님)

기존 `.pong-btn:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; }`(styles.css 274~277행)는 **그대로 유지**한다. 본 축에서 손대지 않으며, §5.1 타이틀 링이 이 값과 동일함을 확인하는 기준점이다(회귀 없음).

### 5.6 컴포넌트 → AC 매핑 요약

| 컴포넌트 | 변경 유형 | 관련 AC |
|---|---|---|
| `.pong-overlay__title:focus-visible` | **신규 CSS 규칙 1건** + `outline:none` 제거 | AC-F1, AC-F3 |
| `.pong-hint`(텍스트) | 콘텐츠 갱신 | AC-H1, AC-H3 |
| start `.pong-overlay__body`(텍스트) | 콘텐츠 갱신 | AC-H2 |
| paused `.pong-overlay__body`(텍스트) | 콘텐츠 갱신 | AC-P2·P4(시각 안내) |
| `.pong-btn:focus-visible` | **무변경(보존)** | AC-F2 |
| 코트 동결 렌더 | **무변경(문서화)** | AC-P1·P2 |

---

## 6. dev 구현 가이드 (BF-961용 — 단계별)

> 원칙: **CSS 규칙 1건 추가 + 텍스트 콘텐츠 3곳 갱신**이 전부다. `logic.js`·포인터 입력·물리·상태 모델은 손대지 않는다(planner §4 nonGoals). 기존 키보드 핸들러(`onKeyDown`/`onKeyUp`)는 이미 정상이라 변경 불필요.

### 6.1 CSS — 포커스 링 추가 (`phase18-games/pong/styles.css`)

`.pong-overlay__title` 규칙(202~207행)에서 `outline: none;`을 **제거**하고, 바로 아래에 `:focus-visible` 규칙을 추가:

```css
.pong-overlay__title {
  margin: 0;
  font: 700 clamp(24px, 7vw, 34px) / 1.2 var(--font-mono);
  color: var(--color-text-primary);
  /* outline: none;  ← 제거 (GAP-1 직접 원인) */
}

.pong-overlay__title:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

- 신규 토큰/색 리터럴 도입 금지 — `--color-focus-ring` 재사용(styles.css 19행에 이미 존재).
- `.pong-btn:focus-visible`(274~277행)은 손대지 말 것(AC-F2 보존).

### 6.2 문구 — 하단 hint (`phase18-games/pong/index.html`, 78~80행)

```html
<p class="pong-hint">
  ↑ / ↓ 또는 드래그로 이동 · P / Esc 일시정지·재개 · R 재시작
</p>
```

- 키 세트(이동·일시정지/재개·재시작) 누락 없이 유지하면 워딩 세부는 재량. 단, 드래그(터치) 안내를 삭제하지 말 것(기존 요소 보존).

### 6.3 문구 — 오버레이 본문 (`phase18-games/pong/main.js`, `syncUi()`)

- `status==='start'` 분기(103~104행) `overlayBody.textContent`:
  ```js
  overlayBody.textContent =
    "11점 먼저 내면 승리 · Enter / Space 또는 시작 버튼으로 시작 · ↑ / ↓·드래그로 조작";
  ```
- `status==='paused'` 분기 `overlayBody.textContent`:
  ```js
  overlayBody.textContent = "계속하기 버튼 또는 P / Esc 로 재개";
  ```
- `gameover`·`point-paused` 분기는 **변경 없음**.

### 6.4 360px 검증 (AC-H3)

- 320px·360px 폭에서 가로 스크롤 0 확인(`scrollWidth <= clientWidth`). 문구가 2~3줄로 줄바꿈되는 것은 허용, 가로 스크롤은 불가.
- 문구가 예상보다 길어 스크롤이 생기면 워딩을 축약(예: "일시정지·재개" → "일시정지")하되 **키 문자 자체(P/Esc/R/Enter/Space)는 남길 것**.

### 6.5 접근성 체크리스트 (본 축 관련)

- [ ] 오버레이 타이틀에 프로그램 포커스가 갈 때 `:focus-visible` 링이 보인다(대비 충분).
- [ ] 버튼 포커스 링(기존)이 회귀 없이 유지된다.
- [ ] hint/오버레이 문구가 키보드 조작을 빠짐없이 안내한다(키보드 단독 플레이 가능).
- [ ] 스코어보드 `aria-live`(기존)는 변경하지 않는다.

### 6.6 하지 말 것

- ❌ 신규 색 HEX/rgba, 신규 CSS 토큰 추가.
- ❌ `<kbd>` 등 신규 마크업 요소 도입(순수 텍스트 콘텐츠 갱신만).
- ❌ `.pong-btn:focus-visible`·터치/포인터 핸들러·`logic.js`·상태 모델 변경.
- ❌ 오버레이/hint의 레이아웃 박스·spacing·breakpoint 변경.
- ❌ 키맵 자체 확장(새 키 바인딩 추가) — 기존 키맵을 문구로 **안내**만 함.

---

## 7. mockup 참조

- 파일: `docs/design/mockups/pong-maintenance-BF-960.html`
- 내용: 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`). 원본 토큰을 `:root`에 그대로 정의하고 아래 시각을 시뮬레이션:
  1. **start 오버레이** — 타이틀 포커스 링(모의) + 시작/이동 키 안내 본문(§5.3).
  2. **paused 오버레이** — 타이틀 포커스 링 + 재개 키(P/Esc) 안내 + scrim 뒤 동결된 공·패들(§5.4).
  3. **gameover 오버레이** — 승자색 타이틀 + 포커스 링(§5.1).
  4. **하단 조작 안내(`.pong-hint`)** — 키보드 단축키 전체 워딩(§5.2).
  5. **포커스 링 비교 섹션** — 오버레이 타이틀 링 vs 버튼 링이 동일 토큰임을 나란히 시각 확인(AC-F3).
  6. **360px 시뮬레이션 섹션** — 좁은 폭에서 hint 줄바꿈·가로 스크롤 없음 확인(AC-H3).
- dev 참고용 시각 가이드이며 픽셀 단위 일치 의무 없음. UX 의도(포커스 가시성·키 안내 완전성·동결 표현) 전달이 목적.

---

## 8. AC 매핑 및 Self-critique

### 8.1 BF-960 수용 기준 매핑

| 수용 기준(task) | 충족 근거 |
|---|---|
| Given 기획 명세, When 디자인 명세를 작성하면, Then 포커스 링·조작 안내·일시정지 상태 표시의 시각 규칙이 AC와 매핑된다 | §5.1(AC-F1·F3 포커스 링) · §5.2·§5.3(AC-H1·H2·H3 조작 안내) · §5.4(AC-P2·P4 일시정지 동결 시각) · §5.6 컴포넌트→AC 매핑표 · §8.2 planner AC 커버리지 |
| Given 기존 Pong UI, When 디자인하면, Then 무관 파일 변경 없이 pong 디자인 명세만 산출된다 | File Ownership `docs/design/pong-*.md` 준수(`pong-maintenance-BF-960.md` + `mockups/pong-maintenance-BF-960.html`만 산출). 원본 토큰·레이아웃 값 불변 승계(§2·§3·§4), 신규 색/토큰 0건, 터치·물리·상태 모델 nonGoals 보존 명시(§0 전제 3·§6.6) |

### 8.2 planner AC → 시각 커버리지

| planner AC | 본 시안 커버 |
|---|---|
| AC-F1 오버레이 타이틀 포커스 링 표시 | §5.1(규칙) · §7 mockup 오버레이 3종 |
| AC-F2 버튼 포커스 링 회귀 없음 | §5.5(보존 명시) · §6.1(손대지 말 것) |
| AC-F3 타이틀 링 = 버튼 링 동일 토큰 | §5.1 값 동일 · §7 포커스 링 비교 섹션 |
| AC-H1 hint에 이동·일시정지·재시작 키 | §5.2 워딩 |
| AC-H2 start 오버레이에 시작·이동 키 | §5.3 워딩 |
| AC-H3 360px 가로 스크롤 없음 | §4.2·§6.4 · §7 360px 섹션 |
| AC-P2 일시정지 중 공 동결·계속 보임 | §5.4 동결 시각 규칙(문서화) |
| AC-P4 재개 안내(P/Esc/버튼) | §5.4 워딩 |
| AC-K1~K7(키보드 동작), AC-P1·P3(로직 동결) | 시각 대상 아님 → dev(BF-961)/tester(BF-963) 영역, §0 전제 1에서 범위 밖 명시 |

### 8.3 Self-critique (5항목 — PR commit 직전 점검)

1. **AC 매핑**: task 수용 기준 2건 + planner AC(F1~F3·H1~H3·P2·P4) 전부 §5·§8.1·§8.2에 매핑 완료. 키보드 동작(K계열)·로직 동결(P1·P3)은 시각 대상이 아니므로 dev/tester 영역으로 명시 분리 — **누락 없음**.
2. **dev 구현 가이드**: §6에 CSS 정확한 diff(§6.1) + 문구 3곳의 파일·행 위치·코드(§6.2·§6.3) + 360px 검증 기준(§6.4) + 하지 말 것(§6.6)까지 단계별로 제시 — dev가 바로 따라 구현 가능.
3. **기존 요소 보존**: 원본 토큰·타이포·레이아웃 값 불변 승계(§2·§3·§4), 버튼 포커스 링·터치 조작·물리·상태 모델 무변경(§5.5·§6.6·§0 전제 3) 명시 — 회귀 위험 지점 flag 완료.
4. **컴포넌트 매핑**: 변경 대상 컴포넌트 4곳(타이틀 CSS·hint·start 본문·paused 본문) + 보존 2곳(버튼 링·동결 렌더)을 §5.6 표로 AC와 1:1 매핑 — dev가 "무엇을 어디까지" 명확.
5. **모호함 flag**: 워딩은 §5에서 확정(권장)하되 dev 재량 범위(키 세트 누락 없음·가로 스크롤 없음)를 명시(§0 전제 4). 남은 판단 필요 항목 — "360px에서 문구가 3줄을 넘어 시각적으로 답답할 경우 축약 우선순위"(§6.4)를 dev/운영자 재량으로 열어둠. 그 외 미해결 모호함 없음.

---

<!-- bf:pr-summary -->
## Summary

BF-960 · Pong 키보드 조작·포커스 UI 디자인 명세(`docs/design/pong-maintenance-BF-960.md`) + 시각 mockup(`docs/design/mockups/pong-maintenance-BF-960.html`)을 작성했다. planner(BF-959)가 실측한 3 gap 중 디자인 영역 2건 — ① 오버레이 타이틀 포커스 표시 제거(`outline:none`), ② 조작 안내 문구의 키보드 단축키 누락 — 의 시각 규칙과, ③ 일시정지 상태 동결 시각 피드백을 명세했다. 원본 Pong 디자인(BF-910)의 팔레트·타이포·레이아웃 토큰은 **값 불변 승계**하고 **신규 색/토큰 0건**(포커스 링은 기존 `--color-focus-ring` 재사용). 터치 조작·물리·상태 모델은 nonGoals로 보존 못박음.

## 토큰 매핑 표

| 시각 요소 | 토큰(기존 재사용) | 값 |
|---|---|---|
| 오버레이 타이틀 포커스 링(신규 적용) | `--color-focus-ring` | `rgba(91,130,240,0.55)` · 3px · offset 2px |
| 버튼 포커스 링(보존) | `--color-focus-ring` | 동일(AC-F3 일관성) |
| 일시정지 동결 공(계속 보임) | `--ball-color` | `#f5f7fa` |
| `.pong-hint` 배경 | `--color-bg-subtle` | `#1c2431` |

## Changes

- `docs/design/pong-maintenance-BF-960.md` — 시안 개요(§1) · 팔레트/타이포 승계(§2·§3) · 문구 배치·360px 동작(§4) · 컴포넌트 명세(§5: 타이틀 `:focus-visible`·hint·start/paused 본문 워딩) · dev 구현 가이드(§6: CSS diff + 문구 3곳) · mockup 참조(§7) · AC 매핑/Self-critique(§8).
- `docs/design/mockups/pong-maintenance-BF-960.html` — start/paused/gameover 오버레이·하단 hint·포커스 링 비교·360px 시뮬레이션 시각 mockup.

## Self-critique

- **AC 매핑**: task AC 2건 + planner AC(F1~F3·H1~H3·P2·P4) 전부 매핑(§8.1·§8.2). 키보드 동작(K계열)·로직 동결(P1·P3)은 시각 대상 아님 → dev/tester 영역으로 명시 분리.
- **dev 구현 가이드**: CSS 정확한 diff + 문구 3곳 파일·행·코드 + 360px 검증 기준 제시(§6).
- **기존 요소 보존**: 원본 토큰·타이포·레이아웃 불변 승계, 버튼 포커스 링·터치·물리·상태 모델 무변경 명시(§0·§5.5·§6.6).
- **컴포넌트 매핑**: 변경 4곳·보존 2곳을 AC와 1:1 매핑(§5.6).
- **모호함 flag**: 워딩 확정(권장)하되 dev 재량 경계(키 세트 유지·가로 스크롤 없음) 명시. 360px 3줄 초과 시 축약 우선순위만 dev/운영자 재량으로 열어둠.
<!-- /bf:pr-summary -->

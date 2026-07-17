# Simon Says 유지보수 designer 명세 — 접근성·reduced-motion·세션복구 (BF-948)

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 관련 티켓: BF-948(본 designer task) · 선행 planner BF-947(`docs/plan/simon-says-maintenance-BF-947.md`) · 형제 dev BF-949 · tester BF-951
> 기반 명세(SSOT 승계): `docs/design/simon-says-BF-936.md`
> 대상 모듈: `phase18-games/simon-says/`(기존 구현 BF-937 — **유지보수**, 신규 아님)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 `:root` 직접 정의
> 산출물: 본 명세 markdown **1건** (mockup HTML 미생성 — 사유 §0·§7)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**전제 1 — 본 명세는 BF-936 의 "증분 addendum" 이다.** 기존 4색 패드·레이아웃·컬러/타이포 토큰은 `docs/design/simon-says-BF-936.md` 를 **값 불변 승계**한다. 본 문서는 그 위에 planner BF-947 이 확정한 3개 개선 축 — ① 접근성 능동 공지 ② visibility 일시정지 ③ 최고점수 영속 저장(실패 시 게임 유지) — 에 대한 **접근성 상태·focus·모션 명세만** 추가한다.

**전제 2 — File Ownership 준수로 mockup HTML 미생성.** 본 task 의 수정 가능 경로는 `docs/design/simon-says-*.md` 로 고정돼 있고, planner BF-947 §4 nonGoals 가 `docs/design/mockups/**` 를 명시적 비대상으로 지정했다. 또한 본 task 는 신규 컬러/타이포 토큰을 **0건** 도입하며(§2), 시각 시안은 BF-936 mockup(`docs/design/mockups/simon-says-BF-936.html`)을 그대로 승계한다. 따라서 신규 mockup 파일을 만들지 않고 **명세 markdown 1건만** 산출한다. 신규 시각 요소(최고기록 chip·일시정지 상태)는 §4·§5 에 마크업/토큰 매핑으로 dev 가 구현 가능한 수준까지 정의한다. (배경: planner nonGoals + File Ownership 이 일반 designer 템플릿의 mockup 기본값보다 우선.)

**전제 3 — 색 토큰 신규 발명 금지, 승계 우선(Simplicity First).** 최고기록 표시·일시정지 표시·새 기록 강조 모두 BF-936 §2.1 표준 토큰(`--color-text-secondary`, `--color-success`, `--status-info` 등)을 재사용한다. 신규 색값 정의 없음.

**전제 4 — 코드/규칙 불변.** designer 산출물은 명세까지다. `logic.js` 의 시퀀스 생성·판정 공식(`handleInput`/`randomPad`/`startGame`)은 불변(planner §가정 5). visibility 일시정지는 **재생 타이머**의 문제이지 게임 규칙의 문제가 아니다.

**전제 5 — 라운드 정의 승계.** planner §6/E4 권장대로 "최고 기록" = **게임오버 시점 `state.round`**(도전 중이던 라운드 번호)로 통일한다. UI 문구는 "최고 기록 N 라운드" 로 표기한다.

---

## 1. 시안 개요

### 1.1 변경 범위
BF-936 화면(header / status / pad-grid+round-badge / controls / hint)에 아래를 **증분 추가**한다.

| 축 | 신규 UI/상태 | 위치 |
|---|---|---|
| ① 접근성 | 라운드 변경·새 기록의 **능동 스크린리더 공지** | 기존 `.status` 라이브 리전 재사용 |
| ① 접근성 | **최고기록 chip**(`.best-score`) — 접근 가능한 이름 보유 | header 영역(타이틀 하단) |
| ② visibility | **일시정지 상태**(`.status--paused`) + 안내 문구 | 기존 `.status` |
| ③ 최고점수 | 최고기록 값 표시 + 새 기록 갱신 시각 피드백 | `.best-score` |

### 1.2 사용자 경험 목표
1. **스크린리더 사용자도 진행을 "듣는다"** — 라운드 증가·새 최고기록·일시정지/재개가 시각 없이도 능동 전달된다.
2. **자리를 비워도 안전하다** — 탭을 벗어나면 재생/입력이 멈추고, 돌아오면 정확히 그 지점부터 이어진다(관찰 기회 손실·억울한 오답 없음).
3. **기록이 남는다** — 재방문해도 최고기록이 보이고, 저장이 실패해도 게임은 절대 멈추지 않는다.
4. **모션 최소 사용자 배려 유지** — 신규 시각 효과도 `prefers-reduced-motion` 에서 애니메이션 없이 값만 갱신(기존 규칙 회귀 없음).

---

## 2. 컬러 팔레트 (신규 토큰 0건 — BF-936 §2.1/§2.2 전량 승계)

본 task 는 **신규 색 토큰을 정의하지 않는다.** 아래는 신규 UI 가 재사용하는 기존 토큰 매핑이다.

| 신규 UI 용도 | 승계 토큰 | 값(참조) |
|---|---|---|
| 최고기록 라벨·기본 텍스트 | `--color-text-secondary` | `#9AA7B8` |
| 최고기록 chip 배경 | `--color-bg-subtle` | `#1C2431` |
| 최고기록 chip 보더 | `--color-border-default` | `#273140` |
| "새 최고 기록" 강조 텍스트/보더 | `--color-success` | `#4ADE80` |
| 일시정지 상태 텍스트 | `--status-info` | `#9AA7B8` |
| "기록 없음" 폴백 텍스트 | `--color-text-muted` | `#63708A` |

> dev 참고: 위 토큰은 이미 `styles.css` `:root` 에 존재한다. 신규 `:root` 선언 불필요 — 참조만.

---

## 3. 타이포그래피 (BF-936 §3 승계)

신규 타이포 역할 없음. 최고기록 chip 은 기존 스케일 재사용:

| 요소 | font 규격(승계 기준) |
|---|---|
| 최고기록 라벨("최고 기록") | `600 12px/1.2 sans`, letter-spacing .06em, uppercase (round-badge 라벨과 동일 규격) |
| 최고기록 값("N 라운드") | `700 14px/1 mono` (숫자 강조, round 값 계열 축소) |
| 일시정지 상태 텍스트 | `.status` 규격 그대로(`600 clamp(15px,4.5vw,18px)/1.35 sans`) |

---

## 4. 레이아웃

### 4.1 최고기록 chip 배치
```
┌───────────────────────────────────┐
│  header: "Simon Says"  (h1)       │
│  ┌───────────────────────────┐    │  ← 신규: 최고기록 chip
│  │ 최고 기록  ·  7 라운드      │    │     타이틀 바로 아래, 중앙 정렬
│  └───────────────────────────┘    │
├───────────────────────────────────┤
│         status 텍스트 (live)       │  ← 라운드/일시정지 공지 재사용
│      ┌─────────┬─────────┐        │
│      │ Green ↖ │  Red ↗  │        │
│      ├─────────┼─────────┤        │  ← 2×2 pad grid (BF-936 그대로)
│      │Yellow ↙ │ Blue ↘  │        │     중앙 코어 round-badge
│      └─────────┴─────────┘        │
│   [ 시작 ]   [ 다시하기 ]          │
│   조작 안내 …                      │
└───────────────────────────────────┘
```

- 최고기록 chip 은 **`.simon-app` 안, `.app__title` 직후, `.status` 앞**에 위치(문서 순서 = 시각 순서).
- 형태: 가로 pill(`--radius-pill`), `--color-bg-subtle` 배경, `--color-border-default` 1px 보더, `padding: --space-2 --space-4`, 중앙 정렬.
- **초기 렌더부터 항상 보임**(게임 시작 전에도 표시 — AC-C4). 기록이 없으면 "최고 기록 · 기록 없음"(`--color-text-muted`).

### 4.2 반응형
- BF-936 §4.4 브레이크포인트 승계. chip 은 모든 폭에서 단일 행 유지(값이 최대 3자리라 줄바꿈 불필요), `max-width: 88vw` 초과 시 좌우 패딩만 축소.

### 4.3 일시정지 상태의 레이아웃
- **레이아웃 이동 없음.** 일시정지는 `.status` 텍스트/색 변경 + (선택) pad-grid 위 미세 dim 오버레이로만 표현하여 화면 구조가 흔들리지 않게 한다(복귀 시 위치 혼란 방지).

---

## 5. 컴포넌트 명세

### 5.1 최고기록 chip (`.best-score`) — 신규

```html
<div class="best-score" data-role="best-score">
  <span class="best-score__label">최고 기록</span>
  <span class="best-score__value" data-role="best-round">기록 없음</span>
</div>
```

| 속성 | 값 | 의미 |
|---|---|---|
| `.best-score__value[data-role="best-round"]` | "N 라운드" / "기록 없음" | 최고기록 값. dev 가 갱신 |
| 접근 가능한 이름 | 아래 §5.4 방식 | 스크린리더가 "최고 기록 N 라운드" 로 읽음 (AC-A2) |

**상태(state) 3종:**

| 상태 | 클래스 | 시각 | 문구 |
|---|---|---|---|
| 기록 없음(초기·저장실패 폴백) | (기본) | `--color-text-muted` 값 | "기록 없음" |
| 기록 있음 | (기본) | `--color-text-secondary` 라벨 + `mono` 값 | "N 라운드" |
| 새 기록 갱신 순간 | `.best-score--new`(≈1.2s 후 제거) | 값·보더 `--color-success`, (모션 허용 시) 짧은 pop | "N 라운드" |

- `.best-score--new` 의 pop 은 **모션 신호 부가일 뿐**, 색·값 변화가 1차 신호다(색맹·저시력 안전).

### 5.2 상태 표시 확장 (`.status`) — 기존 재사용

기존 `.status[role="status"][aria-live="polite"]` 을 그대로 쓰되, **상태 문구에 라운드 정보를 포함**하고 **일시정지 상태를 추가**한다.

| 게임 상태 | 텍스트(권장 예시) | 색 modifier |
|---|---|---|
| 대기(idle) | "시작을 눌러 주세요" | (기본 `--status-info`) |
| 시퀀스 재생(watch) | "라운드 N · 잘 보세요…" | `.status--watch` |
| 입력 대기(input) | "라운드 N · 당신 차례입니다" | `.status--your-turn` |
| 라운드 완주 순간 | "좋아요! 라운드 N 진행" | `.status--success` |
| 실패(gameover) | "틀렸습니다 — 최고 기록 N 라운드" | `.status--fail` |
| **일시정지(신규)** | "일시정지 — 탭으로 돌아오면 이어서 진행됩니다" | **`.status--paused`** |

> **AC-A1 충족 근거:** 라운드 변경이 `.status` 텍스트(라이브 리전)에 반영되므로 `aria-live="polite"` 가 능동 공지한다. `round-badge`(`role="img"`)에 별도 `aria-live` 를 얹지 않는 이유: role=img + 잦은 aria-live 갱신은 스크린리더에서 중복·소음 공지를 유발하므로, **단일 라이브 리전(`.status`)에 통합**하는 것이 접근성 best practice 다. `round-badge` 의 `aria-label` 은 온디맨드 읽기용으로 계속 갱신(BF-936 §5.3 유지).

**`.status--paused` CSS 신규 규칙(dev 가이드):**
```css
.status--paused { color: var(--status-info); }
```

### 5.3 일시정지 / 재개 상태 전이 (visibility) — 핵심

**상태 전이표** (트리거: `document.visibilitychange` → `document.hidden`)

| 진입 시점 상태 | 탭 hidden 시(pause) | 탭 visible 복귀 시(resume) |
|---|---|---|
| `watch`(재생 중) | 재생 타이머 정지, 잔여 지연 보존, `.status--paused` 안내, 패드 `aria-disabled=true` | 멈춘 지점부터 잔여 지연 기준 재개, `.status--watch` "라운드 N · 잘 보세요…" 복원 (건너뛴 점등 없음 — AC-B2) |
| `input`(입력 대기) | 입력 무시(패드 `aria-disabled=true`), `inputIndex` 보존, `.status--paused` 안내 | `.status--your-turn` "라운드 N · 당신 차례입니다" 복원, 패드 재활성(`aria-disabled` 해제), `inputIndex` 그대로 (억울한 오답 없음 — AC-B2·E2) |
| `idle` / `gameover`(정적) | **부수효과 없음**(정지 대상 아님 — AC-B3) | 부수효과 없음 |

**사용자 안내(AC-A4):**
- 일시정지 진입 시 `.status` 를 "일시정지 — 탭으로 돌아오면 이어서 진행됩니다" 로 갱신 → `aria-live="polite"` 가 스크린리더에 정지 사실을 공지.
- 재개 시 직전 상태 문구로 복원 → 재개 사실도 라이브 리전으로 전달.

**입력 차단(AC-B1·E3):**
- 일시정지 중 패드는 `aria-disabled="true"`(BF-936 §5.1 disabled 시각: not-allowed, hover 무효). 전역 숫자키 입력도 무시(dev: `visibilitychange` pause 플래그 또는 `STATUS.PAUSED` 확인).

**focus 처리 원칙:**
- **일시정지/재개 시 focus 를 강제 이동하지 않는다.** 자동 focus 이동은 키보드/스크린리더 사용자에게 방향 감각 상실을 유발하므로, focus 는 사용자가 둔 위치에 유지한다. 패드는 `aria-disabled` 로만 입력을 막고(포커스는 여전히 가능하되 활성 무효), 복귀 시 `aria-disabled` 해제로 자연 복원.
- 재개 후 패드에 focus 가 있던 경우 그대로 유지 → 사용자는 Enter/Space 로 즉시 이어서 조작 가능.

**"다시하기" 상호작용(AC-B4):**
- 일시정지 상태에서 "다시하기" 클릭 시 기존 `clearPlaybackTimers()` 경로로 새 게임 시작. dev 는 pause 상태에서 보존한 잔여 타이머/플래그를 `startNewGame()` 진입 시 반드시 초기화하여 재개 타이머와 새 재생이 충돌·중복하지 않게 한다.

### 5.4 최고기록 접근성 (AC-A2)

`.best-score` 가 스크린리더에서 "최고 기록 N 라운드" 로 읽히도록 **택1**(dev 재량):

- **방식 A(권장):** 시각 텍스트 자체를 완결 문장으로 구성 — 라벨 "최고 기록" + 값 "7 라운드" 가 DOM 텍스트로 연속 노출되므로 별도 `aria-label` 없이도 순서대로 읽힘. 값 갱신 시 `data-role="best-round"` 텍스트만 교체.
- **방식 B:** `.best-score` 에 `aria-label="최고 기록 7 라운드"` 를 부여하고 값 변경 시 `aria-label` 동기 갱신.

**새 기록 능동 공지(AC-A2 + AC-A1 통합):**
- 게임오버 시 새 최고기록이 갱신되면 **`.status` 라이브 리전 문구**를 "틀렸습니다 — 새 최고 기록! N 라운드" 로 구성하여 1회 능동 공지한다(별도 두 번째 라이브 리전 신설 금지 — 다중 라이브 리전 경합 방지).
- 기록 미갱신(기존 이하)이면 "틀렸습니다 — 최고 기록 N 라운드"(현 최고값 재고지).

### 5.5 reduced-motion 규칙 (AC-A3 · E7)

기존 `styles.css` 하단 media query(BF-936 §5.7 승계 — `.pad.is-lit` scale/glow 제거, 보더 대체)는 **회귀 없이 유지**한다. 신규 시각 효과는 아래를 준수:

| 신규 효과 | 기본(모션 허용) | `prefers-reduced-motion: reduce` |
|---|---|---|
| `.best-score--new` 새 기록 pop | 짧은 scale pop(≤200ms) + 색 전환 | **애니메이션 없이 색·값만 즉시 갱신** |
| 일시정지 dim 오버레이(선택) | opacity 트랜지션 | 트랜지션 없이 즉시 표시/해제 |
| 라운드 완주 status 색 전환 | 기존 `transition:color`(BF-936) | 기존 규칙대로 `transition:none` |

**dev 가이드 — 신규 규칙을 기존 media query 블록에 append:**
```css
@media (prefers-reduced-motion: reduce) {
  /* 기존: .pad,.status,.btn { transition:none } / .pad.is-lit { ... } — 유지 */
  .best-score { transition: none; }
  .best-score--new { animation: none; }   /* 값·색만 갱신, pop 미적용 */
}
```
> **회귀 가드:** 기존 media query 내 `.pad.is-lit { transform:none; box-shadow:0 0 0 3px var(--color-text-primary); }` 규칙은 **삭제·수정 금지**. 신규 셀렉터만 추가.

### 5.6 최고점수 저장 실패 폴백 (AC-C5) — 게임 유지 원칙

- `localStorage` 접근 불가(비공개 모드 예외 / quota 초과 / 값 손상) 시 **예외가 게임을 절대 중단시키지 않는다.**
- UI 표현: `.best-score__value` 를 "기록 없음"(`--color-text-muted`)으로 폴백. 최고기록만 0/미표시일 뿐, 시작·재생·입력·게임오버 전 흐름은 정상 동작.
- 저장 실패는 사용자에게 별도 에러 토스트/모달로 알리지 않는다(과잉 알림 방지 — planner E5·`dice/storage.js` silent fallback 패턴 준용). 스크린리더에도 실패 자체는 공지하지 않는다("기록 없음" 정적 텍스트로 충분).
- dev 구현: 저장/조회를 try/catch 로 감싸 실패 시 0 반환(planner §5.3 `loadBestRound()` → 0). 자세한 storage API 는 planner §5(`createSimonStore`)를 따른다 — **본 명세 비대상(dev 재량)**, 단 "실패 시 게임 유지 + '기록 없음' 폴백" UI 계약은 필수.

---

## 6. dev 구현 가이드 (BF-949 단계별)

> logic.js 규칙 불변. 아래는 `index.html`·`styles.css`·`main.js`(및 planner 제안 `storage.js`) 증분 지침.

### STEP 1 — 최고기록 chip 마크업 (`index.html`, §4.1·§5.1)
- `.app__title` 직후, `.status` 앞에 `.best-score` 삽입(§5.1 스니펫). `data-role="best-round"` 값은 초기 "기록 없음".

### STEP 2 — chip 스타일 (`styles.css`, §2·§3)
- 신규 색 토큰 정의 금지 — 기존 `:root` 변수 참조만. pill/보더/패딩은 §4.1·기존 spacing 토큰.
- `.best-score--new` 강조 규칙 + §5.5 reduced-motion append.

### STEP 3 — 최고점수 저장/복원 (`main.js` + planner 제안 `storage.js`)
- 초기 렌더 시 `loadBestRound()` → chip 갱신(AC-C4, 게임 시작 전에도 표시).
- 게임오버 시 `saveBestRoundIfHigher(state.round)`(§전제 5 라운드 정의) → 갱신되면 `.best-score--new` + `.status` 새 기록 문구(§5.4).
- 저장/조회 try/catch → 실패 시 "기록 없음" 폴백(§5.6). **가드 테스트는 planner §5.4 대로 파일 단위로 개정**(신규 `storage.js` 만 `localStorage` 허용).

### STEP 4 — 라운드 능동 공지 (`main.js renderRound`/`setStatus`, §5.2)
- `.status` 문구에 "라운드 N ·" 접두를 포함(watch/input/success/fail). `round-badge` `aria-label` 갱신은 기존 유지.

### STEP 5 — visibility 일시정지/재개 (`main.js`, §5.3)
- `document.addEventListener("visibilitychange", …)`(planner §5.5). `document.hidden` 시:
  - 상태가 `watch`/`input` 이면 재생/피드백 타이머 pause(잔여 지연 보존) + `setPadsDisabled(true)` + `.status--paused` 안내.
  - `idle`/`gameover` 면 no-op(AC-B3).
- 복귀 시 잔여 지연 기준 재개 + 직전 status 복원 + `input` 이었으면 `setPadsDisabled(false)`. **focus 강제 이동 없음**(§5.3).
- "다시하기" 진입 시 pause 잔여 타이머/플래그 초기화(§5.3 AC-B4).

### STEP 6 — 권장 클래스/속성명 요약 (신규분만)
```
.best-score  .best-score__label  .best-score__value[data-role="best-round"]  .best-score--new
.status--paused
```
> 기존 클래스(`.status`, `.status--watch|your-turn|success|fail`, `.pad`, `.round-badge` 등)는 BF-936 §6.7 그대로.

---

## 7. mockup 참조

- **신규 mockup 미생성.** 사유: §0 전제 2(File Ownership `docs/design/simon-says-*.md` 한정 + planner §4 nonGoals `docs/design/mockups/**` 비대상 + 신규 색/타이포 토큰 0건).
- **시각 시안 승계:** BF-936 mockup(`docs/design/mockups/simon-says-BF-936.html`) — 4색 패드·상태 스냅샷·focus/hover 표현 그대로 유효.
- 본 명세가 추가하는 시각 요소는 (a) 최고기록 chip(§4.1·§5.1 마크업/토큰 매핑으로 dev 구현 가능), (b) 일시정지 상태(`.status` 문구/색 변경 — 신규 레이아웃 없음)뿐이며, 둘 다 기존 토큰 재사용이라 별도 mockup 없이 dev 가 명세만으로 구현 가능하다.

---

## 8. AC 매핑

| 수용 기준(planner BF-947 §2) | 충족 근거 |
|---|---|
| **AC-A1** 라운드 증가 능동 공지 | §5.2 `.status` 라이브 리전에 "라운드 N ·" 포함 + §6 STEP4. round-badge 중복 공지 회피 근거 명시 |
| **AC-A2** 최고기록 UI 접근 가능한 이름 | §5.1·§5.4 방식 A/B("최고 기록 N 라운드"). 새 기록 `.status` 능동 공지 |
| **AC-A3** reduced-motion 회귀 없음 | §5.5 기존 media query 불변 + 신규 셀렉터만 append, 새 기록 pop 은 reduce 시 미적용 |
| **AC-A4** 일시정지 상태 안내 | §5.3 `.status--paused` "일시정지…" 문구 → `aria-live="polite"` 공지 |
| **AC-B1** hidden 시 타이머 정지·입력 무시 | §5.3 상태 전이표(watch/input pause) + 패드 `aria-disabled`, 숫자키 무시(§6 STEP5) |
| **AC-B2** 멈춘 지점부터 재개 | §5.3 잔여 지연 기준 재개, `inputIndex` 보존, 건너뛴 점등/오답 없음 |
| **AC-B3** idle/gameover no-op | §5.3 전이표 "부수효과 없음" |
| **AC-B4** 일시정지 중 다시하기 정상 | §5.3·§6 STEP5 pause 잔여 타이머/플래그 초기화 |
| **AC-C1~C4** 저장·비교·갱신·복원 | §5.1 chip + §6 STEP3(초기 load 표시·게임오버 save·즉시 반영). 라운드 정의 §전제 5 |
| **AC-C5** 저장 실패 시 게임 유지 폴백 | §5.6 try/catch → "기록 없음" 폴백, 게임 흐름 무중단, 과잉 알림 금지 |

---

## 9. Self-critique

| 체크 항목 | 결과 |
|---|---|
| **① AC 전량 매핑** | §8 에 AC-A1~A4·B1~B4·C1~C5 **13개 전부** 명세 섹션과 1:1 매핑 완료 |
| **② dev 구현 가이드 구체성** | §6 STEP1~6 파일별·순서별 지침 + 신규 클래스/속성명(§6 STEP6) + reduced-motion append 코드 스니펫 제공 |
| **③ 기존 요소 보존** | 신규 색/타이포 토큰 0건(§2·§3), 기존 reduced-motion media query·`.pad.is-lit` 규칙 "삭제 금지" 명시(§5.5), BF-936 클래스 승계 명시 |
| **④ 컴포넌트 매핑** | 신규 `.best-score`(§5.1)·`.status--paused`(§5.2)를 실제 마크업/클래스로 정의, 나머지는 기존 셀렉터 재사용 |
| **⑤ 모호함 flag** | (a) 라운드 정의는 planner §6/E4 권장(gameover 시점 `state.round`)을 §전제 5 로 확정 승계 — 운영자 이견 시 BF-949 착수 전 조정. (b) storage API 세부(`createSimonStore` 시그니처)는 planner §5 소관·dev 재량으로 명시적 위임, 본 명세는 "실패 시 게임 유지 + 기록없음 폴백" UI 계약만 필수화. (c) 일시정지 dim 오버레이는 "선택"으로 표기 — 필수는 `.status` 문구/색뿐 |

**미해결/위임 항목:** 없음(필수 AC 전량 커버). 방향키 전체 매핑은 planner §4 nonGoals 대로 본 task 비대상.

<!-- bf:pr-summary -->
## 시안 요약

BF-936 명세 위에 planner BF-947 이 확정한 3개 유지보수 축의 **접근성·focus·모션 명세**를 증분 addendum(markdown 1건)으로 추가했습니다. **신규 색/타이포 토큰 0건**, 기존 BF-936 mockup·토큰을 값 불변 승계합니다.

**핵심 결정**
- **접근성 공지:** 라운드 변경·새 최고기록·일시정지/재개를 **단일 라이브 리전 `.status`(`aria-live=polite`)에 통합** 공지 — round-badge(role=img)에 aria-live 중복 부여 대신(다중 라이브 리전 경합·소음 방지).
- **visibility 일시정지:** watch/input 상태만 pause(idle/gameover no-op), 잔여 지연 기준 재개로 관찰 기회·`inputIndex` 보존. **focus 강제 이동 없음**(방향 감각 상실 방지).
- **최고점수:** header 하단 `.best-score` chip(초기 렌더부터 표시·AC-C4). 저장 실패 시 "기록 없음" 폴백 + **게임 무중단**(과잉 알림 금지).
- **reduced-motion:** 기존 media query 회귀 0 — 신규 셀렉터만 append, 새 기록 pop 은 reduce 시 미적용.

**mockup:** File Ownership(`docs/design/simon-says-*.md`) + planner nonGoals(`docs/design/mockups/**`) 준수로 신규 mockup 미생성, BF-936 시안 승계.

**신규 UI 토큰 매핑 (신규 색값 정의 없음)**

| 신규 UI | 승계 토큰 |
|---|---|
| 최고기록 라벨·값 | `--color-text-secondary` / `mono` |
| 최고기록 chip 배경·보더 | `--color-bg-subtle` / `--color-border-default` |
| 새 최고 기록 강조 | `--color-success` |
| 일시정지 상태 텍스트 | `--status-info` |
| 기록 없음 폴백 | `--color-text-muted` |

**dev 인계:** `.best-score`·`.status--paused` 신규 2개 셀렉터, 나머지는 BF-936 셀렉터 재사용. 상세 STEP1~6 은 명세 §6 참조.
<!-- /bf:pr-summary -->

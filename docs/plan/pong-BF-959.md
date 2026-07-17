# Pong 키보드·일시정지 유지보수 명세 — BF-959

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-959(본 planner task) · 형제 task BF-960(designer) · BF-961(developer) · BF-963(tester)
> 대상 모듈: `phase18-games/pong/`(기존 구현, BF-913) — **신규 모듈 아님, 유지보수**
> 선행 산출물: `docs/planning/pong-BF-910.md`(게임 규칙·상태·입력 SSOT, BF-911) · `docs/design/pong-BF-910.md`(디자인, BF-912)
> 개선 축 4개: ① 키보드 전용 조작 완전성(회귀 가드) ② 포커스 표시 ③ 조작 안내(hint) 보강 ④ 일시정지 중 점수/공 상태 동결(회귀 가드)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 본 task는 "범위 계약"이지 구현이 아니다:** File Ownership이 `docs/plan/pong-*.md`로 고정되어 있다. 코드(`phase18-games/pong/**`)는 BF-961(developer), 디자인(`docs/design/pong-*.md` 신규 topic)은 BF-960(designer)이 직접 작성한다. 본 문서는 "무엇을 어떤 기준으로 바꿔야 하는지"만 확정한다.

**가정 2 — 이번 축은 "0→1 신규 기능"이 아니라 "구현 완결성 검증 + 접근성/문서화 gap 보완"이다:** `phase18-games/pong/main.js` 실측 결과, 키보드 조작(시작·좌우 패들·일시정지·재개·재시작)은 원본 SSOT(`docs/planning/pong-BF-910.md` §5.2)대로 **이미 대부분 구현되어 있다**(`onKeyDown`/`onKeyUp`, 39~343행). 일시정지 중 점수/공 동결도 `stepPhysics()`가 `state.status === "playing"`일 때만 실행되도록 이미 게이트되어 있어 **로직상 이미 성립**한다. 본 task가 다루는 것은 신규 로직 발명이 아니라, 아래 §0 가정 4에서 실측한 **3건의 실제 gap**(포커스 표시·조작 안내 누락·테스트 커버리지 0)이다.

**가정 3 — context-widening: 원본 planner SSOT 확인 (Level 1):**
`context-widening: candidateFiles(docs/plan/pong-*.md, docs/design/pong-*.md, phase18-games/pong/**)만으로는 키보드 키맵·상태 전이·일시정지 동결이 "원래 무엇으로 확정되어 있었는지"(변경 여지가 있는 값인지 불변 계약인지) 판단할 근거가 없어, main.js/logic.js 코드 주석이 명시적으로 SSOT로 지목하는 docs/planning/pong-BF-910.md(§5.2 키보드 표·§6.2 상태 전이·§7.1 화면 문구 예시)를 1회 열람함.` — 저장소 root 재귀 탐색이 아닌 코드 주석이 직접 지목한 단일 기존 문서 열람이며, widening 예산(`maxCalls=3`) 중 1회만 사용.

**가정 4 — 실제 코드 실측 결과, 3개 gap이 실재한다 (추측 아님):**

- **[GAP-1] 포커스 표시 미흡**: `phase18-games/pong/main.js`의 `syncUi()`(129~132행)는 오버레이가 뜰 때(`start`/`paused`/`gameover`) `overlayTitle.focus()`를 호출해 프로그램적으로 포커스를 이동시킨다(`docs/design/pong-BF-910.md` §6.4 지침대로). 그런데 `styles.css` 202~207행 `.pong-overlay__title { ...; outline: none; }`가 바로 그 요소의 포커스 아웃라인을 명시적으로 제거하고 있다 — 키보드 사용자가 상태 전환(예: 일시정지) 시 포커스가 어디로 이동했는지 시각적으로 전혀 알 수 없다. `.pong-btn:focus-visible`(274~277행)만 정의되어 있고 오버레이 타이틀 전용 `:focus-visible` 규칙은 없다.
- **[GAP-2] 조작 안내에 키보드 단축키 누락**: `index.html`의 `.pong-hint`(78~80행, "↑ / ↓ 또는 코트를 드래그해 패들을 움직이세요")와 `main.js`의 start 오버레이 본문(`syncUi()` 103~104행, "11점 먼저 내면 승리 · ↑ / ↓ 또는 코트를 드래그해 조작") 어디에도 일시정지(`P`/`Escape`)·재시작(`R`)·시작/재도전(`Enter`/`Space`) 키 안내가 없다(`index.html`/`main.js` grep 실측: `P`, `Escape`, `Enter`, `Space`, `R` 문자열이 안내 문구에 0건). 원본 SSOT `docs/planning/pong-BF-910.md` §5.2 키맵 표에는 이미 정의돼 있으나 화면 문구에 전혀 반영되지 않았다.
- **[GAP-3] 키보드·일시정지 동결 회귀 테스트 0건**: `tests/pong-BF913.test.js`(단위)·`tests/e2e/pong/render-play-touch.test.js`(e2e) 어디에도 키보드 입력(`ArrowUp`/`ArrowDown`/`W`/`S`/`P`/`Escape`/`Enter`/`Space`/`R`) 또는 `paused` 상태 진입 시 점수·공 동결을 검증하는 테스트가 0건이다(grep 실측: `ArrowUp`/`키보드`/`paused` 관련 assertion 없음). 로직 자체는 정상(§가정 2)이지만 회귀 가드가 없어 향후 리팩터링 시 조용히 깨질 위험이 있다.

**가정 5 — 물리 상수·상태 전이 공식은 변경하지 않는다:** `logic.js`(순수 함수)와 `docs/planning/pong-BF-910.md` §3~§6이 정의한 물리 상수·상태 전이표는 SSOT로 불변 유지한다. 이번 축은 (a) 입력 처리 자체는 이미 정상이므로 변경 없음, (b) CSS/DOM 문구 보완(GAP-1, GAP-2), (c) 테스트 보강(GAP-3)에 한정된다.

**가정 6 — 터치 조작·게임 규칙은 명시적으로 보존 대상이다:** `main.js`의 Pointer Events 처리(`onPointerDown`/`onPointerMove`/`onPointerUp`, 358~384행)와 `logic.js`의 물리·CPU AI·득점·승리 공식은 이번 유지보수의 변경 대상이 아니며, 아래 §4 nonGoals·§2 AC에 "회귀 없음"을 명시적 수용 기준으로 못박는다.

---

## 1. 개선 범위 (to-be) 요약

| 축 | 현재 상태 (as-is, 실측) | 개선 목표 (to-be) |
|---|---|---|
| ① 키보드 전용 조작 완전성 | `main.js`에 시작·좌우 패들·일시정지·재개·재시작 전부 구현됨(§가정 2). 회귀 테스트 0건 | 기존 동작(키맵·상쇄·상태 가드) 변경 없이 유지 + 단위/e2e 회귀 가드 추가 |
| ② 포커스 표시 | `.pong-overlay__title{outline:none}`이 프로그램 포커스 대상의 시각 표시를 제거(GAP-1) | 오버레이 타이틀에 `:focus-visible` 포커스 링 표시(버튼과 동일 토큰) — 상태 전환마다 "지금 포커스가 여기 있다"가 시각적으로 드러남 |
| ③ 조작 안내(hint) | hint·start 오버레이 문구에 ↑/↓·드래그만 언급, 일시정지·재시작·시작 키 미언급(GAP-2) | 하단 조작 안내 + start 오버레이 본문에 키보드 단축키 전체(시작/일시정지·재개/재시작) 요약 반영 |
| ④ 일시정지 중 점수/공 상태 동결 | `stepPhysics()`가 `status==='playing'`일 때만 실행되어 로직상 이미 동결됨(§가정 2), 테스트 미검증(GAP-3) | 동일 동작(점수 불변·공 위치·속도 불변) 유지 + 회귀 테스트로 고정 |

---

## 2. Acceptance Criteria (Given/When/Then)

### 2.1 키보드 전용 조작 (회귀 가드 — 기존 동작 유지 확인)

- **AC-K1** Given `status=playing`, When `ArrowUp`/`W`를 누르고 있으면, Then 플레이어 패들이 `PADDLE_SPEED_KEYBOARD(480px/s)`로 위로 이동하고 `[0, PADDLE_Y_MAX(320)]` 범위로 클램프된다(`docs/planning/pong-BF-910.md` §5.2·§3.2 불변).
- **AC-K2** Given `status=playing`, When `ArrowDown`/`S`를 누르고 있으면, Then 동일 속도로 아래로 이동한다.
- **AC-K3** Given `ArrowUp`과 `ArrowDown`(또는 `W`/`S`)이 동시에 눌림, When 패들 이동이 계산되면, Then 순이동이 `0`으로 상쇄된다(어느 키도 우선하지 않음, §10.4 원본 근거).
- **AC-K4** Given 임의 상태, When `P` 또는 `Escape`를 누르면, Then `playing⇄paused` 토글만 일어나고 그 외 상태(`start`/`point-paused`/`gameover`)에서는 무시된다(no-op, 예외 없음).
- **AC-K5** Given `status=start` 또는 `status=gameover`, When `Enter`/`Space`를 누르면, Then `startGame()`이 호출되어 `playing`으로 전이되고 점수가 초기화된다(`status=paused`/`playing`에서는 무시).
- **AC-K6** Given `status`가 `playing`/`paused`/`gameover` 중 하나, When `R`을 누르면, Then 즉시 전체 초기화되어 새 게임이 시작된다(`status=start`에서는 이미 시작 화면이므로 무시).
- **AC-K7** Given `status`가 `start`/`point-paused`/`gameover`, When 패들 이동 키(`ArrowUp`/`ArrowDown`/`W`/`S`)를 누르면, Then 패들 위치가 변하지 않는다(`stepPhysics`가 `playing`에서만 실행되므로 자동 충족, §10.8 원본 근거).

### 2.2 포커스 표시

- **AC-F1** Given 오버레이가 표시되는 상태 전환(`start`/`paused`/`gameover` 진입), When `syncUi()`가 `overlayTitle.focus()`를 호출하면, Then 해당 타이틀 요소에 시각적으로 식별 가능한 `:focus-visible` 포커스 링이 표시된다(현재 `outline: none`으로 제거된 GAP-1 수정).
- **AC-F2** Given 키보드 사용자가 `Tab`으로 페이지를 순회, When 각 버튼(`.pong-btn` 3 variant)에 포커스가 이동하면, Then 기존 `--color-focus-ring` 3px 아웃라인이 회귀 없이 그대로 유지된다(기존 §5.5 디자인 계약 보존 확인용 — 변경 대상 아님).
- **AC-F3** Given 오버레이 타이틀 포커스 링을 추가, When 버튼 포커스 링과 나란히 비교하면, Then 동일 토큰(`--color-focus-ring`, 3px, offset 2px)을 사용해 시각적으로 일관되다(신규 토큰 발명 금지, Simplicity First).

### 2.3 조작 안내(hint)

- **AC-H1** Given 하단 조작 안내(`.pong-hint`), When 화면에 렌더되면, Then 패들 이동(↑/↓ 또는 드래그) + 일시정지/재개(`P`/`Esc`) + 재시작(`R`) 키를 모두 요약해 안내한다.
- **AC-H2** Given `status=start` 오버레이 본문, When 화면에 렌더되면, Then 시작 키(`Enter`/`Space` 또는 버튼)와 패들 조작 키가 함께 안내된다.
- **AC-H3** Given 문구 갱신, When 360px 뷰포트에서 렌더되면, Then 기존 반응형 레이아웃(§4.3 원본 근거, `≤360px` breakpoint)이 깨지지 않고 줄바꿈 허용 범위 내로 표시된다(가로 스크롤 발생 금지).

### 2.4 일시정지 중 점수/공 상태 동결 (회귀 가드 — 기존 동작 유지 확인)

- **AC-P1** Given `status=playing`에서 `status=paused`로 전이, When 일시정지 중 임의 시간이 경과하면, Then `score.player`/`score.cpu` 값이 전이 시점 그대로 불변이다.
- **AC-P2** Given `status=paused`, When 일시정지 중 임의 시간이 경과하면, Then `ball.x`/`ball.y`/`ball.vx`/`ball.vy`가 전이 시점 값 그대로 불변이며, 화면에도 정지된 위치로 렌더된다(`render()`의 공 그리기 조건이 `playing`/`paused` 모두 포함하므로 시각적으로도 "멈춘 공"이 계속 보임 — 사라지지 않음).
- **AC-P3** Given `status=paused`, When 사용자가 패들 이동 키(`ArrowUp`/`ArrowDown`)를 누르고 있어도, Then 패들 위치가 변하지 않는다(`stepPhysics`가 호출되지 않으므로 자동 충족).
- **AC-P4** Given `status=paused`에서 `status=playing`으로 복귀(`P`/`Escape`/"계속하기" 버튼), When 재개되면, Then 정지 시점 그대로(점수·공 위치·속도·패들 위치 불변) 이어서 진행되고, 일시정지 동안 경과한 실제 시간은 물리(`dt`)에 반영되지 않는다(`main.js` `loop()`가 매 프레임 `lastTime`을 갱신하므로 재개 직후 첫 프레임의 `dt`가 비정상적으로 크지 않음 — 기존 구현 재확인).

---

## 3. Edge Case / 실패 케이스

| # | 시나리오 | 기대 동작 |
|---|---|---|
| E1 | 일시정지 중 `ArrowUp`을 누른 채로 유지하다가 `P`로 재개 | 재개 즉시 눌려 있던 키 상태(`keys.up=true`)가 그대로 반영되어 패들이 곧바로 이동 시작(§가정 2 기존 동작 — 재개 후 키를 놓았다 다시 누를 필요 없음). 이는 사양으로 확정(§6 모호함 참고, 변경 불필요) |
| E2 | `point-paused`(득점 직후 자동 대기) 중 `P`/`Escape` 입력 | 무시됨(AC-K4) — 자동 서브 대기 흐름을 사용자가 방해할 수 없음, `docs/planning/pong-BF-910.md` §10.8 원본 근거와 일치 |
| E3 | 오버레이 타이틀에 포커스가 간 직후 사용자가 `Tab`을 눌러 버튼으로 이동 | 오버레이 타이틀의 신규 포커스 링(AC-F1)이 사라지고 다음 버튼의 기존 포커스 링(AC-F2)이 나타남 — 두 스타일이 충돌하지 않음 |
| E4 | 360px 뷰포트에서 hint 문구가 길어짐(GAP-2 보완 결과) | 2줄 이상 줄바꿈은 허용되나 가로 스크롤은 발생하지 않음(AC-H3) — 문구 길이 조절은 designer/dev 재량 |
| E5 | `gameover` 상태에서 `ArrowUp`/`ArrowDown` 입력 | 무시됨(AC-K7) — 승자 화면에서 패들이 움직이지 않음 |
| E6 | 일시정지 중 마우스로 코트를 드래그(포인터 입력) | `onPointerDown`이 `state.status !== "playing"`이면 즉시 return하므로 무시됨(§가정 6, 기존 동작 — 이번 축에서 변경하지 않음, 회귀 없음을 재확인) |
| E7 | 포커스 링 추가 후 `prefers-reduced-motion: reduce` 환경 | 포커스 링은 색상/두께 표시일 뿐 애니메이션이 아니므로 reduced-motion과 무관, 기존 §7.3 방침에 영향 없음 |

---

## 4. 비대상 (nonGoals)

- `logic.js`의 물리 상수·공식(벽 반사·패들 반사각·CPU AI·득점·승리 판정) 변경 — `docs/planning/pong-BF-910.md` §3~§4 SSOT 불변.
- 포인터/터치 입력 처리(`onPointerDown`/`onPointerMove`/`onPointerUp`, 포인터 캡처, `touch-action:none`) 변경 — 기존 그대로 보존, 회귀 없음만 검증(§2.4 관련 없음, E6).
- 새로운 키 바인딩 추가(예: WASD 외 추가 이동 키, 방향키 좌우 매핑 등) — 기존 키맵(§2.1)만 안내 문구에 반영, 키맵 자체 확장은 비대상.
- 상태 모델(`status` enum, `pointPausedAt` 등) 필드 추가/변경 — 기존 6개 상태(`start`/`playing`/`point-paused`/`paused`/`gameover`) 그대로.
- 영속 저장(`localStorage` 등) 도입 — 원본 SSOT(§0 가정 5) "브라우저 메모리 상태 모델" 유지, 본 축과 무관.
- `phase18-games/{simon-says,memory-match,breakout,snake}/**`, 저장소 최상위 개별 게임/앱 전부 — 기존 게임 코드 수정 금지.
- `src/**`, `package.json`, `package-lock.json`, `.github/**`, `prisma/**` — 공용 런타임/의존성/CI/인증.
- 사운드·파티클 등 부가 연출 추가 — 원본 §11 비범위 유지.

---

## 5. API 스펙 / 데이터 모델 (dev·designer 재량 허용, 방향만 고정)

본 축은 신규 API/데이터 모델이 없다(순수 DOM/CSS/문구 계약). 상태 모델(`logic.js` state shape)은 §4 nonGoals대로 불변이다.

### 5.1 CSS 변경 방향 (GAP-1)

`phase18-games/pong/styles.css`의 `.pong-overlay__title`(202~207행) — 기존 `outline: none;`을 제거하고, 버튼과 동일 토큰으로 `:focus-visible` 규칙을 추가하는 방향을 권장(세부 값은 dev 재량, 토큰은 아래로 고정):

```css
.pong-overlay__title:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

`--color-focus-ring`은 신규 토큰이 아니라 기존 `:root`(19행)에 이미 정의된 값을 재사용한다(신규 색 리터럴 0건 — Simplicity First).

### 5.2 문구 콘텐츠 변경 위치 (GAP-2)

- `phase18-games/pong/index.html` `.pong-hint`(78~80행): 패들 조작 + 일시정지/재개 + 재시작 키를 요약.
- `phase18-games/pong/main.js` `syncUi()`의 `status==='start'` 분기(103~104행, `overlayBody.textContent`): 시작 키 + 패들 조작 키 요약.
- 정확한 워딩·줄바꿈은 §6 모호함에서 designer/dev 재량으로 열어둔다(360px 제약만 AC-H3로 고정).

### 5.3 테스트 훅 참고 (GAP-3, BF-963용)

기존 e2e(`tests/e2e/pong/render-play-touch.test.js` 176~193행)는 `page.addInitScript`로 `PongLogic.createInitialState`를 몽키패치해 `window.__brixPongState`에 게임 상태 참조를 노출시키는 결정론 훅을 이미 사용 중이다. 키보드·일시정지 회귀 테스트(BF-963)도 동일 패턴을 재사용해 `window.__brixPongState.status`/`score`/`ball`/`paddles.player.y`를 직접 읽어 검증할 수 있다(신규 훅 발명 불필요).

---

## 6. 남은 모호함 (운영자 확인 권장, 필수 아님)

- **포커스 링 시각 톤**: 오버레이 타이틀 포커스 링을 버튼과 완전히 동일한 값(§5.1)으로 할지, 카드 타이틀 전용으로 살짝 다른 오프셋을 줄지는 designer(BF-960) 재량. 본 문서는 "동일 토큰 재사용"을 기본값으로 권장(AC-F3).
- **조작 안내 정확한 워딩**: "P/Esc 일시정지 · R 재시작" 류의 축약 표기 vs 완전한 문장 표기는 360px 공간 제약(AC-H3)을 고려해 designer/dev 재량. 예시 워딩: `"↑/↓ 또는 드래그로 이동 · P/Esc 일시정지 · R 재시작"` (확정 아님, 참고용).
- **일시정지 중 키 홀드 유지(E1)**: 재개 즉시 눌려 있던 키가 반영되는 현재 동작을 그대로 사양화했다. 운영자가 "재개 후 키를 놓았다 다시 눌러야 이동"을 원하면 별도 확인 후 본 문서 개정 필요 — 현재로서는 추가 요구 없어 기존 동작 유지가 Simplicity First에 부합.

---

## 7. Task Context Contract (JSON, 승인본은 문서 하단 마커 참고)

```json
{
  "contractVersion": "task-context-contract-v1",
  "candidateFiles": [
    "docs/plan/pong-*.md",
    "docs/design/pong-*.md",
    "docs/planning/pong-BF-910.md",
    "phase18-games/pong/**",
    "tests/pong-*.test.js",
    "tests/e2e/pong/**"
  ],
  "entryPoints": [
    "phase18-games/pong/index.html",
    "phase18-games/pong/main.js",
    "phase18-games/pong/styles.css",
    "phase18-games/pong/logic.js"
  ],
  "tests": [
    "tests/pong-BF913.test.js",
    "tests/e2e/pong/render-play-touch.test.js"
  ],
  "dependencyEvidence": [
    "main.js 실측(39~343행): 키보드 조작(시작·좌우 패들·일시정지·재개·재시작)이 이미 구현되어 있음 — 신규 로직 아님, 원본 SSOT(docs/planning/pong-BF-910.md §5.2)와 일치",
    "styles.css 202~207행 .pong-overlay__title{outline:none} — main.js syncUi()가 상태 전환마다 overlayTitle.focus()로 프로그램 포커스를 주는 대상인데 CSS가 시각적 포커스 표시를 제거함(GAP-1 실측)",
    "index.html .pong-hint(78~80행) + main.js start 오버레이 본문(103~104행) 실측: 일시정지(P/Esc)·재시작(R)·시작(Enter/Space) 키 안내 문자열 0건(GAP-2 실측)",
    "tests/pong-BF913.test.js + tests/e2e/pong/render-play-touch.test.js 전수 grep: ArrowUp/키보드/paused 관련 assertion 0건(GAP-3 실측)",
    "main.js stepPhysics()가 state.status==='playing'일 때만 호출됨(158~221행) — 일시정지 중 점수/공 동결은 이미 로직상 성립(§가정 2 근거)",
    "context-widening 실측: docs/planning/pong-BF-910.md §5.2 키맵 표·§6.2 상태 전이표·§7.1 화면 문구 예시가 원본 SSOT로 존재 — 이번 축의 키맵/상태 전이 자체는 변경 대상이 아님을 확인"
  ],
  "nonGoals": [
    "logic.js 물리 상수·공식(벽 반사/패들 반사각/CPU AI/득점/승리) 변경",
    "포인터/터치 입력 처리(onPointerDown/Move/Up, 포인터 캡처, touch-action:none) 변경",
    "신규 키 바인딩 추가(기존 키맵 확장) — 안내 문구 반영만 대상",
    "상태 모델(status enum, pointPausedAt 등) 필드 추가/변경",
    "localStorage 등 영속 저장 도입",
    "phase18-games/{simon-says,memory-match,breakout,snake}/**, 저장소 최상위 개별 게임/앱 전부",
    "src/**, package.json, package-lock.json, .github/**, prisma/**"
  ],
  "knownFacts": [
    "phase18-games/pong/ 는 4파일(index.html/styles.css/logic.js/main.js) 구조로 이미 구현 완료(BF-913) — 신규 모듈 아님, 유지보수 대상",
    "키보드 조작(시작/패들/일시정지/재개/재시작)은 이미 구현되어 있고 원본 SSOT와 일치 — 이번 축은 신규 기능이 아니라 gap 보완",
    "일시정지 중 점수/공 동결은 stepPhysics의 status 가드로 이미 로직상 성립 — 회귀 테스트만 부재",
    ".pong-overlay__title 은 outline:none 으로 포커스 표시가 제거되어 있고, main.js 가 이 요소에 상태 전환마다 focus() 를 호출함 — 시각적 포커스 표시 gap",
    "조작 안내 문구(hint/start 오버레이 본문)에 일시정지·재시작·시작 키 안내가 없음",
    "tests/e2e/pong/render-play-touch.test.js 는 window.__brixPongState 결정론 훅을 이미 사용 중 — 후속 tester가 재사용 가능"
  ],
  "wideningBudget": {
    "maxCalls": 3,
    "maxAddedPaths": 10,
    "maxLevel": 2
  }
}
```

---

## 8. 역할 인계 (후속 task 안내)

- **BF-960(designer)**: §2.2(AC-F1~F3 포커스 링)·§2.3(AC-H1~H3 조작 안내)·§5(CSS/문구 방향)를 참고해 `docs/design/pong-*.md`(신규 topic, 예: `pong-maintenance-BF-960.md`)에 오버레이 타이틀 포커스 링 시각과 hint/오버레이 문구 레이아웃(360px 포함)을 명세한다. 기존 `docs/design/pong-BF-910.md` 토큰(§2 팔레트·§3 타이포)은 값 불변 승계.
- **BF-961(developer)**: §5.1(CSS `.pong-overlay__title:focus-visible` 추가, `outline:none` 제거) + §5.2(hint/오버레이 본문 문구 갱신)를 구현. `logic.js`·포인터 입력 처리는 손대지 않는다(§4 nonGoals). 기존 키보드 핸들러(`onKeyDown`/`onKeyUp`)는 이미 정상이므로 변경 불필요.
- **BF-963(tester)**: §2 AC 전체(K1~K7, F1~F3, H1~H3, P1~P4)를 `tests/pong-BF913.test.js`(단위, 순수 로직 경계) 및 `tests/e2e/pong/**`(키보드 입력·포커스·일시정지 동결 실 브라우저 검증)에 회귀 가드로 추가한다. §5.3에서 안내한 기존 `window.__brixPongState` 결정론 훅을 재사용하면 신규 계측 코드 없이 검증 가능하다.

---

## 9. AC 매핑 (수용 기준 검증)

| 수용 기준 | 충족 근거 |
|---|---|
| Given Epic 요구사항, When 기획 명세를 작성하면, Then 키보드 조작·일시정지 동결·포커스 안내 요구가 검증 가능한 항목으로 문서화된다 | §2.1(AC-K1~K7 키보드) · §2.4(AC-P1~P4 일시정지 동결) · §2.2(AC-F1~F3 포커스) · §2.3(AC-H1~H3 조작 안내) 전부 Given/When/Then 형태로 문서화, §0 가정 4에서 실측 gap 3건 근거 제시 |
| Given planner scope guard, When 명세를 작성하면, Then root 재귀 검색 0회·범위 밖 조회 0~2회·host absolute path 조회 0회를 만족한다 | root 재귀 검색(`find .`) 미사용 — `find phase18-games`/`find tests` 등 지정 경로만 사용. 범위 밖 조회는 `docs/planning/pong-BF-910.md` 1건(§0 가정 3 widening, 예산 3회 중 1회 사용). host absolute path 조회 0회(상대경로만 사용, 최초 오류 이후 즉시 정정) |
| Given 기존 Pong 동작, When 기획하면, Then 터치 조작·게임 규칙 보존이 명세에 명시된다 | §0 가정 6 명시 선언 + §4 nonGoals(포인터 입력·물리 공식·CPU AI 변경 금지) + §3 E6(포인터 입력 회귀 없음 edge case) + §7 JSON `nonGoals`에 동일 항목 재확인 |

---

<!-- bf:pr-summary -->
## Summary

BF-959 · Pong 키보드·일시정지 유지보수 기획 명세(`docs/plan/pong-BF-959.md`)를 작성했다. `phase18-games/pong/main.js` 실측 결과 키보드 조작(시작·좌우 패들·일시정지·재개·재시작)과 일시정지 중 점수/공 동결은 이미 원본 SSOT(`docs/planning/pong-BF-910.md`)대로 구현되어 있어, 이번 축은 신규 기능이 아니라 실측한 3건의 gap — ① 오버레이 타이틀 포커스 표시 제거(`outline:none`), ② 조작 안내 문구에 일시정지/재시작/시작 키 누락, ③ 키보드·일시정지 회귀 테스트 0건 — 을 검증 가능한 AC로 못박는 유지보수 문서다. 터치(Pointer Events) 조작과 `logic.js` 게임 규칙은 nonGoals로 명시해 보존을 못박았다.

## Changes

- `docs/plan/pong-BF-959.md` — §0 gap 실측(3건) · §2 AC(키보드 K1~K7·포커스 F1~F3·안내 H1~H3·동결 P1~P4) · §4 nonGoals(물리/포인터 입력 변경 금지) · §7 Task Context Contract · §8 역할 인계(BF-960/961/963).
<!-- /bf:pr-summary -->

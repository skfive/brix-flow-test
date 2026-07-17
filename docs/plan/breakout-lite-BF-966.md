# Breakout Lite — 일시정지·포커스 회귀 보강 명세 및 Task Context Contract — BF-966

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-966(본 task, planner) · 형제 task BF-967(designer) · BF-968(developer) · BF-971(tester)
> 대상 모듈(기존 구현): `phase18-games/breakout-lite/{index.html,styles.css,logic.js,main.js}` (BF-943 구현, `docs/plan/breakout-lite-BF-941.md`·`docs/design/breakout-lite-BF-942.md` SSOT)
> 산출물 성격: **유지보수 회귀 보강 명세 + Task Context Contract 승인** — 신규 기능 아님, 기존 구현의 일시정지/포커스 동작을 실측하고 결함·정상 동작을 AC 로 확정한다. 디자인 시안·구현 코드는 본 task 비대상(BF-967/968 담당)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 본 task 는 신규 기능이 아니라 기존 `breakout-lite` 구현(BF-943, 커밋 `a5878aa`)에 대한 회귀 보강이다.** Task Context 제목·설명이 명시한 범위(키보드 시작·패들 이동·일시정지·재개·재시작, 일시정지 중 상태 동결, 포커스 표시 보존)는 모두 이미 구현되어 있는 기능이다. 본 문서는 후속 dev/tester 가 "무엇을 새로 만들지"가 아니라 "무엇이 이미 맞고, 무엇이 회귀 위험(결함)인지"를 판단하도록 실제 코드를 실측한 결과를 근거로 명세한다.

**가정 2 — Epic 번호는 제공되지 않아 임의로 표기하지 않는다.** Task Context 에는 형제 task 목록(BF-967 designer·BF-968 developer·BF-971 tester)만 제공되었고 상위 Epic 키는 제공되지 않았다. 없는 값을 추측해 채우지 말라는 지침(RUN_CONTEXT_STARTER)에 따라 Epic 번호는 생략하고 형제 task 식별만으로 범위를 특정한다.

**가정 3 — candidateFiles 범위 내 실측만 수행, 범위 확대 없음.** 아래 실측은 모두 contract 초안의 `candidateFiles`(`phase18-games/breakout-lite/**`, `docs/plan/breakout-lite-*.md`, `docs/design/breakout-lite-*.md`) 및 `tests` 범위(`tests/breakout-lite-*.test.js`, `tests/e2e/breakout-lite/**`) 안에서만 이뤄졌다. 저장소 root 재귀 `find`/`grep` 없이 `ls`·`grep -n`·`Read` 로 해당 경로만 직접 조회했다(context-widening 호출 없음 — 초안 경로 그대로 충분했다).

**가정 4 — 발견된 포커스 결함은 "수정 필요 결함"과 "이미 정상이라 회귀 테스트만 필요한 동작"으로 구분해 제시한다.** §4 는 실제 코드에서 확인된 결함(수정 필요, BF-968 owns), §5 는 이미 올바르게 구현되어 있어 회귀 테스트로 고정만 하면 되는 동작(BF-971 owns 신규 커버리지, 코드 변경 불필요)이다. 재해석 방지를 위해 각 항목에 근거 파일:라인을 인용한다.

**가정 5 — 정확한 수정 구현(포커스 이동 대상 선정 등)은 developer(BF-968) 판단 영역이다.** 본 문서는 "무엇이 지켜져야 하는가(AC)"만 확정하고, 구체적 코드(예: `canvas`에 `tabindex="-1"` 추가 여부, 어떤 요소로 포커스를 옮길지)는 dev 재량으로 남긴다(§4.3 참고).

---

## 목차

1. 개요
2. 실측 방법 및 대상 파일
3. 유지보수 범위 요약 (요구사항)
4. 발견된 결함 — 포커스 표시 보존 회귀 (수정 필요, AC 포함)
5. 정상 동작 확인 — 회귀 가드만 필요 (AC 포함)
6. Edge Case 및 실패 케이스
7. 비범위 (Out of Scope)
8. 파일 구조 및 담당 매핑
9. Acceptance Criteria 총괄 매핑
10. 산출물 위치 및 참조 표
11. Task Context Contract (승인본)

---

## 1. 개요

### 1.1 목적

기존 `breakout-lite` 게임(BF-943 구현)의 핵심 조작 흐름(키보드 시작 → 패들 이동 → 일시정지 → 재개 → 재시작)과, 일시정지 중 상태 동결·포커스 표시 보존이 실제로 지켜지는지 코드 레벨로 실측하고, 회귀를 막기 위한 acceptance criteria 를 확정한다. 실측 결과 **일시정지·시작·재시작 시 포커스가 숨겨지는(overlay `hidden`) 요소에 고립되는 결함**(§4)을 발견했으며, 이를 이번 유지보수 범위의 핵심 수정 대상으로 명세한다.

### 1.2 적용 범위

- `phase18-games/breakout-lite/{index.html,styles.css,main.js}` — 포커스 이동 로직·스타일 수정 (BF-968)
- `phase18-games/breakout-lite/logic.js` — **원칙적으로 미변경**(§5 상태 동결은 이미 순수 로직에서 보장됨, §0 가정 4)
- `tests/breakout-lite-*.test.js`, `tests/e2e/breakout-lite/**` — 본 문서 AC 를 커버하는 회귀 테스트 추가 (BF-971)
- `docs/design/breakout-lite-*.md` — 포커스 링 시각 처리(§4.2 결함 A)에 대한 디자인 토큰 재사용 확인 (BF-967, 필요 시)

### 1.3 전제 조건

- 상태·물리·상태 전이 SSOT 는 여전히 `docs/plan/breakout-lite-BF-941.md`(§3~§6) — 본 문서는 그 계약을 재정의하지 않고 포커스/일시정지 관련 AC 만 추가한다.
- 시각 토큰 SSOT 는 `docs/design/breakout-lite-BF-942.md`(§2) — 포커스 링 색상은 기존 `--color-focus-ring` 토큰을 재사용하며 신규 토큰을 추가하지 않는다(§4.2).

---

## 2. 실측 방법 및 대상 파일

아래 표는 본 문서 작성을 위해 직접 읽은 파일과 확인 방법이다(전역 탐색 없음).

| 대상 | 방법 | 확인 내용 |
|---|---|---|
| `phase18-games/breakout-lite/logic.js` (전체 355줄) | Read | 상태 전이 순수 함수, `update()` 조기 반환 조건(paused/idle/win/lose), `togglePause()` |
| `phase18-games/breakout-lite/main.js` (434줄, 발췌) | Read + `grep -n` | 키보드 핸들러(`onKeyDown`/`onKeyUp`), `syncUi()` 의 overlay 표시·포커스·버튼 disable 순서, `restartGame()`/`toMenu()`/`beginServe()` |
| `phase18-games/breakout-lite/index.html` | `grep -n` | `#overlay-title` `tabindex="-1"` 존재, `canvas#board` 에 `tabindex` **없음** |
| `phase18-games/breakout-lite/styles.css` | `grep -n` | `.overlay__title { outline: none; }`(248~253행 부근) — `.btn:focus-visible` 만 포커스 링 정의, `.overlay__title` 은 정의 없음 |
| `tests/breakout-lite-BF943.test.js` | Read(발췌) | 기존 단위 테스트가 상태 전이·물리는 전수 커버하나 **포커스 이동 자체는 미검증**(JSDOM/브라우저 미사용, 정적 마크업 검사 위주) |
| `tests/e2e/breakout-lite/start-control-outcome-restart.test.js` | Read(발췌) + `grep -n "^test(\|describe("` | 기존 e2e(BF-945)는 "시작→조작→승패→재시작" 흐름만 커버, **일시정지/재개, 포커스 이동은 커버 범위 밖**(파일 헤더 주석에 "본 파일이 보호하는 대상"으로 AC-시작/조작/승리/패배/재시작만 명시, 일시정지·포커스 없음) |
| `git log --oneline -- phase18-games/breakout-lite docs/plan/breakout-lite* docs/design/breakout-lite*` | Bash | `a5878aa`(BF-943 구현) · `c80a942`(BF-942 디자인) 2커밋만 존재 — 본 task 이전 회귀 보강 이력 없음 |

---

## 3. 유지보수 범위 요약 (요구사항)

Task Context 가 명시한 5개 조작 흐름 + 2개 회귀 속성을 실측 코드 근거와 함께 정리한다.

| # | 요구사항 | 실측 근거 | 현재 상태 |
|---|---|---|---|
| 1 | 키보드 시작 | `main.js:314-334 onKeyDown` — `Space` 가 `idle`/`serve`/`win`/`lose` 에서 `primaryAction()` 호출, `idle` 이면 `beginServe()`→`logic.js:111-116 startGame()` | 정상(§5.1) |
| 2 | 패들 이동 | `logic.js:169-173 keyboardInputVX`, `main.js:316-321` 좌우 키 추적, `logic.js:250-252 update()` 클램프 | 정상(§5.2) |
| 3 | 일시정지 | `main.js:322-329` `Space` (phase=playing) → `togglePause()`, `logic.js:154-161` | 정상(전이) / **포커스 결함 있음(§4.1)** |
| 4 | 재개 | `main.js:322-329` `Space` (phase=paused) → `togglePause()` | 정상(전이) / **포커스 결함 있음(§4.1)** |
| 5 | 재시작 | `main.js:330-333` `R` → `restartGame()`(`logic.js:119-129 restart` + `startGame`) | 정상(전이) / **포커스 결함 있음(win/lose→serve, §4.1)** |
| 6 | 일시정지 중 상태 동결 | `logic.js:241-248 update()` 조기 반환(paused/idle/win/lose 시 물리·점수·생명 미갱신) | 정상(§5.3) — 회귀 테스트만 필요 |
| 7 | 포커스 표시 보존 | `main.js:171-174` (overlay 진입 시 `overlayTitle.focus()`) vs `styles.css` `.overlay__title{outline:none}` + overlay `hidden` 처리 시 명시적 포커스 이동 없음 | **결함(§4.1, §4.2)** |

---

## 4. 발견된 결함 — 포커스 표시 보존 회귀 (수정 필요)

### 4.1 결함 A — 오버레이가 숨겨지는 전이에서 포커스가 hidden 요소에 고립됨

**근거**: `main.js:115-177 syncUi()` 는 `idle`/`paused`/`lose`/`win` 진입 시에만(171~174행) `overlayTitle.focus()` 를 호출한다. 반대로 아래 세 전이는 이 포커스를 가진 오버레이(및 그 자식 버튼들)를 그대로 숨긴다(`overlay.hidden = true`, 119~125행 / `setHidden(btnStart/btnResume/btnAgain, …)`, 162~165행)면서 **새 목적지로 포커스를 옮기는 코드가 없다**:

| 전이 | 트리거 | 관련 코드 |
|---|---|---|
| `idle → serve` (시작) | `Space` 또는 `#btn-start`/`#btn-start-bar` 클릭 | `main.js:69-73 beginServe()` |
| `paused → playing` (재개) | `Space` 또는 `#btn-resume` 클릭 | `main.js:92-95 togglePause()` |
| `lose`/`win` → `serve` (재시작) | `R` 또는 `#btn-again`/`#btn-restart` 클릭 | `main.js:80-85 restartGame()` |

세 경우 모두 직전 상태(`idle`/`paused`/`lose`/`win`)에서는 `overlayTitle`(또는 방금 클릭한 오버레이 내부 버튼, 예: `#btn-resume`)이 포커스를 갖고 있었는데, 전이 직후 그 요소를 포함한 오버레이 전체가 `hidden` 처리된다. HTML `hidden` 속성은 포커스 중인 요소를 렌더 트리에서 제거하므로 브라우저가 포커스를 잃고(대개 `document.body` 로 초기화) **키보드 사용자에게 보이는 포커스 인디케이터가 사라지며, 다음 Tab 이동이 문서 최상단부터 다시 시작**된다. `canvas#board` 에는 `tabindex` 가 없어(§2 실측) 대체 포커스 목적지도 마련돼 있지 않다.

`toMenu()`(paused/lose/win → idle, `main.js:87-90`)와 `idle`(재진입) 은 오버레이가 계속 보이므로 이 결함에 해당하지 않는다.

**Acceptance Criteria**:

- **Given** `phase=paused` 이고 포커스가 `#overlay-title` 또는 `#btn-resume` 에 있음, **When** 재개 입력(`Space` 또는 `#btn-resume` 클릭), **Then** `phase=playing` 전환 후 포커스가 `hidden` 처리된 오버레이 내부 요소에 남지 않고, 명시적으로 지정된 목적지(예: 재생 중 활성화되는 컨트롤 버튼 또는 포커스 가능하게 만든 보드 컨테이너)로 이동한다.
- **Given** `phase=idle` 이고 포커스가 `#overlay-title` 또는 `#btn-start` 에 있음, **When** 시작 입력(`Space` 또는 `#btn-start`/`#btn-start-bar` 클릭), **Then** `phase=serve` 전환 후 포커스가 hidden 오버레이 내부에 고립되지 않고 명시적 목적지로 이동한다.
- **Given** `phase=lose` 또는 `win` 이고 포커스가 `#overlay-title` 또는 `#btn-again` 에 있음, **When** 재시작 입력(`R` 또는 `#btn-again`/`#btn-restart` 클릭), **Then** `phase=serve` 전환 후(§6.2 `restartGame()` 은 idle 경유 즉시 serve) 포커스가 hidden 오버레이 내부에 고립되지 않고 명시적 목적지로 이동한다.
- **Given** 위 세 전이 중 어느 것이든, **When** 전이 직후 `document.activeElement` 확인, **Then** `document.body` 로 유실되지 않고 문서 내 포커스 가능·가시적 요소를 가리킨다.
- 구체적 목적지(어떤 요소로 옮길지, `canvas`/`board-wrap` 에 `tabindex="-1"` 을 추가할지 등)는 BF-968 구현 판단에 위임한다(§0 가정 5). 단 목적지는 반드시 **그 시점에 화면에 보이는(hidden 아닌) 요소**여야 한다.

### 4.2 결함 B — `.overlay__title` 에 시각적 포커스 인디케이터 없음

**근거**: `styles.css` 에 `.overlay__title { outline: none; }` 만 정의되어 있고, `.btn:focus-visible`(328~331행)과 달리 `.overlay__title:focus`/`:focus-visible` 스타일이 없다. `main.js:171-174` 가 `idle`/`paused`/`lose`/`win` 진입마다 `overlayTitle.focus()` 를 호출해 스크린리더에는 포커스 이동이 전달되지만, **sighted 키보드 사용자에게는 어떤 요소가 포커스를 받았는지 시각적으로 표시되지 않는다**(WCAG 2.4.7 Focus Visible 위반 소지). `docs/design/breakout-lite-BF-942.md` §6.7 은 "모든 버튼 `focus-visible` 포커스 링"만 명시했고 `overlay__title` 은 버튼이 아니라 명세 대상에서 누락되어 있었다.

**Acceptance Criteria**:

- **Given** `idle`/`paused`/`lose`/`win` 진입으로 `#overlay-title` 이 `.focus()` 를 받음, **When** 해당 시점의 렌더 상태 확인, **Then** `#overlay-title` 에 기존 `--color-focus-ring` 토큰(`docs/design/breakout-lite-BF-942.md` §2.1)을 재사용한 시각적 포커스 인디케이터가 표시된다(신규 색상 토큰 추가 금지, §0 가정 5·1.3).
- 디자인 반영 필요 여부(스타일 값 자체는 BF-967 확인 후 BF-968 이 `styles.css` 에 적용)는 형제 task 협의 사항으로 Jira 코멘트에 남긴다(§9).

### 4.3 구현 판단 위임 사항 (재해석 금지 — dev 재량 범위 명시)

- 포커스 목적지가 구체적으로 어떤 DOM 요소인지(캔버스에 `tabindex="-1"` 부여 후 포커스 / 상태별 활성 버튼으로 포커스 등)는 BF-968 이 결정한다. 본 문서는 "hidden 요소에 고립되지 않아야 한다"는 **결과 조건**만 강제한다.
- `.overlay__title` 포커스 링의 정확한 CSS 값(box-shadow vs outline, offset 등)은 기존 `.btn:focus-visible`(`styles.css:328-331`) 패턴 재사용을 권장하되 최종 값은 BF-967/968 협의로 확정한다.

---

## 5. 정상 동작 확인 — 회귀 가드만 필요 (코드 변경 불필요)

아래는 이미 올바르게 구현되어 있음을 실측으로 확인했다. BF-971 은 이 AC 들을 회귀 테스트(단위 또는 e2e)로 고정해, 향후 리팩터링이 깨뜨리지 않도록 가드한다. **BF-968 은 이 항목들에 대해 `logic.js` 를 수정하지 않는다**(§0 가정 4).

### 5.1 키보드 시작
- **Given** `phase=idle`, **When** `Space` 입력, **Then** `phase=serve` 로 전환되고 공이 패들 중앙 위에 부착된다(`logic.js:101-116`).

### 5.2 패들 이동
- **Given** `phase=playing` 또는 `serve`, **When** `←`/`A` 또는 `→`/`D` 입력, **Then** 패들이 고정 속도(`PADDLE_SPEED_KEYBOARD=300px/s`)로 이동하고 보드 경계(`0`~`BOARD_WIDTH-PADDLE_WIDTH`)에서 클램프된다(`logic.js:56-60,169-173,250-252`).
- **Given** 좌우 키 동시 입력, **When** 프레임 갱신, **Then** 순 이동량이 0 이다(`logic.js:170-173`).

### 5.3 일시정지 중 상태 동결
- **Given** `phase=playing`, **When** 일시정지 입력, **Then** `paddleX`·`ball.{x,y,vx,vy}`·`score`·`lives`·`bricksRemaining` 이 일시정지 진입 직전 값과 동일하게 유지되며, 재개 전까지 어떤 프레임에서도 값이 변경되지 않는다(`logic.js:241-248` `update()` 조기 반환).
- **Given** `phase=paused`, **When** 방향키를 누른 상태로 유지, **Then** 키 입력 자체는 내부 플래그(`keys.left`/`keys.right`)에 반영되더라도(`main.js:316-321`, phase 조건 없이 갱신됨) 실제 패들 위치는 변하지 않는다(`update()` 미실행).
- **Given** `phase=paused`, **When** 재개, **Then** 정지 직전 `paddleX`·`ball` 위치/속도 그대로 `playing` 이 재개된다(`logic.js:154-161 togglePause` 는 `phase` 필드만 변경, 다른 필드 미접촉).

### 5.4 재개·재시작 상태 전이
- **Given** `phase=paused`, **When** 재개 입력, **Then** `phase=playing` 으로만 전환된다(다른 필드 불변, §5.3 과 동일 근거).
- **Given** 임의 `phase`, **When** `R` 또는 `#btn-again`/`#btn-restart` 클릭, **Then** `score=0`,`lives=3`,`bricksRemaining=24`,`paddleX` 초기값으로 리셋되고 `phase=serve`(idle 경유 즉시 자동 서브, `main.js:80-85`)로 전환된다. `toMenu()`(`#btn-menu`)는 예외적으로 `phase=idle` 에 머문다(자동 서브 없음, `main.js:87-90`) — 재시작(다시하기)과 메뉴로 버튼은 최종 phase 가 다르므로 혼동하지 않는다.

---

## 6. Edge Case 및 실패 케이스

1. **일시정지 중 재시작 입력**: `R` 은 `paused` 를 포함해 언제든 유효하다(`main.js:330-333`, phase 조건 없음) — 재시작이 일시정지에 의해 차단되지 않는다.
2. **일시정지 중 방향키 유지 후 재개**: 방향키를 누른 채로 일시정지→재개하면 `keys.left/right` 플래그가 유지되어(§5.3) 재개 즉시 이동이 재개된다 — 이는 실제 물리 키가 눌려있는 상태를 그대로 반영하는 것으로 결함이 아니다(재해석 금지: 별도 "재개 시 입력 초기화" 요구 없음).
3. **`Space` 이중 의미**: `serve` 상태에서 `Space` 는 발사(`primaryAction`)로만 동작하고, `playing`/`paused` 에서만 일시정지 토글로 동작한다(`main.js:322-329`) — 발사 대기 중 실수로 일시정지되지 않는다(기존 `BF-941` §7-3 계약과 동일, 재확인만).
4. **포커스 결함 수정 시 스크린리더 회귀 방지**: §4.1 수정 시 `overlayTitle.focus()` 자체(스크린리더용 상태 안내)는 유지하되, 그다음 전이(오버레이가 숨겨지는 시점)에서만 포커스를 옮겨야 한다 — 오버레이 진입 시점의 기존 접근성 동작(§5 재확인 대상 아님, 결함 아님)을 훼손하지 않는다.
5. **`btnPause.disabled` 전환 시 포커스**: `일시정지` 버튼으로 pause 를 트리거하면 `btnPause.disabled=true` 가 먼저 실행되고(`main.js:169`) 그 뒤 `overlayTitle.focus()` 가 호출되므로(`171-174`) 최종 포커스는 `overlayTitle` 로 정상 귀결된다 — 이 경로는 결함이 아니다(§4.1 은 반대 방향인 재개/시작/재시작 전이만 해당).

---

## 7. 비범위 (Out of Scope)

- **게임 규칙·물리 상수 변경**: 벽돌 배치·공 속도·반사각 등은 `docs/plan/breakout-lite-BF-941.md` SSOT 불변, 본 task 비대상.
- **`logic.js` 상태 전이 함수 자체 수정**: §5 는 이미 정상이므로 로직 변경 없음(§0 가정 4).
- **터치 입력 포커스 이슈**: 본 task 는 키보드 포커스 표시 보존에 한정한다. 터치 전용 접근성(예: 스크린리더 제스처)은 비대상.
- **신규 시각 디자인(색상·레이아웃) 변경**: `--color-focus-ring` 토큰 재사용 범위 내에서만 다루며, 그 외 시안 변경은 BF-967 별도 판단.
- **기존 breakout(BF-928 계열) 코드/문서 수정**: 참조만, 변경 금지.
- **서버 API·DB·인증**: 본 게임은 브라우저 메모리 상태만 사용(불변).

---

## 8. 파일 구조 및 담당 매핑

| 파일/영역 | 변경 필요 여부 | 담당 |
|---|---|---|
| `docs/plan/breakout-lite-BF-966.md`(본 문서) | 신규 작성 | planner(BF-966, 본 task) |
| `docs/design/breakout-lite-*.md`(포커스 링 시각 확인, 필요 시 추가) | 검토/보강 | designer(BF-967) |
| `phase18-games/breakout-lite/main.js`(§4.1 포커스 이동 로직) | 수정 | developer(BF-968) |
| `phase18-games/breakout-lite/styles.css`(§4.2 `.overlay__title` 포커스 스타일) | 수정 | developer(BF-968) |
| `phase18-games/breakout-lite/logic.js` | **미변경**(§5) | — |
| `tests/breakout-lite-*.test.js`, `tests/e2e/breakout-lite/**`(§4·§5 AC 회귀 테스트) | 추가 | tester(BF-971) |

---

## 9. Acceptance Criteria 총괄 매핑

| AC (원문, Task Context) | 근거 |
|---|---|
| Given Epic 범위 제약, When 기획 산출, Then `docs/plan/breakout-lite-*.md` 에 개선 요구·수용 기준·범위(`phase18-games/breakout-lite/**`)가 정리된다 | 본 문서 §3(요구사항 요약)·§4~§5(AC)·§8(범위/담당 매핑) |
| Given planner 응답, When 최종 출력, Then 정확한 `TASK_CONTEXT_CONTRACT_V1` fence 가 존재하고 `context.contract.missing/invalid=0` 이다 | 본 응답 최종 §11 fence(마커·JSON 형식 준수) |
| Given 조회 정책, When 정보 수집, Then root recursive search 0회·범위 밖 조회 0~2회·host absolute path 조회 0회다 | §2 실측 방법 — `Read`/`grep -n`/`ls`/`git log` 모두 candidateFiles·tests 경로 내로 한정, `find .` 등 root 재귀 탐색 미사용(§0 가정 3) |

Jira 코멘트로 형제 task(BF-967/968/971) 에 본 문서 §4(결함, 수정 필요)·§5(정상, 회귀 가드만 필요) 구분을 요약 전달한다(§0 가정 4 근거 명시).

---

## 10. 산출물 위치 및 참조 표

| 산출물 | 경로 | 담당 | 상태 |
|---|---|---|---|
| 본 회귀 보강 명세/계약 | `docs/plan/breakout-lite-BF-966.md` | planner(BF-966, 본 task) | 완료 |
| 디자인 보강(포커스 링 등) | `docs/design/breakout-lite-*.md` (필요 시) | designer(BF-967) | 후속 |
| 구현 수정(포커스 이동·스타일) | `phase18-games/breakout-lite/{main.js,styles.css}` | developer(BF-968) | 후속 |
| 회귀 테스트 추가 | `tests/breakout-lite-*.test.js`, `tests/e2e/breakout-lite/**` | tester(BF-971) | 후속 |
| 참조(SSOT, 수정 금지) | `docs/plan/breakout-lite-BF-941.md`, `docs/design/breakout-lite-BF-942.md` | — | 기존 자산 |
| 참조(기존 구현, 실측 대상) | `phase18-games/breakout-lite/**`(커밋 `a5878aa`) | — | 기존 자산, §4 만 수정 |

---

## 11. Task Context Contract (승인본)

```json
{
  "contractVersion": "task-context-contract-v1",
  "candidateFiles": [
    "docs/plan/breakout-lite-*.md",
    "docs/design/breakout-lite-*.md",
    "phase18-games/breakout-lite/**"
  ],
  "entryPoints": [
    "phase18-games/breakout-lite/main.js",
    "phase18-games/breakout-lite/index.html"
  ],
  "tests": [
    "tests/breakout-lite-*.test.js",
    "tests/e2e/breakout-lite/**"
  ],
  "dependencyEvidence": [
    "phase18-games/breakout-lite/main.js:115-177 syncUi() — idle/paused/lose/win 진입 시에만 overlayTitle.focus() 호출(171-174행), overlay.hidden 토글은 119-125행",
    "phase18-games/breakout-lite/main.js:69-90 beginServe()/restartGame()/toMenu() — idle→serve, lose/win→serve 전이가 오버레이를 숨기며 포커스 이동 없음",
    "phase18-games/breakout-lite/main.js:92-95 togglePause() — paused→playing 전이도 동일하게 포커스 이동 없음",
    "phase18-games/breakout-lite/index.html: #overlay-title 은 tabindex=-1 존재, canvas#board 는 tabindex 없음(대체 포커스 목적지 부재)",
    "phase18-games/breakout-lite/styles.css: .overlay__title{outline:none} 만 존재, .btn:focus-visible(328-331행)과 달리 overlay__title 전용 포커스 인디케이터 스타일 없음",
    "phase18-games/breakout-lite/logic.js:237-248 update() — phase가 paused/idle/win/lose 이면 조기 반환(물리·점수·생명 미갱신), 상태 동결은 이미 정상 구현",
    "phase18-games/breakout-lite/logic.js:154-161 togglePause() — phase 필드만 변경, ball/paddleX 등 다른 필드 미접촉(일시정지-재개 시 상태 보존 확인)",
    "tests/e2e/breakout-lite/start-control-outcome-restart.test.js 헤더 주석(1-55행) — 기존 e2e(BF-945)는 시작/조작/승리/패배/재시작만 보호 대상으로 명시, 일시정지·재개·포커스 이동은 커버 범위 밖",
    "tests/breakout-lite-BF943.test.js — 상태 전이·물리 순수 함수는 전수 단위 테스트로 커버되나 실제 DOM 포커스 이동(main.js)은 미검증",
    "git log --oneline -- phase18-games/breakout-lite docs/plan/breakout-lite* docs/design/breakout-lite*: a5878aa(BF-943 구현) · c80a942(BF-942 디자인) 2건만 존재 — 이전 회귀 보강 이력 없음"
  ],
  "nonGoals": [
    "phase18-games/breakout-lite/logic.js 상태 전이·물리 로직 자체 수정 (§5 는 이미 정상, 회귀 테스트만 추가)",
    "docs/plan/breakout-lite-BF-941.md, docs/design/breakout-lite-BF-942.md 의 물리 상수·시각 토큰 값 변경 (SSOT 불변, 참조만)",
    "phase18-games/breakout/** 및 기타 phase18-games/** 형제 게임 (기존 자산, 비대상)",
    "터치 입력 접근성(스크린리더 제스처 등) — 본 task 는 키보드 포커스 표시 보존에 한정",
    "신규 색상 토큰 추가 — 결함 수정은 기존 --color-focus-ring 재사용 범위 내",
    "서버 API·DB·인증 — 본 게임은 브라우저 메모리 상태만 사용(불변)"
  ],
  "knownFacts": [
    "breakout-lite 는 이미 구현되어 있다(BF-943, 커밋 a5878aa) — 본 task 는 신규 기능이 아니라 기존 구현의 일시정지/포커스 회귀 보강이다.",
    "일시정지 중 상태 동결(paddleX/ball/score/lives/bricksRemaining 불변)은 logic.js update() 의 조기 반환으로 이미 올바르게 구현되어 있다 — 코드 수정 불필요, 회귀 테스트만 필요하다.",
    "idle→serve(시작)·paused→playing(재개)·lose/win→serve(재시작) 세 전이 모두, 전이 직전 포커스를 가진 오버레이(및 그 자식 버튼)가 hidden 처리되면서 포커스 이동 코드가 없어 포커스가 유실된다 — 이번 유지보수의 핵심 수정 대상이다.",
    ".overlay__title 에는 outline:none 만 있고 focus-visible 스타일이 없어, JS 가 focus() 를 호출해도 sighted 키보드 사용자에게 시각적 포커스 인디케이터가 보이지 않는다.",
    "canvas#board 에는 tabindex 가 없어 대체 포커스 목적지로 쓸 수 없는 상태다 — 목적지 선정은 developer(BF-968) 재량이다.",
    "기존 e2e 회귀 가드(tests/e2e/breakout-lite/start-control-outcome-restart.test.js, BF-945)는 시작/조작/승리/패배/재시작만 다루고 일시정지·재개·포커스는 커버하지 않는다 — BF-971 이 신규로 추가해야 한다."
  ],
  "wideningBudget": {
    "maxCalls": 3,
    "maxAddedPaths": 10,
    "maxLevel": 2
  }
}
```

---

## 12. 후속 task 안내

- BF-967(designer): §4.2 포커스 링 시각 처리(기존 `--color-focus-ring` 토큰 재사용) 필요 여부 확인, 필요 시 `docs/design/breakout-lite-*.md` 보강
- BF-968(developer): §4.1(포커스 이동 대상 명시)·§4.2(`.overlay__title` 포커스 스타일) 수정. `logic.js` 미변경(§0 가정 4)
- BF-971(tester): §4·§5 의 모든 Given/When/Then 을 단위(`tests/breakout-lite-*.test.js`) 또는 e2e(`tests/e2e/breakout-lite/**`)로 커버, 특히 기존 e2e 가 다루지 않는 일시정지/재개/포커스 이동(§4.1)을 신규 추가
- 범위 재조정이 필요하면 Jira 코멘트로 근거를 남기고 본 문서를 개정한다(재해석 금지, 근거 기반 개정만 허용)

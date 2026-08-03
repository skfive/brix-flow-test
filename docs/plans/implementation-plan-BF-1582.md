<!-- bf:primary-module:snake -->
# BF-1582 · 게임 오버 메뉴 구현 설계 (Implementation Plan)

- 작성: 박기획 (planner) · 본 task: BF-1585
- 대상 epic task: BF-1582 (게임 오버 메뉴)
- 후속 페르소나: designer (BF-1583), developer (BF-1584)
- primary module: `snake` · primary repo: `backend`

> 이 문서는 frozen Execution Blueprint (`ui-contract@v1`, `planning-contract@v1`) 를
> 그대로 렌더링한 실행 설계입니다. **파일·소유자·상태·후조건은 frozen blueprint 가 유일한 권위**이며,
> 본 문서는 이를 재정의하지 않고 designer/developer 가 일관되게 따를 수 있도록 서술합니다.
> 새 파일·새 역할·계약 밖 요구사항을 추가하지 않습니다.

---

## 1. 배경 & 목표

기존 snake 게임은 게임 오버 시 `#gameover-overlay` 에 최종 점수·아이템 획득 현황을 표시하지만,
재시작/설정은 **키보드 전용** (`Space` → 재시작, `S` → 설정) 입니다 (`snake/game.js` keydown 핸들러 §게임 오버 분기).

BF-1582 는 이 오버레이 안에 **눈에 보이는 '다시하기'/'설정' 버튼**을 추가합니다.
버튼은 **기존 재시작·설정 로직을 그대로 호출**하며 새 게임 로직을 만들지 않습니다.
기존 `#paused-overlay` 의 `.paused-btn` + `<kbd>` 배지 패턴을 재사용합니다.

**핵심 제약 (frozen):**
- 새 로직 금지 — 기존 `doRestart()` (재시작), `openSettingsModal()` (설정) 핸들러 재사용.
- 최종 점수 블록 (`#go-score` / `#go-cpu-score` 등) 과 아이템 획득 현황 블록 (`#go-item-stats`) 은 **그대로 보존**.
- 모든 계약 파일은 **additive** — 기존 selector/token 을 변경·재정의하지 않는다.

---

## 2. 사용자 시나리오 (User Scenario)

1. 플레이어가 게임 오버되어 `#gameover-overlay` (게임 결과 화면) 를 본다.
2. 오버레이 하단에 **`다시하기`**, **`설정`** 두 버튼이 보인다 (`.paused-btn` 와 동일한 시각·`kbd` 표기).
3. `다시하기` 를 클릭(또는 `Space`) 하면 오버레이가 사라지고 **같은 설정으로 새 게임**이 시작된다.
4. `설정` 을 클릭(또는 `S`) 하면 설정 모달이 열리고, 게임 오버 오버레이는 뒤에 유지된다.
5. 설정 모달을 닫으면 포커스가 `설정` 버튼으로 돌아오고, 오버레이가 다시 활성 상태가 된다.

---

## 3. Acceptance Criteria (Given/When/Then)

### AC-1 · 메뉴 버튼 노출 & 기존 핸들러 재사용
- **Given** 게임이 `gameover` 상태이고 `#gameover-overlay` 가 표시될 때
- **When** 오버레이가 렌더되면
- **Then** `#gameover-restart-btn` (`다시하기`) 와 `#gameover-settings-btn` (`설정`) 두 버튼이
  `.gameover-menu` 컨테이너 안에 표시되고, 최종 점수 블록과 `#go-item-stats` 아이템 블록은 그대로 남아 있다.

### AC-2 · 다시하기 (restart-activated)
- **Given** 게임 오버 오버레이가 표시된 상태
- **When** `#gameover-restart-btn` 를 클릭하거나 `Space` 를 누르면
- **Then** 기존 재시작 핸들러(`doRestart()`)가 호출되어 오버레이가 숨겨지고 **같은 설정으로 새 게임**이 시작된다.
  (새 재시작 로직을 만들지 않는다.)

### AC-3 · 설정 열기 (settings-open)
- **Given** 게임 오버 오버레이가 표시된 상태
- **When** `#gameover-settings-btn` 를 클릭하거나 `S` 를 누르면
- **Then** 기존 설정 핸들러(`openSettingsModal()`)가 호출되어 설정 모달이 열리고,
  게임 오버 오버레이는 **뒤에 그대로 유지**된다.

### AC-4 · 설정 닫기 & 포커스 복원 (settings-closed)
- **Given** 게임 오버 위에서 설정 모달이 열린 상태
- **When** 설정 모달을 닫으면
- **Then** 포커스가 `#gameover-settings-btn` (`설정` 버튼) 으로 복원되고, 게임 오버 오버레이가 다시 활성 상태가 된다.

### AC-5 · 접근성 & 키보드
- **Given** 게임 오버 오버레이가 표시된 상태
- **When** 스크린리더/키보드로 접근하면
- **Then** `다시하기` 버튼은 `aria-label="다시하기 (Space)"`, `설정` 버튼은 `aria-label="설정 (S)"` 를 가지며,
  두 버튼은 Tab 순서에 포함되고 `Enter`/`Space` 로 활성화되며 `.paused-btn` 의 `<kbd>` 표기를 따른다.
  모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### AC-6 · 반응형
- **Given** 뷰포트 폭이 320px 이상일 때
- **When** 오버레이가 표시되면
- **Then** 두 버튼이 오버플로 없이 배치되고, 좁은 화면에서 세로로 접히더라도 버튼 텍스트가 잘리지 않는다.

---

## 4. Frozen UI 계약 (exact — 변경 금지)

### 4-1. 파일 · 소유자 (frozen blueprint 가 유일 권위)

| 파일 | 소유자 | 상태 계약 (artifact-policy) |
| --- | --- | --- |
| `docs/design/gameover-menu-BF-1582.md` | designer | additive |
| `docs/design/gameover-menu-mockup.html` | designer | additive |
| `snake/index.html` | developer | additive |
| `snake/snake.js` | developer | additive |
| `snake/tests/gameover-menu.test.js` | developer | additive |
| `docs/plans/implementation-plan-BF-1582.md` | planner (본 문서) | — |

> **구현 참고 (계약 재정의 아님):** 현재 저장소에서 재시작/설정 실제 핸들러(`doRestart()`,
> `openSettingsModal(source)`)와 게임 오버 키 분기는 `snake/game.js` 에 존재합니다. frozen blueprint 는
> developer 소유 JS 를 `snake/snake.js` 로 명시하므로, developer 는 계약된 파일 경로 규약을 따르되
> **기존 `doRestart()`/`openSettingsModal()` 진입점을 그대로 재사용**해야 합니다.
> selector/token 변경 없이 버튼 → 기존 핸들러 배선만 추가하는 additive 변경입니다.

### 4-2. DOM ID / class (exact)

- DOM IDs: `gameover-overlay`, `gameover-restart-btn`, `gameover-settings-btn`
  - `gameover-overlay` 는 **기존 오버레이** — 최종 점수(`#go-score` 등)·아이템 블록(`#go-item-stats`) 보존.
  - `gameover-restart-btn` / `gameover-settings-btn` 는 오버레이 안에 **추가**되는 버튼.
- CSS classes: `gameover-menu` (버튼 컨테이너), `gameover-btn` (버튼 공통), `gameover-btn__key` (`<kbd>` 키 배지)

### 4-3. 상태 텍스트 & 상태 계약 (states)

| 상태 | 화면/동작 계약 |
| --- | --- |
| `gameover-idle` | 오버레이에 최종 점수·아이템 현황과 `다시하기`/`설정` 버튼이 표시된다 |
| `restart-activated` | 다시하기 실행 시 게임 오버 오버레이가 숨겨지고 같은 설정으로 새 게임이 시작된다 |
| `settings-open` | 설정 모달이 열리고 게임 오버 오버레이는 그대로 유지된다 |
| `settings-closed` | 설정 모달을 닫으면 포커스가 `설정` 버튼으로 복원되고 오버레이가 다시 활성 상태가 된다 |

> **후조건 불변식 (frozen):** 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고
> 주 실행 control(`다시하기` 버튼)을 다시 사용할 수 있어야 한다.

### 4-4. design token / CSS 변수 (exact 값)

| 변수 | 값 |
| --- | --- |
| `--gameover-menu-gap` | `12px` |
| `--gameover-btn-padding` | `10px 20px` |
| `--gameover-btn-min-width` | `120px` |

### 4-5. 접근성 이름 · 키보드 (exact)

- `다시하기` 버튼: `aria-label="다시하기 (Space)"`
- `설정` 버튼: `aria-label="설정 (S)"`
- 두 버튼은 Tab 순서에 포함되고 `Enter`/`Space` 로 활성화되며 `.paused-btn` 패턴의 `<kbd>` 표기를 따른다.
  (`.gameover-btn__key` 안에 `Space` / `S` 키 배지 노출)
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4-6. 반응형 breakpoint (exact)

- 320px 이상 뷰포트에서 버튼 두 개가 오버플로 없이 배치된다.
- 좁은 화면에서 버튼이 세로로 접히더라도 버튼 텍스트가 잘리지 않는다.

---

## 5. 데이터 모델

**신규 데이터 모델 변경 없음.** 게임 오버 메뉴는 순수 UI + 기존 핸들러 재배선입니다.
점수·아이템 통계·설정(localStorage `bf-snake-settings`, 최고점수 `bf-snake-high-score`)은 기존 로직을 그대로 사용하며,
본 작업에서 스키마/저장 형식을 변경하지 않습니다.

---

## 6. 재사용 계약 (기존 핸들러 · 보존 블록)

- **재시작 재사용:** `다시하기` 버튼 → 기존 재시작 진입점(`doRestart()`, 게임 오버 `Space` 분기와 동일 경로) 호출.
- **설정 재사용:** `설정` 버튼 → 기존 설정 진입점(`openSettingsModal()`, 게임 오버 `S` 분기와 동일 경로) 호출.
- **보존:** 최종 점수 블록(`#go-score`/`#go-cpu-score` 및 신기록·플레이 시간 라인) 과
  아이템 획득 현황 블록(`#go-item-stats`) 의 마크업/데이터는 변경하지 않는다 — 버튼은 그 아래 `.gameover-menu` 로 추가.
- **패턴 재사용:** 시각·`kbd` 표기·focus outline 은 `.paused-btn` (`#paused-overlay`) 규약을 따른다.

---

## 7. Edge case · 실패 케이스

- **EC-1 · 중복 재시작 입력:** 재시작 중(오버레이 숨김 진행) 추가 클릭/Space 는 기존 핸들러의 상태 가드
  (`state.status === "gameover"` 조건)로 무시된다. 새 debounce 로직을 추가하지 않는다.
- **EC-2 · 설정 열린 동안 게임 오버 키:** 설정 모달이 열려 있으면 게임 오버 오버레이 버튼/단축키는 동작하지 않는다
  (기존 keydown 가드: 설정 모달 열림 시 `Esc`/`Enter` 만 수신). settings-closed 후 다시 활성화된다.
- **EC-3 · 포커스 복원 실패 방지:** 설정 취소/저장 어느 경로로 닫아도 포커스는 `#gameover-settings-btn` 로 복원된다 (AC-4).
- **EC-4 · 좁은 화면(320px):** 버튼이 세로로 접혀도 텍스트/`kbd` 배지가 잘리지 않아야 한다 (`min-width` 준수, 오버플로 금지).
- **EC-5 · 색상 대비 불가 환경:** 상태·버튼 의미가 색상 외 텍스트·`aria-label` 로도 전달되어야 한다 (AC-5).
- **EC-6 · 오버레이 미표시 상태:** `gameover` 가 아닐 때 버튼은 렌더/포커스 대상이 아니다(오버레이 `hidden`).

---

## 8. 검증 (focused scope: snake)

- 정적/단위: `node --test tests/snake-*.test.js` (또는 developer 계약 파일 `snake/tests/gameover-menu.test.js`).
- 검증 항목: 버튼 존재·`aria-label`·클릭→핸들러 호출·점수/아이템 블록 보존·설정 닫기 후 포커스 복원·320px 레이아웃.
- BRIX_TEST_SCOPE=focused — 타 module 회귀는 CI 가 별도 검증.

---

## 9. 후속 페르소나 handoff 요약

- **designer (BF-1583):** `docs/design/gameover-menu-BF-1582.md` + `docs/design/gameover-menu-mockup.html` 를
  §4 frozen UI 계약(selector/token/상태/a11y/반응형) 그대로 작성. selector·token 변경 금지(additive).
- **developer (BF-1584):** `snake/index.html`·`snake/snake.js`·`snake/tests/gameover-menu.test.js` 에
  버튼 마크업 + 기존 `doRestart()`/`openSettingsModal()` 재배선 + 테스트 추가. §6 재사용 계약·§7 edge case 준수.
- **파일 소유권·상태 계약은 frozen blueprint 가 유일 권위** — 본 문서는 이를 재정의하지 않는다.

# Tone Recall 구현 설계 및 UI 계약 (BF-1740 / BF-1743)

> 본 문서는 planner(박기획)가 동결한 **실행 설계 + UI 계약**입니다.
> designer(BF-1741)와 developer(BF-1742)는 이 문서의 selector·상태·token을
> **변경하거나 재정의하지 않고 그대로 구현**합니다.
> 파일 소유권·상태 계약의 유일한 권위는 frozen Execution Blueprint이며,
> 본 문서는 그것을 재정의하지 않고 설명만 합니다.

---

## 1. 개요

Tone Recall 은 Web Audio 기반 기억력(메모리) 게임입니다. 시스템이 색 pad
시퀀스를 소리·빛으로 재생(playback)하면, 플레이어가 동일한 순서로 pad를 눌러
따라합니다(input). 라운드마다 시퀀스가 한 칸씩 길어지며, 틀리면 game over 됩니다.

- 사용자 시나리오 / AC(Given/When/Then)
- 게임 로직 ↔ 렌더링 분리 설계
- 테스트에서 결정적으로 제어 가능한 무작위 주입 인터페이스
- 동결된 exact UI 계약 (파일·selector·상태·token·접근성·반응형)

---

## 2. 파일 소유권 및 상태 (frozen blueprint 권위)

아래 파일 목록·소유자는 frozen Execution Blueprint 이 유일한 권위입니다.
planner 는 새 파일이나 역할을 추가하지 않습니다. 모든 artifact 정책은 `additive`
입니다(기존 계약을 삭제·재정의하지 않고 추가만).

| 파일 | 소유자 | artifact-policy |
| --- | --- | --- |
| `webaudio-memory-tone/README.md` | canonical work packet owner | additive |
| `webaudio-memory-tone/design-mockup.html` | developer | additive |
| `webaudio-memory-tone/design-tokens.html` | developer | additive |
| `webaudio-memory-tone/index.html` | developer | additive |
| `webaudio-memory-tone/src/audio.js` | developer | additive |
| `webaudio-memory-tone/src/game.js` | developer | additive |
| `webaudio-memory-tone/src/main.js` | developer | additive |
| `webaudio-memory-tone/styles.css` | developer | additive |
| `webaudio-memory-tone/tests/game.test.js` | developer | additive |

- 관측 스택: `vanilla-static` (npm, ESM), serve_root = 저장소 루트, route = root-relative-static.
- 테스트 스코프: focused. 신규·수정 테스트(`tests/game.test.js`)만 실행.

---

## 3. 동결된 UI 계약 (ui-contract@v1)

designer/developer 는 아래 selector·상태·token 을 **변경하거나 재정의하지 않습니다.**

### 3.1 DOM ID
`board`, `pad-green`, `pad-red`, `pad-yellow`, `pad-blue`, `round-indicator`,
`start-button`, `status-message`, `game-over-panel`

### 3.2 CSS class
`board`, `pad`, `pad--active`, `hud`, `status`, `overlay`

### 3.3 게임 상태 (states)
`idle`, `playback`, `input`, `paused`, `gameover`

### 3.4 Design token

| token | 값 |
| --- | --- |
| `--color-pad-green` | `#22c55e` |
| `--color-pad-red` | `#ef4444` |
| `--color-pad-yellow` | `#eab308` |
| `--color-pad-blue` | `#3b82f6` |
| `--color-bg` | `#0f172a` |
| `--color-text` | `#f8fafc` |
| `--space-pad-gap` | `16px` |
| `--radius-pad` | `12px` |
| `--font-size-round` | `24px` |

### 3.5 접근성 (accessibility)
- 각 색 pad 버튼은 색 이름을 담은 `aria-label` 을 가진다.
- `start-button` 은 명시적 `aria-label` 과 키보드 포커스(Tab/Enter)를 지원한다.
- `status-message` 는 `aria-live="polite"` 로 라운드·게임 오버 텍스트를 안내한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형 (responsive)
- 320px 이상에서 `board` 가 뷰포트를 넘어 overflow 하지 않는다.
- `board` 는 2x2 정사각 그리드 비율을 유지한다.

---

## 4. 사용자 시나리오

1. **게임 시작**: 플레이어가 `start-button` 을 눌러 게임을 시작한다.
   상태가 `idle` → `playback` 으로 전환된다.
2. **시퀀스 재생**: 시스템이 현재 라운드의 pad 시퀀스를 소리·빛(`pad--active`)으로
   순서대로 재생한다. 재생 중에는 입력을 받지 않는다.
3. **플레이어 입력**: 재생이 끝나면 상태가 `input` 으로 전환되고, 플레이어가
   pad 를 순서대로 누른다. `status-message` 가 진행을 안내한다.
4. **라운드 진행**: 시퀀스를 모두 정확히 맞추면 라운드가 증가하고 시퀀스가
   한 칸 길어져 다시 `playback` 으로 돌아간다. `round-indicator` 가 갱신된다.
5. **게임 오버**: 잘못된 pad 를 누르면 상태가 `gameover` 로 전환되고
   `game-over-panel`(`overlay`)이 표시된다. `start-button` 으로 재시작할 수 있다.

---

## 5. Acceptance Criteria (Given/When/Then)

### AC-1 게임 시작
- **Given** 상태가 `idle` 이고 `start-button` 이 포커스 가능할 때
- **When** 플레이어가 `start-button` 을 클릭 또는 Enter 로 활성화하면
- **Then** 상태가 `playback` 으로 전환되고 라운드 1 시퀀스 재생이 시작되며
  `round-indicator` 가 라운드 1 을 표시한다.

### AC-2 시퀀스 재생과 입력 잠금
- **Given** 상태가 `playback` 일 때
- **When** 시스템이 시퀀스를 재생하는 동안
- **Then** pad 입력은 무시되고, 활성 pad 에만 `pad--active` 가 적용되며
  `status-message` 가 재생 중임을 텍스트로 안내한다.

### AC-3 정답 입력 및 라운드 증가
- **Given** 상태가 `input` 이고 재생된 시퀀스가 존재할 때
- **When** 플레이어가 시퀀스를 처음부터 끝까지 정확히 누르면
- **Then** 라운드가 1 증가하고 시퀀스가 한 칸 늘어난 뒤 상태가 `playback` 으로
  전환되며 `round-indicator` 가 갱신된다.

### AC-4 오답 → 게임 오버
- **Given** 상태가 `input` 일 때
- **When** 플레이어가 기대 순서와 다른 pad 를 누르면
- **Then** 상태가 `gameover` 로 전환되고 `game-over-panel`(`overlay`)이 표시되며
  `status-message` 가 게임 오버를 `aria-live` 로 안내한다.

### AC-5 초기화·재시작 후조건
- **Given** 상태가 `gameover` 이거나 진행 중 취소·실패가 발생했을 때
- **When** 플레이어가 `start-button` 으로 재시작하면
- **Then** 상태와 진행 표시(`round-indicator`, `status-message`)가 초기값으로
  되돌아가고 주 실행 control(`start-button`)을 다시 사용할 수 있다.

### AC-6 접근성 노출
- **Given** 임의의 게임 상태에서
- **When** 스크린리더 또는 키보드 사용자가 접근할 때
- **Then** 각 pad 는 색 이름 `aria-label` 을, `status-message` 는 `aria-live=polite`
  텍스트를 제공하며, 상태는 색상만이 아니라 텍스트로도 구분된다.

### AC-7 반응형
- **Given** 뷰포트 폭이 320px 이상일 때
- **When** 페이지가 렌더링될 때
- **Then** `board` 가 overflow 없이 2x2 정사각 그리드 비율을 유지한다.

---

## 6. Edge case · 실패 케이스

- **재생 중 입력**: `playback` 상태에서의 pad 클릭은 무시(no-op)한다.
- **연타/중복 입력**: 입력 처리 중 같은 pad 재입력은 순서 검증 로직으로만 판정한다.
- **첫 pad부터 오답**: 시퀀스 첫 입력이 틀리면 즉시 `gameover`.
- **오디오 컨텍스트 미허용**: 브라우저 정책으로 AudioContext 가 사용자 제스처
  전에 suspend 상태일 수 있음 → `start-button` 클릭(사용자 제스처) 시 resume.
  오디오 실패 시에도 시각 피드백(`pad--active`)과 게임 진행은 유지한다.
- **재시작 시 상태 잔존 금지**: 재시작은 시퀀스·라운드·입력 인덱스를 모두 초기화.
- **좁은 뷰포트(320px)**: board 가 잘리거나 넘치지 않아야 한다.

---

## 7. 로직 / 렌더링 분리 설계

게임의 순수 로직과 DOM/오디오 렌더링을 파일 경계로 분리합니다.

| 계층 | 파일 | 책임 |
| --- | --- | --- |
| **로직 (pure)** | `src/game.js` | 게임 상태 머신, 시퀀스 생성·검증, 라운드 진행. DOM/오디오/타이머에 직접 의존하지 않음. |
| **오디오 렌더링** | `src/audio.js` | Web Audio API 로 pad 별 톤 재생. |
| **엔트리/바인딩** | `src/main.js` | DOM 이벤트를 `game.js` 로 전달하고, 로직 결과를 DOM(`pad--active`, `round-indicator`, `status-message`, `game-over-panel`)과 `audio.js` 로 렌더링. 무작위·타이머 등 부수효과를 로직에 주입. |
| **뷰** | `index.html`, `styles.css` | 동결된 DOM ID/class/token 을 사용한 마크업·스타일. |

- **상태 머신**: `idle → playback → input → (playback | gameover)`; `paused` 는
  진행 중 일시정지 상태로, 해제 시 직전 상태로 복귀. 상태 전이는 `game.js` 가
  결정하고, `main.js` 가 관측하여 렌더링한다.
- **단방향 흐름**: 입력(이벤트) → `game.js` 상태 갱신 → `main.js` 렌더링.
  `game.js` 는 DOM 을 직접 만지지 않으므로 순수 단위 테스트가 가능하다.

### 7.1 결정적 무작위 주입 인터페이스

`game.js` 의 시퀀스 생성은 **무작위 소스를 외부에서 주입**받아 테스트에서
결정적으로 제어할 수 있어야 합니다.

- 게임 로직 생성 함수는 무작위 함수를 파라미터로 주입받는다.
  예: `createGame({ random = Math.random, pads = ['green','red','yellow','blue'] } = {})`.
- 프로덕션(`main.js`)에서는 `Math.random` 을 주입한다.
- 테스트(`tests/game.test.js`)에서는 고정 시드/스텁 함수를 주입해
  시퀀스를 예측 가능하게 만든 뒤 정답·오답 경로를 검증한다.
- 타이머·오디오 등 다른 부수효과도 동일하게 주입 가능한 형태로 두어,
  `game.js` 단위 테스트가 실제 DOM·오디오·실시간 타이머 없이 실행되도록 한다.

---

## 8. 데이터 모델

게임은 서버·DB 없는 클라이언트 상태 게임이며, 인메모리 상태 형상만 정의한다.

**GameState (인메모리)**

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `status` | enum | `idle` \| `playback` \| `input` \| `paused` \| `gameover` |
| `sequence` | string[] | 현재 라운드까지의 pad 색 이름 시퀀스 |
| `round` | number | 현재 라운드(1부터) |
| `inputIndex` | number | 현재 입력 검증 위치 |
| `pads` | string[] | pad 색 이름 목록 (`green`,`red`,`yellow`,`blue`) |

- 영속 저장소·마이그레이션 없음. 새로고침 시 `idle` 초기 상태로 복귀.

---

## 9. 테스트 계약 (focused)

- 대상: `webaudio-memory-tone/tests/game.test.js` (developer 소유).
- 레벨: unit. `src/game.js` 순수 로직 대상.
- 주입된 무작위 스텁으로 결정적 시퀀스 생성 → 정답 경로(라운드 증가),
  오답 경로(gameover), 재시작 초기화(AC-5)를 검증한다.
- 실행: `npm test` (표시용). focused 스코프이므로 신규/수정 테스트만 실행한다.
- 증거: `build_result`(자동 생산)를 필수 evidence 로 사용하고, tester packet 이
  `test_result` 를 제공한다.

---

## 10. Handoff 계약

- **designer (BF-1741)**: 위 동결 UI 계약(selector·상태·token·접근성·반응형)을
  그대로 사용해 `design-mockup.html`, `design-tokens.html` 등 시각 산출물을
  작성한다. selector·token 을 변경·재정의하지 않는다.
- **developer (BF-1742)**: 7절 로직/렌더링 분리와 7.1 무작위 주입 인터페이스를
  따라 `index.html`, `styles.css`, `src/*.js`, `tests/game.test.js` 를 구현한다.
- **reviewer / tester**: frozen blueprint 의 파일·상태·후조건 준수와 AC 충족,
  결정적 테스트 통과를 검증한다.

초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행
control(`start-button`)을 다시 사용할 수 있어야 한다(AC-5).

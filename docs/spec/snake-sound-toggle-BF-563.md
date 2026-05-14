# 지렁이게임 효과음 토글 UX 명세 — BF-563

> 작성자: [박기획] · 작성일 2026-05-14  
> 관련 티켓: BF-564 (planner 작업), BF-563 (부모 스토리)  
> 기반 모듈: `snake/` (game.js / logic.js / styles.css / index.html)  
> 의존 명세: `docs/spec/snake-items-BF-538.md` (아이템 시스템), `docs/design/snake-hud-BF-558.md` (HUD 레이아웃)

---

## 목차

1. [개요](#1-개요)
2. [토글 UX 명세](#2-토글-ux-명세)
3. [localStorage 데이터 모델](#3-localstorage-데이터-모델)
4. [효과음 트리거 시점 정의](#4-효과음-트리거-시점-정의)
5. [효과음 구현 방식 선택 — Web Audio API vs mp3](#5-효과음-구현-방식-선택--web-audio-api-vs-mp3)
6. [효과음 파라미터 (Web Audio API)](#6-효과음-파라미터-web-audio-api)
7. [사용자 시나리오](#7-사용자-시나리오)
8. [Edge Case 목록](#8-edge-case-목록)
9. [디자이너 위임 시각 요소](#9-디자이너-위임-시각-요소)
10. [Acceptance Criteria 매핑](#10-acceptance-criteria-매핑)

---

## 1. 개요

### 1-1. 도입 목적

지렁이게임에 효과음(food 먹기 / 게임 오버)을 추가하되, 소리가 불필요한 환경(사무실·심야·공용 공간)을 배려하여 1클릭으로 ON/OFF 전환 가능한 토글을 제공한다.

### 1-2. 적용 범위

| 항목 | 내용 |
|------|------|
| 효과음 이벤트 | food 충돌(먹기), game over |
| 토글 형태 | 아이콘 버튼 (🔊 / 🔇) |
| 설정 지속성 | localStorage 키로 브라우저 세션 간 유지 |
| 기본값 | ON (true) |

---

## 2. 토글 UX 명세

### 2-1. 토글 위치

| 항목 | 값 |
|------|----|
| 화면 위치 | 우상단 (upper-right) 고정 |
| CSS position | `position: fixed; top: 16px; right: 20px` |
| z-index | `11` (기존 `#hud` z-index: 10 보다 1 높게 — 항상 클릭 가능) |
| HTML 배치 | `#hud` 보다 위에 DOM 선언 (포커스 순서 우선) |

> **디자이너 주의**: 기존 `#hud`(우상단 점수판) 와 겹치지 않도록 `#hud` 의 `top` 값을 `52px`로 하향 조정 필요 (토글 32px + 간격 4px). `#hud-status-panel` 은 연쇄하여 `96px`로 조정.

### 2-2. 클릭 영역 및 크기

| 항목 | 값 |
|------|----|
| 시각 크기 | `32px × 32px` |
| 최소 탭 영역 (WCAG 2.1 AA) | `44px × 44px` — padding 으로 보상 (e.g. `padding: 6px`) |
| 클릭 영역 | 버튼 요소 전체 (터치/마우스 동일) |
| 커서 | `cursor: pointer` |

### 2-3. 아이콘 상태 정의

| 상태 | 아이콘 | 의미 |
|------|--------|------|
| ON (소리 있음) | 🔊 | 효과음 활성. 클릭 시 OFF 전환 |
| OFF (소리 없음) | 🔇 | 효과음 비활성. 클릭 시 ON 전환 |

> 이모지 대신 CSS 아이콘(SVG 또는 폰트)을 사용할지는 디자이너가 결정. 기획은 의미만 정의한다.

### 2-4. 접근성 요구사항

| 항목 | 값 |
|------|----|
| 요소 타입 | `<button type="button">` |
| aria-label | ON 상태: `"효과음 켜짐 — 클릭하여 끄기"` / OFF 상태: `"효과음 꺼짐 — 클릭하여 켜기"` |
| aria-pressed | `true` (ON) / `false` (OFF) |
| 포커스 링 | 게임 중 키보드 사용자가 토글에 접근 가능하도록 `:focus-visible` 스타일 필요 |

### 2-5. 클릭 동작 흐름

```
클릭 이벤트 발생
  → 현재 상태 반전 (ON → OFF, OFF → ON)
  → localStorage 저장 ("bf-snake-sound-enabled", boolean)
  → 아이콘 + aria-label 업데이트
  → (게임 중단 없음 — 게임 상태(state) 불변)
```

### 2-6. HTML 요소 ID

```html
<!-- FIXME(BF-563): dev 구현 시 참고 — index.html 에 #hud 이전 위치에 삽입 -->
<button
  id="sound-toggle"
  type="button"
  aria-label="효과음 켜짐 — 클릭하여 끄기"
  aria-pressed="true"
>
  🔊
</button>
```

---

## 3. localStorage 데이터 모델

### 3-1. 키 네이밍

| 항목 | 값 |
|------|----|
| localStorage 키 | `"bf-snake-sound-enabled"` |
| 네이밍 근거 | 기존 키 컨벤션 `"bf-snake-*"` 통일 (cf. `"bf-snake-high-score"`) |
| 저장 타입 | JSON-serialized boolean (`"true"` / `"false"`) |
| 기본값 | `true` (ON) |

### 3-2. 초기화 로직

```js
// FIXME(BF-563): game.js 초기화 블록에 추가
const LS_SOUND_KEY = "bf-snake-sound-enabled";

function loadSoundEnabled() {
  const raw = localStorage.getItem(LS_SOUND_KEY);
  if (raw === null) return true;       // 키 없으면 기본값 ON
  return raw === "true";               // 명시적 문자열 비교
}

function saveSoundEnabled(enabled) {
  localStorage.setItem(LS_SOUND_KEY, String(enabled));
}
```

### 3-3. 기존 localStorage 키와의 충돌 여부

| 기존 키 | 충돌 여부 |
|---------|---------|
| `bf-snake-high-score` | 없음 |
| `bf-snake-comp-kpi` | 없음 |
| `bf-snake-multiplier-kpi` | 없음 |
| `bf-snake-item-kpi` | 없음 |
| `bf-snake-item-stats` | 없음 |
| `bf-snake-sound-enabled` | **신규 추가** |

---

## 4. 효과음 트리거 시점 정의

### 4-1. 트리거 시점 목록

| 이벤트 | 트리거 조건 | 감지 위치 | 효과음 |
|--------|-----------|---------|--------|
| **먹기 (food 충돌)** | `game.js` 루프에서 이전 프레임과 현재 프레임의 `state.food` 참조가 변경됨 | `prevState.food !== null && state.food !== prevState.food` | eat 효과음 |
| **게임 오버** | `state.status` 가 `"playing"` → `"gameover"` 로 전환됨 | `prevState.status === "playing" && state.status === "gameover"` | gameover 효과음 |

> 이 두 가지 이벤트 외의 시점(아이템 획득, 일시정지 등)에는 효과음을 추가하지 않는다. 추후 기획 확장 대상으로 남긴다.

### 4-2. 감지 구현 가이드 (game.js 루프)

```js
// FIXME(BF-563): game.js 의 게임 루프(requestAnimationFrame 또는 setInterval) 내부
// prevState 를 이전 프레임 상태로 유지

// -- 먹기 감지 --
const ateFoodThisFrame =
  prevState.food !== null && state.food !== prevState.food;
if (ateFoodThisFrame && soundEnabled) {
  playEatSound();
}

// -- 게임 오버 감지 --
const justGameOver =
  prevState.status === "playing" && state.status === "gameover";
if (justGameOver && soundEnabled) {
  playGameOverSound();
}
```

### 4-3. soundEnabled 전역 변수 관리

```js
// FIXME(BF-563): 초기화 시 로드, 토글 클릭 시 갱신
let soundEnabled = loadSoundEnabled();  // 페이지 로드 시 1회

document.getElementById("sound-toggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  saveSoundEnabled(soundEnabled);
  updateSoundToggleUI(soundEnabled);
});
```

---

## 5. 효과음 구현 방식 선택 — Web Audio API vs mp3

### 5-1. 비교표

| 비교 항목 | Web Audio API | mp3 파일 |
|-----------|--------------|---------|
| **외부 파일 의존성** | 없음 (순수 JS) | `.mp3` 파일 추가 필요 |
| **file:// 프로토콜 동작** | ✅ 완전 동작 | ❌ CORS 차단 발생 (BF-518 선례) |
| **구현 난이도** | 중간 (Oscillator API) | 낮음 (`<audio>` 태그) |
| **음질** | 단순 합성음 (전자음) | 실제 녹음 수준 |
| **번들 크기 증가** | 0 bytes | mp3 파일 크기만큼 증가 |
| **브라우저 지원** | 모든 현대 브라우저 | 모든 현대 브라우저 |
| **CORS 이슈** | 없음 | file:// 프로토콜에서 발생 |
| **모바일 주의사항** | 사용자 인터랙션 후 AudioContext 활성화 필요 | 동일 |

### 5-2. 최종 선택: **Web Audio API**

**선택 사유**:

1. **file:// CORS 차단 우회**: 이 프로젝트는 file:// 프로토콜에서 직접 실행 가능해야 한다(BF-518 참조). `<audio src="eat.mp3">` 방식은 Chromium 계열에서 file:// CORS 정책으로 차단된다. Web Audio API는 JS 합성이므로 이 제약이 없다.

2. **외부 의존성 0건 원칙**: 기존 프로젝트 패턴(BF-518, BF-536)에서 CDN·외부 파일을 사용하지 않는다. Web Audio API는 추가 파일 없이 인라인 JS로 구현 가능하다.

3. **지렁이게임 특성 적합**: 효과음은 짧은 전자음 2종이므로 고품질 녹음 음원이 불필요하다. Oscillator 기반 합성음으로 게임 분위기에 충분히 어울린다.

---

## 6. 효과음 파라미터 (Web Audio API)

### 6-1. AudioContext 초기화 규칙

- `AudioContext` 는 최초 사용자 인터랙션(키 입력·클릭) 발생 후 1회만 생성한다 (브라우저 Autoplay Policy).
- 게임 시작(Space 키) 또는 토글 클릭 시 `AudioContext` 가 없으면 생성.
- 이후 재사용 (singleton 패턴).

```js
// FIXME(BF-563): game.js 에 추가
let _audioCtx = null;
function getAudioContext() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}
```

### 6-2. eat 효과음 파라미터

| 항목 | 값 |
|------|----|
| 파형 | `sine` |
| 시작 주파수 | `880 Hz` (A5) |
| 종료 주파수 | `1320 Hz` (E6) — 상승 sweep |
| 총 지속 시간 | `80ms` |
| 볼륨 (gain) | `0.35` → `0` (80ms 내 선형 페이드아웃) |
| 개요 | 경쾌하고 짧은 상승음. 배수와 무관하게 동일 소리 사용 |

```js
// FIXME(BF-563): dev 구현 참고 — 배수별 피치 분기는 이번 스코프 밖
function playEatSound() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(1320, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}
```

### 6-3. game over 효과음 파라미터

| 항목 | 값 |
|------|----|
| 파형 | `sawtooth` |
| 시작 주파수 | `440 Hz` (A4) |
| 종료 주파수 | `110 Hz` (A2) — 하강 sweep |
| 총 지속 시간 | `600ms` |
| 볼륨 (gain) | `0.4` → `0` (600ms 내 선형 페이드아웃) |
| 개요 | 무겁고 하강하는 실패음. 게임 종료 분위기 전달 |

```js
// FIXME(BF-563): dev 구현 참고
function playGameOverSound() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.6);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.6);
}
```

---

## 7. 사용자 시나리오

### 7-1. 기본 플레이 (소리 ON, 기본값)

```
Given localStorage 에 "bf-snake-sound-enabled" 키가 없거나 "true"인 경우
When 페이지가 로드되면
Then 토글 버튼에 🔊 아이콘이 표시된다
 And soundEnabled = true 상태로 초기화된다

Given soundEnabled = true
When 플레이어가 food 셀을 먹으면
Then 80ms 상승 eat 효과음이 재생된다

Given soundEnabled = true
When 게임 오버가 발생하면
Then 600ms 하강 gameover 효과음이 재생된다
```

### 7-2. 토글로 소리 OFF 전환

```
Given 소리가 ON 상태인 경우
When 플레이어가 🔊 버튼을 클릭하면
Then 버튼 아이콘이 🔇로 변경된다
 And aria-label 이 "효과음 꺼짐 — 클릭하여 켜기"로 변경된다
 And aria-pressed 가 "false"로 변경된다
 And localStorage 에 "bf-snake-sound-enabled": "false" 가 저장된다
 And 이후 food 먹기·게임 오버 시 효과음이 재생되지 않는다
 And 게임 상태(state)는 변경되지 않는다
```

### 7-3. 페이지 재방문 시 설정 복원

```
Given 이전 세션에서 사운드를 OFF로 설정한 경우
 And localStorage["bf-snake-sound-enabled"] = "false"
When 페이지를 새로고침하거나 재방문하면
Then 토글이 🔇 상태로 복원된다
 And soundEnabled = false 로 초기화된다
 And 효과음이 비활성화된 채 게임이 시작된다
```

---

## 8. Edge Case 목록

| # | Edge Case | 처리 방식 |
|---|-----------|---------|
| EC-01 | localStorage 읽기 실패 (프라이빗 브라우징, 용량 초과) | try-catch 로 감싸고, 기본값 `true`(ON) 사용. 에러 무시. |
| EC-02 | AudioContext 생성 실패 (구형 브라우저, 보안 정책) | try-catch 로 감싸고 effectSound 함수 no-op 처리. 토글 UI 는 정상 표시. |
| EC-03 | 사용자 인터랙션 전 효과음 호출 시도 | `AudioContext.state === "suspended"` 이면 `resume()` 후 재생. 실패 시 무시. |
| EC-04 | 게임 오버 효과음 재생 중 즉시 재시작 | 재시작 시 이전 `OscillatorNode` 는 `stop()` 으로 중단. 새 게임에서 클린 상태 시작. |
| EC-05 | 토글 클릭 이벤트가 게임 키 입력과 동시 발생 | 버튼은 `type="button"` — form submit 없음. 게임 keydown 핸들러와 독립. |
| EC-06 | 동일 프레임에서 food 먹기와 게임 오버 동시 발생 | eat 효과음 먼저, 곧이어 gameover 효과음 재생. 두 소리 모두 트리거. |
| EC-07 | `localStorage` 에 올바르지 않은 값 (`"undefined"`, `"1"`, `""`) 저장됨 | `raw === "true"` 엄격 비교 — 그 외 모든 값은 `false` 처리. |

---

## 9. 디자이너 위임 시각 요소

이 섹션은 디자이너(이디자인) 전담 영역이다. 기획은 요구사항만 정의한다.

| 항목 | 요청 사항 |
|------|---------|
| 토글 버튼 외형 | 32×32px. 다크 배경(`#0d0d0d`)에서 가독성 있는 아이콘. 기존 HUD 폰트(`Courier New`)와 어울리는 스타일 |
| ON 상태 아이콘 | 🔊 이모지 또는 CSS SVG 스피커 아이콘 (채워진 형태) |
| OFF 상태 아이콘 | 🔇 이모지 또는 CSS SVG 음소거 아이콘 (X 표시) |
| 반투명 배경 | 기존 HUD 패널 스타일 `rgba(0,0,0,0.45)` 참조 |
| hover 효과 | 배경 밝기 살짝 증가 (기존 `.paused-btn:hover` 참조) |
| 위치 조정 | `#hud` 와 `#hud-status-panel` 의 `top` 값 하향 조정 필요 (§2-1 주의사항) |
| 포커스 링 | `:focus-visible` 시 `outline: 2px solid #4cff80` (기존 HUD 포커스 색상과 통일) |

---

## 10. Acceptance Criteria 매핑

| AC 항목 | 조건 | 명세 섹션 | 충족 여부 |
|---------|------|---------|---------|
| AC-1 | `docs/spec/snake-sound-toggle-BF-563.md` 생성 | 본 문서 | ✅ 완료 |
| AC-2-1 | 토글 위치 (우상단) 명시 | §2-1 | ✅ 완료 |
| AC-2-2 | 클릭 영역 32px 명시 | §2-2 | ✅ 완료 |
| AC-2-3 | localStorage 키 명시 | §3-1 (`"bf-snake-sound-enabled"`) | ✅ 완료 |
| AC-2-4 | 기본값 ON 명시 | §3-1, §3-2 | ✅ 완료 |
| AC-2-5 | 효과음 트리거 시점 — food 충돌 | §4-1, §4-2 | ✅ 완료 |
| AC-2-6 | 효과음 트리거 시점 — game over | §4-1, §4-2 | ✅ 완료 |
| AC-3 | Web Audio API vs mp3 비교표 | §5-1 | ✅ 완료 |
| AC-3 | 최종 선택 사유 기록 | §5-2 | ✅ 완료 |

---

이 문서는 BF-564 planner 작업의 산출물입니다.  
후속 작업자(developer, designer)는 이 명세를 기준으로 구현·디자인을 진행하십시오.

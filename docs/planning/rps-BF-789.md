# 가위바위보 게임 기획 명세 — BF-789

> 작성자: [박기획] · 작성일 2026-06-02  
> 관련 티켓: BF-790 (planner task), BF-789 (부모 스토리)  
> 신규 모듈: `rps/`  
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의  
> 단위 테스트: `node --test tests/rps-*.test.js`

---

## 목차

1. [개요](#1-개요)
2. [게임 규칙](#2-게임-규칙)
3. [사용자 시나리오 및 UX 흐름](#3-사용자-시나리오-및-ux-흐름)
4. [파일 구조 및 모듈 경계](#4-파일-구조-및-모듈-경계)
5. [`judge` 함수 Contract](#5-judge-함수-contract)
6. [단위 테스트 케이스 표 (9가지 조합)](#6-단위-테스트-케이스-표-9가지-조합)
7. [상태 모델 (누적 전적)](#7-상태-모델-누적-전적)
8. [키보드 단축키](#8-키보드-단축키)
9. [기술 제약 (file:// 호환)](#9-기술-제약-file-호환)
10. [Acceptance Criteria (Given/When/Then)](#10-acceptance-criteria-givenwhenthen)
11. [Edge Case 목록](#11-edge-case-목록)
12. [비범위 (Out of Scope)](#12-비범위-out-of-scope)
13. [디자이너 위임 시각 요소](#13-디자이너-위임-시각-요소)

---

## 1. 개요

### 1.1 목적

플레이어가 가위·바위·보 중 하나를 선택하면 컴퓨터(CPU)가 무작위로 선택하고,
승패 판정 결과를 즉시 표시하며 누적 전적을 localStorage 에 저장하는 단일 SPA 를
바닐라 HTML/CSS/JS 로 구현한다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 신규 경로 | `rps/` (index.html / styles.css / logic.js / main.js) |
| 기존 코드 영향 | 없음 — 완전 독립 모듈 |
| 저장소 사용 | `localStorage` — 누적 전적(승/무/패) 영속 저장 |
| 외부 라이브러리 | 없음 — `file://` 프로토콜 직접 열기 가능 |

### 1.3 전제 조건

- 브라우저 환경 (Chrome / Edge / Firefox 최신 버전)
- `rps/` 디렉터리가 프로젝트 루트에 존재
- `logic.js` 가 UMD 패턴으로 작성되어 Node.js(CommonJS) + 브라우저(globalThis) 양쪽에서 로드 가능
- `tests/rps-*.test.js` 파일이 `node --test` 로 실행 가능

---

## 2. 게임 규칙

### 2.1 선택지 정의

| 식별자 | 한국어 | 이모지 | 이긴 상대 |
|--------|--------|--------|-----------|
| `scissors` | 가위 | ✌️ | 보 (paper) |
| `rock` | 바위 | ✊ | 가위 (scissors) |
| `paper` | 보 | 🖐 | 바위 (rock) |

### 2.2 승패 판정 규칙

| 플레이어 | CPU | 결과 |
|----------|-----|------|
| scissors | scissors | draw (무) |
| scissors | rock | lose (패) |
| scissors | paper | win (승) |
| rock | scissors | win (승) |
| rock | rock | draw (무) |
| rock | paper | lose (패) |
| paper | scissors | lose (패) |
| paper | rock | win (승) |
| paper | paper | draw (무) |

### 2.3 CPU 전략

- **완전 랜덤**: `Math.random()` 기반으로 3가지 선택지를 균등 확률로 선택
- AI 전략·가중치 없음 (v1)

### 2.4 게임 진행 흐름

```
[선택 입력] 플레이어 버튼 클릭 또는 키보드 단축키
    ↓
[플레이어 카드] 선택한 이모지 즉시 표시
    ↓
[CPU 생각 중] 500ms 딜레이 + 점 세 개 애니메이션
    ↓
[CPU 카드 공개] 무작위 선택 이모지 표시 + flipIn 애니메이션
    ↓
[판정 배너] WIN / LOSE / DRAW 결과 배너 표시 (200ms 후)
    ↓
[전적 업데이트] 점수판 카운터 증가 + 팝 애니메이션 + localStorage 저장
```

---

## 3. 사용자 시나리오 및 UX 흐름

### 3.1 정상 플레이 흐름 (Happy Path)

```
[게임 시작]
  └─ 페이지 로드 → localStorage 에서 이전 전적 복원 → 초기 상태(idle) 표시

[선택 입력]
  └─ 버튼 클릭 또는 R/P/S 키 입력
      └─ thinking 상태 진입 (버튼 비활성)
          └─ CPU 선택 공개 → 판정 → 결과 배너 → 전적 갱신

[전적 초기화]
  └─ 초기화 버튼 클릭 (또는 키보드 단축키)
      └─ 전적 0으로 초기화 + localStorage 초기화 + 카드 리셋
```

### 3.2 화면 상태 전이

| 상태 ID | 상태명 | 선택 버튼 | 초기화 버튼 | 결과 배너 |
|---------|--------|-----------|-------------|-----------|
| `idle` | 대기 | 활성 | 활성 | 숨김 |
| `thinking` | CPU 생각 중 | **비활성** | 활성 | 숨김 |
| `result-win` | 승리 결과 | 활성 | 활성 | WIN 표시 |
| `result-lose` | 패배 결과 | 활성 | 활성 | LOSE 표시 |
| `result-draw` | 무승부 결과 | 활성 | 활성 | DRAW 표시 |

> **게임 상태는 `game` 요소의 `data-game-state` 속성으로 관리한다.**  
> 예: `<main id="game" data-game-state="thinking">`

---

## 4. 파일 구조 및 모듈 경계

### 4.1 파일 목록

```
rps/
├── index.html    ← HTML 마크업 + 스크립트 로드 순서 정의
├── styles.css    ← 시각 스타일, 상태별 CSS, 애니메이션 (designer 담당)
├── logic.js      ← 순수 로직 — judge / cpuPick / createScoreStore (UMD)
└── main.js       ← DOM 인터랙션 + 이벤트 바인딩 + 게임 플로우

tests/
└── rps-BF648.test.js  ← judge / cpuPick / createScoreStore 단위 테스트
```

### 4.2 스크립트 로드 순서 (index.html)

```html
<!-- logic.js 반드시 먼저 → globalThis.RpsLogic 등록 -->
<script src="logic.js"></script>
<!-- main.js 는 globalThis.RpsLogic 참조 -->
<script src="main.js"></script>
```

> `type="module"` 불가 — `file://` 프로토콜에서 CORS 오류 발생하므로  
> 전통적 `<script>` 로드 + UMD 패턴으로 전역 객체 공유.

### 4.3 모듈 책임 분리

#### `logic.js` (순수 로직 — 테스트 가능)

- `CHOICES` 상수 (선택지 메타데이터)
- `RESULTS` 상수 (결과 메타데이터)
- `judge(player, cpu)` 순수 함수 — 승패 판정
- `cpuPick()` — 랜덤 선택
- `createScoreStore(storage)` — localStorage 추상화

#### `main.js` (UI / 인터랙션)

- DOM 참조 및 이벤트 바인딩
- `play(playerChoice)` 비동기 게임 플로우
- 키보드 단축키 처리 (`R` / `P` / `S`)
- 테마 토글 처리
- 점수 초기화 (`resetScores`)

---

## 5. `judge` 함수 Contract

### 5.1 시그니처

```javascript
/**
 * 가위바위보 승패 판정 순수 함수
 *
 * @param {'scissors'|'rock'|'paper'} player - 플레이어 선택
 * @param {'scissors'|'rock'|'paper'} cpu    - CPU 선택
 * @returns {'win'|'lose'|'draw'}
 *
 * 판정 규칙:
 *   scissors > paper  (가위는 보를 이김)
 *   rock > scissors   (바위는 가위를 이김)
 *   paper > rock      (보는 바위를 이김)
 *   동일 → draw
 */
function judge(player, cpu) { ... }
```

### 5.2 반환 값 Contract

| 조건 | 반환 값 |
|------|---------|
| `player === cpu` | `'draw'` |
| `player=scissors, cpu=paper` | `'win'` |
| `player=rock, cpu=scissors` | `'win'` |
| `player=paper, cpu=rock` | `'win'` |
| 그 외 (역관계) | `'lose'` |

### 5.3 전제 조건 (Preconditions)

- `player` 와 `cpu` 는 반드시 `'scissors'` / `'rock'` / `'paper'` 중 하나
- 유효하지 않은 값에 대한 방어 처리는 **caller 책임** — `judge` 자체는 guard 없음

### 5.4 부작용 (Side Effects)

- **없음** — 순수 함수. DOM 조작·난수 생성·상태 변경 없음.

### 5.5 Export 방식 (UMD 패턴)

```javascript
// logic.js — UMD: 브라우저(globalThis)와 Node.js(module.exports) 양립
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module && module.exports) {
    module.exports = api;   // Node.js: const Logic = require('./rps/logic.js')
  }
  if (root) {
    root.RpsLogic = api;    // 브라우저: globalThis.RpsLogic
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // ... 구현 ...
  return { CHOICES, RESULTS, cpuPick, judge, createScoreStore };
});
```

테스트 파일에서 `const { judge } = require('../rps/logic.js')` 로 가져온다.

---

## 6. 단위 테스트 케이스 표 (9가지 조합)

### 6.1 테스트 실행 명령

```bash
node --test tests/rps-BF648.test.js
```

### 6.2 `judge()` 9가지 판정 케이스

| TC-ID | player | cpu | 기대 결과 | 설명 |
|-------|--------|-----|-----------|------|
| TC-J01 | `scissors` | `scissors` | `'draw'` | 가위 vs 가위 → 무 |
| TC-J02 | `scissors` | `rock` | `'lose'` | 가위 vs 바위 → 패 |
| TC-J03 | `scissors` | `paper` | `'win'` | 가위 vs 보 → 승 |
| TC-J04 | `rock` | `scissors` | `'win'` | 바위 vs 가위 → 승 |
| TC-J05 | `rock` | `rock` | `'draw'` | 바위 vs 바위 → 무 |
| TC-J06 | `rock` | `paper` | `'lose'` | 바위 vs 보 → 패 |
| TC-J07 | `paper` | `scissors` | `'lose'` | 보 vs 가위 → 패 |
| TC-J08 | `paper` | `rock` | `'win'` | 보 vs 바위 → 승 |
| TC-J09 | `paper` | `paper` | `'draw'` | 보 vs 보 → 무 |

### 6.3 `cpuPick()` 케이스

| TC-ID | 조건 | 기대 동작 |
|-------|------|-----------|
| TC-C01 | 100회 호출 | 반환값이 항상 `'scissors'\|'rock'\|'paper'` 중 하나 |
| TC-C02 | 1000회 호출 | 3가지 선택지가 모두 1회 이상 등장 (균형성) |

### 6.4 `createScoreStore()` 케이스

| TC-ID | 시나리오 | 기대 동작 |
|-------|----------|-----------|
| TC-S01 | 초기 로드 (빈 storage) | `{ win: 0, draw: 0, lose: 0 }` 반환 |
| TC-S02 | `save()` 후 `load()` | 동일 값 반환 |
| TC-S03 | `save()` 후 `reset()` 후 `load()` | `{ win: 0, draw: 0, lose: 0 }` |
| TC-S04 | storage 에 기존 값 존재 | 기존 값 정확히 읽음 |
| TC-S05 | storage 값 손상 (JSON 파싱 실패) | 기본값 `{ win: 0, draw: 0, lose: 0 }` 반환 |

### 6.5 테스트 파일 구조 (참조 템플릿)

```javascript
// tests/rps-BF648.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { judge, cpuPick, createScoreStore, CHOICES, RESULTS } = require('../rps/logic.js');

// --- judge 9가지 판정 ---
test('judge: 가위 vs 가위 → draw',   () => assert.equal(judge('scissors', 'scissors'), 'draw'));
test('judge: 가위 vs 바위 → lose',   () => assert.equal(judge('scissors', 'rock'),     'lose'));
test('judge: 가위 vs 보 → win',      () => assert.equal(judge('scissors', 'paper'),    'win'));
test('judge: 바위 vs 가위 → win',    () => assert.equal(judge('rock', 'scissors'),     'win'));
test('judge: 바위 vs 바위 → draw',   () => assert.equal(judge('rock', 'rock'),         'draw'));
test('judge: 바위 vs 보 → lose',     () => assert.equal(judge('rock', 'paper'),        'lose'));
test('judge: 보 vs 가위 → lose',     () => assert.equal(judge('paper', 'scissors'),    'lose'));
test('judge: 보 vs 바위 → win',      () => assert.equal(judge('paper', 'rock'),        'win'));
test('judge: 보 vs 보 → draw',       () => assert.equal(judge('paper', 'paper'),       'draw'));
```

---

## 7. 상태 모델 (누적 전적)

### 7.1 인메모리 상태 객체

```javascript
// main.js 에서 관리하는 단일 상태 객체
var score = {
  win:  0,  // 누적 승리 횟수
  draw: 0,  // 누적 무승부 횟수
  lose: 0,  // 누적 패배 횟수
};
```

### 7.2 localStorage 키 스키마

| 키 | 타입 | 설명 |
|----|------|------|
| `rps:score` | JSON string | `{ win: number, draw: number, lose: number }` |
| `rps:theme` | string | `'dark'` 또는 `'light'` |

### 7.3 스코어 저장 흐름

```
판정 완료
  → score[result]++        (인메모리 업데이트)
  → renderScore()          (DOM 갱신)
  → popScore(result)       (팝 애니메이션)
  → scoreStore.save(score) (localStorage 영속화)
```

### 7.4 `createScoreStore(storage)` 인터페이스

```javascript
/**
 * localStorage 추상화 팩토리 — 테스트 시 mock storage 주입 가능
 * @param {Storage} storage - localStorage 또는 테스트용 메모리 mock
 * @returns {{ load(): Score, save(score: Score): void, reset(): void }}
 */
function createScoreStore(storage) { ... }
```

| 메서드 | 동작 |
|--------|------|
| `load()` | `rps:score` 키에서 JSON 파싱. 없거나 손상 시 `{win:0,draw:0,lose:0}` |
| `save(score)` | `rps:score` 키에 JSON 직렬화 저장 |
| `reset()` | `rps:score` 키를 `{win:0,draw:0,lose:0}` 으로 덮어쓰기 |

---

## 8. 키보드 단축키

### 8.1 단축키 매핑 표

| 키 | 동작 | 선택지 | 한국어 |
|----|------|--------|--------|
| `R` | `play('rock')` | 바위 | ✊ |
| `P` | `play('paper')` | 보 | 🖐 |
| `S` | `play('scissors')` | 가위 | ✌️ |

> **설계 의도**: 영어 니모닉 `R`ock / `P`aper / `S`cissors — 직관적 암기 가능

### 8.2 상태에 따른 단축키 처리

| 게임 상태 | R/P/S 키 | 동작 |
|-----------|-----------|------|
| `idle` | 유효 | `play()` 호출 |
| `result-*` | 유효 | `play()` 호출 (연속 플레이) |
| `thinking` | **무시** | CPU 결과 대기 중이므로 입력 차단 |

### 8.3 구현 지침 (main.js)

```javascript
document.addEventListener('keydown', function (e) {
  // thinking 중에는 키보드 입력 차단
  if (game.dataset.gameState === 'thinking') return;

  // R/P/S — 대소문자 모두 처리
  if (e.key === 'r' || e.key === 'R') play('rock');
  if (e.key === 'p' || e.key === 'P') play('paper');
  if (e.key === 's' || e.key === 'S') play('scissors');
});
```

> **주의**: `r`/`R` 키가 현재 `resetScores` 에 바인딩된 경우 → 바위(rock) 선택으로 **재할당**한다.  
> 초기화 버튼은 UI 버튼 클릭 전용으로 변경하거나 `Delete`/`Escape` 키로 이동한다.  
> 최종 결정은 developer 가 구현 시 AC-07 을 기준으로 판단한다.

### 8.4 접근성

- 키보드 단축키는 보조 기술(스크린리더) 에서는 사용 불가 — 버튼 클릭으로도 완전히 동작해야 함
- 선택 버튼에 `aria-label` 명시: `"가위 선택 (S키)"` 형식으로 단축키 힌트 제공

---

## 9. 기술 제약 (file:// 호환)

### 9.1 핵심 제약 일람

| 제약 | 이유 | 위반 금지 사례 |
|------|------|----------------|
| `<script type="module">` 금지 | `file://` CORS 오류 | `import` / `export` 사용 불가 |
| 외부 CDN 금지 | `file://` 에서 `https://` 혼합 콘텐츠 차단 | Bootstrap, jQuery, 구글 폰트 등 |
| `fetch()` 금지 | `file://` CORS 제한 | JSON 파일 로드 등 |
| 빌드 툴 금지 | 단일 SPA — 빌드 없이 직접 열기 | Webpack, Vite, Rollup, Babel 등 |
| 외부 패키지 `import` 금지 | node_modules 참조 불가 | npm install 결과물 참조 |

### 9.2 허용 패턴

```
✅ <script src="logic.js"></script>   (상대 경로 로컬 파일)
✅ <link rel="stylesheet" href="styles.css">
✅ localStorage / sessionStorage
✅ CSS 변수 (--color-*) 자체 정의
✅ system font stack (font-family: system-ui, sans-serif)
✅ UMD 패턴으로 모듈 공유 (globalThis.RpsLogic)
```

### 9.3 단일 SPA 구조 명시

```
rps/index.html 을 브라우저에서 직접 더블 클릭하면 즉시 게임 실행 가능.
서버 없이도 동작 — 제로 빌드 스텝.
```

---

## 10. Acceptance Criteria (Given/When/Then)

### AC-01: Epic 요구사항 기반 문서화

> **Given** Epic BF-789 요구사항이 주어졌을 때  
> **When** planner 가 `docs/planning/rps-BF-789.md` 를 작성하면  
> **Then** AC·게임 규칙·`judge` 함수 시그니처·UI 흐름·키보드 단축키·기술 제약이 모두 정리되어야 한다

---

### AC-02: 기술 제약 명문화 — 단일 SPA 구조

> **Given** 기술 제약 (vanilla-static, file:// 호환, 외부 의존성 0) 이 주어졌을 때  
> **When** 설계 문서를 검토하면  
> **Then** 빌드툴/CDN/프레임워크 의존이 없는 단일 SPA 구조가 §9 에 명시되어야 한다

---

### AC-03: `judge` 순수함수 — 9가지 단위 테스트 케이스

> **Given** `judge(player, cpu)` 순수함수가 `logic.js` 에 정의되어 있을 때  
> **When** `node --test tests/rps-BF648.test.js` 를 실행하면  
> **Then** TC-J01 ~ TC-J09 의 9개 케이스(승/패/무 각 3가지)가 모두 통과해야 한다

---

### AC-04: 키보드 단축키 — R/P/S 바인딩

> **Given** 게임이 `idle` 또는 `result-*` 상태일 때  
> **When** 플레이어가 키보드에서 `R`(Rock), `P`(Paper), `S`(Scissors) 키를 누르면  
> **Then** 해당 선택지를 선택한 것과 동일하게 게임 플로우(`play()`)가 실행되어야 한다

---

### AC-05: `thinking` 상태에서 입력 차단

> **Given** CPU 가 선택 중인 `thinking` 상태일 때  
> **When** 플레이어가 R/P/S 키 또는 선택 버튼을 누르면  
> **Then** 입력이 무시되고 현재 판정 플로우가 정상 완료되어야 한다

---

### AC-06: 누적 전적 영속화

> **Given** 플레이어가 여러 판을 진행했을 때  
> **When** 브라우저를 새로고침하거나 탭을 닫고 다시 열면  
> **Then** `localStorage['rps:score']` 에서 이전 전적(승/무/패)이 복원되어 점수판에 표시되어야 한다

---

### AC-07: 전적 초기화

> **Given** 누적 전적이 존재하는 상태에서  
> **When** 초기화 버튼을 클릭하면  
> **Then** 점수판이 0/0/0 으로 초기화되고 `localStorage['rps:score']` 도 초기화되며 카드가 idle 상태로 리셋되어야 한다

---

### AC-08: 게임 플로우 — CPU 생각 딜레이

> **Given** 플레이어가 선택을 완료했을 때  
> **When** CPU 선택 공개 전  
> **Then** 최소 500ms 의 딜레이와 함께 "생각 중" 시각 피드백이 표시되어야 한다

---

### AC-09: 결과 배너 표시

> **Given** 판정 완료 후  
> **When** 결과가 결정되면  
> **Then** WIN / LOSE / DRAW 배너가 `data-result` 속성과 함께 표시되고 이모지·텍스트가 올바르게 렌더링되어야 한다

---

## 11. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|--------------|----------|-----------|
| EC-01 | `thinking` 중 버튼 클릭 | 무시 — 현재 판정 플로우 유지 |
| EC-02 | `thinking` 중 R/P/S 키 입력 | 무시 |
| EC-03 | localStorage 손상된 JSON | `{win:0,draw:0,lose:0}` 으로 폴백 |
| EC-04 | localStorage 비어있음 (첫 방문) | `{win:0,draw:0,lose:0}` 으로 초기화 |
| EC-05 | `score` 의 특정 필드가 숫자가 아님 | `Number(parsed.field) \|\| 0` 으로 0 처리 |
| EC-06 | 연속 빠른 선택 (더블 클릭) | `thinking` 상태에서 두 번째 이후 입력 차단 |
| EC-07 | 테마 저장 값 없음 (첫 방문) | `'dark'` 기본 테마 적용 |
| EC-08 | `judge` 에 잘못된 값 전달 | `undefined` 반환 가능 — caller 에서 방어 |
| EC-09 | CPU 와 플레이어 동시 draw 100판 | 점수판 숫자 표시만 — 상한 제한 없음 |
| EC-10 | 브라우저 localStorage 비활성화 | `save`/`load` try-catch 로 폴백, 게임은 인메모리로 계속 진행 |

---

## 12. 비범위 (Out of Scope)

v1 에서는 다음 기능을 구현하지 않는다. 별도 스토리에서 처리한다:

| 항목 | 이유 |
|------|------|
| 멀티플레이어 / 온라인 대전 | 서버 필요 — 별도 Epic |
| 최선 of N 게임 모드 | UX 복잡도 — 별도 스토리 |
| CPU AI 전략 (가중치) | 랜덤 완결로 충분 — v1 |
| 효과음 | 별도 Epic |
| 게임 이력 목록 표시 | UI 복잡도 — 별도 스토리 |
| 반응형 / 모바일 최적화 | designer 재량 — 기본 작동만 요구 |
| 승률 통계 / 차트 | 별도 스토리 |

---

## 13. 디자이너 위임 시각 요소

아래 항목은 기획에서 정하지 않고 디자이너(이디자인)에게 위임한다:

| 항목 | 가이드라인 |
|------|-----------|
| 컬러 팔레트 | `rps/styles.css` 에서 CSS 변수 정의. 승=초록 계열, 패=빨간 계열, 무=회색 계열 권장 |
| "생각 중" 애니메이션 | 점 세 개(`...`) 또는 스피너 — 재량 |
| 카드 flipIn 연출 | CSS 키프레임 — `transform: rotateY(90deg→0deg)` 또는 유사 |
| 결과 배너 글로우 이펙트 | WIN/LOSE/DRAW 결과별 색상 글로우 — 재량 |
| 점수 팝 애니메이션 (`score-pop`) | 숫자 갱신 시 scale 또는 bounce 효과 |
| 반응형 레이아웃 | desktop(≥768px) / mobile 2단계 — 재량 |
| `data-game-state` 속성 규칙 | `<main id="game" data-game-state="idle\|thinking\|result-win\|result-lose\|result-draw">` 구조는 **고정** |

---

*문서 종료 — [박기획] · BF-790*

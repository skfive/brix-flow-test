# 카운터 데모 기획 명세 — BF-859

> 작성자: [박기획] (planner) · 작성일 2026-07-16
> 관련 티켓: BF-860 (본 planner task) · BF-859 (부모 스토리)
> 신규 모듈: `counter/` (Epic 설명의 "`/demo/counter`" 표기에 대응 — §0 가정 2 참고)
> tech-stack: 기존 신규 모듈 전부와 동일한 `vanilla-static`(HTML/CSS/JS, 외부 의존성 0건) — §0 가정 1 참고
> 단위 테스트: `node --test tests/counter-*.test.js` (focused scope · module: `counter`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — tech-stack 재확인:** `timer/`·`stopwatch/`·`pomodoro/`·`rps/`·`clicker/`·`dice/`·`clock/` 등 기존 모든 신규 프론트엔드 모듈이 바닐라 HTML/CSS/JS + `file://` 직접 실행 호환(`vanilla-static`) 패턴이다. 본 task 의 수용 기준이 명시적으로 요구하는 제외범위(서버저장/인증/외부API/**신규패키지**)는 이 패턴과 정확히 일치한다. 별도 프레임워크·백엔드 도입 신호가 없으므로 본 문서도 동일 컨벤션을 따른다(Simplicity First).

**가정 2 — `/demo/counter` 경로 표기:** Epic 설명의 "`/demo/counter`"는 신규 카운터 SPA 를 가리키는 설명적 표현으로 해석한다. 직전 선례인 `clock-BF-839`(`docs/planning/clock-BF-839.md`)도 동일하게 해석했으나, 실제 구현(BF-842)은 저장소 루트가 아닌 `src/app/demo/clock/` 하위에 배치되어 원래 planner 가정과 달라졌다(dev 재량 편차). 본 문서는 기존 다수 모듈(`clicker/`, `rps/`, `dice/`, `notepad/` 등)과 동일하게 **저장소 루트 `counter/`** 를 1차 제안 경로로 명시하되, `clock/` 선례처럼 dev 가 라우팅 편의상 `src/app/demo/counter/` 를 택할 수 있음을 인지하고 있다 — 최종 배치는 dev 재량이며 본 문서 §4~§6 의 계약(contract) 자체는 배치 경로와 무관하게 동일하게 적용된다.

**가정 3 — 기존 `src/counter.ts`(BF-760)와의 관계:** 저장소에는 이미 immutable 카운터 순수 유틸 `src/counter.ts`(+ `src/counter.test.ts`, TDD 완료)가 존재한다(`createCounter`/`increment`/`decrement`/`reset`, 0 미만 클램프). 이는 본 Epic(BF-859)과 무관한 별도 task(BF-760)의 산출물로 보이며, 본 task 의 File Ownership 은 `docs/plan/counter-BF-859.md` 1건뿐이라 `src/counter.ts` 를 직접 수정·재사용하도록 강제할 권한이 없다. 다만 두 가지가 모두 "카운터"라는 동일 개념을 다루므로, **행동 계약(0 이상 클램프, +1/-1/리셋 시맨틱)을 동일하게 맞춰 일관성을 유지**하도록 본 문서 §2 에서 명시적으로 채택한다. 단, `src/counter.ts` 는 TypeScript ESM 이라 `file://` 브라우저에서 `<script>` 로 직접 로드할 수 없으므로(신규 빌드 도구 도입은 "신규패키지" 제외범위 위반), 신규 `counter/counter.js` 는 **동일 계약을 가진 별도의 vanilla JS 파일**로 재구현하는 것을 전제로 한다(§7.3, 기존 `rps/logic.js`·`clock/clock.js` 와 동일 패턴 — 모듈 간 상호 import 없이 각자 자기완결).

**가정 4 — 0 미만(음수) 허용 여부:** Epic/task 설명은 "초기값 0, +1/-1/초기화"만 언급하고 음수 허용 여부를 명시하지 않는다. 이미 존재하는 `src/counter.ts`(BF-760)가 0 미만으로 내려가지 않도록 클램프하는 계약을 갖고 있고, 이는 저장소 내 "카운터"에 대한 유일한 기존 판례이므로, 본 문서는 **동일하게 0-플로어(0 미만 진입 금지)를 채택**한다(§2.2, §8 AC-03). Epic 이 자유 음수(음수까지 내려가는 카운터)를 의도했다면 본 가정과 어긋나므로 운영자 확인이 필요하다(§13-1).

**가정 5 — 파일 소유권:** 본 planner task(BF-860)의 담당 파일은 `docs/plan/counter-BF-859.md` 1개뿐이다. `counter/*` 코드, `docs/design/*` 문서는 후속 designer/dev 담당 영역이며 본 task 에서 생성·수정하지 않는다.

**가정 6 — 완전 신규(forward) 모듈:** `counter/` 디렉터리·코드·테스트는 현재 저장소에 0건 존재한다(사전 확인 완료, `src/counter.ts` 는 별개 경로). 본 문서는 아직 존재하지 않는 UI 모듈의 최초 스펙을 정의하는 forward 설계 문서다.

---

## 목차

1. [개요](#1-개요)
2. [카운터 규칙](#2-카운터-규칙)
3. [사용자 시나리오 및 UX 흐름](#3-사용자-시나리오-및-ux-흐름)
4. [파일 구조 및 모듈 경계](#4-파일-구조-및-모듈-경계)
5. [`counter.js` 함수 Contract](#5-counterjs-함수-contract)
6. [접근성 — 키보드 조작 및 즉시 반영 요건 (검증 가능)](#6-접근성--키보드-조작-및-즉시-반영-요건-검증-가능)
7. [단위 테스트 전략](#7-단위-테스트-전략)
8. [Acceptance Criteria (Given/When/Then)](#8-acceptance-criteria-givenwhenthen)
9. [Edge Case 목록](#9-edge-case-목록)
10. [비범위 (Out of Scope)](#10-비범위-out-of-scope)
11. [디자이너 위임 시각 요소](#11-디자이너-위임-시각-요소)
12. [산출물 위치 및 참조 표](#12-산출물-위치-및-참조-표)
13. [남은 모호함 (운영자 확인 권장)](#13-남은-모호함-운영자-확인-권장)

---

## 1. 개요

### 1.1 목적

화면에 정수 값을 표시하고 `+1`/`-1`/`초기화` 3개 컨트롤로 값을 조작하는 최소 카운터 SPA 를 바닐라 HTML/CSS/JS 로 구현한다. 서버 저장·인증·외부 API·신규 패키지 없이 클라이언트 in-memory 상태만으로 동작하며, 마우스뿐 아니라 키보드만으로도 모든 조작이 가능해야 한다.

### 1.2 완료 조건 (Definition of Done)

| # | 완료 조건 |
|---|---|
| 1 | 페이지 로드 시 값이 정확히 `0` 으로 표시된다 |
| 2 | `+1` 조작(클릭 또는 키보드) 시 값이 1 증가하고 화면에 즉시 반영된다 |
| 3 | `-1` 조작(클릭 또는 키보드) 시 값이 1 감소하고 화면에 즉시 반영된다(단, 0 미만으로는 내려가지 않음 — §0 가정 4) |
| 4 | `초기화` 조작(클릭 또는 키보드) 시 값이 즉시 `0` 으로 재설정된다 |
| 5 | `Tab` 만으로 3개 컨트롤에 순서대로 포커스 이동이 가능하고, 포커스 상태에서 `Enter`/`Space` 로 각 조작이 동일하게 실행된다 |
| 6 | 서버 저장·인증·외부 API 호출·신규 패키지 설치가 0건이다(§10 정적 검증 가능) |

### 1.3 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `counter/`(`index.html` / `styles.css` / `counter.js` / `main.js`) — §0 가정 2, 최종 배치는 dev 재량 |
| 기존 코드 영향 | 없음 — 완전 독립 신규 모듈. `src/counter.ts`(BF-760)는 수정하지 않는다 |
| 데이터 원천 | 없음 — 클라이언트 in-memory 상태만 사용 |
| 외부 라이브러리 | 없음 — `file://` 프로토콜 직접 열기 가능 |
| 영속 저장 | 없음(v1) — 새로고침 시 항상 `0` 으로 재시작(§9 EC-05, §10) |

### 1.4 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전) 또는 Node.js(`node --test`)로 순수 함수(카운터 로직) 단위 테스트
- `counter/` 디렉터리는 아직 존재하지 않으며 본 task 이후 별도 designer/dev task 에서 신규 생성됨
- 순수 함수(`increment`/`decrement`/`reset`)는 UMD 패턴으로 작성되어 Node(CommonJS) + 브라우저(`globalThis`) 양쪽에서 로드 가능해야 함(기존 `rps/logic.js`, `clock/clock.js` 등과 동일 컨벤션)

---

## 2. 카운터 규칙

### 2.1 핵심 규칙

| 규칙 항목 | 상세 |
|---|---|
| 초기값 | **0** (페이지 로드/새로고침마다 항상 0 — 영속화 없음) |
| `+1` 연산 | `value = value + 1` — 상한 없음(§9 EC-06) |
| `-1` 연산 | `value = Math.max(0, value - 1)` — **0 미만 금지(클램프)** (§0 가정 4) |
| `초기화` 연산 | `value = 0` — 현재 값과 무관하게 항상 허용(상태 제약 없음) |
| 최대값 제한 | **없음**(v1) |
| 표시 갱신 | 모든 연산은 핸들러 내부에서 **동기적으로** DOM 을 갱신한다 — 지연(setTimeout/애니메이션 대기) 없이 같은 이벤트 처리 사이클 안에서 반영(§6.2) |

### 2.2 0-플로어(0 미만 금지) 채택 근거

`src/counter.ts`(BF-760)의 `decrement` 가 `Math.max(0, value - step)` 으로 음수를 방지하는 것과 동일한 계약을 채택한다(§0 가정 3, 4). 즉 `0` 에서 `-1` 을 눌러도 값은 `0` 을 유지하며 에러를 던지지 않는다(무음 클램프 — UI 조작은 항상 유효한 입력이므로 `src/counter.ts` 의 `assertNonNegativeInteger` 류 예외 검증은 UI 계층에는 불필요).

### 2.3 키보드 지원 (요약 — 상세는 §6)

- `Tab`: `+1` → `-1` → `초기화` 순서로 포커스 이동(네이티브 `<button>` 사용 시 기본 제공)
- `Enter` / `Space`: 포커스된 버튼과 동일한 클릭 동작 실행(네이티브 `<button>` 기본 제공)
- 전역 단축키(포커스 위치 무관): `ArrowUp` = `+1`, `ArrowDown` = `-1`, `R` = `초기화`

---

## 3. 사용자 시나리오 및 UX 흐름

### 3.1 정상 조작 흐름 (Happy Path)

```
[페이지 로드]
  └─ 화면 로드 → 카운터 값 = 0 표시 → +1 버튼 자동 포커스(선택, §11 위임)

[증가]
  └─ +1 클릭 또는 ArrowUp/Enter(+1 포커스 시) → value += 1 → 화면 즉시 갱신

[감소]
  └─ -1 클릭 또는 ArrowDown/Enter(-1 포커스 시) → value = max(0, value-1) → 화면 즉시 갱신
      └─ value 가 이미 0 이면 → 화면 값 변화 없음(0 유지), 에러 없음

[초기화]
  └─ 초기화 클릭 또는 R/Enter(초기화 포커스 시) → value = 0 → 화면 즉시 갱신 (현재 값 무관 항상 허용)
```

### 3.2 화면 상태

본 카운터는 `number-guess`/`clock` 과 달리 게임 오버·에러 등 분기 상태가 없는 **단일 상태(항상 조작 가능)** UI다. 세 버튼(`+1`/`-1`/`초기화`)은 항상 활성 상태이며, 비활성화되는 경우는 없다(§9 에서 언급하는 0 클램프는 값 자체의 제약이지 버튼 비활성화가 아니다).

| 항목 | 상태 |
|---|---|
| `+1` 버튼 | 항상 활성 |
| `-1` 버튼 | 항상 활성(값이 0이어도 클릭 가능 — 클릭해도 0 유지) |
| `초기화` 버튼 | 항상 활성 |
| 값 표시 영역 | 항상 표시, `aria-live="polite"` 로 스크린리더에 변경 즉시 알림(§6.3) |

---

## 4. 파일 구조 및 모듈 경계

### 4.1 파일 목록(제안 — 최종 배치·분할은 dev 재량, §0 가정 2)

```
counter/
├── index.html   ← 마크업(값 표시 영역 + 3개 버튼) + 스크립트 로드
├── styles.css   ← 시각 스타일(designer 담당)
└── counter.js   ← 카운터 순수 로직 + DOM 바인딩(developer 담당, 필요 시 counter.js/main.js 로 추가 분할 가능)

tests/
└── counter-BF859.test.js   ← increment/decrement/reset 순수 로직 단위 테스트 (node --test)
```

### 4.2 모듈 책임 분리

#### `index.html`
- 값 표시 영역(`<output id="counter-value" aria-live="polite">0</output>` 또는 동등한 시맨틱 요소)
- 3개 네이티브 `<button>` 요소: `id="btn-increment"`, `id="btn-decrement"`, `id="btn-reset"`(커스텀 `<div role="button">` 금지 — §6.1 근거)
- `style.css`, 로직 스크립트 순서로 로드, 외부 CDN 금지 — `file://` 직접 실행 가능

#### `styles.css`
- 레이아웃, 컬러 팔레트, 타이포그래피(자체 CSS 변수 정의)
- 포커스 링(`:focus-visible`) 스타일 필수 포함(§6.4) — 디자이너 담당이나 "숨기지 않는다"는 본 문서 제약

#### `counter.js` (+ 필요 시 `main.js` 분할)
- 책임 #1: 순수 함수 `increment(value)` / `decrement(value)` / `reset()` 정의·export(§5)
- 책임 #2: DOM 이벤트 바인딩(버튼 클릭 + 전역 keydown)
- 책임 #3: 값 변경 시 표시 영역 동기 갱신(§6.2)
- `localStorage` 등 영속화 로직 사용 금지(v1 in-memory 단발, §10)

---

## 5. `counter.js` 함수 Contract

### 5.1 시그니처

```javascript
/**
 * 카운터 순수 로직 (UMD 패턴 — Node/브라우저 양쪽 로드 가능)
 *
 * @param {number} value 현재 값(0 이상의 정수)
 * @returns {number} 연산 후 값(0 이상의 정수)
 */
function increment(value) { return value + 1; }
function decrement(value) { return Math.max(0, value - 1); }
function reset() { return 0; }
```

### 5.2 반환 값 Contract

| 함수 | 조건 | 반환 값 |
|---|---|---|
| `increment(value)` | 항상 | `value + 1` (상한 없음) |
| `decrement(value)` | `value > 0` | `value - 1` |
| `decrement(value)` | `value === 0` | `0`(클램프, §2.2) |
| `reset()` | 항상 | `0` |

### 5.3 부작용 (Side Effects)

- **없음** — 세 함수 모두 순수 함수. DOM 조작·전역 상태 변경 없음. DOM 갱신은 호출부(main.js 의 이벤트 핸들러)의 책임.

### 5.4 Export 방식(테스트 호환)

`package.json` 의 `"type": "module"` 을 따르되, 브라우저 `<script>`(non-module) 로드 호환을 위해 기존 `rps/logic.js`·`clock/clock.js` 와 동일한 UMD 패턴을 사용한다:

```javascript
// counter/counter.js — UMD 패턴 (Node ESM/CJS + 브라우저 <script> 양쪽 호환)
function increment(value) { return value + 1; }
function decrement(value) { return Math.max(0, value - 1); }
function reset() { return 0; }

if (typeof module !== "undefined" && module.exports) {
  module.exports = { increment, decrement, reset };
} else {
  globalThis.CounterLogic = { increment, decrement, reset };
}
```

테스트 파일에서는 `import { increment, decrement, reset } from '../counter/counter.js'` (또는 저장소 기존 모듈들의 실제 import 관례를 그대로 따름)로 가져온다.

---

## 6. 접근성 — 키보드 조작 및 즉시 반영 요건 (검증 가능)

> 본 절은 task 수용 기준 2번째 항목("키보드 조작·즉시 반영 요건이 검증 가능한 형태로 기술")에 직접 대응한다.

### 6.1 키보드 조작 요건

| 요건 | 상세 | 검증 방법 |
|---|---|---|
| 포커스 이동 | 3개 컨트롤 모두 네이티브 `<button>` 요소로 구현 → `Tab`/`Shift+Tab` 으로 브라우저 기본 포커스 이동 제공(커스텀 `tabindex`/`role="button"` div 사용 금지) | 정적 마크업 검사: `grep -E "<button" counter/index.html` 로 3개 버튼이 `<button>` 태그인지 확인(3건) + `role="button"` 미사용(0건) 확인 |
| 활성화 키 | 포커스된 버튼에서 `Enter`/`Space` 입력 시 클릭과 동일 동작(네이티브 `<button>` 기본 제공, 별도 구현 불필요) | 브라우저 수동/E2E: 버튼 포커스 후 키 입력 → 값 변경 관찰 |
| 전역 단축키 | `ArrowUp`=+1, `ArrowDown`=-1, `R`=초기화(대소문자 무관) — 포커스 위치와 무관하게 `document` 레벨 `keydown` 리스너로 동작, 브라우저 기본 스크롤 방지를 위해 `ArrowUp`/`ArrowDown` 은 `preventDefault()` 호출 | E2E/수동: 버튼에 포커스 없는 상태(예: `document.body` 포커스)에서 키 입력 → 값 변경 관찰 + 페이지 스크롤 미발생 확인 |
| 포커스 가시성 | `:focus-visible` 스타일이 어떤 컨트롤에서도 `outline: none` 으로 완전히 제거되지 않음 | 정적 코드 검사: `styles.css` 에 `outline:\s*none` 이 대응하는 커스텀 포커스 스타일 없이 단독 사용되지 않는지 확인(designer 산출물 리뷰 항목) |

### 6.2 즉시 반영 요건

| 요건 | 상세 | 검증 방법 |
|---|---|---|
| 동기 갱신 | 클릭/키 이벤트 핸들러 내부에서 `increment`/`decrement`/`reset` 호출 직후, **같은 함수 호출 스택 안에서** 표시 영역의 `textContent`(또는 동등 속성)를 갱신한다 — `setTimeout`/`requestAnimationFrame`/Promise 마이크로태스크 지연 없이 처리 | 단위/E2E 테스트: 이벤트를 디스패치한 직후(await 없이) DOM 값을 즉시 assert하여 값이 이미 갱신되어 있음을 확인 |
| 스크린리더 즉시 알림 | 값 표시 요소에 `aria-live="polite"`(또는 `<output>` 의 암묵적 live region) 적용 — 값이 바뀔 때마다 스크린리더가 지연 없이 안내 | 정적 마크업 검사: `grep -E "aria-live|<output"` 로 값 표시 요소 확인 |
| 연타 처리 | 여러 번 빠르게 클릭/키 입력해도 debounce/throttle 없이 매 입력마다 값이 정확히 누적 반영된다(§9 EC-02) | 단위 테스트: `increment`/`decrement` 를 N 회 연속 호출한 결과가 정확히 N 만큼 누적되는지 assert |

### 6.3 접근성 마크업 계약(고정)

```html
<output id="counter-value" aria-live="polite">0</output>
<button type="button" id="btn-increment">+1</button>
<button type="button" id="btn-decrement">-1</button>
<button type="button" id="btn-reset">초기화</button>
```

id/태그/`aria-live` 속성은 dev 구현의 계약(SSOT)으로 고정한다. 버튼 라벨 문구·아이콘·레이아웃은 §11 에서 designer 에게 위임한다.

---

## 7. 단위 테스트 전략

### 7.1 테스트 파일 위치 및 실행

```bash
# 실행 명령 (BF-860 focused scope)
node --test tests/counter-BF859.test.js
```

### 7.2 테스트 대상

`increment(value)` / `decrement(value)` / `reset()` 순수 함수만 단위 테스트한다. DOM 인터랙션(클릭/키 이벤트)은 단위 테스트 범위에서 제외하고 후속 tester task 의 E2E 가드로 다룬다.

### 7.3 필수 테스트 케이스

| 케이스 ID | 함수 | 입력 | 기대 결과 | 설명 |
|---|---|---|---|---|
| TC-01 | `increment` | `0` | `1` | 기본 증가 |
| TC-02 | `increment` | `41` | `42` | 임의 양수에서 증가 |
| TC-03 | `decrement` | `5` | `4` | 기본 감소 |
| TC-04 | `decrement` | `1` | `0` | 0 진입 직전 경계 |
| TC-05 | `decrement` | `0` | `0` | **0-플로어 클램프**(§0 가정 4, §2.2) |
| TC-06 | `reset` | (인자 없음) | `0` | 항상 0 반환 |
| TC-07 | `increment` 연속 3회 | `0→1→2→3` | `3` | 연타 누적(§6.2, §9 EC-02) |
| TC-08 | `decrement` 연속 호출로 0 통과 시도 | `1→0→0` | `0` | 0 도달 후 추가 감소해도 0 유지 |

### 7.4 테스트 파일 구조(참조 템플릿)

```javascript
// tests/counter-BF859.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { increment, decrement, reset } from '../counter/counter.js';

describe('increment', () => {
  it('TC-01: 0에서 1 증가', () => {
    assert.equal(increment(0), 1);
  });
  it('TC-02: 임의 양수에서 증가', () => {
    assert.equal(increment(41), 42);
  });
  it('TC-07: 연속 호출이 정확히 누적된다', () => {
    let v = 0;
    v = increment(v); v = increment(v); v = increment(v);
    assert.equal(v, 3);
  });
});

describe('decrement', () => {
  it('TC-03: 기본 감소', () => {
    assert.equal(decrement(5), 4);
  });
  it('TC-04: 0 진입 직전 경계', () => {
    assert.equal(decrement(1), 0);
  });
  it('TC-05: 0 미만 금지(클램프)', () => {
    assert.equal(decrement(0), 0);
  });
  it('TC-08: 0 통과 시도해도 0 유지', () => {
    let v = 1;
    v = decrement(v); v = decrement(v);
    assert.equal(v, 0);
  });
});

describe('reset', () => {
  it('TC-06: 항상 0 반환', () => {
    assert.equal(reset(), 0);
  });
});
```

---

## 8. Acceptance Criteria (Given/When/Then)

### AC-01: 초기값 0 표시

> **Given** 사용자가 `counter/index.html` 을 브라우저에서 열었을 때
> **When** 페이지 로드가 완료되면
> **Then** 값 표시 영역에 정확히 `0` 이 표시되고, `+1`/`-1`/`초기화` 3개 버튼이 모두 활성 상태다

### AC-02: `+1` 조작 — 즉시 반영

> **Given** 카운터 값이 `N`(임의의 0 이상 정수)인 상태일 때
> **When** 사용자가 `+1` 버튼을 클릭하거나, `+1` 버튼에 포커스가 있는 상태에서 `Enter`/`Space` 를 누르거나, 포커스 위치와 무관하게 `ArrowUp` 을 누르면
> **Then** 값이 `N+1` 로 즉시(지연 없이) 갱신되어 화면에 반영된다(§6.2)

### AC-03: `-1` 조작 — 즉시 반영 및 0-플로어

> **Given** 카운터 값이 `N`(0 이상 정수)인 상태일 때
> **When** 사용자가 `-1` 버튼을 클릭하거나 `-1` 포커스 시 `Enter`/`Space`, 또는 `ArrowDown` 을 누르면
> **Then** `N > 0` 이면 값이 `N-1` 로 즉시 갱신되고, `N === 0` 이면 값은 `0` 을 유지하며 에러 없이 그대로 표시된다(§0 가정 4, §2.2)

### AC-04: `초기화` 조작 — 상태 무관 항상 허용

> **Given** 카운터 값이 임의의 값(0 포함)인 상태일 때
> **When** 사용자가 `초기화` 버튼을 클릭하거나 `초기화` 포커스 시 `Enter`/`Space`, 또는 `R` 키를 누르면
> **Then** 값이 즉시 `0` 으로 재설정되어 화면에 반영된다(현재 값과 무관하게 항상 실행 가능)

### AC-05: 키보드만으로 전체 조작 가능

> **Given** 마우스를 사용하지 않는 사용자가 페이지에 진입한 상태일 때
> **When** `Tab` 키로 `+1` → `-1` → `초기화` 순서로 포커스를 이동하며 각 지점에서 `Enter` 또는 `Space` 를 누르면
> **Then** 대응하는 조작(§AC-02~04)이 마우스 클릭과 동일하게 실행되고, 어떤 조작도 마우스 없이 도달 불가능하지 않다(§6.1)

### AC-06: 서버 저장·인증·외부 API·신규 패키지 미사용

> **Given** `counter/` 모듈 소스 전체(HTML/CSS/JS)와 저장소 `package.json`
> **When** 정적 코드 검사(`grep -rnE "fetch\(|XMLHttpRequest|WebSocket|https?://" counter/*.js counter/*.html`)와 `package.json` diff 를 확인하면
> **Then** 네트워크 호출·인증 관련 코드·신규 `dependencies`/`devDependencies` 추가가 0건이다

### 8.1 BF-860 수용 기준 ↔ 본 문서 매핑표

| BF-860 수용 기준 | 충족 근거 |
|---|---|
| Given Epic 요구, When 명세 문서를 작성, Then `docs/plan/counter-BF-859.md` 에 목표·완료조건·제외범위(서버저장/인증/외부API/신규패키지)가 명시된다 | §1.1(목적) · §1.2(완료 조건 6항목) · §10(비범위, 4개 제외 항목 표) |
| Given 접근성 요구, When 명세 작성, Then 키보드 조작·즉시 반영 요건이 검증 가능한 형태로 기술된다 | §6.1(키보드 조작 요건 표 + 검증 방법) · §6.2(즉시 반영 요건 표 + 검증 방법) · §8 AC-02, AC-03, AC-05 |

---

## 9. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|---|---|---|
| EC-01 | 값이 `0` 인 상태에서 `-1` 조작 | 값 `0` 유지, 에러 없음, 화면 변화 없음(§2.2, §7.3 TC-05) |
| EC-02 | `+1` 을 매우 빠르게 연타(더블/트리플 클릭) | debounce/throttle 없이 클릭 수만큼 정확히 누적(§6.2, §7.3 TC-07) |
| EC-03 | 값이 큰 상태(예: 9999)에서 `초기화` | 즉시 `0` 으로 리셋, 애니메이션 등 지연 없음 |
| EC-04 | 포커스가 어떤 버튼에도 없는 상태(예: `document.body`)에서 전역 단축키 입력 | 전역 `keydown` 리스너가 여전히 동작(§6.1) |
| EC-05 | 값을 여러 번 변경한 뒤 페이지 새로고침 | 영속화 로직이 없으므로 값은 항상 `0` 으로 재시작(§1.3, §10) — 결함이 아닌 의도된 v1 동작 |
| EC-06 | `+1` 을 매우 많이 눌러 매우 큰 정수(`Number.MAX_SAFE_INTEGER` 근접)에 도달 | 상한 제한 없음(v1) — 오버플로 보정은 비범위(§10), 통상적 사용에서 도달 가능성 없음 |
| EC-07 | `ArrowUp`/`ArrowDown` 전역 단축키 입력 시 브라우저 기본 페이지 스크롤 | `preventDefault()` 로 스크롤 억제(§6.1) — 미구현 시 UX 저하이나 카운터 값 자체는 정상 동작 |
| EC-08 | `Tab` 으로 세 번째(`초기화`) 버튼까지 이동 후 추가 `Tab` | 포커스가 페이지의 다음 포커스 가능 요소(또는 브라우저 chrome)로 자연스럽게 빠져나감 — 포커스 트랩 없음(단일 카드 레이아웃이므로 트랩 불필요) |

---

## 10. 비범위 (Out of Scope)

수용 기준이 명시적으로 요구하는 4개 제외 항목과, 그 외 v1 에서 다루지 않는 항목:

| 항목 | 사유 |
|---|---|
| **서버 저장** | 백엔드/DB 없음 — in-memory 단발 상태(§1.3, EC-05) |
| **인증** | 로그인/세션 개념 없음 — 단일 익명 사용자 전용 |
| **외부 API** | `fetch`/`XMLHttpRequest`/`WebSocket` 등 네트워크 호출 0건(§8 AC-06) |
| **신규 패키지** | `package.json` 의 `dependencies`/`devDependencies` 변경 없음 — 순수 vanilla JS |
| `localStorage` 값 영속화 | v1 은 새로고침 시 항상 0 으로 재시작(§9 EC-05) — 필요 시 별도 스토리 |
| 최대/최소값 제한(0 초과 상한, 커스텀 하한) | v1 은 0-플로어만 존재, 상한 없음(§9 EC-06) |
| 증감 step 커스터마이징(+5, +10 등) | v1 은 고정 step=1 만 지원 |
| 실행 취소(undo)/변경 이력 | UI 복잡도 증가 — 별도 스토리 |
| 사운드/애니메이션 효과 | designer 재량이나 필수 아님, 별도 명세 없음 |
| 다중 카운터/다중 인스턴스 | v1 은 페이지당 카운터 1개 |

---

## 11. 디자이너 위임 시각 요소

아래 항목은 기획에서 정하지 않고 디자이너에게 위임한다:

| 항목 | 가이드라인 |
|---|---|
| 컬러 팔레트 · 타이포그래피 | 신규 CSS 변수 자체 정의(기존 모듈과 공유 강제 없음) |
| 값 표시 크기/폰트 | 가독성 우선(권장: 대형 숫자), 단 `id="counter-value"` / `aria-live="polite"` 계약(§6.3)은 고정 |
| 버튼 배치·아이콘 | `+1`/`-1`/`초기화` 순서·의미만 고정, 시각적 배치·아이콘·색상은 재량 |
| 포커스 링 스타일 | 반드시 시각적으로 보이는 스타일 유지(§6.1) — 구체적 색상/두께는 재량 |
| 초기 자동 포커스 여부 | 페이지 로드 시 `+1` 버튼에 자동 포커스를 줄지 여부는 재량(§3.1 참고, 필수 아님) |
| 반응형/모바일 레이아웃 | 기본 작동만 요구, 세부 breakpoint 는 재량 |

---

## 12. 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/plan/counter-BF-859.md`(본 문서) |
| 신규 구현 대상(후속 designer/dev task) | `counter/index.html`, `counter/styles.css`, `counter/counter.js`(+ 필요 시 `main.js`) — 최종 배치 미정(§0 가정 2), 본 문서 §2~§7 이 계약(contract) |
| 신규 테스트 대상(후속 tester task) | `tests/counter-BF859.test.js` — 미정, 본 문서 §7~§8 이 검증 기준 |
| 관련 기존 산출물(수정하지 않음) | `src/counter.ts`, `src/counter.test.ts`(BF-760) — §0 가정 3 참고, 행동 계약만 참조 |
| 참조한 기존 선례 문서 | `docs/plan/number-guess-BF-783.md`(신규 forward 모듈 문서 패턴), `docs/planning/clock-BF-839.md`(가정 명시 방식·접근성 검증 표 패턴) |

---

## 13. 남은 모호함 (운영자 확인 권장)

1. **0 미만(음수) 허용 여부**: §0 가정 4 참고 — Epic 원문에 별도 명시가 없어 기존 `src/counter.ts`(BF-760)의 0-플로어 클램프를 그대로 채택했다. 자유 음수 카운터를 의도했다면 확인이 필요하다.
2. **신규 모듈 최종 배치 경로**: §0 가정 2 참고 — `clock-BF-839` 선례처럼 dev 가 `src/app/demo/counter/` 를 택할 수도, 기존 다수 모듈처럼 저장소 루트 `counter/` 를 택할 수도 있다. 본 문서의 함수/마크업 계약은 배치 경로와 무관하게 유효하다.
3. **`src/counter.ts`(BF-760)와의 관계**: §0 가정 3 참고 — 별도 task 산출물로 판단해 직접 재사용을 강제하지 않고 "행동 계약 일치"만 요구했다. 실제로 두 모듈을 하나로 통합할 의도였다면(예: 신규 UI 가 `src/counter.ts` 를 직접 import) 빌드 도구 도입 여부를 포함해 별도 확인이 필요하다.
4. **초기 자동 포커스**: §11 참고 — 페이지 로드 시 특정 버튼에 자동 포커스를 줄지는 필수 요건으로 명시하지 않았다(스크린리더 사용자에게 예기치 않은 포커스 이동이 오히려 방해가 될 수 있어 재량으로 남김).

---

*문서 종료 — [박기획] · BF-860*

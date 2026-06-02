# 숫자 맞추기 게임 기획 명세 — BF-783

> 작성자: [박기획] · 작성일 2026-06-02  
> 관련 티켓: BF-784 (planner task), BF-783 (부모 스토리)  
> 신규 모듈: `number-guess/`  
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의  
> 단위 테스트: `node --test tests/number-guess-*.test.js`

---

## 목차

1. [개요](#1-개요)
2. [게임 규칙](#2-게임-규칙)
3. [사용자 시나리오 및 UX 흐름](#3-사용자-시나리오-및-ux-흐름)
4. [파일 구조 및 모듈 경계](#4-파일-구조-및-모듈-경계)
5. [`evaluateGuess` 함수 Contract](#5-evaluateguess-함수-contract)
6. [단위 테스트 전략](#6-단위-테스트-전략)
7. [Acceptance Criteria (Given/When/Then)](#7-acceptance-criteria-givenwhenthen)
8. [Edge Case 목록](#8-edge-case-목록)
9. [비범위 (Out of Scope)](#9-비범위-out-of-scope)
10. [디자이너 위임 시각 요소](#10-디자이너-위임-시각-요소)

---

## 1. 개요

### 1.1 목적

1~100 사이의 무작위 정수를 컴퓨터가 생성하고, 플레이어가 숫자를 입력하며 "더 큼/더 작음" 힌트를 받아 정답을 맞히는 단순 추리 게임을 바닐라 HTML/CSS/JS 로 구현한다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 신규 경로 | `number-guess/` (index.html / style.css / game.js) |
| 기존 코드 영향 | 없음 — 완전 독립 모듈 |
| 저장소 사용 | 없음 — in-memory 단발 게임 |
| 외부 라이브러리 | 없음 — file:// CORS 안전 |

### 1.3 전제 조건

- 브라우저 환경 (Chrome/Edge/Firefox 최신 버전)
- `number-guess/` 디렉토리가 프로젝트 루트에 생성됨
- `tests/number-guess-*.test.js` 파일이 `node --test` 로 실행 가능

---

## 2. 게임 규칙

### 2.1 핵심 규칙

| 규칙 항목 | 상세 |
|-----------|------|
| 비밀 숫자 범위 | **1 이상 100 이하** 정수 (양 끝 포함) |
| 난수 생성 | `Math.floor(Math.random() * 100) + 1` |
| 힌트 종류 | **"더 큰 숫자입니다"** (guess < secret) / **"더 작은 숫자입니다"** (guess > secret) |
| 정답 조건 | `guess === secret` |
| 시도 횟수 추적 | 매 유효한 제출마다 카운터 +1 (정답 포함) |
| 정답 시 | 축하 메시지 + 시도 횟수 표시 + 재시작 버튼 활성 |
| 최대 시도 제한 | **없음** (v1 — 무제한 도전 허용) |
| 재시작 | 새 난수 생성 + 시도 카운터 초기화 + 이력 초기화 |

### 2.2 입력 유효성 검사

| 입력 값 | 처리 |
|---------|------|
| 정수가 아닌 값 (문자, 소수) | 에러 메시지 표시, 시도 카운터 증가 안 함 |
| 범위 밖 정수 (0 이하, 101 이상) | 에러 메시지 표시, 시도 카운터 증가 안 함 |
| 빈 값 | 에러 메시지 표시, 시도 카운터 증가 안 함 |
| 유효한 정수 (1~100) | `evaluateGuess` 호출, 결과 표시, 시도 카운터 +1 |

### 2.3 키보드 지원

- `Enter` 키: 제출 버튼과 동일한 동작 (입력 필드 포커스 상태에서 작동)
- 정답 후 `Enter` 키: 재시작과 동일한 동작

---

## 3. 사용자 시나리오 및 UX 흐름

### 3.1 정상 플레이 흐름 (Happy Path)

```
[게임 시작]
  └─ 화면 로드 → 비밀 숫자 생성 → 입력 필드 자동 포커스 → 시도 횟수 = 0 표시

[추리 입력]
  └─ 숫자 입력 → Enter 또는 제출 버튼 클릭 → 유효성 검사
      ├─ 유효하지 않음: 에러 메시지 표시 (카운터 증가 없음)
      └─ 유효: evaluateGuess 호출
          ├─ too-low  → "더 큰 숫자입니다" 표시, 시도 횟수 +1
          ├─ too-high → "더 작은 숫자입니다" 표시, 시도 횟수 +1
          └─ correct  → 정답! 시도 횟수 +1, 축하 메시지, 재시작 버튼 활성

[재시작]
  └─ 재시작 버튼 클릭 (또는 정답 후 Enter) → 새 비밀 숫자 생성 → 초기화
```

### 3.2 화면 상태 전이

| 상태 ID | 상태명 | 입력 필드 | 제출 버튼 | 재시작 버튼 | 힌트 메시지 |
|---------|--------|-----------|-----------|-------------|-------------|
| `idle` | 게임 시작 대기 | 활성 + 포커스 | 활성 | 비활성/숨김 | — |
| `playing` | 추리 중 | 활성 | 활성 | 비활성/숨김 | 이전 힌트 표시 |
| `error` | 잘못된 입력 | 활성 (내용 유지) | 활성 | 비활성/숨김 | 에러 메시지 |
| `won` | 정답 | 비활성 | 비활성 | **활성** | 축하 메시지 |

---

## 4. 파일 구조 및 모듈 경계

### 4.1 파일 목록

```
number-guess/
├── index.html   ← HTML 마크업 + 스크립트 로드
├── style.css    ← 시각 스타일 (designer 담당)
└── game.js      ← 게임 로직 + DOM 인터랙션 (developer 담당)

tests/
└── number-guess-BF783.test.js   ← evaluateGuess 단위 테스트 (node --test)
```

### 4.2 모듈 책임 분리

#### `index.html`

- 게임 컨테이너 마크업 (`<div id="game">`)
- 입력 필드 (`<input id="guess-input" type="number" min="1" max="100">`)
- 제출 버튼 (`<button id="submit-btn">`)
- 재시작 버튼 (`<button id="restart-btn">`)
- 힌트/상태 메시지 영역 (`<p id="message">`)
- 시도 횟수 표시 영역 (`<span id="attempt-count">`)
- `style.css`, `game.js` 순서로 로드 (스크립트는 `</body>` 직전)
- 외부 CDN 사용 금지 — `file://` 프로토콜 직접 열기 가능

#### `style.css`

- 레이아웃, 컬러 팔레트, 타이포그래피 정의
- CSS 변수 (`--color-*`, `--spacing-*`) 자체 정의
- 상태별 클래스 (`data-state="idle|playing|error|won"`) 를 활용한 스타일 전환
- 외부 폰트 CDN 금지 — system font stack 사용

#### `game.js`

- 책임 #1: 비밀 숫자 생성 (`Math.floor(Math.random() * 100) + 1`)
- 책임 #2: 입력 유효성 검사
- 책임 #3: `evaluateGuess(secret, guess)` 호출 및 결과 처리
- 책임 #4: DOM 업데이트 (메시지, 시도 횟수, 상태 전환)
- 책임 #5: Enter 키 이벤트 처리
- 책임 #6: 재시작 처리 (새 게임 초기화)
- **순수 함수 `evaluateGuess` 는 game.js 상단에 정의** (테스트를 위해 export)
- `localStorage` 사용 금지 (v1 in-memory 단발)

---

## 5. `evaluateGuess` 함수 Contract

### 5.1 시그니처

```javascript
/**
 * 숫자 추리 판정 순수 함수
 *
 * @param {number} secret  - 비밀 숫자 (1 이상 100 이하 정수)
 * @param {number} guess   - 플레이어가 입력한 숫자 (1 이상 100 이하 정수)
 * @returns {{ result: 'too-low' | 'too-high' | 'correct' }}
 */
export function evaluateGuess(secret, guess) { ... }
```

### 5.2 반환 값 Contract

| 조건 | 반환 값 |
|------|---------|
| `guess < secret` | `{ result: 'too-low' }` |
| `guess > secret` | `{ result: 'too-high' }` |
| `guess === secret` | `{ result: 'correct' }` |

### 5.3 전제 조건 (Preconditions)

- `secret` : 1 이상 100 이하 정수 — caller(game.js) 가 보장
- `guess` : 1 이상 100 이하 정수 — caller(game.js) 의 유효성 검사 통과 후 호출
- 유효성 검사 실패 시 `evaluateGuess` 는 **호출하지 않는다**

### 5.4 부작용 (Side Effects)

- **없음** — 순수 함수. DOM 조작·상태 변경·난수 생성 없음.

### 5.5 Export 방식 (테스트 호환)

프로젝트 `package.json` 의 `"type": "module"` 설정에 따라 ES Module 방식을 사용한다.

```javascript
// game.js — ES Module
export function evaluateGuess(secret, guess) {
  if (guess < secret) return { result: 'too-low' };
  if (guess > secret) return { result: 'too-high' };
  return { result: 'correct' };
}
```

테스트 파일에서 `import { evaluateGuess } from '../number-guess/game.js'` 로 가져온다.

---

## 6. 단위 테스트 전략

### 6.1 테스트 파일 위치 및 실행

```bash
# 실행 명령 (BF-784 focused scope)
node --test tests/number-guess-BF783.test.js
```

### 6.2 테스트 대상

`evaluateGuess(secret, guess)` 순수 함수만 단위 테스트한다.  
DOM 인터랙션은 단위 테스트 범위에서 제외한다.

### 6.3 필수 테스트 케이스

| 케이스 ID | secret | guess | 기대 result | 설명 |
|-----------|--------|-------|-------------|------|
| TC-01 | 50 | 30 | `'too-low'` | guess < secret 기본 케이스 |
| TC-02 | 50 | 70 | `'too-high'` | guess > secret 기본 케이스 |
| TC-03 | 50 | 50 | `'correct'` | 정답 기본 케이스 |
| TC-04 | 1 | 1 | `'correct'` | 최솟값 경계 정답 |
| TC-05 | 100 | 100 | `'correct'` | 최댓값 경계 정답 |
| TC-06 | 100 | 1 | `'too-low'` | 최솟값 추리 (secret 최대) |
| TC-07 | 1 | 100 | `'too-high'` | 최댓값 추리 (secret 최소) |
| TC-08 | 50 | 49 | `'too-low'` | 정답 바로 아래 |
| TC-09 | 50 | 51 | `'too-high'` | 정답 바로 위 |

### 6.4 테스트 파일 구조 (참조 템플릿)

```javascript
// tests/number-guess-BF783.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGuess } from '../number-guess/game.js';

describe('evaluateGuess', () => {
  it('TC-01: guess < secret → too-low', () => {
    assert.deepStrictEqual(evaluateGuess(50, 30), { result: 'too-low' });
  });
  it('TC-02: guess > secret → too-high', () => {
    assert.deepStrictEqual(evaluateGuess(50, 70), { result: 'too-high' });
  });
  it('TC-03: guess === secret → correct', () => {
    assert.deepStrictEqual(evaluateGuess(50, 50), { result: 'correct' });
  });
  it('TC-04: 최솟값 경계 정답', () => {
    assert.deepStrictEqual(evaluateGuess(1, 1), { result: 'correct' });
  });
  it('TC-05: 최댓값 경계 정답', () => {
    assert.deepStrictEqual(evaluateGuess(100, 100), { result: 'correct' });
  });
  it('TC-06: 최솟값 추리 (secret=100)', () => {
    assert.deepStrictEqual(evaluateGuess(100, 1), { result: 'too-low' });
  });
  it('TC-07: 최댓값 추리 (secret=1)', () => {
    assert.deepStrictEqual(evaluateGuess(1, 100), { result: 'too-high' });
  });
  it('TC-08: 정답 바로 아래', () => {
    assert.deepStrictEqual(evaluateGuess(50, 49), { result: 'too-low' });
  });
  it('TC-09: 정답 바로 위', () => {
    assert.deepStrictEqual(evaluateGuess(50, 51), { result: 'too-high' });
  });
});
```

---

## 7. Acceptance Criteria (Given/When/Then)

### AC-01: 게임 시작 — 비밀 숫자 생성 및 초기 상태

> **Given** 플레이어가 `number-guess/index.html` 을 브라우저에서 열었을 때  
> **When** 페이지 로드가 완료되면  
> **Then** 1~100 범위의 무작위 비밀 숫자가 내부적으로 생성되고, 입력 필드가 활성화 + 포커스 상태이며, 시도 횟수가 0으로 표시된다

---

### AC-02: 더 낮은 숫자 힌트 (too-low)

> **Given** 게임이 시작된 상태이고 비밀 숫자가 50이라고 가정할 때  
> **When** 플레이어가 입력 필드에 `30`을 입력하고 Enter 키 또는 제출 버튼을 누르면  
> **Then** 화면에 "더 큰 숫자입니다" (또는 동일 의미의) 힌트 메시지가 표시되고, 시도 횟수가 1 증가한다

---

### AC-03: 더 높은 숫자 힌트 (too-high)

> **Given** 게임이 시작된 상태이고 비밀 숫자가 50이라고 가정할 때  
> **When** 플레이어가 입력 필드에 `70`을 입력하고 제출하면  
> **Then** 화면에 "더 작은 숫자입니다" (또는 동일 의미의) 힌트 메시지가 표시되고, 시도 횟수가 1 증가한다

---

### AC-04: 정답 시 축하 메시지 및 재시작 버튼 활성

> **Given** 게임이 진행 중이고 플레이어가 이미 몇 번 추리한 상태일 때  
> **When** 플레이어가 비밀 숫자와 동일한 숫자를 입력하고 제출하면  
> **Then** 축하 메시지와 최종 시도 횟수가 표시되고, 입력 필드와 제출 버튼이 비활성화되며, 재시작 버튼이 활성화된다

---

### AC-05: Enter 키 제출 지원

> **Given** 게임이 진행 중이고 입력 필드에 포커스가 있을 때  
> **When** 플레이어가 숫자를 입력한 후 `Enter` 키를 누르면  
> **Then** 제출 버튼을 클릭한 것과 동일하게 판정이 수행되고 결과가 화면에 표시된다

---

### AC-06: 잘못된 입력 처리 — 범위 밖 숫자

> **Given** 게임이 진행 중일 때  
> **When** 플레이어가 `0`, 음수, `101` 이상의 숫자를 입력하고 제출하면  
> **Then** 에러 메시지가 표시되고, 시도 횟수는 증가하지 않으며, 입력 필드는 계속 활성 상태를 유지한다

---

### AC-07: 재시작 — 새 게임 초기화

> **Given** 플레이어가 정답을 맞혀서 재시작 버튼이 활성화된 상태일 때  
> **When** 플레이어가 재시작 버튼을 클릭하면  
> **Then** 새로운 무작위 비밀 숫자가 생성되고, 시도 횟수가 0으로 초기화되며, 힌트 메시지가 초기화되고, 입력 필드가 활성화 + 포커스 상태가 된다

---

### AC-08: evaluateGuess 함수 — 단위 테스트 통과

> **Given** `evaluateGuess(secret, guess)` 가 `game.js` 에 순수 함수로 정의되어 있고 export 되어 있을 때  
> **When** `node --test tests/number-guess-BF783.test.js` 를 실행하면  
> **Then** TC-01 ~ TC-09 의 9개 케이스가 모두 통과하고 에러가 없다

---

## 8. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|--------------|----------|-----------|
| EC-01 | 첫 추리가 바로 정답 | 시도 횟수 = 1 로 정답 처리 |
| EC-02 | 빈 입력 상태로 제출 | 에러 메시지, 시도 횟수 증가 없음 |
| EC-03 | 소수 입력 (예: `3.5`) | 에러 메시지, 시도 횟수 증가 없음 |
| EC-04 | 문자열 입력 (예: `abc`) | 에러 메시지, 시도 횟수 증가 없음 |
| EC-05 | `0` 입력 | 에러 메시지 ("1~100 사이 숫자를 입력하세요"), 시도 횟수 증가 없음 |
| EC-06 | `101` 입력 | 에러 메시지, 시도 횟수 증가 없음 |
| EC-07 | 정답 후 Enter 키 | 재시작과 동일하게 새 게임 시작 |
| EC-08 | 비밀 숫자가 1일 때 1 추리 | `evaluateGuess(1, 1)` → `correct` 즉시 정답 |
| EC-09 | 비밀 숫자가 100일 때 100 추리 | `evaluateGuess(100, 100)` → `correct` 즉시 정답 |
| EC-10 | 연속 동일 숫자 입력 | 매번 동일 힌트 반환, 시도 횟수 계속 증가 |

---

## 9. 비범위 (Out of Scope)

v1 에서는 다음 기능을 구현하지 않는다. 별도 스토리에서 처리한다:

| 항목 | 이유 |
|------|------|
| 최대 시도 횟수 제한 (게임 오버) | UX 복잡도 증가 — 별도 스토리로 분리 |
| 추리 이력 목록 표시 | UI 복잡도 — 별도 스토리 |
| 난이도 선택 (범위 변경) | 설정 시스템 — 별도 스토리 |
| localStorage 최고 기록 저장 | 저장소 의존성 — 별도 스토리 |
| 효과음 | 별도 Epic |
| 반응형 / 모바일 최적화 | designer 재량 — 기본 작동만 요구 |

---

## 10. 디자이너 위임 시각 요소

아래 항목은 기획에서 정하지 않고 디자이너(이디자인) 에게 위임한다:

| 항목 | 가이드라인 |
|------|-----------|
| 컬러 팔레트 | 신규 CSS 변수 자체 정의. 다른 모듈과 공유 없음 |
| 힌트 메시지 문구 | "더 큰 숫자입니다 ⬆" 또는 동일 의미의 자유 문구 |
| 축하 메시지 연출 | 애니메이션·이모지 등 재량 |
| 에러 메시지 스타일 | 빨간 계열 텍스트 또는 경고 배너 |
| 시도 횟수 레이아웃 | "시도 횟수: N회" 형식으로 표시 위치 재량 |
| `data-state` 속성 규칙 | `<div id="game" data-state="idle|playing|error|won">` 구조는 고정 |

---

*문서 종료 — [박기획] · BF-784*

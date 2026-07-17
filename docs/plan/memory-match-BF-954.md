# 메모리 매치 재시작·키보드 조작 기획 명세 — BF-954

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-954(본 planner task) · BF-955(designer) · BF-956(developer) · BF-958(tester)
> 대상 모듈: `phase18-games/memory-match/`(기존, 신규 생성 아님)
> 기반 SSOT(변경 금지 — 본 문서는 addendum): `docs/plan/memory-match-BF-916.md`(게임 규칙·상태 모델·순수 함수 contract·기본 접근성), `docs/design/memory-match-BF-916.md`(시각 토큰·컴포넌트)
> 현재 구현 baseline(참조, 본 task 에서 수정하지 않음): `phase18-games/memory-match/{index.html,logic.js,main.js,styles.css}`(BF-919), `tests/memory-match-BF919.test.js`
> 단위 테스트: `node --test tests/memory-match-*.test.js`(focused scope · module: `memory-match`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 본 문서는 BF-916 의 대체가 아니라 addendum:** 4×4 보드·8쌍·moves 정의(2장 비교=1move)·`hidden`/`revealed`/`matched` 카드 상태·`idle`/`playing`/`checking`/`won` 게임 상태·타이머 규칙 등 핵심 게임 로직은 `docs/plan/memory-match-BF-916.md` §2~§6 이 그대로 SSOT 다. 본 문서는 그 위에 **(a) 카드 그리드 방향키 이동, (b) Enter/Space 뒤집기의 재확인·정식화, (c) 재시작 시 초기화 범위의 재확인·확장(포커스 상태 포함)** 만 다룬다. 겹치는 항목은 인용(§ 참조)만 하고 재정의하지 않는다.

**가정 2 — "동일 난이도 재시작":** 이 Epic 의 v1 은 4×4/8쌍 고정 단일 난이도이며, 난이도 선택 기능은 BF-916 §11 에서 명시적으로 비범위 처리되어 있고 본 task 범위(File Ownership: `docs/plan/memory-match-*.md`)·제공된 candidateFiles·형제 task(BF-955/956/958) 어디에도 난이도 선택 기능 추가 근거가 없다. 따라서 "동일 난이도 재시작"은 **"보드 크기/쌍 개수를 바꾸지 않는 일반 재시작"** 을 의미하는 것으로 해석한다 — 즉 BF-916 §2.5 재시작 규칙과 동일 대상이며, 본 문서는 그 초기화 항목을 검증 가능하게 재확인하고 §4.3 에서 새로 도입되는 키보드 포커스 상태의 초기화까지 범위를 넓힌다. 난이도 선택 자체는 여전히 비범위다(§11).

**가정 3 — 포커스 모델 변경(BF-916 §7.1 갱신):** BF-916 §7.1 은 "16장 카드 전부 네이티브 `<button>`, `Tab`/`Shift+Tab` 으로 보드 내부까지 순차 이동, 커스텀 `tabindex` 금지"를 요구했다. 방향키 그리드 이동을 도입하려면 WAI-ARIA Grid 패턴의 표준 관례인 **roving tabindex**(보드 내부 포커스 가능 요소는 항상 1개만 `tabindex="0"`, 나머지는 `tabindex="-1"`, 방향키로 활성 카드를 이동)가 필요하다. 이는 BF-916 §7.1 의 "커스텀 tabindex 금지" 문구를 **본 문서가 명시적으로 갱신**하는 것이다 — 카드 엘리먼트 자체(네이티브 `<button>`)는 그대로 유지하고, `tabindex` 값만 JS 로 관리한다(§3.1). 이 변경 외 BF-916 §7.1 의 나머지 항목(재시작 버튼 항상 도달 가능, `checking` 중 `disabled` 미사용, 포커스 링 필수)은 그대로 유효하다.

**가정 4 — 검증 가능성 확보를 위한 순수 함수 추가:** 방향키 이동 로직(현재 인덱스 + 방향키 → 다음 인덱스)은 DOM 없이 단위 테스트 가능한 순수 함수로 뽑아낼 수 있다(BF-916 §6 이 `flipCard`/`evaluateCheck` 를 순수 함수로 뽑은 것과 동일 원칙). 본 문서 §5 에서 `getNextFocusIndex(currentIndex, key, columns, totalCells)` 시그니처를 신규 제안한다 — 이는 기존 `phase18-games/memory-match/logic.js` 의 UMD export 표에 **추가**될 항목이며, 기존 5개 함수(`shuffle`/`createDeck`/`createInitialState`/`flipCard`/`evaluateCheck`)는 변경하지 않는다.

**가정 5 — 파일 소유권:** 본 planner task(BF-954)의 담당 파일은 `docs/plan/memory-match-BF-954.md` 1개뿐이다. `phase18-games/memory-match/*` 코드 수정은 developer(BF-956), 시각 명세 보강은 designer(BF-955), E2E 검증은 tester(BF-958) 담당이며 본 task 에서 생성·수정하지 않는다.

---

## 목차

1. [배경 및 범위](#1-배경-및-범위)
2. [키보드 조작 명세 — 방향키 그리드 이동](#2-키보드-조작-명세--방향키-그리드-이동)
3. [키보드 조작 명세 — Enter/Space 뒤집기 재확인](#3-키보드-조작-명세--enterspace-뒤집기-재확인)
4. [재시작 초기화 명세](#4-재시작-초기화-명세)
5. [순수 함수 Contract 추가](#5-순수-함수-contract-추가)
6. [Acceptance Criteria (Given/When/Then)](#6-acceptance-criteria-givenwhenthen)
7. [Edge Case 목록](#7-edge-case-목록)
8. [단위 테스트 전략](#8-단위-테스트-전략)
9. [비범위 (Out of Scope)](#9-비범위-out-of-scope)
10. [디자이너/개발자 위임 사항](#10-디자이너개발자-위임-사항)
11. [산출물 위치 및 참조 표](#11-산출물-위치-및-참조-표)
12. [남은 모호함 (운영자 확인 권장)](#12-남은-모호함-운영자-확인-권장)

---

## 1. 배경 및 범위

### 1.1 배경

`memory-match`(BF-916 Epic)는 이미 구현·머지되어 있으며(BF-919), 카드 조작은 현재 `Tab`/`Shift+Tab` 순차 이동 + `Enter`/`Space` 활성화만 지원한다(BF-916 §7.1). BF-916 §11 은 "방향키 기반 그리드 내비게이션"을 명시적으로 v1 비범위로 두고 §14-3 에서 "4×4 그리드 특성상 방향키 내비게이션이 접근성 모범 사례로 더 적합할 수 있어 후속 개선 스토리로 제안"했다. 본 task 는 그 후속 개선을 구체화하는 기획 명세이며, 동시에 재시작 시 초기화 요구(카드·시도 횟수·완료 상태)를 검증 가능한 형태로 재확인한다.

### 1.2 범위 요약

| 항목 | 범위 |
|---|---|
| 카드 그리드 방향키 이동 | **범위 포함** — `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` 로 4×4 보드 내 포커스 이동(§2) |
| Enter/Space 뒤집기 | **범위 포함(재확인)** — 기존 네이티브 `<button>` 동작을 새 포커스 모델 하에서도 유지됨을 정식 AC 로 재확인(§3) |
| 재시작 시 초기화(카드/시도 횟수/완료 상태) | **범위 포함(확장)** — BF-916 §2.5 초기화 항목 재확인 + 방향키 포커스 상태(활성 인덱스) 초기화 추가(§4) |
| 게임 규칙·상태 전이·타이머·완료 조건 | **범위 밖(변경 없음)** — BF-916 §2~§4 그대로 |
| 난이도 선택(보드 크기 변경) | **범위 밖** — BF-916 §11 비범위 유지(§0 가정 2) |
| Home/End/PageUp/PageDown 등 확장 내비게이션 키 | **범위 밖** — 방향키 4종만(§9) |

---

## 2. 키보드 조작 명세 — 방향키 그리드 이동

### 2.1 포커스 모델 (roving tabindex)

| 항목 | 상세 |
|---|---|
| 활성 카드(active cell) | 보드 내 정확히 1장의 카드만 `tabindex="0"`, 나머지 15장은 `tabindex="-1"`(§0 가정 3) |
| 초기 활성 카드 | 게임 시작/재시작 직후 **인덱스 0(보드 좌상단 1행 1열)** 이 활성(§4.3) |
| `Tab` 진입 시 | 보드 바깥에서 `Tab` 으로 보드에 진입하면 브라우저는 `tabindex="0"` 인 활성 카드로 포커스 이동(표준 roving tabindex 동작) — 마지막으로 활성화된 인덱스가 유지됨(재시작 전까지) |
| `Tab`/`Shift+Tab` (보드 내부) | 보드 안에서는 `Tab`/`Shift+Tab` 이 카드 간 이동에 사용되지 않는다 — 보드를 벗어나 다음/이전 포커스 가능 요소(재시작 버튼 등)로 이동한다(§2.4) — 카드 간 이동은 방향키 전용(BF-916 §7.1 의 "Tab 만으로 전체 조작 가능" 요건은 "보드까지는 Tab, 보드 내부는 방향키"로 갱신됨) |
| 방향키 입력 시 | 활성 카드의 `tabindex` 를 `-1` 로, 새 목표 카드의 `tabindex` 를 `0` 으로 변경하고 목표 카드에 DOM 포커스(`.focus()`) 이동. 카드의 `data-state`(hidden/revealed/matched)는 변경하지 않는다(포커스 이동만, 뒤집기 아님) |

### 2.2 방향키 매핑 (4×4 고정, 열 4열 기준)

| 키 | 동작 | 인덱스 계산(§5.1 `getNextFocusIndex` 근거) |
|---|---|---|
| `ArrowRight` | 같은 행에서 오른쪽 카드로 이동 | `col < 3` 이면 `index+1`, 아니면 이동 없음(§2.3 클램프) |
| `ArrowLeft` | 같은 행에서 왼쪽 카드로 이동 | `col > 0` 이면 `index-1`, 아니면 이동 없음 |
| `ArrowDown` | 같은 열에서 아래 카드로 이동 | `row < 3` 이면 `index+4`, 아니면 이동 없음 |
| `ArrowUp` | 같은 열에서 위 카드로 이동 | `row > 0` 이면 `index-4`, 아니면 이동 없음 |

- `row = Math.floor(index / 4)`, `col = index % 4` (인덱스는 카드 `id`, BF-916 §3.4 deck 순서 = 보드 좌상→우하 DOM 순서와 동일, BF-919 구현과 일치).
- 카드 `state`(`hidden`/`revealed`/`matched`) 는 이동 가능 여부에 영향을 주지 않는다 — **`matched`/판정 대기 중인 카드도 방향키로 포커스만 이동 가능**(활성화만 no-op, §3.2·§7 EC-K04). 그리드 위치가 카드 상태에 따라 건너뛰어지면 사용자가 위치 감각을 잃으므로(스크린리더 사용자 포함) 항상 16칸 전부를 방향키 이동 대상으로 유지한다.

### 2.3 경계 처리 — 클램프(고정, wrap-around 아님)

그리드 가장자리에서 바깥쪽 방향키를 누르면 **활성 카드가 그대로 유지**된다(클램프). 반대편으로 순환 이동(wrap-around)하지 않는다.

> **근거:** 4×4 소규모 그리드에서 wrap-around 는 "방향키를 계속 누르면 제자리로 돌아온다"는 예측 가능성은 있으나, 초심자에게는 "이동이 안 됐다"와 "반대편으로 순간이동했다"를 구분하기 어렵게 만들 수 있다. WAI-ARIA APG grid 패턴은 두 방식 모두 허용하나, 본 게임처럼 **완료까지 시각적 위치 기억이 중요한 메모리 게임**에서는 클램프가 사용자의 공간 모델(멘탈 맵)을 깨지 않아 더 안전하다고 판단한다. wrap-around 를 원한다면 §12-1 참고.

### 2.4 보드 진입/이탈 (Tab 순서, BF-916 §7.1 갱신)

| 순서 | 요소 |
|---|---|
| 1 | 헤더/HUD 내 포커스 가능 요소(있다면, 현재 구현엔 없음) |
| 2 | **보드**(활성 카드 1개만 — roving tabindex) |
| 3 | 재시작 버튼(`#restart-btn`) |
| (won 시) | 완료 배너 내 다시하기 버튼(`#win-restart-btn`) — 기존 BF-916 §7.1 "완료 시 포커스 이동" 규칙 그대로 |

`Tab` 은 "보드 전체"를 하나의 정지점처럼 통과하고(활성 카드에서 진입, 그대로 이탈), 보드 내부 이동은 방향키가 전담한다. 이는 표준 grid/toolbar 위젯의 관용적 키보드 패턴(예: 스프레드시트, 달력 위젯)과 일치한다.

---

## 3. 키보드 조작 명세 — Enter/Space 뒤집기 재확인

### 3.1 기본 동작 (변경 없음, 재확인)

카드는 네이티브 `<button>` 요소이므로 **DOM 포커스를 가진 상태에서 `Enter` 또는 `Space` 를 누르면 브라우저가 자동으로 `click` 이벤트를 발생**시킨다(BF-916 §7.1, BF-919 구현 동일). `tabindex` 값(`0` 또는 `-1`)은 이 기본 활성화 키 동작에 **영향을 주지 않는다** — `tabindex="-1"` 카드도 일단 `.focus()` 로 DOM 포커스를 얻으면(§2.1 방향키 이동 시) 동일하게 `Enter`/`Space` 로 활성화된다. 따라서 §0 가정 3 의 포커스 모델 변경은 뒤집기 로직 자체에는 **추가 구현이 필요 없다** — 기존 `flipCard` 호출 경로(BF-916 §6.1, BF-919 `main.js:onCardClick`)를 그대로 재사용한다.

### 3.2 상태별 활성화 결과 (BF-916 인용, 재확인)

| 활성 카드 상태 | Enter/Space 결과 |
|---|---|
| `hidden`, `game.status !== 'checking'` | 카드 뒤집기 진행(BF-916 §6.2 `flipCard`) |
| `hidden`, `game.status === 'checking'` | no-op(입력 잠금, BF-916 §10 EC-02) |
| `revealed`/`matched` | no-op(BF-916 §10 EC-01) |

### 3.3 재시작 버튼 Enter/Space

변경 없음 — 재시작 버튼(`#restart-btn`)은 항상 `tabindex` 조작 대상이 아닌 일반 `<button>`(고정 `Tab` 순서, §2.4)이며 `Enter`/`Space` 로 클릭과 동일하게 재시작이 실행된다(BF-916 §2.5).

---

## 4. 재시작 초기화 명세

### 4.1 초기화 대상 항목 (BF-916 §2.5 인용 — 변경 없음)

| 항목 | 초기화 값 |
|---|---|
| 카드 배치(deck) | 새 Fisher-Yates 셔플, 16장 전부 `hidden` |
| 시도 횟수(moves) | `0` |
| 매치된 쌍(matchedPairs) | `0` |
| 게임 상태(status) | `idle` |
| 타이머 | `00:00`(정지 상태, `startedAt`/`finishedAt` = `null`) |
| 완료 배너 | 숨김(`hidden` 속성 부여) |
| 대기 중인 불일치 flip-back 타이머 | 취소(BF-916 EC-05) |

### 4.2 트리거 (BF-916 §2.5 인용 — 변경 없음)

재시작 버튼 클릭 또는 포커스 후 `Enter`/`Space`, **게임 진행 중(`playing`/`checking`)에도 언제든 허용**된다. "동일 난이도"(§0 가정 2) — 재시작은 보드 크기(4×4)·쌍 개수(8)를 변경하지 않고 동일 난이도로 새 게임을 시작한다.

### 4.3 신규 초기화 항목 — 방향키 포커스 상태 (본 문서 신규)

| 항목 | 초기화 값 | 근거 |
|---|---|---|
| roving tabindex 활성 인덱스(activeIndex) | **`0`**(보드 좌상단 1행 1열)으로 리셋 — 재시작 전 활성 카드가 몇 번이었든 무관 | 재시작 후 카드 내용(pairId)이 완전히 재배치되므로, 이전 활성 인덱스를 유지하면 사용자가 "새 게임인데 이전 위치에 커서가 남아있다"는 혼란을 겪을 수 있음. 항상 원점(1행 1열)으로 리셋해 예측 가능성을 확보한다 |
| DOM 포커스 자체 | **변경하지 않음**(자동으로 보드 안쪽으로 이동시키지 않음) — 사용자가 재시작 버튼을 클릭/키 입력으로 활성화했다면 DOM 포커스는 재시작 버튼에 그대로 유지된다(브라우저 기본 동작, BF-916 §7.1 완료 시 다시하기 버튼 포커스 이동과 동일 패턴이나 일반 재시작은 강제 이동 없음) | 불필요한 포커스 강탈(focus stealing) 을 피한다 — 사용자가 다음에 `Tab`/`Shift+Tab` 으로 보드에 진입할 때만 `activeIndex=0`(1번 카드)이 실제로 포커스된다 |

---

## 5. 순수 함수 Contract 추가

### 5.1 시그니처 (신규 — `logic.js` UMD export 에 추가, 기존 5개 함수는 불변)

```javascript
/**
 * 방향키 입력에 따른 다음 그리드 포커스 인덱스 계산 (순수 함수, DOM 무관)
 * @param {number} currentIndex 현재 활성 카드 인덱스(0~15)
 * @param {'ArrowUp'|'ArrowDown'|'ArrowLeft'|'ArrowRight'} key 입력 키
 * @param {number} [columns=4] 그리드 열 수(본 게임 고정값 4)
 * @param {number} [totalCells=16] 그리드 전체 칸 수(본 게임 고정값 16)
 * @returns {number} 다음 활성 인덱스 — 그리드 경계에서는 currentIndex 그대로 반환(§2.3 클램프)
 */
function getNextFocusIndex(currentIndex, key, columns, totalCells) { ... }
```

### 5.2 반환 값 Contract 요약표

| 조건 | 결과 |
|---|---|
| `key === 'ArrowRight'` 이고 `(currentIndex % columns) < columns - 1` | `currentIndex + 1` |
| `key === 'ArrowRight'` 이고 이미 행의 마지막 열 | `currentIndex`(클램프, 변화 없음) |
| `key === 'ArrowLeft'` 이고 `(currentIndex % columns) > 0` | `currentIndex - 1` |
| `key === 'ArrowLeft'` 이고 이미 행의 첫 열 | `currentIndex`(클램프) |
| `key === 'ArrowDown'` 이고 `currentIndex + columns < totalCells` | `currentIndex + columns` |
| `key === 'ArrowDown'` 이고 이미 마지막 행 | `currentIndex`(클램프) |
| `key === 'ArrowUp'` 이고 `currentIndex - columns >= 0` | `currentIndex - columns` |
| `key === 'ArrowUp'` 이고 이미 첫 행 | `currentIndex`(클램프) |
| 위 4종 외 키 | `currentIndex`(변화 없음, no-op) |

### 5.3 부작용

없음 — 순수 함수. DOM `tabindex`/`.focus()` 조작은 `main.js`(UI 레이어) 책임이며, `getNextFocusIndex` 는 "다음 인덱스가 몇 번인가"만 계산한다(BF-916 §6.3 과 동일 원칙 — 순수 로직/DOM 반영 분리).

### 5.4 Export 방식

기존 `phase18-games/memory-match/logic.js` UMD 패턴(BF-916 §6.4, BF-919 구현)에 `getNextFocusIndex` 를 반환 객체에 추가한다:

```javascript
return {
  PAIR_COUNT: PAIR_COUNT,
  shuffle: shuffle,
  createDeck: createDeck,
  createInitialState: createInitialState,
  flipCard: flipCard,
  evaluateCheck: evaluateCheck,
  getNextFocusIndex: getNextFocusIndex, // BF-954 신규
};
```

---

## 6. Acceptance Criteria (Given/When/Then)

### AC-K01: 방향키로 인접 카드 포커스 이동

> **Given** 4×4 보드 내 임의의 카드(인덱스 N, 가장자리가 아님)에 DOM 포커스가 있을 때
> **When** 사용자가 `ArrowRight`/`ArrowLeft`/`ArrowDown`/`ArrowUp` 중 하나를 누르면
> **Then** 해당 방향의 인접 카드로 포커스가 이동하고(`getNextFocusIndex` 규칙, §5.2), 이전 카드는 `tabindex="-1"`, 새 카드는 `tabindex="0"` 이 된다

### AC-K02: 그리드 경계에서 클램프

> **Given** 보드 최상단 행의 카드에 포커스가 있을 때
> **When** 사용자가 `ArrowUp` 을 누르면
> **Then** 포커스는 이동하지 않고 그대로 유지된다(§2.3, 반대편으로 순환 이동하지 않음). 좌/우/하단 경계도 동일 원칙 적용

### AC-K03: 방향키 이동은 카드 상태를 바꾸지 않음

> **Given** 임의의 카드에 포커스가 있을 때
> **When** 사용자가 방향키를 눌러 다른 카드로 포커스를 이동하면
> **Then** 포커스를 잃은 카드와 새로 포커스를 얻은 카드 모두 `data-state`(hidden/revealed/matched)가 변하지 않는다 — 뒤집기는 발생하지 않는다

### AC-K04: `matched`/`checking` 중에도 방향키 이동 가능

> **Given** 일부 카드가 `matched` 상태이거나 게임이 `checking`(입력 잠금) 상태일 때
> **When** 사용자가 방향키를 누르면
> **Then** 카드 활성화(뒤집기)는 여전히 잠겨 있지만, 포커스는 정상적으로 이동한다(§2.2, 16칸 전부 이동 대상 유지)

### AC-E01: Enter/Space 뒤집기 (포커스 모델 변경 후에도 유지)

> **Given** roving tabindex 로 인해 `tabindex="-1"` 이었던 카드가 방향키 이동으로 방금 DOM 포커스를 얻었을 때
> **When** 사용자가 `Enter` 또는 `Space` 를 누르면
> **Then** 해당 카드가 `hidden` 이고 `game.status !== 'checking'` 이면 마우스 클릭과 동일하게 뒤집기가 실행된다(§3.1~§3.2)

### AC-R01: 재시작 시 카드/시도 횟수/완료 상태 초기화

> **Given** 게임이 `idle`/`playing`/`checking`/`won` 중 어느 상태이든(진행 중 일부 카드가 `matched`/`revealed` 인 상태 포함)
> **When** 사용자가 재시작 버튼을 클릭(또는 포커스 후 `Enter`/`Space`)하면
> **Then** 카드는 새로 셔플되어 전부 `hidden`, 시도 횟수(moves)는 `0`, 매치된 쌍(matchedPairs)은 `0`, 게임 상태는 `idle`, 타이머는 `00:00`, 완료 배너는 숨겨지고, 대기 중인 불일치 flip-back 타이머는 취소된다(§4.1)

### AC-R02: 재시작 시 방향키 활성 인덱스 원점 리셋

> **Given** 재시작 직전 방향키로 이동해 임의의 카드(인덱스 N ≠ 0)가 활성(`tabindex="0"`)이었을 때
> **When** 재시작이 실행되면
> **Then** roving tabindex 활성 인덱스는 `0`(1행 1열)으로 리셋된다 — 이후 사용자가 `Tab`/`Shift+Tab` 으로 보드에 진입하면 항상 1번 카드에 포커스된다(§4.3)

### AC-R03: 재시작은 DOM 포커스를 강제 이동시키지 않음

> **Given** 사용자가 재시작 버튼에 포커스를 두고 `Enter`/`Space` 로 재시작을 실행했을 때
> **When** 재시작 처리가 완료되면
> **Then** DOM 포커스는 재시작 버튼에 그대로 유지되며, 보드 안쪽으로 강제 이동되지 않는다(§4.3)

### 6.1 BF-954 수용 기준 ↔ 본 문서 매핑표

| BF-954 수용 기준 | 충족 근거 |
|---|---|
| Given Epic 요구, When 기획, Then `docs/plan/memory-match-*.md` 에 키보드 조작·포커스 유지·재시작 초기화 시나리오가 검증 가능한 항목으로 정의된다 | §2(방향키 이동 규칙+경계 처리)·§3(Enter/Space 재확인)·§4(재시작 초기화 항목·포커스 리셋)·§5(순수 함수 contract, 단위 테스트 가능)·§6 AC-K01~K04·AC-E01·AC-R01~R03·§8(테스트 케이스 표) |
| Given 범위 제약, When 조회, Then root recursive search 0회·범위 밖 조회 0~2회를 만족한다 | 본 문서는 candidateFiles(§0)로 제공된 `docs/plan/memory-match-BF-916.md`, `docs/design/memory-match-BF-916.md`, `phase18-games/memory-match/**`, `tests/memory-match-BF919.test.js` 만 조회했으며 저장소 루트 재귀 `find`/`grep` 를 호출하지 않았다(git log 1회는 커밋 컨벤션 확인용 bounded 조회, widening 아님 — 특정 경로 한정 `git log -- <paths>`) |

---

## 7. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|---|---|---|
| EC-K01 | 그리드 네 모서리(0, 3, 12, 15) 에서 바깥쪽 방향키 2개 조합(예: 인덱스 0 에서 `ArrowUp`+`ArrowLeft`) | 각각 클램프, 포커스 불변(§2.3) |
| EC-K02 | 방향키를 연속 여러 번 빠르게 입력 | 매 입력마다 `getNextFocusIndex` 가 독립적으로 계산되어 순차 이동 — 디바운스/스로틀 불필요(순수 계산이므로 누락 없음) |
| EC-K03 | 방향키 이외의 키(예: `PageDown`, 문자키)를 보드 포커스 상태에서 입력 | no-op — §9 비범위, 이벤트 핸들러가 처리하지 않고 기본 동작도 없음(카드 `<button>` 은 문자키에 반응하는 네이티브 동작 없음) |
| EC-K04 | 8쌍 중 다수가 이미 `matched` 인 상태에서 방향키로 `matched` 카드 위를 통과 | 포커스는 정상 이동, 해당 카드 시각 상태(고정 스타일) 불변(AC-K03·AC-K04) |
| EC-R01 | `checking`(2장 판정 대기, 불일치 flip-back 타이머 대기 중)에 재시작 | 대기 타이머 취소 후 즉시 재초기화(BF-916 EC-05 그대로) + activeIndex 도 0 으로 리셋(§4.3) |
| EC-R02 | 재시작 직후(activeIndex=0 리셋됨) 사용자가 `Shift+Tab` 으로 보드 이전 요소에서 진입 | `Shift+Tab` 으로 보드에 진입해도 활성 카드는 여전히 인덱스 0(1번 카드) — roving tabindex 는 진입 방향과 무관하게 "현재 활성 인덱스"에만 반응(표준 grid 패턴 동작, 첫 카드로 고정 진입은 재시작 직후 한정) |
| EC-R03 | `won` 화면에서 "다시하기" 버튼으로 재시작 | BF-916 §7.1 "완료 시 다시하기 버튼 포커스 이동" 규칙과 본 문서 AC-R03(포커스 강제 이동 없음)이 상충하지 않음 — `win-restart-btn` 자체가 사용자가 이미 클릭/키 입력한 버튼이므로 포커스는 그 버튼에 남아있는 것이 곧 "포커스 유지"이며 별도 이동이 필요 없다 |

---

## 8. 단위 테스트 전략

### 8.1 테스트 파일 위치 및 실행

```bash
# 실행 명령 (focused scope, module: memory-match) — 기존 tests/memory-match-BF919.test.js 와 별도 파일 또는 추가(§12-2)
node --test tests/memory-match-*.test.js
```

### 8.2 테스트 대상

`getNextFocusIndex` 순수 함수만 신규 단위 테스트 대상이다(§5). DOM 의 실제 `tabindex`/`.focus()` 반영, `Enter`/`Space` 네이티브 활성화, 재시작 시 DOM 포커스 유지 여부는 단위 테스트 범위에서 제외하고 tester(BF-958) 의 E2E 가드로 다룬다(BF-916 §8.2 와 동일 원칙 — 순수 로직만 `node --test`, DOM 인터랙션은 E2E).

### 8.3 필수 테스트 케이스

| 케이스 ID | 대상 | 시나리오 | 기대 결과 |
|---|---|---|---|
| TC-K01 | `getNextFocusIndex` | 인덱스 5(2행 2열) 에서 `ArrowRight` | `6` |
| TC-K02 | `getNextFocusIndex` | 인덱스 5 에서 `ArrowLeft` | `4` |
| TC-K03 | `getNextFocusIndex` | 인덱스 5 에서 `ArrowDown` | `9` |
| TC-K04 | `getNextFocusIndex` | 인덱스 5 에서 `ArrowUp` | `1` |
| TC-K05 | `getNextFocusIndex` | 인덱스 0(1행 1열) 에서 `ArrowUp` | `0`(클램프, §2.3) |
| TC-K06 | `getNextFocusIndex` | 인덱스 0 에서 `ArrowLeft` | `0`(클램프) |
| TC-K07 | `getNextFocusIndex` | 인덱스 3(1행 4열) 에서 `ArrowRight` | `3`(클램프, 행 끝) |
| TC-K08 | `getNextFocusIndex` | 인덱스 15(4행 4열) 에서 `ArrowDown`/`ArrowRight` | `15`(클램프, 그리드 끝) |
| TC-K09 | `getNextFocusIndex` | 인덱스 12(4행 1열) 에서 `ArrowLeft`/`ArrowDown` | `12`(클램프) |
| TC-K10 | `getNextFocusIndex` | 지원하지 않는 키(예: `'Enter'`) 전달 | `currentIndex` 그대로(no-op) |
| TC-R01 | `createInitialState`(재확인, BF-916 §8.3 TC-03 재사용) | 재시작 = `createDeck`+`createInitialState` 재호출 | `status==='idle'`, `moves===0`, `matchedPairs===0` — §4.1 초기화 항목 회귀 확인 |

### 8.4 테스트 파일 구조 (참조 템플릿)

```javascript
// tests/memory-match-BF9xx.test.js (dev-task 번호는 후속 BF-956 이 확정 — 위 glob 에 매치되어야 함)
import { test } from "node:test";
import assert from "node:assert/strict";
// logic.js 로드는 기존 tests/memory-match-BF919.test.js 의 node:vm 샌드박스 패턴 재사용(§8.2)

test("TC-K01~K04: 인접 카드로 방향키 이동", () => {
  assert.equal(L.getNextFocusIndex(5, "ArrowRight", 4, 16), 6);
  assert.equal(L.getNextFocusIndex(5, "ArrowLeft", 4, 16), 4);
  assert.equal(L.getNextFocusIndex(5, "ArrowDown", 4, 16), 9);
  assert.equal(L.getNextFocusIndex(5, "ArrowUp", 4, 16), 1);
});

test("TC-K05~K09: 그리드 경계 클램프", () => {
  assert.equal(L.getNextFocusIndex(0, "ArrowUp", 4, 16), 0);
  assert.equal(L.getNextFocusIndex(0, "ArrowLeft", 4, 16), 0);
  assert.equal(L.getNextFocusIndex(3, "ArrowRight", 4, 16), 3);
  assert.equal(L.getNextFocusIndex(15, "ArrowDown", 4, 16), 15);
  assert.equal(L.getNextFocusIndex(12, "ArrowLeft", 4, 16), 12);
});
```

---

## 9. 비범위 (Out of Scope)

| 항목 | 사유 |
|---|---|
| 난이도 선택(보드 크기 변경) | BF-916 §11 비범위 유지, §0 가정 2 |
| `Home`/`End`/`PageUp`/`PageDown` 등 확장 내비게이션 키 | 4×4 소규모 그리드에서는 방향키 4종만으로 최대 3회 이동이면 임의 칸 도달 가능 — 확장 키는 과설계(Simplicity First), 필요 시 별도 스토리 |
| wrap-around(순환) 이동 | §2.3 근거로 클램프 채택, wrap 은 후속 개선 후보(§12-1) |
| 마우스 hover 시 포커스 동기화(hover-follows-focus) | 요구되지 않음 — 방향키 이동은 키보드 전용 기능 |
| 게임 규칙·상태 전이·타이머·완료 조건 변경 | BF-916 §2~§4 그대로, 본 문서는 키보드/재시작 접근성만 다룸 |
| 시각 디자인(포커스 링 색상·카드 스타일 등) | designer(BF-955) 담당 — 본 문서는 동작 계약만 정의 |

---

## 10. 디자이너/개발자 위임 사항

| 항목 | 위임 대상 | 가이드라인 |
|---|---|---|
| roving tabindex 마크업 세부(예: `role="grid"`/`role="gridcell"` 추가 여부) | developer(BF-956) | 현재 `#board` 에 이미 `role="grid"` 존재(BF-919). `role="row"`/`role="gridcell"` 세분화는 WAI-ARIA APG grid 패턴 권장이나 필수는 아님 — 카드가 네이티브 `<button>` 인 한 스크린리더 기본 지원은 유지됨. 세분화 여부는 dev 재량, 단 §2~§5 의 동작 계약은 마크업 세분화와 무관하게 유효 |
| 포커스 링 스타일이 `tabindex` 변경 후에도 여전히 보이는지 | designer(BF-955) | 기존 `:focus-visible` 스타일(BF-918 §5.5)은 `tabindex` 값과 무관하게 적용됨 — 신규 시각 변경 불필요, 회귀 확인만 권장 |
| 방향키 이벤트 리스너 부착 위치(보드 컨테이너 위임 vs 카드별 개별 리스너) | developer(BF-956) | 이벤트 위임(보드에 1개 `keydown` 리스너) 권장(성능·중복 방지) — 구현 세부는 dev 재량, §2~§5 계약과 무관 |
| 재시작 시 activeIndex 리셋 구현 위치(`main.js` 내부 로컬 변수 vs 별도 모듈) | developer(BF-956) | `main.js` 의 기존 런타임 상태 변수(`state`, `cardEls` 등, BF-919)와 나란히 `activeIndex` 로컬 변수 추가 권장 — 게임 상태 객체(§3.4, BF-916)에는 포함시키지 않는다(순수 로직과 UI-only 포커스 상태 분리, §0 가정 4) |

---

## 11. 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/plan/memory-match-BF-954.md`(본 문서) |
| 기반 SSOT(게임 규칙, 변경 없음) | `docs/plan/memory-match-BF-916.md` |
| 기반 시각 명세(변경 없음, designer BF-955 가 필요 시 보강) | `docs/design/memory-match-BF-916.md` |
| 현재 구현 baseline(참조, developer BF-956 이 수정) | `phase18-games/memory-match/{index.html,logic.js,main.js,styles.css}`(BF-919) |
| 기존 단위 테스트(참조, developer BF-956/tester BF-958 이 확장) | `tests/memory-match-BF919.test.js` |
| 신규 테스트 대상(후속 dev/tester task) | `tests/memory-match-*.test.js` — 파일명 미정, 본 문서 §5·§8 이 검증 기준 |

---

## 12. 남은 모호함 (운영자 확인 권장)

1. **wrap-around 채택 여부**: §2.3 에서 클램프를 기본으로 채택했다. 순환 이동을 원하는 특수 요구가 있다면 확인이 필요하다.
2. **테스트 파일 분리 여부**: 본 문서 §8 은 신규 파일(`tests/memory-match-BF9xx.test.js`) 또는 기존 `tests/memory-match-BF919.test.js` 확장 중 developer(BF-956) 재량으로 남겨두었다. 파일이 늘어나면 `tests/memory-match-*.test.js` glob 실행 범위에는 영향 없다.
3. **`role="gridcell"`/`role="row"` 세분화**: §10 에서 dev 재량으로 남겼다. 스크린리더 벤더별 grid 패턴 지원 편차가 있어, 세분화 시 실제 개선 여부는 tester(BF-958) 의 스크린리더 수동 검증 권장.

---

*문서 종료 — [박기획] · BF-954*

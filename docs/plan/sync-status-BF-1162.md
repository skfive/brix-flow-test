# 동기화 상태 센터 기획 명세 — BF-1162

> 작성자: [박기획] · 작성일 2026-07-25
> 관련 티켓: BF-1162 (planner task) · 형제 태스크: BF-1163(designer) / BF-1164(developer) / BF-1166(tester)
> 신규 모듈: `sync-status/` (repo 루트, `incident-triage/`·`minesweeper/` 와 동일 convention)
> tech-stack correction: 요청 marker 는 `typescript-monorepo` 이나, repo 실제 관례(`package.json` — `type: module`, 의존성 0건 vanilla 모듈 다수, `src/` 하위에 별도 프레임워크 구조 없음)는 **vanilla-static** 이다. 본 명세는 vanilla-static 관례를 따른다. 계약 초안의 `src/features/sync-status/**` / `src/routes/sync-status/**` 경로는 실제 repo 관례와 불일치하므로 채택하지 않는다 — 신규 모듈은 `sync-status/` (repo 루트) 에 위치한다.
> 단위 테스트: `node --test tests/sync-status-*.test.js` (focused scope, `BRIX_TEST_SCOPE=focused`)

---

## 목차

1. [개요](#1-개요)
2. [상태 모델 (6종)](#2-상태-모델-6종)
3. [Fixture 데이터 구조 및 결정론적 전이 규칙](#3-fixture-데이터-구조-및-결정론적-전이-규칙)
4. [사용자 시나리오 및 UX 흐름](#4-사용자-시나리오-및-ux-흐름)
5. [화면 상태 전이 표](#5-화면-상태-전이-표)
6. [파일 구조 및 모듈 경계](#6-파일-구조-및-모듈-경계)
7. [함수 Contract](#7-함수-contract)
8. [KPI 정의 및 측정 지점](#8-kpi-정의-및-측정-지점)
9. [단위 테스트 전략](#9-단위-테스트-전략)
10. [Acceptance Criteria (Given/When/Then)](#10-acceptance-criteria-givenwhenthen)
11. [접근성 요구](#11-접근성-요구)
12. [반응형 요구](#12-반응형-요구)
13. [additive 원칙 · vanilla-static/file:// 제약 · 롤백 경로](#13-additive-원칙--vanilla-staticfile-제약--롤백-경로)
14. [Edge Case 목록](#14-edge-case-목록)
15. [비범위 (Out of Scope)](#15-비범위-out-of-scope)
16. [디자이너 위임 시각 요소](#16-디자이너-위임-시각-요소)

---

## 1. 개요

### 1.1 목적

운영자가 여러 외부 저장소(예: GitHub 리포지토리)의 **동기화 상태를 한 화면에서 모니터링**할 수 있도록, "동기화 상태 센터" dogfood 화면을 바닐라 HTML/CSS/JS 로 구현한다. 실제 외부 저장소 API 는 호출하지 않으며, 로컬 **fixture 데이터**로 정의된 결정론적 시나리오에 따라 상태가 전이되는 시뮬레이션 방식으로 동작한다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 신규 경로 | `sync-status/` (`index.html` / `style.css` / `status.js` / `fixtures.js`) |
| 기존 코드 영향 | 없음 — 완전 독립 신규 모듈 (additive dogfood 라우트) |
| 저장소 사용 | 없음 — in-memory 상태 (새로고침 시 초기화, `localStorage` 미사용) |
| 외부 라이브러리 / API / 신규 npm 패키지 | 전부 금지 — fixture 데이터는 정적 JS 객체로 모듈 내부에 포함, 네트워크 호출 0건 |
| 비밀 정보(토큰/키) | 사용 금지 — fixture 는 저장소 이름·상태 시나리오만 포함한 더미 데이터 |

### 1.3 전제 조건

- 브라우저 환경, `file://` 프로토콜 직접 실행 호환 (기존 모듈과 동일 제약)
- `sync-status/` 디렉토리가 repo 루트에 신설됨
- `tests/sync-status-*.test.js` 가 `node --test` 로 실행 가능
- 이 화면은 **dogfood 전용** — 실제 배포 시스템의 동기화 파이프라인과 무관하며, 운영자 내부 검증/데모 목적

### 1.4 용어 정의

| 용어 | 정의 |
|------|------|
| 저장소(repo) 카드 | 상태 센터에 나열되는 개별 외부 저장소 하나를 표현하는 UI 단위 |
| 상태(state) | 저장소 카드가 가질 수 있는 6종 값 중 하나 (§2) |
| 트리거(trigger) | 상태 전이를 유발하는 사용자 액션. `check`(지금 확인) 또는 `retry`(재시도) |
| fixture 결과(outcome) | 전이가 최종적으로 도달할 상태를 결정하는 정적 시나리오 값. `clean`/`stale`/`conflict`/`error` 4종 |
| 확인 비용(check cost) | 트리거 시작부터 최종 상태 확정까지 걸린 시간(ms) — KPI-1 |
| 재시도 성공률(retry success rate) | `retry` 트리거로 시작된 시도 중 실패/충돌로 끝나지 않은 비율 — KPI-2 |

---

## 2. 상태 모델 (6종)

| # | 상태 ID | 한글 라벨 | 의미 | 진입 조건 |
|---|---------|-----------|------|-----------|
| 1 | `idle` | 미확인 | 아직 한 번도 확인하지 않은 초기 상태 | 페이지 최초 로드 시 모든 저장소의 기본값 |
| 2 | `up_to_date` | 최신 | 로컬과 원격이 완전히 동기화됨 | fixture 결과 `clean` |
| 3 | `behind` | 지연 | 원격에 반영되지 않은 변경 사항 존재, 동기화 권장 | fixture 결과 `stale` |
| 4 | `syncing` | 동기화중 | 확인/재시도 요청이 진행 중인 전이 상태(transient) | `check`/`retry` 트리거 직후 |
| 5 | `conflict` | 충돌 | 로컬·원격 변경이 충돌하여 수동 개입 필요 | fixture 결과 `conflict` |
| 6 | `failed` | 실패 | 동기화 시도가 오류로 종료됨 (네트워크/인증 등 시뮬레이션) | fixture 결과 `error` |

> `syncing` 은 유일한 **전이(transient) 상태** — 사용자 액션으로 직접 진입하며, 100% `resolveSync()` 호출을 통해 나머지 5종 중 하나로 확정된다. 대기 상태로 남아있지 않는다(§3.3 참조).

---

## 3. Fixture 데이터 구조 및 결정론적 전이 규칙

### 3.1 설계 원칙

- 실제 API 응답 대신, **정적 JS 배열(fixture)** 을 저장소별 "시나리오 큐"로 사용한다. 난수·타이머 값에 의존하지 않아 매 실행 결과가 100% 재현 가능해야 한다.
- 각 저장소는 독립적인 fixture 큐와 포인터(`cursor`)를 가진다 — 한 저장소의 확인이 다른 저장소 상태에 영향을 주지 않는다.
- 큐 소진 시 **처음부터 순환**(`cursor % queue.length`)한다 — 무한 확인 요청에도 안전하게 결정론을 유지한다(임의 fallback 값 생성 금지).

### 3.2 Fixture 데이터 형태 (예시)

```javascript
// sync-status/fixtures.js — 정적 데이터만 포함, 외부 호출 없음
const SYNC_FIXTURES = {
  repos: [
    { id: 'repo-alpha', name: 'brix-web', outcomes: ['clean', 'stale', 'clean', 'conflict'] },
    { id: 'repo-beta',  name: 'brix-api', outcomes: ['error', 'error', 'clean'] },
    { id: 'repo-gamma', name: 'brix-docs', outcomes: ['stale', 'clean'] },
  ],
};
```

- `outcomes[]` 순서대로 확인/재시도 시마다 하나씩 소비(cursor 증가)한다.
- 값은 `'clean' | 'stale' | 'conflict' | 'error'` 4종 리터럴만 허용.

### 3.3 전이 규칙 표

| From 상태 | 허용 트리거 | 중간 상태 | fixture outcome | To 상태 |
|-----------|-------------|-----------|------------------|---------|
| `idle` | `check` | `syncing` | `clean` | `up_to_date` |
| `idle` | `check` | `syncing` | `stale` | `behind` |
| `idle` | `check` | `syncing` | `conflict` | `conflict` |
| `idle` | `check` | `syncing` | `error` | `failed` |
| `up_to_date` | `check` | `syncing` | (동일 4분기) | (동일 4분기) |
| `behind` | `check` | `syncing` | (동일 4분기) | (동일 4분기) |
| `failed` | `retry` | `syncing` | (동일 4분기) | (동일 4분기) |
| `conflict` | `retry` | `syncing` | (동일 4분기) | (동일 4분기) |
| `syncing` | — (사용자 트리거 불가, 진행 중 버튼 disabled) | — | — | — |

> 규칙 요약: **모든 상태에서 진입 가능한 트리거는 `idle`/`up_to_date`/`behind` 는 `check`, `failed`/`conflict` 는 `retry`** 뿐이며, 결과는 항상 `syncing` 을 거쳐 fixture outcome 4종 중 하나로 확정된다. 개발자는 이 표를 그대로 lookup 으로 구현하며 별도 조건 로직으로 재해석하지 않는다.

---

## 4. 사용자 시나리오 및 UX 흐름

### 4.1 정상 흐름 (Happy Path)

```
[화면 로드]
  └─ fixture 의 저장소 목록 개수만큼 카드 렌더링, 전부 idle(미확인) 상태로 표시

["지금 확인" 클릭 (idle/up_to_date/behind 카드)]
  └─ 해당 카드 즉시 syncing(동기화중) 으로 전환, 버튼 비활성화
      └─ 고정 지연(§13 UX 딜레이) 후 fixture outcome 소비 → 4종 상태 중 하나로 확정
          └─ 카드 상태·아이콘·타임스탬프 갱신, 버튼 재활성화(라벨은 최종 상태에 따라 "확인"/"재시도")

["재시도" 클릭 (failed/conflict 카드)]
  └─ "지금 확인"과 동일한 syncing 경로를 거쳐 재확정 (§3.3)

[반복 확인]
  └─ 동일 카드에서 확인/재시도를 반복하면 fixture 큐의 다음 outcome 을 순서대로 소비(순환)
```

### 4.2 KPI 패널 흐름

```
[임의 카드에서 확인/재시도 발생]
  └─ syncMetrics 에 확인 소요시간(ms) 1건 누적
  └─ 트리거가 retry 였다면 retryAttempts++, 최종 상태가 failed/conflict 가 아니면 retrySuccesses++
[KPI 요약 패널]
  └─ "평균 확인 비용", "재시도 성공률" 을 in-memory 값 기준으로 즉시 갱신 표시 (새로고침 시 초기화)
```

---

## 5. 화면 상태 전이 표

| 상태 ID | 카드 표시 | 액션 버튼 | 버튼 라벨 |
|---------|-----------|-----------|-----------|
| `idle` | 회색조 배지 "미확인" | 활성 | "지금 확인" |
| `up_to_date` | 배지 "최신" | 활성 | "지금 확인" |
| `behind` | 배지 "지연" | 활성 | "지금 확인" |
| `syncing` | 배지 "동기화중" + 진행 표시 | **비활성** | "확인 중…" |
| `conflict` | 배지 "충돌" | 활성 | "재시도" |
| `failed` | 배지 "실패" | 활성 | "재시도" |

---

## 6. 파일 구조 및 모듈 경계

### 6.1 파일 목록

```
sync-status/
├── index.html    ← HTML 마크업 + 스크립트 로드
├── style.css     ← 시각 스타일 (designer 담당, BF-1163)
├── fixtures.js    ← 정적 fixture 데이터 (§3.2, developer 담당)
└── status.js      ← 상태 전이 로직 + KPI 집계 + DOM 인터랙션 (developer 담당, BF-1164)

tests/
└── sync-status-*.test.js   ← 상태 전이/KPI 순수 함수 단위 테스트 (tester 담당, BF-1166)
```

### 6.2 모듈 책임 분리

- `index.html`: 저장소 카드 목록 컨테이너(`<ul id="repo-list">`), 카드마다 `data-state="idle|up_to_date|behind|syncing|conflict|failed"` 속성, KPI 요약 영역(`<div id="kpi-summary" aria-live="polite">`)
- `style.css`: `data-state` 값별 배지 색상/아이콘, 반응형 레이아웃 (§12)
- `fixtures.js`: §3.2 데이터만 정의, 로직 없음
- `status.js`: 순수 함수(§7) + DOM 렌더링 + KPI 누적 담당. UMD 패턴 사용(본 repo `incident-triage/triage.js` 관례 그대로 따름) — 브라우저 전역 `window.SyncStatus` 노출, Node 테스트 환경에서는 `module.exports`
- `localStorage`/`fetch`/외부 API 호출 전면 금지

---

## 7. 함수 Contract

### 7.1 순수 상태 전이 함수

```javascript
/**
 * 트리거 발생 시 syncing 으로 즉시 전이 (순수 함수, 부작용 없음)
 * @param {'idle'|'up_to_date'|'behind'|'conflict'|'failed'} currentState
 * @param {'check'|'retry'} trigger
 * @returns {'syncing'}
 * @throws {TypeError} 허용되지 않는 (currentState, trigger) 조합이면 즉시 throw
 *   — idle/up_to_date/behind 는 trigger==='check' 만, conflict/failed 는 trigger==='retry' 만 허용
 */
function startSync(currentState, trigger) { /* §3.3 표 그대로 검증 후 'syncing' 반환 */ }

/**
 * fixture outcome 을 최종 상태로 확정 (순수 함수, 부작용 없음)
 * @param {'clean'|'stale'|'conflict'|'error'} outcome
 * @returns {'up_to_date'|'behind'|'conflict'|'failed'}
 * @throws {TypeError} outcome 이 4종 리터럴이 아니면 즉시 throw
 */
function resolveSync(outcome) { /* §3.3 4분기 lookup 그대로 */ }

/**
 * 저장소의 fixture 큐에서 다음 outcome 을 결정론적으로 소비 (순환)
 * @param {{outcomes: string[]}} repoFixture
 * @param {number} cursor - 지금까지 이 저장소에서 소비한 횟수 (0-based)
 * @returns {string} outcome — repoFixture.outcomes[cursor % outcomes.length]
 */
function nextOutcome(repoFixture, cursor) { /* §3.1 순환 규칙 */ }
```

### 7.2 KPI 집계 함수 (§8 과 1:1 대응, 순수 함수 + 별도 accumulator 객체)

```javascript
/**
 * 확인 1건의 소요시간을 KPI 누적 객체에 기록
 * @param {{checkDurationsMs: number[]}} metrics
 * @param {number} startedAt - startSync 호출 시각(ms, performance.now() 또는 Date.now())
 * @param {number} resolvedAt - resolveSync 호출 시각(ms)
 * @returns {{checkDurationsMs: number[]}} 갱신된 metrics (불변 갱신 — 새 객체 반환)
 */
function recordCheckCost(metrics, startedAt, resolvedAt) { /* durationsMs.push(resolvedAt-startedAt) */ }

/**
 * retry 트리거 결과를 KPI 누적 객체에 기록
 * @param {{retryAttempts: number, retrySuccesses: number}} metrics
 * @param {'up_to_date'|'behind'|'conflict'|'failed'} finalState
 * @returns {{retryAttempts: number, retrySuccesses: number}} 갱신된 metrics
 */
function recordRetryOutcome(metrics, finalState) { /* attempts+1, finalState가 conflict/failed 가 아니면 successes+1 */ }
```

- `startSync`/`resolveSync`/`nextOutcome`/`recordCheckCost`/`recordRetryOutcome` 는 **전부 순수 함수** — 타이머·DOM·난수 의존 없음. 실제 timestamp(`performance.now()`) 획득과 setTimeout UX 딜레이는 `status.js` 의 DOM 배선 코드(발신자)에서만 다루고, 순수 함수는 인자로 받은 값만 사용한다. 이는 `node --test` 로 타이머 mocking 없이 결정론적 단위 테스트를 가능하게 하기 위함이다.

---

## 8. KPI 정의 및 측정 지점

### 8.1 KPI-1: 확인 비용 (Check Cost)

- **정의**: "지금 확인"/"재시도" 클릭 시점부터 상태가 최종 확정되는 시점까지 걸린 시간(ms).
- **측정 지점**: `status.js` 의 DOM 배선 코드에서 (a) `startSync()` 호출 직전 `performance.now()` 를 `checkStartedAt` 으로 기록 → (b) UX 딜레이(§13.3) 이후 `resolveSync()` 호출 직후 `performance.now()` 를 `checkResolvedAt` 으로 기록 → (c) `recordCheckCost(metrics, checkStartedAt, checkResolvedAt)` 호출로 `metrics.checkDurationsMs` 배열에 누적.
- **집계값**: 평균 확인 비용 = `checkDurationsMs.reduce(sum) / checkDurationsMs.length`. KPI 패널에 실시간 표시(§4.2), in-memory 값(새로고침 시 초기화, 외부 전송 없음).

### 8.2 KPI-2: 재시도 성공률 (Retry Success Rate)

- **정의**: `retry` 트리거로 시작된 확인 중, 최종 상태가 `failed`/`conflict` 가 **아닌** 비율.
- **측정 지점**: `status.js` 의 DOM 배선 코드에서 `startSync(currentState, 'retry')` 를 호출하는 분기(즉 카드 상태가 `failed`/`conflict` 일 때)에서만 `resolveSync()` 결과를 `recordRetryOutcome(metrics, finalState)` 로 전달. `check` 트리거 경로는 이 카운터에 포함하지 않는다.
- **집계값**: `retrySuccessRate = metrics.retrySuccesses / metrics.retryAttempts` (attempts가 0이면 "데이터 없음" 표시, 0으로 나누지 않음).

### 8.3 측정값 저장·노출 범위

- 모든 KPI 값은 `status.js` 내부 in-memory 객체(예: `window.SyncStatus.metrics` 또는 모듈 스코프 변수)에만 존재한다. `localStorage`/원격 analytics 전송 금지 — 새로고침 시 완전 초기화됨을 KPI 패널에 명시 문구로 안내한다(§16 디자이너 위임 문구 톤 제외, 문구 존재 자체는 필수).
- 단위 테스트(§9)는 `recordCheckCost`/`recordRetryOutcome` 를 timestamp/최종상태 값을 직접 주입해 검증한다 — 실제 타이머·클릭 이벤트 없이 결정론적으로 KPI 로직만 단독 검증 가능해야 한다.

---

## 9. 단위 테스트 전략

### 9.1 실행 명령

```bash
node --test tests/sync-status-*.test.js
```

### 9.2 필수 테스트 케이스

| 케이스 ID | 대상 함수 | 시나리오 | 기대 결과 |
|-----------|-----------|----------|-----------|
| TC-01~04 | `startSync` | `('idle','check')`/`('up_to_date','check')`/`('behind','check')` | `'syncing'` 반환 |
| TC-05 | `startSync` | `('failed','retry')` | `'syncing'` 반환 |
| TC-06 | `startSync` | `('conflict','retry')` | `'syncing'` 반환 |
| TC-07 | `startSync` | `('idle','retry')` (허용 안 됨 조합) | `TypeError` throw |
| TC-08 | `startSync` | `('failed','check')` (허용 안 됨 조합) | `TypeError` throw |
| TC-09~12 | `resolveSync` | `'clean'`/`'stale'`/`'conflict'`/`'error'` | `'up_to_date'`/`'behind'`/`'conflict'`/`'failed'` 각각 |
| TC-13 | `resolveSync` | `'invalid'` | `TypeError` throw |
| TC-14 | `nextOutcome` | `outcomes:['clean','stale']`, cursor=0,1,2,3 | `'clean','stale','clean','stale'` (순환 확인) |
| TC-15 | `recordCheckCost` | startedAt=100, resolvedAt=340 | `checkDurationsMs` 에 `240` 누적 |
| TC-16 | `recordRetryOutcome` | finalState=`'up_to_date'` | `retryAttempts` +1, `retrySuccesses` +1 |
| TC-17 | `recordRetryOutcome` | finalState=`'failed'` | `retryAttempts` +1, `retrySuccesses` 불변 |
| TC-18 | `recordRetryOutcome` | finalState=`'conflict'` | `retryAttempts` +1, `retrySuccesses` 불변 |

- §3.3 6개 상태 × 전이 표 전 조합, §8 KPI 계산식 모두 이 테스트 파일에서 커버되어야 한다.
- DOM/타이머(setTimeout UX 딜레이)/클릭 이벤트는 단위 테스트 범위에서 제외한다(필요 시 별도 E2E 티켓, tester 재량).

---

## 10. Acceptance Criteria (Given/When/Then)

### AC-01: 상태 6종 및 fixture 기반 결정론적 전이 (Epic 요구 1)

> **Given** §2 상태 모델 6종과 §3 fixture outcome 4종이 정의되어 있을 때
> **When** 임의의 허용된 (state, trigger) 조합으로 `startSync` 후 임의의 outcome 으로 `resolveSync` 를 호출하면
> **Then** §3.3 전이 표와 정확히 일치하는 상태가 매번 동일하게 반환된다 (호출 순서·횟수와 무관하게 결정론적)

### AC-02: fixture 큐 순환 결정론성

> **Given** 저장소의 `outcomes` 배열 길이가 N일 때
> **When** cursor 값이 N, N+1, N+2… 로 증가하며 `nextOutcome` 을 호출하면
> **Then** `outcomes[cursor % N]` 과 정확히 동일한 값이 매번 재현 가능하게 반환된다

### AC-03: KPI 측정 지점 정의 (Epic 요구 2)

> **Given** §8.1/§8.2 에 정의된 확인 비용·재시도 성공률 측정 지점(`recordCheckCost`/`recordRetryOutcome` 호출 위치)이 명세되어 있을 때
> **When** developer 가 `status.js` 의 `startSync`/`resolveSync` 호출 경계에 해당 함수를 삽입하면
> **Then** 확인 1건마다 `checkDurationsMs` 1건이, retry 트리거 1건마다 `retryAttempts`(및 조건부 `retrySuccesses`) 1건이 정확히 누적된다 (중복·누락 없음)

### AC-04: 초기 상태 — 전부 미확인

> **Given** `sync-status/index.html` 을 최초 로드했을 때
> **When** 페이지 로드가 완료되면
> **Then** fixture 의 모든 저장소 카드가 `idle`(미확인) 상태로 표시되고 KPI 패널은 "데이터 없음" 상태다

### AC-05: 확인 진행 중 버튼 비활성화

> **Given** 임의 카드가 `syncing` 상태일 때
> **When** 사용자가 해당 카드의 액션 버튼을 다시 클릭하면
> **Then** 버튼이 비활성 상태이므로 추가 `startSync` 호출이 발생하지 않는다 (중복 요청 방지)

### AC-06: additive 원칙 — 기존 라우트·데이터 무변경 (Epic 요구 3)

> **Given** 본 기능이 `sync-status/` 신규 디렉토리와 `tests/sync-status-*.test.js` 신규 파일로만 구성될 때
> **When** 구현이 완료되어도
> **Then** 기존 모듈(`incident-triage/`, `minesweeper/` 등)의 파일·라우트·`package.json` 기존 스크립트/의존성 항목은 단 한 줄도 변경되지 않는다

### AC-07: 롤백 경로 (Epic 요구 3)

> **Given** 본 기능이 배포된 이후 문제가 발견되었을 때
> **When** `sync-status/*`, `tests/sync-status-*.test.js`, `package.json` 에 추가된 신규 스크립트 라인(있는 경우)을 제거/revert 하면
> **Then** 기존 시스템 동작에 어떠한 부작용도 남기지 않고 이전 상태로 완전히 복귀한다 (데이터 마이그레이션·백필 불필요 — in-memory 상태만 사용했으므로)

### AC-08: 외부 API·비밀·신규 패키지 금지

> **Given** `sync-status/` 모듈이 구현되었을 때
> **When** 네트워크 탭/코드를 검사하면
> **Then** 외부 도메인으로의 HTTP 요청이 0건이고, `package.json` 에 신규 `dependencies`/`devDependencies` 가 추가되지 않았으며, 토큰/키 등 비밀 정보가 소스에 존재하지 않는다

---

## 11. 접근성 요구

- 각 저장소 카드의 상태 배지는 색상 단독으로 구분하지 않는다 — 한글 라벨(§2)을 항상 텍스트로 병기한다.
- KPI 요약 영역(`#kpi-summary`)과 카드 상태 변경 영역은 `aria-live="polite"` 로 선언해 스크린리더가 상태 갱신을 인지할 수 있게 한다.
- 액션 버튼은 네이티브 `<button>` 사용, `syncing` 중에는 `disabled` 속성으로 명확히 비활성 상태를 노출한다(스크린리더 인지 가능).
- 전체 흐름(확인→상태 확인→재시도)이 키보드(`Tab`/`Enter`/`Space`)만으로 완결 가능해야 한다.
- 배지 전경/배경 명도 대비 4.5:1 이상 (WCAG 2.1 AA) — 색상·톤 결정은 §16 디자이너 위임.

## 12. 반응형 요구

- 뷰포트 320px~480px(모바일) 구간에서 저장소 카드가 세로 스택으로 재배치되며 가로 스크롤이 발생하지 않는다.
- 481px 이상에서는 카드 그리드/리스트 레이아웃을 디자이너 재량으로 구성 가능하다.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 포함.

---

## 13. additive 원칙 · vanilla-static/file:// 제약 · 롤백 경로

### 13.1 additive 원칙 (범위 확정)

| 항목 | 허용 | 금지 |
|------|------|------|
| 신규 디렉토리/파일 추가 (`sync-status/*`, `tests/sync-status-*.test.js`) | ✅ | — |
| `package.json` 에 신규 `test:sync-status` 스크립트 라인 **추가** (기존 라인 유지) | ✅ (선택, developer 재량) | 기존 스크립트/의존성 **수정·삭제** ❌ |
| 신규 npm 패키지 설치 | ❌ | 모든 로직은 vanilla JS 로만 구현 |
| 외부 저장소 API(GitHub REST/GraphQL 등) 호출 | ❌ | 전부 fixture 시뮬레이션으로 대체 |
| 비밀 정보(토큰/키/`.env`) 사용 | ❌ | fixture 는 정적 더미 데이터만 |
| 기존 라우트/모듈 파일 수정 | ❌ | 완전 독립 신규 모듈 |

### 13.2 vanilla-static / file:// 제약

- 외부 CDN(폰트/아이콘/CSS 프레임워크) 금지, JS 프레임워크(React 등) 금지, 번들러 불필요.
- 브라우저 스크립트는 ESM `import`/`export` 대신 UMD 패턴(§6.2, `incident-triage/triage.js` 관례) 사용 — `file://` 에서 ESM CORS 차단 회피.
- `index.html` 을 `file://` 로 직접 열어도 콘솔 에러 없이 전체 흐름이 동작해야 한다.

### 13.3 UX 딜레이 (참고)

- `syncing` 표시의 체감을 위해 DOM 배선 코드에서 고정 `setTimeout` 딜레이(예: 500~800ms 범위 내 developer 재량 고정값, 난수 금지)를 두고 `resolveSync` 를 호출한다. 이 딜레이 값 자체는 KPI-1(§8.1) 측정값에 포함된다 — 즉 확인 비용은 "고정 UX 딜레이 + 함수 실행 시간"을 그대로 반영한다.

### 13.4 롤백 경로

- 본 기능은 신규 파일 추가만으로 구성되므로, 문제 발생 시 **단일 커밋 revert**(`sync-status/`, `tests/sync-status-*.test.js`, `package.json` 추가 라인)로 기존 상태 완전 복귀가 가능하다.
- in-memory 상태만 사용하므로 데이터 마이그레이션/백필이 불필요하다.

---

## 14. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|--------------|----------|-----------|
| EC-01 | 저장소의 `outcomes` 큐가 소진된 후 추가 확인 | cursor % length 로 순환 재생, 에러·랜덤 fallback 없음 |
| EC-02 | 여러 카드에서 동시에 "지금 확인" 클릭 | 각 카드가 독립된 cursor 로 동작, 서로 상태 간섭 없음 |
| EC-03 | `syncing` 중 동일 버튼 재클릭 | 버튼 `disabled` 이므로 이벤트 자체가 발생하지 않음(EC 방지는 마크업 레벨) |
| EC-04 | fixture 데이터(`fixtures.js`) 파싱/로드 실패 | 전체 저장소가 안전하게 `idle` 로 폴백, 콘솔 에러 없이 화면 내 안내 문구 표시 |
| EC-05 | `retryAttempts` 가 0인 상태에서 재시도 성공률 조회 | "데이터 없음" 표시, `0/0` 계산으로 인한 `NaN` 노출 금지 |
| EC-06 | `conflict` 상태에서 "충돌 해결" 같은 별도 액션 클릭 시도 | v1 에는 해당 버튼이 존재하지 않음 — `retry` 만 가능(§15 out of scope) |
| EC-07 | `startSync` 에 허용되지 않는 (state, trigger) 조합 전달 (개발 중 실수) | `TypeError` throw — 정상 UI 흐름에서는 버튼 노출 자체가 상태별로 제한되므로 발생하지 않음 |

---

## 15. 비범위 (Out of Scope)

v1 에서는 다음을 구현하지 않는다. 별도 스토리/Epic 에서 처리한다:

| 항목 | 이유 |
|------|------|
| 실제 외부 저장소(GitHub 등) API 연동, 인증/토큰 관리 | 외부 API·비밀 금지 제약과 상충 — 별도 Epic |
| 실시간 웹소켓/폴링 기반 자동 갱신 | v1 은 수동 트리거(확인/재시도)만 — 별도 스토리 |
| 충돌(conflict) 자동 해결/병합 로직 | 실제 VCS 연동 필요 — 별도 Epic |
| KPI 값의 영구 저장/원격 analytics 전송 | 비밀·외부 호출 금지 제약과 상충, in-memory 로 충분 — 별도 스토리 |
| 다국어(영문) 지원 | 한국어 고정 — 별도 스토리 |
| 다중 사용자 동시 접근/권한 관리 | 단일 브라우저 세션 dogfood 목적 — 범위 밖 |

---

## 16. 디자이너 위임 시각 요소

| 항목 | 가이드라인 |
|------|-----------|
| 컬러 팔레트 | 신규 CSS 변수 자체 정의. 6개 상태 배지 색상은 §11 대비 요건 충족 필수 |
| 상태 배지 비주얼(아이콘 등) | 자유, 단 한글 라벨(§2) 항상 텍스트로 병기 |
| 카드 그리드/리스트 레이아웃 | 자유, §12 반응형 범위 내 |
| `syncing` 진행 표시 애니메이션 | 자유 재량 (UX 딜레이 고정값 자체는 §13.3 developer 결정) |
| KPI 패널 초기화 안내 문구 톤 | 문구 존재는 필수(§8.3), 정확한 워딩은 디자이너/개발자 협의 |
| `data-state` 속성 규칙 | `data-state="idle|up_to_date|behind|syncing|conflict|failed"` 값 6종 고정, 구조 임의 변경 금지 |

---

*문서 종료 — [박기획] · BF-1162*

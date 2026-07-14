# Incident Severity Triage 기획 명세 — BF-800

> 작성자: [박기획] · 작성일 2026-07-14
> 관련 티켓: BF-801 (planner task), BF-800 (부모 스토리/Epic)
> 신규 모듈: `incident-triage/`
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환
> 단위 테스트: `node --test tests/incident-triage-*.test.js`

---

## 목차

1. [개요](#1-개요)
2. [Severity 판정 규칙 (Impact × Urgency Matrix)](#2-severity-판정-규칙-impact--urgency-matrix)
3. [사용자 시나리오 및 UX 흐름](#3-사용자-시나리오-및-ux-흐름)
4. [상태 모델](#4-상태-모델)
5. [파일 구조 및 모듈 경계](#5-파일-구조-및-모듈-경계)
6. [`resolveSeverity` 함수 Contract](#6-resolveseverity-함수-contract)
7. [단위 테스트 전략](#7-단위-테스트-전략)
8. [Acceptance Criteria (Given/When/Then)](#8-acceptance-criteria-givenwhenthen)
9. [접근성 요구 (Accessibility)](#9-접근성-요구-accessibility)
10. [반응형 요구](#10-반응형-요구)
11. [vanilla-static / file:// 제약](#11-vanilla-static--file-제약)
12. [Edge Case 목록](#12-edge-case-목록)
13. [비범위 (Out of Scope)](#13-비범위-out-of-scope)
14. [디자이너 위임 시각 요소](#14-디자이너-위임-시각-요소)

---

## 1. 개요

### 1.1 목적

운영자가 인시던트의 **영향도(Impact)** 와 **긴급도(Urgency)** 를 각각 3단계(높음/보통/낮음) 중 하나씩 선택하면, 결정론적 매트릭스에 따라 **심각도(Severity: P1~P4)**, **초기 대응 SLA**, **다음 행동 문구** 를 즉시 계산해 화면에 표시하는 단발성 판정 도구를 바닐라 HTML/CSS/JS 로 구현한다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 신규 경로 | `incident-triage/` (index.html / style.css / triage.js) |
| 기존 코드 영향 | 없음 — 완전 독립 모듈 |
| 저장소 사용 | 없음 — in-memory 단발 판정 (새로고침 시 초기화) |
| 외부 라이브러리 / API | 없음 — `file://` CORS 안전, 네트워크 호출 0건 |

### 1.3 전제 조건

- 브라우저 환경 (Chrome/Edge/Firefox 최신 버전), `file://` 프로토콜로 직접 열어도 100% 동작
- `incident-triage/` 디렉토리가 프로젝트 루트에 생성됨
- `tests/incident-triage-*.test.js` 파일이 `node --test` 로 실행 가능

### 1.4 용어 정의

| 용어 | 정의 |
|------|------|
| Impact (영향도) | 인시던트가 비즈니스/사용자에 미치는 피해 범위. `high`(높음) / `medium`(보통) / `low`(낮음) |
| Urgency (긴급도) | 인시던트 대응을 미룰 수 있는 시간 여유. `high`(높음) / `medium`(보통) / `low`(낮음) |
| Severity | Impact × Urgency 로 결정되는 최종 심각도 등급. `P1`(치명) ~ `P4`(낮음) |
| SLA | 심각도별 **초기 대응(initial response)** 목표 시간 |
| Next Action | 심각도가 정해졌을 때 운영자가 즉시 취해야 할 행동을 안내하는 고정 문구 |

---

## 2. Severity 판정 규칙 (Impact × Urgency Matrix)

### 2.1 매트릭스 원칙

- Impact 와 Urgency 를 **모두 선택했을 때만** Severity 가 계산된다 (부분 선택 상태에서는 계산하지 않음).
- 동일한 (impact, urgency) 조합은 **항상 동일한** (severity, SLA, nextAction) 을 반환한다 — 난수·시간·외부 상태에 의존하지 않는 순수 결정론적 매핑.
- 3×3 = 총 **9개 조합**을 아래 표에 빠짐없이 정의한다 (본 문서가 유일한 source of truth — 구현/테스트 모두 이 표를 기준으로 삼는다).

### 2.2 전체 조합표 (9/9)

| # | Impact (영향도) | Urgency (긴급도) | Severity | 초기 대응 SLA | 다음 행동 문구 (Next Action) |
|---|------------------|-------------------|----------|----------------|-------------------------------|
| 1 | high (높음) | high (높음) | **P1** | 15분 이내 | "온콜 담당자에게 즉시 에스컬레이션하고 인시던트 채널을 개설하세요." |
| 2 | high (높음) | medium (보통) | **P2** | 1시간 이내 | "1시간 이내 담당 팀에 배정하고 관리자에게 통보하세요." |
| 3 | high (높음) | low (낮음) | **P3** | 4시간 이내 | "담당 팀 큐에 등록하고 4시간 이내 첫 응답을 남기세요." |
| 4 | medium (보통) | high (높음) | **P2** | 1시간 이내 | "1시간 이내 담당 팀에 배정하고 관리자에게 통보하세요." |
| 5 | medium (보통) | medium (보통) | **P3** | 4시간 이내 | "담당 팀 큐에 등록하고 4시간 이내 첫 응답을 남기세요." |
| 6 | medium (보통) | low (낮음) | **P4** | 1영업일(24시간) 이내 | "정기 백로그에 등록하고 다음 영업일 내 검토하세요." |
| 7 | low (낮음) | high (높음) | **P3** | 4시간 이내 | "담당 팀 큐에 등록하고 4시간 이내 첫 응답을 남기세요." |
| 8 | low (낮음) | medium (보통) | **P4** | 1영업일(24시간) 이내 | "정기 백로그에 등록하고 다음 영업일 내 검토하세요." |
| 9 | low (낮음) | low (낮음) | **P4** | 1영업일(24시간) 이내 | "정기 백로그에 등록하고 다음 영업일 내 검토하세요." |

> 규칙 요약: `high+high` 만 P1. `high|medium` 조합 중 하나라도 high 이고 나머지가 medium(또는 그 반대) 이면 P2. "중간 강도" 조합(각 high+low, medium+medium, low+high) 은 P3. 나머지(medium+low, low+medium, low+low) 는 P4. — **개발자는 반드시 §6 표를 그대로 lookup table 로 구현하며, 규칙을 별도로 재해석해 조건식을 다시 유도하지 않는다** (실수 방지).

### 2.3 심각도별 표시 스타일 가이드 (디자이너 참고용, 확정 X)

| Severity | 한글 라벨 | 톤 가이드 (색상은 디자이너 재량, 대비 요건은 §9 참조) |
|----------|-----------|-------------------------------------------------------|
| P1 | 치명 (Critical) | 경고색 계열 — 가장 강한 시각적 우선순위 |
| P2 | 높음 (High) | 주의색 계열 |
| P3 | 보통 (Medium) | 중립~정보색 계열 |
| P4 | 낮음 (Low) | 저강도 중립색 계열 |

---

## 3. 사용자 시나리오 및 UX 흐름

### 3.1 정상 판정 흐름 (Happy Path)

```
[화면 로드]
  └─ 영향도 라디오 그룹(3개) + 긴급도 라디오 그룹(3개) 표시, 둘 다 미선택 → 결과 영역 숨김/비활성

[영향도 선택]
  └─ 라디오 1개 선택 → 긴급도 미선택 상태면 결과 계산 안 함 (partial 상태)

[긴급도 선택]
  └─ 라디오 1개 선택 → 영향도도 선택돼 있으면 즉시 resolveSeverity(impact, urgency) 호출
      └─ 결과 영역에 Severity 배지 + SLA + Next Action 문구 + "요약 복사" 버튼 표시 (resolved 상태)

[선택 변경]
  └─ resolved 상태에서 영향도 또는 긴급도를 다시 클릭해 값 변경
      └─ 즉시 재계산, 결과 영역 갱신 (초기화 없이 바로 새 조합 반영)

[요약 복사]
  └─ "요약 복사" 버튼 클릭 → 클립보드에 요약 텍스트 복사 → "복사됨" 상태로 일시 전환 → 일정 시간 후 원래 라벨로 복귀

[초기화]
  └─ "초기화" 버튼 클릭 → 영향도·긴급도 선택 해제, 결과 영역 숨김, idle 상태로 복귀, 첫 번째 영향도 라디오로 포커스 이동
```

### 3.2 화면 상태 전이 표

| 상태 ID | 상태명 | 조건 | 결과 영역 | 요약 복사 버튼 |
|---------|--------|------|-----------|----------------|
| `idle` | 초기 상태 | impact, urgency 모두 미선택 | 숨김 | 숨김/비활성 |
| `partial` | 일부 선택 | impact, urgency 중 하나만 선택 | 숨김 | 숨김/비활성 |
| `resolved` | 판정 완료 | impact, urgency 모두 선택 | Severity/SLA/Next Action 표시 | 활성 |
| `copied` | 복사 완료 (일시) | resolved 상태에서 복사 버튼 클릭 직후 | 표시 유지 | "복사됨" 라벨로 일시 전환 후 원상 복귀 |

---

## 4. 상태 모델

### 4.1 내부 상태 값

| 상태 필드 | 타입 | 초기값 | 설명 |
|-----------|------|--------|------|
| `impact` | `'high' \| 'medium' \| 'low' \| null` | `null` | 선택된 영향도 |
| `urgency` | `'high' \| 'medium' \| 'low' \| null` | `null` | 선택된 긴급도 |
| `result` | `{ severity, sla, nextAction } \| null` | `null` | `impact`·`urgency` 모두 non-null 일 때만 `resolveSeverity` 로 계산된 값. 하나라도 null 이면 반드시 `null` |
| `copyState` | `'idle' \| 'copied'` | `'idle'` | 요약 복사 버튼의 일시적 표시 상태 |

### 4.2 초기화 요구 (검증 가능한 문장)

- "초기화" 버튼을 클릭하면 `impact`, `urgency`, `result` 가 모두 초기값(`null`)으로 되돌아가고, 화면의 모든 라디오 선택이 해제되며, 결과 영역이 숨겨진다.
- 초기화 직후 포커스는 **영향도 그룹의 첫 번째 라디오 버튼**으로 이동한다.
- 초기화는 페이지를 새로고침하지 않고 JS 상태 리셋만으로 수행된다 (SPA 성격 유지).

### 4.3 요약 복사 요구 (검증 가능한 문장)

- `resolved` 상태에서만 "요약 복사" 버튼이 클릭 가능하다. `idle`/`partial` 상태에서는 버튼이 숨겨지거나 `disabled` 속성을 가진다.
- 클릭 시 아래 **고정 포맷**의 문자열이 클립보드에 복사된다:
  ```
  [Incident Triage] 영향도: {impact 한글} / 긴급도: {urgency 한글} → {severity} (SLA: {sla}) — {nextAction}
  ```
  예시: `[Incident Triage] 영향도: 높음 / 긴급도: 보통 → P2 (SLA: 1시간 이내) — 1시간 이내 담당 팀에 배정하고 관리자에게 통보하세요.`
- 복사 성공 시 버튼 라벨이 "복사됨" 으로 일시 변경되고, **2초 후** 원래 라벨("요약 복사")로 자동 복귀한다.
- 클립보드 API(`navigator.clipboard.writeText`) 를 우선 사용하되, 미지원/실패 환경(구형 브라우저, 일부 `file://` 컨텍스트)에서는 `document.execCommand('copy')` 기반의 숨겨진 `<textarea>` fallback 으로 동일 텍스트를 복사한다. 두 경로 모두 실패하면 에러 문구를 결과 영역 내 별도 상태 텍스트로 표시하고 예외를 throw 하지 않는다 (앱 크래시 금지).

---

## 5. 파일 구조 및 모듈 경계

### 5.1 파일 목록

```
incident-triage/
├── index.html   ← HTML 마크업 + 스크립트 로드
├── style.css    ← 시각 스타일 (designer 담당)
└── triage.js    ← 판정 로직 + DOM 인터랙션 (developer 담당)

tests/
└── incident-triage-*.test.js   ← resolveSeverity 단위 테스트 (node --test)
```

### 5.2 모듈 책임 분리

#### `index.html`

- 영향도 라디오 그룹: `<fieldset><legend>영향도</legend>` 내부에 `name="impact"` 라디오 3개 (`value="high"|"medium"|"low"`)
- 긴급도 라디오 그룹: `<fieldset><legend>긴급도</legend>` 내부에 `name="urgency"` 라디오 3개 (`value="high"|"medium"|"low"`)
- 결과 영역: `<div id="result" aria-live="polite" data-state="idle|partial|resolved">` — Severity 배지, SLA, Next Action 문구를 담는 하위 요소 포함
- "요약 복사" 버튼(`<button id="copy-btn">`), "초기화" 버튼(`<button id="reset-btn">`)
- `style.css`, `triage.js` 순서로 로드, 스크립트는 `</body>` 직전, 외부 CDN 사용 금지

#### `style.css`

- 레이아웃, 컬러 팔레트, 타이포그래피 정의 — CSS 변수(`--color-*`, `--spacing-*`) 자체 정의
- `data-state="idle|partial|resolved"` 속성을 활용한 결과 영역 표시/숨김 전환
- Severity 배지 색상은 §9 대비 요건을 충족해야 함
- 외부 폰트 CDN 금지 — system font stack 사용
- 반응형 breakpoint 는 §10 참조

#### `triage.js`

- 책임 #1: `resolveSeverity(impact, urgency)` 순수 함수 정의 (§6, 테스트를 위해 export 가능한 형태)
- 책임 #2: 라디오 선택 change 이벤트 처리 → 상태 갱신 → 결과 영역 렌더링
- 책임 #3: 요약 복사 버튼 클릭 처리 (클립보드 API + fallback)
- 책임 #4: 초기화 버튼 클릭 처리 (상태 리셋 + 포커스 이동)
- 책임 #5: 키보드 조작 지원 (§9)
- **UMD 패턴 사용** (본 리포의 `number-guess/game.js` 관례를 따름): 브라우저에서는 classic `<script src="./triage.js">` 로 로드(전역 `window.IncidentTriage` 노출, `file://` CORS 문제 없는 non-module 스크립트), Node 테스트 환경에서는 `module.exports` 로 순수 함수만 노출. `import`/`export` 구문(ESM) 은 브라우저 쪽에서 사용하지 않는다.
- `localStorage`/`fetch`/외부 API 호출 금지 (in-memory 단발 판정)

---

## 6. `resolveSeverity` 함수 Contract

### 6.1 시그니처

```javascript
/**
 * Impact × Urgency → Severity/SLA/NextAction 결정론적 판정 순수 함수
 *
 * @param {'high'|'medium'|'low'} impact
 * @param {'high'|'medium'|'low'} urgency
 * @returns {{ severity: 'P1'|'P2'|'P3'|'P4', sla: string, nextAction: string }}
 * @throws {TypeError} impact 또는 urgency 가 'high'|'medium'|'low' 가 아니면 즉시 throw
 */
function resolveSeverity(impact, urgency) { /* §2.2 표를 그대로 lookup */ }
```

### 6.2 반환 값 매핑

§2.2 "전체 조합표 (9/9)" 를 **그대로** lookup table (예: 중첩 객체 `{ high: { high: {...}, medium: {...}, low: {...} }, medium: {...}, low: {...} }`) 로 구현한다. 조건식(`if impact==='high' && urgency==='high'` 등)을 재작성하며 표와 어긋나는 규칙을 만들지 않는다.

### 6.3 전제 조건 (Preconditions)

- `impact`, `urgency` : `'high' | 'medium' | 'low'` 문자열 리터럴만 허용 — UI 라디오 값과 100% 동일 enum 사용
- UI 는 두 값이 모두 선택된 시점에만 이 함수를 호출한다 (부분 선택 시 호출하지 않음)

### 6.4 부작용 (Side Effects)

- **없음** — 순수 함수. DOM 조작·클립보드·상태 변경 없음.

### 6.5 Export 방식 (테스트 호환)

```javascript
// triage.js 상단 — UMD 패턴 (number-guess/game.js 와 동일 관례)
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트
  }
  if (root) {
    root.IncidentTriage = api; // 브라우저 전역
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function resolveSeverity(impact, urgency) { /* ... */ }
  return { resolveSeverity: resolveSeverity /*, init 등 */ };
});
```

테스트 파일에서 `const { resolveSeverity } = require('../incident-triage/triage.js')` 로 가져온다.

---

## 7. 단위 테스트 전략

### 7.1 테스트 파일 위치 및 실행

```bash
# 실행 명령 (focused scope)
node --test tests/incident-triage-*.test.js
```

### 7.2 테스트 대상

`resolveSeverity(impact, urgency)` 순수 함수만 단위 테스트한다. DOM/클립보드 인터랙션은 단위 테스트 범위에서 제외한다 (필요 시 별도 E2E 티켓에서 다룬다).

### 7.3 필수 테스트 케이스 — 9개 조합 전수 + 예외

| 케이스 ID | impact | urgency | 기대 severity | 기대 sla | 비고 |
|-----------|--------|---------|----------------|----------|------|
| TC-01 | high | high | `P1` | `'15분 이내'` | §2.2 #1 |
| TC-02 | high | medium | `P2` | `'1시간 이내'` | §2.2 #2 |
| TC-03 | high | low | `P3` | `'4시간 이내'` | §2.2 #3 |
| TC-04 | medium | high | `P2` | `'1시간 이내'` | §2.2 #4 |
| TC-05 | medium | medium | `P3` | `'4시간 이내'` | §2.2 #5 |
| TC-06 | medium | low | `P4` | `'1영업일(24시간) 이내'` | §2.2 #6 |
| TC-07 | low | high | `P3` | `'4시간 이내'` | §2.2 #7 |
| TC-08 | low | medium | `P4` | `'1영업일(24시간) 이내'` | §2.2 #8 |
| TC-09 | low | low | `P4` | `'1영업일(24시간) 이내'` | §2.2 #9 |
| TC-10 | `'invalid'` | high | throw `TypeError` | — | 잘못된 impact enum |
| TC-11 | high | `'invalid'` | throw `TypeError` | — | 잘못된 urgency enum |
| TC-12 | `undefined` | `undefined` | throw `TypeError` | — | 미선택 값으로 호출 방지 확인 |

각 케이스는 `severity`, `sla`, `nextAction` 3개 필드를 모두 `assert.deepStrictEqual` 로 검증한다 (nextAction 문구는 §2.2 표의 정확한 문자열과 일치해야 함).

### 7.4 테스트 파일 구조 (참조 템플릿)

```javascript
// tests/incident-triage-BF80X.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveSeverity } = require('../incident-triage/triage.js');

describe('resolveSeverity', () => {
  it('TC-01: high+high → P1 / 15분 이내', () => {
    const r = resolveSeverity('high', 'high');
    assert.strictEqual(r.severity, 'P1');
    assert.strictEqual(r.sla, '15분 이내');
  });
  // TC-02 ~ TC-12 동일 패턴으로 작성
  it('TC-10: 잘못된 impact 값 → TypeError', () => {
    assert.throws(() => resolveSeverity('invalid', 'high'), TypeError);
  });
});
```

---

## 8. Acceptance Criteria (Given/When/Then)

### AC-01: Severity Matrix 전 조합 결정론성

> **Given** 임의의 impact(`high`/`medium`/`low`) 와 urgency(`high`/`medium`/`low`) 조합이 주어졌을 때
> **When** `resolveSeverity(impact, urgency)` 를 호출하면
> **Then** §2.2 조합표(9/9) 와 정확히 일치하는 `{ severity, sla, nextAction }` 이 매번 동일하게 반환된다 (호출 순서·횟수와 무관)

### AC-02: 초기 상태 — 결과 영역 숨김

> **Given** 플레이어가 `incident-triage/index.html` 을 브라우저(또는 `file://`) 로 열었을 때
> **When** 페이지 로드가 완료되면
> **Then** 영향도·긴급도 라디오가 모두 미선택 상태이고, 결과 영역이 숨겨져 있으며, 요약 복사 버튼이 비활성/숨김 상태다

### AC-03: 부분 선택 — 결과 계산 안 함

> **Given** 결과 영역이 숨겨진 초기 상태일 때
> **When** 영향도 또는 긴급도 중 **하나만** 선택하면
> **Then** 결과 영역은 여전히 숨김 상태를 유지하고 `resolveSeverity` 가 호출되지 않는다

### AC-04: 완전 선택 — 즉시 판정 표시

> **Given** 영향도와 긴급도가 아직 하나씩만 선택된 상태일 때
> **When** 나머지 하나를 마저 선택해 두 값이 모두 채워지면
> **Then** 결과 영역에 §2.2 표에 정의된 Severity 배지, SLA, Next Action 문구가 즉시 표시된다

### AC-05: 선택 변경 시 재계산

> **Given** 이미 판정 결과가 표시된 `resolved` 상태일 때
> **When** 영향도 또는 긴급도 선택을 다른 값으로 바꾸면
> **Then** 초기화 없이 새 조합에 해당하는 Severity/SLA/Next Action 으로 결과 영역이 즉시 갱신된다

### AC-06: 요약 복사

> **Given** `resolved` 상태에서 결과가 표시되어 있을 때
> **When** "요약 복사" 버튼을 클릭하면
> **Then** §4.3 고정 포맷 문자열이 클립보드에 복사되고, 버튼 라벨이 "복사됨" 으로 일시 변경된 뒤 2초 후 "요약 복사" 로 자동 복귀한다

### AC-07: 초기화

> **Given** 판정 결과가 표시된 `resolved` 상태일 때
> **When** "초기화" 버튼을 클릭하면
> **Then** 영향도·긴급도 선택이 모두 해제되고, 결과 영역이 숨겨지며, 포커스가 영향도 그룹의 첫 번째 라디오로 이동한다

### AC-08: 키보드만으로 전체 조작 가능

> **Given** 마우스 없이 키보드만 사용하는 사용자일 때
> **When** `Tab`/`Shift+Tab` 으로 포커스를 이동하고 방향키로 라디오 그룹 내 값을 변경하며 `Enter`/`Space` 로 버튼을 조작하면
> **Then** 마우스 클릭과 동일하게 선택·판정·복사·초기화 전체 흐름을 완료할 수 있다 (도달 불가능한 상호작용 요소가 없다)

### AC-09: WCAG 색 대비 및 색 비의존 표시

> **Given** Severity 배지가 표시된 결과 영역일 때
> **When** 배지의 전경색/배경색 대비를 측정하면
> **Then** 일반 텍스트 기준 4.5:1 이상의 명도 대비를 만족하고, Severity 는 색상뿐 아니라 텍스트 라벨(`P1`~`P4` 및 한글명)로도 구분 가능하다

### AC-10: 반응형 레이아웃

> **Given** 뷰포트 너비가 320px ~ 480px 인 모바일 환경일 때
> **When** `incident-triage/index.html` 을 로드하면
> **Then** 라디오 그룹·결과 영역이 가로 스크롤 없이 세로로 재배치되어 모든 텍스트와 버튼이 잘리지 않고 표시된다

### AC-11: vanilla-static / file:// 호환

> **Given** 외부 CDN·프레임워크·번들러 없이 `incident-triage/` 3개 파일만 존재하는 상태일 때
> **When** `index.html` 을 `file://` 프로토콜로 직접 더블클릭해 열면
> **Then** 콘솔 에러 없이 전체 판정 흐름(선택→결과→복사→초기화)이 정상 동작한다 (네트워크 요청 0건)

---

## 9. 접근성 요구 (Accessibility)

### 9.1 키보드 조작 (검증 가능한 문장)

- 영향도/긴급도는 **네이티브 `<input type="radio">`** 로 구현하여, 브라우저 기본 동작(방향키로 그룹 내 이동, `Tab` 으로 그룹 간 이동)을 그대로 활용한다.
- 고정 Tab 순서: **영향도 그룹 → 긴급도 그룹 → 요약 복사 버튼 → 초기화 버튼**. `tabindex` 값을 임의로 지정해 이 순서를 어기지 않는다 (DOM 순서로만 제어).
- `resolved` 상태가 아닐 때 "요약 복사" 버튼은 `disabled` 속성을 가져 Tab 정지점에서 제외되지 않고(스크린리더 사용자에게 상태 인지 가능하도록) 비활성 상태로만 표시된다.
- 모든 인터랙션(선택/복사/초기화)은 `Enter` 또는 `Space` 키만으로 마우스 없이 완결 가능하다.

### 9.2 Focus 관리

- 초기화 버튼 클릭 후 포커스는 반드시 **영향도 그룹의 첫 번째 라디오**로 이동한다 (§4.2).
- 모든 포커스 가능 요소는 `:focus-visible` 기반의 시각적 포커스 링을 가진다 (디자이너가 색/두께 결정, 존재 자체는 필수).
- 결과 영역(`#result`)은 `aria-live="polite"` 로 선언되어, 두 값이 모두 선택되어 판정이 갱신될 때 스크린리더가 자동으로 새 Severity/SLA/Next Action 을 읽는다.

### 9.3 WCAG 대비 요구

- 본문 텍스트 및 Severity 배지 텍스트: 전경/배경 명도 대비 **4.5:1 이상** (WCAG 2.1 AA, 일반 텍스트 기준).
- 버튼/포커스 링 등 UI 컴포넌트 경계: **3:1 이상**.
- Severity 는 색상 단독으로 구분하지 않는다 — 배지 안에 `P1`~`P4` 텍스트 라벨과 한글명("치명"/"높음"/"보통"/"낮음")을 항상 함께 표기한다 (색맹 사용자 대응).

---

## 10. 반응형 요구

- 뷰포트 너비 **320px ~ 480px**(모바일) 구간에서 가로 스크롤 없이 모든 콘텐츠가 세로 스택으로 재배치된다.
- 뷰포트 너비 **481px 이상**(태블릿/데스크톱) 에서는 영향도/긴급도 그룹을 나란히 배치하는 등 넓은 화면 레이아웃을 디자이너 재량으로 구성할 수 있다.
- 텍스트 크기·버튼 터치 영역은 모바일에서 최소 44×44px 터치 타깃을 만족하도록 디자이너가 조정한다.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 를 `index.html` `<head>` 에 포함한다.

---

## 11. vanilla-static / file:// 제약

| 항목 | 요구 사항 |
|------|-----------|
| 외부 CDN | 금지 — 폰트/아이콘/CSS 프레임워크(Bootstrap, Tailwind CDN 등) 일체 사용 불가 |
| JS 프레임워크 | 금지 — React/Vue/Svelte 등 사용 불가, 순수 DOM API 만 사용 |
| 빌드 도구 | 금지 — Webpack/Vite 등 번들러 불필요, 파일 그대로 브라우저에서 실행 |
| 모듈 시스템 | 브라우저 스크립트는 `import`/`export`(ESM) 대신 §6.5 UMD 패턴 사용 — `file://` 에서 ESM `import` 가 CORS 로 차단되는 문제 회피 |
| 네트워크 호출 | 금지 — `fetch`/`XMLHttpRequest`/외부 API 호출 0건, 전 로직 in-memory 계산 |
| 폰트 | system font stack (`-apple-system, "Segoe UI", ...`) 만 사용, `@font-face` 외부 로드 금지 |
| 실행 방식 | `index.html` 을 `file://` 프로토콜로 더블클릭해 열어도 전체 기능이 정상 동작해야 함 (AC-11) |

---

## 12. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|--------------|----------|-----------|
| EC-01 | 영향도만 선택 후 새로고침 없이 유지 | 결과 영역 숨김 유지, `partial` 상태 |
| EC-02 | 긴급도만 선택 후 영향도 선택 | 즉시 판정 계산 및 표시 (`resolved`) |
| EC-03 | resolved 상태에서 같은 라디오를 다시 클릭 (값 변화 없음) | 결과 값 동일하게 유지, 에러 없음 |
| EC-04 | resolved 상태에서 반대쪽 그룹 값 변경 반복 | 매번 §2.2 표에 따라 정확히 재계산, 이전 결과 잔존 없음 |
| EC-05 | 클립보드 API 미지원 환경에서 "요약 복사" 클릭 | `execCommand('copy')` fallback 으로 복사 성공 처리 |
| EC-06 | 클립보드 복사 fallback 마저 실패 | 결과 영역에 복사 실패 안내 텍스트 표시, 예외로 인한 화면 크래시 없음 |
| EC-07 | 초기화 버튼을 `idle` 상태(아무 선택 없음)에서 클릭 | 상태 변화 없이 안전하게 no-op (에러 없음) |
| EC-08 | 복사 버튼을 "복사됨" 표시 중 연속 클릭 | 타이머가 재시작되어 2초 후 다시 "요약 복사" 로 복귀, 중복 텍스트 삽입 없음 |
| EC-09 | 키보드만으로 전체 흐름(선택→복사→초기화) 수행 | 마우스 없이 100% 완결 가능 (AC-08) |
| EC-10 | `resolveSeverity` 에 `undefined`/오탈자 enum 전달 (개발 중 실수) | `TypeError` throw — UI 는 라디오 value 만 전달하므로 정상 경로에서 발생하지 않음 |

---

## 13. 비범위 (Out of Scope)

v1 에서는 다음 기능을 구현하지 않는다. 별도 스토리에서 처리한다:

| 항목 | 이유 |
|------|------|
| 판정 이력 저장 (localStorage) | 저장소 의존성 — 별도 스토리 |
| 다국어(영문) 지원 | 본 매트릭스는 한국어 고정 문구로 확정 — 별도 스토리 |
| 커스텀 SLA/문구 편집 UI | 관리자 설정 기능 — 별도 스토리 |
| Impact/Urgency 4단계 이상 확장 | 매트릭스 재설계 필요 — 별도 Epic |
| 외부 티켓 시스템(Jira 등) 연동 | 외부 API 금지 제약과 상충 — 별도 Epic |
| 인쇄(print) 최적화 스타일 | UI 재량 범위 밖 — 필요 시 별도 스토리 |

---

## 14. 디자이너 위임 시각 요소

아래 항목은 기획에서 정하지 않고 디자이너에게 위임한다:

| 항목 | 가이드라인 |
|------|-----------|
| 컬러 팔레트 | 신규 CSS 변수 자체 정의. Severity 배지 색상은 §9.3 대비 요건 충족 필수 |
| Severity 배지 비주얼 | 아이콘/모양 자유, 단 텍스트 라벨(`P1`~`P4` + 한글명) 항상 병기 |
| 라디오 그룹 레이아웃 | 카드형/토글형 등 자유, 단 네이티브 `<input type="radio">` 시맨틱 유지 |
| "복사됨" 트랜지션 연출 | 애니메이션·아이콘 등 재량 (2초 타이밍은 고정) |
| 반응형 브레이크포인트 세부 값 | §10 범위 내에서 자유 조정 |
| `data-state` 속성 규칙 | `<div id="result" data-state="idle\|partial\|resolved">` 구조는 고정 |

---

*문서 종료 — [박기획] · BF-801*

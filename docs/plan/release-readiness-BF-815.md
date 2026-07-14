# Release Readiness Board 기획 명세 — BF-815

> 작성자: [박기획] · 작성일 2026-07-14
> 관련 티켓: BF-816 (planner task), BF-815 (부모 Epic)
> 신규 모듈: `release-readiness/`
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환
> 단위 테스트: `node --test tests/release-readiness-*.test.js`
>
> **파일명 안내**: 본 명세 파일명은 BF-816 수용 기준에 리터럴로 명시된 경로(`docs/plan/release-readiness-BF-815.md`, Epic 키 기준)를 그대로 따랐다 — 기존 `incident-triage-BF-800.md`(planner task BF-801) 사례와 동일한 규칙.

---

## 목차

1. [개요](#1-개요)
2. [사용자 시나리오 및 UX 흐름 (필터·토글·진행률)](#2-사용자-시나리오-및-ux-흐름-필터토글진행률)
3. [상태 모델](#3-상태-모델)
4. [진행률(Progress) 계산 규칙](#4-진행률progress-계산-규칙)
5. [Fixture 데이터 스키마](#5-fixture-데이터-스키마)
6. [샘플 Fixture 데이터 (10건)](#6-샘플-fixture-데이터-10건)
7. [파일 구조 및 모듈 경계](#7-파일-구조-및-모듈-경계)
8. [순수 함수 Contract](#8-순수-함수-contract)
9. [DOM 데이터 계약 (data-* 속성)](#9-dom-데이터-계약-data--속성)
10. [단위 테스트 전략](#10-단위-테스트-전략)
11. [Acceptance Criteria (Given/When/Then)](#11-acceptance-criteria-givenwhenthen)
12. [빈 상태 (Empty State) 정의](#12-빈-상태-empty-state-정의)
13. [접근성 요구 (Accessibility)](#13-접근성-요구-accessibility)
14. [반응형 요구](#14-반응형-요구)
15. [vanilla-static / file:// 제약](#15-vanilla-static--file-제약)
16. [Edge Case 목록](#16-edge-case-목록)
17. [비범위 (Out of Scope)](#17-비범위-out-of-scope)
18. [디자이너 위임 시각 요소](#18-디자이너-위임-시각-요소)
19. [AC ↔ 산출물 매핑 표](#19-ac--산출물-매핑-표)

---

## 1. 개요

### 1.1 목적

`/release-readiness/` 라우트에서, 릴리즈 전 체크리스트 항목(역할별 완료 여부)을 한 화면에서 확인할 수 있는 **정적 대시보드**를 바닐라 HTML/CSS/JS 로 구현한다. 운영자는 역할(role)·상태(status) 필터와 "완료 항목 숨기기" 토글로 목록을 좁혀 보고, 전체 진행률과 차단(blocked) 항목 유무로 "지금 릴리즈해도 되는가"를 즉시 판단한다. 데이터는 **정적 fixture**(코드에 내장된 배열)이며 외부 API·CDN·localStorage 를 사용하지 않는다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 신규 경로 | `release-readiness/` (index.html / style.css / fixtures.js / board.js) |
| 기존 코드 영향 | 없음 — 완전 독립 모듈, 기존 모듈과 이름 중복 없음 |
| 저장소 사용 | 없음 — fixture 는 JS 배열에 하드코딩, 새로고침해도 항상 동일 데이터 |
| 외부 라이브러리 / API / CDN | 없음 — `fetch`/`XMLHttpRequest`/외부 폰트·아이콘 CDN 사용 금지, `file://` 프로토콜로 직접 열어도 100% 동작 |

### 1.3 전제 조건

- 브라우저 환경 (Chrome/Edge/Firefox 최신 버전), `file://` 프로토콜로 직접 열어도 정상 동작
- `release-readiness/` 디렉토리가 프로젝트 루트에 생성됨
- `tests/release-readiness-*.test.js` 파일이 `node --test` 로 실행 가능
- 본 모듈은 **읽기 전용 대시보드**다 — 항목 추가/수정/삭제 UI는 v1 범위 밖(§17)

### 1.4 용어 정의

| 용어 | 정의 |
|------|------|
| Role (역할) | 체크리스트 항목의 담당 영역. `planning`(기획) / `design`(디자인) / `dev`(개발) / `qa`(QA) / `ops`(운영) 5종 |
| Status (상태) | 항목의 진행 상태. `pending`(대기) / `blocked`(차단) / `done`(완료) 3종 |
| Evidence (증빙) | 완료 근거(링크/메모) 또는 차단 사유를 담는 텍스트. 값이 없으면 빈 문자열(`""`) |
| Progress (진행률) | 전체 항목 중 `done` 비율(%). **필터/토글과 무관하게 항상 전체 fixture 기준**으로 계산 (§4.2) |
| Release Ready | `blocked` 항목이 0건이고 전 항목이 `done` 인 상태 — "지금 릴리즈해도 좋다"는 신호 |

---

## 2. 사용자 시나리오 및 UX 흐름 (필터·토글·진행률)

### 2.1 정상 조회 흐름 (Happy Path)

```
[화면 로드]
  └─ fixture 10건 전체 표시, 역할 필터="전체", 상태 필터="전체", "완료 항목 숨기기"=off
      └─ 상단에 진행률 바 + "N/M 완료 (P%)" + 차단 배지 + 릴리즈 배너 표시 (항상 전체 fixture 기준)

[역할 필터 선택]
  └─ 역할 칩("전체"/기획/디자인/개발/QA/운영) 중 하나 클릭
      └─ 목록이 해당 역할 항목만으로 즉시 좁혀짐. 진행률/배너는 변하지 않음 (§4.2)

[상태 필터 선택]
  └─ 상태 칩("전체"/대기/차단/완료) 중 하나 클릭
      └─ 목록이 해당 상태 항목만으로 즉시 좁혀짐 (역할 필터와 AND 결합, §3.3)

[완료 항목 숨기기 토글]
  └─ 토글 ON → 목록에서 status="done" 항목 제외 (역할/상태 필터와 AND 결합)
  └─ 토글 OFF → 제외 해제, 필터 조건대로 복원

[필터 결과 없음]
  └─ 위 조건 조합 결과 0건 → 빈 상태 A 표시 + "필터 초기화" 버튼 (§12.1)

[필터 초기화]
  └─ "필터 초기화" 버튼 클릭 → 역할=전체, 상태=전체, 토글=off 로 복귀, 전체 목록 재노출
```

### 2.2 필터·토글 간 관계 원칙 (구현 필수 — 재해석 금지)

- 역할 필터·상태 필터·"완료 항목 숨기기" 토글은 **서로 독립적인 상태값**이며, 목록에는 **AND(교집합)** 로 동시 적용된다.
- 세 조건 중 무엇을 조합해도(예: 상태 필터="완료" + 토글=ON → 필터 결과가 0건이 되는 조합 포함) **에러 없이** 빈 상태 A 로 안전하게 귀결된다 (§16 EC-01).
- **진행률/배너는 필터·토글의 영향을 받지 않는다** — 항상 fixture 전체 배열을 기준으로 계산한다(§4.2). 필터는 "무엇을 보여줄지"만 바꾸고, 진행률은 "실제 릴리즈 준비 상태"를 나타내야 하므로 필터로 왜곡되면 안 된다는 것이 본 화면의 핵심 설계 원칙이다.

---

## 3. 상태 모델

### 3.1 필터/토글 상태 값

| 상태 필드 | 타입 | 초기값 | 설명 |
|-----------|------|--------|------|
| `roleFilter` | `'all' \| 'planning' \| 'design' \| 'dev' \| 'qa' \| 'ops'` | `'all'` | 역할 필터 선택값 (단일 선택) |
| `statusFilter` | `'all' \| 'pending' \| 'blocked' \| 'done'` | `'all'` | 상태 필터 선택값 (단일 선택) |
| `hideDone` | `boolean` | `false` | "완료 항목 숨기기" 토글 |

### 3.2 화면 뷰 상태 (§12 빈 상태와 연결)

| 상태 ID | 조건 | 목록 영역 | 진행률/배너 |
|---------|------|-----------|-------------|
| `list` | 필터·토글 결과 1건 이상 | 항목 목록 표시 | 항상 표시 (전체 fixture 기준) |
| `empty-filtered` | fixture 는 있으나 필터·토글 결과 0건 | 빈 상태 A 문구 + 필터 초기화 버튼 | 항상 표시 (변화 없음) |
| `empty-fixture` | fixture 배열 자체가 0건 (방어적 edge, §16 EC-09) | 빈 상태 B 문구 | "표시할 진행률 없음" 문구로 대체, 배너 숨김 |

### 3.3 필터 결합 로직 (의사코드 — §8.1 `filterItems` 계약과 동일)

```
filtered = items
if roleFilter !== 'all':   filtered = filtered.filter(i => i.role === roleFilter)
if statusFilter !== 'all': filtered = filtered.filter(i => i.status === statusFilter)
if hideDone === true:      filtered = filtered.filter(i => i.status !== 'done')
```

적용 순서는 결과에 영향을 주지 않는 순수 AND 필터이므로, dev 는 위 순서를 그대로 구현하거나 동등한 다른 순서로 구현해도 무방하다 (결과 집합이 동일하면 됨).

---

## 4. 진행률(Progress) 계산 규칙

### 4.1 계산 공식 (고정 — 재해석 금지)

| 값 | 계산식 |
|----|--------|
| `total` | `items.length` |
| `done` | `items.filter(i => i.status === 'done').length` |
| `blocked` | `items.filter(i => i.status === 'blocked').length` |
| `pending` | `items.filter(i => i.status === 'pending').length` |
| `percent` | `total === 0 ? 0 : Math.round(done / total * 100)` |
| `releaseReady` | `total > 0 && blocked === 0 && done === total` |

- `percent` 는 **반올림된 정수**로 표시한다 (예: 5/10 → `50`, 소수점 표시 없음).
- `total === 0`(fixture 없음) 인 경우 `percent = 0`, `releaseReady = false` 로 정의하며, 화면에는 퍼센트 대신 §12.2 빈 상태 B 문구를 노출한다(진행률 0% 로 오인되지 않도록).

### 4.2 필터 독립성 (핵심 규칙 — §2.2 와 동일 원칙)

`calculateProgress` 는 **항상 필터링 이전의 전체 fixture 배열**을 인자로 받는다. 필터/토글이 걸린 부분집합을 넘기지 않는다 — 목록 렌더링과 진행률 계산은 서로 다른 입력을 사용하는 두 개의 독립된 파이프라인이다.

### 4.3 릴리즈 배너 규칙

| 조건 | 배너 문구 (고정 톤, 정확 문구는 디자이너 재량) | 톤 |
|------|------------------------------------------------|-----|
| `blocked > 0` | "차단 항목 {blocked}건 — 출시 보류" | 경고 |
| `blocked === 0 && releaseReady === true` | "출시 준비 완료" | 긍정 |
| `blocked === 0 && releaseReady === false` | "진행 중 ({percent}%)" | 중립 |
| `total === 0` | 배너 숨김 (§12.2) | — |

우선순위는 표 순서대로 판정한다 (`blocked > 0` 이 최우선 — 완료율이 높아도 차단 항목이 있으면 반드시 경고 배너를 노출한다).

---

## 5. Fixture 데이터 스키마

### 5.1 필드 정의

| 필드 | 타입 | 필수 | 허용 값 / 제약 | 설명 |
|------|------|------|----------------|------|
| `role` | `string` (enum) | ✅ | `'planning' \| 'design' \| 'dev' \| 'qa' \| 'ops'` | 담당 역할 |
| `title` | `string` | ✅ | 1자 이상, 공백만으로 구성 불가 | 체크리스트 항목명 (한국어) |
| `status` | `string` (enum) | ✅ | `'pending' \| 'blocked' \| 'done'` | 진행 상태 |
| `evidence` | `string` | ✅ (빈 문자열 허용) | 비어있지 않으면 URL 또는 설명 텍스트 | 완료 근거/차단 사유. 값 없으면 반드시 `""` (never `null`/`undefined`) |

> 위 4개 필드가 Epic 수용 기준(BF-815)에 명시된 스키마다. 아래 `id` 는 **AC 대상이 아닌 구현 편의 필드**로, dev 가 DOM 렌더링 키·테스트 식별자로 쓰도록 권장한다(필수 아님, 생략해도 AC 위반 아님).

| 필드 (권장, 비AC) | 타입 | 설명 |
|---------------------|------|------|
| `id` | `string` | 유니크 식별자 (예: `'rr-001'`). DOM `data-id`, `<li key>` 대용, 테스트 케이스 참조용 |

### 5.2 `evidence` 값 규칙

| status | evidence 규칙 |
|--------|----------------|
| `done` | 비어있지 않은 문자열 — 완료를 증명하는 링크 또는 확인 메모 |
| `blocked` | 비어있지 않은 문자열 — 차단 사유 (담당팀/이슈 키 등) |
| `pending` | 빈 문자열 `""` — 아직 진행 중이므로 증빙 없음이 정상 |

렌더링 시 `evidence === ""` 이면 화면에 em-dash(`—`) 플레이스홀더를 표시한다 (§13 접근성: 스크린리더용 "증빙 없음" 텍스트 병기).

### 5.3 역할/상태 한글 라벨 매핑 (고정)

```js
ROLE_LABELS   = { planning: "기획", design: "디자인", dev: "개발", qa: "QA", ops: "운영" }
STATUS_LABELS = { pending: "대기", blocked: "차단", done: "완료" }
```

필터 칩·배지 텍스트는 이 매핑을 그대로 사용한다 (문구를 별도로 재작성하지 않는다).

---

## 6. 샘플 Fixture 데이터 (10건)

수용 기준의 "최소 8건" 요구를 충족하도록 **10건**, 역할 5종 × 각 2건, 상태는 done 5 / blocked 2 / pending 3 으로 구성해 필터·진행률·배너 케이스를 모두 검증할 수 있게 했다.

| id | role | title | status | evidence |
|----|------|-------|--------|----------|
| `rr-001` | planning | 릴리즈 노트 초안 승인 | done | `"위키 릴리즈노트 v12 승인 완료 — wiki/release-notes-v12"` |
| `rr-002` | planning | 이해관계자 사인오프 | pending | `""` |
| `rr-003` | design | 신규 화면 반응형 QA 통과 | done | `"Figma 핸드오프 diff 0건 확인"` |
| `rr-004` | design | 다크모드 대비 검수 | done | `"대비 4.6:1 측정 완료 (WCAG AA 충족)"` |
| `rr-005` | dev | feature flag 기본값 off 확인 | done | `"PR #482 머지, flag=off 확인"` |
| `rr-006` | dev | DB 마이그레이션 dry-run | done | `"스테이징 dry-run 로그: migration-dryrun-0713.log"` |
| `rr-007` | qa | 회귀 테스트 스위트 전체 통과 | blocked | `"회귀 스위트 3건 실패 — BF-820 대응 중"` |
| `rr-008` | qa | 접근성(WCAG AA) 점검 | pending | `""` |
| `rr-009` | ops | 프로덕션 배포 승인 (CAB) | pending | `""` |
| `rr-010` | ops | 롤백 절차 리허설 완료 | blocked | `"롤백 스크립트 권한 이슈 — 인프라팀 대응 대기"` |

집계 결과(§4.1 검증용): `total=10`, `done=5`, `blocked=2`, `pending=3`, `percent=50`, `releaseReady=false` → §4.3 규칙에 따라 배너는 **"차단 항목 2건 — 출시 보류"**.

### 6.1 fixtures.js 코드 예시

```javascript
// release-readiness/fixtures.js — 정적 fixture 데이터 (UMD, 외부 fetch/API 없음)
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트
  }
  if (root) {
    root.ReleaseReadinessFixtures = api; // 브라우저 전역
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ROLES = ["planning", "design", "dev", "qa", "ops"];
  var STATUSES = ["pending", "blocked", "done"];
  var ROLE_LABELS = { planning: "기획", design: "디자인", dev: "개발", qa: "QA", ops: "운영" };
  var STATUS_LABELS = { pending: "대기", blocked: "차단", done: "완료" };

  var ITEMS = [
    { id: "rr-001", role: "planning", title: "릴리즈 노트 초안 승인", status: "done", evidence: "위키 릴리즈노트 v12 승인 완료 — wiki/release-notes-v12" },
    { id: "rr-002", role: "planning", title: "이해관계자 사인오프", status: "pending", evidence: "" },
    { id: "rr-003", role: "design", title: "신규 화면 반응형 QA 통과", status: "done", evidence: "Figma 핸드오프 diff 0건 확인" },
    { id: "rr-004", role: "design", title: "다크모드 대비 검수", status: "done", evidence: "대비 4.6:1 측정 완료 (WCAG AA 충족)" },
    { id: "rr-005", role: "dev", title: "feature flag 기본값 off 확인", status: "done", evidence: "PR #482 머지, flag=off 확인" },
    { id: "rr-006", role: "dev", title: "DB 마이그레이션 dry-run", status: "done", evidence: "스테이징 dry-run 로그: migration-dryrun-0713.log" },
    { id: "rr-007", role: "qa", title: "회귀 테스트 스위트 전체 통과", status: "blocked", evidence: "회귀 스위트 3건 실패 — BF-820 대응 중" },
    { id: "rr-008", role: "qa", title: "접근성(WCAG AA) 점검", status: "pending", evidence: "" },
    { id: "rr-009", role: "ops", title: "프로덕션 배포 승인 (CAB)", status: "pending", evidence: "" },
    { id: "rr-010", role: "ops", title: "롤백 절차 리허설 완료", status: "blocked", evidence: "롤백 스크립트 권한 이슈 — 인프라팀 대응 대기" }
  ];

  return { ROLES: ROLES, STATUSES: STATUSES, ROLE_LABELS: ROLE_LABELS, STATUS_LABELS: STATUS_LABELS, ITEMS: ITEMS };
});
```

---

## 7. 파일 구조 및 모듈 경계

### 7.1 파일 목록 (확정)

```
release-readiness/
├── index.html      ← HTML 마크업 + 스크립트 로드
├── style.css       ← 시각 스타일 (designer 담당)
├── fixtures.js      ← 정적 fixture 데이터 (§5, §6) — UMD, developer 담당
├── board.js         ← 필터/토글/진행률 로직 + DOM 렌더링 (§8) — UMD, developer 담당
└── package.json     ← `{ "type": "commonjs" }` (기존 incident-triage/number-guess 관례 — 루트 package.json 의 "type":"module" 을 이 디렉토리만 오버라이드, UMD 스크립트 file:// 호환)

tests/
└── release-readiness-*.test.js   ← calculateProgress/filterItems/fixture 정합성 단위 테스트 (node --test)
```

### 7.2 모듈 책임 분리

#### `index.html`
- 역할 필터 칩 그룹, 상태 필터 칩 그룹, "완료 항목 숨기기" 토글, 진행률 바 + 릴리즈 배너, 항목 목록 영역, 필터 초기화 버튼의 마크업 골격 (§9 DOM 계약 준수)
- `style.css` → `fixtures.js` → `board.js` 순서로 `</body>` 직전 로드, 외부 CDN 금지
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 포함

#### `style.css`
- 레이아웃·컬러·타이포그래피, CSS 변수 자체 정의 (기존 모듈과 접두사 충돌 없이 신규 정의 — 디자이너 재량)
- `data-view-state`, `data-status`, `data-banner-state` 등 §9 data 속성을 활용한 시각 전환
- 외부 폰트 CDN 금지, system font stack 사용, 반응형은 §14 참조

#### `fixtures.js`
- §5~§6 스키마와 샘플 데이터만 담는다. DOM 조작·이벤트 처리 없음 — 순수 데이터 모듈
- `ROLES`/`STATUSES`/`ROLE_LABELS`/`STATUS_LABELS`/`ITEMS` export

#### `board.js`
- 책임 #1: `calculateProgress(items)` 순수 함수 (§8.1)
- 책임 #2: `filterItems(items, options)` 순수 함수 (§8.2)
- 책임 #3: 역할/상태 칩 클릭, 토글 클릭 이벤트 처리 → 상태 갱신 → 목록/진행률/배너 재렌더링
- 책임 #4: 필터 초기화 버튼 처리
- 책임 #5: 빈 상태 A/B 전환 처리 (§12)
- 책임 #6: 키보드 조작 지원 (§13)
- **UMD 패턴 사용** (incident-triage/number-guess 관례): 브라우저는 `<script src="./board.js">` 로 로드(`window.ReleaseReadinessBoard` 노출), Node 테스트는 `createRequire` 로 로드해 순수 함수만 사용
- `localStorage`/`fetch`/외부 API 호출 금지

---

## 8. 순수 함수 Contract

### 8.1 `calculateProgress(items)`

```javascript
/**
 * fixture 항목 배열로부터 진행률/차단 현황을 계산하는 순수 함수
 * 반드시 필터링 이전의 전체 배열을 인자로 받는다 (§4.2)
 *
 * @param {Array<{status: 'pending'|'blocked'|'done'}>} items
 * @returns {{ total: number, done: number, blocked: number, pending: number,
 *             percent: number, releaseReady: boolean }}
 */
function calculateProgress(items) { /* §4.1 공식 그대로 구현 */ }
```

- 전제 조건: `items` 는 배열(빈 배열 허용). 배열이 아니면 빈 배열로 취급하거나 방어적으로 처리 — throw 하지 않는다 (화면 크래시 방지).
- 부작용: 없음 (DOM 조작·상태 변경 없음)

### 8.2 `filterItems(items, options)`

```javascript
/**
 * 역할/상태/완료숨김 조건으로 항목을 좁히는 순수 함수 (§3.3)
 *
 * @param {Array<object>} items
 * @param {{ role?: 'all'|'planning'|'design'|'dev'|'qa'|'ops',
 *           status?: 'all'|'pending'|'blocked'|'done',
 *           hideDone?: boolean }} options
 * @returns {Array<object>} 새 배열 (원본 items 를 변경하지 않음)
 */
function filterItems(items, options) { /* §3.3 의사코드 그대로 구현 */ }
```

- 기본값: `role='all'`, `status='all'`, `hideDone=false` (옵션 생략 시 원본과 동일한 배열 반환)
- 부작용: 없음. `items` 원본 배열을 mutate 하지 않는다 (`.filter()` 는 새 배열 반환하므로 자연히 만족).

### 8.3 Export 방식 (테스트 호환)

```javascript
// board.js 상단 — UMD 패턴 (incident-triage/triage.js 와 동일 관례)
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트
  }
  if (root) {
    root.ReleaseReadinessBoard = api; // 브라우저 전역
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", api.init);
      } else {
        api.init();
      }
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function calculateProgress(items) { /* ... */ }
  function filterItems(items, options) { /* ... */ }
  function init() { /* DOM 와이어링, dev 담당 */ }
  return { calculateProgress: calculateProgress, filterItems: filterItems, init: init };
});
```

테스트 파일에서는 루트 `package.json` 이 `"type": "module"` 이므로 `createRequire` 로 CommonJS 모듈을 로드한다 (incident-triage 테스트 관례 동일):

```javascript
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { calculateProgress, filterItems } = require("../release-readiness/board.js");
const { ITEMS } = require("../release-readiness/fixtures.js");
```

---

## 9. DOM 데이터 계약 (data-* 속성)

dev/designer/tester 가 동일한 계약으로 작업할 수 있도록 아래 구조/속성은 **고정**한다 (클래스명·시각 스타일은 디자이너 재량):

| 요소 | 속성 | 값 |
|------|------|-----|
| 보드 루트 | `<main id="board" data-view-state="...">` | `list \| empty-filtered \| empty-fixture` (§3.2) |
| 역할 필터 칩 그룹 | `<div role="group" aria-label="역할 필터">` 내부 `<button data-role-filter="...">` | `all \| planning \| design \| dev \| qa \| ops`, `aria-pressed="true\|false"` |
| 상태 필터 칩 그룹 | `<div role="group" aria-label="상태 필터">` 내부 `<button data-status-filter="...">` | `all \| pending \| blocked \| done`, `aria-pressed="true\|false"` |
| 완료 숨기기 토글 | `<button id="hide-done-toggle" role="switch" aria-checked="...">` | `true \| false` |
| 필터 초기화 버튼 | `<button id="reset-filters-btn">` | — |
| 진행률 바 | `<div id="progress-bar" role="progressbar" aria-valuenow="{percent}" aria-valuemin="0" aria-valuemax="100">` | — |
| 릴리즈 배너 | `<div id="release-banner" data-banner-state="...">` | `ready \| blocked \| in-progress \| hidden` (§4.3) |
| 항목 행 | `<tr data-id="rr-001" data-role="..." data-status="...">` (또는 동등한 `<li>`) | role/status enum 값 |

---

## 10. 단위 테스트 전략

### 10.1 테스트 파일 위치 및 실행

```bash
# 실행 명령 (focused scope)
node --test tests/release-readiness-*.test.js
```

이후 구현 task 는 본인 task 키를 붙여 `tests/release-readiness-BF8XX.test.js` 형태로 파일을 생성한다 (glob 패턴에 그대로 매칭).

### 10.2 테스트 대상

`calculateProgress`, `filterItems` 순수 함수와 `fixtures.js` 의 `ITEMS` 정합성만 단위 테스트한다. DOM 렌더링/클릭 인터랙션은 필요 시 별도 E2E 티켓에서 다룬다.

### 10.3 필수 테스트 케이스

| 케이스 ID | 대상 | 입력 | 기대 결과 |
|-----------|------|------|-----------|
| TC-01 | `calculateProgress` | §6 샘플 10건 | `{ total:10, done:5, blocked:2, pending:3, percent:50, releaseReady:false }` |
| TC-02 | `calculateProgress` | 빈 배열 `[]` | `{ total:0, done:0, blocked:0, pending:0, percent:0, releaseReady:false }` |
| TC-03 | `calculateProgress` | 전 항목 `done` 3건 | `percent:100, releaseReady:true` |
| TC-04 | `calculateProgress` | `blocked` 1건 포함, 나머지 `done` | `releaseReady:false` (blocked 존재 시 100% 이어도 false 아님 — done 전부는 아니므로 이미 false, blocked 우선순위는 §4.3 배너에서 검증) |
| TC-05 | `filterItems` | `{ role: 'qa' }` | `rr-007`, `rr-008` 2건만 반환 |
| TC-06 | `filterItems` | `{ status: 'blocked' }` | `rr-007`, `rr-010` 2건만 반환 |
| TC-07 | `filterItems` | `{ hideDone: true }` | `done` 5건 제외한 5건 반환 |
| TC-08 | `filterItems` | `{ role: 'design', status: 'done' }` | `rr-003`, `rr-004` 2건 (AND 결합) |
| TC-09 | `filterItems` | `{ status: 'done', hideDone: true }` | 빈 배열 `[]` (§16 EC-01) |
| TC-10 | `filterItems` | 옵션 생략 (`filterItems(items)`) | 원본과 동일한 10건 반환 |
| TC-11 | fixture 정합성 | `ITEMS` 전체 순회 | 모든 항목이 `role∈ROLES`, `status∈STATUSES`, `title.length>0`, `evidence` 는 string, `status==='pending' → evidence===''`, `status!=='pending' → evidence!==''` 을 만족 |
| TC-12 | fixture 최소 건수 | `ITEMS.length` | `>= 8` (수용 기준 명시치) |

### 10.4 테스트 파일 구조 (참조 템플릿)

```javascript
// tests/release-readiness-BF8XX.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const { calculateProgress, filterItems } = require("../release-readiness/board.js");
const { ITEMS, ROLES, STATUSES } = require("../release-readiness/fixtures.js");

describe("calculateProgress", () => {
  it("TC-01: 샘플 10건 기준 집계", () => {
    assert.deepStrictEqual(calculateProgress(ITEMS), {
      total: 10, done: 5, blocked: 2, pending: 3, percent: 50, releaseReady: false
    });
  });
  it("TC-02: 빈 배열", () => {
    assert.deepStrictEqual(calculateProgress([]), {
      total: 0, done: 0, blocked: 0, pending: 0, percent: 0, releaseReady: false
    });
  });
});

describe("filterItems", () => {
  it("TC-05: role=qa", () => {
    assert.strictEqual(filterItems(ITEMS, { role: "qa" }).length, 2);
  });
  it("TC-09: status=done + hideDone → 빈 배열", () => {
    assert.deepStrictEqual(filterItems(ITEMS, { status: "done", hideDone: true }), []);
  });
});

describe("fixtures 정합성", () => {
  it("TC-11/TC-12: 스키마 및 최소 건수", () => {
    assert.ok(ITEMS.length >= 8);
    for (const item of ITEMS) {
      assert.ok(ROLES.includes(item.role));
      assert.ok(STATUSES.includes(item.status));
      assert.ok(item.title.length > 0);
      assert.strictEqual(typeof item.evidence, "string");
      if (item.status === "pending") assert.strictEqual(item.evidence, "");
      else assert.notStrictEqual(item.evidence, "");
    }
  });
});
```

---

## 11. Acceptance Criteria (Given/When/Then)

### AC-01: 초기 로드 — 전체 목록 + 진행률 표시
> **Given** 운영자가 `release-readiness/index.html` 을 열었을 때
> **When** 페이지 로드가 완료되면
> **Then** fixture 10건 전체가 목록에 표시되고, 역할/상태 필터는 "전체", 토글은 off 상태이며, 진행률 바("5/10 완료, 50%")와 "차단 항목 2건 — 출시 보류" 배너가 표시된다

### AC-02: 역할 필터 적용
> **Given** 초기 로드 상태일 때
> **When** 역할 필터에서 "QA" 를 선택하면
> **Then** 목록에는 `role='qa'` 항목(`rr-007`, `rr-008`) 2건만 표시되고, 진행률/배너는 변하지 않는다

### AC-03: 상태 필터 적용
> **Given** 초기 로드 상태일 때
> **When** 상태 필터에서 "차단" 을 선택하면
> **Then** 목록에는 `status='blocked'` 항목(`rr-007`, `rr-010`) 2건만 표시된다

### AC-04: 역할 + 상태 필터 동시 적용
> **Given** 초기 로드 상태일 때
> **When** 역할 필터="디자인", 상태 필터="완료" 를 함께 선택하면
> **Then** 목록에는 두 조건을 모두 만족하는 항목(`rr-003`, `rr-004`) 2건만 표시된다

### AC-05: "완료 항목 숨기기" 토글
> **Given** 초기 로드 상태일 때
> **When** "완료 항목 숨기기" 토글을 켜면
> **Then** `status='done'` 5건이 목록에서 제외되고 5건만 남으며, 진행률/배너는 변하지 않는다

### AC-06: 필터·토글 조합 결과 0건 → 빈 상태
> **Given** 초기 로드 상태일 때
> **When** 상태 필터="완료" 를 선택한 상태에서 "완료 항목 숨기기" 토글을 켜면
> **Then** 목록 결과가 0건이 되어 빈 상태 A 문구와 "필터 초기화" 버튼이 표시되고, 에러가 발생하지 않는다

### AC-07: 필터 초기화
> **Given** 역할/상태 필터와 토글이 임의로 설정된 상태일 때
> **When** "필터 초기화" 버튼을 클릭하면
> **Then** 역할="전체", 상태="전체", 토글=off 로 복귀하고 전체 10건이 다시 표시된다

### AC-08: 진행률 계산 정확성
> **Given** fixture 10건(done 5 / blocked 2 / pending 3)이 로드된 상태일 때
> **When** `calculateProgress(ITEMS)` 를 호출하면
> **Then** `{ total:10, done:5, blocked:2, pending:3, percent:50, releaseReady:false }` 가 반환된다

### AC-09: 차단 항목 존재 시 경고 배너
> **Given** `blocked` 항목이 1건 이상 존재할 때
> **When** 화면이 렌더링되면
> **Then** `percent` 값과 무관하게 "차단 항목 {n}건 — 출시 보류" 배너가 최우선으로 표시된다 (§4.3)

### AC-10: 전 항목 완료 시 준비 완료 배너
> **Given** 모든 항목이 `done` 이고 `blocked` 가 0건인 가상 데이터셋일 때
> **When** `calculateProgress` 를 호출하면
> **Then** `releaseReady: true` 가 반환되고 화면에는 "출시 준비 완료" 배너가 표시된다

### AC-11: fixture 없음 방어 (edge)
> **Given** fixture 배열이 0건인 방어적 상황일 때
> **When** 화면이 렌더링되면
> **Then** 빈 상태 B 문구가 표시되고 진행률 바 대신 "표시할 진행률 없음" 문구가 노출되며 배너는 숨김 처리된다

### AC-12: 외부 API/CDN 미사용 — file:// 호환
> **Given** 외부 CDN·프레임워크·번들러 없이 `release-readiness/` 4개 파일만 존재하는 상태일 때
> **When** `index.html` 을 `file://` 프로토콜로 직접 열면
> **Then** 콘솔 에러 없이 필터·토글·진행률 전체 기능이 정상 동작한다 (네트워크 요청 0건)

### AC-13: 키보드만으로 전체 조작 가능
> **Given** 마우스 없이 키보드만 사용하는 운영자일 때
> **When** `Tab`으로 필터 칩·토글·초기화 버튼을 이동하며 `Enter`/`Space` 로 조작하면
> **Then** 마우스 클릭과 동일하게 필터링·토글·초기화 전체 흐름을 완료할 수 있다

---

## 12. 빈 상태 (Empty State) 정의

### 12.1 빈 상태 A — 필터/토글 결과 0건 (fixture 는 존재)

- 노출 조건: `filterItems(ITEMS, {role, status, hideDone}).length === 0` 이고 `ITEMS.length > 0`
- 문구(고정): **"선택한 조건에 해당하는 항목이 없습니다."**
- "필터 초기화" 버튼 노출 — 클릭 시 역할/상태="전체", 토글=off 로 복귀 (§11 AC-07)
- 진행률 바/배너는 그대로 유지 (전체 fixture 기준이므로 영향 없음, §4.2)

### 12.2 빈 상태 B — fixture 자체가 0건 (방어적 edge, v1 실제 발생 안 함)

- 노출 조건: `ITEMS.length === 0`
- 문구(고정): **"등록된 릴리즈 체크리스트 항목이 없습니다."**
- "필터 초기화" 버튼 **숨김** (초기화해도 의미 없으므로)
- 진행률 바 대신 **"표시할 진행률 없음"** 문구, 릴리즈 배너는 숨김 처리

두 빈 상태는 문구와 버튼 유무로 명확히 구분되며, dev 는 §3.2 `data-view-state` 값(`empty-filtered` / `empty-fixture`)으로 두 상태를 구분해 렌더링한다.

---

## 13. 접근성 요구 (Accessibility)

### 13.1 키보드 조작

- 역할/상태 필터 칩, 토글, 필터 초기화 버튼은 모두 네이티브 `<button>` 으로 구현해 `Tab`/`Enter`/`Space` 기본 동작을 그대로 활용한다.
- 고정 Tab 순서: **역할 필터 → 상태 필터 → 완료 숨기기 토글 → 필터 초기화 버튼 → 목록**. `tabindex` 임의 지정 금지 (DOM 순서로만 제어).

### 13.2 스크린리더 지원

- 목록 결과 개수 변경은 `aria-live="polite"` 영역으로 안내한다(예: "총 2건 표시").
- 진행률 바는 `role="progressbar"` + `aria-valuenow/min/max` 로 값 전달 (§9).
- 토글은 `role="switch"` + `aria-checked` 로 상태 전달.
- `evidence` 가 빈 문자열일 때 화면에는 `—` 만 표시하지 말고 `<span class="sr-only">증빙 없음</span>` 을 병기한다.

### 13.3 WCAG 대비 및 색 비의존 표시

- Status 배지(`pending`/`blocked`/`done`)는 색상 단독으로 구분하지 않는다 — 배지 안에 §5.3 한글 라벨을 항상 병기한다.
- 본문/배지 텍스트 대비 4.5:1 이상(WCAG 2.1 AA), 색상 값 자체는 디자이너 재량.

---

## 14. 반응형 요구

- 뷰포트 **320px ~ 480px**(모바일) 구간에서 가로 스크롤 없이 필터 칩·토글·목록이 세로로 재배치된다.
- 항목 목록이 `<table>` 로 구현될 경우, **≤767px** 에서는 카드형 스택으로 전환한다(라이브커머스 `lc-compare-table` 패턴과 동일 원칙 — `display:block` + `::before{content:attr(data-label)}`), **768px 이상**에서는 표 형태 유지.
- 필터 칩은 좁은 화면에서 가로 스크롤 허용(`overflow-x:auto`) 또는 줄바꿈, 세부 방식은 디자이너 재량.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 포함.

---

## 15. vanilla-static / file:// 제약

| 항목 | 요구 사항 |
|------|-----------|
| 외부 CDN | 금지 — 폰트/아이콘/CSS 프레임워크 사용 불가 |
| JS 프레임워크 | 금지 — React/Vue 등 사용 불가, 순수 DOM API 만 사용 |
| 빌드 도구 | 금지 — 번들러 불필요, 파일 그대로 브라우저에서 실행 |
| 모듈 시스템 | 브라우저 스크립트는 UMD 패턴 사용(§8.3), `release-readiness/package.json` 으로 디렉토리만 CommonJS 오버라이드(§7.1) |
| 데이터 소스 | fixture 는 `fixtures.js` 에 **정적 배열로 하드코딩** — `fetch`/`XMLHttpRequest`/외부 JSON 로드 금지 |
| 네트워크 호출 | 금지 — 0건, 전 로직 in-memory 계산 |
| 폰트 | system font stack 만 사용, `@font-face` 외부 로드 금지 |
| 실행 방식 | `index.html` 을 `file://` 로 더블클릭해 열어도 전체 기능 정상 동작 (§11 AC-12) |

---

## 16. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|--------------|----------|-----------|
| EC-01 | 상태 필터="완료" + "완료 숨기기" 토글 동시 활성 | 결과 0건 → 빈 상태 A, 에러 없음 (§11 AC-06) |
| EC-02 | 역할 필터에서 항목이 아예 없는 조합은 없음(모든 역할이 2건씩 존재) — 하지만 상태 필터와 조합 시 0건 가능(예: role=planning + status=blocked) | 빈 상태 A 정상 표시 |
| EC-03 | 필터 칩을 빠르게 연속 클릭 | 매번 최신 선택값으로 즉시 재계산, 중간 상태 잔존 없음 |
| EC-04 | 토글을 연속 on/off 클릭 | 매번 정확히 반영, `aria-checked` 값 항상 최신 상태와 일치 |
| EC-05 | 필터/토글이 걸린 상태에서 "필터 초기화" 클릭 | 3개 상태값 모두 기본값으로 복귀, 목록 10건 재노출 |
| EC-06 | `evidence` 가 빈 문자열인 pending 항목 렌더링 | `—` 플레이스홀더 + sr-only "증빙 없음" 표시, 레이아웃 깨짐 없음 |
| EC-07 | `blocked` 이 0건이고 `done` 도 전체가 아닌 상태(진행 중) | 배너 "진행 중 (P%)" 표시, 경고色 아님 |
| EC-08 | 차단 항목이 있는데 완료율이 100%에 가까운 경우(예: 9/10 done, 1 blocked) | `blocked>0` 규칙이 최우선이므로 "차단 항목 1건 — 출시 보류" 배너 (긍정 배너로 오인 금지) |
| EC-09 | fixture 배열이 0건인 방어적 상황(정상 배포에서는 발생하지 않음) | 빈 상태 B, 진행률 대신 "표시할 진행률 없음", 크래시 없음 (§12.2) |
| EC-10 | 키보드만으로 필터→토글→초기화 전체 흐름 수행 | 마우스 없이 100% 완결 가능 (§11 AC-13) |

---

## 17. 비범위 (Out of Scope)

v1 에서는 다음 기능을 구현하지 않는다. 별도 스토리에서 처리한다:

| 항목 | 이유 |
|------|------|
| 항목 추가/수정/삭제 (CRUD) | 정적 fixture 읽기 전용 대시보드 — 별도 스토리 |
| 실제 API/DB 연동 | 본 Epic 은 정적 fixture 확정이 목적 — 별도 Epic |
| 필터 상태 localStorage 저장 | 저장소 의존성 — 별도 스토리 |
| 역할/상태 다중 선택(멀티 셀렉트) 필터 | UX 복잡도 증가 — 별도 스토리, v1 은 단일 선택 |
| 항목별 상세 모달/드릴다운 | UI 복잡도 — 별도 스토리 |
| 실시간 갱신(웹소켓/폴링) | 외부 연동 필요 — 별도 Epic |
| 다국어(영문) 지원 | 한국어 고정 문구로 확정 — 별도 스토리 |
| 인쇄(print) 최적화 스타일 | 필요 시 별도 스토리 |

---

## 18. 디자이너 위임 시각 요소

아래 항목은 기획에서 정하지 않고 designer 에게 위임한다:

| 항목 | 가이드라인 |
|------|-----------|
| 컬러 팔레트 | 신규 CSS 변수 자체 정의. Status 배지·릴리즈 배너 색상은 §13.3 대비 요건 충족 필수 |
| 진행률 바 비주얼 | 형태(막대/원형 등) 자유, 단 `role="progressbar"` 시맨틱 유지 및 텍스트 라벨("N/M 완료 (P%)") 항상 병기 |
| 필터 칩 레이아웃 | pill/토글 버튼 등 자유, 단 `role="group"` + `aria-pressed` 시맨틱 유지 |
| 토글 스위치 비주얼 | 애니메이션/아이콘 자유, 단 `role="switch"` + `aria-checked` 유지 |
| 목록 레이아웃 (`table` vs 카드) | 데스크톱은 표, 모바일은 카드 스택 전환(§14) — 세부 스타일 자유 |
| 릴리즈 배너 톤/아이콘 | §4.3 3가지 상태(ready/blocked/in-progress)의 색상·아이콘은 재량, 문구 톤은 유지 |
| 빈 상태 일러스트/아이콘 | 자유, 단 §12 고정 문구는 유지 |
| `data-*` 속성 규칙 | §9 표의 요소/속성/값 구조는 고정 |

---

## 19. AC ↔ 산출물 매핑 표

| # | Epic(BF-815) 수용 기준 | 충족 섹션 |
|---|---------------------------|-----------|
| AC-1 | 화면 요구·상태(pending/blocked/done)·진행률 계산 규칙·빈 상태 정의가 본 문서에 명시 | §2(시나리오) · §3(상태 모델) · §4(진행률 계산) · §12(빈 상태) |
| AC-2 | role/title/status/evidence 필드 스키마 + 샘플 데이터(최소 8건) + 외부 API·CDN 미사용 명시 | §5(스키마) · §6(샘플 10건) · §15(vanilla-static 제약) |
| AC-3 | 신규 module 이름 `release-readiness` 확정, 파일 배치 확정 | §1.2, §7.1 (`release-readiness/index.html` 등) |

---

*문서 종료 — [박기획] · BF-816*

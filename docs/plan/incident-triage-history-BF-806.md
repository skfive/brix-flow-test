# Incident Handoff Timeline (`/incident-triage/history/`) 기획 명세 — BF-806

> 작성자: [박기획] · 작성일 2026-07-14
> 관련 티켓: BF-807 (planner task) · BF-806 (부모 스토리/Epic)
> 신규 모듈: `incident-triage/history/` (기존 `incident-triage/` 하위 신규 페이지 — 기존 3개 파일은 읽기 전용 참조만)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환
> 단위 테스트: `node --test tests/incident-triage-history-*.test.js`

---

## 목차

1. [개요](#1-개요)
2. [5단계 인계(Handoff) 파이프라인 정의](#2-5단계-인계handoff-파이프라인-정의)
3. [사용자 시나리오 및 UX 흐름](#3-사용자-시나리오-및-ux-흐름)
4. [Fixture 데이터 스키마](#4-fixture-데이터-스키마)
5. [파일 구조 및 모듈 경계](#5-파일-구조-및-모듈-경계)
6. [Pure 함수 Contract](#6-pure-함수-contract)
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

`incident-triage/` 모듈 하위에 **읽기 전용 이력 조회 페이지** `history/`를 신규 추가한다. 이 페이지는 인시던트 한 건이 **5단계 인계 파이프라인**(기획 → 디자인 → 개발 → 리뷰 → 테스트, 즉 본 brix-Flow 가 실제로 운용하는 5개 페르소나 순서와 동일)을 거치는 동안 각 단계에서 **누가·언제·어떤 상태로·어떤 Jira 티켓/PR 로** 작업했는지를 정적 fixture 데이터로 타임라인 형태로 보여준다. 백엔드·API·로컬스토리지 없이 화면에 내장된 배열만으로 렌더링하는 **순수 조회(read-only) 도구**다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 신규 경로 | `incident-triage/history/` (index.html / style.css / history.js / fixtures.js) |
| 기존 코드 영향 | **없음** — `incident-triage/index.html`, `incident-triage/style.css`, `incident-triage/triage.js` 는 **읽기 전용 참조만** 한다. 본 작업/후속 designer·developer·tester 작업 모두 이 3개 파일을 **1바이트도 수정하지 않는다** |
| 기존 파일과의 연결 | `history/index.html` 에서 기존 `../index.html`(심각도 판정 도구)로 향하는 **단방향 링크**만 추가 가능 (기존 파일 쪽에서 `history/`로의 역링크는 본 스토리 범위 밖 — 기존 파일 미변경 원칙 위반이므로 금지) |
| 저장소 사용 | 없음 — fixture 배열은 JS 파일에 하드코딩된 상수, 새로고침해도 항상 동일한 데이터 |
| 외부 라이브러리 / API / 네트워크 호출 | 없음 — Jira 이슈 키·GitHub PR 링크는 **정적 텍스트/앵커(`<a href>`)일 뿐**이며 fetch 로 실제 Jira/GitHub 를 조회하지 않는다 (§11 참조) |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전), `file://` 프로토콜로 직접 열어도 100% 동작
- `incident-triage/history/` 디렉토리가 `incident-triage/` 하위에 신규 생성됨
- `tests/incident-triage-history-*.test.js` 파일이 `node --test` 로 실행 가능
- 본 문서는 **BF-806 Epic 의 유일한 source of truth** — designer(시안)·developer(구현)·tester(검증) 모두 본 문서의 §2·§4·§6·§8 표를 그대로 따르며 재해석하지 않는다

### 1.4 용어 정의

| 용어 | 정의 |
|------|------|
| 인시던트(Incident) | 이력 조회 대상이 되는 하나의 작업 단위. 본 페이지에서는 fixture 배열의 최상위 레코드 1건 |
| 단계(Stage) | 인시던트가 거치는 5개 역할 중 하나에서 수행된 작업 한 건. 인시던트 1건은 항상 **정확히 5개**의 Stage 레코드를 가진다 |
| 역할(Role) | Stage 를 수행하는 담당 페르소나. `planner`/`designer`/`developer`/`reviewer`/`tester` 5종 고정 (§2.1) |
| 인계(Handoff) | 한 Stage 가 완료되어 다음 Stage 로 작업이 넘어가는 것. 본 페이지는 인계 **결과의 스냅샷**만 보여주며 실시간 이벤트 스트림이 아니다 |
| 담당자 표시명 | Stage 를 수행한 사람(페르소나)의 한글 표시 이름. 예: "박기획" — 본 리포의 Jira 코멘트 prefix `[표시명]` 관례와 동일 형식 |
| 종합 상태(Overall Status) | 인시던트 1건의 5개 Stage 상태를 종합해 파생되는 단일 상태값. fixture 에 저장되지 않고 **화면에서 계산**한다 (§2.3, §6.1) |

---

## 2. 5단계 인계(Handoff) 파이프라인 정의

### 2.1 역할(Role) 순서 및 한글 라벨

인시던트의 5개 Stage 는 **항상 아래 고정 순서**로 존재한다 (배열 순서 재정렬 금지 — 순서 자체가 파이프라인 의미):

| # | `role` 값 | 한글 라벨 | 담당자 표시명 예시 (fixture 고정값) |
|---|-----------|-----------|--------------------------------------|
| 1 | `planner` | 기획 | 박기획 |
| 2 | `designer` | 디자인 | 이디자인 |
| 3 | `developer` | 개발 | 김개발 |
| 4 | `reviewer` | 리뷰 | 최리뷰 |
| 5 | `tester` | 테스트 | 정테스트 |

> 이 표의 담당자 표시명은 본 리포의 실제 페르소나 코멘트 prefix(`[박기획]`, `[이디자인]` 등)와 **의도적으로 동일**하게 맞춘다 — fixture 를 보는 사람이 "이 도구가 무엇을 흉내 내는지" 바로 인지하도록 하는 것이 UX 목표다 (§3.1).

### 2.2 상태(Status) enum 및 표시 규칙

각 Stage 레코드는 아래 4개 상태 중 하나를 가진다:

| `status` 값 | 한글 라벨 | 의미 | 뒤 단계(들)에 대한 제약 |
|-------------|-----------|------|--------------------------|
| `not_started` | 대기 | 아직 이 단계에 도달하지 않음 | — |
| `in_progress` | 진행중 | 현재 이 단계를 작업 중 | 이 단계보다 **뒤 순서**의 모든 Stage 는 반드시 `not_started` |
| `blocked` | 차단 | 이 단계가 막혀 있음 (예: reviewer 의 반려로 developer 단계가 재작업 대기) | 이 단계보다 **뒤 순서**의 모든 Stage 는 반드시 `not_started` |
| `done` | 완료 | 이 단계 완료 | — (뒤 단계는 `not_started`/`in_progress`/`blocked`/`done` 무엇이든 가능) |

> 즉 "완료(`done`)된 단계들이 앞쪽에 연속으로 있고, 그 다음 하나가 `in_progress` 또는 `blocked`, 그 뒤는 전부 `not_started`"가 **유일하게 유효한 형태**다. 임의로 중간을 건너뛴 `done`(예: planner=not_started 인데 designer=done)은 fixture 오류로 간주한다 (§6.3 유효성 검증).

### 2.3 인시던트 종합 상태 파생 규칙

fixture 에는 종합 상태를 저장하지 않는다 — 화면(및 단위 테스트)에서 5개 Stage 로부터 **결정론적으로 계산**한다. 첫 번째로 매칭되는 규칙을 적용한다 (순서 중요):

| 우선순위 | 조건 | 종합 상태 |
|----------|------|-----------|
| 1 | Stage 중 하나 이상이 `blocked` | `blocked` |
| 2 | 5개 Stage 전부 `done` | `done` |
| 3 | 5개 Stage 전부 `not_started` | `not_started` |
| 4 | 그 외 (위 3개 조건에 해당하지 않는 모든 혼재 상태) | `in_progress` |

이 규칙은 §6.1 `deriveIncidentStatus` 순수 함수의 계약이다.

---

## 3. 사용자 시나리오 및 UX 흐름

### 3.1 정상 열람 흐름 (Happy Path)

```
[화면 로드]
  └─ fixtures.js 의 인시던트 배열을 fixture 순서 그대로(재정렬 없음) 카드 목록으로 렌더링
      └─ 카드마다: 인시던트 제목 + 종합 상태 배지(§2.3) + 5단계 타임라인(세로 나열, §2.1 순서 고정)

[타임라인 확인]
  └─ 각 Stage 행에서 한 눈에: 역할 라벨 · 상태 배지 · 담당자 표시명 · 완료 시각(또는 "-") 확인

[Jira 이슈로 이동]
  └─ Stage 행의 Jira 이슈 키 클릭 → 새 탭에서 Jira 이슈 URL 오픈 (정적 링크, fetch 없음)

[GitHub PR로 이동]
  └─ Stage 행의 PR 링크 클릭 → 새 탭에서 GitHub PR URL 오픈 (정적 링크, fetch 없음)
      └─ reviewer 단계의 PR 링크는 developer 단계와 **동일 URL** (신규 PR 생성 없이 기존 PR에 코멘트만 남기는 실제 리뷰어 동작을 반영, §4.3 EC)

[기존 심각도 판정 도구로 이동]
  └─ 페이지 상단/하단의 "← 심각도 판정 도구로 돌아가기" 링크 클릭 → ../index.html 로 이동 (기존 파일은 변경하지 않음, §1.2)
```

이 페이지는 입력·상태 변경·복사·초기화 등 **인터랙션이 없는 순수 조회 화면**이다 — BF-800 severity 판정 도구와 달리 폼도, `resolved`/`idle` 같은 상태 전이도 없다 (Simplicity First: 요구된 건 "조회"뿐).

### 3.2 화면 구성 요소 상태 표

| 요소 | 표시 조건 | 내용 |
|------|-----------|------|
| 인시던트 카드 목록 | fixture 배열 길이 ≥ 1 | 카드 N개, fixture 순서대로 |
| 빈 상태 안내 | fixture 배열 길이 = 0 | "표시할 인시던트 이력이 없습니다." 안내 문구 (EC-09) |
| Stage 행의 Jira 링크 | `jiraIssueKey !== null` | `<a>` 앵커, 텍스트 = 이슈 키(예: `BF-903`) |
| Stage 행의 Jira 텍스트(링크 아님) | `jiraIssueKey === null` (= `not_started`) | `-` |
| Stage 행의 PR 링크 | `prUrl !== null` | `<a>` 앵커, 텍스트 = "PR 보기" 또는 PR 번호 |
| Stage 행의 PR 텍스트(링크 아님) | `prUrl === null` | `-` |
| 완료 시각 | `completedAt !== null` | `formatCompletedAt()` 결과 (§6.2) |
| 완료 시각 placeholder | `completedAt === null` | `-` |

### 3.3 기존 `/incident-triage/` 와의 탐색 관계

- `history/index.html` → `../index.html` **단방향 링크만** 허용
- 기존 `index.html`/`triage.js`/`style.css` 는 이 스토리에서 **참조(읽기)만** 하며, history 페이지로의 진입 링크 추가를 포함해 **어떤 수정도 하지 않는다** (AC-10, §1.2)

---

## 4. Fixture 데이터 스키마

### 4.1 인시던트 레코드 스키마

```javascript
{
  id: "INC-1042",          // fixture 전용 표시 ID (Jira 키 아님, 임의 문자열)
  title: "결제 승인 API 5xx 급증",
  epicKey: "BF-900",       // 이 인시던트를 다룬 상위 Jira Epic 키
  stages: [ /* §4.2 StageRecord 정확히 5개, §2.1 role 순서 고정 */ ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | Y | 카드 표시/구분용 내부 ID |
| `title` | string | Y | 인시던트 제목 |
| `epicKey` | string (`/^BF-\d+$/`) | Y | 상위 Jira Epic 키 |
| `stages` | `StageRecord[]` (길이 정확히 5) | Y | §4.2, §2.1 순서 고정 |

### 4.2 Stage 레코드 스키마 (핵심 — 6개 필수 필드)

> BF-807 설명에 명시된 "역할·상태·담당자 표시명·완료 시각·Jira 이슈 키·GitHub PR 링크" 6개 필드가 이 표다. 개발자는 fixture 작성 시 이 표를 **그대로** 따른다.

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `role` | enum: `'planner'\|'designer'\|'developer'\|'reviewer'\|'tester'` | Y | 담당 역할 (§2.1) | `"developer"` |
| `status` | enum: `'not_started'\|'in_progress'\|'blocked'\|'done'` | Y | 단계 상태 (§2.2) | `"done"` |
| `assigneeName` | string \| `null` | Y | 담당자 표시명(한글). `not_started` 면 `null` | `"김개발"` |
| `completedAt` | string(ISO 8601, 오프셋 포함) \| `null` | Y | 완료 시각. `status !== 'done'` 이면 반드시 `null` | `"2026-07-10T14:32:00+09:00"` |
| `jiraIssueKey` | string (`/^BF-\d+$/`) \| `null` | Y | 이 단계의 Jira 이슈 키. `not_started` 면 `null` | `"BF-903"` |
| `prUrl` | string(URL) \| `null` | Y | GitHub PR 링크. `not_started` 면 `null`, `done` 이면 필수(non-null) | `"https://github.com/org/repo/pull/142"` |

### 4.3 필드 null 허용 규칙 (status 별)

| `status` | `assigneeName` | `completedAt` | `jiraIssueKey` | `prUrl` |
|----------|-----------------|----------------|------------------|-----------|
| `not_started` | `null` (필수) | `null` (필수) | `null` (필수) | `null` (필수) |
| `in_progress` | 문자열 (필수) | `null` (필수) | 문자열 (필수) | `null` 허용 (PR 생성 전일 수 있음) |
| `blocked` | 문자열 (필수) | `null` (필수) | 문자열 (필수) | `null` 허용 |
| `done` | 문자열 (필수) | 문자열 (필수) | 문자열 (필수) | 문자열 (필수 — non-null) |

> **reviewer 단계 특이 규칙**: `role === 'reviewer'` 이고 `prUrl !== null` 이면, 그 값은 반드시 `developer` Stage 의 `prUrl` 과 **동일**해야 한다. reviewer 는 자신의 PR을 새로 만들지 않고 developer 의 PR 에 코멘트만 남기는 것이 본 리포의 실제 협업 규약이기 때문이다(§3.1, §12 EC-04).

### 4.4 예시 fixture (3건 — done / in_progress / blocked 대표 케이스)

```javascript
// incident-triage/history/fixtures.js 예시 (개발자 구현 시 그대로 확장 가능)
var INCIDENT_HISTORY = [
  {
    id: "INC-1001",
    title: "결제 승인 API 5xx 급증",
    epicKey: "BF-900",
    stages: [
      { role: "planner",   status: "done", assigneeName: "박기획", completedAt: "2026-07-08T09:10:00+09:00", jiraIssueKey: "BF-901", prUrl: "https://github.com/brix-flow/repo/pull/201" },
      { role: "designer",  status: "done", assigneeName: "이디자인", completedAt: "2026-07-08T15:40:00+09:00", jiraIssueKey: "BF-902", prUrl: "https://github.com/brix-flow/repo/pull/202" },
      { role: "developer", status: "done", assigneeName: "김개발", completedAt: "2026-07-09T11:05:00+09:00", jiraIssueKey: "BF-903", prUrl: "https://github.com/brix-flow/repo/pull/203" },
      { role: "reviewer",  status: "done", assigneeName: "최리뷰", completedAt: "2026-07-09T13:20:00+09:00", jiraIssueKey: "BF-903", prUrl: "https://github.com/brix-flow/repo/pull/203" },
      { role: "tester",    status: "done", assigneeName: "정테스트", completedAt: "2026-07-10T10:00:00+09:00", jiraIssueKey: "BF-905", prUrl: "https://github.com/brix-flow/repo/pull/205" }
    ]
  },
  {
    id: "INC-1002",
    title: "정적 자산 CDN 응답 지연",
    epicKey: "BF-920",
    stages: [
      { role: "planner",   status: "done",        assigneeName: "박기획", completedAt: "2026-07-11T09:00:00+09:00", jiraIssueKey: "BF-921", prUrl: "https://github.com/brix-flow/repo/pull/221" },
      { role: "designer",  status: "done",        assigneeName: "이디자인", completedAt: "2026-07-11T14:30:00+09:00", jiraIssueKey: "BF-922", prUrl: "https://github.com/brix-flow/repo/pull/222" },
      { role: "developer", status: "in_progress", assigneeName: "김개발", completedAt: null, jiraIssueKey: "BF-923", prUrl: null },
      { role: "reviewer",  status: "not_started", assigneeName: null,    completedAt: null, jiraIssueKey: null,     prUrl: null },
      { role: "tester",    status: "not_started", assigneeName: null,    completedAt: null, jiraIssueKey: null,     prUrl: null }
    ]
  },
  {
    id: "INC-1003",
    title: "인증 토큰 만료 오탐",
    epicKey: "BF-930",
    stages: [
      { role: "planner",   status: "done",    assigneeName: "박기획", completedAt: "2026-07-12T09:00:00+09:00", jiraIssueKey: "BF-931", prUrl: "https://github.com/brix-flow/repo/pull/231" },
      { role: "designer",  status: "done",    assigneeName: "이디자인", completedAt: "2026-07-12T13:10:00+09:00", jiraIssueKey: "BF-932", prUrl: "https://github.com/brix-flow/repo/pull/232" },
      { role: "developer", status: "blocked", assigneeName: "김개발", completedAt: null, jiraIssueKey: "BF-933", prUrl: "https://github.com/brix-flow/repo/pull/233" },
      { role: "reviewer",  status: "not_started", assigneeName: null, completedAt: null, jiraIssueKey: null,     prUrl: null },
      { role: "tester",    status: "not_started", assigneeName: null, completedAt: null, jiraIssueKey: null,     prUrl: null }
    ]
  }
];
```

> `INC-1003` 은 developer 단계가 `blocked`(예: reviewer 의 CHANGES_REQUESTED 로 재작업 대기)인 케이스 — §2.3 규칙에 따라 이 인시던트의 종합 상태는 `blocked` 다.

---

## 5. 파일 구조 및 모듈 경계

### 5.1 파일 목록

```
incident-triage/
├── index.html    ← 기존 (읽기 전용 참조 — 절대 수정 금지)
├── style.css     ← 기존 (읽기 전용 참조 — 절대 수정 금지)
├── triage.js     ← 기존 (읽기 전용 참조 — 절대 수정 금지)
├── package.json  ← 기존 (읽기 전용 참조 — 절대 수정 금지)
└── history/                    ← 신규 디렉토리
    ├── index.html   ← 신규 — 페이지 마크업
    ├── style.css    ← 신규 — 독립 스타일 (designer 담당)
    ├── history.js   ← 신규 — pure 함수 + DOM 렌더링 (developer 담당)
    └── fixtures.js  ← 신규 — 정적 fixture 데이터 상수 (developer 담당)

tests/
└── incident-triage-history-*.test.js   ← history.js 의 pure 함수 단위 테스트 (node --test)
```

### 5.2 모듈 책임 분리

#### `history/index.html`

- `<link rel="stylesheet" href="./style.css">`
- 스크립트 로드 순서 고정: `<script src="./fixtures.js"></script>` → `<script src="./history.js"></script>` (`</body>` 직전, 둘 다 non-module classic script — `file://` CORS 회피, 기존 `triage.js` 관례와 동일)
- 인시던트 카드 목록을 담을 컨테이너 1개(`<main id="history-list">` 등) — 초기 마크업은 비어 있어도 되며 `history.js` 의 `init()` 이 fixture 로부터 채운다
- `../index.html` 로 향하는 단방향 링크 1개 (§3.3)

#### `history/style.css`

- 신규 CSS 변수(`--ith-*` 프리픽스 제안 — 기존 `incident-triage/style.css` 의 `--it-*` 와 겹치지 않도록 구분) 자체 정의, 다른 모듈과 공유 없음
- 상태 배지(§2.2) 색상은 §9 대비 요건 충족 필수, 색상 단독으로 상태 구분하지 않음(코드/한글 라벨 병기)
- 외부 폰트 CDN 금지, system font stack
- 반응형 breakpoint 는 §10 참조

#### `history/fixtures.js`

- 책임: §4.4 형태의 `INCIDENT_HISTORY` 배열 **1개만** 정의하고 export (UMD, §6.3)
- DOM 접근·렌더링 로직 없음 — 순수 데이터 상수 모듈
- 배열 순서가 곧 화면 표시 순서 (런타임 재정렬 없음 — Simplicity First)

#### `history/history.js`

- 책임 #1: `deriveIncidentStatus(stages)` 순수 함수 (§6.1)
- 책임 #2: `formatCompletedAt(isoString)` 순수 함수 (§6.2)
- 책임 #3: `init()` — `fixtures.js` 의 `INCIDENT_HISTORY` 를 읽어 카드 목록 DOM 렌더링 (상태 변경 없는 1회성 렌더 — 이벤트 리스너 불필요)
- **UMD 패턴** (기존 `triage.js` 관례 계승): 브라우저에서는 `window.IncidentHistory` 전역 노출, Node 테스트 환경에서는 `module.exports` 로 pure 함수만 노출
- `localStorage`/`fetch`/외부 API 호출 금지

### 5.3 보존 영역 재천명

> **BF-806/BF-807~ 이후 모든 후속 작업(디자이너/개발자/리뷰어/테스터)은 `incident-triage/index.html`, `incident-triage/style.css`, `incident-triage/triage.js`, `incident-triage/package.json` 4개 파일을 어떤 이유로도 수정하지 않는다.** 필요한 참조는 읽기만 하고, 신규 기능은 전부 `incident-triage/history/` 하위 신규 파일로만 구현한다. 이 4개 파일에 대한 diff 가 하나라도 존재하면 본 스토리의 범위 위반이다.

---

## 6. Pure 함수 Contract

### 6.1 `deriveIncidentStatus(stages)`

```javascript
/**
 * 5개 Stage 배열로부터 인시던트 종합 상태를 결정론적으로 파생한다 (§2.3 규칙 그대로 구현).
 *
 * @param {Array<{role: string, status: string}>} stages - 정확히 5개, §2.1 role 순서 고정
 * @returns {'not_started'|'in_progress'|'blocked'|'done'}
 * @throws {TypeError} stages 가 배열이 아니거나 길이가 5가 아니면 즉시 throw
 * @throws {TypeError} role 구성이 §2.1 순서(planner,designer,developer,reviewer,tester)와 다르면 throw
 * @throws {TypeError} status 값이 §2.2 4종 enum 이 아니면 throw
 */
function deriveIncidentStatus(stages) { /* §2.3 우선순위 표를 그대로 구현 — 순서 재해석 금지 */ }
```

- 부작용 없음(순수 함수), DOM 접근 없음
- §2.3 표의 규칙 순서(①blocked 존재 → blocked, ②전부 done → done, ③전부 not_started → not_started, ④그 외 → in_progress)를 조건문으로 그대로 옮긴다

### 6.2 `formatCompletedAt(isoString)`

```javascript
/**
 * ISO 8601 완료 시각 문자열을 "YYYY-MM-DD HH:mm" 형태로 표시용 변환한다.
 * 타임머신 이슈(테스트 환경 타임존 차이) 방지를 위해 `new Date()` 로 파싱/재변환하지 않고
 * 정규식으로 문자열 그대로를 잘라 사용한다 (입력 문자열의 오프셋을 신뢰하고 별도 변환 없음).
 *
 * @param {string|null} isoString - null 이면 미완료 상태
 * @returns {string} isoString 이 null 이면 '-', 아니면 "YYYY-MM-DD HH:mm"
 * @throws {TypeError} null 이 아닌데 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/ 패턴에 맞지 않으면 throw
 */
function formatCompletedAt(isoString) { /* 정규식 매칭 후 substring, Date 객체 미사용 */ }
```

> **개발자 주의**: `new Date(isoString).toLocaleString()` 류의 구현은 테스트 실행 머신의 타임존에 따라 결과가 달라져 단위 테스트가 비결정적이 된다. 반드시 정규식/문자열 슬라이싱만으로 구현한다.

### 6.3 Export 방식 (테스트 호환) — 기존 `triage.js` UMD 관례 계승

```javascript
// history/history.js 상단 — UMD 패턴 (기존 incident-triage/triage.js 와 동일 관례)
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트
  }
  if (root) {
    root.IncidentHistory = api; // 브라우저 전역
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
  function deriveIncidentStatus(stages) { /* ... */ }
  function formatCompletedAt(isoString) { /* ... */ }
  function init() { /* ... */ }
  return { deriveIncidentStatus: deriveIncidentStatus, formatCompletedAt: formatCompletedAt, init: init };
});
```

`fixtures.js` 도 동일 UMD 패턴으로 `INCIDENT_HISTORY` 배열을 export 한다 (`module.exports = { INCIDENT_HISTORY: INCIDENT_HISTORY }` / `root.IncidentHistoryFixtures = { ... }`). 테스트 파일에서는 `const { INCIDENT_HISTORY } = require('../incident-triage/history/fixtures.js')` 로 실제 fixture 스키마 적합성도 함께 검증할 수 있다.

---

## 7. 단위 테스트 전략

### 7.1 실행 명령

```bash
# focused scope
node --test tests/incident-triage-history-*.test.js
```

### 7.2 테스트 대상 및 필수 케이스

`deriveIncidentStatus`/`formatCompletedAt` pure 함수만 단위 테스트한다. DOM 렌더링은 단위 테스트 범위에서 제외(필요 시 별도 E2E 티켓, 기존 BF-805 관례와 동일).

| 케이스 ID | 대상 함수 | 입력 | 기대 출력 |
|-----------|-----------|------|-----------|
| TC-01 | `deriveIncidentStatus` | 5개 모두 `done` | `'done'` |
| TC-02 | `deriveIncidentStatus` | 5개 모두 `not_started` | `'not_started'` |
| TC-03 | `deriveIncidentStatus` | planner~designer `done`, developer `in_progress`, 나머지 `not_started` | `'in_progress'` |
| TC-04 | `deriveIncidentStatus` | 어느 하나라도 `blocked` 포함(나머지 done 섞여도) | `'blocked'` |
| TC-05 | `deriveIncidentStatus` | 길이 4 또는 6인 배열 | throw `TypeError` |
| TC-06 | `deriveIncidentStatus` | role 순서가 §2.1 과 다름 | throw `TypeError` |
| TC-07 | `deriveIncidentStatus` | status 에 정의되지 않은 값(`"done!"` 등) | throw `TypeError` |
| TC-08 | `formatCompletedAt` | `"2026-07-10T14:32:00+09:00"` | `"2026-07-10 14:32"` |
| TC-09 | `formatCompletedAt` | `null` | `"-"` |
| TC-10 | `formatCompletedAt` | `"invalid-date"` | throw `TypeError` |
| TC-11 | (선택) fixture 적합성 | `INCIDENT_HISTORY` 각 인시던트의 `stages.length === 5` 및 role 순서 | 전부 통과 |

---

## 8. Acceptance Criteria (Given/When/Then)

### AC-01: 인시던트 카드 목록 렌더링

> **Given** `fixtures.js` 에 N건(N≥1)의 인시던트가 정의되어 있을 때
> **When** `history/index.html` 을 로드하면
> **Then** fixture 배열 순서 그대로 N개의 인시던트 카드가 렌더링되고, 카드마다 정확히 5개의 Stage 행이 §2.1 순서(기획→디자인→개발→리뷰→테스트)로 표시된다

### AC-02: Stage 행 6개 필드 표시

> **Given** 하나의 Stage 레코드가 주어졌을 때
> **When** 해당 Stage 행을 렌더링하면
> **Then** 역할 한글 라벨, 상태 배지(한글 라벨 포함), 담당자 표시명(또는 `-`), 완료 시각(포맷됨 또는 `-`), Jira 이슈 키(링크 또는 `-`), GitHub PR 링크(링크 또는 `-`) 6개 항목이 모두 표시된다

### AC-03: 종합 상태 배지 파생

> **Given** 인시던트의 5개 Stage 상태 조합이 주어졌을 때
> **When** 카드 상단 종합 상태 배지를 렌더링하면
> **Then** §2.3 규칙에 따라 `deriveIncidentStatus` 가 계산한 값과 정확히 일치하는 배지가 표시된다

### AC-04: 미도달 단계 필드 null 처리

> **Given** Stage 의 `status === 'not_started'` 일 때
> **When** 해당 Stage 행을 렌더링하면
> **Then** 담당자·완료 시각·Jira 링크·PR 링크가 모두 `-` 로 표시되고 클릭 가능한 빈 앵커(`href` 없는 `<a>`)가 생성되지 않는다

### AC-05: Jira/PR 링크 정상 동작

> **Given** Stage 의 `jiraIssueKey`/`prUrl` 이 non-null 일 때
> **When** 사용자가 해당 링크를 클릭하면
> **Then** `<a href="...">` 로 새 탭(`target="_blank" rel="noopener"`)에 해당 URL 이 열리며, fetch/XHR 등 네트워크 호출은 발생하지 않는다(정적 앵커일 뿐)

### AC-06: reviewer 단계 PR 링크 일치

> **Given** 인시던트의 developer Stage 가 `prUrl` 을 가지고 있을 때
> **When** 같은 인시던트의 reviewer Stage 도 `prUrl` 이 non-null 이면
> **Then** 두 URL 은 정확히 동일하다 (§4.3)

### AC-07: 빈 목록 처리

> **Given** `INCIDENT_HISTORY` 배열이 빈 배열일 때
> **When** `history/index.html` 을 로드하면
> **Then** "표시할 인시던트 이력이 없습니다." 안내 문구가 표시되고 콘솔 에러가 발생하지 않는다

### AC-08: 기존 심각도 판정 도구로의 탐색

> **Given** history 페이지가 로드된 상태일 때
> **When** "심각도 판정 도구로 돌아가기" 링크를 클릭하면
> **Then** `../index.html`(기존 SPA, 미변경)로 정상 이동한다

### AC-09: 반응형 레이아웃

> **Given** 뷰포트 너비가 320px ~ 480px 인 모바일 환경일 때
> **When** `history/index.html` 을 로드하면
> **Then** 인시던트 카드와 Stage 행이 가로 스크롤 없이 세로로 재배치되어 모든 텍스트·링크가 잘리지 않고 표시된다(§10)

### AC-10: 기존 파일 보존 (범위 제약)

> **Given** `incident-triage/index.html`·`incident-triage/style.css`·`incident-triage/triage.js`·`incident-triage/package.json` 4개 파일이 존재할 때
> **When** 본 스토리(BF-806 Epic 산하 모든 후속 작업)를 완료하면
> **Then** 이 4개 파일에는 어떠한 diff 도 존재하지 않으며, 신규 기능은 전부 `incident-triage/history/` 하위 신규 파일로만 추가되어 있다

### AC-11: vanilla-static / file:// 호환

> **Given** 외부 CDN·프레임워크·번들러 없이 `incident-triage/history/` 4개 파일(및 참조용 기존 3개 파일)만 존재하는 상태일 때
> **When** `history/index.html` 을 `file://` 프로토콜로 직접 더블클릭해 열면
> **Then** 콘솔 에러 없이 전체 카드 목록과 링크가 정상 표시된다(네트워크 요청 0건, §11)

---

## 9. 접근성 요구 (Accessibility)

- 인시던트 카드 목록은 시맨틱 리스트 구조(`<ul>`/`<li>` 또는 `<section>` 반복) 로 마크업 — 스크린리더가 카드 개수·구분을 인지할 수 있게 한다
- Stage 행의 역할/상태/담당자/시각/Jira/PR 6개 항목은 각각 명확한 텍스트 라벨과 함께 노출(아이콘만으로 의미 전달 금지)
- 상태(§2.2)는 색상 단독으로 구분하지 않는다 — 배지 안에 한글 라벨(완료/진행중/차단/대기)을 항상 함께 표기 (색맹 사용자 대응, 기존 BF-800 §9.3 관례 계승)
- Jira/PR 링크는 네이티브 `<a href>` 로 구현 — `Tab` 으로 순차 접근·`Enter` 로 오픈 가능, 새 탭에서 열림을 인지할 수 있도록 링크 텍스트 또는 `aria-label` 에 명시(예: "BF-903 Jira 이슈 (새 탭)")
- 모든 포커스 가능 요소(`<a>`)에 `:focus-visible` 기반 시각적 포커스 링 (디자이너가 색/두께 결정, 존재 자체는 필수)
- 본 페이지는 상태 변경이 없는 정적 콘텐츠이므로 `aria-live` 는 불필요(BF-800 §9.2 의 `aria-live="polite"` 요구는 이 페이지에는 적용되지 않음 — 판정 갱신 같은 동적 갱신이 없기 때문)

---

## 10. 반응형 요구

- 뷰포트 너비 **320px ~ 480px**(모바일) 구간에서 가로 스크롤 없이 카드·Stage 행이 세로 스택으로 재배치된다
- 뷰포트 너비 **481px 이상**(태블릿/데스크톱)에서는 Stage 행을 표 형태(역할|상태|담당자|시각|Jira|PR 컬럼)로 넓게 배치하는 등 디자이너 재량으로 구성 가능
- 긴 PR URL 텍스트("PR 보기" 등 짧은 라벨을 링크 텍스트로 사용 권장)로 인한 가로 넘침 방지 — 링크 텍스트는 URL 원문이 아닌 짧은 라벨 사용을 권장(§14 디자이너 재량)
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 를 `history/index.html` `<head>` 에 포함

---

## 11. vanilla-static / file:// 제약

| 항목 | 요구 사항 |
|------|-----------|
| 외부 CDN | 금지 |
| JS 프레임워크 | 금지 — 순수 DOM API 만 사용 |
| 빌드 도구 | 금지 |
| 모듈 시스템 | ESM `import`/`export` 대신 §6.3 UMD 패턴 사용 |
| 네트워크 호출 | `fetch`/`XMLHttpRequest`/실제 Jira·GitHub API 조회 **금지** — Jira 이슈 키·PR 링크는 정적 `<a href>` 텍스트/URL일 뿐이며 실시간 상태를 조회하지 않는다 (fixture 에 미리 박제된 값을 그대로 표시) |
| 폰트 | system font stack 만 사용 |
| 실행 방식 | `history/index.html` 을 `file://` 로 직접 열어도 전체 기능 정상 동작 (AC-11) |

---

## 12. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|---------------|----------|-----------|
| EC-01 | 5개 Stage 전부 `done` | 종합 상태 배지 = `done`(완료) |
| EC-02 | 진행 중인 인시던트 — developer 까지만 진행, 이후 `not_started` | 종합 상태 = `in_progress`, 미도달 단계는 필드 전부 `-` |
| EC-03 | 한 Stage 가 `blocked` (뒤 단계는 `not_started`) | 종합 상태 = `blocked` 최우선 적용(§2.3 규칙 1) |
| EC-04 | reviewer 단계의 `prUrl` | developer 단계와 **동일 URL** — 신규 PR 아님을 fixture 로 명시 (§4.3) |
| EC-05 | `not_started` 단계의 담당자/시각/링크 필드 | 전부 `null` → 화면에 `-` 로 통일 표시, 빈 `<a>` 생성 금지 |
| EC-06 | fixture 자체의 스키마 오류(예: `done` 인데 `completedAt: null`) | **런타임 방어 코드는 두지 않는다** — fixture 정합성은 §7 단위 테스트로만 보증한다(과도한 방어 로직 지양, Simplicity First). 오류 fixture 는 테스트 실패로 조기 발견 |
| EC-07 | `INCIDENT_HISTORY` 배열이 빈 배열 | "표시할 인시던트 이력이 없습니다." 안내 문구, 에러 없음 (AC-07) |
| EC-08 | 모바일 좁은 화면에서 긴 Jira/PR 텍스트 | `word-break`/짧은 링크 라벨로 가로 스크롤 방지 (§10) |
| EC-09 | `completedAt` 문자열에 초 단위가 없는 경우(`"2026-07-10T14:32+09:00"`) | `formatCompletedAt` 정규식은 `:ss` 를 선택적으로 처리 — 여전히 `"2026-07-10 14:32"` 반환 |
| EC-10 | 기존 `/incident-triage/` 페이지에서 이 history 페이지로 오는 링크가 없음 | 의도된 설계(§1.2) — 기존 파일 미변경 원칙 때문이며 버그 아님. 진입은 URL 직접 접근으로 가정 |

---

## 13. 비범위 (Out of Scope)

v1 에서는 다음 기능을 구현하지 않는다. 별도 스토리에서 처리한다:

| 항목 | 이유 |
|------|------|
| Jira/GitHub 실시간 상태 조회(API 연동) | 외부 API 금지 제약과 상충 — 별도 Epic, vanilla-static 위반 |
| 인시던트 검색/필터/정렬 UI | 요구되지 않은 기능 — 별도 스토리 (Simplicity First) |
| 인시던트 상세 페이지(단건 딥링크) | 카드 목록 1페이지로 충분 — 별도 스토리 |
| 기존 `/incident-triage/` 로부터의 진입 링크 추가 | 기존 파일 미변경 원칙 위반 — 별도 스토리에서 기존 모듈 자체를 다룰 때 검토 |
| 실시간 업데이트(폴링/웹소켓) | 정적 fixture 스냅샷 조회 도구로 충분 — 별도 Epic |
| 다국어(영문) 지원 | 한국어 고정 — 별도 스토리 |
| 인쇄(print) 최적화 스타일 | 필요 시 별도 스토리 |

---

## 14. 디자이너 위임 시각 요소

아래 항목은 기획에서 정하지 않고 디자이너에게 위임한다:

| 항목 | 가이드라인 |
|------|-----------|
| 컬러 팔레트 | 신규 CSS 변수(`--ith-*`) 자체 정의. 상태 배지 색상은 §9 대비 요건 충족 필수 |
| 카드/타임라인 비주얼 | 세로 리스트/타임라인 라인 등 자유, 단 §2.1 role 5단계 순서와 §4.2 6개 필드 노출은 고정 |
| 상태 배지 비주얼 | 아이콘/모양 자유, 단 한글 라벨(완료/진행중/차단/대기) 항상 병기 |
| Jira/PR 링크 텍스트 라벨 | "BF-903" / "PR 보기" 등 짧은 라벨 자유 선택 (URL 원문 노출 강제 아님) |
| 반응형 브레이크포인트 세부 값 | §10 범위 내에서 자유 조정 |
| 종합 상태 배지 ↔ Stage 상태 배지 시각 구분 | 카드 상단 배지(종합)와 Stage 행 배지(개별)를 시각적으로 구분할 것(예: 크기·위치) — 구체적 스타일은 재량 |

---

*문서 종료 — [박기획] · BF-807*

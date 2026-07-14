# Incident Command Center 기획 명세 — BF-821

> 작성자: [박기획] · 작성일 2026-07-14
> 관련 티켓: BF-822 (planner task) · BF-821 (부모 Epic)
> 신규 모듈: `incident-command/` (라우트 `/incident-command/`)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환
> 단위 테스트: `node --test tests/incident-command-*.test.js`
>
> **파일명 안내**: 본 명세 파일명은 BF-822 수용 기준에 리터럴로 명시된 경로(`docs/plan/incident-command-BF-821.md`, Epic 키 기준)를 그대로 따랐다 — 기존 `release-readiness-BF-815.md`(planner task BF-816) 사례와 동일한 규칙.
> **모듈명 확정**: `incident-command` — 기존 모듈(`incident-triage/`, `incident-triage/history/`, `release-readiness/` 등) 과 이름 중복 없음, 라우트 `/incident-command/` 와 폴더명이 1:1 일치(본 리포의 "최상위 디렉토리 = 라우트" 관례).

---

## 목차

1. [개요](#1-개요)
2. [사용자 시나리오 및 UX 흐름](#2-사용자-시나리오-및-ux-흐름)
3. [상태 모델](#3-상태-모델)
4. [Severity / Status Enum 정의](#4-severity--status-enum-정의)
5. [Fixture 데이터 스키마](#5-fixture-데이터-스키마)
6. [샘플 Fixture 데이터 (6건)](#6-샘플-fixture-데이터-6건)
7. [Recovery Checklist 진행률 계산 규칙](#7-recovery-checklist-진행률-계산-규칙)
8. [파일 구조 및 모듈 경계](#8-파일-구조-및-모듈-경계)
9. [순수 함수 Contract](#9-순수-함수-contract)
10. [DOM 데이터 계약 (data-* 속성)](#10-dom-데이터-계약-data--속성)
11. [단위 테스트 전략](#11-단위-테스트-전략)
12. [Acceptance Criteria (Given/When/Then)](#12-acceptance-criteria-givenwhenthen)
13. [Empty · Loading · Error 상태 정의](#13-empty--loading--error-상태-정의)
14. [접근성 요구 (Accessibility)](#14-접근성-요구-accessibility)
15. [반응형 요구](#15-반응형-요구)
16. [vanilla-static / file:// 제약](#16-vanilla-static--file-제약)
17. [Edge Case 목록](#17-edge-case-목록)
18. [비범위 (Out of Scope)](#18-비범위-out-of-scope)
19. [디자이너 위임 시각 요소](#19-디자이너-위임-시각-요소)
20. [AC ↔ 산출물 매핑 표](#20-ac--산출물-매핑-표)

---

## 1. 개요

### 1.1 목적

`/incident-command/` 라우트에서, 운영자가 **진행 중인 장애(Incident) 목록을 한눈에 파악**하고, 개별 장애를 선택해 **심각도(Severity)·담당자(Owner)·대응 타임라인(Timeline)·복구 체크리스트(Recovery Checklist)** 를 확인하며 체크리스트 항목을 직접 체크해 나가는 **목록+상세(Master-Detail) 정적 대시보드**를 바닐라 HTML/CSS/JS 로 구현한다. 데이터는 **정적 fixture**(코드에 내장된 배열)이며, 외부 API·CDN·서버·localStorage 를 사용하지 않는 **완전 결정론적(deterministic)** 화면이다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 신규 경로 | `incident-command/` (index.html / style.css / fixtures.js / command.js / package.json) |
| 기존 코드 영향 | **없음** — 완전 독립 신규 모듈. `incident-triage/`, `incident-triage/history/`, `release-readiness/` 등 기존/예정 모듈의 파일은 1바이트도 수정하지 않는다 |
| 저장소 사용 | 없음 — fixture 는 JS 배열에 하드코딩, 체크리스트 토글은 **탭 세션 in-memory 상태**로만 유지(새로고침 시 fixture 원본 상태로 초기화) |
| 외부 라이브러리 / API / CDN | 없음 — `fetch`/`XMLHttpRequest`/외부 폰트·아이콘 CDN 사용 금지, `file://` 프로토콜로 직접 열어도 100% 동작 |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전), `file://` 프로토콜로 직접 열어도 정상 동작
- `incident-command/` 디렉토리가 프로젝트 루트에 신규 생성됨(기존 디렉토리와 이름 중복 없음, §1.2)
- `tests/incident-command-*.test.js` 파일이 `node --test` 로 실행 가능
- 본 문서는 **BF-821 Epic 의 유일한 source of truth** — designer(시안)·developer(구현)·tester(검증) 모두 본 문서의 §4·§5·§7·§9·§13 표를 그대로 따르며 재해석하지 않는다

### 1.4 용어 정의

| 용어 | 정의 |
|------|------|
| Incident (장애) | 목록의 최상위 레코드 1건. 하나의 장애 대응 케이스를 나타낸다 |
| Severity (심각도) | 장애의 비즈니스 영향 등급. `P1`(치명) ~ `P4`(낮음) — 기존 `incident-triage`(BF-800) 판정 도구와 **동일 어휘** 사용(§4.1, 일관성 유지) |
| Status (진행 상태) | 장애 대응 라이프사이클 단계. `detected`(감지됨) ~ `resolved`(해결됨) 5단계(§4.2) |
| Owner (담당자) | 현재 이 장애의 대응을 책임지는 사람과 소속 팀 |
| Timeline (타임라인) | 장애 발생부터 현재까지의 대응 이력을 시간순으로 기록한 이벤트 목록(읽기 전용) |
| Recovery Checklist (복구 체크리스트) | 장애를 완전히 해소하기 위해 수행해야 할 조치 항목 목록. 운영자가 화면에서 직접 체크(토글) 가능 |
| 선택된 장애 (Selected Incident) | 상세 패널에 표시 중인 장애 1건. 목록에서 행을 클릭해 변경 |

---

## 2. 사용자 시나리오 및 UX 흐름

### 2.1 정상 조회 흐름 (Happy Path)

```
[화면 로드]
  └─ fixture 6건을 심각도 내림차순(P1→P4, fixture 배열 순서 그대로, §6)으로 목록에 표시
      └─ 목록 각 행: 심각도 배지 + 제목 + 상태 배지 + 담당자(이름·팀) + 최근 업데이트 시각
      └─ 상세 패널에는 목록의 첫 번째 장애(fixture[0])가 기본 선택되어 표시됨

[장애 선택]
  └─ 목록에서 다른 행 클릭(또는 Enter/Space)
      └─ 상세 패널이 즉시 갱신: 헤더(제목·심각도·상태·담당자·감지/업데이트 시각) + 타임라인 + 복구 체크리스트

[타임라인 확인]
  └─ 상세 패널의 타임라인은 fixture 순서(=시간순) 그대로 세로 나열, 각 이벤트: 시각·행위자·이벤트 유형·설명 표시(읽기 전용, 클릭 인터랙션 없음)

[심각도 필터]
  └─ 목록 상단 심각도 필터 칩("전체"/P1/P2/P3/P4) 중 하나 클릭
      └─ 목록이 해당 심각도 항목만으로 즉시 좁혀짐
      └─ 필터링으로 현재 선택된 장애가 목록에서 사라지면(§3.3 규칙) 상세 패널은 "선택된 장애 없음" 안내로 전환

[복구 체크리스트 항목 체크]
  └─ 상세 패널의 체크리스트 항목 checkbox 클릭
      └─ 해당 항목의 done 이 즉시 토글(체크/해제), 진행률 바("N/M 완료 (P%)")가 즉시 재계산
      └─ 이 변경은 **탭 세션 in-memory 상태**로만 유지 — 새로고침하면 fixture 원본 상태로 복귀(영속 저장 없음, §1.2)

[체크리스트 없는 장애 조회]
  └─ 선택된 장애의 checklist 가 빈 배열이면 진행률 바 대신 "해당 장애에 등록된 복구 체크리스트가 없습니다." 안내 표시(§7.3)
```

이 화면은 **목록 열람 + 체크리스트 토글**만 지원하는 조회 중심 도구다 — 장애 생성/수정/삭제, 실시간 갱신, 알림 발송 등은 v1 범위 밖(§18).

### 2.2 화면 구성 요소 상태 표

| 요소 | 표시 조건 | 내용 |
|------|-----------|------|
| 장애 목록 | `data-view-state="ready"` | fixture(필터 적용) 순서대로 N개 행 |
| 목록 필터 결과 없음 | 심각도 필터 결과 0건 | "해당 심각도의 장애가 없습니다." 안내 + "필터 초기화" 버튼 |
| 상세 패널 (선택됨) | `selectedIncidentId !== null` 이고 필터링 후에도 목록에 존재 | 헤더 + 타임라인 + 체크리스트 |
| 상세 패널 (미선택) | `selectedIncidentId === null` 또는 필터링으로 선택된 장애가 목록에서 사라짐 | "왼쪽 목록에서 장애를 선택하세요." 안내 |
| 체크리스트 진행률 바 | `checklist.length > 0` | `role="progressbar"` + "N/M 완료 (P%)" |
| 체크리스트 없음 안내 | `checklist.length === 0` | "해당 장애에 등록된 복구 체크리스트가 없습니다." (진행률 바 대신) |

### 2.3 심각도 필터와 선택 상태의 관계 (구현 필수 — 재해석 금지)

- 심각도 필터는 **목록에만** 적용된다. 상세 패널은 필터와 무관하게 `selectedIncidentId` 가 가리키는 장애를 계속 표시한다 — **단, 필터링 결과 목록에 해당 장애가 더 이상 없으면** 상세 패널은 "미선택" 상태로 전환한다(§2.2). 목록에 없는 장애를 상세에 계속 표시하면 "지금 화면에 보이지 않는 장애를 조작하는" 혼란을 주기 때문이다.
- 필터를 다시 "전체"로 되돌리면 직전에 선택했던 장애가 자동 재선택되지 **않는다** — `selectedIncidentId` 는 필터가 그 장애를 목록에서 제외한 순간 이미 `null` 로 리셋되었으므로, 필터 해제 후에는 다시 fixture[0](필터 적용 후 첫 번째 항목)이 기본 선택된다(§9.2 `selectDefaultIncident` 계약과 동일 규칙 — Simplicity First, "직전 선택 기억" 같은 부가 상태를 추가하지 않는다).

---

## 3. 상태 모델

### 3.1 화면 최상위 상태

| 상태 필드 | 타입 | 초기값 | 설명 |
|-----------|------|--------|------|
| `viewState` | `'loading' \| 'empty' \| 'error' \| 'ready'` | `'loading'` | 화면 최상위 렌더 단계(§13) |
| `severityFilter` | `'all' \| 'P1' \| 'P2' \| 'P3' \| 'P4'` | `'all'` | 목록 심각도 필터(단일 선택) |
| `selectedIncidentId` | `string \| null` | 로드 직후 필터 적용된 목록의 첫 번째 `id` (목록이 비어 있으면 `null`) | 상세 패널에 표시할 장애 |
| `checklistState` | `Map<incidentId, Map<checklistItemId, boolean>>` (세션 in-memory) | fixture 원본 `done` 값 그대로 | 체크리스트 토글 결과. 새로고침 시 소멸(§1.2) |

### 3.2 상태 전이 규칙

- `severityFilter` 변경 시: 새 필터로 목록 재계산 → 현재 `selectedIncidentId` 가 새 목록에 있으면 유지, 없으면 새 목록의 첫 항목으로 재선택(목록이 0건이면 `null`, §2.3)
- 목록 행 클릭 시: `selectedIncidentId` 를 클릭한 행의 `id` 로 변경(필터와 무관하게 항상 클릭 가능 — 클릭된 행은 이미 현재 필터를 통과했으므로 검증 불필요)
- 체크리스트 checkbox 클릭 시: 오직 `checklistState` 만 갱신(§9.3 `toggleChecklistItem`), `viewState`/`severityFilter`/`selectedIncidentId` 는 변경되지 않음

### 3.3 초기화 없음 (명시적 비범위)

본 화면은 BF-800 severity 판정 도구와 달리 "초기화" 버튼을 두지 않는다 — 체크리스트 토글은 새로고침이 곧 초기화 동작이며, 목록 필터는 "전체" 칩 클릭으로 충분히 되돌릴 수 있어 별도 리셋 버튼이 요구되지 않는다(Simplicity First).

---

## 4. Severity / Status Enum 정의

### 4.1 Severity (심각도) — 기존 `incident-triage`(BF-800) 어휘 재사용

| `severity` 값 | 한글 라벨 | 설명 |
|----------------|-----------|------|
| `P1` | 치명 | 즉시 전사 대응이 필요한 최고 심각도 |
| `P2` | 높음 | 신속한 담당 팀 대응 필요 |
| `P3` | 보통 | 정상 대응 큐에서 처리 |
| `P4` | 낮음 | 낮은 우선순위, 정기 처리 |

> **일관성 결정**: 본 Epic 은 BF-800 의 Impact×Urgency 판정 결과(P1~P4)를 **소비하는 화면**이라는 설정이다. 판정 로직(§BF-800 `resolveSeverity`)을 다시 구현하지 않으며, Incident Command Center 의 fixture 는 이미 심각도가 확정된 상태로 시작한다(§5.1 `severity` 필드는 고정값, 계산값 아님).

### 4.2 Status (진행 상태) — 5단계 대응 라이프사이클

| `status` 값 | 한글 라벨 | 의미 |
|-------------|-----------|------|
| `detected` | 감지됨 | 모니터링 시스템 또는 사용자 신고로 최초 인지됨, 아직 담당자 조사 전/직후 |
| `investigating` | 조사중 | 원인 파악 진행 중 |
| `mitigating` | 조치중 | 원인 파악 후 완화 조치 실행 중 |
| `monitoring` | 모니터링 | 조치 적용 후 재발 여부 관찰 중 |
| `resolved` | 해결됨 | 완전 종결 |

### 4.3 Timeline 이벤트 유형(`eventType`)

| `eventType` 값 | 한글 라벨 | 사용 시점 |
|-----------------|-----------|-----------|
| `detected` | 감지 | 타임라인의 **항상 첫 번째** 이벤트(§5.3 검증 규칙) |
| `update` | 진행 갱신 | 조사/조치 진행 상황 기록(자유 발생 횟수) |
| `escalated` | 에스컬레이션 | 심각도 상향 또는 추가 담당자 투입 등 대응 강도 상승 |
| `resolved` | 해결 | 타임라인의 **항상 마지막이자 유일**한 종결 이벤트. `status==='resolved'` 인 장애에만 존재(§5.3) |

---

## 5. Fixture 데이터 스키마

### 5.1 Incident 레코드 스키마

```javascript
{
  id: "INC-3001",              // 표시/식별용 내부 ID (Jira 키 아님)
  title: "결제 게이트웨이 타임아웃 급증",
  severity: "P1",              // §4.1 enum, 고정값(계산 아님)
  status: "investigating",     // §4.2 enum
  owner: { name: "김온콜", team: "Payments" },  // §5.2
  detectedAt: "2026-07-14T02:10:00+09:00",       // ISO 8601, +09:00 오프셋 고정
  updatedAt: "2026-07-14T02:45:00+09:00",        // ISO 8601, detectedAt 이상(사전순 비교 유효, §5.4)
  timeline: [ /* §5.3 TimelineEvent[], 길이 ≥ 1 */ ],
  checklist: [ /* §5.4 ChecklistItem[], 길이 ≥ 0 */ ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | `string` (`/^INC-\d+$/`) | ✅ | 목록/상세 식별 키 |
| `title` | `string` (1자 이상, 공백만 불가) | ✅ | 장애 제목 |
| `severity` | enum `'P1'\|'P2'\|'P3'\|'P4'` | ✅ | §4.1 |
| `status` | enum `'detected'\|'investigating'\|'mitigating'\|'monitoring'\|'resolved'` | ✅ | §4.2 |
| `owner` | `{ name: string, team: string }` (둘 다 1자 이상) | ✅ | 현재 담당자 |
| `detectedAt` | `string` (ISO 8601, `+09:00` 오프셋 고정) | ✅ | 최초 감지 시각 |
| `updatedAt` | `string` (ISO 8601, `+09:00` 오프셋 고정) | ✅ | 최근 갱신 시각. `updatedAt >= detectedAt` (사전순 비교, §5.5) |
| `timeline` | `TimelineEvent[]` (길이 ≥ 1) | ✅ | §5.3 |
| `checklist` | `ChecklistItem[]` (길이 ≥ 0, **빈 배열 허용**) | ✅ | §5.4 |

### 5.2 Owner 스키마

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | `string` (1자 이상) | ✅ | 담당자 표시 이름 |
| `team` | `string` (1자 이상) | ✅ | 소속 팀 |

### 5.3 TimelineEvent 스키마

```javascript
{
  timestamp: "2026-07-14T02:10:00+09:00",  // ISO 8601, +09:00 오프셋 고정
  actor: "모니터링 시스템",                  // 자동 감지 이벤트는 시스템명, 이후는 담당자 이름
  eventType: "detected",                    // §4.3 enum
  note: "결제 승인 API 5xx 비율 12% 초과 — 자동 알림 발생"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `timestamp` | `string` (ISO 8601, `+09:00` 오프셋 고정) | ✅ | 이벤트 발생 시각 |
| `actor` | `string` (1자 이상) | ✅ | 이벤트를 발생시킨 주체(사람 이름 또는 시스템명) |
| `eventType` | enum §4.3 | ✅ | 이벤트 유형 |
| `note` | `string` (1자 이상) | ✅ | 이벤트 설명 |

**검증 규칙(§9.1 `validateIncidentRecord` 가 그대로 구현):**

1. `timeline[0].eventType === 'detected'` — 항상 첫 이벤트는 감지
2. `status === 'resolved'` ⟺ `timeline[timeline.length - 1].eventType === 'resolved'` (양방향 — resolved 상태면 반드시 마지막 이벤트가 resolved, 그 반대도 성립)
3. `eventType === 'resolved'` 인 이벤트는 **timeline 내 정확히 0개 또는 1개**이며, 있다면 반드시 마지막 원소
4. `timeline` 의 `timestamp` 는 **비내림차순**(각 원소가 직전 원소 이상, 사전순 비교) — 역행 금지

### 5.4 ChecklistItem 스키마

```javascript
{
  id: "chk-3001-1",
  text: "결제 게이트웨이 사이드카 재시작",
  done: false,
  completedAt: null   // done=true 일 때만 non-null ISO 8601 문자열
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | `string` (1자 이상, 장애 내에서 유니크) | ✅ | 체크박스 식별 키 |
| `text` | `string` (1자 이상) | ✅ | 조치 항목 설명 |
| `done` | `boolean` | ✅ | 완료 여부(fixture 초기값 — 화면 로드 시 `checklistState` 초기값으로 그대로 사용, §3.1) |
| `completedAt` | `string \| null` (ISO 8601, `+09:00` 오프셋 고정) | ✅ | `done===true` 면 non-null 필수, `done===false` 면 반드시 `null` |

### 5.5 오프셋 고정 및 비교 규칙 (구현 필수)

모든 timestamp(`detectedAt`/`updatedAt`/`timeline[].timestamp`/`checklist[].completedAt`)는 **`+09:00` 오프셋으로 고정된 `YYYY-MM-DDTHH:mm:ss+09:00` 포맷 문자열**이다. `new Date()` 로 파싱해 재비교하지 않고 **문자열 사전순(lexicographic) 비교**만으로 시간 순서를 판정한다(오프셋과 자릿수가 모두 고정이므로 사전순 비교 = 시간순 비교가 항상 성립) — 기존 `incident-triage/history`(BF-806) `formatCompletedAt` 관례와 동일 이유(테스트 실행 머신 타임존에 따른 비결정성 방지).

---

## 6. 샘플 Fixture 데이터 (6건)

심각도 4종·상태 5종·체크리스트 유무(빈 배열 포함)·타임라인 길이(최소 1건 포함)를 모두 커버하도록 6건을 구성했다.

| id | title | severity | status | owner | checklist 진행 | 비고 |
|----|-------|----------|--------|-------|------------------|------|
| `INC-3001` | 결제 게이트웨이 타임아웃 급증 | P1 | investigating | 김온콜 / Payments | 2/4 (50%) | 표준 진행 중 케이스 |
| `INC-3002` | 정적 자산 CDN 5xx 스파이크 | P2 | mitigating | 이인프라 / Platform | 1/3 (33%) | 반올림 검증용(33.33→33) |
| `INC-3003` | 로그인 세션 만료 오탐 | P3 | monitoring | 박인증 / Identity | 2/2 (100%) | 체크리스트 100% 지만 상태는 미해결(모니터링 중) — 체크리스트 완료 ≠ 상태 해결 |
| `INC-3004` | 배치 작업 지연 경고 | P4 | detected | 최데이터 / Data | 해당 없음(0건) | 타임라인 1건(감지만), 체크리스트 빈 배열 — 두 최소 케이스 동시 검증 |
| `INC-3005` | 인증 토큰 발급 실패 | P2 | resolved | 정보안 / Security | 3/3 (100%) | 타임라인 마지막이 `resolved` |
| `INC-3006` | 알림 발송 지연 (심각도 상향) | P1 | investigating | 한온콜 / Notifications | 3/5 (60%) | `escalated` 이벤트 포함(P2→P1 상향 시나리오) |

### 6.1 fixtures.js 코드 예시

```javascript
// incident-command/fixtures.js — 정적 fixture 데이터 (UMD, 외부 fetch/API 없음)
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트
  }
  if (root) {
    root.IncidentCommandFixtures = api; // 브라우저 전역
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SEVERITIES = ["P1", "P2", "P3", "P4"];
  var STATUSES = ["detected", "investigating", "mitigating", "monitoring", "resolved"];
  var SEVERITY_LABELS = { P1: "치명", P2: "높음", P3: "보통", P4: "낮음" };
  var STATUS_LABELS = { detected: "감지됨", investigating: "조사중", mitigating: "조치중", monitoring: "모니터링", resolved: "해결됨" };
  var EVENT_TYPE_LABELS = { detected: "감지", update: "진행 갱신", escalated: "에스컬레이션", resolved: "해결" };

  var INCIDENTS = [
    {
      id: "INC-3001",
      title: "결제 게이트웨이 타임아웃 급증",
      severity: "P1",
      status: "investigating",
      owner: { name: "김온콜", team: "Payments" },
      detectedAt: "2026-07-14T02:10:00+09:00",
      updatedAt: "2026-07-14T02:45:00+09:00",
      timeline: [
        { timestamp: "2026-07-14T02:10:00+09:00", actor: "모니터링 시스템", eventType: "detected", note: "결제 승인 API 5xx 비율 12% 초과 — 자동 알림 발생" },
        { timestamp: "2026-07-14T02:15:00+09:00", actor: "김온콜", eventType: "update", note: "온콜 확인, 게이트웨이 사이드카 로그 조사 착수" },
        { timestamp: "2026-07-14T02:30:00+09:00", actor: "김온콜", eventType: "update", note: "업스트림 PG사 응답 지연 확인, PG사 상태 페이지 확인 중" },
        { timestamp: "2026-07-14T02:45:00+09:00", actor: "김온콜", eventType: "update", note: "PG사 측 부분 장애 공지 확인, 재시도 큐 우회 조치 검토" }
      ],
      checklist: [
        { id: "chk-3001-1", text: "결제 게이트웨이 사이드카 재시작", done: true, completedAt: "2026-07-14T02:20:00+09:00" },
        { id: "chk-3001-2", text: "PG사 상태 페이지 확인", done: true, completedAt: "2026-07-14T02:32:00+09:00" },
        { id: "chk-3001-3", text: "재시도 큐 우회 라우팅 활성화", done: false, completedAt: null },
        { id: "chk-3001-4", text: "결제 실패 고객 목록 집계", done: false, completedAt: null }
      ]
    },
    {
      id: "INC-3002",
      title: "정적 자산 CDN 5xx 스파이크",
      severity: "P2",
      status: "mitigating",
      owner: { name: "이인프라", team: "Platform" },
      detectedAt: "2026-07-14T01:05:00+09:00",
      updatedAt: "2026-07-14T01:40:00+09:00",
      timeline: [
        { timestamp: "2026-07-14T01:05:00+09:00", actor: "모니터링 시스템", eventType: "detected", note: "CDN 엣지 노드 5xx 비율 8% 초과" },
        { timestamp: "2026-07-14T01:20:00+09:00", actor: "이인프라", eventType: "update", note: "특정 리전 엣지 노드 장애로 확인, 트래픽 우회 준비" },
        { timestamp: "2026-07-14T01:40:00+09:00", actor: "이인프라", eventType: "update", note: "해당 리전 트래픽 우회 적용, 5xx 비율 하락 관찰 중" }
      ],
      checklist: [
        { id: "chk-3002-1", text: "장애 리전 트래픽 우회", done: true, completedAt: "2026-07-14T01:40:00+09:00" },
        { id: "chk-3002-2", text: "엣지 노드 재기동 요청", done: false, completedAt: null },
        { id: "chk-3002-3", text: "캐시 무효화 재검증", done: false, completedAt: null }
      ]
    },
    {
      id: "INC-3003",
      title: "로그인 세션 만료 오탐",
      severity: "P3",
      status: "monitoring",
      owner: { name: "박인증", team: "Identity" },
      detectedAt: "2026-07-13T22:00:00+09:00",
      updatedAt: "2026-07-13T23:10:00+09:00",
      timeline: [
        { timestamp: "2026-07-13T22:00:00+09:00", actor: "모니터링 시스템", eventType: "detected", note: "비정상 세션 만료율 증가 알림" },
        { timestamp: "2026-07-13T22:30:00+09:00", actor: "박인증", eventType: "update", note: "세션 토큰 클럭 스큐 이슈로 원인 확인, 시각 동기화 조치 완료" },
        { timestamp: "2026-07-13T23:10:00+09:00", actor: "박인증", eventType: "update", note: "재발 여부 1시간 모니터링 중, 추가 오탐 없음" }
      ],
      checklist: [
        { id: "chk-3003-1", text: "인증 서버 NTP 동기화 확인", done: true, completedAt: "2026-07-13T22:35:00+09:00" },
        { id: "chk-3003-2", text: "세션 만료율 대시보드 1시간 관찰", done: true, completedAt: "2026-07-13T23:10:00+09:00" }
      ]
    },
    {
      id: "INC-3004",
      title: "배치 작업 지연 경고",
      severity: "P4",
      status: "detected",
      owner: { name: "최데이터", team: "Data" },
      detectedAt: "2026-07-14T03:00:00+09:00",
      updatedAt: "2026-07-14T03:00:00+09:00",
      timeline: [
        { timestamp: "2026-07-14T03:00:00+09:00", actor: "모니터링 시스템", eventType: "detected", note: "야간 정산 배치 예상 종료 시각 20분 초과 — 경고 수준 알림" }
      ],
      checklist: []
    },
    {
      id: "INC-3005",
      title: "인증 토큰 발급 실패",
      severity: "P2",
      status: "resolved",
      owner: { name: "정보안", team: "Security" },
      detectedAt: "2026-07-13T09:00:00+09:00",
      updatedAt: "2026-07-13T10:15:00+09:00",
      timeline: [
        { timestamp: "2026-07-13T09:00:00+09:00", actor: "모니터링 시스템", eventType: "detected", note: "OAuth 토큰 발급 실패율 15% 초과" },
        { timestamp: "2026-07-13T09:20:00+09:00", actor: "정보안", eventType: "update", note: "서명 키 순환(rotation) 중 캐시 미갱신 확인" },
        { timestamp: "2026-07-13T09:45:00+09:00", actor: "정보안", eventType: "update", note: "전 노드 키 캐시 강제 갱신 배포" },
        { timestamp: "2026-07-13T10:00:00+09:00", actor: "정보안", eventType: "update", note: "실패율 정상 범위로 복귀 확인, 30분 관찰" },
        { timestamp: "2026-07-13T10:15:00+09:00", actor: "정보안", eventType: "resolved", note: "정상 범위 유지 확인, 장애 종결" }
      ],
      checklist: [
        { id: "chk-3005-1", text: "서명 키 캐시 강제 갱신 배포", done: true, completedAt: "2026-07-13T09:45:00+09:00" },
        { id: "chk-3005-2", text: "실패율 대시보드 30분 관찰", done: true, completedAt: "2026-07-13T10:15:00+09:00" },
        { id: "chk-3005-3", text: "사후 보고서(postmortem) 초안 작성", done: true, completedAt: "2026-07-13T10:15:00+09:00" }
      ]
    },
    {
      id: "INC-3006",
      title: "알림 발송 지연 (심각도 상향)",
      severity: "P1",
      status: "investigating",
      owner: { name: "한온콜", team: "Notifications" },
      detectedAt: "2026-07-14T00:10:00+09:00",
      updatedAt: "2026-07-14T00:50:00+09:00",
      timeline: [
        { timestamp: "2026-07-14T00:10:00+09:00", actor: "모니터링 시스템", eventType: "detected", note: "푸시 알림 발송 지연 평균 4분 초과" },
        { timestamp: "2026-07-14T00:20:00+09:00", actor: "한온콜", eventType: "update", note: "발송 큐 적체 확인, 원인 조사 중" },
        { timestamp: "2026-07-14T00:35:00+09:00", actor: "한온콜", eventType: "escalated", note: "결제 알림까지 지연 확산 확인 — 심각도 P2→P1 상향, 추가 담당자 투입" },
        { timestamp: "2026-07-14T00:50:00+09:00", actor: "한온콜", eventType: "update", note: "큐 워커 스케일아웃 진행 중" }
      ],
      checklist: [
        { id: "chk-3006-1", text: "발송 큐 적체량 확인", done: true, completedAt: "2026-07-14T00:20:00+09:00" },
        { id: "chk-3006-2", text: "결제 알림 우선순위 큐 분리", done: true, completedAt: "2026-07-14T00:40:00+09:00" },
        { id: "chk-3006-3", text: "큐 워커 스케일아웃", done: true, completedAt: "2026-07-14T00:50:00+09:00" },
        { id: "chk-3006-4", text: "지연된 알림 재발송", done: false, completedAt: null },
        { id: "chk-3006-5", text: "사용자 공지 문구 게시", done: false, completedAt: null }
      ]
    }
  ];

  return {
    SEVERITIES: SEVERITIES,
    STATUSES: STATUSES,
    SEVERITY_LABELS: SEVERITY_LABELS,
    STATUS_LABELS: STATUS_LABELS,
    EVENT_TYPE_LABELS: EVENT_TYPE_LABELS,
    INCIDENTS: INCIDENTS
  };
});
```

---

## 7. Recovery Checklist 진행률 계산 규칙

### 7.1 계산 공식 (고정 — 재해석 금지)

| 값 | 계산식 |
|----|--------|
| `total` | `checklist.length` |
| `done` | `checklist.filter(i => i.done === true).length` |
| `percent` | `total === 0 ? 0 : Math.round(done / total * 100)` |

- `percent` 는 **반올림된 정수**(예: `INC-3002` 1/3 → `33`, 소수점 표시 없음).
- `total === 0` 이면 `percent = 0` 을 반환하지만, 화면에는 "0%" 로 표시하지 않고 §7.3 안내 문구로 대체한다(진행률 0% 로 오인 방지 — §11 release-readiness `total===0` 처리와 동일 원칙).

### 7.2 상태(status)와 체크리스트 완료율의 독립성

체크리스트 진행률은 장애의 `status` 필드와 **연동되지 않는다** — `INC-3003` 처럼 체크리스트가 100% 완료돼도 `status` 는 여전히 `monitoring`(운영자가 별도로 상태를 갱신해야 `resolved` 로 전환)일 수 있다. 본 화면은 체크리스트 완료율로 `status` 를 자동 변경하는 로직을 두지 않는다(Simplicity First — 두 값을 자동 동기화하려면 "완료 판정 규칙"이라는 별도 스펙이 필요해지므로 v1 범위 밖, §18).

### 7.3 빈 체크리스트 안내

`checklist.length === 0` 인 장애(예: `INC-3004`, 감지 직후라 아직 조치 항목이 정의되지 않음)는 진행률 바 대신 고정 문구 **"해당 장애에 등록된 복구 체크리스트가 없습니다."** 를 표시한다.

---

## 8. 파일 구조 및 모듈 경계

### 8.1 파일 목록 (확정)

```
incident-command/
├── index.html      ← HTML 마크업 + 스크립트 로드
├── style.css       ← 시각 스타일 (designer 담당)
├── fixtures.js      ← 정적 fixture 데이터 (§5, §6) — UMD, developer 담당
├── command.js       ← 필터/선택/체크리스트 토글 로직 + DOM 렌더링 (§9) — UMD, developer 담당
└── package.json     ← `{ "type": "commonjs" }` (루트 `package.json` 의 `"type":"module"` 을 이 디렉토리만 오버라이드 — 기존 `incident-triage/`, `number-guess/` 관례와 동일, UMD 스크립트 `file://` 호환)

tests/
└── incident-command-*.test.js   ← 순수 함수 단위 테스트 (node --test)
```

### 8.2 모듈 책임 분리

#### `index.html`
- 좌측 심각도 필터 칩 그룹 + 장애 목록, 우측 상세 패널(헤더/타임라인/체크리스트)의 마크업 골격(§10 DOM 계약 준수)
- 초기 마크업(JS 실행 전)에 `data-view-state="loading"` 스켈레톤 placeholder 를 정적으로 포함 — §13.2
- `style.css` → `fixtures.js` → `command.js` 순서로 `</body>` 직전 로드, 외부 CDN 금지
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 포함

#### `style.css`
- 레이아웃(2단 목록+상세 또는 모바일 스택)·컬러·타이포그래피, CSS 변수(`--ic-*` 프리픽스 제안 — 기존 모듈과 접두사 충돌 없음) 자체 정의
- `data-view-state`, `data-severity`, `data-status`, `data-event-type` 등 §10 data 속성을 활용한 시각 전환
- 외부 폰트 CDN 금지, system font stack 사용, 반응형은 §15 참조

#### `fixtures.js`
- §5~§6 스키마와 샘플 데이터만 담는다. DOM 조작·이벤트 처리 없음 — 순수 데이터 모듈
- `SEVERITIES`/`STATUSES`/`SEVERITY_LABELS`/`STATUS_LABELS`/`EVENT_TYPE_LABELS`/`INCIDENTS` export

#### `command.js`
- 책임 #1: `validateIncidentRecord(record)` 순수 함수(§9.1)
- 책임 #2: `loadIncidents(rawItems)` 순수 함수(§9.2) — fixture 로드 파이프라인, `viewState` 결정에 사용
- 책임 #3: `filterIncidentsBySeverity(incidents, severityFilter)` 순수 함수(§9.3)
- 책임 #4: `calculateChecklistProgress(checklist)` 순수 함수(§9.4)
- 책임 #5: `toggleChecklistItem(checklist, itemId, nowIso)` 순수 함수(§9.5)
- 책임 #6: 필터 칩 클릭, 목록 행 클릭, 체크박스 클릭 이벤트 처리 → 상태 갱신 → 목록/상세/진행률 재렌더링
- 책임 #7: 키보드 조작 지원(§14)
- **UMD 패턴 사용**(`incident-triage`/`release-readiness` 관례): 브라우저는 `<script src="./command.js">` 로 로드(`window.IncidentCommand` 노출), Node 테스트는 `createRequire` 로 로드해 순수 함수만 사용
- `localStorage`/`fetch`/외부 API 호출 금지

---

## 9. 순수 함수 Contract

### 9.1 `validateIncidentRecord(record)`

```javascript
/**
 * Incident 레코드 1건이 §5 스키마(§5.3 TimelineEvent 검증 규칙 포함)를 만족하는지 검사한다.
 *
 * @param {object} record
 * @returns {{ valid: boolean, errors: string[] }} errors 는 valid=false 일 때 사람이 읽을 수 있는 사유 목록(순서 무관), valid=true 면 빈 배열
 */
function validateIncidentRecord(record) { /* §5.1~§5.4 필드 존재/타입/enum, §5.3 검증 규칙 1~4 를 그대로 구현. throw 하지 않음(§9.2 에서 안전하게 소비하기 위함) */ }
```

- 부작용 없음(순수 함수), throw 하지 않는다 — 항상 `{valid, errors}` 객체를 반환(방어적, 화면 크래시 방지)

### 9.2 `loadIncidents(rawItems)`

```javascript
/**
 * fixture 원본 배열을 검증해 화면에 쓸 데이터 또는 에러를 결정론적으로 산출한다.
 * §13 viewState 결정 로직의 기반 — 이 함수의 반환값으로 loading 이후 empty/error/ready 를 가른다.
 *
 * @param {Array<object>} rawItems
 * @returns {{ ok: true, incidents: object[] } | { ok: false, error: string }}
 *   - rawItems 가 배열이 아니면 { ok:false, error: '...' }
 *   - rawItems.some(item => !validateIncidentRecord(item).valid) 이면 { ok:false, error: '...' } (첫 번째 invalid 레코드의 id 를 error 문구에 포함)
 *   - 그 외(빈 배열 포함, 전부 valid)면 { ok:true, incidents: rawItems }
 */
function loadIncidents(rawItems) { /* validateIncidentRecord 를 각 원소에 적용 */ }
```

- 부작용 없음. `rawItems` 를 mutate 하지 않는다.
- **실제 운영에서 `ok:false` 는 발생하지 않는다** — fixtures.js 의 `INCIDENTS` 는 §11 단위 테스트로 항상 valid 함이 보증된다. 이 함수는 "fixture 가 손상되어도 화면이 죽지 않는다"는 방어 계약이며, §13.3 error 상태는 이 방어 계약을 검증하기 위한 것이다(release-readiness `total===0` 방어적 edge 와 동일한 성격, §17 EC-09 참조).

### 9.3 `filterIncidentsBySeverity(incidents, severityFilter)`

```javascript
/**
 * 심각도 조건으로 장애 목록을 좁히는 순수 함수.
 *
 * @param {Array<object>} incidents
 * @param {'all'|'P1'|'P2'|'P3'|'P4'} severityFilter
 * @returns {Array<object>} 새 배열(원본 incidents 를 변경하지 않음), severityFilter='all' 이면 원본과 동일한 배열 반환
 */
function filterIncidentsBySeverity(incidents, severityFilter) { /* severityFilter==='all' ? incidents.slice() : incidents.filter(i => i.severity === severityFilter) */ }
```

### 9.4 `calculateChecklistProgress(checklist)`

```javascript
/**
 * 체크리스트 배열로부터 완료 진행률을 계산하는 순수 함수(§7.1 공식 그대로 구현)
 *
 * @param {Array<{done: boolean}>} checklist
 * @returns {{ total: number, done: number, percent: number }}
 */
function calculateChecklistProgress(checklist) { /* §7.1 */ }
```

- 전제 조건: `checklist` 는 배열(빈 배열 허용). 배열이 아니면 `{total:0, done:0, percent:0}` 으로 방어적 처리(throw 하지 않음)

### 9.5 `toggleChecklistItem(checklist, itemId, nowIso)`

```javascript
/**
 * 체크리스트 중 itemId 항목의 done 을 토글하고, completedAt 을 §5.4 null 일관성 규칙에 맞춰 갱신한 **새 배열**을 반환한다.
 *
 * @param {Array<{id: string, done: boolean, completedAt: string|null}>} checklist
 * @param {string} itemId - 토글 대상 항목의 id
 * @param {string} nowIso - 토글 시각(ISO 8601, +09:00 오프셋). 호출부(DOM 핸들러)가 `new Date().toISOString()` 등으로 생성해 주입 — 함수 자체는 시계에 의존하지 않아 단위 테스트에서 고정 문자열로 결정론적 검증 가능
 * @returns {Array<object>} 원본을 변경하지 않은 새 배열. done:false→true 전환 시 completedAt=nowIso, true→false 전환 시 completedAt=null
 * @throws {TypeError} itemId 에 해당하는 항목이 checklist 에 없으면 throw
 */
function toggleChecklistItem(checklist, itemId, nowIso) { /* map 으로 새 배열 생성, 대상 항목만 done/completedAt 갱신 */ }
```

- 부작용 없음. `checklist` 원본 배열/원소 객체를 mutate 하지 않는다.
- 화면(§8.2 책임 #6)은 이 함수의 반환값으로 `checklistState`(§3.1)를 갱신하고 재렌더링한다.

### 9.6 Export 방식 (테스트 호환)

```javascript
// command.js 상단 — UMD 패턴 (incident-triage/release-readiness 와 동일 관례)
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트
  }
  if (root) {
    root.IncidentCommand = api; // 브라우저 전역
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
  function validateIncidentRecord(record) { /* ... */ }
  function loadIncidents(rawItems) { /* ... */ }
  function filterIncidentsBySeverity(incidents, severityFilter) { /* ... */ }
  function calculateChecklistProgress(checklist) { /* ... */ }
  function toggleChecklistItem(checklist, itemId, nowIso) { /* ... */ }
  function init() { /* DOM 와이어링, dev 담당 */ }
  return {
    validateIncidentRecord: validateIncidentRecord,
    loadIncidents: loadIncidents,
    filterIncidentsBySeverity: filterIncidentsBySeverity,
    calculateChecklistProgress: calculateChecklistProgress,
    toggleChecklistItem: toggleChecklistItem,
    init: init
  };
});
```

테스트 파일에서는 루트 `package.json` 이 `"type": "module"` 이므로 `createRequire` 로 CommonJS 모듈을 로드한다(`release-readiness` 테스트 관례 동일):

```javascript
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { validateIncidentRecord, loadIncidents, filterIncidentsBySeverity, calculateChecklistProgress, toggleChecklistItem } = require("../incident-command/command.js");
const { INCIDENTS } = require("../incident-command/fixtures.js");
```

---

## 10. DOM 데이터 계약 (data-* 속성)

dev/designer/tester 가 동일한 계약으로 작업할 수 있도록 아래 구조/속성은 **고정**한다(클래스명·시각 스타일은 디자이너 재량):

| 요소 | 속성 | 값 |
|------|------|-----|
| 앱 루트 | `<main id="incident-command" data-view-state="...">` | `loading \| empty \| error \| ready`(§13) |
| 심각도 필터 칩 그룹 | `<div role="group" aria-label="심각도 필터">` 내부 `<button data-severity-filter="...">` | `all \| P1 \| P2 \| P3 \| P4`, `aria-pressed="true\|false"` |
| 필터 초기화 버튼 | `<button id="reset-severity-filter-btn">` | 목록 빈 상태(§2.2)에서만 노출 |
| 장애 목록 | `<ul id="incident-list">` 내부 `<li data-id="INC-3001" data-severity="P1" data-status="investigating" aria-selected="true\|false" tabindex="0">` | — |
| 상세 패널 루트 | `<section id="incident-detail" data-selected-id="INC-3001\|none">` | `none` = 미선택(§2.2) |
| 타임라인 목록 | `<ol id="incident-timeline">` 내부 `<li data-event-type="detected\|update\|escalated\|resolved">` | — |
| 체크리스트 루트 | `<div id="incident-checklist" data-checklist-state="has-items\|no-checklist">` | §7.3 |
| 체크리스트 항목 | `<li data-checklist-id="chk-3001-1">` 내부 `<input type="checkbox" data-checklist-id="chk-3001-1" checked="...">` | — |
| 체크리스트 진행률 바 | `<div id="checklist-progress" role="progressbar" aria-valuenow="{percent}" aria-valuemin="0" aria-valuemax="100">` | `data-checklist-state="has-items"` 일 때만 존재 |
| 에러 배너 | `<div id="error-banner" role="alert">` | `data-view-state="error"` 일 때만 존재(§13.3) |

---

## 11. 단위 테스트 전략

### 11.1 테스트 파일 위치 및 실행

```bash
# 실행 명령 (focused scope)
node --test tests/incident-command-*.test.js
```

이후 구현 task 는 본인 task 키를 붙여 `tests/incident-command-BF8XX.test.js` 형태로 파일을 생성한다(glob 패턴에 그대로 매칭).

### 11.2 테스트 대상

`validateIncidentRecord`/`loadIncidents`/`filterIncidentsBySeverity`/`calculateChecklistProgress`/`toggleChecklistItem` 순수 함수와 `fixtures.js` 의 `INCIDENTS` 정합성만 단위 테스트한다. DOM 렌더링/클릭 인터랙션은 필요 시 별도 E2E 티켓에서 다룬다(기존 `incident-triage`→`incident-triage-BF805-e2e` 관례와 동일 분리).

### 11.3 필수 테스트 케이스

| 케이스 ID | 대상 | 입력 | 기대 결과 |
|-----------|------|------|-----------|
| TC-01 | `validateIncidentRecord` | §6 `INC-3001` 레코드 | `{ valid: true, errors: [] }` |
| TC-02 | `validateIncidentRecord` | `timeline[0].eventType !== 'detected'` 로 조작한 레코드 | `valid: false`, errors 에 사유 포함 |
| TC-03 | `validateIncidentRecord` | `status:'resolved'` 인데 마지막 이벤트가 `resolved` 아님 | `valid: false` |
| TC-04 | `validateIncidentRecord` | `checklist` 항목 중 `done:true`인데 `completedAt:null` | `valid: false` |
| TC-05 | `validateIncidentRecord` | `checklist:[]` (빈 배열, `INC-3004` 형태) | `valid: true` (빈 체크리스트는 유효) |
| TC-06 | `loadIncidents` | §6 `INCIDENTS` 전체(6건) | `{ ok: true, incidents }`, `incidents.length === 6` |
| TC-07 | `loadIncidents` | 배열이 아닌 값(`null`, `undefined`, 객체 등) | `{ ok: false, error }` |
| TC-08 | `loadIncidents` | 1건이라도 invalid 레코드 포함 | `{ ok: false, error }` |
| TC-09 | `loadIncidents` | 빈 배열 `[]` | `{ ok: true, incidents: [] }` (§13.1 empty 판정의 입력) |
| TC-10 | `filterIncidentsBySeverity` | `(INCIDENTS, 'P1')` | `INC-3001`, `INC-3006` 2건만 반환 |
| TC-11 | `filterIncidentsBySeverity` | `(INCIDENTS, 'all')` | 원본과 동일한 6건 반환 |
| TC-12 | `filterIncidentsBySeverity` | `(INCIDENTS, 'P4')`처럼 1건만 매칭 | `INC-3004` 1건만 반환 |
| TC-13 | `calculateChecklistProgress` | `INC-3001.checklist`(4건 중 2건 done) | `{ total:4, done:2, percent:50 }` |
| TC-14 | `calculateChecklistProgress` | `INC-3002.checklist`(3건 중 1건 done) | `{ total:3, done:1, percent:33 }` (반올림 검증) |
| TC-15 | `calculateChecklistProgress` | `[]` (빈 배열, `INC-3004.checklist`) | `{ total:0, done:0, percent:0 }` |
| TC-16 | `toggleChecklistItem` | `INC-3001.checklist`, `itemId:'chk-3001-3'`(현재 done:false), `nowIso:'2026-07-14T03:00:00+09:00'` | 대상 항목만 `{done:true, completedAt:'2026-07-14T03:00:00+09:00'}`, 나머지 항목 불변, 원본 배열 mutate 없음 |
| TC-17 | `toggleChecklistItem` | 위 결과를 다시 같은 `itemId` 로 토글 | `{done:false, completedAt:null}` 로 복귀 |
| TC-18 | `toggleChecklistItem` | 존재하지 않는 `itemId` | throw `TypeError` |
| TC-19 | fixture 정합성 | `INCIDENTS` 전체 순회 | 모든 레코드에 대해 `validateIncidentRecord(record).valid === true` |
| TC-20 | fixture 최소 건수/다양성 | `INCIDENTS` | `length === 6`, `severity` 4종 모두 최소 1건 이상 등장, `checklist.length === 0` 인 레코드 최소 1건 존재(`INC-3004`) |

### 11.4 테스트 파일 구조 (참조 템플릿)

```javascript
// tests/incident-command-BF8XX.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const {
  validateIncidentRecord, loadIncidents, filterIncidentsBySeverity,
  calculateChecklistProgress, toggleChecklistItem
} = require("../incident-command/command.js");
const { INCIDENTS, SEVERITIES } = require("../incident-command/fixtures.js");

describe("loadIncidents", () => {
  it("TC-06: fixture 6건 정상 로드", () => {
    const result = loadIncidents(INCIDENTS);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.incidents.length, 6);
  });
  it("TC-09: 빈 배열", () => {
    assert.deepStrictEqual(loadIncidents([]), { ok: true, incidents: [] });
  });
});

describe("calculateChecklistProgress", () => {
  it("TC-14: 3건 중 1건 완료 → 33%(반올림)", () => {
    const inc = INCIDENTS.find(i => i.id === "INC-3002");
    assert.deepStrictEqual(calculateChecklistProgress(inc.checklist), { total: 3, done: 1, percent: 33 });
  });
});

describe("fixtures 정합성", () => {
  it("TC-19/TC-20: 전 레코드 유효 + 최소 다양성", () => {
    assert.strictEqual(INCIDENTS.length, 6);
    for (const record of INCIDENTS) {
      assert.strictEqual(validateIncidentRecord(record).valid, true, record.id);
    }
    for (const sev of SEVERITIES) {
      assert.ok(INCIDENTS.some(i => i.severity === sev), `${sev} 미포함`);
    }
    assert.ok(INCIDENTS.some(i => i.checklist.length === 0));
  });
});
```

---

## 12. Acceptance Criteria (Given/When/Then)

### AC-01: 초기 로드 — 목록 + 기본 선택
> **Given** 운영자가 `incident-command/index.html` 을 열었을 때
> **When** 페이지 로드가 완료되면
> **Then** fixture 6건이 심각도 순서(fixture 배열 순서)로 목록에 표시되고, 심각도 필터는 "전체" 상태이며, 상세 패널에는 첫 번째 장애(`INC-3001`)의 헤더·타임라인·체크리스트가 표시된다

### AC-02: 심각도 필터 적용
> **Given** 초기 로드 상태일 때
> **When** 심각도 필터에서 "P1" 을 선택하면
> **Then** 목록에는 `severity='P1'` 항목(`INC-3001`, `INC-3006`) 2건만 표시된다

### AC-03: 필터로 선택된 장애가 사라지는 경우
> **Given** `INC-3003`(P3)이 상세 패널에 선택된 상태일 때
> **When** 심각도 필터에서 "P1" 을 선택하면
> **Then** 목록에서 `INC-3003` 이 사라지고, 상세 패널은 "왼쪽 목록에서 장애를 선택하세요." 안내로 전환된다(§2.3)

### AC-04: 장애 선택 전환
> **Given** 목록에 2건 이상의 장애가 표시된 상태일 때
> **When** 다른 행을 클릭(또는 포커스 후 Enter)하면
> **Then** 상세 패널이 즉시 해당 장애의 헤더·타임라인·체크리스트로 갱신된다

### AC-05: 타임라인 순서 표시
> **Given** `INC-3006`(타임라인 4건, `escalated` 이벤트 포함)이 선택된 상태일 때
> **When** 상세 패널을 렌더링하면
> **Then** 타임라인이 fixture 배열 순서(시간순) 그대로 4건 표시되고, 3번째 항목이 `eventType='escalated'` 로 표시된다

### AC-06: 체크리스트 토글 및 진행률 갱신
> **Given** `INC-3001`(체크리스트 2/4 완료, 50%)이 선택된 상태일 때
> **When** 미완료 항목(`chk-3001-3`) checkbox 를 클릭하면
> **Then** 해당 항목이 즉시 체크되고 진행률 바가 "3/4 완료 (75%)" 로 즉시 갱신된다

### AC-07: 체크리스트 토글 해제
> **Given** AC-06 을 수행해 `chk-3001-3` 이 체크된 상태일 때
> **When** 같은 checkbox 를 다시 클릭하면
> **Then** 체크가 해제되고 진행률 바가 "2/4 완료 (50%)" 로 원복된다

### AC-08: 체크리스트 없는 장애
> **Given** `INC-3004`(checklist 빈 배열)가 선택된 상태일 때
> **When** 상세 패널을 렌더링하면
> **Then** 진행률 바 대신 "해당 장애에 등록된 복구 체크리스트가 없습니다." 문구가 표시된다

### AC-09: 체크리스트 진행률 계산 정확성
> **Given** `INC-3002.checklist`(3건 중 1건 완료)가 주어졌을 때
> **When** `calculateChecklistProgress(checklist)` 를 호출하면
> **Then** `{ total:3, done:1, percent:33 }` 이 반환된다(반올림, §7.1)

### AC-10: Loading → Ready 전환
> **Given** `incident-command/index.html` 이 막 로드되어 스크립트가 아직 실행되지 않은 초기 HTML 상태일 때
> **When** 정적 HTML 만 파싱된 순간을 관찰하면
> **Then** `data-view-state="loading"` 스켈레톤이 표시되어 있고, `command.js` 실행 직후(동기적으로) `data-view-state="ready"` 로 전환되며 목록이 렌더링된다(§13.2, 인위적 지연 없음)

### AC-11: Empty 상태(방어적 edge)
> **Given** `loadIncidents([])` 처럼 fixture 가 0건인 방어적 상황일 때
> **When** 화면을 렌더링하면
> **Then** `data-view-state="empty"` 로 전환되고 "표시할 장애가 없습니다." 문구가 표시되며 콘솔 에러가 발생하지 않는다(§13.1)

### AC-12: Error 상태(방어적 edge)
> **Given** `loadIncidents(rawItems)` 가 스키마 검증에 실패해 `{ ok:false, error }` 를 반환하는 방어적 상황일 때
> **When** 화면을 렌더링하면
> **Then** `data-view-state="error"` 로 전환되고 `role="alert"` 에러 배너에 안내 문구가 표시되며, 목록/상세 패널은 렌더링되지 않고 화면이 크래시하지 않는다(§13.3)

### AC-13: 기존 파일/모듈 보존 (범위 제약)
> **Given** `incident-triage/`, `incident-triage/history/`, `release-readiness/` 등 기존/예정 모듈의 파일이 존재할 때
> **When** 본 스토리(BF-821 Epic 산하 모든 후속 작업)를 완료하면
> **Then** 이 파일들에는 어떠한 diff 도 존재하지 않으며, 신규 기능은 전부 `incident-command/` 신규 파일로만 추가되어 있다

### AC-14: vanilla-static / file:// 호환
> **Given** 외부 CDN·프레임워크·번들러 없이 `incident-command/` 5개 파일만 존재하는 상태일 때
> **When** `index.html` 을 `file://` 프로토콜로 직접 더블클릭해 열면
> **Then** 콘솔 에러 없이 필터·선택·체크리스트 토글 전체 기능이 정상 동작한다(네트워크 요청 0건)

### AC-15: 키보드만으로 전체 조작 가능
> **Given** 마우스 없이 키보드만 사용하는 운영자일 때
> **When** `Tab` 으로 필터 칩·목록 행·체크박스를 이동하며 `Enter`/`Space` 로 조작하면
> **Then** 마우스 클릭과 동일하게 필터링·장애 선택·체크리스트 토글 전체 흐름을 완료할 수 있다

---

## 13. Empty · Loading · Error 상태 정의

본 화면은 실제 네트워크 호출이 없으므로 세 상태 모두 **결정론적**으로 정의된다(무작위 지연·재시도 없음).

### 13.1 상태 판정 파이프라인 (고정 — 재해석 금지)

```
rawItems = fixtures.js 의 INCIDENTS
result = loadIncidents(rawItems)   // §9.2, 동기 함수, 인위적 setTimeout 지연 없음

result.ok === false                       → viewState = 'error'
result.ok === true && incidents.length===0 → viewState = 'empty'
result.ok === true && incidents.length>0   → viewState = 'ready'
```

`init()` 은 이 판정을 **동기적으로 1회** 수행한다 — 실제 API 호출이 없으므로 재시도·폴링·타임아웃 개념은 존재하지 않는다.

### 13.2 Loading 상태 (초기 스켈레톤)

- "loading" 은 인위적인 `setTimeout` 지연으로 흉내내지 않는다. 대신 `index.html` 의 **정적 마크업 자체**가 `data-view-state="loading"` 스켈레톤 placeholder(목록/상세 영역의 회색 블록 등)를 담고 있으며, `command.js` 가 `</body>` 직전에 로드되어 실행되는 순간 §13.1 파이프라인을 동기 실행해 `empty`/`error`/`ready` 중 하나로 **즉시 교체**한다.
- 따라서 "loading" 은 브라우저가 HTML 을 파싱하고 스크립트가 아직 실행되지 않은 짧은 순간에만 실제로 노출되는, 진짜 존재하는 화면 상태다(가짜 지연 아님) — 네트워크가 없는 화면에서도 "빈 화면 깜빡임"을 방지하기 위한 정적 스켈레톤이라는 것이 목적이다.
- 테스트 관점: E2E 테스트는 `index.html` 의 raw HTML 소스(스크립트 실행 전)를 파싱해 `data-view-state="loading"` 마크업 존재를 확인할 수 있고, 스크립트 실행 후에는 항상 `ready`/`empty`/`error` 중 하나로 바뀌어 있어야 한다(즉 `loading` 이 최종 상태로 "고착"되면 버그).

### 13.3 Empty 상태

- 노출 조건: `loadIncidents(rawItems).incidents.length === 0`
- 문구(고정): **"표시할 장애가 없습니다."**
- v1 실제 배포에서는 `fixtures.js` 의 `INCIDENTS` 가 항상 6건이므로 **실제로 발생하지 않는 방어적 상태**다(§9.2, release-readiness `total===0` 과 동일 성격) — 그럼에도 `loadIncidents([])` 를 직접 호출하는 단위 테스트(TC-09)로 항상 검증 가능해야 한다.

### 13.4 Error 상태

- 노출 조건: `loadIncidents(rawItems).ok === false`(스키마 검증 실패)
- 문구(고정): **"장애 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요."**
- "재시도" 버튼은 두지 않는다 — 외부 API 가 없는 화면에서 재시도는 새로고침과 동일한 효과이므로 브라우저 새로고침 안내 문구로 충분하다(Simplicity First)
- v1 실제 배포에서는 `fixtures.js` 의 `INCIDENTS` 가 §11 단위 테스트(TC-19)로 항상 valid 함이 보증되므로 **실제로 발생하지 않는 방어적 상태**다 — "fixture 손상 시 화면이 깨지지 않고 안전하게 실패한다"는 계약을 문서화하기 위해 정의한다.

---

## 14. 접근성 요구 (Accessibility)

### 14.1 키보드 조작
- 심각도 필터 칩은 네이티브 `<button>` (`aria-pressed`), 목록 행은 `tabindex="0"` + `role` 부여로 `Tab`/`Enter`/`Space` 로 선택 가능하게 구현
- 체크리스트 항목은 네이티브 `<input type="checkbox">` 로 구현해 브라우저 기본 키보드 동작(Space 로 토글) 활용
- 고정 Tab 순서: **심각도 필터 → 장애 목록(행 순서) → 상세 패널 체크리스트(항목 순서)**. `tabindex` 임의 지정으로 이 순서를 어기지 않는다(DOM 순서로만 제어)

### 14.2 스크린리더 지원
- 목록 결과 개수 변경(필터 적용 시)은 `aria-live="polite"` 영역으로 안내(예: "총 2건 표시")
- 상세 패널 전환(장애 선택 변경)도 `aria-live="polite"` 로 안내(예: "결제 게이트웨이 타임아웃 급증 선택됨")
- 체크리스트 진행률 바는 `role="progressbar"` + `aria-valuenow/min/max` 로 값 전달(§10)
- 타임라인은 시맨틱 순서 목록(`<ol>`) 로 마크업해 스크린리더가 순서를 인지하게 함

### 14.3 WCAG 대비 및 색 비의존 표시
- Severity 배지(P1~P4)와 Status 배지(감지됨~해결됨)는 색상 단독으로 구분하지 않는다 — 배지 안에 §4.1/§4.2 한글 라벨을 항상 병기(기존 `incident-triage` §9.3, `release-readiness` §13.3 관례 계승)
- 본문/배지 텍스트 대비 4.5:1 이상(WCAG 2.1 AA), UI 컴포넌트 경계 3:1 이상. 색상 값 자체는 디자이너 재량

---

## 15. 반응형 요구

- 뷰포트 **320px ~ 767px**(모바일/좁은 태블릿) 구간에서는 목록과 상세 패널을 세로로 스택(목록이 위, 선택 시 상세가 아래 또는 별도 뷰로 전환)해 가로 스크롤 없이 표시
- 뷰포트 **768px 이상**에서는 좌측 목록 + 우측 상세 패널의 2단(Master-Detail) 레이아웃으로 나란히 배치
- 심각도 필터 칩은 좁은 화면에서 가로 스크롤 허용(`overflow-x:auto`) 또는 줄바꿈, 세부 방식은 디자이너 재량
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 포함

---

## 16. vanilla-static / file:// 제약

| 항목 | 요구 사항 |
|------|-----------|
| 외부 CDN | 금지 — 폰트/아이콘/CSS 프레임워크 사용 불가 |
| JS 프레임워크 | 금지 — React/Vue 등 사용 불가, 순수 DOM API 만 사용 |
| 빌드 도구 | 금지 — 번들러 불필요, 파일 그대로 브라우저에서 실행 |
| 모듈 시스템 | 브라우저 스크립트는 UMD 패턴 사용(§9.6), `incident-command/package.json` 으로 디렉토리만 CommonJS 오버라이드(§8.1) |
| 데이터 소스 | fixture 는 `fixtures.js` 에 **정적 배열로 하드코딩** — `fetch`/`XMLHttpRequest`/외부 JSON 로드 금지 |
| 네트워크 호출 | 금지 — 0건, 전 로직 in-memory 계산(체크리스트 토글 포함, §1.2) |
| 폰트 | system font stack 만 사용, `@font-face` 외부 로드 금지 |
| 실행 방식 | `index.html` 을 `file://` 로 더블클릭해 열어도 전체 기능 정상 동작(§12 AC-14) |

---

## 17. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|---------------|----------|-----------|
| EC-01 | 심각도 필터 결과 0건이 되는 조합(예: 없는 심각도로 강제 조작) | "해당 심각도의 장애가 없습니다." 안내 + 필터 초기화 버튼, 에러 없음 |
| EC-02 | 필터링으로 현재 선택된 장애가 목록에서 사라짐 | 상세 패널이 "미선택" 안내로 전환(§2.3, AC-03) |
| EC-03 | 필터를 다시 "전체"로 되돌림 | 직전 선택 기억하지 않고 필터 적용 후 첫 항목이 기본 선택(§2.3) |
| EC-04 | 체크리스트가 빈 배열인 장애(`INC-3004`) 선택 | 진행률 바 대신 안내 문구(§7.3, AC-08) |
| EC-05 | 체크리스트 checkbox 를 빠르게 연속 클릭(같은 항목) | 매 클릭마다 정확히 토글, 최종 상태는 클릭 횟수 짝/홀에 따라 결정론적으로 일치 |
| EC-06 | 타임라인에 `escalated` 이벤트가 있는 장애(`INC-3006`) | 해당 이벤트 행이 다른 `eventType` 과 시각적으로 구분되어 표시(색상 아닌 라벨 포함, §14.3) |
| EC-07 | 체크리스트 100% 완료인데 `status` 는 `resolved` 아님(`INC-3003`) | 상태 배지와 진행률 바가 독립적으로 각자 정확한 값 표시, 자동 상태 전환 없음(§7.2) |
| EC-08 | 타임라인이 1건뿐인 장애(`INC-3004`, 감지만 존재) | 타임라인 영역에 1개 항목만 정상 표시, 레이아웃 깨짐 없음 |
| EC-09 | fixture 자체가 스키마를 위반(방어적, 정상 배포에서는 발생하지 않음) | `loadIncidents` 가 `{ok:false}` 반환 → `data-view-state="error"` (§13.4), 크래시 없음 |
| EC-10 | 체크리스트 토글 후 브라우저 새로고침 | 모든 토글 변경 소멸, fixture 원본 `done` 값으로 완전 초기화(§1.2, 영속 저장 없음이 의도된 동작) |
| EC-11 | 키보드만으로 필터→목록 선택→체크리스트 토글 전체 흐름 수행 | 마우스 없이 100% 완결 가능(§12 AC-15) |

---

## 18. 비범위 (Out of Scope)

v1 에서는 다음 기능을 구현하지 않는다. 별도 스토리/Epic 에서 처리한다:

| 항목 | 이유 |
|------|------|
| 장애 생성/수정/삭제 (CRUD) | 정적 fixture 읽기 전용(+체크리스트 토글) 대시보드 — 별도 스토리 |
| 실제 API/DB/온콜 도구(PagerDuty 등) 연동 | 본 Epic 은 정적 fixture 확정이 목적 — 별도 Epic, vanilla-static 위반 |
| 체크리스트 토글 결과 영속 저장(localStorage/서버) | 저장소 의존성 — 별도 스토리(§1.2 세션 in-memory 로 충분) |
| 체크리스트 완료율 기반 `status` 자동 전환 | 별도 규칙 정의 필요 — 별도 스토리(§7.2) |
| 상태(Status) 필터 / 담당자·팀 필터 / 검색 | 심각도 필터만으로 v1 UX 요구 충족 — 별도 스토리 (Simplicity First) |
| 장애 상세 딥링크(URL 라우팅) | 단일 페이지 목록+상세로 충분 — 별도 스토리 |
| 실시간 갱신(웹소켓/폴링) | 정적 fixture 스냅샷 조회 도구로 충분 — 별도 Epic |
| 타임라인 이벤트 추가/수정(운영자가 직접 기록) | 읽기 전용 타임라인 — 별도 스토리 |
| 다국어(영문) 지원 | 한국어 고정 문구로 확정 — 별도 스토리 |
| 인쇄(print) 최적화 스타일 | 필요 시 별도 스토리 |

---

## 19. 디자이너 위임 시각 요소

아래 항목은 기획에서 정하지 않고 designer 에게 위임한다:

| 항목 | 가이드라인 |
|------|-----------|
| 컬러 팔레트 | 신규 CSS 변수(`--ic-*`) 자체 정의. Severity/Status 배지 색상은 §14.3 대비 요건 충족 필수 |
| 목록/상세 레이아웃 비율 | 2단 Master-Detail 구조(§15)는 고정, 폭 비율·구분선 등은 재량 |
| Severity/Status 배지 비주얼 | 아이콘/모양 자유, 단 한글 라벨 항상 병기(§14.3) |
| 타임라인 비주얼 | 세로 라인/노드 등 자유, 단 `eventType` 4종(§4.3) 시각적 구분과 시간순 배치는 고정 |
| 체크리스트 항목/진행률 바 비주얼 | 형태 자유, 단 `role="progressbar"` 시맨틱 및 "N/M 완료 (P%)" 텍스트 병기 유지 |
| 심각도 필터 칩 레이아웃 | pill/토글 버튼 등 자유, 단 `role="group"` + `aria-pressed` 시맨틱 유지 |
| Loading 스켈레톤 비주얼 | 회색 블록/스피너 등 자유, `data-view-state="loading"` 마크업 존재는 고정(§13.2) |
| Empty/Error 안내 일러스트·아이콘 | 자유, 단 §13.3/§13.4 고정 문구는 유지 |
| `data-*` 속성 규칙 | §10 표의 요소/속성/값 구조는 고정 |

---

## 20. AC ↔ 산출물 매핑 표

| # | Epic(BF-821) 수용 기준 | 충족 섹션 |
|---|---------------------------|-----------|
| AC-1 | 사용자 시나리오·정보 구조 확정 + incident/severity/owner/timeline/checklist 필드 스키마 + empty·loading·error 상태 정의가 문서에 포함 | §2(시나리오) · §4(Severity/Status Enum) · §5(Fixture 스키마) · §13(Empty·Loading·Error) |
| AC-2 | 신규 module 영문명 `incident-command` 확정, 라우트 `/incident-command/` 와 일치, 기존 module 과 중복 없음, 기존 파일 변경 없이 신규 파일만 추가하는 범위 명시 | §1.2 · §8.1(파일 구조) · §12 AC-13(범위 제약) |
| AC-3 | 외부 API 없이 deterministic fixture 로만 동작하는 범위 명시 | §1.2 · §16(vanilla-static / file:// 제약) · §12 AC-14 |

---

*문서 종료 — [박기획] · BF-822*

# Incident Command Center 기획 명세 — BF-827

> 작성자: [박기획] (planner) · 작성일 2026-07-15
> 관련 티켓: BF-828 (본 planner task) · BF-827 (부모 Epic)
> 대상 모듈: `incident-command/` (기존 구현 — BF-821 계열 Epic 에서 신규 생성됨)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환
> 단위/E2E 테스트: `node --test tests/incident-command-*.test.js` (focused scope · module: `incident-command`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**중요 가정 (모호하여 명시함):** `incident-command/` 모듈은 이미 이전 Epic **BF-821**(→ BF-822 기획 → BF-823 디자인 → BF-824 개발 → BF-826 테스트) 산하에서 완전히 구현·배포되어 있다. 그 결과물은 `docs/plan/incident-command-BF-821.md`(기획), `docs/design/incident-command-BF-821.md`(시안), `incident-command/{index.html,style.css,fixtures.js,command.js}`(구현), `tests/incident-command/BF826-e2e.test.js`(E2E)로 이미 커밋되어 있다.

BF-827 Epic 의 요구사항(incident 목록·severity·owner·timeline·recovery checklist 정보 구조, 화면 상태, deterministic fixture 스펙)은 BF-821 이 이미 다룬 범위와 **동일한 도메인**이다. 본 문서는 다음 두 가지 목적을 동시에 만족하도록 작성한다:

1. **파일 소유권 제약** — 본 planner task(BF-828)의 담당 파일 영역은 `docs/planning/incident-command-BF-827.md` 1개뿐이며, `incident-command/` 코드나 `docs/plan/incident-command-BF-821.md`는 수정 금지 대상이다(다른 페르소나 담당 영역 — Surgical Changes 원칙).
2. **AC 충족** — BF-828 수용 기준은 "기획 명세 문서에 데이터 모델·fixture 스펙·화면 상태 시나리오가 정의되어 있을 것"을 요구하며, 문서가 어느 경로에 있는지와 무관하게 독립적으로 읽혀야 한다(Epic BF-827 산하 후속 페르소나가 `docs/planning/` 경로만 보고도 작업 가능해야 함).

따라서 본 문서는 **기존 BF-821 스펙 및 현재 구현 코드를 1차 소스로 삼아 사양을 재정리(reverse-formalize)** 한 것이며, 코드나 UX를 새로 설계하지 않는다. 즉:

- 아래 정의된 데이터 모델·enum·상태 전이 규칙은 **현재 `incident-command/fixtures.js` · `command.js` 에 이미 구현되어 있는 그대로**를 기술한다.
- BF-827 Epic 에서 이 도메인을 확장(신규 필드, 신규 화면 상태 등)하고자 한다면, 그 확장 요구는 **본 문서 이후의 별도 변경 스펙**(추가 buddy task)으로 다뤄야 한다 — 본 문서 범위 밖(§8 비범위 참고).
- 만약 실제로는 BF-827 이 BF-821 과 무관한 **완전히 새로운 모듈**을 의도한 것이라면, 이는 Jira 상 확인이 필요한 모호함이다 — 그러나 Epic 설명에 명시된 요구 항목(목록/severity/owner/timeline/recovery checklist/empty·loading·error/deterministic fixture)이 기존 `incident-command/` 모듈의 정의와 문자 그대로 일치하므로, 새 모듈을 처음부터 설계하는 것은 이미 존재하는 코드와 충돌·중복만 낳는다(Simplicity First 위반). 본 planner 는 이 판단에 따라 "기존 구현의 공식 스펙 문서화"를 채택한다.

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [정보 구조 — Incident 데이터 모델](#3-정보-구조--incident-데이터-모델)
4. [Severity / Status / EventType Enum](#4-severity--status--eventtype-enum)
5. [Timeline 정보 구조 및 정렬 규칙](#5-timeline-정보-구조-및-정렬-규칙)
6. [Recovery Checklist 정보 구조 및 진행률 계산](#6-recovery-checklist-정보-구조-및-진행률-계산)
7. [화면 상태 — Loading / Empty / Error / Ready](#7-화면-상태--loading--empty--error--ready)
8. [Deterministic Fixture 데이터 스펙](#8-deterministic-fixture-데이터-스펙)
9. [Acceptance Criteria 매핑 (Given/When/Then)](#9-acceptance-criteria-매핑-givenwhenthen)
10. [Edge Case 목록](#10-edge-case-목록)
11. [비범위 (Out of Scope)](#11-비범위-out-of-scope)
12. [산출물 위치 및 참조 표](#12-산출물-위치-및-참조-표)

---

## 1. 개요

### 1.1 목적

운영자가 진행 중인 시스템 장애(incident)를 한 화면에서 파악할 수 있는 Incident Command Center SPA. 좌측에 severity 필터가 달린 장애 목록, 우측에 선택된 장애의 상세(담당자, timeline, recovery checklist)를 보여준다. 실시간 API 연동 없이 **정적 fixture 데이터**로만 동작하는 `vanilla-static` 모듈이다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 대상 경로 | `incident-command/` (기존 — 신규 생성 아님) |
| 신규 코드 변경 | 없음 (본 task 는 기획 문서만 산출) |
| 데이터 원천 | `incident-command/fixtures.js` — 정적 배열, 네트워크 호출 없음 |
| 외부 라이브러리 | 없음 — `file://` 프로토콜 직접 열기 가능 |
| 영속 저장 | 없음 — 체크리스트 토글은 세션 in-memory 상태(새로고침 시 fixture 초기값으로 리셋) |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전) 또는 Node.js(`node --test`)로 순수 함수 단위 테스트
- `incident-command/` 4개 파일(`index.html`/`style.css`/`fixtures.js`/`command.js`)이 이미 저장소에 존재
- `fixtures.js`/`command.js` 는 UMD 패턴 — Node(CommonJS) + 브라우저(`globalThis`) 양쪽 로드 가능

---

## 2. 용어 정의

| 용어 | 정의 |
|------|------|
| Incident | 하나의 장애 사건. `id`/`title`/`severity`/`status`/`owner`/`timeline`/`checklist` 로 구성된 레코드 |
| Severity | 장애의 심각도 등급(P1~P4, 숫자가 낮을수록 심각) — 고정값, 계산으로 파생되지 않음 |
| Status | 장애 대응 라이프사이클 단계(감지→조사→조치→모니터링→해결) |
| Owner | 현재 장애를 담당하는 개인(이름)과 소속 팀 |
| Timeline | 장애 발생부터 현재까지의 이벤트 이력(시각순 배열) |
| Recovery Checklist | 장애 해결을 위한 조치 항목 목록. 각 항목은 완료 여부(`done`)와 완료 시각(`completedAt`)을 가짐 |
| Fixture | 실제 API 없이 화면에 주입되는 정적 배열 데이터(`fixtures.js` 의 `INCIDENTS`) |

---

## 3. 정보 구조 — Incident 데이터 모델

### 3.1 Incident 레코드 스키마

```javascript
{
  id: "INC-3001",              // 표시/식별용 내부 ID, 패턴 /^INC-\d+$/ (Jira 키 아님)
  title: "결제 게이트웨이 타임아웃 급증",   // 1자 이상 문자열
  severity: "P1",              // §4 enum, 고정값(계산 아님)
  status: "investigating",     // §4 enum
  owner: { name: "김온콜", team: "Payments" },  // §3.2
  detectedAt: "2026-07-14T02:10:00+09:00",  // ISO 8601, +09:00 오프셋 고정
  updatedAt: "2026-07-14T02:45:00+09:00",   // ISO 8601, detectedAt 이상(사전순 비교)
  timeline: [ /* §5 TimelineEvent[], 길이 ≥ 1 */ ],
  checklist: [ /* §6 ChecklistItem[], 길이 ≥ 0 — 빈 배열 허용 */ ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | `string` (`/^INC-\d+$/`) | ✅ | 목록/상세 식별 키 |
| `title` | `string` (1자 이상, 공백만 불가) | ✅ | 장애 제목 |
| `severity` | enum `P1\|P2\|P3\|P4` | ✅ | §4.1 |
| `status` | enum `detected\|investigating\|mitigating\|monitoring\|resolved` | ✅ | §4.2 |
| `owner` | `{ name, team }` (둘 다 1자 이상 문자열) | ✅ | §3.2 |
| `detectedAt` | ISO 8601 문자열, `+09:00` 오프셋 고정 | ✅ | 최초 감지 시각 |
| `updatedAt` | ISO 8601 문자열, `+09:00` 오프셋 고정 | ✅ | 최근 갱신 시각, `updatedAt >= detectedAt`(사전순 비교) |
| `timeline` | `TimelineEvent[]`, 길이 ≥ 1 | ✅ | §5 |
| `checklist` | `ChecklistItem[]`, 길이 ≥ 0 | ✅ | §6 |

### 3.2 Owner 서브 스키마

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | `string` (1자 이상) | ✅ | 담당자 표시 이름 |
| `team` | `string` (1자 이상) | ✅ | 소속 팀명 |

목록 행과 상세 헤더 모두 `owner.name` 첫 글자를 아바타로, `name`/`team` 을 텍스트로 표시한다. Owner 는 장애당 1인만 존재하며(공동 담당자 배열 아님), 담당자 변경 이력은 timeline 이벤트(`actor` 필드)로 추적되고 `owner` 필드 자체는 "현재 담당자" 스냅샷이다.

### 3.3 시각(timestamp) 표기 공통 규칙

`detectedAt`/`updatedAt`/`timeline[].timestamp`/`checklist[].completedAt` 모두 **`YYYY-MM-DDTHH:mm:ss+09:00`** 포맷으로 오프셋이 고정된다. 시간 순서 판정은 `new Date()` 파싱이 아니라 **문자열 사전순(lexicographic) 비교**로만 수행한다 — 오프셋·자릿수가 고정이므로 사전순 비교가 곧 시간순 비교와 항상 일치하며, 테스트 실행 머신의 타임존에 좌우되지 않는다(결정론적 fixture 요구사항의 근거, §8).

---

## 4. Severity / Status / EventType Enum

### 4.1 Severity (심각도)

| 값 | 한국어 라벨 | 의미 |
|----|------------|------|
| `P1` | 치명 | 서비스 핵심 기능 마비 수준 |
| `P2` | 높음 | 주요 기능 저하, 우회 가능 |
| `P3` | 보통 | 부분 기능 영향, 사용자 체감 낮음 |
| `P4` | 낮음 | 경미한 이상 징후, 예방적 대응 |

숫자가 낮을수록 심각도가 높다(P1 이 최상위). 목록에서 severity 필터 칩(전체/P1/P2/P3/P4)으로 필터링 가능.

### 4.2 Status (진행 상태) — 5단계 라이프사이클

| 값 | 한국어 라벨 | 의미 |
|----|------------|------|
| `detected` | 감지됨 | 자동 알림으로 최초 감지, 담당자 미착수 |
| `investigating` | 조사중 | 담당자가 원인 조사 중 |
| `mitigating` | 조치중 | 원인 확인 후 완화 조치 진행 중 |
| `monitoring` | 모니터링 | 조치 적용 후 재발 여부 관찰 중 |
| `resolved` | 해결됨 | 장애 종결 |

### 4.3 EventType (timeline 이벤트 유형)

| 값 | 한국어 라벨 | 의미 |
|----|------------|------|
| `detected` | 감지 | 최초 감지 이벤트(모든 timeline 의 첫 원소) |
| `update` | 진행 갱신 | 조사/조치 진행 상황 기록 |
| `escalated` | 에스컬레이션 | 심각도 상향 또는 추가 담당자 투입 |
| `resolved` | 해결 | 장애 종결 이벤트(있다면 timeline 의 마지막 원소) |

---

## 5. Timeline 정보 구조 및 정렬 규칙

### 5.1 TimelineEvent 스키마

```javascript
{
  timestamp: "2026-07-14T02:10:00+09:00",
  actor: "모니터링 시스템",   // 자동 감지는 시스템명, 이후는 담당자 이름
  eventType: "detected",       // §4.3 enum
  note: "결제 승인 API 5xx 비율 12% 초과 — 자동 알림 발생"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `timestamp` | ISO 8601, `+09:00` 고정 | ✅ | 이벤트 발생 시각 |
| `actor` | `string` (1자 이상) | ✅ | 이벤트 발생 주체(사람 이름 또는 시스템명) |
| `eventType` | enum §4.3 | ✅ | 이벤트 유형 |
| `note` | `string` (1자 이상) | ✅ | 이벤트 설명 |

### 5.2 검증 규칙 (재해석 금지)

1. `timeline[0].eventType === 'detected'` — 첫 이벤트는 항상 감지
2. `status === 'resolved'` ⟺ `timeline[마지막].eventType === 'resolved'` (양방향 동치)
3. `eventType === 'resolved'` 인 이벤트는 timeline 내 **정확히 0개 또는 1개**, 있다면 반드시 마지막 원소
4. `timeline[].timestamp` 는 **비내림차순**(직전 원소 이상, 사전순 비교) — 역행 금지

### 5.3 표시 형식

상세 패널에서는 전체 날짜+시각(`formatFullDateTime`, 예: `2026-07-14 02:45`), 목록 행에서는 축약 날짜+시각(`formatShortDateTime`, 예: `07-14 02:45`)을 사용한다. 문자열 슬라이스만으로 포맷팅하며 `new Date()` 파싱을 거치지 않는다(§3.3 결정론 원칙과 동일).

---

## 6. Recovery Checklist 정보 구조 및 진행률 계산

### 6.1 ChecklistItem 스키마

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
| `id` | `string` (1자 이상, 장애 내 유니크) | ✅ | 체크박스 식별 키 |
| `text` | `string` (1자 이상) | ✅ | 조치 항목 설명 |
| `done` | `boolean` | ✅ | 완료 여부 |
| `completedAt` | `string \| null` | ✅ | `done===true` → non-null ISO, `done===false` → 반드시 `null` |

### 6.2 진행률 계산 공식 (고정)

| 값 | 계산식 |
|----|--------|
| `total` | `checklist.length` |
| `done` | `checklist.filter(i => i.done === true).length` |
| `percent` | `total === 0 ? 0 : Math.round(done / total * 100)` |

- `percent` 는 반올림 정수(예: 1/3 → `33`).
- 체크리스트 진행률은 `status` 필드와 **연동되지 않는다** — 100% 완료돼도 담당자가 별도로 `status` 를 `resolved` 로 갱신해야 한다.
- `checklist.length === 0` 인 장애(감지 직후, 아직 조치 항목 미정의)는 진행률 바 대신 고정 문구 **"해당 장애에 등록된 복구 체크리스트가 없습니다."** 를 표시한다.

### 6.3 토글 동작

체크박스 토글 시 `completedAt` 은 토글 시점의 KST ISO 시각으로 갱신(체크 시)되거나 `null` 로 리셋(체크 해제 시)된다. 이 상태는 **세션 in-memory** 이며 새로고침 시 fixture 초기값으로 되돌아간다(영속 저장 비범위, §11).

---

## 7. 화면 상태 — Loading / Empty / Error / Ready

본 화면은 실제 네트워크 호출이 없으므로 네 상태 모두 **결정론적**으로 정의된다(무작위 지연·재시도 없음).

### 7.1 상태 판정 파이프라인 (고정)

```
rawItems = fixtures.js 의 INCIDENTS
result = loadIncidents(rawItems)          // 동기 함수, 인위적 지연 없음

result.ok === false                        → viewState = 'error'
result.ok === true && incidents.length===0 → viewState = 'empty'
result.ok === true && incidents.length>0   → viewState = 'ready'
```

초기화(`init()`)는 이 판정을 **동기적으로 1회** 수행한다. 재시도/폴링/타임아웃 개념은 존재하지 않는다.

### 7.2 Loading 상태

- 인위적 `setTimeout` 으로 흉내내지 않는다. `index.html` 의 정적 마크업 자체가 `data-view-state="loading"` 스켈레톤(목록/상세 영역 placeholder 블록)을 담고 있고, 스크립트 실행 즉시 §7.1 판정으로 `ready`/`empty`/`error` 중 하나로 교체된다.
- "로딩" 은 브라우저가 HTML 을 파싱하고 스크립트가 아직 실행되지 않은 짧은 순간에만 존재하는 실제 상태(가짜 지연 아님) — 네트워크 없는 화면에서도 빈 화면 깜빡임을 방지하기 위함.
- 검증 방법: 스크립트 실행 전 raw HTML 소스에서 `data-view-state="loading"` 마크업 존재 확인. 실행 후에는 항상 `ready`/`empty`/`error` 중 하나여야 한다(`loading` 고착은 버그).

### 7.3 Empty 상태

- 노출 조건: `loadIncidents(rawItems).incidents.length === 0`
- 고정 문구: **"표시할 장애가 없습니다."**
- 실제 배포 fixture(`INCIDENTS`, 6건)에서는 발생하지 않는 방어적 상태이나, `loadIncidents([])` 직접 호출 단위 테스트로 항상 검증 가능해야 한다.
- 목록 필터(심각도) 적용 결과 0건인 경우는 **다른 상태**다 — §7.5 참고(최상위 empty 와 구분).

### 7.4 Error 상태

- 노출 조건: `loadIncidents(rawItems).ok === false`(스키마 검증 실패) 또는 fixture 전역 객체 자체가 없음(`IncidentCommandFixtures` undefined)
- 고정 문구: **"장애 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요."**
- "재시도" 버튼 없음 — 외부 API 가 없는 화면에서 재시도는 새로고침과 동일 효과이므로 안내 문구로 충분(Simplicity First).
- 실제 배포 fixture 는 단위 테스트로 항상 valid 함이 보증되므로 방어적 상태이나, "fixture 손상 시 화면이 깨지지 않고 안전하게 실패한다"는 계약을 위해 정의한다.

### 7.5 필터 결과 0건 (Empty 와 구분되는 부분 상태)

최상위 `viewState` 는 `ready` 를 유지한 채, 심각도 필터 적용 결과 목록이 0건이면 `#incident-list` 를 숨기고 별도 안내 블록(`#filter-empty`)을 노출한다 — 문구: **"해당 심각도의 장애가 없습니다."** + "필터 초기화" 버튼. 이는 §7.3 최상위 empty 상태와 발생 조건·문구·UI 위치가 모두 다르므로 혼동 없이 구분 표기한다.

---

## 8. Deterministic Fixture 데이터 스펙

### 8.1 결정론 요구사항

- `fixtures.js` 는 순수 정적 배열만 export 한다 — `Date.now()`/`Math.random()`/네트워크 호출 0건.
- 모든 timestamp 는 `+09:00` 오프셋 고정 문자열(§3.3)이라 테스트 실행 머신의 타임존/현재 시각에 무관하게 항상 동일한 값을 반환한다.
- `command.js` 의 순수 함수(`validateIncidentRecord`/`loadIncidents`/`filterIncidentsBySeverity`/`calculateChecklistProgress`/`toggleChecklistItem`)는 모두 입력에 대해 동일 출력을 보장하며 원본 배열을 mutate 하지 않는다.

### 8.2 샘플 데이터 구성 (6건 — 현재 구현 기준)

| id | severity | status | owner | timeline 건수 | checklist (done/total) |
|----|----------|--------|-------|---------------|--------------------------|
| INC-3001 | P1 | investigating | 김온콜 · Payments | 4 | 2/4 |
| INC-3002 | P2 | mitigating | 이인프라 · Platform | 3 | 1/3 |
| INC-3003 | P3 | monitoring | 박인증 · Identity | 3 | 2/2 |
| INC-3004 | P4 | detected | 최데이터 · Data | 1 | 0/0 (빈 체크리스트) |
| INC-3005 | P2 | resolved | 정보안 · Security | 5 (마지막 resolved) | 3/3 |
| INC-3006 | P1 | investigating | 한온콜 · Notifications | 4 (escalated 포함) | 3/5 |

이 6건 구성은 다음 edge case 를 최소 1건씩 커버하도록 설계되어 있다(§10과 연결):

- 빈 체크리스트(INC-3004) → §6.2 안내 문구 경로
- resolved 상태 + timeline 마지막이 resolved(INC-3005) → §5.2 규칙 2 양방향 검증
- escalated 이벤트로 severity 상향 이력(INC-3006) → §4.3 eventType 다양성
- 체크리스트 100% 완료지만 status 는 resolved 아님(INC-3003) → §6.2 독립성 원칙

### 8.3 확장 시 규칙

향후 fixture 건수를 늘리거나 신규 필드를 추가할 경우, 반드시 §3~§6 스키마와 §5.2 검증 규칙을 만족해야 하며 `validateIncidentRecord` 단위 테스트로 회귀 검증한다. 신규 enum 값 추가는 본 문서 개정 + 별도 변경 티켓으로 처리한다(본 task 범위 밖).

---

## 9. Acceptance Criteria 매핑 (Given/When/Then)

### AC-01: Incident 데이터 모델 문서화
- **Given** Epic BF-827 요구
- **When** 본 기획 명세 문서를 작성하면
- **Then** incident 데이터 모델(`severity`/`owner`/`timeline`/`checklist`)이 §3~§6 에 필드 단위로 정의된다

### AC-02: Fixture 스펙 문서화
- **Given** deterministic fixture 데이터 요구
- **When** 본 명세를 검토하면
- **Then** §8 에 fixture 결정론 요구사항과 6건 샘플 데이터 구성표가 정의된다

### AC-03: 화면 상태 시나리오 문서화
- **Given** 화면 상태(empty/loading/error) 요구
- **When** 본 명세를 검토하면
- **Then** §7 에 loading/empty/error/ready 4개 상태의 노출 조건·고정 문구·판정 파이프라인이 문서화되어 있다

### AC-04: 기존 구현과의 정합성
- **Given** `incident-command/` 모듈이 이미 구현되어 있는 상태
- **When** 본 문서의 스키마·상태 정의를 실제 `fixtures.js`/`command.js` 와 대조하면
- **Then** 필드명·enum 값·검증 규칙·고정 문구가 100% 일치한다(§0 전제 참고)

---

## 10. Edge Case 목록

| # | 시나리오 | 처리 |
|---|----------|------|
| EC-01 | 체크리스트가 빈 배열인 장애 | §6.2 안내 문구, 진행률 바 미표시 |
| EC-02 | 체크리스트 100% 완료 + status 는 미해결 | §6.2 독립성 원칙 — status 자동 변경 없음 |
| EC-03 | 심각도 필터로 선택된 장애가 목록에서 사라짐 | 선택 해제(미선택 상태로 전환) — §7.5 |
| EC-04 | 필터 적용 결과 0건 | §7.5 filter-empty 안내 + 필터 초기화 버튼(최상위 empty 와 구분) |
| EC-05 | fixture 배열이 비어있음(`[]`) | §7.3 최상위 empty 상태(방어적, 실제 미발생) |
| EC-06 | fixture 스키마 검증 실패 또는 전역 객체 부재 | §7.4 error 상태(방어적, 실제 미발생) |
| EC-07 | timeline 에 resolved 가 2건 이상 | 검증 실패 → loadIncidents 가 에러 반환(§5.2 규칙 3) |
| EC-08 | timeline timestamp 역행 | 검증 실패(§5.2 규칙 4) |
| EC-09 | checklist id 중복 | 검증 실패 |

---

## 11. 비범위 (Out of Scope)

- `incident-command/` 코드(HTML/CSS/JS) 신규 작성 또는 수정 — 이미 구현되어 있으며 본 task 담당 영역 아님
- 신규 필드/엔드포인트/실시간 API 연동 설계 — 별도 변경 티켓 필요
- 체크리스트 토글 영속 저장(localStorage/서버) — 세션 in-memory 로 충분(§6.3)
- status 와 checklist 완료율 자동 동기화 로직
- 디자인 시안(색상/레이아웃) — designer 페르소나 영역

---

## 12. 산출물 위치 및 참조 표

| 문서/코드 | 경로 | 관계 |
|-----------|------|------|
| 본 기획 명세 | `docs/planning/incident-command-BF-827.md` | 본 문서(BF-827 Epic 산하) |
| 선행 기획 명세 | `docs/plan/incident-command-BF-821.md` | 1차 소스 — 데이터 모델·상태 정의의 원 출처 |
| 선행 디자인 시안 | `docs/design/incident-command-BF-821.md` | 시각 규칙 참고(본 문서는 재해석하지 않음) |
| 구현 코드 | `incident-command/{index.html,style.css,fixtures.js,command.js}` | 본 문서가 기술하는 실제 구현체 |
| E2E 테스트 | `tests/incident-command/BF826-e2e.test.js` | 화면 상태·체크리스트 토글 회귀 가드 |

**후속 페르소나 안내:** BF-827 Epic 산하 designer/developer/tester 페르소나는 본 문서(§3~§8)를 1차 참조하되, 시각적 세부사항은 기존 `docs/design/incident-command-BF-821.md` 를 함께 참고할 것. 만약 BF-827 이 기존 모듈에 대한 **실질적 확장**(신규 필드, 신규 상태, 신규 화면)을 의도한 것이라면 그 요구사항을 Jira 코멘트로 명확히 해줄 것을 요청한다 — 본 문서는 그 확장 범위를 다루지 않는다(§0 가정 참고).

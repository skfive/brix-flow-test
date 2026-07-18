# 교대 인수인계 누락 점검 서비스 기획 명세 — BF-1049

> 작성자: [박기획] (planner) · 작성일 2026-07-18
> 관련 티켓: BF-1049 (본 planner task) · 부모 Epic: 미제공(RUN_CONTEXT `dependency.jira` 미기재 — Epic 설명 텍스트만 전달됨)
> 형제 task: BF-1050 (designer) · BF-1051 (developer) · BF-1053 (tester)
> 대상 모듈: `demo/handoff-gap-canary/` (신규 모듈 — 현재 저장소에 코드 없음, 확인 완료)
> tech-stack: Epic 설명 태그는 `typescript-monorepo` 이나, 본 저장소 REPO_CONVENTION_CAPSULE(관측 기준 `base_sha=2d4ce2c`)이 `observed_stack=vanilla-static`, `route_mapping=root-relative-static`, `expected_entry_path=demo/handoff-gap-canary/index.html` 로 확정하고 `stack_mismatch=true` 임을 명시한다. 본 문서는 요청 태그 대신 **관측값을 authority로 채택**한다(가정 1).
> 단위 테스트: `node --test tests/handoff-gap-canary-*.test.js` (focused scope · module: `handoff-gap-canary`) — 확인 결과 현재 매칭 파일 없음(exit 0, `# tests 0`), tester(BF-1053) 단계에서 신규 작성 예정.

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

본 문서는 BF-1049 Epic 산하 교대 인수인계 누락 점검(handoff-gap-canary) 서비스의 **단일 기준(single source of truth) 도메인 명세**다. 현재 저장소에 `handoff-gap-canary` 코드가 전혀 존재하지 않으므로(신규 모듈, `demo/handoff-gap-canary/`·`src/app/demo/handoff-gap-canary/`·`docs/design/handoff-gap-canary-BF-1049.md`·`docs/design/handoff-gap-canary-BF-1050.md` 모두 미존재 확인), 이 문서는 기존 구현을 역기술하는 것이 아니라 **처음부터 설계**한 명세다.

**본 planner task(BF-1049)의 담당 파일 영역은 `docs/planning/handoff-gap-canary-BF-1049.md` 1개뿐**이며, 코드 작성·디자인 시안 작성·`demo/handoff-gap-canary/**` 직접 구현은 금지 대상이다(Surgical Changes 원칙, EFFECTIVE_TASK_SCOPE `owned_paths: docs/planning/**`). 이 문서는 designer(BF-1050)·developer(BF-1051)·tester(BF-1053)가 각자 작업을 시작할 때 참조하는 단일 기준 스펙이다.

**가정 명시 (모호했던 지점, 본 문서에서 확정):**

- **가정 1 (대상 경로 및 스택 — 요청 태그 대신 관측값 채택, developer 전달 필수)**: Epic 설명 태그(`typescript-monorepo`)와 REPO_CONVENTION_CAPSULE 관측값(`vanilla-static`)이 불일치(`stack_mismatch=true`)한다. RUN_CONTEXT correction 지침에 따라 요청 마커가 아닌 관측값·검증 명령·route mapping을 authority로 채택한다. 즉 신규 모듈은 저장소 루트의 `demo/handoff-gap-canary/index.html` (serve_root `.`, root-relative-static 라우팅)에 위치하며, 빌드 스텝 없는 순수 HTML/CSS/JS 로 구현한다(TS 빌드체인 도입 금지 — Simplicity First). **developer(BF-1051)는 `src/app/**` 하위가 아니라 저장소 루트 `demo/handoff-gap-canary/`에 구현해야 한다** — 이 교정 사항은 Jira 코멘트로도 명시 전달한다.
- **가정 2 (필수값 검증 대상은 Epic이 열거한 4개 필드로 한정)**: Epic 설명이 명시한 "담당자·기한·상태·후속 액션" 4개 필드만 필수 값 검증(누락 판정) 대상으로 확정한다. 그 외 필드(업무명 등 표시용 필드)는 비필수로 둔다 — 추측성 확장 금지.
- **가정 3 (로컬 보완 입력은 "후속 액션" 1개 필드로 한정)**: 담당자/기한/상태 3개 필드는 교대 인계 시점에 이미 확정된 fixture 고정값으로 취급하고 런타임 편집 UI를 두지 않는다. 운영자가 근무 중 유일하게 보완 가능한 값은 **후속 액션** 텍스트뿐이다(정확한 담당자 재배정/기한 변경 UI는 Epic 설명에 없음 — `docs/planning/delivery-exceptions-canary-BF-1030.md` 가정 2·3과 동일한 관례 적용, Simplicity First). 로컬 보완은 항목당 최신 1건 덮어쓰기다.
- **가정 4 (기한 초과 판정은 결정론적 상수 기준 시각 사용)**: "기한 초과" 판정은 `Date.now()` 등 실제 시스템 시각이 아니라 fixture 에 고정 상수로 포함된 `referenceNow` 값을 기준으로 계산한다 — 수용 기준 3의 "결정론적 fixture 요구" 충족을 위함. developer/tester 는 `Date.now()`/`Math.random()` 을 판정 로직에 사용해서는 안 된다.
- **가정 5 (위험 등급은 4단계, 우선순위 명시)**: 위험 요약은 `정상(normal)` / `데이터 누락(data_gap)` / `기한 초과(deadline_exceeded)` / `복합 위험(critical)` 4단계로 정의하고, 두 조건이 동시에 성립하면 `critical` 이 최우선 표시된다(§5.3 우선순위 규칙).
- **가정 6 (외부 API·DB 없음)**: Epic 설명대로 외부 API·DB 스키마는 추가하지 않는다. 데이터 원천은 정적 deterministic fixture 배열이며, 사용자 입력(로컬 후속 액션 보완)만 `localStorage` 에 저장한다.

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [데이터 모델](#3-데이터-모델)
4. [필수 값 검증 규칙](#4-필수-값-검증-규칙)
5. [위험 요약 판정 로직 — 위험 상태 전환 규칙](#5-위험-요약-판정-로직--위험-상태-전환-규칙)
6. [필터 규칙](#6-필터-규칙)
7. [로컬 보완 입력 및 재계산 흐름](#7-로컬-보완-입력-및-재계산-흐름)
8. [Deterministic Fixture 데이터 스펙](#8-deterministic-fixture-데이터-스펙)
9. [라우트 진입/렌더 조건 — `/demo/handoff-gap-canary`](#9-라우트-진입렌더-조건--demohandoff-gap-canary)
10. [Acceptance Criteria 매핑](#10-acceptance-criteria-매핑)
11. [Edge Case 목록](#11-edge-case-목록)
12. [비범위 (Out of Scope) 및 보존 영역 정책](#12-비범위-out-of-scope-및-보존-영역-정책)
13. [산출물 위치 및 참조 표](#13-산출물-위치-및-참조-표)

---

## 1. 개요

### 1.1 목적

교대 근무자가 인계받은 인수인계 항목(담당자·기한·상태·후속 액션)을 한 화면에서 조회하고, **필수 값이 누락되었거나 기한이 초과된 항목을 위험으로 즉시 식별**할 수 있는 handoff-gap-canary 서비스. 목록(위험 유형 필터 포함)·상세 패널·후속 액션 로컬 보완 입력 3개 기능과, 이를 뒷받침하는 위험 요약 집계 패널로 구성된다. 실시간 API 연동 없이 **결정적(deterministic) fixture 데이터 + localStorage(후속 액션 보완만) 영속화**로만 동작한다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 대상 경로 | `demo/handoff-gap-canary/` (신규 — developer(BF-1051)가 생성, 가정 1) |
| 신규 코드 변경 | 없음 (본 task는 기획 문서만 산출) |
| 데이터 원천 | 정적 fixture 배열(§8)뿐. 담당자/기한/상태 원본 필드는 런타임에 변경되지 않는다 |
| 로컬 영속 저장 | `localStorage` — **후속 액션 보완 텍스트만** 저장(§7). fixture 원본 데이터는 저장 대상이 아니다 |
| 외부 API·DB | 없음 — 서버 요청·DB 스키마 0건(가정 6) |

### 1.3 전제 조건

- 브라우저 환경 또는 Node.js(`node --test`)로 순수 함수(검증/위험 판정/필터 로직) 단위 테스트가 가능해야 한다.
- `localStorage` 미지원/차단 환경(프라이빗 모드 quota 등)에서도 크래시 없이 in-memory 폴백으로 동작해야 한다(§7.5 R3).

---

## 2. 용어 정의

| 용어 | 정의 |
|------|------|
| Handoff Item (인수인계 항목) | 교대 시 전달되는 업무 단위. `id`/`taskName`/`assignee`/`dueAt`/`status`/`followUpAction` 등으로 구성(§3) |
| 필수 값 (Required Field) | 담당자·기한·상태·후속 액션 4개 필드 — 값이 비어 있으면 "데이터 누락" 위험 판정 대상(§4) |
| 데이터 누락 (Data Gap) | 필수 값 4개 중 하나 이상이 비어 있거나 유효하지 않은 상태(§4, §5.1) |
| 기한 초과 (Deadline Exceeded) | `dueAt` 이 결정론적 기준 시각(`referenceNow`)보다 과거이고 `status` 가 완료(`done`)가 아닌 상태(§5.2) |
| 위험 등급 (Risk Level) | 항목별로 파생 계산되는 `normal`/`data_gap`/`deadline_exceeded`/`critical` 4단계 값(§5.3) |
| 위험 요약 (Risk Summary) | 전체 fixture(+로컬 보완 반영) 기준 위험 등급별 집계 카운트를 보여주는 패널(§5.4) |
| Risk Filter (위험 유형 필터) | 목록 화면에서 위험 등급 기준으로 표시 대상을 좁히는 클라이언트 사이드 필터(§6) |
| 후속 액션 로컬 보완 (Local Follow-up Override) | 운영자가 후속 액션 필드에 남기는 자유 텍스트 보완 입력. `localStorage` 에만 저장되며 fixture 데이터와 분리된 별도 오버레이(§7) |
| Fixture | 최초 실행 시 사용되는 정적 deterministic 인수인계 항목 배열 + 기준 시각 상수(§8) |

---

## 3. 데이터 모델

### 3.1 HandoffItem 필드

| 필드 | 타입 | 필수 값 검증 대상 | 설명 |
|------|------|------|------|
| `id` | string | 아니오 | 고유 식별자. 패턴 `HO-####`(4자리 숫자, fixture 는 `2001`부터 순차) |
| `taskName` | string | 아니오(표시용) | 인수인계 대상 업무명 |
| `assignee` | string \| null | **예** | 담당자 이름. 빈 문자열/공백/`null`/`undefined` 는 누락(§4.1) |
| `dueAt` | string(ISO8601, `+09:00`) \| null | **예** | 기한. 빈 값이거나 ISO8601 로 파싱 불가하면 누락(§4.1) |
| `status` | enum \| null | **예** | 처리 상태 — §3.2 3종 중 하나가 아니면 누락(§4.1) |
| `followUpAction` | string \| null | **예** | 다음 근무자에게 전달할 후속 조치 텍스트. 빈 문자열/공백/`null`/`undefined` 는 누락. **로컬 보완 가능한 유일한 필드**(§7) |

### 3.2 Status(처리 상태) enum — 3종 고정

| 값 | 한글 라벨 | 의미 |
|---|---|---|
| `pending` | 대기 | 인계 항목이 등록되었으나 조치 시작 전 |
| `in_progress` | 진행중 | 다음 근무자가 조치를 진행 중 |
| `done` | 완료 | 인계 항목 처리가 완료됨 — **완료 시 기한 초과 판정에서 제외**(§5.2) |

3종 이상으로 확장하지 않는다 — Epic 설명에 추가 상태 요구가 없으므로 추측성 확장 금지(Simplicity First). 위 3종에 속하지 않는 임의 값(오타, 다른 enum 값 등)은 **누락과 동일하게 취급**한다(§4.1 V-status).

### 3.3 목록 표시 순서

목록 표시 순서는 fixture 정의 순서(§8.2)를 그대로 따르며 런타임 재정렬(정렬 UI)을 하지 않는다 — `delivery-exceptions-canary`(BF-1030) 선례와 동일 관례. 정렬 UI는 비범위(§12)다.

---

## 4. 필수 값 검증 규칙

### 4.1 필드별 누락 판정 규칙

| # | 필드 | 판정 규칙 |
|---|---|---|
| V-assignee | `assignee` | `null`/`undefined`/`""`/공백만으로 구성된 문자열 → 누락 |
| V-dueAt | `dueAt` | `null`/`undefined`/`""` 이거나, 값이 있어도 `Date` 파싱 실패(Invalid Date) → 누락. **파싱 불가는 오류가 아니라 누락으로 취급**(크래시 금지) |
| V-status | `status` | `null`/`undefined`/`""` 이거나 §3.2 3종(`pending`/`in_progress`/`done`) 에 속하지 않는 값 → 누락 |
| V-followUp | `followUpAction` | `null`/`undefined`/`""`/공백만으로 구성된 문자열 → 누락. **단, §7 로컬 보완이 저장되어 있으면 그 값으로 재판정**(로컬 값이 유효하면 누락 해소) |

### 4.2 항목 단위 데이터 누락(Data Gap) 플래그

4개 필드 중 **하나 이상**이 §4.1 규칙상 누락이면 해당 항목의 `hasDataGap = true`. 어떤 필드가 몇 개 누락되었는지는 상세 패널에 개별 표시하되(§9.4), 위험 등급 판정(§5)에는 "하나 이상 누락 여부"만 사용한다(Simplicity First — 누락 개수별 등급 세분화는 Epic 요구에 없음).

### 4.3 검증은 순수 함수, 부작용 없음

검증 로직은 항목 데이터(fixture 원본 + 로컬 오버라이드 병합 결과)만 입력받는 순수 함수로 구현하며, 검증 자체가 데이터를 변경하거나 fixture를 재기록하지 않는다.

---

## 5. 위험 요약 판정 로직 — 위험 상태 전환 규칙

### 5.1 데이터 누락 위험 상태 전환 규칙

- **전제**: §4.2 의 `hasDataGap` 플래그.
- **전환 규칙**: `hasDataGap === true` 이면 해당 항목은 최소 `data_gap` 등급 이상으로 전환된다. `hasDataGap === false` 이면 이 축에서는 위험이 발생하지 않는다.
- **해소 조건**: 로컬 보완(§7)으로 `followUpAction` 누락이 해소되고, 나머지 3개 필드(`assignee`/`dueAt`/`status`)도 모두 유효하면 `hasDataGap` 은 `false` 로 재계산된다. `assignee`/`dueAt`/`status` 는 fixture 고정값이라 런타임에 해소될 수 없으므로(가정 3), 이 3개 필드 중 하나라도 원본 누락이면 해당 항목은 로컬 보완 이후에도 `data_gap` 계열 위험에서 완전히 벗어날 수 없다.

### 5.2 기한 초과 위험 상태 전환 규칙

- **전제**: fixture 상수 `referenceNow`(§8.1), 항목의 `dueAt`, `status`.
- **전환 규칙**: 아래 3개 조건이 **모두** 성립할 때만 `hasDeadlineExceeded = true`:
  1. `dueAt` 이 §4.1 V-dueAt 규칙상 유효(파싱 가능)하다.
  2. 파싱된 `dueAt` 이 `referenceNow` 보다 이전이다(`dueAt < referenceNow`).
  3. `status` 가 §3.2 3종 중 유효한 값이며 `'done'` 이 **아니다**. `status` 가 누락(유효하지 않음)인 경우 "완료가 아님"으로 간주해 이 조건은 성립한다(즉 status 누락 항목은 기한 초과 검사 대상에서 제외되지 않는다 — §8.2 `HO-2004` 참고).
- **해소 조건**: `dueAt` 은 fixture 고정값이며 로컬 보완 대상이 아니므로(가정 3), 기한 초과 위험은 런타임에 해소될 수 없다 — 오직 `status` 원본이 이미 `'done'` 인 경우에만 애초에 발생하지 않는다.
- **`dueAt` 자체가 누락/파싱 불가인 경우**: 조건 1이 성립하지 않으므로 `hasDeadlineExceeded` 는 계산 불능 → **`false` 로 고정**(판정 불가를 "초과 아님"으로 방어적 처리). 이 경우 이미 §4.1 V-dueAt 에 의해 `hasDataGap = true` 로 잡히므로 위험이 누락되지 않는다.

### 5.3 위험 등급(Risk Level) 산출 — 우선순위 규칙

| 우선순위 | 조건 | 등급 값 | 한글 라벨 |
|---|---|---|---|
| 1 | `hasDataGap === true` **그리고** `hasDeadlineExceeded === true` | `critical` | 복합 위험 |
| 2 | `hasDataGap === true` **그리고** `hasDeadlineExceeded === false` | `data_gap` | 데이터 누락 |
| 3 | `hasDataGap === false` **그리고** `hasDeadlineExceeded === true` | `deadline_exceeded` | 기한 초과 |
| 4 | `hasDataGap === false` **그리고** `hasDeadlineExceeded === false` | `normal` | 정상 |

등급 산출은 §5.1·§5.2 의 두 불리언 플래그로부터 결정론적으로 파생되는 **순수 함수**이며, 캐시하지 않고 매 렌더/재계산 시점(§7.4)마다 다시 계산한다(불일치 버그 방지).

### 5.4 위험 요약(Risk Summary) 집계 규칙

- 위험 요약 패널은 **필터와 무관하게 항상 전체 fixture(+로컬 보완 반영) 기준**으로 4개 등급별 건수(`normal`/`data_gap`/`deadline_exceeded`/`critical`)와 총 건수를 표시한다.
- 필터(§6)는 **목록의 표시 대상만** 좁히며, 위험 요약 집계 수치에는 영향을 주지 않는다 — 운영자가 "전체 위험 규모"와 "현재 보고 있는 부분집합"을 혼동하지 않도록 하기 위한 명시적 설계 결정(Simplicity First: 두 가지 집계 모드를 만들지 않는다).

---

## 6. 필터 규칙

### 6.1 위험 유형 필터 목록 (UI 드롭다운/탭 옵션)

| # | 필터 값 | 라벨 | 동작 |
|---|---|---|---|
| F0 | `all` | 전체 | 필터링 없이 fixture 전체 목록 표시(기본 선택값) |
| F1 | `normal` | 정상 | `riskLevel === 'normal'` 인 항목만 표시 |
| F2 | `data_gap` | 데이터 누락 | `riskLevel === 'data_gap'` 인 항목만 표시 |
| F3 | `deadline_exceeded` | 기한 초과 | `riskLevel === 'deadline_exceeded'` 인 항목만 표시 |
| F4 | `critical` | 복합 위험 | `riskLevel === 'critical'` 인 항목만 표시 |

- 필터는 **클라이언트 사이드 배열 필터링**이며 fixture 원본 배열이나 계산된 `riskLevel` 값을 변경하지 않는다(부분집합 뷰만 생성).
- 필터 변경 시에도 §3.3 목록 표시 순서(fixture 정의 순서)는 유지된다.
- 초기 진입 시 기본 필터는 `all`(F0)이다.
- 다중 선택(복수 등급 동시 필터)은 지원하지 않는다 — 단일 선택 방식(Simplicity First, Epic 설명에 다중 선택 요구 없음).

### 6.2 필터와 상세 패널 선택 상태의 관계

필터를 변경해도 이미 선택되어 상세 패널에 표시 중인 항목의 선택은 해제되지 않는다(해당 항목이 새 필터 결과에 없어 목록에서 보이지 않게 되더라도, 상세 패널은 계속 마지막 선택 항목을 표시한다). 필터는 **목록 표시에만** 영향을 준다 — §11 EC-03 참고.

---

## 7. 로컬 보완 입력 및 재계산 흐름

### 7.1 저장 키 및 envelope 구조

단일 키 `handoff-gap-canary:overrides` 에 아래 구조의 JSON 문자열을 저장한다(항목별 보완을 한 번에 원자적으로 읽고 쓰기 위해 항목당 별도 키 대신 단일 envelope 채택 — `delivery-exceptions-canary`(BF-1030) §6.1 관례와 동일):

```json
{
  "schemaVersion": 1,
  "overrides": {
    "HO-2007": { "followUpAction": "창고 재고 태그 부착 완료, 익일 오전 재검수 필요", "savedAt": "2026-07-18T10:00:00+09:00" }
  }
}
```

- `schemaVersion`(정수, 현재 `1`): envelope 구조 버전.
- `overrides`: 항목 `id` 를 키로 하는 맵. **키가 존재하지 않으면 해당 항목은 fixture 원본 `followUpAction` 값을 그대로 사용**한다.
- 각 보완 엔트리는 `followUpAction`(문자열)과 `savedAt`(ISO8601 저장 시각) 2개 필드만 가진다(가정 3 — 이력 배열 아님, 최신 1건 덮어쓰기).

### 7.2 입력 규칙

- 보완 입력은 상세 패널(§9.4)의 후속 액션 텍스트 영역 + 저장 버튼으로 이루어진다. **키 입력마다 자동 저장하지 않고, 명시적 저장 동작(버튼 클릭 등) 시점에만 `localStorage` 에 기록**한다(§11 EC-06).
- 저장 가능한 텍스트 길이: **1~200자**(trim 후 기준).
- 공백만 입력하거나 빈 문자열을 저장 시도하면 → **오버라이드 삭제**로 처리한다(§7.1 `overrides` 맵에서 해당 `id` 키 제거). 이는 오류가 아니라 정상 동작이며, 제거 후에는 다시 fixture 원본 `followUpAction` 값이 적용된다(원본이 애초 누락이었다면 §4.1 V-followUp 판정에 의해 "데이터 누락" 위험으로 복귀한다 — §11 EC-08).
- 200자를 초과하는 텍스트를 저장 시도하면 → 저장을 거부하고 검증 오류를 표시한다. 입력 필드의 값은 유지되어 사용자가 수정할 수 있다.
- 보완 입력은 대상 항목의 `assignee`/`dueAt`/`status` 를 변경하지 않는다(가정 3) — 오직 `followUpAction` 값만 오버라이드한다.

### 7.3 검증 규칙 (로드 시)

| # | 규칙 |
|---|---|
| V1 | `localStorage.getItem(KEY)` 가 `null` 이면 손상이 아니라 "보완 없음" 초기 상태 — 모든 항목이 fixture 원본 `followUpAction` 값으로 렌더(§11 EC-04) |
| V2 | 값이 존재하면 `JSON.parse` 가 예외 없이 성공해야 함 |
| V3 | 파싱 결과 최상위 타입이 순수 object 이고 `schemaVersion === 1`, `overrides` 가 object 여야 함 |
| V4 | `overrides` 의 각 엔트리는 `followUpAction`(1~200자 문자열)과 `savedAt`(문자열)을 가져야 함 — 위반 엔트리는 개별적으로 무시(해당 키만 드롭), envelope 전체를 손상 처리하지 않음(§7.5 R2) |
| V5 | `overrides` 의 키가 현재 fixture(§8)에 존재하지 않는 항목 `id` 를 참조하면 orphan 으로 간주해 무시 |

### 7.4 재계산 흐름 (판정 로직과의 연결)

1. 렌더/저장/삭제 등 오버라이드 상태가 바뀌는 모든 시점에, **fixture 원본 배열 전체**를 대상으로 아래 파생 계산을 다시 수행한다(부분 패치 금지 — 항상 전체 재계산으로 일관성 보장):
   - 각 항목에 오버라이드(§7.1)가 있으면 `followUpAction` 값을 오버라이드로 병합.
   - §4 필수 값 검증(`hasDataGap`) 재계산.
   - §5.2 기한 초과(`hasDeadlineExceeded`) 재계산(오버라이드는 `dueAt`/`status` 에 영향 없으므로 이 값은 변하지 않지만, 동일 파이프라인에서 함께 재계산해 일관성을 보장한다).
   - §5.3 `riskLevel` 재계산.
   - §5.4 위험 요약 집계 재계산.
2. **필터 변경은 재계산을 트리거하지 않는다** — 필터는 이미 계산된 `riskLevel` 배열에 대한 표시 단계 필터링일 뿐이다(§6.1).
3. 재계산은 매번 fixture 원본 + 최신 오버라이드로부터 새로 도출하는 순수 함수이며, 이전 계산 결과를 증분 수정하지 않는다(캐시 불일치 버그 방지).

### 7.5 손상 복구 절차

1. **R1 — envelope 전체 파싱 실패(V2/V3 위반) 시 전체 폴백**: 저장된 값을 신뢰하지 않고 보완 없음 상태(fixture 원본 그대로)로 렌더한다(크래시 금지). 기존 손상 데이터는 다음 저장 시 정상 envelope 으로 덮어써진다(즉시 재기록하지 않는다).
2. **R2 — 엔트리 단위 부분 무시(V4/V5 위반)**: envelope 자체는 유효하나 특정 엔트리만 규칙 위반이면 그 엔트리만 무시하고 나머지는 정상 표시한다.
3. **R3 — 저장 자체 불가 환경**: `setItem` 호출이 예외를 던지는 환경(프라이빗 모드 quota 초과 등)에서는 저장을 재시도하지 않고 in-memory 상태로만 보완 값을 유지한다. 새로고침 시 세션 내 보완 입력이 유실될 수 있다(§11 EC-07, 정상 동작으로 간주).

---

## 8. Deterministic Fixture 데이터 스펙

### 8.1 기준 시각 상수

```
referenceNow = "2026-07-18T09:00:00+09:00"
```

- `referenceNow` 는 fixture 모듈에 정의된 **고정 상수**이며, `Date.now()`/`new Date()`(인자 없이 현재 시각을 취하는 호출)로 대체해서는 안 된다(가정 4). developer/tester 는 이 상수를 그대로 임포트해 사용한다.
- 난수/현재시각 사용 금지 — 실행마다 동일한 위험 판정 결과가 나와야 한다.

### 8.2 Fixture 데이터 (8건)

| id | taskName | assignee | dueAt | status | followUpAction | 기대 위험 등급 |
|---|---|---|---|---|---|---|
| `HO-2001` | 야간 순찰 로그 인계 | 김민준 | `2026-07-18T08:00:00+09:00` | `in_progress` | 다음 근무자가 3층 비상구 점검 이어서 진행 | `deadline_exceeded`(기한이 referenceNow 이전, 미완료) |
| `HO-2002` | 재고 실사 결과 전달 | `""`(누락) | `2026-07-19T10:00:00+09:00` | `pending` | 창고 B 구역 재검수 필요 | `data_gap`(담당자 누락, 기한은 미래) |
| `HO-2003` | 설비 점검 인계 | 이서연 | `null`(누락) | `pending` | 압력 게이지 재확인 | `data_gap`(기한 누락 → 기한초과 판정 불가·false 고정) |
| `HO-2004` | 고객 클레임 후속 | 박도현 | `2026-07-17T18:00:00+09:00` | `""`(누락, 유효 enum 아님) | 환불 승인 대기중 확인 필요 | `critical`(상태 누락=data_gap **그리고** 상태가 `'done'`이 아니므로 기한초과 조건도 성립) |
| `HO-2005` | 정상 케이스 A | 최유진 | `2026-07-20T09:00:00+09:00` | `in_progress` | 특이사항 없음, 정상 인계 | `normal`(모두 유효, 기한 미래) |
| `HO-2006` | 정상 케이스 B(완료·과거 기한) | 정하늘 | `2026-07-10T09:00:00+09:00` | `done` | 인계 완료, 추가 조치 없음 | `normal`(기한은 과거이나 `status='done'`이라 기한초과 제외 — §5.2) |
| `HO-2007` | 후속 액션 누락 케이스 | 한지호 | `2026-07-21T09:00:00+09:00` | `pending` | `""`(누락) | `data_gap`(후속 액션 누락, 기한은 미래) — **§10.2 시나리오 5의 로컬 보완 대상 항목** |
| `HO-2008` | 복합 위험 케이스 | `""`(누락) | `2026-07-16T09:00:00+09:00` | `pending` | `""`(누락) | `critical`(담당자+후속 액션 누락 **그리고** 기한 초과) |

커버리지 확인: 필수 값 4개 필드(담당자/기한/상태/후속액션) 각각 최소 1건 누락 케이스 포함(`HO-2002`/`HO-2003`/`HO-2004`/`HO-2007`,`HO-2008`). 위험 등급 4종(`normal`×2, `data_gap`×3, `deadline_exceeded`×1, `critical`×2) 전체 커버. `status` 3종 중 `done` 이 과거 기한과 결합된 방어 케이스(`HO-2006`) 포함. 목록 표시 순서는 위 표의 나열 순서(§3.3)다.

---

## 9. 라우트 진입/렌더 조건 — `/demo/handoff-gap-canary`

### 9.1 물리 경로

- **라우트**: `/demo/handoff-gap-canary`
- **물리 진입점**: `demo/handoff-gap-canary/index.html`
- **근거**: REPO_CONVENTION_CAPSULE `serve_root="."`, `route_mapping="root-relative-static"`, `expected_entry_path="demo/handoff-gap-canary/index.html"` (base_sha `2d4ce2c` 기준 관측, 가정 1). Epic 설명 태그(`typescript-monorepo`)가 암시할 수 있는 `src/app/**` 경로는 **채택하지 않는다** — 관측된 저장소 실행 규약과 불일치하기 때문이다.

### 9.2 진입 조건

- 정적 파일 서빙 환경에서 `index.html` 직접 열기 또는 로컬 서버 경유 양쪽 모두 정상 동작해야 한다.
- 외부 CDN·네트워크 요청·서버 API 호출 0건(가정 6).

### 9.3 렌더 조건 (초기화 순서)

1. 진입 시 1회 초기화.
2. §8 fixture(항목 배열 + `referenceNow` 상수)를 로드(항상 동일 — 조건 분기 없음).
3. `localStorage` 에서 §7 오버라이드 envelope 로드 시도 → §7.3 검증을 통과한 보완만 각 항목에 병합.
4. §4~§5 검증/위험 판정 파이프라인을 전체 항목에 대해 1회 실행해 `riskLevel`·위험 요약을 계산.
5. 위 과정은 동기적(synchronous localStorage API)이므로 별도의 "loading" 화면 상태는 불필요하다 — 렌더는 항상 초기화 완료 후 "ready" 상태로 시작한다.
6. fixture 는 최소 1건 이상을 보장하므로(§8.2), true empty state(항목 0건)는 본 canary 범위에서 발생하지 않는다 — 항목 신규 등록/삭제 기능이 없기 때문이다(§12).

### 9.4 상세 패널 표시 필드 (fixture 원본 + 로컬 보완 + 파생 값)

| # | 필드 | 원천 | 비고 |
|---|---|---|---|
| D1 | `id` | fixture | 항목 ID |
| D2 | `taskName` | fixture | 업무명 |
| D3 | `assignee` | fixture | 담당자. 누락 시 "미배정" 류 플레이스홀더 + 누락 표시 |
| D4 | `dueAt` | fixture | 기한. 누락/파싱불가 시 "기한 미정" 류 플레이스홀더 + 누락 표시 |
| D5 | `status` | fixture | 한글 라벨(§3.2). 누락/비유효 값 시 "상태 미지정" 류 플레이스홀더 + 누락 표시 |
| D6 | `followUpAction`(병합값) | fixture + `localStorage` 오버라이드(§7) | 편집 가능한 유일한 필드. 누락 시 입력창은 비워서 표시 |
| D7 | `riskLevel` | 파생(§5.3) | 배지로 표시(색상 등 시각 표현은 designer 담당) |
| D8 | 누락 필드 목록(`hasDataGap` 상세) | 파생(§4.2) | 어떤 필드가 누락됐는지 나열(예: "담당자, 후속 액션 누락") |

최초 진입 시(아직 아무것도 선택하지 않은 상태)에는 플레이스홀더 문구만 표시한다(§11 EC-01). 레이아웃·색상·타이포그래피 등 시각 디테일은 designer(BF-1050) 담당이며 본 문서 범위 밖이다.

---

## 10. Acceptance Criteria 매핑

### 10.1 Epic 수용 기준(Dispatch AC) 매핑

| # | Given | When | Then | 매핑 섹션 |
|---|---|---|---|---|
| AC-1 | Epic 사용자 시나리오 5건 | 기획 명세를 작성하면 | 각 시나리오가 검증 가능한 AC 로 매핑된 표가 포함된다 | §10.2 (사용자 시나리오 5건 → AC 매핑 표) |
| AC-2 | 위험 요약 요구 | 판정 규칙을 정의하면 | 필수값 누락·기한 초과 각각의 위험 상태 전환 규칙이 명시된다 | §5.1(데이터 누락 전환 규칙) · §5.2(기한 초과 전환 규칙) · §5.3(우선순위 규칙) |
| AC-3 | 검증 전용 경로 | 명세를 확정하면 | `/demo/handoff-gap-canary` 물리 경로와 결정론적 fixture 요구가 문서화된다 | §9.1(물리 경로) · §8.1(기준 시각 상수, 결정론적 fixture 요구) |

### 10.2 사용자 시나리오 5건 → 상세 AC 매핑

| # | 사용자 시나리오 (Given/When/Then) | 검증 방법 | 매핑 섹션 |
|---|---|---|---|
| AC-U1 | **Given** 담당자·기한·상태·후속 액션이 모두 유효하게 입력된 항목(`HO-2005`)이 존재할 때, **When** 운영자가 목록/상세 패널에서 해당 항목을 확인하면, **Then** 위험 등급은 `normal`(정상)으로 표시되고 위험 요약의 `normal` 카운트에 포함된다 | fixture `HO-2005` 로 §4~§5 파이프라인 실행 후 `riskLevel === 'normal'` 단언 | §3.1·§4·§5.3·§8.2 |
| AC-U2 | **Given** 필수 값 4개 필드 중 하나 이상이 비어있는 항목(`HO-2002`/`HO-2003`/`HO-2004`/`HO-2007`)이 존재할 때, **When** 검증 로직이 실행되면, **Then** 해당 필드가 §4.1 규칙에 따라 "누락"으로 판정되고 항목의 위험 등급에 `data_gap` 이 반영된다(단독이면 `data_gap`, 기한초과와 겹치면 `critical`) | 4개 fixture 항목 각각에 대해 개별 필드 누락 → `hasDataGap === true` 및 §5.3 우선순위표대로 등급 산출 단언 | §4.1 · §5.1 · §5.3 · §8.2 |
| AC-U3 | **Given** 기한이 `referenceNow` 보다 과거이고 상태가 `done` 이 아닌 항목(`HO-2001`/`HO-2004`/`HO-2008`)이 존재할 때, **When** 위험 판정 로직이 실행되면, **Then** §5.2 의 3개 조건이 모두 성립해 `hasDeadlineExceeded = true` 로 전환되며, 상태가 `done`인 과거 기한 항목(`HO-2006`)은 이 조건에서 제외된다 | `HO-2001`/`HO-2004`/`HO-2008` → `hasDeadlineExceeded === true`, `HO-2006` → `hasDeadlineExceeded === false` 단언(고정 `referenceNow` 사용, 실제 시각 미사용 확인) | §5.2 · §8.1 · §8.2 |
| AC-U4 | **Given** 위험 유형 필터(전체/정상/데이터 누락/기한 초과/복합 위험)가 제공될 때, **When** 운영자가 특정 필터 값을 선택하면, **Then** 목록은 해당 등급 항목만 즉시 표시되고 표시 순서는 fixture 원래 순서를 유지하며, 위험 요약 집계 수치는 필터와 무관하게 전체 기준으로 변하지 않는다 | F0~F4 각 필터값에 대해 목록 부분집합·순서 검증 + 필터 변경 전후 위험 요약 합계 불변 단언 | §6.1 · §5.4 |
| AC-U5 | **Given** 후속 액션이 누락되어 `data_gap` 위험으로 표시 중인 항목(`HO-2007`)이 존재할 때, **When** 운영자가 상세 패널에서 유효한(1~200자) 후속 액션 텍스트를 입력해 저장하면, **Then** `localStorage` 오버라이드가 저장되고 §7.4 재계산 흐름에 따라 해당 항목의 `hasDataGap`/`riskLevel` 이 즉시 재계산되어 `normal` 로 전환되며 위험 요약의 `data_gap` 카운트가 1 감소하고 `normal` 카운트가 1 증가한다 | 저장 전/후 `HO-2007` 의 `riskLevel`(`data_gap` → `normal`) 및 위험 요약 집계 델타 단언 | §7.2 · §7.4 · §5.4 · §8.2 |

---

## 11. Edge Case 목록

| # | 시나리오 | 처리 |
|---|---|---|
| EC-01 | 상세 패널 진입 초기(아무 항목도 선택 안 함) | 플레이스홀더 문구 표시, 필드 없음(§9.4) |
| EC-02 | 필터 결과 0건(현재 fixture 구성상 실제로는 발생하지 않으나 방어적으로 정의) | 목록 영역에 "해당 위험 등급의 항목 없음" 류 빈 상태 문구 표시, 크래시 금지 |
| EC-03 | 필터 변경 시 이미 선택된 항목이 새 필터 결과에 없음 | 선택 유지, 상세 패널 계속 표시(§6.2) — 목록에서만 안 보임 |
| EC-04 | `localStorage` 오버라이드 값 없음(최초 실행) | 손상 아님 — 모든 항목 fixture 원본 `followUpAction` 값으로 렌더(§7.3 V1) |
| EC-05 | 후속 액션 200자 초과 저장 시도 | 저장 거부 + 검증 오류 표시, 입력값 유지(§7.2) |
| EC-06 | 후속 액션 저장 버튼 클릭 없이 새로고침 | 미저장 입력 유실(정상 동작 — 자동 저장 없음, §7.2) |
| EC-07 | `localStorage.setItem` 예외(quota 초과, 프라이빗 모드) | 저장 없이 in-memory 로만 보완 값 유지, 크래시 금지(§7.5 R3) |
| EC-08 | 후속 액션에 공백만 입력 후 저장 | 오버라이드 삭제로 처리 → fixture 원본값 복귀. 원본이 애초 누락이었다면 다시 "데이터 누락" 위험으로 복귀(§7.2) |
| EC-09 | 오버라이드 envelope 의 특정 엔트리만 스키마 위반(V4/V5) | 해당 엔트리만 무시, 나머지 보완은 정상 표시(§7.5 R2) |
| EC-10 | `dueAt` 값이 ISO8601 형식이 아니게 손상된 경우(fixture 자체는 항상 유효해야 하지만 방어적으로) | 파싱 실패 시 §4.1 V-dueAt 에 의해 누락 취급, `hasDeadlineExceeded` 는 `false` 고정(§5.2), 크래시 금지 |
| EC-11 | `status` 가 §3.2 3종에 없는 임의 값 | §4.1 V-status 에 의해 누락 취급(§8.2 `HO-2004` 참고), 기한 초과 판정의 "done 아님" 조건은 성립 |
| EC-12 | `referenceNow` 가 모든 fixture 항목의 `dueAt` 보다 이전인 경우(현재 fixture 구성상 발생하지 않으나 방어적으로 정의) | `deadline_exceeded` 계열 등급 0건, 위험 요약에 0으로 표시, 정상 동작 |

---

## 12. 비범위 (Out of Scope) 및 보존 영역 정책

### 12.1 기능 비범위

- 인수인계 항목 신규 등록/삭제 UI(fixture 는 정적 배열이며 런타임 CRUD 대상 아님)
- 담당자 재배정, 기한 변경, 상태 전이 UI(가정 3 — Epic 설명에 요구 없음, `assignee`/`dueAt`/`status` 는 fixture 고정값)
- 후속 액션 로컬 보완의 이력 누적(여러 건 append) — 항목당 최신 1건 덮어쓰기만 지원(가정 3)
- 다중 등급 동시 필터, 정렬 UI, 검색 UI
- 외부 API 연동, DB 스키마, 서버 사이드 저장(가정 6)
- 알림, 담당자 간 실시간 협업 기능 — Epic 설명에 언급 없음, 추측성 확장 금지

### 12.2 보존 영역 정책 (변경 금지 범위 — AC-3 관련 검증 전용 경로 원칙과 연결)

본 Epic·본 명세 작업은 아래 기존 영역에 **어떠한 변경도 요구하지 않으며**, developer/designer/tester 단계에서도 다음 영역은 미변경 상태를 유지해야 한다:

- 기존 **인증(auth)** 로직/설정
- 기존 **대시보드** 화면 및 관련 라우트
- 기존 **게임 데모**(`tetris/`, snake 계열, breakout 계열, pong 등) 및 기존 다른 canary 모듈(`delivery-exceptions-canary/`, `support-inbox-canary/`, `return-approvals-canary/`, `team-reservation-canary/`, `inspection-checklist-canary/` 등)
- **공용 라우트** 구성(`demo/*` 등 기존 등록 경로) — 신규 `demo/handoff-gap-canary` 라우트만 추가되고 기존 라우트 등록/구조는 변경하지 않는다
- **Docker 설정** 및 관련 빌드/배포 스크립트

위 영역에 대한 변경이 필요하다고 판단되면 이 명세의 범위를 벗어나므로, 별도 Jira 티켓으로 분리해 논의해야 한다.

---

## 13. 산출물 위치 및 참조 표

| 산출물 | 담당 | 경로 (예정) |
|---|---|---|
| 본 기획 명세 | planner (BF-1049) | `docs/planning/handoff-gap-canary-BF-1049.md` (본 문서) |
| 디자인 시안 | designer (BF-1050) | `docs/design/handoff-gap-canary-BF-1050.md` (예상 — 파일명 규칙은 designer 재량) |
| 구현 코드 | developer (BF-1051) | `demo/handoff-gap-canary/{index.html,styles.css,main.js,fixtures.js,overrides-storage.js}` (파일 분할은 developer 재량, 가정 1 경로 교정 반드시 반영) |
| 테스트 | tester (BF-1053) | `tests/handoff-gap-canary-*.test.js` |

**developer(BF-1051)에게 전달할 핵심 사항(가정 1)**: Epic 설명의 `typescript-monorepo` 태그를 따라 `src/app/**` 경로에 구현하지 말 것 — 본 저장소 REPO_CONVENTION_CAPSULE 관측값이 `vanilla-static`/`root-relative-static` 이므로 저장소 루트 `demo/handoff-gap-canary/index.html` 에 구현해야 라우트(`/demo/handoff-gap-canary`)가 정상 서빙된다.

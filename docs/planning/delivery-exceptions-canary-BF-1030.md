# 배송 예외 처리 서비스 기획 명세 — BF-1030

> 작성자: [박기획] (planner) · 작성일 2026-07-18
> 관련 티켓: BF-1031 (본 planner task) · BF-1030 (부모 Epic)
> 형제 task: BF-1032 (designer) · BF-1033 (developer) · BF-1035 (tester)
> 대상 모듈: `src/app/delivery-exceptions-canary/` (신규 모듈 — 본 Epic 산하에서 최초 생성 예정, 현재 저장소에 코드 없음)
> tech-stack: `typescript-monorepo` (Epic 설명 태그) — 본 저장소의 `src/app/demo/*` 관례를 따라 `src/app/` 하위에 신규 canary 디렉터리를 둔다(가정 1 참고). 외부 API·DB·서버 연동 0건, 실행 언어(.ts/.js)는 developer 재량이며 본 문서는 데이터/동작 스펙만 규정한다.
> 단위/E2E 테스트: `node --test tests/delivery-exceptions-canary-*.test.js` (focused scope · module: `delivery-exceptions-canary`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

본 문서는 BF-1030 Epic 산하 배송 예외 처리 서비스의 **단일 기준(single source of truth) 도메인 명세**다. 현재 저장소에는 `delivery-exceptions-canary` 코드가 전혀 존재하지 않으므로(신규 모듈), 이 문서는 기존 구현을 역기술(reverse-formalize)하는 것이 아니라 **처음부터 설계**한 명세다.

**본 planner task(BF-1031)의 담당 파일 영역은 `docs/planning/delivery-exceptions-canary-BF-1030.md` 1개뿐**이며, 코드 작성·디자인 시안 작성은 금지 대상이다(Surgical Changes 원칙). 이 문서는 designer(BF-1032)·developer(BF-1033)·tester(BF-1035)가 각자 작업을 시작할 때 참조하는 단일 기준 스펙이다.

**가정 명시 (모호했던 지점, 본 문서에서 확정):**

- **가정 1 (대상 경로)**: Epic 설명에 정확한 디렉터리 경로가 없다. 저장소 내 `tetris-BF-833` 기획 문서가 이미 "`typescript-monorepo` 태그는 Epic 레벨 태그일 뿐, 개별 모듈의 실제 구현 언어를 강제하지 않는다"고 확정한 선례가 있고, 실제 `src/app/demo/{status,counter,clock}` 디렉터리들은 이 태그 하에서도 순수 JS로 구현되어 있다. 따라서 본 모듈도 `src/app/delivery-exceptions-canary/`에 위치시키되, 언어 선택(TS 여부)은 developer 재량으로 둔다. 저장소 루트에 독립 디렉터리(예: `support-inbox-canary/`처럼)를 두는 `vanilla-static` 관례는 이번 태그와 맞지 않아 채택하지 않는다.
- **가정 2 (상태는 필터 전용, 전이 없음)**: Epic 설명은 "상태 필터·상세 패널·로컬 해결 메모 입력"만 요구하며 상태 전이 UI(가드 규칙 포함한 상태 변경)는 언급하지 않는다. `support-inbox-canary`(BF-1000) 선례는 상태 전이 가드 규칙까지 포함했으나, 본 Epic 설명에는 그런 요구가 없으므로 **처리 상태(status)는 fixture 에 고정된 읽기 전용 값**으로 취급하고, UI 상 상태 변경 기능은 범위 밖으로 확정한다(§11). 상태 필터는 이 고정 값에 대한 클라이언트 사이드 표시 필터링만 수행한다.
- **가정 3 (로컬 해결 메모는 예외당 1건, 덮어쓰기)**: "로컬 해결 메모 입력"은 단수 표현이므로 예외 건당 이력 누적이 아니라 **최신 1건 덮어쓰기** 방식으로 확정한다(Simplicity First — 추측성 이력 확장 금지). 메모는 처리 상태(status)와 독립적이며 메모 저장이 status 값을 변경하지 않는다.
- **가정 4 (외부 API·DB 없음)**: Epic 설명이 명시한 대로 외부 API·DB 스키마는 추가하지 않는다. 데이터 원천은 정적 deterministic fixture 배열이며, 사용자 입력(로컬 메모)만 `localStorage`에 저장한다.

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [데이터 모델](#3-데이터-모델)
4. [처리 상태 정의 및 상태 필터 규칙](#4-처리-상태-정의-및-상태-필터-규칙)
5. [상세 패널 필드 및 표시 규칙](#5-상세-패널-필드-및-표시-규칙)
6. [로컬 해결 메모 — 저장 스키마 · 입력 규칙 · 검증 · 복구](#6-로컬-해결-메모--저장-스키마--입력-규칙--검증--복구)
7. [Deterministic Fixture 데이터 스펙](#7-deterministic-fixture-데이터-스펙)
8. [라우트 진입/렌더 조건 — `/delivery-exceptions-canary`](#8-라우트-진입렌더-조건--delivery-exceptions-canary)
9. [Acceptance Criteria 매핑 (Given/When/Then)](#9-acceptance-criteria-매핑-givenwhenthen)
10. [Edge Case 목록](#10-edge-case-목록)
11. [비범위 (Out of Scope) 및 보존 영역 정책](#11-비범위-out-of-scope-및-보존-영역-정책)
12. [산출물 위치 및 참조 표](#12-산출물-위치-및-참조-표)

---

## 1. 개요

### 1.1 목적

물류 담당자가 배송 예외(지연/파손/부재 등)를 한 화면에서 조회·필터링하고, 각 건에 대한 처리 메모를 로컬에 남길 수 있는 배송 예외 처리 canary 서비스. 목록(상태 필터 포함)·상세 패널·로컬 해결 메모 입력 3개 기능으로 구성되며, 실시간 API 연동 없이 **결정적(deterministic) fixture 데이터 + localStorage(메모 전용) 영속화**로만 동작한다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 대상 경로 | `src/app/delivery-exceptions-canary/` (신규 — developer(BF-1033)가 생성) |
| 신규 코드 변경 | 없음 (본 task 는 기획 문서만 산출) |
| 데이터 원천 | 정적 fixture 배열(§7)뿐. 상태/원인/타임스탬프 등 예외 원본 필드는 런타임에 변경되지 않는다 |
| 로컬 영속 저장 | `localStorage` — **로컬 해결 메모만** 저장(§6). fixture 원본 데이터는 저장 대상이 아니다 |
| 외부 API·DB | 없음 — 서버 요청·DB 스키마 0건(Epic 명시 제약) |

### 1.3 전제 조건

- 브라우저 환경 또는 Node.js(`node --test`)로 순수 함수(필터링/검증 로직) 단위 테스트가 가능해야 한다.
- `localStorage` 미지원/차단 환경(프라이빗 모드 quota 등)에서도 크래시 없이 in-memory 폴백으로 동작해야 한다(§6.4 R3, `tetris/storage.js`·`incident-triage/triage.js` 의 기존 폴백 관례와 동일).

---

## 2. 용어 정의

| 용어 | 정의 |
|------|------|
| Delivery Exception (배송 예외) | 정상 배송 흐름을 벗어난 배송 건. `id`/`orderId`/`cause`/`status`/`occurredAt`/`updatedAt`/`description` 등으로 구성(§3) |
| Cause (예외 원인) | 예외가 발생한 사유 — 5종 고정 enum(§3.2) |
| Status (처리 상태) | 예외의 현재 처리 단계 — 4종 고정 enum, **fixture 고정값이며 런타임 변경 없음**(§4) |
| Status Filter (상태 필터) | 목록 화면에서 `status` 값 기준으로 표시 대상을 좁히는 클라이언트 사이드 필터(§4) |
| Detail Panel (상세 패널) | 목록에서 예외 1건을 선택했을 때 그 필드 전체와 로컬 메모 입력 UI를 보여주는 영역(§5) |
| Resolution Memo (로컬 해결 메모) | 사용자가 특정 예외에 대해 남기는 자유 텍스트 메모. `localStorage` 에만 저장되며 fixture 데이터와 분리된 별도 오버레이(§6) |
| Fixture | 최초 실행 시 사용되는 정적 deterministic 예외 데이터 배열(§7) |

---

## 3. 데이터 모델

### 3.1 DeliveryException 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | O | 고유 식별자. 패턴 `EXC-####`(4자리 숫자, fixture 는 `5001`부터 순차) |
| `orderId` | string | O | 연관 배송 주문 참조 ID. 패턴 `ORD-######`(6자리 숫자) — 실제 주문 시스템 연동 없음, 표시용 참조값 |
| `recipientName` | string | O | 수취인 이름 |
| `deliveryAddress` | string | O | 배송지 주소(표시용 문자열) |
| `cause` | enum | O | 예외 원인 — §3.2 5종 중 하나 |
| `status` | enum | O | 처리 상태 — §4.1 4종 중 하나. **fixture 고정값, 런타임 변경 UI 없음**(가정 2) |
| `occurredAt` | string (ISO8601, `+09:00`) | O | 예외 최초 발생 시각 — 불변 |
| `updatedAt` | string (ISO8601, `+09:00`) | O | 처리 상태가 fixture 상 마지막으로 확정된 시각(운영자가 조회하는 시점의 참고값, 런타임에 갱신되지 않음) |
| `description` | string | O | 예외 상황에 대한 시스템/운영자 기록 설명. 1~200자. **읽기 전용**(fixture 고정, §6 로컬 메모와 별개) |

`occurredAt <= updatedAt` 이 항상 성립해야 한다(fixture 작성 시 준수, §7).

### 3.2 Cause(예외 원인) enum — 5종 고정

| 값 | 한글 라벨 |
|---|---|
| `address_unreachable` | 배송지 접근 불가 |
| `recipient_absent` | 수취인 부재 |
| `package_damaged` | 상품 파손 |
| `customs_hold` | 통관 보류 |
| `weather_delay` | 기상 지연 |

5종 이상으로 확장하지 않는다 — Epic 설명에 추가 원인 요구가 없으므로 추측성 확장 금지(Simplicity First).

### 3.3 목록 표시 순서

목록 표시 순서는 fixture 정의 순서(§7)를 그대로 따르며 런타임 재정렬(정렬 UI)을 하지 않는다 — `support-inbox-canary`(BF-1000) 에서 이미 채택된 관례와 동일. 정렬 UI는 비범위(§11)이다.

---

## 4. 처리 상태 정의 및 상태 필터 규칙

### 4.1 Status(처리 상태) enum — 4종 고정

| 값 | 한글 라벨 | 의미 |
|---|---|---|
| `open` | 접수 | 예외가 등록되었으나 아직 조치 시작 전 |
| `investigating` | 조사중 | 원인/처리 방안을 조사 중 |
| `on_hold` | 보류 | 고객/운송사 등 외부 회신을 기다리는 중 |
| `resolved` | 해결 | 예외 처리가 완료됨 |

**본 4종은 fixture 데이터의 고정값이다(가정 2). 상태를 변경하는 버튼/전이 규칙/가드는 본 서비스에 없다.** 상태 변경이 필요한 Epic 확장이 생기면 별도 티켓으로 논의한다.

### 4.2 상태 필터 목록 (UI 드롭다운/탭 옵션)

| # | 필터 값 | 라벨 | 동작 |
|---|---|---|---|
| F0 | `all` | 전체 | 필터링 없이 fixture 전체 목록 표시(기본 선택값) |
| F1 | `open` | 접수 | `status === 'open'` 인 항목만 표시 |
| F2 | `investigating` | 조사중 | `status === 'investigating'` 인 항목만 표시 |
| F3 | `on_hold` | 보류 | `status === 'on_hold'` 인 항목만 표시 |
| F4 | `resolved` | 해결 | `status === 'resolved'` 인 항목만 표시 |

- 필터는 **클라이언트 사이드 배열 필터링**이며 fixture 원본 배열은 변경하지 않는다(부분집합 뷰만 생성).
- 필터 변경 시에도 §3.3 목록 표시 순서(fixture 정의 순서)는 유지된다 — 필터링은 순서를 바꾸지 않고 원소만 제외한다.
- 초기 진입 시 기본 필터는 `all`(F0)이다.
- 다중 선택(복수 상태 동시 필터)은 지원하지 않는다 — 단일 선택 방식(Simplicity First, Epic 설명에 다중 선택 요구 없음).

### 4.3 필터와 상세 패널 선택 상태의 관계

필터를 변경해도 이미 선택되어 상세 패널에 표시 중인 예외의 선택은 해제되지 않는다(해당 항목이 새 필터 결과에 없어 목록에서 보이지 않게 되더라도, 상세 패널은 계속 마지막 선택 항목을 표시한다). 필터는 **목록 표시에만** 영향을 준다 — §10 EC-05 참고.

---

## 5. 상세 패널 필드 및 표시 규칙

### 5.1 진입 조건

목록에서 예외 1건을 클릭(선택)하면 상세 패널이 그 예외의 전체 필드를 표시한다. 최초 진입 시(아직 아무것도 선택하지 않은 상태)에는 플레이스홀더 문구("예외를 선택하세요" 류)만 표시한다 — §10 EC-01.

### 5.2 표시 필드 (fixture 원본, §3.1 전체 + 로컬 메모 영역)

| # | 필드 | 원천 | 비고 |
|---|---|---|---|
| D1 | `id` | fixture | 예외 ID |
| D2 | `orderId` | fixture | 주문 참조 ID |
| D3 | `recipientName` | fixture | 수취인 |
| D4 | `deliveryAddress` | fixture | 배송지 |
| D5 | `cause` | fixture | 한글 라벨로 표시(§3.2) |
| D6 | `status` | fixture | 한글 라벨로 표시(§4.1). 읽기 전용 뱃지(색상 등 시각 표현은 designer 담당) |
| D7 | `occurredAt` | fixture | 발생 시각(표시 포맷은 designer/developer 재량, 값 자체는 §3.1 ISO8601) |
| D8 | `updatedAt` | fixture | 마지막 상태 확정 시각 |
| D9 | `description` | fixture | 읽기 전용 설명 |
| D10 | 로컬 해결 메모 입력/표시 영역 | `localStorage`(§6) | 편집 가능한 유일한 영역 |

상세 패널 레이아웃·색상·타이포그래피 등 시각 디테일은 designer(BF-1032) 담당이며 본 문서 범위 밖이다. 본 절은 **표시해야 할 데이터 필드와 그 원천/편집 가능 여부**만 규정한다.

---

## 6. 로컬 해결 메모 — 저장 스키마 · 입력 규칙 · 검증 · 복구

### 6.1 저장 키 및 envelope 구조

단일 키 `delivery-exceptions-canary:notes` 에 아래 구조의 JSON 문자열을 저장한다(예외별 메모를 한 번에 원자적으로 읽고 쓰기 위해 예외당 별도 키 대신 단일 envelope 채택 — `support-inbox-canary` 의 §8.1 단일 envelope 관례와 동일):

```json
{
  "schemaVersion": 1,
  "notes": {
    "EXC-5001": { "text": "재배송 일정 조율 완료, 내일 오전 재시도 예정", "savedAt": "2026-07-18T10:00:00+09:00" }
  }
}
```

- `schemaVersion`(정수, 현재 `1`): envelope 구조 버전. 구조가 바뀌면 증가.
- `notes`: 예외 `id` 를 키로 하는 맵. **키가 존재하지 않으면 해당 예외에 메모 없음**을 의미한다(빈 문자열을 저장하지 않는다 — §6.3).
- 각 메모 엔트리는 `text`(문자열)와 `savedAt`(ISO8601 저장 시각) 2개 필드만 가진다(가정 3 — 이력 배열 아님, 최신 1건 덮어쓰기).

### 6.2 입력 규칙

- 메모 입력은 상세 패널(§5, D10)의 텍스트 영역 + 저장 버튼으로 이루어진다. **키 입력마다 자동 저장하지 않고, 명시적 저장 동작(버튼 클릭 등) 시점에만 `localStorage` 에 기록**한다(비저장 상태에서 새로고침 시 미저장 입력은 유실될 수 있음 — §10 EC-06).
- 저장 가능한 텍스트 길이: **1~300자**(trim 후 기준).
- 공백만 입력하거나 빈 문자열을 저장 시도하면 → **메모 삭제**로 처리한다(§6.1 `notes` 맵에서 해당 `id` 키 제거). 이는 오류가 아니라 정상 동작(메모 지우기 수단)이다.
- 300자를 초과하는 텍스트를 저장 시도하면 → 저장을 거부하고 검증 오류를 표시한다. 입력 필드의 값은 유지되어 사용자가 수정할 수 있다(값을 비우거나 잘라내지 않는다).
- 메모는 대상 예외의 `status`(처리 상태)를 변경하지 않는다(가정 2·3) — 메모는 순수하게 로컬 참고 텍스트다.

### 6.3 검증 규칙 (로드 시)

| # | 규칙 |
|---|---|
| V1 | `localStorage.getItem(KEY)` 가 `null` 이면 손상이 아니라 "메모 없음" 초기 상태 — 모든 예외가 메모 미입력 상태로 렌더(§10 EC-04) |
| V2 | 값이 존재하면 `JSON.parse` 가 예외 없이 성공해야 함 |
| V3 | 파싱 결과 최상위 타입이 순수 object 이고 `schemaVersion === 1`, `notes` 가 object 여야 함 |
| V4 | `notes` 의 각 엔트리는 `text`(1~300자 문자열)와 `savedAt`(문자열)을 가져야 함 — 위반 엔트리는 개별적으로 무시(해당 키만 드롭), envelope 전체를 손상 처리하지 않음(§6.4 R2) |
| V5 | `notes` 의 키가 현재 fixture(§7)에 존재하지 않는 예외 `id` 를 참조하면 orphan 으로 간주해 무시(로드 시 표시하지 않음) — fixture 는 정적이므로 정상 흐름에서는 발생하지 않지만 방어적으로 처리한다 |

### 6.4 손상 복구 절차

1. **R1 — envelope 전체 파싱 실패(V2/V3 위반) 시 전체 폴백**: 저장된 값을 신뢰하지 않고 메모 없음 상태로 렌더한다(크래시 금지). 기존 손상 데이터는 다음 저장 시 정상 envelope 으로 덮어써진다(즉시 재기록은 하지 않는다 — 사용자가 실제로 메모를 저장하기 전까지는 손상된 원본을 임의로 지우지 않는다. 이는 fixture 를 즉시 재기록하는 support-inbox 관례와 달리, 메모는 "지워도 fixture 데이터 자체가 위험해지지 않는" 저위험 데이터이므로 더 보수적으로 접근한다).
2. **R2 — 엔트리 단위 부분 무시(V4/V5 위반)**: envelope 자체는 유효하나 특정 엔트리만 규칙 위반이면 그 엔트리만 무시하고 나머지는 정상 표시한다.
3. **R3 — 저장 자체 불가 환경**: `setItem` 호출이 예외를 던지는 환경(프라이빗 모드 quota 초과 등)에서는 저장을 재시도하지 않고 in-memory 상태로만 메모를 유지한다. 새로고침 시 세션 내 메모가 유실될 수 있다(§10 EC-07, 정상 동작으로 간주).

---

## 7. Deterministic Fixture 데이터 스펙

### 7.1 원칙

- Fixture 는 **정적 배열**이며 실행마다 동일한 값을 반환한다(난수/현재시각 사용 금지 — developer 구현 시 `Date.now()`/`Math.random()` 금지).
- 최소 1건 이상의 예외를 포함해야 한다 — true empty state 는 본 canary 범위에서 발생하지 않는다(§8.3, §11).
- §4.1 의 4개 처리 상태와 §3.2 의 5개 예외 원인을 각각 최소 1건 이상 커버한다.

### 7.2 Fixture 데이터 (7건)

| id | orderId | recipientName | deliveryAddress | cause | status | occurredAt | updatedAt | description |
|---|---|---|---|---|---|---|---|---|
| `EXC-5001` | `ORD-880101` | 김도윤 | 서울시 강남구 테헤란로 105 | `address_unreachable` | `open` | 2026-07-10T09:15:00+09:00 | 2026-07-10T09:15:00+09:00 | 배송지 상세 주소 누락으로 배송지 확인 불가 |
| `EXC-5002` | `ORD-880132` | 이하윤 | 부산시 해운대구 센텀중앙로 55 | `recipient_absent` | `investigating` | 2026-07-11T11:00:00+09:00 | 2026-07-11T14:30:00+09:00 | 2회 방문 시도, 수취인 부재로 조사 중 |
| `EXC-5003` | `ORD-880144` | 박서준 | 대구시 수성구 동대구로 200 | `package_damaged` | `on_hold` | 2026-07-12T08:20:00+09:00 | 2026-07-13T10:00:00+09:00 | 상품 파손 확인, 재발송 여부 고객 회신 대기 |
| `EXC-5004` | `ORD-880159` | 최지아 | 인천시 연수구 컨벤시아대로 15 | `customs_hold` | `resolved` | 2026-07-08T07:00:00+09:00 | 2026-07-09T16:45:00+09:00 | 통관 보류 후 서류 보완 완료, 배송 재개 |
| `EXC-5005` | `ORD-880170` | 정우진 | 광주시 서구 상무대로 60 | `weather_delay` | `open` | 2026-07-14T06:30:00+09:00 | 2026-07-14T06:30:00+09:00 | 폭우로 인한 배송 지연 예상 |
| `EXC-5006` | `ORD-880188` | 한소율 | 대전시 유성구 대학로 99 | `recipient_absent` | `resolved` | 2026-07-09T13:10:00+09:00 | 2026-07-10T09:00:00+09:00 | 재방문 후 수취 완료 |
| `EXC-5007` | `ORD-880199` | 오하준 | 울산시 남구 삼산로 45 | `address_unreachable` | `investigating` | 2026-07-15T10:05:00+09:00 | 2026-07-15T15:20:00+09:00 | 주소지 재확인 요청, 고객 응답 대기 중 조사 지속 |

커버리지 확인: `status` — `open`×2, `investigating`×2, `on_hold`×1, `resolved`×2 (4종 전체 커버). `cause` — `address_unreachable`×2, `recipient_absent`×2, `package_damaged`×1, `customs_hold`×1, `weather_delay`×1 (5종 전체 커버). 목록 표시 순서는 위 표의 나열 순서(§3.3)이다.

---

## 8. 라우트 진입/렌더 조건 — `/delivery-exceptions-canary`

### 8.1 경로

`src/app/delivery-exceptions-canary/` (가정 1) — 기존 `src/app/demo/{status,counter,clock}` 와 동일한 "디렉터리 = 라우트" 관례를 따른다.

### 8.2 진입 조건

- 정적 파일 서빙 환경에서 `index.html` 직접 열기 또는 로컬 서버 경유 양쪽 모두 정상 동작해야 한다.
- 외부 CDN·네트워크 요청·서버 API 호출 0건(Epic 명시 제약, 가정 4).

### 8.3 렌더 조건 (초기화 순서)

1. 진입 시 1회 초기화.
2. §7 fixture 를 목록 데이터로 로드(항상 동일 — 조건 분기 없음, fixture 는 항상 유효하므로 §6 같은 검증 절차가 필요 없다).
3. `localStorage` 에서 §6 메모 envelope 로드 시도 → §6.3 검증을 통과한 메모만 각 예외에 매핑해 표시.
4. 위 과정은 동기적(synchronous localStorage API)이므로 별도의 "loading" 화면 상태는 불필요하다 — 렌더는 항상 초기화 완료 후 "ready" 상태로 시작한다.
5. fixture 는 최소 1건 이상을 보장하므로(§7.1), true empty state(예외 0건)는 본 canary 범위에서 발생하지 않는다 — 예외 신규 등록/삭제 기능이 없기 때문이다(§11).

### 8.4 화면 상태 참고

목록/상세 패널 레이아웃, 색상, 인터랙션 디테일은 designer(BF-1032) 담당이며 본 문서 범위 밖이다. 본 절은 **데이터 로드/렌더 조건**만 규정한다.

---

## 9. Acceptance Criteria 매핑 (Given/When/Then)

| # | Given | When | Then | 매핑 섹션 |
|---|---|---|---|---|
| AC-1 | Epic 수용 기준 | 기획 명세를 작성하면 | fixture 데이터 형태(§7)·상태 필터 목록(§4.2)·상세 패널 필드(§5.2)·해결 메모 입력 규칙(§6)이 검증 가능하게 문서화된다 | §4(상태 필터) · §5(상세 패널 필드) · §6(메모 규칙) · §7(fixture 데이터) |
| AC-2 | 보존 영역 정책 | 명세를 작성하면 | 기존 인증·대시보드·게임 데모·공용 라우트·Docker 설정 미변경이 범위에 명시된다 | §11(비범위 및 보존 영역 정책) |

---

## 10. Edge Case 목록

| # | 시나리오 | 처리 |
|---|---|---|
| EC-01 | 상세 패널 진입 초기(아무 예외도 선택 안 함) | 플레이스홀더 문구 표시, 필드 없음(§5.1) |
| EC-02 | 상태 필터 결과 0건(현재 fixture 구성상 실제로는 발생하지 않으나 방어적으로 정의) | 목록 영역에 "해당 상태의 예외 없음" 류 빈 상태 문구 표시, 크래시 금지 |
| EC-03 | 필터 변경 시 이미 선택된 예외가 새 필터 결과에 없음 | 선택 유지, 상세 패널 계속 표시(§4.3) — 목록에서만 안 보임 |
| EC-04 | `localStorage` 메모 값 없음(최초 실행) | 손상 아님 — 모든 예외 메모 미입력 상태로 렌더(§6.3 V1) |
| EC-05 | 메모 300자 초과 저장 시도 | 저장 거부 + 검증 오류 표시, 입력값 유지(§6.2) |
| EC-06 | 메모 저장 버튼 클릭 없이 새로고침 | 미저장 입력 유실(정상 동작 — 자동 저장 없음, §6.2) |
| EC-07 | `localStorage.setItem` 예외(quota 초과, 프라이빗 모드) | 저장 없이 in-memory 로만 메모 유지, 크래시 금지(§6.4 R3) |
| EC-08 | 메모에 공백만 입력 후 저장 | 메모 삭제로 처리(해당 `id` 키 제거, §6.2) |
| EC-09 | 메모 envelope 의 특정 엔트리만 스키마 위반(V4/V5) | 해당 엔트리만 무시, 나머지 메모는 정상 표시(§6.4 R2) |
| EC-10 | 렌더 시점의 "loading" 화면 필요 여부 | 불필요 — 로드가 동기적이므로 즉시 "ready" 렌더(§8.3) |

---

## 11. 비범위 (Out of Scope) 및 보존 영역 정책

### 11.1 기능 비범위

- 예외 신규 등록/삭제 UI(fixture 는 정적 배열이며 런타임 CRUD 대상 아님)
- 처리 상태(status) 변경 UI, 상태 전이 가드 규칙(가정 2 — Epic 설명에 요구 없음)
- 로컬 해결 메모의 이력 누적(여러 건 append) — 예외당 최신 1건 덮어쓰기만 지원(가정 3)
- 다중 상태 동시 필터, 정렬 UI, 검색 UI
- 외부 API 연동, DB 스키마, 서버 사이드 저장(Epic 명시 제약)
- 담당자(assignee) 배정, 알림, 첨부파일 — Epic 설명에 언급 없음, 추측성 확장 금지

### 11.2 보존 영역 정책 (변경 금지 범위 — AC-2)

본 Epic·본 명세 작업은 아래 기존 영역에 **어떠한 변경도 요구하지 않으며**, developer/designer/tester 단계에서도 다음 영역은 미변경 상태를 유지해야 한다:

- 기존 **인증(auth)** 로직/설정
- 기존 **대시보드** 화면 및 관련 라우트
- 기존 **게임 데모**(`tetris/`, snake 계열, breakout 계열, pong 등) 코드
- **공용 라우트** 구성(`src/app/demo/*` 등 기존 등록 경로) — 신규 `delivery-exceptions-canary` 라우트만 추가되고 기존 라우트 등록/구조는 변경하지 않는다
- **Docker 설정** 및 관련 빌드/배포 스크립트

위 영역에 대한 변경이 필요하다고 판단되면 이 명세의 범위를 벗어나므로, 별도 Jira 티켓으로 분리해 논의해야 한다.

---

## 12. 산출물 위치 및 참조 표

| 산출물 | 담당 | 경로 (예정) |
|---|---|---|
| 본 기획 명세 | planner (BF-1031) | `docs/planning/delivery-exceptions-canary-BF-1030.md` (본 문서) |
| 디자인 시안 | designer (BF-1032) | `docs/design/delivery-exceptions-canary-BF-1030.md` |
| 구현 코드 | developer (BF-1033) | `src/app/delivery-exceptions-canary/{index.html,styles.css,main.js,fixtures.js,notes-storage.js}` (파일 분할은 developer 재량, `src/app/demo/clock/storage.js` 의 저장 유틸 분리 관례 참고 권장) |
| 테스트 | tester (BF-1035) | `tests/delivery-exceptions-canary-*.test.js` |

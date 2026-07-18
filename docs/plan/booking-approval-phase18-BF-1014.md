# 팀 예약·승인 서비스 명세 — BF-1014 (booking-approval-phase18)

> 작성자: [박기획] · 작성일 2026-07-18
> 관련 티켓: BF-1014 (planner task)
> 신규 모듈: `booking-approval-phase18/` (개념 라우트: `/services/booking-approval-phase18`)
> tech-stack: `vanilla-static` — 외부 의존성 0건, DB/외부 API 없음, `file://` 직접 실행 호환
> 단위 테스트: `node --test tests/booking-approval-phase18-*.test.js`
> 형제 task: BF-1015(designer) · BF-1016(developer) · BF-1020(tester)
> 선례 참고: `docs/plan/team-reservation-canary/reservation-approval-spec-BF-1002.md` (동일 도메인의 이전 모듈 — 함수/adapter 패턴을 계승하되, 상태값 명칭은 본 Epic 요구("요청→승인/반려")에 맞춰 `pending` 대신 `requested` 를 사용)

---

## 목차

1. [개요](#1-개요)
2. [사용자 스토리](#2-사용자-스토리)
3. [데이터 모델 — 자원/예약 Seed 스키마](#3-데이터-모델--자원예약-seed-스키마)
4. [결정적 Seed 데이터](#4-결정적-seed-데이터)
5. [시간 충돌 판정 규칙](#5-시간-충돌-판정-규칙)
6. [예약 상태 머신 (요청→승인/반려)](#6-예약-상태-머신-요청승인반려)
7. [순수 함수 Contract](#7-순수-함수-contract)
8. [localStorage Adapter 인터페이스](#8-localstorage-adapter-인터페이스)
9. [화면 정보구조 (Screen IA)](#9-화면-정보구조-screen-ia)
10. [단위 테스트 전략](#10-단위-테스트-전략)
11. [Acceptance Criteria (Given/When/Then)](#11-acceptance-criteria-givenwhenthen)
12. [Edge Case 목록](#12-edge-case-목록)
13. [vanilla-static / file:// 제약](#13-vanilla-static--file-제약)
14. [비범위 (Out of Scope)](#14-비범위-out-of-scope)
15. [디자이너 위임 시각 요소](#15-디자이너-위임-시각-요소)

---

## 1. 개요

### 1.1 목적

외부 API·DB 없이, 팀 공유 자원(회의실 등)에 대한 예약 **요청**을 접수하고, 예약 목록 화면에서 **시간 충돌 여부**를 결정론적으로 판정하며, 요청 건을 **승인/반려**로 전이시키는 순수 함수 기반 로직과 화면 정보구조를 확정한다. 모든 자원/예약 데이터는 `localStorage` 에 저장되는 **결정적 seed** 로부터 시작하며, 서버·네트워크 호출은 존재하지 않는다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 신규 경로 | `booking-approval-phase18/` (index.html / style.css / booking.js) |
| 개념 라우트 | `/services/booking-approval-phase18` (정적 파일 직접 서빙 — 서버 라우팅 로직 없음) |
| 기존 코드 영향 | 없음 — 완전 독립 모듈 (repo 루트에 기존 `team-reservation-canary/` 와 나란히 위치, 서로 참조하지 않음) |
| 저장소 사용 | `localStorage` — §8 adapter 인터페이스를 통해서만 접근 |
| 외부 라이브러리 / API | 없음 — `file://` CORS 안전, 네트워크 호출 0건 |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전), `file://` 프로토콜로 직접 열어도 100% 동작
- `booking-approval-phase18/` 디렉토리가 프로젝트 루트에 생성됨 (developer 담당, BF-1016)
- `tests/booking-approval-phase18-*.test.js` 파일이 `node --test` 로 실행 가능
- 시간 값은 항상 **ISO 8601 문자열**(`YYYY-MM-DDTHH:mm:ss.sssZ`)로 표현하며, 로직은 `Date.now()`/`new Date()`(인자 없이) 등 비결정적 시각 소스를 사용하지 않는다 — 모든 "현재 시각"은 호출자가 인자로 주입한다.

### 1.4 용어 정의

| 용어 | 정의 |
|------|------|
| Resource (자원) | 예약 대상이 되는 공유 자원(회의실 등). 고유 `id` 보유 |
| Booking (예약) | 특정 Resource 에 대한 시간대 예약 요청 1건 |
| 요청 (requested) | 예약이 생성되었으나 아직 승인/반려 결정이 나지 않은 초기 상태 |
| 승인 (approved) | 요청이 승인되어 확정된 상태 — 종료 상태(terminal) |
| 반려 (rejected) | 요청이 반려된 상태 — 종료 상태(terminal) |
| 시간 겹침 (Overlap) | 두 예약의 `[startAt, endAt)` 구간이 하나라도 공통 시각을 포함하는 경우 (§5) |
| 충돌 (Conflict) | 동일 `resourceId` 에 대해 이미 **승인된(approved)** 예약과 시간이 겹치는 경우 |

---

## 2. 사용자 스토리

| ID | As | I want | So that |
|----|----|--------|---------|
| US-01 | 신청자(requester) | 자원·시간대를 선택해 예약을 요청하고 싶다 | 원하는 자원을 미리 확보할 수 있다 |
| US-02 | 신청자(requester) | 예약 목록에서 내 요청의 현재 상태(요청/승인/반려)를 확인하고 싶다 | 별도 문의 없이 진행 상황을 알 수 있다 |
| US-03 | 승인자(approver) | 예약 목록에서 각 요청 건이 기존 승인 건과 시간이 겹치는지 확인하고 싶다 | 충돌하는 예약을 실수로 승인하지 않을 수 있다 |
| US-04 | 승인자(approver) | 요청 건을 승인하거나 반려(사유 포함)하고 싶다 | 자원 배정을 확정하거나 명확한 사유로 거절할 수 있다 |
| US-05 | 승인자(approver) | 이미 승인된 예약과 충돌하는 요청을 승인하려 하면 시스템이 막아주길 원한다 | 동일 자원의 이중 확정을 방지할 수 있다 |
| US-06 | 신청자/승인자 공통 | 예약 목록을 자원별·상태별로 필터링해서 보고 싶다 | 다수의 요청 중 필요한 항목만 빠르게 찾을 수 있다 |

각 스토리는 §11 의 AC 로 검증 가능하게 매핑된다.

---

## 3. 데이터 모델 — 자원/예약 Seed 스키마

### 3.1 Resource 스키마

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | `string` | ✅ | 고유 식별자. 패턴 `room-\d{2}` (예: `room-01`) |
| `name` | `string` | ✅ | 자원 표시명 (예: `"3층 세미나실"`) |
| `capacity` | `number` (양의 정수) | ✅ | 수용 인원 |

- `id` 는 seed 전체에서 유일해야 한다 (중복 시 seed 자체가 invalid — 로드 시점에 검증).

### 3.2 Booking 스키마

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | `string` | ✅ | 고유 식별자. 패턴 `bkg-\d{2}` (예: `bkg-01`) |
| `resourceId` | `string` | ✅ | 대상 Resource 의 `id`. seed 내 존재하는 `resource.id` 를 참조해야 함 |
| `requesterName` | `string` (1자 이상) | ✅ | 신청자 표시명 |
| `startAt` | `string` (ISO 8601) | ✅ | 예약 시작 시각 |
| `endAt` | `string` (ISO 8601) | ✅ | 예약 종료 시각. 반드시 `startAt` 보다 **이후**여야 한다 (`startAt < endAt`, 0 또는 음의 구간 invalid) |
| `status` | `'requested' \| 'approved' \| 'rejected'` | ✅ | 예약 상태 (§6) |
| `createdAt` | `string` (ISO 8601) | ✅ | 요청 생성 시각 |
| `decidedAt` | `string` (ISO 8601) \| `null` | ✅ | 승인/반려 결정 시각. `status === 'requested'` 이면 반드시 `null` |
| `reason` | `string` \| `null` | ✅ | 반려 사유. `status === 'rejected'` 일 때만 비-null 허용(빈 문자열도 허용), 그 외 상태는 `null` |

### 3.3 유효성 규칙 요약 (검증 가능한 문장)

- `startAt`, `endAt` 은 `Date.parse()` 로 파싱 가능한 ISO 8601 문자열이어야 하며, 파싱 실패 시 해당 레코드는 invalid 로 간주한다.
- `startAt >= endAt` 인 예약은 **생성 시점에 거부**된다 (§7 `createBooking` 참조) — seed 데이터에도 이런 레코드가 존재해서는 안 된다.
- `booking.resourceId` 가 seed 의 어떤 `resource.id` 와도 일치하지 않으면 invalid (참조 무결성 위반).

---

## 4. 결정적 Seed 데이터

시간·난수 등 비결정적 값을 사용하지 않고, 아래 고정 리터럴을 그대로 seed 로 사용한다. 개발자는 이 표를 그대로 배열/객체 리터럴로 구현하며 임의로 값을 바꾸지 않는다 (본 문서가 유일한 source of truth).

### 4.1 Resource Seed (3건)

| id | name | capacity |
|----|------|----------|
| `room-01` | 3층 세미나실 | 10 |
| `room-02` | 4층 소회의실 A | 4 |
| `room-03` | 4층 소회의실 B | 4 |

### 4.2 Booking Seed (5건, 실제 구현 seed)

| id | resourceId | requesterName | startAt | endAt | status | createdAt | decidedAt | reason |
|----|------------|----------------|---------|-------|--------|-----------|-----------|--------|
| `bkg-01` | `room-01` | 오세훈 | `2026-07-25T02:00:00.000Z` | `2026-07-25T03:00:00.000Z` | `approved` | `2026-07-18T00:00:00.000Z` | `2026-07-18T01:00:00.000Z` | `null` |
| `bkg-02` | `room-01` | 유지민 | `2026-07-25T03:00:00.000Z` | `2026-07-25T04:00:00.000Z` | `requested` | `2026-07-18T00:10:00.000Z` | `null` | `null` |
| `bkg-03` | `room-01` | 배수아 | `2026-07-25T02:30:00.000Z` | `2026-07-25T03:30:00.000Z` | `rejected` | `2026-07-18T00:05:00.000Z` | `2026-07-18T01:00:00.000Z` | `"동일 시간대 선접수 건과 중복"` |
| `bkg-04` | `room-02` | 강민준 | `2026-07-26T06:00:00.000Z` | `2026-07-26T07:00:00.000Z` | `requested` | `2026-07-18T00:20:00.000Z` | `null` | `null` |
| `bkg-05` | `room-03` | 문서연 | `2026-07-26T06:00:00.000Z` | `2026-07-26T07:00:00.000Z` | `approved` | `2026-07-18T00:15:00.000Z` | `2026-07-18T00:30:00.000Z` | `null` |

> `bkg-01`/`bkg-03` 은 동일 자원(`room-01`)·겹치는 시간대에 대해 하나는 승인, 하나는 반려된 "충돌 해소 완료" 사례다. `bkg-04`/`bkg-05` 는 서로 다른 자원(`room-02`/`room-03`)에 대해 동일 시간대가 공존 가능함을 보여준다(자원이 다르면 겹침 판정 대상이 아님).

### 4.3 검증용 Invalid 예시 (seed 배열에는 미포함, `createBooking` 거부 테스트 자료)

| id (가상) | resourceId | requesterName | startAt | endAt | 비고 |
|-----------|------------|----------------|---------|-------|------|
| `bkg-06` | `room-02` | 한도윤 | `2026-07-27T09:00:00.000Z` | `2026-07-27T09:00:00.000Z` | `startAt === endAt`, 0-구간 — §3.3 규칙에 따라 seed 배열에는 포함하지 않는다. §10.3 TC-CB-04 자료로만 사용 |

---

## 5. 시간 충돌 판정 규칙

### 5.1 겹침(Overlap) 판정 기준

두 시간 구간은 **반열린 구간(half-open interval)** `[start, end)` 으로 취급한다. 구간 `A = [aStart, aEnd)`, `B = [bStart, bEnd)` 에 대해:

```
겹침(A, B) := aStart < bEnd && bStart < aEnd
```

- 경계가 정확히 맞닿는 경우(`aEnd === bStart` 또는 `bEnd === aStart`)는 **겹침이 아니다** (뒤이어 바로 시작하는 예약은 허용).
- 두 구간이 완전히 동일하면 겹침이다.
- 한 구간이 다른 구간을 완전히 포함하는 경우도 겹침이다.
- `resourceId` 가 다른 두 예약은 시간이 겹쳐도 겹침 판정 대상이 아니다 (자원별로 독립).

### 5.2 충돌(Conflict) 정의

"충돌"은 겹침 중에서도 **비즈니스적으로 의미 있는 부분집합**이다:

> 요청 예약 `R` 이 특정 자원 `resourceId` 에 대해, **이미 `approved` 상태인** 다른 예약과 시간이 겹치면 `R` 은 그 예약과 "충돌"한다.

- `requested` 끼리는 서로 겹쳐도 충돌이 아니다 — 동일 시간대에 여러 요청이 공존할 수 있으며, 승인 시점에만 충돌을 가린다(§6.2).
- `rejected` 상태의 예약은 충돌 판정에서 완전히 제외한다.
- 예약 자기 자신(`id` 동일)은 충돌 후보에서 제외한다.

---

## 6. 예약 상태 머신 (요청→승인/반려)

### 6.1 상태 다이어그램

```
        approve (충돌 없음)
  ┌───────────────────────────┐
  │                           ▼
[requested] ──reject───────▶ [rejected]  (종료 상태)
  │
  └──approve(충돌 있음)──▶ 전이 실패, requested 유지 (§6.2)

[approved] (종료 상태 — 이후 어떤 action 도 상태를 바꾸지 않음, v1 범위 밖 §14)
```

### 6.2 상태 전이표

| # | 현재 상태 | Action | Guard | 다음 상태 | 실패 시 |
|---|-----------|--------|-------|-----------|---------|
| 1 | `requested` | `approve` | 동일 `resourceId` 의 `approved` 예약과 겹치는 건이 **없음** | `approved` | Guard 위반 → 상태 불변(`requested` 유지), 실패 결과 코드 `CONFLICT` 반환 |
| 2 | `requested` | `reject` | 없음 (항상 허용) | `rejected` | — |
| 3 | `approved` | `approve` \| `reject` | — (이미 종료 상태) | 불변 | 실패 결과 코드 `ALREADY_DECIDED` 반환 |
| 4 | `rejected` | `approve` \| `reject` | — (이미 종료 상태) | 불변 | 실패 결과 코드 `ALREADY_DECIDED` 반환 |

- `approve`/`reject` 이외의 action 문자열이 주어지면 이는 프로그래밍 오류이므로 **`TypeError` 를 즉시 throw** 한다(비즈니스 실패가 아님).
- 전이 성공 시 `decidedAt` 은 호출자가 주입한 시각 값으로 설정되고, `reject` 의 경우 `reason` 이 함께 기록된다(`reason` 미제공 시 빈 문자열 `""` 허용).
- v1 에서는 `approved`/`rejected` 에서 다시 `requested` 로 되돌리는 "취소" 기능을 다루지 않는다(§14 비범위).

---

## 7. 순수 함수 Contract

### 7.1 `hasTimeOverlap(aStart, aEnd, bStart, bEnd)`

```javascript
/**
 * 두 시간 구간의 겹침 여부를 판정하는 순수 함수 (§5.1)
 * @param {string} aStart ISO 8601
 * @param {string} aEnd   ISO 8601
 * @param {string} bStart ISO 8601
 * @param {string} bEnd   ISO 8601
 * @returns {boolean}
 * @throws {TypeError} 인자가 문자열이 아니거나 Date.parse 로 파싱 불가한 경우
 * @throws {RangeError} aStart >= aEnd 또는 bStart >= bEnd (0/음수 구간)
 */
function hasTimeOverlap(aStart, aEnd, bStart, bEnd) { /* §5.1 공식 그대로 구현 */ }
```

### 7.2 `findApprovedConflicts(booking, allBookings)`

```javascript
/**
 * 주어진 예약과 충돌하는(§5.2) 기존 approved 예약 목록을 반환하는 순수 함수
 * @param {Booking} booking 판정 대상 예약(자기 자신은 결과에서 제외)
 * @param {Booking[]} allBookings 전체 예약 목록(seed 또는 현재 state)
 * @returns {Booking[]} 충돌하는 approved 예약들 (없으면 빈 배열, 순서는 allBookings 순서 유지)
 * @throws {TypeError} booking 또는 allBookings 형식이 §3.2 스키마에 맞지 않으면
 */
function findApprovedConflicts(booking, allBookings) { /* ... */ }
```

### 7.3 `decideBooking(booking, action, allBookings, decidedAt, reason)`

```javascript
/**
 * 예약 상태 전이(§6)를 수행하는 순수 함수. 입력 객체를 변경하지 않고(불변) 새 객체를 반환한다.
 * @param {Booking} booking 대상 예약(status === 'requested' 이어야 성공 가능)
 * @param {'approve'|'reject'} action
 * @param {Booking[]} allBookings 충돌 판정을 위한 전체 예약 목록(booking 포함 여부 무관)
 * @param {string} decidedAt ISO 8601 — 호출자가 주입하는 결정 시각(Date.now 사용 금지)
 * @param {string} [reason] reject 시 반려 사유(옵션, 기본 "")
 * @returns {{ ok: true, booking: Booking } | { ok: false, code: 'CONFLICT'|'ALREADY_DECIDED', booking: Booking }}
 *          실패해도 booking 필드에는 원본과 동일한(불변) 예약 객체를 담아 반환한다(§6.2 "상태 불변").
 * @throws {TypeError} action 이 'approve'|'reject' 가 아니거나, booking/decidedAt 형식이 invalid 인 경우
 */
function decideBooking(booking, action, allBookings, decidedAt, reason) { /* §6.2 표 그대로 구현 */ }
```

### 7.4 `createBooking(input, existingBookings, createdAt)`

```javascript
/**
 * 신규 예약 요청(requested)을 생성하는 순수 함수. seed 스키마(§3.2) 검증을 통과해야 생성된다.
 * @param {{id, resourceId, requesterName, startAt, endAt}} input
 * @param {Booking[]} existingBookings id 유일성 검증용 전체 목록
 * @param {string} createdAt ISO 8601 — 호출자가 주입하는 생성 시각
 * @returns {Booking} status: 'requested', decidedAt: null, reason: null 로 초기화된 새 예약
 * @throws {TypeError} 필드 누락/타입 불일치
 * @throws {RangeError} startAt >= endAt (§3.3)
 * @throws {Error} id 중복 (existingBookings 내 동일 id 존재)
 */
function createBooking(input, existingBookings, createdAt) { /* ... */ }
```

### 7.5 부작용 (Side Effects)

- 4개 함수 모두 **순수 함수**다 — DOM 조작·localStorage 접근·난수·현재 시각 조회(`Date.now()`/인자 없는 `new Date()`) 없음. 시각이 필요한 모든 지점은 호출자가 인자로 주입한다.
- `decideBooking`/`createBooking` 은 입력 `booking`/`existingBookings` 배열·객체를 **변경하지 않고** 새 객체(얕은 복사 + 변경 필드)를 반환한다.

### 7.6 Export 방식 (테스트 호환)

`docs/plan/team-reservation-canary/reservation-approval-spec-BF-1002.md` §6.6 의 UMD 패턴을 그대로 따른다:

```javascript
// booking-approval-phase18/booking.js 상단 — UMD 패턴
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트
  }
  if (root) {
    root.BookingApproval = api; // 브라우저 전역
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function hasTimeOverlap(aStart, aEnd, bStart, bEnd) { /* ... */ }
  function findApprovedConflicts(booking, allBookings) { /* ... */ }
  function decideBooking(booking, action, allBookings, decidedAt, reason) { /* ... */ }
  function createBooking(input, existingBookings, createdAt) { /* ... */ }
  return {
    hasTimeOverlap: hasTimeOverlap,
    findApprovedConflicts: findApprovedConflicts,
    decideBooking: decideBooking,
    createBooking: createBooking
    /*, loadBookingState, saveBookingState — §8 */
  };
});
```

테스트 파일에서 `const { hasTimeOverlap, findApprovedConflicts, decideBooking, createBooking } = require('../booking-approval-phase18/booking.js')` 로 가져온다.

---

## 8. localStorage Adapter 인터페이스

### 8.1 저장 키 및 스키마 버전

| 항목 | 값 |
|------|-----|
| storage key | `'booking-approval-phase18:v1'` |
| 저장 포맷 | `JSON.stringify({ schemaVersion: 1, resources: Resource[], bookings: Booking[] })` |

### 8.2 Adapter 함수 시그니처

```javascript
/**
 * storage 로부터 상태를 읽는다. Storage 접근 자체는 부수효과이므로 §7 순수 함수와 분리한다.
 * @param {{ getItem(key: string): string|null, setItem(key: string, value: string): void }} storageLike
 *        브라우저의 window.localStorage 와 동일 인터페이스. 테스트에서는 in-memory mock 객체를 주입한다.
 * @returns {{ schemaVersion: number, resources: Resource[], bookings: Booking[] }}
 *          저장된 값이 없거나(getItem → null) JSON.parse 실패 또는 schemaVersion 불일치 시,
 *          §4 결정적 seed(schemaVersion: 1, resources: 3건, bookings: 5건)를 반환한다 — 예외를 던지지 않는다(크래시 금지).
 */
function loadBookingState(storageLike) { /* ... */ }

/**
 * 상태를 storage 에 저장한다.
 * @param {{ getItem(key: string): string|null, setItem(key: string, value: string): void }} storageLike
 * @param {{ schemaVersion: number, resources: Resource[], bookings: Booking[] }} state
 * @returns {void}
 * @throws {TypeError} state 형식이 §3 스키마에 맞지 않으면 (호출 전 §7 함수들로 만들어진 값만 저장하는 것을 전제)
 */
function saveBookingState(storageLike, state) { /* ... */ }
```

### 8.3 Adapter 사용 규칙 (검증 가능한 문장)

- 앱 최초 로드 시 `loadBookingState(window.localStorage)` 를 1회 호출해 초기 state 를 얻는다. 저장된 값이 없으면(신규 사용자) §4 seed 로 초기화된 state 가 반환되고, 이 state 는 즉시 `saveBookingState` 로 저장되어 다음 로드부터 동일 상태가 재사용된다.
- 예약 생성/승인/반려 등 상태를 바꾸는 모든 조작 직후, 갱신된 state 전체를 `saveBookingState` 로 다시 저장한다(부분 갱신 없음 — 항상 전체 스냅샷 저장).
- storage 가 비활성화된 환경(예: 브라우저 프라이빗 모드에서 `setItem` 이 throw)에서는 `saveBookingState` 내부에서 예외를 흡수하고, 화면에는 "임시 세션(저장 안 됨)" 안내만 표시한다(런타임 크래시 금지) — 단 §7 의 순수 함수 자체는 이 예외 처리 대상이 아니며, adapter 계층(§8)에서만 처리한다.
- `schemaVersion` 이 1이 아니거나 존재하지 않는 값이 저장돼 있으면 마이그레이션을 시도하지 않고 §4 seed 로 **완전히 대체**한다(v1 범위 — 마이그레이션 로직은 §14 비범위).

---

## 9. 화면 정보구조 (Screen IA)

단일 화면(`index.html`) 구조. 시각 디자인(색상/레이아웃 세부)은 designer(BF-1015)에게 위임하되(§15), 아래 구조·`data-*` 속성 계약은 developer(BF-1016)·tester(BF-1020) 가 공통으로 참조하는 고정 명세다.

### 9.1 영역 구성

```
┌─────────────────────────────────────────────┐
│ 헤더: 페이지 타이틀                            │
├─────────────────────────────────────────────┤
│ 필터 바 [data-testid="filter-bar"]             │
│  - 자원 필터  [data-field="filter-resource"]   │
│  - 상태 필터  [data-field="filter-status"]     │
├─────────────────────────────────────────────┤
│ 신규 예약 요청 폼 [data-testid="booking-form"]  │
│  - 자원 선택   [data-field="resourceId"]       │
│  - 신청자명    [data-field="requesterName"]    │
│  - 시작 시각   [data-field="startAt"]          │
│  - 종료 시각   [data-field="endAt"]            │
│  - 제출 버튼   [data-testid="submit-booking"]  │
│  - 검증 에러   [data-testid="form-error"]      │
├─────────────────────────────────────────────┤
│ 충돌 안내 배너 [data-testid="conflict-banner"] │
│  (승인 시도 시 CONFLICT 발생하면 표시, 평소 숨김)│
├─────────────────────────────────────────────┤
│ 예약 목록 [data-testid="booking-list"]         │
│  ┌───────────────────────────────────────┐   │
│  │ 예약 아이템 [data-testid="booking-item"] │   │
│  │  [data-booking-id="bkg-01"]             │   │
│  │  [data-status="requested|approved|      │   │
│  │              rejected"]                 │   │
│  │  - 자원명 / 신청자명 / 시작~종료 시각      │   │
│  │  - 상태 배지                             │   │
│  │  - (status==='requested' 일 때만 노출)    │   │
│  │    승인 버튼 [data-testid="approve-btn"] │   │
│  │    반려 버튼 [data-testid="reject-btn"]  │   │
│  │  - (status==='rejected' 일 때) 반려 사유 │   │
│  │    표시 [data-testid="reject-reason"]   │   │
│  └───────────────────────────────────────┘   │
│  ... (예약 건수만큼 반복)                       │
└─────────────────────────────────────────────┘
```

### 9.2 인터랙션 규칙 (검증 가능한 문장)

- IA-01: 신규 예약 요청 폼 제출 시 `createBooking`(§7.4) 을 호출한다. 검증 실패(필드 누락, `startAt >= endAt`) 시 `[data-testid="form-error"]` 영역에 에러 메시지를 표시하고 목록에는 추가하지 않는다.
- IA-02: 승인/반려 버튼은 `status === 'requested'` 인 예약 아이템에만 노출된다(§6.2 Guard 와 무관하게 UI 노출 여부는 status 로만 결정 — Guard 판정은 클릭 시점에 수행).
- IA-03: 승인 버튼 클릭 시 `decideBooking(booking, 'approve', ...)` 호출 결과가 `{ ok: false, code: 'CONFLICT' }` 이면 `[data-testid="conflict-banner"]` 를 노출하고 해당 아이템의 `data-status` 는 `requested` 로 유지된다(§6.2 #1, §11 AC-04).
- IA-04: 반려 버튼 클릭 시 사유 입력을 받아(빈 문자열 허용) `decideBooking(booking, 'reject', ..., reason)` 을 호출하고, 성공 시 `data-status="rejected"` 로 갱신하고 `[data-testid="reject-reason"]` 에 사유를 표시한다.
- IA-05: 필터 바의 자원/상태 필터는 목록 표시 항목만 제한한다(state 자체는 변경하지 않음 — 순수 뷰 필터).
- IA-06: 목록 항목 정렬은 seed/state 배열 순서를 그대로 따른다(별도 정렬 로직 없음 — v1 범위, §14).

---

## 10. 단위 테스트 전략

### 10.1 테스트 파일 위치 및 실행

```bash
# 실행 명령 (focused scope)
node --test tests/booking-approval-phase18-*.test.js
```

### 10.2 테스트 대상

`hasTimeOverlap`, `findApprovedConflicts`, `decideBooking`, `createBooking`, `loadBookingState`, `saveBookingState` — 6개 함수 전부 단위 테스트 대상이다. DOM 인터랙션(§9)은 이번 단위 테스트 범위에서 제외한다(E2E 는 별도 티켓 BF-1020 에서 다룸).

### 10.3 필수 테스트 케이스

#### `hasTimeOverlap`

| ID | aStart~aEnd | bStart~bEnd | 기대값 | 비고 |
|----|-------------|-------------|--------|------|
| TC-OV-01 | 02:00~03:00 | 03:00~04:00 | `false` | 경계 맞닿음 — 겹침 아님 |
| TC-OV-02 | 02:00~03:00 | 02:30~03:30 | `true` | 부분 겹침 |
| TC-OV-03 | 02:00~04:00 | 02:30~03:00 | `true` | 완전 포함 |
| TC-OV-04 | 02:00~03:00 | 02:00~03:00 | `true` | 완전 동일 |
| TC-OV-05 | 02:00~03:00 | 05:00~06:00 | `false` | 완전 분리 |
| TC-OV-06 | `03:00~02:00` (역전) | 아무값 | throw `RangeError` | aStart >= aEnd |

#### `findApprovedConflicts` (§4.2 seed 5건 기준)

| ID | 대상 | 기대 결과 |
|----|------|-----------|
| TC-FC-01 | `room-01`, `02:30~03:30` 신규 requested 예약 | `[bkg-01]` (approved 이고 겹침) 반환, `bkg-03`(rejected)는 제외 |
| TC-FC-02 | `room-02`, `06:00~07:00` 신규 예약 | `[]` (동일 시간대이나 자원이 다른 `bkg-05` 는 대상 아님, `room-02` 의 `bkg-04` 는 requested 라 제외) |
| TC-FC-03 | 자기 자신(`bkg-01`)을 목록에 포함해 호출 | 결과에 `bkg-01` 자신은 포함되지 않음 |

#### `decideBooking`

| ID | 대상 | action | 기대 결과 |
|----|------|--------|-----------|
| TC-DB-01 | `bkg-02`(requested, `room-01` 03:00~04:00) | `approve` | `ok: true`, `status: 'approved'`, 겹치는 approved 없음(`bkg-01` 은 02:00~03:00 로 경계만 닿음, 겹침 아님) |
| TC-DB-02 | 신규 requested 예약(`room-01`, `02:00~02:30`, `bkg-01`과 겹침) | `approve` | `ok: false`, `code: 'CONFLICT'`, 반환된 `booking.status` 는 여전히 `'requested'` |
| TC-DB-03 | 임의 requested 예약 | `reject` (reason 지정) | `ok: true`, `status: 'rejected'`, `reason` 이 그대로 기록됨 |
| TC-DB-04 | `bkg-01`(이미 approved) | `approve` | `ok: false`, `code: 'ALREADY_DECIDED'` |
| TC-DB-05 | 임의 requested 예약 | `'cancel'`(허용 안 된 action) | throw `TypeError` |

#### `createBooking`

| ID | 입력 | 기대 결과 |
|----|------|-----------|
| TC-CB-01 | 유효한 필드 전체 | `status: 'requested'`, `decidedAt: null`, `reason: null` 인 새 예약 반환 |
| TC-CB-02 | 기존 id 와 중복되는 `id` | throw `Error` |
| TC-CB-03 | `resourceId` 누락 | throw `TypeError` |
| TC-CB-04 | `startAt === endAt` (§4.3 `bkg-06` 예시) | throw `RangeError` |

#### `loadBookingState` / `saveBookingState`

| ID | 상황 | 기대 결과 |
|----|------|-----------|
| TC-LS-01 | `getItem` 이 `null` 반환(최초 진입) | §4 seed(resources 3건, bookings 5건) 반환 |
| TC-LS-02 | `getItem` 이 손상된 JSON 문자열 반환 | 예외 던지지 않고 §4 seed 로 폴백 |
| TC-LS-03 | `getItem` 이 `schemaVersion: 2` 인 값 반환 | §4 seed 로 대체 반환 |
| TC-LS-04 | 정상 state 를 `saveBookingState` 로 저장 후 동일 mock storage 로 `loadBookingState` 호출 | 저장한 값과 동일한 state 반환(round-trip) |

### 10.4 테스트 파일 구조 (참조 템플릿)

```javascript
// tests/booking-approval-phase18-BF1014.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  hasTimeOverlap, findApprovedConflicts, decideBooking, createBooking,
  loadBookingState, saveBookingState
} = require('../booking-approval-phase18/booking.js');

describe('hasTimeOverlap', () => {
  it('TC-OV-01: 경계만 맞닿으면 겹침 아님', () => {
    const r = hasTimeOverlap(
      '2026-07-25T02:00:00.000Z', '2026-07-25T03:00:00.000Z',
      '2026-07-25T03:00:00.000Z', '2026-07-25T04:00:00.000Z'
    );
    assert.strictEqual(r, false);
  });
  // TC-OV-02 ~ 06 동일 패턴
});
// findApprovedConflicts / decideBooking / createBooking / loadBookingState / saveBookingState 동일 패턴으로 describe 블록 구성
```

---

## 11. Acceptance Criteria (Given/When/Then)

Epic 수용 기준 3건을 검증 가능한 항목으로 매핑한다.

### AC-01: 예약 상태 전이 + 시간 충돌 판정 규칙의 결정적 정의

> **Given** Epic 요구(예약 상태 전이와 시간 충돌 판정 규칙의 결정적 정의)가 주어졌을 때
> **When** 본 명세(§5 시간 충돌 판정, §6 상태 머신)를 검토하면
> **Then** 겹침/충돌 공식(§5.1~5.2), 상태 전이표(§6.2, 4개 케이스)가 예외 케이스(역전 구간→RangeError, 미정의 action→TypeError)까지 표로 문서화되어 있고, §10.3 테스트 케이스(TC-OV-*, TC-DB-*)로 검증 가능하다

### AC-02: fixture+브라우저 상태만으로 구현 가능한 데이터 모델

> **Given** 데이터 의존성(외부 API/DB 금지) 제약이 주어졌을 때
> **When** §3(스키마)·§4(결정적 seed)·§8(localStorage adapter)를 검토하면
> **Then** Resource(3필드)·Booking(8필드) 스키마와 고정 리터럴 seed(자원 3건, 예약 5건), storage key/포맷/폴백 규칙(§8.1~8.3)이 모두 명시되어 있어 네트워크 호출 없이 `localStorage` 만으로 전체 흐름 구현이 가능하다

### AC-03: 각 AC의 검증 가능한 항목 매핑

> **Given** 수용 기준이 확정된 상태에서
> **When** 본 문서 §10(단위 테스트 전략)·§9.2(인터랙션 규칙 IA-01~06)를 검토하면
> **Then** AC-01/AC-02/AC-04/AC-05 각각이 구체적 테스트 케이스 ID(TC-OV-*, TC-FC-*, TC-DB-*, TC-CB-*, TC-LS-*) 또는 IA 규칙에 1:1로 매핑되어 developer/tester 가 그대로 구현·검증에 사용할 수 있다

### AC-04 (보조): 충돌 판정과 승인 Guard 연동

> **Given** 동일 `resourceId` 에 대해 이미 `approved` 인 예약이 존재할 때
> **When** 그 예약과 시간이 겹치는 다른 `requested` 예약에 `approve` 를 시도하면
> **Then** `decideBooking` 은 `{ ok: false, code: 'CONFLICT' }` 를 반환하고 대상 예약은 `requested` 상태로 유지되며, 화면에는 `[data-testid="conflict-banner"]` 가 노출된다(§6.2 #1, §9.2 IA-03, §10.3 TC-DB-02)

### AC-05 (보조): 화면 정보구조의 상태 기반 노출 규칙

> **Given** 예약 목록이 다양한 상태(requested/approved/rejected)로 구성되어 있을 때
> **When** §9 화면 정보구조를 적용하면
> **Then** 승인/반려 버튼은 `requested` 상태 아이템에만 노출되고, `rejected` 아이템은 반려 사유가 표시되며, 모든 아이템은 `data-status` 속성으로 상태를 노출한다(§9.1~9.2 IA-02, IA-04)

---

## 12. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|--------------|----------|-----------|
| EC-01 | 두 예약의 시간 구간이 경계에서만 맞닿음(`aEnd === bStart`) | 겹침 아님(§5.1) — 연속 예약 허용 |
| EC-02 | `resourceId` 가 다른 두 예약이 완전히 동일한 시간대 | 겹침/충돌 판정 대상 아님(자원별 독립) |
| EC-03 | `requested` 상태 두 건이 동일 자원·겹치는 시간대에 공존 | 허용됨 — 충돌은 `approved` 기준으로만 판정(§5.2), 승인 시점에 하나만 통과 |
| EC-04 | 이미 `approved` 인 예약에 다시 `approve` 호출 | 상태 불변, `ALREADY_DECIDED` 실패 코드 반환(예외 아님) |
| EC-05 | `decideBooking` 에 정의되지 않은 action 문자열 전달 | `TypeError` throw(프로그래밍 오류로 취급) |
| EC-06 | `createBooking` 에 `startAt === endAt`(0-구간) 전달 | `RangeError` throw, 예약 생성 거부 |
| EC-07 | localStorage 값이 손상된 JSON 또는 `schemaVersion` 불일치 | 예외 없이 §4 seed 로 폴백 |
| EC-08 | `localStorage.setItem` 이 예외를 던지는 환경(프라이빗 모드 등) | adapter 계층에서 흡수, 크래시 없이 "저장 안 됨" 안내만 표시(§8.3) |
| EC-09 | `findApprovedConflicts` 호출 시 대상 예약 자신이 목록에 포함됨 | 결과에서 자기 자신은 제외(§7.2) |
| EC-10 | 요청 예약이 여러 건의 approved 예약과 동시에 겹침 | `findApprovedConflicts` 가 겹치는 approved 예약 **전부**를 배열로 반환(첫 건만 반환하지 않음) |
| EC-11 | 신규 예약 요청 폼에서 `requesterName` 을 공백만 입력 | `createBooking` 은 1자 이상 요구(§3.2) — 공백 trim 후 빈 문자열이면 `TypeError` |
| EC-12 | 필터 바에서 상태 필터를 "전체" 이외로 선택 | 목록 표시만 제한, `localStorage` state 는 변경되지 않음(§9.2 IA-05) |

---

## 13. vanilla-static / file:// 제약

| 항목 | 요구 사항 |
|------|-----------|
| 외부 CDN | 금지 |
| JS 프레임워크 | 금지 — 순수 DOM API 만 사용 |
| 빌드 도구 | 금지 |
| 모듈 시스템 | §7.6 UMD 패턴 사용 |
| 네트워크 호출 | 금지 — `fetch`/`XMLHttpRequest`/외부 API 0건 |
| 저장소 | `localStorage` 만 사용(§8), 서버·DB 없음 |
| 실행 방식 | `index.html` 을 `file://` 로 직접 열어도 전체 흐름 정상 동작 |

---

## 14. 비범위 (Out of Scope)

v1 에서는 다음 기능을 다루지 않는다. 별도 스토리/Epic 에서 처리한다:

| 항목 | 이유 |
|------|------|
| `approved`/`rejected` → `requested` 취소/재요청 | 상태 전이 재설계 필요 — 별도 스토리 |
| `schemaVersion` 마이그레이션 로직(v1→v2 등) | 현재는 seed 완전 대체로 충분 — 별도 스토리 |
| 다중 사용자 동시 편집(동시성 제어, 락) | `localStorage` 단일 탭 가정 — 별도 Epic |
| 자원 자체의 CRUD(추가/삭제) | Resource 는 seed 고정 — 별도 스토리 |
| 반복 예약(recurring booking) | 단발 예약만 다룸 — 별도 스토리 |
| 목록 정렬/페이지네이션 | seed/state 배열 순서 그대로 사용 — 별도 스토리 |
| 알림/이메일 발송 | 외부 API 금지 제약과 상충 — 별도 Epic |

---

## 15. 디자이너 위임 시각 요소

아래 항목은 기획에서 정하지 않고 디자이너(BF-1015)에게 위임한다:

| 항목 | 가이드라인 |
|------|-----------|
| 컬러 팔레트 | 상태별(`requested`/`approved`/`rejected`) 구분 색상 자유 설계, 대비 요건은 리포 공통 WCAG 기준 준수 |
| 예약 카드/리스트 레이아웃 | 자유, 단 §9.1 의 `data-testid`/`data-status`/`data-booking-id`/`data-field` 속성 구조는 developer 구현과 일치해야 함 |
| 승인/반려 버튼 배치 | 자유, 단 `requested` 상태에서만 노출되는 것은 고정 요구(§9.2 IA-02) |
| 충돌 안내 UI(`conflict-banner`) | 에러 문구/토스트 디자인 자유, 단 "충돌로 승인 불가"라는 의미 전달은 필수(§9.2 IA-03) |
| 필터 바 UI(select/버튼 등) | 자유, 단 `data-field="filter-resource"`/`"filter-status"` 속성은 유지 |
| 신규 예약 요청 폼 UI | 자유, 단 §9.1 의 `data-field` 목록(`resourceId`/`requesterName`/`startAt`/`endAt`)과 `[data-testid="form-error"]` 는 유지 |

---

*문서 종료 — [박기획] · BF-1014*

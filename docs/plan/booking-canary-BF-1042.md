# 회의실 예약 충돌 검사 명세 — BF-1042 그룹 (booking-canary)

> 작성자: [박기획] · 작성일 2026-07-18
> 관련 티켓: BF-1043 (planner task) — 문서 파일명은 Epic 그룹 키 `BF-1042` 컨벤션을 따름 (형제 task와 동일 경로 공유 목적)
> 신규 모듈: `src/features/booking-canary/` (순수 함수 + fixture) / 검증 경로: `/demo/booking-canary`
> tech-stack: `typescript-monorepo`
> 단위 테스트: `node --test tests/booking-canary-*.test.js`
> 형제 task: BF-1044(designer) · BF-1045(developer) · BF-1047(tester)
> 선례 참고: `docs/plan/booking-approval-phase18-BF-1014.md` (동일 도메인의 직전 모듈) — §5 겹침(Overlap) 판정 공식(반열린 구간)과 §10 단위 테스트 전략 패턴을 계승. 단, 본 Epic은 승인/반려 상태 머신·localStorage 영속화를 요구하지 않으므로 해당 요소는 채택하지 않는다(§14 비범위, Simplicity First).

---

## 목차

1. [개요](#1-개요)
2. [사용자 시나리오](#2-사용자-시나리오)
3. [데이터 모델 — Fixture 스키마](#3-데이터-모델--fixture-스키마)
4. [결정론적 Fixture 시드 데이터](#4-결정론적-fixture-시드-데이터)
5. [입력 검증 규칙](#5-입력-검증-규칙)
6. [충돌 판정 규칙](#6-충돌-판정-규칙)
7. [대체 시간 후보 산출 규칙](#7-대체-시간-후보-산출-규칙)
8. [API 스펙 — 모듈 함수 Contract](#8-api-스펙--모듈-함수-contract)
9. [화면 정보구조 (Screen IA)](#9-화면-정보구조-screen-ia)
10. [단위 테스트 전략](#10-단위-테스트-전략)
11. [Acceptance Criteria (Given/When/Then)](#11-acceptance-criteria-givenwhenthen)
12. [Edge Case 목록](#12-edge-case-목록)
13. [마이그레이션 무결성 원칙](#13-마이그레이션-무결성-원칙)
14. [비범위 (Out of Scope)](#14-비범위-out-of-scope)
15. [디자이너 위임 시각 요소](#15-디자이너-위임-시각-요소)
16. [미해결 결정 사항 (Open Decisions)](#16-미해결-결정-사항-open-decisions)

---

## 1. 개요

### 1.1 목적

회의실 예약 요청에 대해 **입력 검증 → 충돌 판정 → (충돌 시) 대체 시간 후보 산출**로 이어지는 흐름을 결정론적 순수 함수 계약으로 정의하고, 이를 검증하는 `/demo/booking-canary` 화면과 결정론적 fixture 데이터를 확정한다. 서버/DB/네트워크 호출은 존재하지 않으며, 모든 판정은 fixture(고정 리터럴) 데이터를 입력으로 하는 순수 함수로 수행된다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 신규 경로 | `src/features/booking-canary/` (types/validation/conflict/alternatives/fixtures), `/demo/booking-canary` 라우트 1개(§16 Open Decision #1) |
| 개념 라우트 | `/demo/booking-canary` — 검증 전용 데모 화면 |
| 기존 코드 영향 | **없음** — 기존 화면·컴포넌트·데이터 스키마를 참조/수정하지 않는 완전 독립 신규 모듈 |
| 데이터 저장 | 없음 — 요청 결과는 화면에만 표시되고 영속화하지 않는다(§14) |
| 외부 라이브러리 / API | 없음 |

### 1.3 전제 조건

- 시간 값은 항상 **ISO 8601 문자열**(`YYYY-MM-DDTHH:mm:ss.sssZ`)로 표현한다.
- 모든 판정 로직은 `Date.now()`/인자 없는 `new Date()` 등 비결정적 시각 소스를 사용하지 않는다 — "현재 시각"이 필요한 지점은 없다(예약 요청 자체에 과거/미래 제약을 두지 않음, §14).
- `tests/booking-canary-*.test.js` 가 `node --test` 로 실행 가능해야 한다.

### 1.4 용어 정의

| 용어 | 정의 |
|------|------|
| Room (회의실) | 예약 대상이 되는 회의실. 고유 `id` 보유 |
| Booking (예약) | 특정 Room 에 대한 기존 확정 예약 1건(fixture 상 존재하는 예약 — 상태 구분 없음, §14) |
| Booking Request (예약 요청) | 사용자가 화면에서 입력해 검사를 요청하는 신규 예약 후보(아직 fixture 에 저장되지 않음) |
| 겹침 (Overlap) | 두 시간 구간의 `[startAt, endAt)` 이 하나라도 공통 시각을 포함하는 경우(§6.1) |
| 충돌 (Conflict) | 동일 `roomId` 에 대해 예약 요청과 기존 Booking 이 겹치는 경우(§6.2) |
| 대체 시간 후보 (Alternative Candidate) | 충돌 발생 시 시스템이 제시하는, 충돌 없이 예약 가능한 시간/회의실 조합(§7) |

---

## 2. 사용자 시나리오

| ID | As | I want | So that |
|----|----|--------|---------|
| US-01 | 예약 신청자 | 회의실·신청자명·시작/종료 시각을 입력해 예약 가능 여부를 검사하고 싶다 | 실제 예약 전에 충돌 여부를 미리 확인할 수 있다 |
| US-02 | 예약 신청자 | 시작 시각이 종료 시각보다 늦거나 필수값이 빠지면 즉시 명확한 에러를 보고 싶다 | 잘못된 입력으로 헛된 충돌 검사를 하지 않을 수 있다 |
| US-03 | 예약 신청자 | 입력한 시간대에 동일 회의실의 기존 예약과 겹치면 "충돌"이라는 결과를 명확히 보고 싶다 | 이중 예약을 피할 수 있다 |
| US-04 | 예약 신청자 | 충돌이 발생하면 대안(같은 회의실의 다른 시간, 또는 같은 시간의 다른 회의실)을 바로 안내받고 싶다 | 재입력을 반복하지 않고 빠르게 대안을 선택할 수 있다 |
| US-05 | 예약 신청자 | 충돌이 없으면 대체 후보 없이 "예약 가능" 결과만 명확히 보고 싶다 | 불필요한 정보에 혼란스럽지 않다 |

각 시나리오는 §11 의 AC 로 검증 가능하게 매핑된다.

---

## 3. 데이터 모델 — Fixture 스키마

### 3.1 Room 스키마

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | `string` | ✅ | 고유 식별자. 패턴 `room-\d{2}` (예: `room-01`) |
| `name` | `string` | ✅ | 회의실 표시명 |
| `capacity` | `number` (양의 정수) | ✅ | 수용 인원 |

- `id` 는 fixture 전체에서 유일해야 한다.

### 3.2 Booking 스키마

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | `string` | ✅ | 고유 식별자. 패턴 `bkg-\d{2}` |
| `roomId` | `string` | ✅ | 대상 Room 의 `id`. fixture 내 존재하는 `room.id` 를 참조해야 함 |
| `requesterName` | `string` (1자 이상) | ✅ | 신청자 표시명 |
| `startAt` | `string` (ISO 8601) | ✅ | 예약 시작 시각 |
| `endAt` | `string` (ISO 8601) | ✅ | 예약 종료 시각. 반드시 `startAt` 보다 이후(`startAt < endAt`) |

> 승인/반려 등 상태 필드는 두지 않는다 — 본 Epic 범위에서 fixture 의 모든 Booking 은 "이미 확정된 기존 예약"으로 취급하며 충돌 판정의 대상이 된다(§14 비범위: 상태 머신 미도입).

### 3.3 BookingRequestInput 스키마 (화면 입력, fixture 아님)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `roomId` | `string` | ✅ | 검사 대상 회의실 |
| `requesterName` | `string` | ✅ | 신청자명 |
| `startAt` | `string` | ✅ | ISO 8601 문자열(형식 미검증 상태로 들어올 수 있음) |
| `endAt` | `string` | ✅ | ISO 8601 문자열(형식 미검증 상태로 들어올 수 있음) |

### 3.4 유효성 규칙 요약 (검증 가능한 문장)

- `startAt`, `endAt` 은 `Date.parse()` 로 파싱 가능한 문자열이어야 한다(§5).
- `startAt >= endAt` 인 예약(요청/fixture 불문)은 invalid — fixture 시드에는 존재해서는 안 된다.
- `booking.roomId`/`request.roomId` 가 fixture 의 어떤 `room.id` 와도 일치하지 않으면 invalid(참조 무결성 위반, §5).

---

## 4. 결정론적 Fixture 시드 데이터

시간·난수 등 비결정적 값을 사용하지 않고, 아래 고정 리터럴을 그대로 fixture 로 사용한다. 개발자는 이 표를 그대로 배열 리터럴로 구현하며 임의로 값을 바꾸지 않는다(본 문서가 유일한 source of truth).

### 4.1 Room Fixture (3건)

| id | name | capacity |
|----|------|----------|
| `room-01` | 3층 대회의실 | 12 |
| `room-02` | 4층 소회의실 A | 4 |
| `room-03` | 4층 소회의실 B | 4 |

### 4.2 Booking Fixture (5건)

| id | roomId | requesterName | startAt | endAt |
|----|--------|----------------|---------|-------|
| `bkg-01` | `room-01` | 김도윤 | `2026-07-27T01:00:00.000Z` | `2026-07-27T02:00:00.000Z` |
| `bkg-02` | `room-01` | 이서준 | `2026-07-27T02:00:00.000Z` | `2026-07-27T03:00:00.000Z` |
| `bkg-03` | `room-02` | 박지호 | `2026-07-27T04:00:00.000Z` | `2026-07-27T05:00:00.000Z` |
| `bkg-04` | `room-03` | 최하은 | `2026-07-27T04:00:00.000Z` | `2026-07-27T05:00:00.000Z` |
| `bkg-05` | `room-01` | 정민서 | `2026-07-28T00:00:00.000Z` | `2026-07-28T01:00:00.000Z` |

> `bkg-01`/`bkg-02` 는 `room-01` 에서 경계만 맞닿은(겹침 아님) 연속 예약 사례다(§6.1 EC-01). `bkg-03`/`bkg-04` 는 서로 다른 회의실에 대해 완전히 동일한 시간대가 공존 가능함을 보여준다(회의실이 다르면 겹침 판정 대상이 아님, §6.1).

### 4.3 검증용 Invalid 예시 (fixture 배열에는 미포함, `validateBookingInput` 거부 테스트 자료)

| 필드 | 값 | 비고 |
|------|-----|------|
| `startAt`/`endAt` | `2026-07-27T09:00:00.000Z` / `2026-07-27T09:00:00.000Z` | 동일 시각(0-구간) — §5.2 TC-VL-04 자료로만 사용 |
| `startAt`/`endAt` | `2026-07-27T09:00:00.000Z` / `2026-07-27T08:00:00.000Z` | 시간 역전 — §5.2 TC-VL-05 자료로만 사용 |

---

## 5. 입력 검증 규칙

검증은 아래 순서로 **fail-fast**(첫 실패에서 즉시 반환)로 수행한다.

### 5.1 검증 순서 및 실패 코드

| 순서 | 검사 항목 | 실패 조건 | 실패 코드 |
|------|-----------|-----------|-----------|
| 1 | 필수값 존재 | `roomId`/`requesterName`/`startAt`/`endAt` 중 하나라도 `undefined`/`null`/빈 문자열(`requesterName` 은 trim 후 빈 문자열 포함) | `MISSING_FIELD` |
| 2 | 시간 포맷 | `startAt` 또는 `endAt` 이 `Date.parse()` 로 파싱 불가(`NaN`) | `INVALID_TIME_FORMAT` |
| 3 | 시간 역전 | `Date.parse(startAt) >= Date.parse(endAt)` (0 또는 음의 구간 포함) | `TIME_INVERSION` |
| 4 | 회의실 참조 | `roomId` 가 fixture `rooms` 목록의 어떤 `room.id` 와도 일치하지 않음 | `UNKNOWN_ROOM` |

- 4단계를 모두 통과해야 §6 충돌 판정 단계로 진행한다.
- 검증 실패는 **예외를 던지지 않는다** — `ValidationResult` 값으로 반환한다(§8.2). 예외는 함수 인자 자체의 타입이 잘못된 프로그래밍 오류(예: `input` 이 객체가 아님)일 때만 던진다.

### 5.2 필수 테스트 케이스 매핑

| ID | 입력 | 기대 |
|----|------|------|
| TC-VL-01 | 4개 필드 모두 유효 | `{ valid: true }` |
| TC-VL-02 | `roomId` 누락 | `{ valid: false, code: 'MISSING_FIELD', field: 'roomId' }` |
| TC-VL-03 | `requesterName` 이 공백 문자열(`"   "`) | `{ valid: false, code: 'MISSING_FIELD', field: 'requesterName' }` |
| TC-VL-04 | `startAt === endAt` (§4.3 예시) | `{ valid: false, code: 'TIME_INVERSION' }` |
| TC-VL-05 | `startAt > endAt` (§4.3 예시) | `{ valid: false, code: 'TIME_INVERSION' }` |
| TC-VL-06 | `startAt` 이 파싱 불가 문자열(`"not-a-date"`) | `{ valid: false, code: 'INVALID_TIME_FORMAT' }` |
| TC-VL-07 | `roomId` 가 fixture 에 없는 값(`"room-99"`) | `{ valid: false, code: 'UNKNOWN_ROOM' }` |

---

## 6. 충돌 판정 규칙

### 6.1 겹침(Overlap) 판정 기준

두 시간 구간은 **반열린 구간(half-open interval)** `[start, end)` 으로 취급한다. 구간 `A = [aStart, aEnd)`, `B = [bStart, bEnd)` 에 대해:

```
겹침(A, B) := aStart < bEnd && bStart < aEnd
```

- 경계가 정확히 맞닿는 경우(`aEnd === bStart` 또는 `bEnd === aStart`)는 **겹침이 아니다**.
- 두 구간이 완전히 동일하거나, 한 구간이 다른 구간을 완전히 포함해도 겹침이다.
- `roomId` 가 다른 두 예약은 시간이 겹쳐도 겹침 판정 대상이 아니다(회의실 단위로 독립).

### 6.2 충돌(Conflict) 정의

> 예약 요청 `R` 이 특정 `roomId` 에 대해, fixture 상의 기존 Booking 중 시간이 겹치는 것이 하나 이상 있으면 `R` 은 "충돌"이다.

- 충돌 판정은 §5 검증을 통과한 요청에 대해서만 수행한다.
- 충돌 결과는 겹치는 **모든** Booking 을 포함한다(첫 건만 반환하지 않음).
- `roomId` 가 다른 Booking 은 애초에 겹침 판정 대상에서 제외된다(§6.1).

---

## 7. 대체 시간 후보 산출 규칙

충돌(§6.2)이 발생한 경우에만 수행한다. 두 트랙을 결정론적 순서로 조합해 최대 `maxCandidates`(기본 3)개까지 후보를 산출한다.

### 7.1 Track A — 같은 회의실 순연(same-room-push)

1. 요청과 겹치는 기존 Booking 들 중 `endAt` 이 가장 늦은 값을 새 시작 시각 후보로 삼는다.
2. 원래 요청의 길이(`duration = endAt - startAt`)를 유지해 새 종료 시각을 계산한다.
3. 이 새 구간이 같은 `roomId` 의 다른 Booking 과 다시 겹치면, 그 Booking 의 `endAt` 으로 다시 미는 과정을 반복한다.
4. 반복은 `maxPushIterations`(기본 3)회까지만 시도한다. 그 안에 겹침 없는 구간을 찾으면 Track A 후보 1개를 채택하고, 못 찾으면 Track A 후보는 없음(빈 상태, 에러 아님).

### 7.2 Track B — 같은 시간대 다른 회의실(same-time-other-room)

1. 원래 요청과 동일한 `[startAt, endAt)` 구간을 유지한다.
2. fixture `rooms` 를 `id` **오름차순**으로 순회하며, 요청의 `roomId` 를 제외하고, 해당 구간에 겹치는 기존 Booking 이 없는 회의실을 순서대로 채택한다.
3. 채택 개수는 `maxCandidates - (Track A 채택 수)` 를 넘지 않는다.
4. 겹침 없는 회의실이 하나도 없으면 Track B 후보는 없음(빈 상태, 에러 아님).

### 7.3 최종 후보 조합 및 정렬

```
최종 후보 = [Track A 후보(있으면 1개)] ++ [Track B 후보들(§7.2 순서)]
결과는 maxCandidates 개수로 자른다.
```

- 충돌이 없는 요청에 대해 호출하면 항상 빈 배열을 반환한다(§9.2 IA 규칙상 UI 는 충돌이 없을 때 호출하지 않는다).
- 두 트랙 모두 후보가 없으면 빈 배열을 반환한다(예외 아님) — 화면에는 "제안 가능한 대체 시간 없음" 안내만 표시한다.

### 7.4 예시 (§4.2 Booking Fixture 기준, `maxCandidates=3`)

요청: `room-01`, `2026-07-27T01:30:00.000Z` ~ `2026-07-27T02:30:00.000Z`

- 충돌: `bkg-01`(01:00~02:00), `bkg-02`(02:00~03:00) — 둘 다 겹침
- Track A: 겹친 Booking 중 최대 `endAt` = `03:00` → 후보 `03:00~04:00`. `room-01` 의 다른 Booking(`bkg-05`, 07-28)과 겹치지 않음 → 1회 반복으로 채택
- Track B: `room-02`(같은 시간 `bkg-03` 04:00~05:00, 겹침 없음) → 채택, `room-03`(같은 시간 `bkg-04` 04:00~05:00, 겹침 없음) → 채택
- 최종 후보(3개, 상한 도달): `[{room-01, 03:00~04:00, same-room-push}, {room-02, 01:30~02:30, same-time-other-room}, {room-03, 01:30~02:30, same-time-other-room}]`

---

## 8. API 스펙 — 모듈 함수 Contract

모든 함수는 **순수 함수**다 — DOM 조작·저장소 접근·난수·현재 시각 조회 없음, 입력 배열/객체를 변경하지 않는다.

### 8.1 타입 정의 (`src/features/booking-canary/types.ts`)

```typescript
export interface Room {
  id: string;           // 패턴: room-\d{2}
  name: string;
  capacity: number;     // 양의 정수
}

export interface Booking {
  id: string;            // 패턴: bkg-\d{2}
  roomId: string;        // Room.id 참조
  requesterName: string; // 1자 이상(trim 후)
  startAt: string;       // ISO 8601
  endAt: string;         // ISO 8601, startAt 이후
}

export interface BookingRequestInput {
  roomId: string;
  requesterName: string;
  startAt: string;
  endAt: string;
}

export type ValidationFailureCode =
  | 'MISSING_FIELD'
  | 'INVALID_TIME_FORMAT'
  | 'TIME_INVERSION'
  | 'UNKNOWN_ROOM';

export type ValidationResult =
  | { valid: true }
  | { valid: false; code: ValidationFailureCode; field?: string };

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Booking[]; // 겹치는 모든 기존 Booking, fixture 배열 순서 유지
}

export type AlternativeStrategy = 'same-room-push' | 'same-time-other-room';

export interface AlternativeCandidate {
  roomId: string;
  startAt: string;
  endAt: string;
  strategy: AlternativeStrategy;
}
```

### 8.2 검증 함수 (`src/features/booking-canary/validation.ts`)

```typescript
/**
 * 예약 요청 입력을 §5 규칙에 따라 검증한다.
 * @throws {TypeError} input 또는 rooms 가 예상 타입이 아닌 프로그래밍 오류인 경우에만
 */
export function validateBookingInput(
  input: Partial<BookingRequestInput>,
  rooms: Room[]
): ValidationResult;
```

### 8.3 충돌 판정 함수 (`src/features/booking-canary/conflict.ts`)

```typescript
/** 두 시간 구간의 겹침 여부(§6.1 공식) */
export function hasOverlap(
  aStart: string, aEnd: string, bStart: string, bEnd: string
): boolean;

/** §5 검증을 통과한 요청에 대해서만 호출한다는 전제(§6.2) */
export function findConflicts(
  request: BookingRequestInput,
  allBookings: Booking[]
): ConflictResult;
```

### 8.4 대체 후보 함수 (`src/features/booking-canary/alternatives.ts`)

```typescript
export interface FindAlternativeSlotsOptions {
  maxCandidates?: number;      // 기본 3
  maxPushIterations?: number;  // 기본 3 (Track A 재시도 상한, §7.1)
}

/** §7 규칙 그대로 구현. 충돌이 없는 요청에도 호출 가능(빈 배열 반환, §7.3) */
export function findAlternativeSlots(
  request: BookingRequestInput,
  allBookings: Booking[],
  allRooms: Room[],
  options?: FindAlternativeSlotsOptions
): AlternativeCandidate[];
```

### 8.5 Fixture (`src/features/booking-canary/fixtures.ts`)

```typescript
export const ROOMS: Room[];    // §4.1 표 그대로, 임의 변경 금지
export const BOOKINGS: Booking[]; // §4.2 표 그대로, 임의 변경 금지
```

### 8.6 Export 방식

모듈은 TypeScript 표준 named export 를 사용한다(기존 리포의 다른 `src/features/*` 모듈과 동일한 규약을 따른다 — vanilla-static UMD 패턴은 해당 없음).

---

## 9. 화면 정보구조 (Screen IA)

단일 화면(`/demo/booking-canary`) 구조. 시각 디자인(색상/레이아웃 세부)은 designer(BF-1044)에게 위임하되(§15), 아래 구조·`data-*` 속성 계약은 developer(BF-1045)·tester(BF-1047) 가 공통으로 참조하는 고정 명세다.

### 9.1 영역 구성

```
┌─────────────────────────────────────────────┐
│ 헤더: 페이지 타이틀                            │
├─────────────────────────────────────────────┤
│ 예약 검사 폼 [data-testid="booking-check-form"]│
│  - 회의실 선택   [data-field="roomId"]         │
│  - 신청자명      [data-field="requesterName"]  │
│  - 시작 시각     [data-field="startAt"]        │
│  - 종료 시각     [data-field="endAt"]          │
│  - 검사 버튼     [data-testid="check-btn"]     │
│  - 검증 에러     [data-testid="form-error"]    │
│    [data-error-code="MISSING_FIELD|            │
│     INVALID_TIME_FORMAT|TIME_INVERSION|        │
│     UNKNOWN_ROOM"]                             │
├─────────────────────────────────────────────┤
│ 결과 영역 [data-testid="result-panel"]         │
│  [data-result="available|conflict"]            │
│  - 충돌 없음: "예약 가능" 안내                   │
│  - 충돌 있음: 충돌 목록                          │
│    [data-testid="conflict-list"]               │
│    [data-testid="conflict-item"] × N            │
│  - 대체 후보 목록(충돌 시에만 노출)                │
│    [data-testid="alternative-list"]            │
│    [data-testid="alternative-item"] × N         │
│    [data-strategy="same-room-push|              │
│     same-time-other-room"]                     │
│    (후보 0개면 "제안 가능한 대체 시간 없음" 안내)   │
└─────────────────────────────────────────────┘
```

### 9.2 인터랙션 규칙 (검증 가능한 문장)

- IA-01: 검사 버튼 클릭 시 `validateBookingInput`(§8.2) 을 먼저 호출한다. 검증 실패 시 `[data-testid="form-error"]` 에 실패 코드에 대응하는 에러 메시지를 표시하고, `findConflicts`/`findAlternativeSlots` 는 호출하지 않는다.
- IA-02: 검증 통과 시 `findConflicts`(§8.3) 를 호출한다. `hasConflict === false` 이면 `[data-result="available"]` 로 결과 영역을 렌더링하고 `[data-testid="alternative-list"]` 는 렌더링하지 않는다.
- IA-03: `hasConflict === true` 이면 `[data-result="conflict"]` 로 렌더링하고 `[data-testid="conflict-item"]` 을 `conflicts` 배열 순서대로 노출한 뒤, `findAlternativeSlots`(§8.4) 를 호출해 `[data-testid="alternative-item"]` 을 반환 순서(§7.3) 그대로 노출한다.
- IA-04: `findAlternativeSlots` 결과가 빈 배열이면 `[data-testid="alternative-list"]` 영역에 "제안 가능한 대체 시간 없음" 문구만 표시한다(§7.3).
- IA-05: 화면은 예약 요청을 fixture 에 추가하거나 어떤 방식으로도 영속화하지 않는다 — 매 검사는 독립적이며 fixture(§4)는 항상 초기 상태로 고정된다(§13, §14).

---

## 10. 단위 테스트 전략

### 10.1 테스트 파일 위치 및 실행

```bash
# 실행 명령 (focused scope)
node --test tests/booking-canary-*.test.js
```

### 10.2 테스트 대상

`validateBookingInput`, `hasOverlap`, `findConflicts`, `findAlternativeSlots` — 4개 함수 전부 단위 테스트 대상이다. DOM 인터랙션(§9)은 이번 단위 테스트 범위에서 제외한다(E2E 는 별도 티켓 BF-1047 에서 다룸).

### 10.3 필수 테스트 케이스

#### `validateBookingInput` — §5.2 표(TC-VL-01~07) 그대로 적용

#### `hasOverlap`

| ID | aStart~aEnd | bStart~bEnd | 기대값 | 비고 |
|----|-------------|-------------|--------|------|
| TC-OV-01 | 01:00~02:00 | 02:00~03:00 | `false` | 경계 맞닿음 |
| TC-OV-02 | 01:00~02:00 | 01:30~02:30 | `true` | 부분 겹침 |
| TC-OV-03 | 01:00~03:00 | 01:30~02:00 | `true` | 완전 포함 |
| TC-OV-04 | 01:00~02:00 | 01:00~02:00 | `true` | 완전 동일 |
| TC-OV-05 | 01:00~02:00 | 05:00~06:00 | `false` | 완전 분리 |

#### `findConflicts` (§4.2 fixture 5건 기준)

| ID | 요청 | 기대 결과 |
|----|------|-----------|
| TC-FC-01 | `room-01`, `2026-07-27T01:30~02:30` | `hasConflict: true`, `conflicts: [bkg-01, bkg-02]` |
| TC-FC-02 | `room-01`, `2026-07-27T02:00~... 03:00`(경계 접합, `bkg-02`와 동일) — 실제로는 완전 동일 구간이므로 겹침 | `hasConflict: true`, `conflicts: [bkg-02]` |
| TC-FC-03 | `room-02`, `2026-07-27T04:00~05:00` | `hasConflict: true`, `conflicts: [bkg-03]` (같은 시간대의 `room-03` `bkg-04` 는 대상 아님) |
| TC-FC-04 | `room-01`, `2026-07-29T00:00~01:00`(fixture 와 무관한 시간대) | `hasConflict: false`, `conflicts: []` |

#### `findAlternativeSlots`

| ID | 요청 | 기대 결과 |
|----|------|-----------|
| TC-AS-01 | §7.4 예시 요청(`room-01`, 01:30~02:30) | `[{room-01,03:00~04:00,same-room-push}, {room-02,01:30~02:30,same-time-other-room}, {room-03,01:30~02:30,same-time-other-room}]` (순서 고정) |
| TC-AS-02 | 충돌 없는 요청(TC-FC-04 와 동일 입력) | `[]` |
| TC-AS-03 | `maxCandidates: 1` 옵션과 함께 TC-AS-01 과 동일 요청 | Track A 후보 1개만 반환 |
| TC-AS-04 | 모든 회의실이 같은 시간대에 이미 사용 중인 가상 fixture(테스트 전용 mock 데이터) | Track B 후보 없음 — Track A 후보만 있으면 그것만 반환, 둘 다 없으면 `[]` |

### 10.4 테스트 파일 구조 (참조 템플릿)

```javascript
// tests/booking-canary-BF1043.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateBookingInput } = require('../src/features/booking-canary/validation');
const { hasOverlap, findConflicts } = require('../src/features/booking-canary/conflict');
const { findAlternativeSlots } = require('../src/features/booking-canary/alternatives');
const { ROOMS, BOOKINGS } = require('../src/features/booking-canary/fixtures');

describe('validateBookingInput', () => {
  it('TC-VL-01: 모든 필드 유효하면 valid:true', () => {
    const r = validateBookingInput({
      roomId: 'room-01', requesterName: '김도윤',
      startAt: '2026-07-27T01:00:00.000Z', endAt: '2026-07-27T02:00:00.000Z'
    }, ROOMS);
    assert.deepStrictEqual(r, { valid: true });
  });
  // TC-VL-02 ~ 07 동일 패턴
});
// hasOverlap / findConflicts / findAlternativeSlots 동일 패턴으로 describe 블록 구성
```

> 실제 import 경로(`require('../src/features/booking-canary/...')`)는 §16 Open Decision #1 확정 후 developer 가 최종 조정한다. 함수/타입 이름은 §8 계약을 그대로 따른다.

---

## 11. Acceptance Criteria (Given/When/Then)

Epic 수용 기준 2건을 검증 가능한 항목으로 매핑한다.

### AC-01: 입력 검증·충돌 판정·대체 후보·fixture 스키마 규칙의 검증 가능한 정의

> **Given** Epic 요구(입력 검증·충돌 판정·대체 후보·fixture 스키마 규칙 확정)가 주어졌을 때
> **When** 본 명세(§3 데이터 모델, §5 입력 검증, §6 충돌 판정, §7 대체 후보)를 검토하면
> **Then** 각 규칙이 실패 코드/공식/알고리즘 단계로 표 또는 의사코드로 문서화되어 있고, §10 의 구체적 테스트 케이스(TC-VL-*, TC-OV-*, TC-FC-*, TC-AS-*)로 1:1 검증 가능하다

### AC-02: 마이그레이션 무결성 — 신규 경로 한정·기존 영향 0·롤백 가능

> **Given** 마이그레이션 무결 요구(신규 경로만 추가, 기존 영향 0, 롤백 가능)가 주어졌을 때
> **When** §13(마이그레이션 무결성 원칙)을 검토하면
> **Then** 신규로 추가되는 경로 목록, 기존 코드/데이터에 대한 영향 범위(없음), 롤백 절차(신규 파일 삭제만으로 완결)가 명시적으로 기술되어 있다

### AC-03 (보조): 회의실 단위 겹침 판정의 정확성

> **Given** 서로 다른 두 회의실에 완전히 동일한 시간대의 예약(fixture `bkg-03`/`bkg-04`)이 존재할 때
> **When** `findConflicts` 를 각 회의실 기준으로 호출하면
> **Then** 서로 다른 회의실의 예약은 겹침 판정 대상에 포함되지 않는다(§6.1, TC-FC-03)

### AC-04 (보조): 대체 시간 후보의 결정론적 산출

> **Given** 요청이 동일 회의실의 여러 기존 예약과 겹쳐 충돌할 때
> **When** `findAlternativeSlots` 를 호출하면
> **Then** Track A(같은 회의실 순연) 후보가 먼저, Track B(같은 시간 다른 회의실) 후보가 회의실 id 오름차순으로 뒤따르는 고정된 순서로 최대 `maxCandidates` 개까지 반환된다(§7.3, TC-AS-01)

---

## 12. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|--------------|----------|-----------|
| EC-01 | 두 예약의 시간 구간이 경계에서만 맞닿음(`aEnd === bStart`) | 겹침 아님(§6.1) — 연속 예약은 충돌로 취급하지 않음 |
| EC-02 | `roomId` 가 다른 두 예약이 완전히 동일한 시간대 | 겹침/충돌 판정 대상 아님(회의실별 독립) |
| EC-03 | `startAt === endAt`(0-구간) 요청 | `TIME_INVERSION` 으로 검증 단계에서 거부, 충돌 판정까지 가지 않음 |
| EC-04 | `startAt > endAt`(시간 역전) 요청 | `TIME_INVERSION` 으로 검증 단계에서 거부 |
| EC-05 | 필수값(`roomId`/`requesterName`/`startAt`/`endAt`) 중 하나라도 누락 | `MISSING_FIELD` 로 거부, 어떤 필드인지 `field` 로 명시 |
| EC-06 | `requesterName` 이 공백 문자만 입력됨 | trim 후 빈 문자열이면 `MISSING_FIELD` |
| EC-07 | `roomId` 가 fixture 에 존재하지 않는 값 | `UNKNOWN_ROOM` 으로 거부 |
| EC-08 | `startAt`/`endAt` 이 `Date.parse` 불가 문자열 | `INVALID_TIME_FORMAT` 으로 거부 |
| EC-09 | Track A 순연이 `maxPushIterations` 내에 겹침 없는 구간을 못 찾음 | Track A 후보 없음(빈 상태) — 에러 아님, Track B 만으로 결과 구성 |
| EC-10 | Track B 에서 요청 회의실을 제외한 모든 회의실이 같은 시간대에 이미 사용 중 | Track B 후보 없음 — Track A 만으로 결과 구성, 둘 다 없으면 최종 `[]` |
| EC-11 | 충돌이 없는 요청에 대해 `findAlternativeSlots` 를 직접 호출 | 빈 배열 반환(예외 아님) — §9.2 IA-02 에 따라 화면은 정상 흐름에서 이 경우 호출하지 않는다 |
| EC-12 | 예약 요청이 여러 건의 기존 Booking 과 동시에 겹침 | `findConflicts` 가 겹치는 Booking **전부**를 배열로 반환(첫 건만 반환하지 않음, §6.2) |

---

## 13. 마이그레이션 무결성 원칙

| 항목 | 규칙 |
|------|------|
| 신규 경로 한정 | `src/features/booking-canary/**`, `/demo/booking-canary` 라우트 1개(§16 Open Decision #1 확정 위치), `docs/plan/booking-canary-BF-1042.md`, `docs/design/booking-canary-BF-1042.md`(designer), `tests/booking-canary-*.test.*` — 이 목록 밖의 기존 파일은 **수정하지 않는다** |
| 기존 화면·데이터 무변경 | 기존 canary 모듈(예: `return-approvals-canary`, `delivery-exceptions-canary` 등)이나 기존 예약/회의실 관련 컴포넌트·상태를 import·수정하지 않는 완전 독립 모듈이다. 기존 export/함수 시그니처 변경 없음 |
| 영속 저장 없음 | localStorage/DB/외부 API 를 전혀 사용하지 않으므로 스키마 마이그레이션 자체가 발생하지 않는다(§9.2 IA-05) |
| 롤백 가능 조건 | 위 "신규 경로" 목록에 해당하는 파일만 삭제(또는 관련 커밋 revert)하면 기존 시스템 어디에도 영향이 남지 않는다 — 기존 라우트 등록/네비게이션/공용 컴포넌트에 대한 변경이 없으므로 부분 롤백이 아닌 완전한 롤백이 가능하다 |
| 검증 가능성 | `git diff --stat` 기준으로 위 신규 경로 밖의 파일이 0건 변경이면 본 원칙 준수로 간주한다(PR 리뷰 체크리스트 항목으로 사용 가능) |

---

## 14. 비범위 (Out of Scope)

v1 에서는 다음 기능을 다루지 않는다. 별도 스토리/Epic 에서 처리한다:

| 항목 | 이유 |
|------|------|
| 승인/반려 등 예약 상태 머신 | 본 Epic 은 "충돌 검사"만 요구 — 별도 스토리 |
| 예약 요청의 fixture 반영/영속 저장(localStorage 등) | "결정론적 fixture" 요구는 매 검사가 고정 입력에서 시작함을 의미 — 별도 스토리 |
| 과거 시각 예약 금지 등 시각 기반 추가 제약 | Epic 요구에 명시되지 않음(§1.3) — 별도 스토리 |
| 예약 최소/최대 길이 제한 | Epic 요구에 명시되지 않음 — 별도 스토리 |
| 회의실 자체 CRUD(추가/삭제/수용인원 변경) | Room 은 fixture 고정 — 별도 스토리 |
| 반복 예약(recurring booking) | 단발 예약 검사만 다룸 — 별도 스토리 |
| 다중 사용자 동시 편집/동시성 제어 | 영속 상태가 없으므로 해당 없음 — 별도 Epic |
| 타임존 변환/지역화 | 모든 시각은 UTC ISO 문자열로 가정 — 별도 스토리 |

---

## 15. 디자이너 위임 시각 요소

아래 항목은 기획에서 정하지 않고 디자이너(BF-1044)에게 위임한다:

| 항목 | 가이드라인 |
|------|-----------|
| 컬러 팔레트 | 결과 상태별(`available`/`conflict`) 구분 색상 자유 설계, 리포 공통 WCAG 대비 기준 준수 |
| 예약 검사 폼 레이아웃 | 자유, 단 §9.1 의 `data-field`(`roomId`/`requesterName`/`startAt`/`endAt`) 및 `[data-testid="check-btn"]`/`[data-testid="form-error"]` 는 유지 |
| 결과 패널/충돌 목록/대체 후보 목록 레이아웃 | 자유, 단 §9.1 의 `data-testid`/`data-result`/`data-strategy` 속성 구조는 developer 구현과 일치해야 함 |
| 대체 후보 카드 디자인 | 자유, 단 Track A(`same-room-push`)와 Track B(`same-time-other-room`)를 시각적으로 구분해 전달해야 함(전략 라벨/아이콘 등) |
| 에러 메시지 문구 | 4개 실패 코드(§5.1)별 사용자 친화적 한국어 문구는 디자이너/카피 재량, 단 코드-문구 매핑은 1:1 고정 |

---

## 16. 미해결 결정 사항 (Open Decisions)

| # | 항목 | 내용 | 확인 필요 대상 |
|---|------|------|-----------------|
| 1 | `/demo/booking-canary` 물리 경로 | 계약상 `src/app/demo/booking-canary/**` 와 `src/routes/demo/booking-canary/**` 두 후보 경로가 모두 제시되어 있으나, 본 작업 범위(widening budget)에서는 monorepo 의 기존 라우팅 최상위 컨벤션(app router vs routes 기반)을 직접 확인하지 못했다. developer(BF-1045)는 구현 착수 전 기존 리포의 다른 `/demo/*` 페이지 구조를 확인해 동일 컨벤션으로 배치하고, §8.1~8.5 의 함수/타입 계약과 §9 의 `data-*` 속성 계약은 변경 없이 그대로 적용한다 | developer(BF-1045) |

---

*문서 종료 — [박기획] · BF-1043 (파일명 그룹 키: BF-1042)*

# 고객지원 인박스 기획 명세 — BF-1000

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-1003 (본 planner task) · BF-1000 (부모 Epic)
> 형제 task: BF-1005 (designer) · BF-1007 (developer) · BF-1011 (tester)
> 대상 모듈: `support-inbox-canary/` (신규 모듈 — 본 Epic 산하에서 최초 생성 예정, 현재 저장소에 코드 없음)
> tech-stack: `vanilla-static` — 외부 의존성 0건, `file://` 직접 실행 호환, 외부 CDN·fetch·서버 API 0건
> 단위/E2E 테스트: `node --test tests/support-inbox-canary-*.test.js` (focused scope · module: `support-inbox-canary`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

본 문서는 BF-1000 Epic 산하 고객지원 인박스 기능의 **단일 기준(single source of truth) 도메인 명세**다. 현재 저장소에는 `support-inbox-canary/` 코드가 전혀 존재하지 않으므로(신규 모듈), 이 문서는 기존 구현을 역기술(reverse-formalize)하는 것이 아니라 **처음부터 설계**한 명세다.

**본 planner task(BF-1003)의 담당 파일 영역은 `docs/planning/support-inbox-canary-BF-1000.md` 1개뿐**이며, 코드 작성·디자인 시안 작성은 금지 대상이다(Surgical Changes 원칙). 이 문서는 designer(BF-1005)·developer(BF-1007)·tester(BF-1011)가 각자 작업을 시작할 때 참조하는 단일 기준 스펙이다.

**가정 명시 (모호했던 지점, 본 문서에서 확정):**
- 상태는 `접수(received)`·`진행(in_progress)`·`보류(on_hold)`·`해결(resolved)` 4가지로 한정한다. Epic 설명이 "접수→진행→해결/보류"로 표현했으나, 실제로는 진행 단계에서 두 갈래(해결/보류)로 분기하는 구조로 해석했다 — §4 참고.
- 문의 신규 생성·삭제 UI는 Epic 설명에 언급이 없으므로 범위 밖으로 확정한다(§12).
- 담당자(assignee) 목록은 고정된 소규모 운영자 풀로 가정한다(신규 계정 생성 기능 없음 — canary 단계).

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [데이터 모델](#3-데이터-모델)
4. [상태 전이 — 상태표 · 가드 규칙](#4-상태-전이--상태표--가드-규칙)
5. [책임자 배정 규칙](#5-책임자-배정-규칙)
6. [변경 이력 이벤트 스키마](#6-변경-이력-이벤트-스키마)
7. [Deterministic Seed 데이터 스펙](#7-deterministic-seed-데이터-스펙)
8. [localStorage 저장 스펙 — 버전 · 검증 · 손상 복구](#8-localstorage-저장-스펙--버전--검증--손상-복구)
9. [라우트 진입/렌더 조건 — `/support-inbox-canary/`](#9-라우트-진입렌더-조건--support-inbox-canary)
10. [Acceptance Criteria 매핑 (Given/When/Then)](#10-acceptance-criteria-매핑-givenwhenthen)
11. [Edge Case 목록](#11-edge-case-목록)
12. [비범위 (Out of Scope)](#12-비범위-out-of-scope)
13. [산출물 위치 및 참조 표](#13-산출물-위치-및-참조-표)

---

## 1. 개요

### 1.1 목적

운영자가 고객 문의(inquiry)를 한 화면에서 접수부터 해결까지 추적할 수 있는 고객지원 인박스 SPA. 문의 목록, 상태 전이, 담당자 배정, 변경 이력을 보여주며 실시간 API 연동 없이 **결정적(deterministic) seed 데이터 + localStorage 영속화**로만 동작하는 `vanilla-static` 모듈이다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 대상 경로 | `support-inbox-canary/` (신규 — developer(BF-1007)가 생성) |
| 신규 코드 변경 | 없음 (본 task 는 기획 문서만 산출) |
| 데이터 원천 | 최초 실행: 정적 seed 배열(§7). 이후: `localStorage`(§8)에 영속화된 상태 |
| 외부 라이브러리 | 없음 — `file://` 프로토콜 직접 열기 가능 |
| 영속 저장 | `localStorage` 단일 키 — 상태 전이/배정 변경 시마다 전체 스냅샷 재기록 |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전) 또는 Node.js(`node --test`)로 순수 함수 단위 테스트 가능해야 함(다른 vanilla-static 모듈과 동일 관례 — UMD 패턴 권장, 코드는 developer 담당)
- `localStorage` 미지원/차단 환경(프라이빗 모드 quota 등)에서도 크래시 없이 in-memory 폴백으로 동작해야 함(§8 R3)

---

## 2. 용어 정의

| 용어 | 정의 |
|------|------|
| Inquiry (문의) | 고객지원 인박스의 기본 단위 레코드. `id`/`subject`/`requester`/`status`/`assignee`/`history` 로 구성 |
| Status (상태) | 문의 처리 라이프사이클 단계 — `received`(접수)·`in_progress`(진행)·`on_hold`(보류)·`resolved`(해결) |
| Assignee (책임자) | 현재 문의를 처리 중인 운영자(담당자). 미배정 시 `null` |
| History Event (변경 이력) | 문의의 상태 변경 또는 담당자 변경이 발생할 때마다 append-only 로 기록되는 이벤트 |
| Seed | 최초 실행 또는 손상 복구 시 사용되는 정적 결정적 데이터 배열 |
| Schema Version | `localStorage` 에 저장된 데이터 구조의 버전 번호. 구조가 바뀌면 증가 |

---

## 3. 데이터 모델

### 3.1 Inquiry (Ticket)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | O | 고유 식별자. 패턴 `INQ-####` (4자리 숫자, seed 는 `3001`부터 순차) |
| `subject` | string | O | 문의 제목. 1~120자 |
| `requester.name` | string | O | 요청자 이름 |
| `requester.email` | string | O | 요청자 이메일 |
| `status` | enum | O | `received` \| `in_progress` \| `on_hold` \| `resolved` (§4) |
| `assignee` | `{id, name}` \| `null` | O(필드 존재, 값은 nullable) | 현재 담당자. `received` 상태에서만 `null` 허용(§5) |
| `createdAt` | string (ISO8601, `+09:00`) | O | 문의 최초 접수 시각 — 불변 |
| `updatedAt` | string (ISO8601, `+09:00`) | O | 마지막 상태/배정 변경 시각 |
| `history` | `HistoryEvent[]` | O | 변경 이력 배열. **append-only, 배열 순서 = 발생 순서(오래된 순)** |

배열 순서(문의 목록 표시 순서)는 seed 정의 순서를 그대로 따르며 런타임 재정렬을 하지 않는다 — `incident-triage/history/fixtures.js` 에서 이미 채택된 관례를 그대로 따름(정렬/필터 UI는 §12 비범위).

### 3.2 Assignee 참조 값

배정 대상 운영자 풀은 seed 안에서 등장하는 `{id, name}` 조합으로 고정한다(§7.2). 신규 운영자 추가는 seed 갱신을 통해서만 가능하다(범위 밖 — §12).

---

## 4. 상태 전이 — 상태표 · 가드 규칙

### 4.1 상태 enum

`received`(접수) → `in_progress`(진행) → `resolved`(해결) 또는 `on_hold`(보류)

### 4.2 전이표

| From \ To | `received` | `in_progress` | `on_hold` | `resolved` |
|---|---|---|---|---|
| `received` | — (동일 상태 재요청은 no-op, EC-01) | **O** — 가드 G1 | ✗ | ✗ |
| `in_progress` | ✗ | — (재배정은 상태 유지, §5) | **O** — 가드 G2 | **O** — 가드 G3 |
| `on_hold` | ✗ | **O** — 가드 G2(재개) | — | ✗ — 가드 G4 |
| `resolved` | ✗ | **O** — 가드 G5(재오픈) | ✗ | — |

### 4.3 가드 규칙

- **G1** (`received → in_progress`): `assignee != null` 인 경우에만 허용. 미배정 상태에서 시도하면 전이 거부(오류: "담당자 미배정").
- **G2** (`in_progress ↔ on_hold`): 기존 `assignee` 는 그대로 유지된 상태에서만 전이(값이 `null` 로 바뀌지 않음).
- **G3** (`in_progress → resolved`): `assignee != null` 이어야 함(진행 중 문의는 항상 담당자가 있으므로 이 시점엔 이미 보장됨).
- **G4** (`on_hold → resolved` 직접 전이 금지): 보류 사유 재확인 없이 바로 종결하는 것을 막기 위한 의도적 정책. 반드시 `in_progress` 로 재개한 뒤 해결 처리해야 한다.
- **G5** (`resolved → in_progress`, 재오픈): `assignee` 는 유지된 채로 재오픈. 재오픈 사유(`note`)는 선택 입력.

동일 상태로의 전이 요청(예: `received → received`)은 오류가 아니라 **no-op** 이며 이력 이벤트를 남기지 않는다(EC-01).

---

## 5. 책임자 배정 규칙

- 문의 생성(seed) 시점의 `assignee` 는 `null`(미배정) 또는 seed 에 명시된 특정 운영자일 수 있다.
- **담당자 해제**(`assignee → null`)는 `status === 'received'` 인 문의에서만 허용한다. `in_progress`/`on_hold`/`resolved` 상태는 §4 가드에 의해 항상 담당자가 존재해야 하므로 해제할 수 없다.
- **재배정**(다른 운영자로 변경)은 `received`/`in_progress`/`on_hold` 상태에서 허용한다. `resolved` 상태의 문의는 재배정 대상이 아니다(재오픈 후에만 재배정 가능).
- 담당자 배정/재배정은 그 자체로는 `status` 를 변경하지 않는다(단, `received` 상태에서 최초 배정 후 별도의 `in_progress` 전이 요청이 뒤따르는 것이 일반적 흐름이며, 두 동작은 독립적인 이벤트로 각각 기록된다 — §6).

---

## 6. 변경 이력 이벤트 스키마

### 6.1 HistoryEvent 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | O | 이벤트 고유 ID. 패턴 `EVT-######` |
| `ticketId` | string | O | 대상 Inquiry `id` (FK) |
| `type` | enum | O | `STATUS_CHANGED` \| `ASSIGNEE_CHANGED` |
| `at` | string (ISO8601, `+09:00`) | O | 이벤트 발생 시각 |
| `actor.id` / `actor.name` | string | O | 변경을 수행한 운영자 |
| `from` | string \| `null` | O(필드 존재) | 이전 값 — `STATUS_CHANGED` 는 이전 status 문자열, `ASSIGNEE_CHANGED` 는 이전 담당자 이름 또는 `null` |
| `to` | string \| `null` | O(필드 존재) | 변경된 값 — 형식은 `from` 과 동일 규칙 |
| `note` | string \| `null` | O(필드 존재, nullable) | 선택 메모(예: 보류 사유, 재오픈 사유) |

### 6.2 이벤트 타입 2종만 사용

이벤트 타입을 세분화(예: `ASSIGNED`/`REASSIGNED`/`UNASSIGNED`/`REOPENED` 등)하지 않고 **`STATUS_CHANGED`/`ASSIGNEE_CHANGED` 2종**으로 단순화한다 — `from`/`to` 값 자체가 배정/해제/재배정/재오픈 여부를 표현하므로 이벤트 타입을 늘리는 것은 추측성 abstraction 이다(Simplicity First).

### 6.3 일관성 규칙

- `history` 는 append-only — 기존 이벤트 수정/삭제 없음.
- 각 Inquiry 의 `status` 값은 항상 그 `history` 배열 중 마지막 `STATUS_CHANGED` 이벤트의 `to` 값과 일치해야 한다(불일치 시 손상 — §8 V6).
- `status === 'received'` 이고 `history` 가 비어 있는 것은 정상(최초 접수, 아직 아무 변경도 없음)이다. 반대로 `status !== 'received'` 인데 `history` 가 비어 있으면 손상이다(EC-08).

---

## 7. Deterministic Seed 데이터 스펙

### 7.1 원칙

- Seed 는 **정적 배열**이며 실행마다 동일한 값을 반환한다(난수/현재시각 사용 금지 — developer 구현 시 `Date.now()`/`Math.random()` 금지).
- 최소 1건 이상의 Inquiry 를 포함해야 한다 — true empty state 는 본 canary 범위에서 발생하지 않음(§9.4, §12).
- 4개 상태를 모두 최소 1건씩 커버하고, 재오픈(EC-07) 케이스도 1건 포함해 §4 전이표 전체를 예시로 뒷받침한다.

### 7.2 Seed 데이터 (6건)

| id | subject | requester | status | assignee | history 요약 |
|---|---|---|---|---|---|
| `INQ-3001` | 로그인 후 대시보드 빈 화면 표시 | 김민수 (minsu.kim@example.com) | `received` | `null` (미배정) | 없음(최초 접수) |
| `INQ-3002` | 결제 영수증 재발급 요청 | 이서연 (seoyeon.lee@example.com) | `received` | `{id:"agt-01", name:"박운영"}` | `ASSIGNEE_CHANGED`(null→박운영) 1건 |
| `INQ-3003` | 비밀번호 재설정 메일 미수신 | 최도윤 (doyoon.choi@example.com) | `in_progress` | `{id:"agt-02", name:"정지원"}` | `ASSIGNEE_CHANGED`(null→정지원) → `STATUS_CHANGED`(received→in_progress) |
| `INQ-3004` | API 연동 문서 오류 문의 | 한지호 (jiho.han@example.com) | `on_hold` | `{id:"agt-01", name:"박운영"}` | 배정 → `in_progress` 전이 → `STATUS_CHANGED`(in_progress→on_hold, note:"고객 회신 대기") |
| `INQ-3005` | 환불 처리 지연 문의 | 오하은 (haeun.oh@example.com) | `resolved` | `{id:"agt-02", name:"정지원"}` | 배정 → `in_progress` → `STATUS_CHANGED`(in_progress→resolved) |
| `INQ-3006` | 계정 잠금 해제 요청 | 서준영 (junyoung.seo@example.com) | `in_progress` | `{id:"agt-01", name:"박운영"}` | 배정 → `in_progress` → `resolved` → `STATUS_CHANGED`(resolved→in_progress, note:"고객이 동일 문제 재발 신고 — 재오픈") |

`createdAt` 은 `INQ-3001` 부터 `2026-07-10T09:00:00+09:00` ~ `INQ-3006` `2026-07-15T16:20:00+09:00` 범위에서 순차 증가(초 단위까지 고정 — 실제 값은 developer 가 위 순서·간격 규칙을 지켜 확정). `updatedAt`/`history[].at` 은 각 이벤트가 `createdAt` 이후 순차적으로 발생한 것으로 고정한다.

운영자 풀(고정, §5): `agt-01`(박운영), `agt-02`(정지원) — 2명으로 충분히 재배정·재오픈 시나리오를 커버한다(3명 이상은 canary 단계에서 불필요한 확장).

---

## 8. localStorage 저장 스펙 — 버전 · 검증 · 손상 복구

### 8.1 저장 키 및 envelope 구조

단일 키 `support-inbox-canary:state` 에 아래 구조의 JSON 문자열을 저장한다(문의 배열 전체를 원자적으로 읽고 쓰기 위해 다중 키 대신 단일 envelope 채택):

```json
{
  "schemaVersion": 1,
  "seedVersion": 1,
  "updatedAt": "2026-07-17T09:00:00+09:00",
  "tickets": [ /* Inquiry 객체 배열 — §3 */ ]
}
```

- `schemaVersion` (정수, 현재 `1`): envelope/Inquiry/HistoryEvent 구조 버전. 구조가 바뀌면 증가.
- `seedVersion` (정수, 현재 `1`): §7 seed 데이터셋의 버전. seed 내용이 바뀌면 증가(구조는 그대로여도).
- `updatedAt`: envelope 이 마지막으로 기록된 시각.
- `tickets`: Inquiry 배열(§3).

### 8.2 검증 규칙 (로드 시 아래 순서로 전부 통과해야 "정상"으로 판정)

| # | 규칙 |
|---|---|
| V1 | `localStorage.getItem(KEY)` 가 `null` 이면 **손상이 아니라 "최초 실행"** — 손상 판정 없이 바로 §7 seed 사용(EC-04) |
| V2 | 값이 존재하면 `JSON.parse` 가 예외 없이 성공해야 함 |
| V3 | 파싱 결과의 최상위 타입이 배열/‌`null` 이 아닌 순수 object 여야 함 |
| V4 | `schemaVersion` 이 정수이고 **현재 스키마 버전(1)과 정확히 일치**해야 함 — 구버전·미래버전 모두 손상으로 간주(마이그레이션 로직은 범위 밖, §12) |
| V5 | `tickets` 가 배열이며, 모든 원소가 §3 필수 필드를 갖추고 `status` 가 4개 enum 값 중 하나이며 `history` 가 배열이고 그 원소들이 §6 필수 필드를 갖춤 |
| V6 | 각 Inquiry 의 `status` 가 그 `history` 마지막 `STATUS_CHANGED` 이벤트의 `to` 와 일치(단, `status==='received'` 이고 `history` 가 비어 있는 경우는 예외적으로 정상) |

V2~V6 중 **하나라도 실패하면 전체 envelope 을 손상으로 간주**한다(부분 신뢰 없음).

### 8.3 손상 복구 절차

1. **R1 — 전체 폴백**: 손상 판정 시 저장된 값을 신뢰하지 않고 즉시 §7 seed 데이터로 교체하여 렌더링한다. 예외를 throw 하지 않고 앱은 정상 동작해야 한다(크래시 금지 — 저장소 내 `tetris/storage.js`, `incident-triage/triage.js` 의 try/catch 폴백 관례와 동일).
2. **R2 — 즉시 재기록**: 폴백된 seed 로 새 envelope(`schemaVersion: 1`, `seedVersion: 1`, `updatedAt: 복구 시각`)을 구성해 같은 키에 즉시 덮어쓴다. 다음 로드부터 동일 손상 판정이 반복되지 않도록 하기 위함.
3. **R3 — 저장 자체 불가 환경**: `setItem` 호출이 예외를 던지는 환경(프라이빗 모드 quota 초과 등)에서는 저장을 재시도하지 않고 in-memory 상태로만 seed 를 사용해 렌더링한다. 이 경우 새로고침 시 세션 내 변경사항이 유실될 수 있다(EC-06, 정상 동작으로 간주).
4. **R4 — 전체 교체 원칙**: 손상 복구는 항상 envelope 전체를 교체하며, 정상 필드만 골라 부분 병합(partial merge)하지 않는다. 부분 병합은 손상 데이터와 정상 데이터가 뒤섞인 불일치 상태를 만들 위험이 있어 채택하지 않는다(Simplicity First).

### 8.4 정상 쓰기 시점

§4/§5 에 따른 상태 전이 또는 배정 변경이 확정될 때마다(가드 통과 후), 변경된 `tickets` 전체와 갱신된 `updatedAt` 으로 envelope 을 다시 `setItem` 한다. 부분 필드 업데이트(예: 단일 ticket 만 별도 키로 저장)는 하지 않는다 — §8.1 원자적 쓰기 원칙과 동일 이유.

---

## 9. 라우트 진입/렌더 조건 — `/support-inbox-canary/`

### 9.1 경로

`support-inbox-canary/` (저장소 루트 기준 정적 디렉터리) — `http-server . -p 8888` 로 서빙 시 `/support-inbox-canary/` 로 접근. 기존 모듈(`incident-triage/`, `incident-command/` 등)과 동일한 "디렉터리 = 라우트" 관례를 따른다.

### 9.2 진입 조건

- `support-inbox-canary/index.html` 을 `file://` 직접 열기 또는 `http-server` 경유 양쪽 모두 정상 동작해야 한다.
- 외부 CDN·네트워크 요청·서버 API 호출 0건.

### 9.3 렌더 조건 (초기화 순서)

1. `DOMContentLoaded` 시 1회 초기화(다른 vanilla-static 모듈과 동일 관례).
2. `localStorage` 로드 시도 → §8.2 검증 전부 통과: 저장된 `tickets` 로 렌더.
3. 검증 실패(또는 §8.2 V1 최초 실행): §7 seed 로 렌더 + §8.3 R2 절차로 즉시 재기록.
4. 위 과정은 동기적(synchronous localStorage API)이므로 별도의 "loading" 화면 상태는 불필요하다 — 렌더는 항상 초기화 완료 후 "ready" 상태로 시작한다(EC-09).
5. seed/저장 데이터 모두 최소 1건 이상을 보장하므로(§7.1), true empty state(문의 0건) 는 본 canary 범위에서 발생하지 않는다 — 문의 삭제 기능이 없기 때문이다(§12).

### 9.4 화면 상태 참고

목록/상세 레이아웃, 색상, 인터랙션 디테일은 designer(BF-1005) 담당이며 본 문서 범위 밖이다. 본 절은 **데이터 로드/렌더 조건**만 규정한다.

---

## 10. Acceptance Criteria 매핑 (Given/When/Then)

| # | Given | When | Then | 매핑 섹션 |
|---|---|---|---|---|
| AC-1 | Epic 요구 | 명세 작성 | 상태 전이표·이력 이벤트 스키마·seed 데이터 구조가 docs 로 명시된다 | §4(상태 전이표) · §6(이력 이벤트 스키마) · §7(seed 데이터 구조) |
| AC-2 | 저장 요구 | 명세 검토 | localStorage 버전 필드·검증 규칙·손상 시 seed 안전 복구 절차가 정의된다 | §8.1(버전 필드) · §8.2(검증 규칙) · §8.3(손상 복구 절차) |
| AC-3 | 라우트 | 명세 확정 | `/support-inbox-canary` 진입/렌더 조건과 수용 기준 매핑표가 포함된다 | §9(진입/렌더 조건) · 본 표(§10) |

---

## 11. Edge Case 목록

| # | 시나리오 | 처리 |
|---|---|---|
| EC-01 | 동일 상태로의 전이 요청(예: `in_progress → in_progress`) | no-op, 이력 이벤트 미기록 |
| EC-02 | 담당자 없이 `in_progress`/`on_hold`/`resolved` 전이 시도 | 거부(가드 G1/G3 위반) |
| EC-03 | `on_hold → resolved` 직접 전이 시도 | 거부(가드 G4) — 반드시 `in_progress` 경유 |
| EC-04 | `localStorage` 값 없음(최초 실행) | 손상 아님 — §7 seed 사용 + 최초 저장(§8.2 V1) |
| EC-05 | `JSON.parse` 실패 / `schemaVersion` 불일치 / 필수 필드 누락 | 손상 → §8.3 R1~R2 복구 |
| EC-06 | `localStorage.setItem` 예외(quota 초과, 프라이빗 모드) | 저장 없이 in-memory seed 로만 렌더(§8.3 R3), 크래시 금지 |
| EC-07 | `resolved` 재오픈 후 다시 `resolved` 처리 | 정상 허용(§4 가드 G5) — `history` 에 `STATUS_CHANGED` 2건 이상 누적 가능 |
| EC-08 | `history` 가 비어 있는데 `status !== 'received'` | 손상(§8.2 V6 위반) → 복구 |
| EC-09 | 렌더 시점의 "loading" 화면 필요 여부 | 불필요 — 로드가 동기적이므로 즉시 "ready" 렌더(§9.3) |
| EC-10 | `received` 상태에서 담당자 해제(`assignee → null`) 시도 | 허용(§5) — 유일하게 해제가 가능한 상태 |
| EC-11 | `resolved` 상태에서 재배정(담당자 변경만, 상태 변경 없이) 시도 | 거부 — 재오픈 후에만 재배정 가능(§5) |

---

## 12. 비범위 (Out of Scope)

- 문의 신규 생성/삭제 UI (seed 는 정적 배열이며 런타임 CRUD 대상 아님)
- 다중 파일 첨부, 실시간 알림, 서버 API 연동
- `schemaVersion` 마이그레이션 로직(구버전 데이터를 새 스키마로 변환) — 버전 불일치는 항상 손상으로 간주하고 seed 로 재시작(§8.2 V4)
- 우선순위(priority)/SLA 필드 — Epic 설명에 언급 없음, 추측성 확장 금지
- 검색/필터/정렬 UI — 본 문서는 데이터의 저장 순서만 규정하며 화면 정렬 기능은 범위 밖
- 신규 운영자 계정 추가 UI — 운영자 풀은 seed 로 고정(§7.2)

---

## 13. 산출물 위치 및 참조 표

| 산출물 | 담당 | 경로 (예정) |
|---|---|---|
| 본 기획 명세 | planner (BF-1003) | `docs/planning/support-inbox-canary-BF-1000.md` (본 문서) |
| 디자인 시안 | designer (BF-1005) | `docs/design/support-inbox-canary-BF-1000.md` |
| 구현 코드 | developer (BF-1007) | `support-inbox-canary/{index.html,style.css,inbox.js,storage.js,fixtures.js}` (파일 분할은 developer 재량, `tetris/storage.js` 의 저장 유틸 분리 관례 참고 권장) |
| 테스트 | tester (BF-1011) | `tests/support-inbox-canary-*.test.js` |


# 고객지원 인박스 기획 명세 — Phase 18 (BF-1013)

> 작성자: [박기획] (planner) · 작성일 2026-07-18
> 관련 티켓: BF-1018 (본 planner task) · BF-1013 (부모 Epic)
> 형제 task: BF-1019 (designer) · BF-1021 (developer) · BF-1023 (tester)
> 대상 모듈: `support-inbox-phase18/` (신규 모듈 — 본 Epic 산하에서 최초 생성 예정, 현재 저장소에 코드 없음)
> tech-stack: `vanilla-static` — 외부 의존성 0건, `file://` 직접 실행 호환, 외부 CDN·fetch·서버 API·DB 0건
> 단위/E2E 테스트: `node --test tests/support-inbox-phase18-*.test.js` (focused scope · module: `support-inbox-phase18`)
> 선례 참고: `docs/planning/support-inbox-canary-BF-1000.md` (BF-1000 Epic, canary) — 동일 도메인(티켓/상태/이력)이나 canary 는 우선순위·검색·필터를 **명시적으로 비범위** 처리했다(canary §12). 본 문서는 그 비범위 항목을 phase18 정식 기능으로 확정한다. 상태 전이 모델은 canary 와 일관성 유지를 위해 값을 계승하되, 본 모듈은 canary 와 독립적인 별도 모듈(코드 공유 없음)이므로 아래 명세는 **자체 완결(self-contained)** 기준이다.

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

본 문서는 BF-1013 Epic 산하 고객지원 인박스 **목록·검색·필터·상태 전환** 4개 기능 및 fixture 스키마의 단일 기준(single source of truth) 명세다. 현재 저장소에는 `support-inbox-phase18/` 코드가 존재하지 않으므로(신규 모듈) 처음부터 설계한 명세다.

**본 planner task(BF-1018)의 담당 파일 영역은 `docs/plan/support-inbox-phase18-BF-1013.md` 1개뿐**이며, 코드 작성·디자인 시안 작성은 금지 대상이다(Surgical Changes 원칙). designer(BF-1019)·developer(BF-1021)·tester(BF-1023)가 각자 작업 시 참조하는 단일 기준 스펙이다.

**가정 명시 (모호했던 지점, 본 문서에서 확정):**
- 상태 enum·전이 규칙(가드 G1~G5)은 canary 와 동일 값을 계승한다 — "우선순위·처리 상태를 한 화면에서 파악"하는 시나리오가 canary 와 동일 도메인(문의 처리)이므로 상태 모델을 재해석할 이유가 없다(§4).
- **우선순위(priority)** 는 Epic 설명에 정확한 enum 값이 없으므로, 상태와 동일하게 4단계로 정의한다: `urgent`(긴급) · `high`(높음) · `normal`(보통) · `low`(낮음) — §3.1.
- 우선순위는 **표시·필터·정렬 전용 필드**다. "4개 기능(목록/검색/필터/상태 전환)"에 "우선순위 변경"은 포함되지 않으므로, 우선순위는 fixture 에 고정되며 런타임 수정 UI 는 비범위로 확정한다(§12) — Simplicity First, 요구되지 않은 기능 추측 금지.
- "브라우저 상태만으로 동작"은 **세션 내 in-memory 상태**로 해석한다. localStorage 영속화(새로고침 후에도 상태 유지)는 AC 에 명시되지 않았으므로 비범위로 확정한다(§12) — canary 는 영속화를 요구했지만 본 task 설명은 "결정적 fixture 로 모든 화면 상태 재현"만 요구하므로 세션 상태로 충분하다.
- 목록 기본 정렬 기준은 Epic 설명에 명시가 없으므로, "우선순위·상태를 한 화면에서 파악"하는 목적에 맞게 **우선순위 내림차순 → 동일 우선순위 내 접수시각 오름차순**으로 확정한다(§5.1).
- 담당자(assignee) 풀은 canary 와 동일하게 고정 소규모 운영자로 가정한다(신규 계정 생성 기능 없음).

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [데이터 모델 · fixture 스키마](#3-데이터-모델--fixture-스키마)
4. [상태 전이 — 상태표 · 가드 규칙](#4-상태-전이--상태표--가드-규칙)
5. [기능 명세 — 목록 · 검색 · 필터 · 상태 전환](#5-기능-명세--목록--검색--필터--상태-전환)
6. [Deterministic Fixture 데이터 스펙](#6-deterministic-fixture-데이터-스펙)
7. [화면 상태 재현 매트릭스](#7-화면-상태-재현-매트릭스)
8. [Acceptance Criteria 매핑 (Given/When/Then)](#8-acceptance-criteria-매핑-givenwhenthen)
9. [Edge Case 목록](#9-edge-case-목록)
10. [비범위 (Out of Scope)](#10-비범위-out-of-scope)
11. [산출물 위치 및 참조 표](#11-산출물-위치-및-참조-표)

---

## 1. 개요

### 1.1 목적

지원 담당자가 고객 문의(inquiry)의 **우선순위·처리 상태를 한 화면에서 파악**하고, 목록에서 검색·필터로 원하는 문의를 좁혀 찾고, 상태를 전환할 수 있는 고객지원 인박스 SPA. 외부 API·DB 없이 **결정적(deterministic) fixture 데이터 + 세션 내 브라우저 상태**만으로 동작하는 `vanilla-static` 모듈이다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 대상 경로 | `support-inbox-phase18/` (신규 — developer(BF-1021)가 생성) |
| 신규 코드 변경 | 없음 (본 task 는 기획 문서만 산출) |
| 데이터 원천 | 정적 fixture 배열(§6) — 페이지 로드 시 1회 로드, 이후 세션 내 in-memory 상태로만 갱신 |
| 외부 라이브러리 | 없음 — `file://` 프로토콜 직접 열기 가능 |
| 영속 저장 | 없음(비범위, §10) — 새로고침 시 fixture 로 초기화되는 것이 정상 동작 |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전) 또는 Node.js(`node --test`)로 순수 함수(검색/필터/정렬/전이 판정) 단위 테스트 가능해야 함.
- 네트워크·DB 의존성 0건 — 모든 화면 상태는 fixture 배열 + 세션 내 조작(검색어/필터 선택/상태 전환)의 조합만으로 재현 가능해야 한다(결정성 요구, AC-2).

---

## 2. 용어 정의

| 용어 | 정의 |
|------|------|
| Inquiry (문의/티켓) | 고객지원 인박스의 기본 단위 레코드. `id`/`subject`/`requester`/`status`/`priority`/`assignee`/`history` 로 구성 |
| Status (처리 상태) | 문의 처리 라이프사이클 단계 — `received`(접수)·`in_progress`(진행)·`on_hold`(보류)·`resolved`(해결) |
| Priority (우선순위) | 문의 긴급도 — `urgent`(긴급)·`high`(높음)·`normal`(보통)·`low`(낮음). 표시·필터·정렬 전용(§0 가정) |
| Assignee (책임자) | 현재 문의를 처리 중인 운영자. 미배정 시 `null` |
| History Event (변경 이력) | 상태 변경 또는 담당자 변경 발생 시 append-only 로 기록되는 이벤트 |
| Fixture | 최초 로드 시 사용되는 정적 결정적 데이터 배열(§6) — canary 의 "seed" 와 동일 개념, 본 문서는 tester 관례상 명칭인 "fixture" 를 사용 |
| Filter set | 사용자가 선택한 status/priority/assignee 필터 조건의 조합(§5.3) |

---

## 3. 데이터 모델 · fixture 스키마

### 3.1 Inquiry (Ticket)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | O | 고유 식별자. 패턴 `INQ-####`(4자리 숫자). fixture 는 `4001`부터 순차 — canary(`3001~3006`) 와 ID 겹치지 않도록 범위 분리 |
| `subject` | string | O | 문의 제목. 1~120자 |
| `requester.name` | string | O | 요청자 이름 |
| `requester.email` | string | O | 요청자 이메일 |
| `status` | enum(4) | O | `received` \| `in_progress` \| `on_hold` \| `resolved` (§4) |
| `priority` | enum(4) | O | `urgent` \| `high` \| `normal` \| `low` — 우선순위 랭크: `urgent`(4) > `high`(3) > `normal`(2) > `low`(1), 목록 기본 정렬(§5.1)·필터(§5.3) 기준 |
| `assignee` | `{id, name}` \| `null` | O(필드 존재) | 현재 담당자. `received` 상태에서만 `null` 허용(canary §5 규칙 계승) |
| `createdAt` | string (ISO8601, `+09:00`) | O | 문의 최초 접수 시각 — 불변 |
| `updatedAt` | string (ISO8601, `+09:00`) | O | 마지막 상태/배정 변경 시각 |
| `history` | `HistoryEvent[]` | O | 변경 이력 배열. append-only, 배열 순서 = 발생 순서(오래된 순). §4 규칙 계승, 우선순위 변경은 이력 대상 아님(§0 가정 — 우선순위는 수정 불가 필드) |

배열(fixture) 순서와 화면 표시 순서는 별개다 — 목록은 §5.1 정렬 규칙에 따라 렌더링하며, fixture 배열 자체의 순서는 정의 편의상 `id` 오름차순으로 고정한다.

### 3.2 HistoryEvent

canary(§6) 와 동일 스키마를 계승한다.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | O | 이벤트 고유 ID. 패턴 `EVT-######`, 본 모듈은 `700001`부터 순차(canary 이벤트 ID 범위와 겹치지 않도록 분리) |
| `ticketId` | string | O | 대상 Inquiry `id` (FK) |
| `type` | enum | O | `STATUS_CHANGED` \| `ASSIGNEE_CHANGED` (2종 한정 — canary §6.2 근거 동일 적용: Simplicity First) |
| `at` | string (ISO8601, `+09:00`) | O | 이벤트 발생 시각 |
| `actor.id` / `actor.name` | string | O | 변경을 수행한 운영자 |
| `from` | string \| `null` | O(필드 존재) | 이전 값 |
| `to` | string \| `null` | O(필드 존재) | 변경된 값 |
| `note` | string \| `null` | O(필드 존재, nullable) | 선택 메모 |

### 3.3 Assignee 참조 값

운영자 풀은 fixture 안에서 등장하는 `{id, name}` 조합으로 고정한다: `agt-01`(박운영), `agt-02`(정지원) — canary 와 동일 풀(저장소 일관성). 신규 운영자 추가는 비범위(§10).

---

## 4. 상태 전이 — 상태표 · 가드 규칙

canary(§4)와 동일한 4상태·가드 규칙을 계승한다(도메인 재해석 없음 — §0 가정).

### 4.1 전이표

| From \ To | `received` | `in_progress` | `on_hold` | `resolved` |
|---|---|---|---|---|
| `received` | — (동일 상태 재요청은 no-op, EC-01) | **O** — 가드 G1 | ✗ | ✗ |
| `in_progress` | ✗ | — (재배정은 상태 유지) | **O** — 가드 G2 | **O** — 가드 G3 |
| `on_hold` | ✗ | **O** — 가드 G2(재개) | — | ✗ — 가드 G4 |
| `resolved` | ✗ | **O** — 가드 G5(재오픈) | ✗ | — |

### 4.2 가드 규칙

- **G1** (`received → in_progress`): `assignee != null` 인 경우에만 허용. 미배정 시 거부("담당자 미배정").
- **G2** (`in_progress ↔ on_hold`): 기존 `assignee` 유지된 상태에서만 전이.
- **G3** (`in_progress → resolved`): `assignee != null` 이어야 함.
- **G4** (`on_hold → resolved` 직접 전이 금지): 반드시 `in_progress` 로 재개한 뒤 해결 처리.
- **G5** (`resolved → in_progress`, 재오픈): `assignee` 유지된 채로 재오픈. `note` 선택 입력.

동일 상태로의 전이 요청은 오류가 아니라 **no-op** 이며 이력 이벤트를 남기지 않는다(EC-01).

---

## 5. 기능 명세 — 목록 · 검색 · 필터 · 상태 전환

> 4개 기능은 **파이프라인**으로 합성된다: `fixture 원본 → 필터(§5.3) → 검색(§5.2) → 정렬(§5.1) → 렌더 목록`. 각 단계는 이전 단계의 출력을 입력으로 받는 순수 함수 계약이며, 상태 전환(§5.4)은 이 파이프라인과 독립적으로 티켓 원본 데이터를 변경하는 액션이다.

### 5.1 목록 (List)

| 항목 | 명세 |
|---|---|
| 입력 | 없음(§5.3/§5.2 결과가 없으면 fixture 전체) |
| 출력 | `Ticket[]` — 화면 렌더용 정렬된 배열 |
| 기본 정렬 | ① `priority` 랭크 내림차순(urgent→low) ② 동일 priority 내 `createdAt` 오름차순(먼저 접수된 것 우선) ③ 동일 시각 시 `id` 오름차순(완전 결정성 보장) |
| 표시 필드 | `id`, `subject`, `status`, `priority`, `assignee`(null 이면 "미배정"), `updatedAt` |
| 정렬 커스터마이징 | 비범위(§10) — 사용자가 정렬 기준을 바꾸는 UI 는 제공하지 않는다 |

### 5.2 검색 (Search)

| 항목 | 명세 |
|---|---|
| 입력 | `query: string` (자유 입력) |
| 전처리 | `trim()` 후 소문자 변환(대소문자 무관 매칭) |
| 매칭 대상 필드 | `id`, `subject`, `requester.name`, `requester.email` — 4개 필드 중 **하나라도** 포함(substring match, OR) 하면 매칭 |
| `query === ''`(trim 후) | 필터링 없음 — 전체(또는 §5.3 필터 적용 후) 목록 그대로 반환 |
| 매칭 0건 | 빈 배열 반환 — 화면은 "검색 결과 없음" empty state 표시(§7) |
| 검색 vs 필터 결합 | AND — 필터를 먼저 적용한 결과 집합 안에서 검색 매칭(§5 파이프라인) |

### 5.3 필터 (Filter)

| 항목 | 명세 |
|---|---|
| 필터 카테고리 | `status`(다중 선택 가능), `priority`(다중 선택 가능), `assignee`(다중 선택 가능, 특수값 `unassigned` 로 미배정 티켓 포함 가능) |
| 카테고리 내부 결합 | OR — 예: status 필터에서 `in_progress`+`on_hold` 선택 시 둘 중 하나면 통과 |
| 카테고리 간 결합 | AND — status 필터 ∩ priority 필터 ∩ assignee 필터 |
| 선택 없음(카테고리 전체 미선택) | 해당 카테고리는 필터링하지 않음(전체 통과) — 3개 카테고리 모두 미선택 시 전체 목록 |
| 필터 초기화 | 모든 카테고리 선택 해제 → 검색어와 무관하게 필터 조건은 전체 통과로 복귀(EC-06) |

### 5.4 상태 전환 (Status Transition)

| 항목 | 명세 |
|---|---|
| 입력 | `ticketId: string`, `targetStatus: enum(4)`, `actor: {id, name}`, `note?: string \| null` |
| 판정 | §4 전이표·가드 규칙(G1~G5) 적용 |
| 성공 시 출력 | 해당 티켓의 `status` 갱신, `updatedAt` 갱신, `history` 에 `STATUS_CHANGED` 이벤트 append(`from`=이전 status, `to`=targetStatus, `note`) |
| 거부 시 출력 | 티켓 데이터 변경 없음 + 거부 사유 문자열(예: "담당자 미배정", "보류 상태에서 해결로 직접 전이 불가") |
| no-op(동일 상태) | 티켓 데이터·history 변경 없음, 오류 아님(EC-01) |
| 목록/검색/필터와의 관계 | 상태 전환 후 목록(§5.1)은 갱신된 `status`/`updatedAt` 기준으로 재정렬·재필터링된다(필터 조건에 따라 전환된 티켓이 현재 뷰에서 사라질 수 있음 — 정상 동작, EC-11) |

담당자 배정/재배정은 본 4개 기능(목록/검색/필터/상태 전환) 범위 밖이다 — fixture 에 고정된 `assignee` 값을 표시·필터링만 하며, canary 와 달리 배정 변경 액션은 phase18 범위에 포함하지 않는다(§10).

---

## 6. Deterministic Fixture 데이터 스펙

### 6.1 원칙

- Fixture 는 **정적 배열**이며 실행마다 동일한 값을 반환한다(난수/현재시각 사용 금지 — developer 구현 시 `Date.now()`/`Math.random()` 금지).
- 4개 status × 4개 priority 조합을 모두 예시로 커버할 필요는 없으나(16건은 과다 — Simplicity First), **각 status 최소 1건, 각 priority 최소 1건**은 반드시 포함해 필터 전체 옵션이 공집합이 되지 않도록 한다.
- 검색 결과 0건을 재현할 수 있는 쿼리가 최소 1개 존재해야 한다(§7).
- 필터+검색 교집합 0건을 재현할 수 있는 조합이 최소 1개 존재해야 한다(§7).
- 재오픈(EC-09) 케이스 1건 포함.
- 미배정 티켓 1건 이상 포함(assignee 필터 `unassigned` 검증용).

### 6.2 Fixture 데이터 (8건)

| id | subject | requester | status | priority | assignee | history 요약 |
|---|---|---|---|---|---|---|
| `INQ-4001` | 로그인 후 대시보드 빈 화면 표시 | 김민수 (minsu.kim@example.com) | `received` | `low` | `null`(미배정) | 없음(최초 접수, empty history 케이스) |
| `INQ-4002` | [긴급] 결제 승인 실패로 반복 청구 발생 | 이서연 (seoyeon.lee@example.com) | `received` | `urgent` | `{id:"agt-01", name:"박운영"}` | `ASSIGNEE_CHANGED`(null→박운영) 1건 |
| `INQ-4003` | 비밀번호 재설정 메일 미수신 | 최도윤 (doyoon.choi@example.com) | `in_progress` | `high` | `{id:"agt-02", name:"정지원"}` | `ASSIGNEE_CHANGED`(null→정지원) → `STATUS_CHANGED`(received→in_progress) |
| `INQ-4004` | API 연동 문서 오류 문의 | 한지호 (jiho.han@example.com) | `in_progress` | `normal` | `{id:"agt-01", name:"박운영"}` | 배정 → `STATUS_CHANGED`(received→in_progress) |
| `INQ-4005` | Payment gateway timeout error on checkout | 오하은 (haeun.oh@example.com) | `on_hold` | `high` | `{id:"agt-02", name:"정지원"}` | 배정 → 진행 전이 → `STATUS_CHANGED`(in_progress→on_hold, note:"고객 회신 대기") — 영문 subject, 검색 대소문자 무관 매칭 검증용 |
| `INQ-4006` | 환불 처리 지연 문의 | 서준영 (junyoung.seo@example.com) | `resolved` | `low` | `{id:"agt-01", name:"박운영"}` | 배정 → 진행 → `STATUS_CHANGED`(in_progress→resolved) |
| `INQ-4007` | 계정 잠금 반복 해제 요청 | 배지훈 (jihoon.bae@example.com) | `in_progress` | `urgent` | `{id:"agt-02", name:"정지원"}` | 배정 → 진행 → `resolved` → `STATUS_CHANGED`(resolved→in_progress, note:"고객이 동일 문제 재발 신고 — 재오픈") — 재오픈(EC-09) 케이스 |
| `INQ-4008` | 청구서 PDF 다운로드 버튼 미작동 | 정유나 (yuna.jeong@example.com) | `received` | `normal` | `null`(미배정) | 없음(최초 접수) |

`createdAt` 은 `INQ-4001` `2026-07-10T09:00:00+09:00` 부터 `INQ-4008` `2026-07-17T17:40:00+09:00` 까지 순차 증가(초 단위까지 고정 — 정확한 간격은 developer 가 위 순서를 지켜 확정). `updatedAt`/`history[].at` 은 각 이벤트가 `createdAt` 이후 순차 발생한 것으로 고정한다. `EVT-######` ID 는 `700001`부터 순차 부여.

### 6.3 필터 옵션 커버리지 확인

- status: `received`(4001,4002,4008) · `in_progress`(4003,4004,4007) · `on_hold`(4005) · `resolved`(4006) — 4종 전부 존재.
- priority: `urgent`(4002,4007) · `high`(4003,4005) · `normal`(4004,4008) · `low`(4001,4006) — 4종 전부 존재.
- assignee: 미배정(4001,4008) · agt-01(4002,4004,4006) · agt-02(4003,4005,4007) — unassigned 필터 검증 가능.

---

## 7. 화면 상태 재현 매트릭스

결정성 요구(AC-2)에 따라, 아래 화면 상태가 fixture(§6) 만으로 재현 가능함을 명시한다.

| 화면 상태 | 재현 방법(§5 파이프라인 입력) |
|---|---|
| 기본 목록(필터/검색 없음) | 필터 전체 해제 + `query=''` → 8건, §5.1 정렬 순 |
| 검색 결과 다건 | `query='이'` → requester 이름에 "이"가 포함된 티켓(INQ-4002 이서연 등) 매칭 — §5.2 매칭 대상은 `id`/`subject`/`requester.name`/`requester.email` 필드뿐(assignee 는 매칭 대상 아님) |
| 검색 결과 단건 | `query='환불'` → subject 매칭, INQ-4006 1건 |
| 검색 결과 0건 | `query='존재하지않는키워드'` → 빈 배열, empty state |
| 필터 결과 다건 | `priority=['urgent']` → INQ-4002, INQ-4007 2건 |
| 필터 결과 0건 없음(주의) | 모든 단일 필터 옵션은 §6.3 에 의해 최소 1건 보장 — 0건 필터 재현은 **교집합**으로만 발생(다음 행) |
| 필터+검색 교집합 0건 | `status=['resolved']` + `query='로그인'` → INQ-4006 은 subject/requester 에 "로그인" 미포함 → 빈 배열 |
| 미배정만 보기 | `assignee=['unassigned']` → INQ-4001, INQ-4008 |
| 담당자 미배정으로 인한 전이 거부(G1) | INQ-4001 또는 INQ-4008 에 `received→in_progress` 시도 → 거부 |
| 보류→해결 직접 전이 거부(G4) | INQ-4005 에 `on_hold→resolved` 시도 → 거부 |
| 재오픈 이력 다건 표시 | INQ-4007 상세 — history 4건(배정/진행/해결/재오픈) |
| 빈 이력(최초 접수) | INQ-4001 또는 INQ-4008 상세 — history 0건 |
| 상태 전환 후 필터 뷰에서 사라짐 | `status=['received']` 필터 뷰에서 INQ-4002 를 `in_progress` 로 전환 → 목록에서 사라짐(EC-11) |

---

## 8. Acceptance Criteria 매핑 (Given/When/Then)

| # | Given | When | Then | 매핑 섹션 |
|---|---|---|---|---|
| AC-1 | Epic 요구 | 기획 명세 작성 | 목록·검색·필터·상태 전환 4개 기능의 입출력이 검증 가능하게 문서화된다 | §5(4개 기능 명세) |
| AC-1-부속 | 〃 | 〃 | fixture 필드(티켓 필드·상태값·우선순위 enum)가 문서화된다 | §3(데이터 모델) · §6.2(fixture 표) |
| AC-2 | 결정성 요구 | fixture 설계 | 외부 의존성 없이 고정 데이터로 모든 화면 상태를 재현 가능하다 | §6(fixture 스펙) · §7(화면 상태 재현 매트릭스) |

---

## 9. Edge Case 목록

| # | 시나리오 | 처리 |
|---|---|---|
| EC-01 | 동일 상태로의 전이 요청(예: `in_progress → in_progress`) | no-op, 이력 이벤트 미기록 |
| EC-02 | 담당자 없이 `in_progress`/`on_hold`/`resolved` 전이 시도 | 거부(가드 G1/G3 위반) |
| EC-03 | `on_hold → resolved` 직접 전이 시도 | 거부(가드 G4) |
| EC-04 | 검색어 공백만 입력(`'   '`) | trim 후 빈 문자열 처리 → 필터 적용 결과 전체 반환(전체 미필터 시 8건) |
| EC-05 | 검색 결과 0건 | 빈 배열, "검색 결과 없음" empty state(§7) |
| EC-06 | 모든 필터 카테고리 선택 해제 | 필터 조건 전체 통과로 복귀 |
| EC-07 | 필터+검색 결합 결과 0건 | 빈 배열, empty state(§7) |
| EC-08 | `assignee` 필터에서 `unassigned` 선택 | `assignee === null` 인 티켓만 반환 |
| EC-09 | `resolved` 재오픈 후 다시 `resolved` 처리 | 정상 허용(가드 G5) — `history` 에 `STATUS_CHANGED` 2건 이상 누적 |
| EC-10 | `history` 가 비어 있는데 `status !== 'received'` | 데이터 무결성 위반 — fixture 에는 발생하지 않으나 developer 는 이 조합을 유효하지 않은 상태로 취급해야 함(입력 시 방어 로직은 developer 재량) |
| EC-11 | 필터 뷰 활성 중 상태 전환으로 대상 티켓이 필터 조건을 벗어남 | 목록에서 즉시 사라짐(§5.4) — 필터는 매 렌더마다 재적용되는 파생 상태이지 별도 저장 대상이 아님 |
| EC-12 | `priority` 필드가 4종 enum 외 값 | 정의되지 않은 값 — fixture 에는 발생하지 않으나 개발 시 방어적으로 처리(예: "보통" 취급 여부는 developer 재량, 본 문서는 fixture 결정성만 보장) |

---

## 10. 비범위 (Out of Scope)

- **우선순위(priority) 변경 UI** — fixture 에 고정, 필터·표시·정렬 전용 필드(§0 가정)
- **담당자 배정/재배정 액션** — canary 는 배정 기능을 포함했으나, 본 phase18 은 "목록/검색/필터/상태 전환" 4개 기능만 범위. `assignee` 는 표시·필터 대상 값으로만 사용
- **localStorage 등 영속 저장** — 세션 내 in-memory 상태로 충분(§0 가정). 새로고침 시 fixture 로 초기화되는 것이 정상 동작
- **정렬 기준 커스터마이징 UI** — 기본 정렬(§5.1) 고정, 사용자가 정렬 기준을 바꾸는 컨트롤 없음
- **문의 신규 생성/삭제 UI** — fixture 는 정적 배열이며 런타임 CRUD 대상 아님
- **다중 파일 첨부, 실시간 알림, 서버 API 연동**
- **신규 운영자 계정 추가 UI** — 운영자 풀은 fixture 로 고정(§3.3)
- **다중 문의 일괄(bulk) 상태 전환** — §5.4 는 단건 전환만 규정

---

## 11. 산출물 위치 및 참조 표

| 산출물 | 담당 | 경로 (예정) |
|---|---|---|
| 본 기획 명세 | planner (BF-1018) | `docs/plan/support-inbox-phase18-BF-1013.md` (본 문서) |
| 디자인 시안 | designer (BF-1019) | `docs/design/support-inbox-phase18-BF-1013.md` (컨벤션 — designer 가 확정) |
| 구현 코드 | developer (BF-1021) | `support-inbox-phase18/{index.html,style.css,inbox.js,fixtures.js,...}` (파일 분할은 developer 재량) |
| 테스트 | tester (BF-1023) | `tests/support-inbox-phase18-*.test.js` |

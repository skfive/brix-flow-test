# 현장 점검 체크리스트 기획 명세 — BF-1024 (칸반형 책임자/상태/차단사유/이력 관리)

> 작성자: [박기획] (planner) · 작성일 2026-07-18
> 관련 티켓: BF-1025 (본 planner task) · BF-1024 (부모 Epic)
> 형제 task: BF-1026 (designer) · BF-1027 (developer) · BF-1029 (tester)
> 대상 모듈: `inspection-checklist-canary/` (신규 · tech-stack `vanilla-static`)
> 라우트: `/inspection-checklist-canary`
> 본 문서는 **단일 기준(single source of truth)** — designer/developer/tester 는 본 문서의 상태 전이표·저장소 스키마·seed 값을 재해석 없이 그대로 따른다.

---

## 0. 문서 성격 및 전제

현장 운영자가 점검 항목의 **책임자·진행 상태를 한 화면(칸반 보드)에서 관리**하고, 차단 사유와 변경 이력을 추적하는 기능의 기획 명세다. 본 문서는 다음 세 가지를 확정한다:

1. 데이터 모델 · 상태 전이 규칙(칸반 컬럼 · 가드)
2. 저장소 정책 — 결정적 seed + versioned localStorage adapter, 손상 데이터 복구 정책
3. 화면(라우트) 구성과 AC 매핑

**코드/디자인은 본 task 범위 밖**(developer BF-1027 / designer BF-1026 담당). 본 문서는 논리 계약(데이터 모델 필드, 전이 가부, 저장 스키마)까지만 규정하며 시각 디자인(색상·레이아웃 픽셀값)은 규정하지 않는다.

**tech-stack `vanilla-static` 제약**: 외부 의존성 0건, 서버/DB 없음 → 영속성은 브라우저 `localStorage` 단일 저장소로 한정. 로드는 동기적(synchronous) — 네트워크 왕복이 없으므로 **loading 화면을 별도로 정의하지 않는다**.

---

## 목차

1. [개요 · 용어 정의](#1-개요--용어-정의)
2. [데이터 모델](#2-데이터-모델)
3. [상태 전이 규칙 (칸반) · 가드](#3-상태-전이-규칙-칸반--가드)
4. [책임자(담당자) 배정 규칙](#4-책임자담당자-배정-규칙)
5. [차단 사유(blockReason) 규칙](#5-차단-사유blockreason-규칙)
6. [변경 이력(history) 스키마](#6-변경-이력history-스키마)
7. [저장소 정책 — versioned localStorage adapter](#7-저장소-정책--versioned-localstorage-adapter)
8. [결정적 seed 데이터](#8-결정적-seed-데이터)
9. [화면 구성 — 라우트 · 칸반 보드](#9-화면-구성--라우트--칸반-보드)
10. [AC ↔ 명세 요소 매핑](#10-ac--명세-요소-매핑)
11. [비범위 (Non-goals)](#11-비범위-non-goals)
12. [Edge case 목록](#12-edge-case-목록)
13. [Self-critique](#13-self-critique)

---

## 1. 개요 · 용어 정의

| 용어 | 정의 |
|---|---|
| 점검 항목(ChecklistItem) | 현장에서 점검해야 할 단위 작업 1건. 고유 id, 제목, 책임자, 상태, 차단 사유, 변경 이력을 가진다. |
| 책임자(assignee) | 점검 항목을 처리하는 담당자. `{ id, name }` 또는 `null`(미배정). |
| 상태(status) | 칸반 컬럼과 1:1 대응하는 4종 enum(§3). |
| 차단 사유(blockReason) | 상태가 `blocked` 일 때만 값을 가지는 문자열. 그 외 상태에서는 항상 `null`. |
| 변경 이력(history) | 상태/담당자/차단사유 변경을 append-only 로 기록한 이벤트 배열(§6). |
| seed | 앱 최초 실행 시 또는 저장 데이터 손상 복구 시 사용하는 결정적(deterministic) 초기 데이터(§8). |

---

## 2. 데이터 모델

### 2.1 `ChecklistItem`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | string | ✅ | 고유 식별자. 패턴 `IC-####` (예: `IC-2001`). seed 는 4자리 고정 번호대(§8). |
| `title` | string | ✅ | 점검 항목명(예: "3층 소화기 압력 게이지 확인"). |
| `location` | string | ✅ | 현장 위치 라벨(예: "3F 동관"). 목록 스캔 보조 정보. |
| `assignee` | `{ id: string, name: string }` \| `null` | ✅(필드 자체는 필수, 값은 nullable) | 미배정은 `null`(§4). |
| `status` | `"todo"` \| `"in_progress"` \| `"blocked"` \| `"done"` | ✅ | 칸반 컬럼과 1:1(§3). |
| `blockReason` | string \| `null` | ✅ | `status === "blocked"` 일 때만 non-empty string, 그 외 항상 `null`(§5). |
| `history` | `HistoryEvent[]` | ✅ | append-only, 오래된 순(§6). 신규 seed 항목 중 최초 접수 그대로인 항목은 빈 배열 허용(정상 케이스). |
| `createdAt` | string(ISO 8601) | ✅ | 항목 생성 시각. seed 는 고정 리터럴 문자열 사용(§8.2 결정성 규칙). |
| `updatedAt` | string(ISO 8601) | ✅ | 최종 변경 시각. history 마지막 이벤트의 `at` 과 동일해야 한다(불변식). history 가 빈 배열이면 `createdAt` 과 동일. |

### 2.2 `HistoryEvent`

| 필드 | 타입 | 설명 |
|---|---|---|
| `type` | `"STATUS_CHANGED"` \| `"ASSIGNEE_CHANGED"` \| `"BLOCK_SET"` \| `"BLOCK_CLEARED"` | 이벤트 종류(§6.1). |
| `at` | string(ISO 8601) | 이벤트 발생 시각. |
| `actor` | string | 조작한 담당자 이름(또는 "system" — seed 초기화 등 시스템 조작 시). |
| `from` | string \| null | `STATUS_CHANGED`/`ASSIGNEE_CHANGED` 전용. 이전 값. |
| `to` | string \| null | `STATUS_CHANGED`/`ASSIGNEE_CHANGED` 전용. 이후 값. |
| `reason` | string \| null | `BLOCK_SET`(설정된 사유) / `BLOCK_CLEARED`(직전까지 있었던 사유, 감사 추적용) 전용. |

---

## 3. 상태 전이 규칙 (칸반) · 가드

### 3.1 상태 4종 = 칸반 컬럼 4개

| status | 한글 라벨 | 의미 |
|---|---|---|
| `todo` | 예정 | 아직 착수 전 |
| `in_progress` | 진행중 | 현재 처리 중 |
| `blocked` | 차단됨 | 진행 불가 사유 발생(사유 필수) |
| `done` | 완료 | 점검 종결 |

### 3.2 전이표 · 가드

| From → To | 허용 여부 | 가드 |
|---|---|---|
| `todo` → `in_progress` | ✅ | **G1**: `assignee` 가 배정되어 있어야 함(미배정 시 전이 거부) |
| `todo` → `blocked` | ✅ | **G2**: `blockReason` non-empty 문자열 필수(미입력 시 전이 거부) |
| `in_progress` → `blocked` | ✅ | G2 동일 |
| `in_progress` → `done` | ✅ | **G4**: `done` 은 `in_progress` 에서만 진입 가능(아래 근거) |
| `in_progress` → `todo` | ✅ | 되돌리기(작업 착수 취소). 가드 없음 |
| `blocked` → `todo` | ✅ | **G3**: 전이 시 `blockReason` 자동 `null` 초기화 + `BLOCK_CLEARED` 이벤트 append |
| `blocked` → `in_progress` | ✅ | G3 동일 |
| `done` → `in_progress` | ✅ | **G5**: 재오픈(재점검 필요 시). `todo` 로 직접 재오픈 불가 — 재점검은 반드시 "진행중"부터 재개 |
| `todo` → `done` | ❌ | G4 위반 — 착수 없이 완료 처리 금지(현장 점검 특성상 실측 없는 완료 방지) |
| `blocked` → `done` | ❌ | G4 위반 — 차단 사유 해소(→`in_progress` 경유) 없이 완료 금지 |
| `done` → `todo` / `done` → `blocked` | ❌ | 미정의 전이. `done` 에서 벗어나는 유일한 경로는 `in_progress` 재오픈(G5) |

- 가드 위반 전이는 UI 상 비활성(disabled) 처리 대상 — 실제 disabled 판정 로직은 developer 가 본 §3.2 표를 단일 기준으로 구현한다(디자인은 표시 방식만 규정, §10 참조).
- 모든 상태 전이는 `STATUS_CHANGED` history 이벤트를 append 한다(§6).

---

## 4. 책임자(담당자) 배정 규칙

| 현재 상태 | 배정/재배정 | 해제(`null` 로 되돌리기) |
|---|---|---|
| `todo` | ✅ 가능 | ✅ 가능 |
| `in_progress` | ✅ 가능(재배정) | ❌ 불가 — 진행중 항목은 담당자가 반드시 존재해야 함(**EC-A**) |
| `blocked` | ✅ 가능(재배정) | ❌ 불가 — `in_progress` 와 동일 이유 |
| `done` | ❌ 불가 | ❌ 불가 — 완료 항목은 배정 잠금. 변경하려면 §3.2 G5 로 먼저 재오픈(`in_progress`) |

- 배정/재배정 시 `ASSIGNEE_CHANGED` history 이벤트 append(`from`/`to` 는 담당자 이름, 미배정은 `null`).
- G1(§3.2)과의 관계: `todo` → `in_progress` 전이 시점에 `assignee !== null` 이어야 하므로, 실무 흐름은 "먼저 배정 → 그 다음 진행중 전이"가 된다.

---

## 5. 차단 사유(blockReason) 규칙

- `blockReason` 은 **상태와 결합된 필드**다 — 독립적으로 언제든 설정/해제되는 값이 아니라, `status === "blocked"` 로 전이하는 동작 자체에 종속된다.
- **설정**: `todo`/`in_progress` → `blocked` 전이 시 non-empty 문자열 입력이 없으면 전이 자체가 거부된다(G2). 성공 시 `BLOCK_SET` 이벤트(`reason` 포함) append, `updatedAt` 갱신.
- **해제**: `blocked` → `todo`/`in_progress` 전이 시 `blockReason` 은 자동으로 `null` 이 되며, 별도 사용자 입력 없이 시스템이 초기화한다. `BLOCK_CLEARED` 이벤트에 직전 사유를 `reason` 필드로 보존(감사 추적 — 사유 자체를 삭제하지 않고 이력에만 남김).
- 차단 사유 텍스트를 `blocked` 상태에서 **수정만** 하는(상태 전이 없는) 동작은 본 명세 범위 밖(§11 비범위) — 사유를 바꾸려면 일단 차단 해제 후 재차단해야 한다(단순성 우선, 편집 UI 불필요).

---

## 6. 변경 이력(history) 스키마

### 6.1 이벤트 발생 규칙

| 트리거 | 이벤트 |
|---|---|
| 임의 상태 전이(§3.2) | `STATUS_CHANGED` (`from`/`to` = status 값) |
| 배정/재배정/해제(§4) | `ASSIGNEE_CHANGED` (`from`/`to` = 담당자 이름 또는 `null`) |
| `blocked` 진입(§5) | `BLOCK_SET` (`reason` = 입력된 사유) |
| `blocked` 이탈(§5) | `BLOCK_CLEARED` (`reason` = 직전 사유) |

### 6.2 불변식

- **append-only**: 기존 이벤트는 절대 수정·삭제하지 않는다.
- **오래된 순 정렬 고정**: 배열 순서 = 발생 순서(오래된 것이 index 0). 화면에서 재정렬하지 않는다(§9 참조).
- 빈 `history` (`[]`) 는 "seed 이후 한 번도 변경되지 않은 항목"을 의미하는 정상 케이스 — 오류로 취급하지 않는다.

---

## 7. 저장소 정책 — versioned localStorage adapter

### 7.1 저장 키 · envelope 스키마

- localStorage key: `inspection-checklist-canary:v1` (단일 키, 접두사에 스키마 버전 고정 포함).
- 저장 값(JSON.stringify 된 envelope):

```json
{
  "schemaVersion": 1,
  "items": [ /* ChecklistItem[] — §2.1 */ ],
  "updatedAt": "2026-07-18T00:00:00.000Z"
}
```

- `schemaVersion` 은 **envelope 자체의 스키마 버전**(향후 필드 추가/구조 변경 시 증가). 현재는 `1` 고정.
- 모든 상태/배정/차단 변경은 **즉시 동기적으로 write** 한다(디바운스 없음 — vanilla-static 단순성 우선, 데이터 유실보다 즉시성 우선).

### 7.2 adapter 책임 (load / save)

| 함수 | 책임 |
|---|---|
| `load()` | localStorage 에서 read → `JSON.parse` → §7.3 검증 통과 시 `items` 반환. 검증 실패(어떤 사유든) 시 **§7.3 복구 정책**에 따라 seed(§8)로 폴백하고, 폴백된 결과를 즉시 `save()` 로 재기록(자가 치유 — 다음 로드부터는 정상 데이터). |
| `save(items)` | 현재 `items` + `schemaVersion: 1` + `updatedAt`(변경 시각) 을 envelope 로 직렬화해 동기 write. |

### 7.3 손상 데이터 감지 → seed 복구 시나리오

아래 중 **하나라도** 해당하면 "손상(corrupted)"으로 판정하고 전체 데이터셋을 seed(§8)로 교체한다(항목 단위 부분 복구는 하지 않음 — 복잡도 대비 이득이 낮아 비범위, §11):

| # | 손상 조건 | 판정 근거 |
|---|---|---|
| D1 | localStorage 값이 없음(최초 방문) | `getItem` 결과 `null` |
| D2 | `JSON.parse` 실패(문법 오류 등) | 예외 발생 |
| D3 | `schemaVersion` 필드 없음 또는 `1` 이 아닌 값 | 현재 v1 만 지원 — 향후 버전 도입 시 마이그레이션 함수 추가 필요(현재는 미구현, 불일치 시 reseed) |
| D4 | `items` 가 배열이 아니거나, 배열 내 임의 항목이 §2.1 필수 필드 중 하나라도 누락 | 구조 불일치 |
| D5 | 임의 항목의 `status` 가 4종 enum(§3.1) 밖의 값 | enum 위반 |
| D6 | 임의 항목의 `blockReason` 이 상태-필드 결합 규칙(§5) 위반 (`status==="blocked"` 인데 `blockReason` 이 falsy, 또는 `status!=="blocked"` 인데 `blockReason` 이 non-null) | 불변식 위반 |
| D7 | 임의 항목의 `history` 가 배열이 아님 | 구조 불일치 |

- 복구 시 콘솔에 경고 로그(예: `console.warn("[inspection-checklist-canary] 손상 데이터 감지 — seed 로 복구:", 사유)`) — 사용자에게 데이터 유실을 인지시키는 최소 조치(alert 등 UI 개입은 비범위, §11).
- 복구 후 즉시 `save()` 로 seed 를 정식 기록하여 재방문 시 동일 손상 재판정을 피한다.

---

## 8. 결정적 seed 데이터

### 8.1 결정성 규칙 (MUST)

- seed 값은 **고정 리터럴**만 사용한다 — `Date.now()`, `Math.random()`, `new Date()`(인자 없는 현재시각) 사용 금지. 모든 `at`/`createdAt`/`updatedAt` 은 고정 ISO 문자열 리터럴.
- 담당자 후보는 2명 고정: `insp-01`("김현장") · `insp-02`("이점검").
- 목적: tester(BF-1029) 가 동일 seed 로 매 실행 동일 스냅샷을 검증할 수 있어야 한다(재현성).

### 8.2 seed 목록 (`IC-2001` ~ `IC-2007`, 7건)

모든 4개 상태 + 미배정 케이스 + 빈 history 케이스 + 재오픈(done→in_progress 이력) 케이스를 커버한다.

| id | title | assignee | status | blockReason | history 요약 |
|---|---|---|---|---|---|
| `IC-2001` | 1층 비상구 표지등 점검 | `null`(미배정) | `todo` | `null` | `[]` (seed 이후 무변경 — 빈 history 정상 케이스) |
| `IC-2002` | 3층 소화기 압력 게이지 확인 | 김현장(`insp-01`) | `todo` | `null` | `[ASSIGNEE_CHANGED: null→김현장]` |
| `IC-2003` | 지하 1층 배전반 점검 | 김현장(`insp-01`) | `in_progress` | `null` | `[ASSIGNEE_CHANGED: null→김현장, STATUS_CHANGED: todo→in_progress]` |
| `IC-2004` | 옥상 저수조 수위 확인 | 이점검(`insp-02`) | `in_progress` | `null` | `[ASSIGNEE_CHANGED: null→이점검, STATUS_CHANGED: todo→in_progress]` |
| `IC-2005` | 2층 스프링클러 밸브 점검 | 이점검(`insp-02`) | `blocked` | `"밸브실 잠김 — 관리사무소 열쇠 대기 중"` | `[ASSIGNEE_CHANGED, STATUS_CHANGED: todo→in_progress, STATUS_CHANGED: in_progress→blocked, BLOCK_SET]` |
| `IC-2006` | 주차장 CCTV 사각지대 점검 | 김현장(`insp-01`) | `done` | `null` | `[ASSIGNEE_CHANGED, STATUS_CHANGED: todo→in_progress, STATUS_CHANGED: in_progress→done]` |
| `IC-2007` | 옥외 소화전 동파 방지 점검 | 이점검(`insp-02`) | `in_progress` | `null` | `[ASSIGNEE_CHANGED, STATUS_CHANGED: todo→in_progress, STATUS_CHANGED: in_progress→blocked, BLOCK_SET, STATUS_CHANGED: blocked→in_progress, BLOCK_CLEARED]` (차단 해제 후 재개 이력 커버) |

- `createdAt` 은 항목별로 `2026-07-01T09:00:00.000Z` 부터 1시간 간격 고정 증가(`IC-2001`=09:00, `IC-2002`=10:00, … `IC-2007`=15:00). `updatedAt` 은 각 항목 마지막 history 이벤트의 `at`(history 가 빈 배열이면 `createdAt` 과 동일).
- developer 는 본 표를 그대로 리터럴 배열로 구현한다(추측성 필드 추가 금지).

---

## 9. 화면 구성 — 라우트 · 칸반 보드

### 9.1 라우트

- `/inspection-checklist-canary` — 단일 페이지, SPA 라우팅 없음(vanilla-static, 정적 HTML 1장).
- 로드는 동기적(§0) — **loading 화면 정의하지 않음**. 저장 데이터가 없으면(§7.3 D1) seed 로 즉시 채워진 화면이 최초 렌더다.
- 점검 항목 최소 7건(seed) 보장 → **true empty state 없음**(§7.3 참조, 개발자가 seed 를 지우는 조작을 제공하지 않는 한).

### 9.2 칸반 보드 골격 (4-컬럼 = §3.1 상태 4종)

```
┌─────────────────────────────────────────────────────────────────┐
│  헤더 · "현장 점검 체크리스트"  ·  집계(총 N · 미배정 N · 차단 N)     │
├───────────────┬───────────────┬───────────────┬─────────────────┤
│  예정 (todo)   │ 진행중         │ 차단됨         │ 완료 (done)      │
│               │ (in_progress) │ (blocked)     │                 │
│  · 카드 ×N     │  · 카드 ×N     │ · 카드 ×N      │  · 카드 ×N       │
│  (제목/위치/    │                │ (차단사유 노출) │                 │
│   담당자 뱃지)  │               │               │                 │
└───────────────┴───────────────┴───────────────┴─────────────────┘
```

- 카드 클릭 시 상세 패널(또는 확장 카드)에서 §2.1 전체 필드 + §6 history 타임라인(오래된 순, §6.2)을 노출한다. 상세 UI의 위치·레이아웃(모달 vs 사이드패널)은 designer(BF-1026) 재량 — 본 문서는 **노출해야 할 데이터**만 규정한다.
- 상태 전이는 카드 내 전이 버튼(§3.2 표에서 허용된 전이만 활성) 또는 컬럼 간 이동으로 구현 가능 — 구현 방식은 developer 재량, **가부 판정 로직은 §3.2 표가 단일 기준**.
- 차단(`blocked`) 컬럼 카드에는 `blockReason` 을 카드 표면에 항상 노출(현장 운영자가 목록만 보고 차단 사유를 즉시 파악해야 함 — 핵심 요구사항).
- 미배정(`assignee === null`) 카드는 담당자 뱃지 자리에 "미배정" 표시(§4 G1 과 연계 — 미배정 상태에서 "진행중" 전이 버튼은 비활성).

---

## 10. AC ↔ 명세 요소 매핑

| Epic AC | Given / When / Then | 충족 명세 요소 | 위치 |
|---|---|---|---|
| **AC-1** | Epic 수용 기준 → 명세 문서 작성 → 항목별 책임자/상태/차단사유/변경이력 데이터 모델과 상태 전이 규칙 정의 | `ChecklistItem`/`HistoryEvent` 필드 정의, 상태 4종 전이표 + 가드 G1~G5, 배정 규칙, 차단사유 결합 규칙 | §2 · §3 · §4 · §5 · §6 |
| **AC-2** | 데이터 의존성 → 저장 정책 명세 → versioned localStorage adapter 스키마와 손상 데이터→seed 복구 시나리오 문서화 | envelope 스키마(`schemaVersion`/`items`/`updatedAt`), load/save 책임, 손상 판정 D1~D7, 결정적 seed 7건 | §7 · §8 |
| **AC-3** | 라우트 `/inspection-checklist-canary` → 명세 확정 → 화면 구성·수용 기준 매핑 표 포함 | 라우트 정의, 4-컬럼 칸반 골격, 본 매핑 표 | §9 · §10(본 표) |

---

## 11. 비범위 (Non-goals)

- **디자인 시안**(색상 토큰·타이포·접근성 세부 인터랙션) — designer(BF-1026) 담당, 본 문서는 데이터/화면 골격만 규정.
- **실제 코드 구현** — developer(BF-1027) 담당.
- 검색 / 필터 / 정렬 기능.
- 점검 항목 신규 생성 / 삭제 UI (seed 7건 고정 편집만 대상 — CRUD 전체는 canary 범위 밖).
- 차단 사유 텍스트만 단독 수정(상태 전이 없이) — §5 참조, 차단 해제 후 재차단으로 대체.
- 다중 사용자 동시 편집/실시간 동기화 — localStorage 는 브라우저 단일 인스턴스 범위.
- 서버 API / DB 연동 — 영속성은 localStorage 단일 계층.
- 알림(이메일/푸시), 다국어(i18n).
- `schemaVersion` 2 이상으로의 실제 마이그레이션 함수 구현 — 현재는 "버전 불일치 시 seed 복구"만 정의(§7.3 D3), 향후 스키마 변경 시 별도 task 필요.
- 항목 단위 부분 손상 복구(§7.3 참조) — 손상 감지 시 전체 seed 교체로 단순화.

---

## 12. Edge case 목록

| # | 조건 | 기대 동작 |
|---|---|---|
| EC-A | `in_progress`/`blocked` 상태에서 담당자 해제 시도 | 거부(§4) — 두 상태는 담당자 필수 |
| EC-B | `todo`/`blocked` → `in_progress` 전이 시 `assignee === null` | 거부(G1, §3.2) |
| EC-C | `blocked` 전이 시 `blockReason` 공백/미입력 | 거부(G2, §3.2·§5) |
| EC-D | `todo` → `done` 또는 `blocked` → `done` 직접 시도 | 거부(G4, §3.2) |
| EC-E | `done` 상태에서 배정/재배정 시도 | 거부(§4) — 재오픈(G5) 먼저 필요 |
| EC-F | `done` → `in_progress` 재오픈 | 허용(G5) — `blockReason` 은 관여하지 않음(재오픈은 차단 상태 아님) |
| EC-G | `blocked` → `todo`/`in_progress` 전이 | `blockReason` 자동 `null` 초기화 + `BLOCK_CLEARED` 이벤트(§5) |
| EC-H | localStorage 값 없음(최초 방문) | seed 7건 로드 + 즉시 저장(D1, §7.3) |
| EC-I | localStorage 값이 파싱 불가한 문자열 | seed 로 복구(D2) |
| EC-J | `schemaVersion` 없음 또는 `1` 이 아님 | seed 로 복구(D3) |
| EC-K | 저장된 항목 중 하나라도 `status` 가 enum 밖의 값 | 전체 seed 로 복구(D5) |
| EC-L | `history` 가 빈 배열인 항목(예: `IC-2001`) | 오류 아님 — 정상 케이스, "변경 이력 없음" 표시(§6.2) |

---

## 13. Self-critique

| # | 점검 항목 | 결과 |
|---|---|---|
| 1 | **AC 매핑** — Epic AC 3개 전부 명세 요소로 매핑됐는가? | ✅ §10 표로 AC-1/2/3 각각 근거 섹션 명시 |
| 2 | **전이표 완전성** — 4개 상태 간 12개 순서쌍(자기 자신 제외) 전부 허용/거부가 명시됐는가? | ✅ §3.2 표에 허용 7개 + 명시적 거부 3개(`todo→done`, `blocked→done`, `done→todo`/`done→blocked`) 전부 열거 |
| 3 | **저장 정책 손상 시나리오 커버** — 파싱 실패·버전 불일치·구조 불일치·불변식 위반 전부 다뤘는가? | ✅ §7.3 D1~D7 |
| 4 | **seed 결정성** — `Date.now()`/`Math.random()` 등 비결정적 값이 배제됐는가? | ✅ §8.1 명시 금지, §8.2 전부 리터럴 값 |
| 5 | **비범위 명시** — developer/designer 가 추측성 확장을 하지 않도록 범위 밖 항목을 명확히 했는가? | ✅ §11, 특히 부분 복구·마이그레이션·차단사유 단독수정 등 "그럴듯해 보이는" 확장을 명시적으로 배제 |

### 13.1 developer/designer 결정 위임 flag

- **⚠️ 상세 패널 UI 형태**: 모달 vs 사이드패널은 designer 재량(§9.2). 본 문서는 노출 데이터만 규정.
- **⚠️ 전이 버튼 vs 드래그앤드롭**: 카드 이동 인터랙션 방식은 developer/designer 재량(§9.2) — 가부 판정(§3.2)만 고정.
- **⚠️ 손상 경고 UI**: 콘솔 로그만 필수(§7.3), 사용자 대상 배너/toast 여부는 비범위(§11) — 필요 시 후속 task.

---

<!-- bf:pr-summary -->
## Summary

현장 점검 체크리스트(칸반형) 기획 명세를 `docs/plan/inspection-checklist-canary-BF-1024.md` 에 확정했다. 핵심: (1) `ChecklistItem`/`HistoryEvent` 데이터 모델과 상태 4종(`todo`/`in_progress`/`blocked`/`done`) 전이표 + 가드 G1~G5(담당자 필수 착수, 차단사유 필수, 완료는 진행중 경유만), (2) `inspection-checklist-canary:v1` versioned localStorage adapter 스키마와 D1~D7 손상 판정 → 결정적 seed 7건(`IC-2001`~`IC-2007`) 복구 정책, (3) 라우트 `/inspection-checklist-canary` 4-컬럼 칸반 골격과 Epic AC 3개 매핑표. designer/developer 는 본 문서를 단일 기준으로 삼는다.

## Changes

- `docs/plan/inspection-checklist-canary-BF-1024.md` — 데이터 모델(§2)·상태 전이 가드(§3~§6)·저장소 손상 복구 정책(§7)·결정적 seed 7건(§8)·칸반 화면 구성(§9)·AC 매핑(§10)·비범위(§11)·edge case(§12) 전체 명세 신규 작성.
<!-- /bf:pr-summary -->

# 고객 피드백 우선순위 보드 기획 명세 (BF-1167)

> 작성자: [박기획] (planner) · 작성일 2026-07-25
> 관련 티켓: BF-1168 (본 planner task) · BF-1167 (부모 Epic)
> 형제 task: BF-1169 (designer) · BF-1170 (developer) · BF-1172 (tester)
> 대상 모듈: `feedback-board/` (신규 모듈 — 본 Epic 산하에서 최초 생성 예정, 현재 저장소에 코드 없음)
> tech-stack: `vanilla-static` — 외부 의존성 0건, `file://` 직접 실행 호환, 외부 CDN·fetch·서버 API·DB 0건, DB/schema/패키지(`package.json`) 변경 0건(additive 전제)
> 단위/E2E 테스트: `node --test tests/feedback-board-*.test.js` (focused scope · module: `feedback-board`)
> 선례: 저장소 내 `feedback-board-BF-1072`, `feedback-pulse-BF-1080` 등 동일/유사 명칭 산출물이 존재하나, 본 task 의 Task Context Contract 범위(candidateFiles)에 포함되지 않은 historic canary 이므로 **참조하지 않았다**. 본 문서는 BF-1167 Epic 설명만을 근거로 한 자체 완결(self-contained) 명세다.

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

본 문서는 BF-1167 Epic 산하 **고객 피드백 우선순위 보드**의 등록 폼·상태 전환·필터·KPI·오류/재시도·빈 상태/로딩·접근성·fixture 스키마에 대한 단일 기준(single source of truth) 명세다. 현재 저장소에는 `feedback-board/` 코드가 존재하지 않으므로(신규 모듈) 처음부터 설계한 명세다.

**본 planner task(BF-1168)의 담당 파일 영역은 `docs/plan/feedback-board-BF-1167.md` 1개뿐**이며, 코드 작성·디자인 시안 작성은 금지 대상이다(Surgical Changes 원칙). designer(BF-1169)·developer(BF-1170)·tester(BF-1172)가 각자 작업 시 참조하는 단일 기준 스펙이다.

**additive 전제 (Epic 명시 요건 — §8 AC-3 매핑):**
- DB/schema 변경 없음 — 정적 fixture 배열(§6)이 유일한 데이터 원천이며 세션 내 in-memory 상태로만 갱신된다.
- `package.json` 등 패키지 의존성 변경 없음 — 외부 라이브러리 0건, `vanilla-static`.
- 기존 모듈·공용 파일(README, 다른 게임/보드 모듈, 루트 설정) 수정 없음 — `feedback-board/` 신규 디렉터리 안에서 self-contained 로 구현한다.
- 위 3가지가 모두 충족되면 본 기능은 **디렉터리·문서 삭제만으로 완전 롤백 가능**하다 — 기존 코드에 대한 diff 가 없으므로 되돌릴 대상 자체가 없다(§8 AC-3).

**가정 명시 (모호했던 지점, 본 문서에서 확정):**
- **심각도(severity)** 는 Epic 설명에 정확한 enum 값이 없으므로 4단계로 정의한다: `critical`(치명적) · `high`(높음) · `medium`(보통) · `low`(낮음) — 우선순위 보드의 목적(정렬·필터·KPI 분포)에 4단계면 충분하고 과도하지 않다(Simplicity First) — §3.1.
- **유입 채널(channel)** 도 Epic 설명에 정확한 값이 없으므로 4종으로 정의한다: `in_app`(앱 내 문의) · `web_form`(웹 문의 폼) · `email`(이메일) · `social`(SNS) — §3.1.
- 상태 전환은 Epic 설명이 명시한 **검토 대기 → 계획됨 → 처리 완료** 선형 흐름만 정식 범위로 확정한다. 역방향 전환(반려/재검토 되돌리기)은 AC 에 요구되지 않으므로 비범위로 확정한다(§10) — Simplicity First, 요구되지 않은 기능 추측 금지.
- "오류/재시도"는 실제 네트워크 호출이 없는 `vanilla-static` 특성상, 등록·상태 전환 액션이 거치는 **저장 어댑터(save adapter) 계약**에 대한 요건으로 해석한다. 기본 어댑터는 즉시 성공하며, developer/tester 가 테스트 목적으로 실패를 주입할 수 있는 교체 가능한 함수 계약으로 정의한다(§5.5).
- 담당자(assignee)·승인자 개념은 Epic 설명에 없으므로 도입하지 않는다. 상태 변경 이력에는 actor 필드를 두지 않는다(로그인/사용자 개념 자체가 비범위, §10).
- "빈 상태"는 목록에 필터·검색 결과가 0건인 화면 상태로 해석한다(§5.6). fixture 자체가 0건인 최초 로드 실패 시나리오는 별도 "로딩 오류" 상태로 §5.7 에서 다룬다.

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [데이터 모델 · fixture 스키마](#3-데이터-모델--fixture-스키마)
4. [상태 전이 — 상태표 · 가드 규칙](#4-상태-전이--상태표--가드-규칙)
5. [기능 명세](#5-기능-명세)
6. [Deterministic Fixture 데이터 스펙](#6-deterministic-fixture-데이터-스펙)
7. [화면 상태 재현 매트릭스](#7-화면-상태-재현-매트릭스)
8. [Acceptance Criteria 매핑 (Given/When/Then)](#8-acceptance-criteria-매핑-givenwhenthen)
9. [Edge Case 목록](#9-edge-case-목록)
10. [비범위 (Out of Scope)](#10-비범위-out-of-scope)
11. [산출물 위치 및 참조 표](#11-산출물-위치-및-참조-표)

---

## 1. 개요

### 1.1 목적

운영팀이 고객 피드백을 **등록·심각도/채널별로 파악하고, 검토 대기 → 계획됨 → 처리 완료 흐름으로 처리 상태를 관리**하며, 필터로 원하는 피드백을 좁혀 보고, KPI 로 전체 처리 현황을 한눈에 확인할 수 있는 고객 피드백 우선순위 보드 SPA. 외부 API·DB 없이 **결정적(deterministic) fixture 데이터 + 세션 내 브라우저 상태**만으로 동작하는 `vanilla-static` 모듈이다.

### 1.2 적용 범위

| 항목 | 내용 |
|------|------|
| 대상 경로 | `feedback-board/` (신규 — developer(BF-1170)가 생성) |
| 기존 코드 변경 | 없음(본 task 는 기획 문서만 산출, §0 additive 전제) |
| 데이터 원천 | 정적 fixture 배열(§6) — 페이지 로드 시 1회 로드, 이후 세션 내 in-memory 상태로만 갱신 |
| 외부 라이브러리 / DB / package 변경 | 없음 — `file://` 프로토콜 직접 열기 가능, `package.json` 변경 0건 |
| 영속 저장 | 없음(비범위, §10) — 새로고침 시 fixture 로 초기화되는 것이 정상 동작 |
| 롤백 방법 | `feedback-board/` 디렉터리 및 본 문서 삭제만으로 완전 롤백(§0, §8 AC-3) |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전) 또는 Node.js(`node --test`)로 순수 함수(필터/검색/정렬/전이 판정/KPI 집계) 단위 테스트 가능해야 함.
- 네트워크·DB 의존성 0건 — 모든 화면 상태는 fixture 배열 + 세션 내 조작(등록/필터/검색/상태 전환)의 조합만으로 재현 가능해야 한다(결정성 요구, §8 AC-1).

---

## 2. 용어 정의

| 용어 | 정의 |
|------|------|
| Feedback (피드백 항목) | 고객 피드백 보드의 기본 단위 레코드. `id`/`title`/`description`/`severity`/`channel`/`status`/`history` 로 구성 |
| Status (처리 상태) | 피드백 처리 라이프사이클 단계 — `pending_review`(검토 대기) · `planned`(계획됨) · `done`(처리 완료) |
| Severity (심각도) | 피드백 긴급도 — `critical`(치명적) · `high`(높음) · `medium`(보통) · `low`(낮음). 표시·필터·정렬·KPI 전용(§0 가정) |
| Channel (유입 채널) | 피드백이 접수된 경로 — `in_app`(앱 내 문의) · `web_form`(웹 문의 폼) · `email`(이메일) · `social`(SNS) |
| History Event (변경 이력) | 상태 변경 발생 시 append-only 로 기록되는 이벤트 |
| Fixture | 최초 로드 시 사용되는 정적 결정적 데이터 배열(§6) |
| Save Adapter (저장 어댑터) | 등록/상태 전환 액션이 거치는 교체 가능한 저장 함수 계약. 오류/재시도 UX 검증을 위해 실패를 주입할 수 있다(§5.5) |
| Filter set | 사용자가 선택한 status/severity/channel 필터 조건의 조합(§5.3) |
| KPI | 보드 상단에 표시되는 집계 지표(§5.4) |

---

## 3. 데이터 모델 · fixture 스키마

### 3.1 Feedback

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | O | 고유 식별자. 패턴 `FB-####`(4자리 숫자). fixture 는 `6001`부터 순차 |
| `title` | string | O | 제목. 1~100자 |
| `description` | string | O | 상세 설명. 1~1000자 |
| `severity` | enum(4) | O | `critical` \| `high` \| `medium` \| `low` — 랭크: `critical`(4) > `high`(3) > `medium`(2) > `low`(1), 목록 기본 정렬(§5.1)·필터(§5.3)·KPI(§5.4) 기준 |
| `channel` | enum(4) | O | `in_app` \| `web_form` \| `email` \| `social` |
| `status` | enum(3) | O | `pending_review` \| `planned` \| `done` (§4) |
| `createdAt` | string (ISO8601, `+09:00`) | O | 최초 등록 시각 — 불변 |
| `updatedAt` | string (ISO8601, `+09:00`) | O | 마지막 상태 변경 시각(최초 등록 시 `createdAt` 과 동일) |
| `completedAt` | string (ISO8601, `+09:00`) \| `null` | O(필드 존재) | `done` 전환 시각. 그 외 상태는 `null` — 리드타임 KPI(§5.4) 산출 기준 |
| `history` | `HistoryEvent[]` | O | 상태 변경 이력 배열. append-only, 배열 순서 = 발생 순서(오래된 순). 최초 등록은 이력 대상 아님(빈 배열로 시작) |

배열(fixture) 순서와 화면 표시 순서는 별개다 — 목록은 §5.1 정렬 규칙에 따라 렌더링하며, fixture 배열 자체의 순서는 정의 편의상 `id` 오름차순으로 고정한다.

### 3.2 HistoryEvent

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | O | 이벤트 고유 ID. 패턴 `EVT-######`, `800001`부터 순차 |
| `feedbackId` | string | O | 대상 Feedback `id` (FK) |
| `type` | enum | O | `STATUS_CHANGED` (1종 한정 — 상태 전환 외 변경 필드 없음, Simplicity First) |
| `at` | string (ISO8601, `+09:00`) | O | 이벤트 발생 시각 |
| `from` | enum(3) | O | 이전 상태 |
| `to` | enum(3) | O | 변경된 상태 |
| `note` | string \| `null` | O(필드 존재, nullable) | 선택 메모 |

### 3.3 등록 폼 필드 매핑

| 폼 필드(사용자 입력 라벨) | 데이터 모델 필드 | 입력 방식 | 유효성 규칙 |
|---|---|---|---|
| 제목 | `title` | 텍스트 입력(단일 행) | 필수, 1~100자, 공백만 입력 불가(trim 후 빈 문자열 거부) |
| 설명 | `description` | 텍스트 영역(여러 행) | 필수, 1~1000자, 공백만 입력 불가 |
| 심각도 | `severity` | select(단일 선택) | 필수, 4개 옵션 중 1개, 기본값 없음(사용자가 명시적으로 선택해야 제출 가능) |
| 유입 채널 | `channel` | select(단일 선택) | 필수, 4개 옵션 중 1개, 기본값 없음 |

등록 시 `id`/`status`(=`pending_review` 고정)/`createdAt`/`updatedAt`/`completedAt`(=`null`)/`history`(=`[]`)는 시스템이 자동 생성하며 폼 입력 대상이 아니다.

---

## 4. 상태 전이 — 상태표 · 가드 규칙

### 4.1 전이표

| From \ To | `pending_review` | `planned` | `done` |
|---|---|---|---|
| `pending_review` | — (동일 상태 재요청은 no-op, EC-01) | **O** | ✗ — 가드 G1(계획 단계 생략 불가) |
| `planned` | ✗ — 가드 G2(역방향 금지, §10 비범위) | — | **O** |
| `done` | ✗ — 가드 G2 | ✗ — 가드 G2 | — |

### 4.2 가드 규칙

- **G1** (`pending_review → done` 직접 전이 금지): 반드시 `planned` 를 거쳐야 한다. 위반 시 거부("계획 단계를 먼저 거쳐야 합니다").
- **G2** (역방향 전이 전면 금지): `planned → pending_review`, `done → planned`, `done → pending_review` 는 모두 거부한다("이미 진행된 단계는 되돌릴 수 없습니다"). 되돌리기는 §10 비범위.

동일 상태로의 전이 요청은 오류가 아니라 **no-op** 이며 이력 이벤트를 남기지 않는다(EC-01).

---

## 5. 기능 명세

### 5.1 목록 (List)

| 항목 | 명세 |
|---|---|
| 입력 | 없음(§5.3 필터/검색 결과가 없으면 fixture 전체) |
| 출력 | `Feedback[]` — 화면 렌더용 정렬된 배열 |
| 기본 정렬 | ① `severity` 랭크 내림차순(critical→low) ② 동일 severity 내 `createdAt` 오름차순(먼저 등록된 것 우선) ③ 동일 시각 시 `id` 오름차순(완전 결정성 보장) |
| 표시 필드 | `id`, `title`, `severity`, `channel`, `status`, `updatedAt` |
| 정렬 커스터마이징 | 비범위(§10) |

### 5.2 등록 (Create)

| 항목 | 명세 |
|---|---|
| 입력 | §3.3 폼 필드(제목/설명/심각도/유입 채널) |
| 유효성 검증 | §3.3 규칙 위반 시 제출 차단, 필드별 인라인 오류 메시지 표시(예: "제목을 입력해 주세요") |
| 저장 | §5.5 저장 어댑터를 통해 처리 — 성공 시 `status=pending_review` 로 목록에 즉시 반영, 실패 시 §5.5 재시도 UX |
| 성공 후 동작 | 폼 초기화 + 목록 최상단 정렬 위치로 자동 노출(정렬 규칙(§5.1)에 따라 배치, 상단 고정 아님) + aria-live 안내(§5.8) |

### 5.3 필터 · 검색 (Filter & Search)

| 항목 | 명세 |
|---|---|
| 필터 카테고리 | `status`(다중 선택), `severity`(다중 선택), `channel`(다중 선택) |
| 카테고리 내부 결합 | OR |
| 카테고리 간 결합 | AND |
| 선택 없음(카테고리 전체 미선택) | 해당 카테고리는 필터링하지 않음(전체 통과) |
| 검색 입력 | `query: string`, `trim()` 후 소문자 변환(대소문자 무관) |
| 검색 매칭 대상 | `id`, `title`, `description` — 하나라도 포함(substring match, OR) 하면 매칭 |
| 검색 vs 필터 결합 | AND — 필터를 먼저 적용한 결과 집합 안에서 검색 매칭 |
| 결과 0건 | 빈 배열 반환 → §5.6 빈 상태 표시 |
| 필터 초기화 | 모든 카테고리 선택 해제 + 검색어 지우기 → 전체 목록 복귀 |

### 5.4 KPI

보드 상단에 아래 4개 KPI 를 표시한다. 모든 KPI 는 **현재 필터/검색과 무관하게 전체 fixture 기준**으로 계산한다(필터링된 부분집합 기준 KPI 는 혼동을 유발하므로 비범위, §10).

| KPI | 정의 | 산출식 |
|---|---|---|
| 전체 피드백 건수 | fixture 전체 레코드 수 | `count(all)` |
| 상태별 건수 | `pending_review`/`planned`/`done` 각각의 건수 | `count(status = X)` for X in 3 states |
| 심각도별 분포 | `critical`/`high`/`medium`/`low` 각각의 건수 및 전체 대비 비율(%) | `count(severity = X)`, `round(count(severity=X) / count(all) * 100, 1)` |
| 평균 처리 리드타임 | `status = done` 인 항목의 `createdAt` → `completedAt` 소요 일수 평균(소수 1자리, 반올림) | `round(avg((completedAt - createdAt) in days), 1)`. `done` 항목이 0건이면 "데이터 없음" 표시(0으로 나누기 회피, EC-10) |

### 5.5 오류 · 재시도 (저장 어댑터 계약)

- 등록(§5.2)·상태 전환(§4) 액션은 모두 `saveAdapter(payload) -> Promise<Result>` 형태의 교체 가능한 함수를 통과한다. 기본 구현은 즉시 성공을 반환한다.
- developer/tester 는 테스트 목적으로 실패를 반환하는 어댑터를 주입해 아래 UX 를 검증한다:
  - **로딩 상태**: 액션 진행 중 해당 버튼 비활성화 + "저장 중..." 텍스트 표시(§5.7).
  - **실패 시**: 데이터 변경 없이 인라인 오류 메시지 + "다시 시도" 버튼 노출. 재시도 횟수 상한은 두지 않는다(사용자가 원하는 만큼 재시도 가능) — 상한을 두면 Epic 이 요구하지 않은 잠금 상태가 추가되므로 Simplicity First 위반.
  - **성공 시**: 오류 메시지 제거, 정상 결과 반영, aria-live 안내(§5.8).

### 5.6 빈 상태 (Empty State)

| 상황 | 표시 |
|---|---|
| 필터/검색 결과 0건(fixture 자체는 존재) | "조건에 맞는 피드백이 없습니다" 메시지 + "필터 초기화" 버튼 |
| fixture 전체가 0건(이론상 발생하지 않음, §6 원칙상 8건 고정이나 방어적으로 정의) | "등록된 피드백이 없습니다" 메시지 + 등록 폼으로 이동 안내 |

### 5.7 로딩 상태

| 상황 | 표시 |
|---|---|
| 최초 fixture 로드 중 | 목록 영역에 "불러오는 중..." 스켈레톤/텍스트, 등록 폼은 로드 완료 후 활성화 |
| 등록/상태 전환 진행 중 | 해당 액션 버튼만 비활성화 + "저장 중..." (§5.5), 나머지 화면은 조작 가능(전체 화면 잠금 없음) |

### 5.8 접근성 (키보드 · aria-live)

- **키보드**: 등록 폼의 모든 입력 요소(제목/설명/심각도/채널/제출 버튼), 필터 컨트롤(체크박스/검색창), 목록의 상태 전환 버튼은 `Tab` 순서로 접근 가능해야 하며 `Enter`/`Space` 로 활성화되어야 한다. 포커스 이동 시 시각적 포커스 표시(outline)를 제거하지 않는다.
- **레이블 연결**: 모든 폼 입력 요소는 `<label for>` 또는 `aria-label` 로 명시적 레이블을 가진다(§3.3 필드명 기준).
- **aria-live 영역 3개소**:
  1. 목록 결과 안내(`aria-live="polite"`): 필터/검색 적용 시 "N건 표시" 로 결과 개수 안내.
  2. 저장 결과 안내(`aria-live="assertive"`): 등록/상태 전환 성공("피드백이 등록되었습니다", "상태가 변경되었습니다") 또는 실패("저장에 실패했습니다. 다시 시도해 주세요") 메시지.
  3. 로딩 안내(`aria-live="polite"`): "저장 중입니다" / "불러오는 중입니다".

---

## 6. Deterministic Fixture 데이터 스펙

### 6.1 원칙

- Fixture 는 **정적 배열**이며 실행마다 동일한 값을 반환한다(난수/현재시각 사용 금지 — developer 구현 시 `Date.now()`/`Math.random()` 금지).
- 3개 status × 4개 severity × 4개 channel 조합을 모두 커버할 필요는 없으나(48건은 과다 — Simplicity First), **각 status 최소 1건, 각 severity 최소 1건, 각 channel 최소 1건**은 반드시 포함해 필터 전체 옵션이 공집합이 되지 않도록 한다.
- 검색 결과 0건을 재현할 수 있는 쿼리가 최소 1개 존재해야 한다(§7).
- 필터+검색 교집합 0건을 재현할 수 있는 조합이 최소 1개 존재해야 한다(§7).
- `done` 항목은 리드타임 KPI(§5.4) 가 결정적으로 계산되도록 `createdAt`/`completedAt` 값을 고정한다.

### 6.2 Fixture 데이터 (8건)

| id | title | severity | channel | status | createdAt | completedAt |
|---|---|---|---|---|---|---|
| `FB-6001` | 로그인 화면 다크모드 대비 부족 | `medium` | `in_app` | `pending_review` | 2026-07-10T09:00:00+09:00 | `null` |
| `FB-6002` | [긴급] 결제 완료 후 주문내역 미표시 | `critical` | `web_form` | `pending_review` | 2026-07-11T10:00:00+09:00 | `null` |
| `FB-6003` | 알림 설정 화면 접근성 개선 요청 | `high` | `email` | `planned` | 2026-07-12T11:00:00+09:00 | `null` |
| `FB-6004` | 검색 자동완성 속도 개선 희망 | `low` | `social` | `planned` | 2026-07-13T12:00:00+09:00 | `null` |
| `FB-6005` | Payment receipt email not received | `high` | `email` | `pending_review` | 2026-07-14T13:00:00+09:00 | `null` |
| `FB-6006` | 다국어 지원(영어) 요청 | `low` | `web_form` | `done` | 2026-07-05T09:00:00+09:00 | 2026-07-15T09:00:00+09:00 |
| `FB-6007` | 앱 푸시 알림 중복 발송 | `critical` | `in_app` | `done` | 2026-07-06T09:00:00+09:00 | 2026-07-16T09:00:00+09:00 |
| `FB-6008` | 프로필 사진 업로드 실패 | `medium` | `web_form` | `planned` | 2026-07-16T14:00:00+09:00 | `null` |

`FB-6005` 는 영문 title(검색 대소문자 무관 매칭 검증용), `description` 은 각 행 한국어 상세 설명 1~2문장으로 developer 가 §3.1 규칙(1~1000자) 내에서 자유롭게 채운다(문구 자체는 결정성에 영향 없음 — 길이/필드 존재만 고정 대상).

`updatedAt` 은 각 레코드의 마지막 상태 변경 시각(없으면 `createdAt` 과 동일)으로 고정한다. `planned` 상태 레코드는 `pending_review→planned` 전환 이력 1건, `done` 레코드는 `pending_review→planned→done` 전환 이력 2건을 `history` 에 포함한다(EVT ID `800001`부터 순차, 시각은 `createdAt` ~ `updatedAt` 사이 임의 고정값 — developer 확정).

### 6.3 커버리지 확인

- status: `pending_review`(6001,6002,6005) · `planned`(6003,6004,6008) · `done`(6006,6007) — 3종 전부 존재.
- severity: `critical`(6002,6007) · `high`(6003,6005) · `medium`(6001,6008) · `low`(6004,6006) — 4종 전부 존재.
- channel: `in_app`(6001,6007) · `web_form`(6002,6006,6008) · `email`(6003,6005) · `social`(6004) — 4종 전부 존재.
- 리드타임 계산: `FB-6006` 10일, `FB-6007` 10일 → 평균 리드타임 = **10.0일**(결정적 고정값, tester 검증 기준값).

---

## 7. 화면 상태 재현 매트릭스

| 화면 상태 | 재현 방법 |
|---|---|
| 기본 목록(필터/검색 없음) | 필터 전체 해제 + `query=''` → 8건, §5.1 정렬 순 |
| 검색 결과 다건 | `query='요청'` → title 에 "요청" 포함(FB-6003, FB-6004) 2건 |
| 검색 결과 단건 | `query='다국어'` → FB-6006 1건 |
| 검색 결과 0건 | `query='존재하지않는키워드'` → 빈 배열, §5.6 빈 상태 |
| 필터 결과 다건 | `severity=['critical']` → FB-6002, FB-6007 2건 |
| 필터+검색 교집합 0건 | `status=['done']` + `query='다크모드'` → FB-6006/6007 title 에 "다크모드" 미포함 → 빈 배열 |
| 계획 단계 생략 거부(G1) | FB-6001 또는 FB-6002 에 `pending_review→done` 시도 → 거부 |
| 역방향 전이 거부(G2) | FB-6003 또는 FB-6004 에 `planned→pending_review` 시도 → 거부 |
| KPI — 리드타임 고정값 | `done` 2건(FB-6006, FB-6007) 기준 평균 10.0일(§6.3) |
| 저장 실패 후 재시도 성공 | 등록 폼 제출 시 실패 어댑터 주입 → 오류 메시지+"다시 시도" 노출 → 재시도 시 성공 어댑터로 전환 → 정상 등록(§5.5) |
| 로딩 상태 | 최초 진입 시 목록 영역 "불러오는 중..." → fixture 로드 완료 후 목록 표시(§5.7) |

---

## 8. Acceptance Criteria 매핑 (Given/When/Then)

| # | Given | When | Then | 매핑 섹션 |
|---|---|---|---|---|
| AC-1 | Epic 요구 | 기획 명세 작성 | 등록 폼 필드(제목/설명/심각도/유입 채널)·상태 전환 흐름·필터·KPI·접근성(키보드/aria-live)·fixture 스키마가 검증 가능한 형태로 문서화된다 | §3(데이터 모델·폼 필드) · §4(상태 전이) · §5(기능 명세) · §6(fixture) |
| AC-1-부속 | 〃 | 〃 | 오류/재시도·빈 상태·로딩 요건이 문서화된다 | §5.5~§5.7 |
| AC-2 | 수용 기준(롤백 가능·기존 영향 0·KPI 측정) | 명세 검토 | **롤백 가능**: `feedback-board/` 신규 디렉터리+본 문서만 산출되고 기존 파일에는 diff 가 없으므로, 디렉터리·문서 삭제만으로 완전 롤백 가능함이 명시된다 | §0(additive 전제) · §1.2(롤백 방법) |
| AC-2-부속1 | 〃 | 〃 | **기존 영향 0**: DB/schema/`package.json` 변경 없음, 기존 모듈·공용 파일 미수정, `vanilla-static` self-contained 구현이 명시된다 | §0 · §1.2 |
| AC-2-부속2 | 〃 | 〃 | **KPI 측정**: 4개 KPI(전체 건수/상태별 건수/심각도별 분포/평균 리드타임) 각각의 산출식과 결정적 fixture 기준 검증값(리드타임 10.0일)이 명시된다 | §5.4 · §6.3 |

---

## 9. Edge Case 목록

| # | 시나리오 | 처리 |
|---|---|---|
| EC-01 | 동일 상태로의 전이 요청(예: `planned → planned`) | no-op, 이력 이벤트 미기록 |
| EC-02 | `pending_review → done` 직접 전이 시도 | 거부(가드 G1) |
| EC-03 | `planned → pending_review` 또는 `done → planned`/`pending_review` 전이 시도 | 거부(가드 G2, 역방향 금지) |
| EC-04 | 검색어 공백만 입력(`'   '`) | trim 후 빈 문자열 처리 → 필터 적용 결과 전체 반환 |
| EC-05 | 검색+필터 결과 0건 | 빈 배열, §5.6 빈 상태 |
| EC-06 | 모든 필터 카테고리 선택 해제 | 필터 조건 전체 통과로 복귀 |
| EC-07 | 등록 폼 필수 필드 미입력 상태로 제출 시도 | 제출 차단, 필드별 인라인 오류, 포커스는 첫 오류 필드로 이동(키보드 사용자 배려) |
| EC-08 | 등록/상태 전환 저장 실패 | 데이터 변경 없음 + 인라인 오류 + "다시 시도" 버튼(§5.5) |
| EC-09 | 저장 진행 중 동일 액션 버튼 재클릭 | 버튼 비활성화 상태이므로 중복 제출 불가(§5.7) |
| EC-10 | `done` 항목이 0건인 상태에서 평균 리드타임 KPI 계산 | "데이터 없음" 표시, 0으로 나누기 없음(§5.4) — fixture 에는 발생하지 않으나 developer 는 방어적으로 처리해야 함 |
| EC-11 | `history` 가 비어 있는데 `status !== 'pending_review'` | 데이터 무결성 위반 — fixture 에는 발생하지 않으나 유효하지 않은 상태로 취급 |

---

## 10. 비범위 (Out of Scope)

- **상태 역방향 전환(반려/재검토 되돌리기)** — Epic 은 검토 대기→계획됨→처리 완료 선형 흐름만 요구(§0 가정, 가드 G2)
- **담당자 배정/승인자/로그인 개념** — Epic 설명에 없음, history 에 actor 필드 없음
- **localStorage 등 영속 저장** — 세션 내 in-memory 상태로 충분. 새로고침 시 fixture 로 초기화되는 것이 정상 동작
- **정렬 기준 커스터마이징 UI** — 기본 정렬(§5.1) 고정
- **필터링된 부분집합 기준 KPI** — KPI 는 항상 전체 fixture 기준(§5.4)
- **재시도 횟수 상한** — §5.5, 사용자가 원하는 만큼 재시도 가능
- **피드백 수정/삭제 UI** — 등록(Create) 과 상태 전환만 범위, fixture 원본 필드(제목/설명/심각도/채널) 수정 UI 없음
- **다중 피드백 일괄(bulk) 상태 전환** — §4 는 단건 전환만 규정
- **DB/schema/패키지 의존성 추가** — §0 additive 전제, 어떤 형태로도 비범위

---

## 11. 산출물 위치 및 참조 표

| 산출물 | 담당 | 경로 (예정) |
|---|---|---|
| 본 기획 명세 | planner (BF-1168) | `docs/plan/feedback-board-BF-1167.md` (본 문서) |
| 디자인 시안 | designer (BF-1169) | `docs/design/feedback-board-BF-1167.md`, `docs/design/feedback-board-mockup/**` (컨벤션 — designer 가 확정) |
| 구현 코드 | developer (BF-1170) | `feedback-board/{index.html,style.css,board.js,fixtures.js,...}` (파일 분할은 developer 재량, `package.json`/기존 모듈 미수정) |
| 테스트 | tester (BF-1172) | `tests/feedback-board-*.test.js`, `tests/e2e/feedback-board/**` |

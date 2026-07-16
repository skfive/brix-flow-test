# 서비스 상태 카드 검증 페이지 기획 명세 — BF-879 (Phase 18 검증 1/5, 본 task BF-880)

> 작성자: [박기획] (planner) · 작성일 2026-07-16
> 관련 티켓: BF-879 (Epic, 본 문서 파일명 근거 — §0 가정 4) · BF-880 (본 planner task, "[검증 1/5]")
> 검증 대상 라우트: `/phase18-validation/status-card-1`
> tech-stack: 저장소 실질 스택은 `vanilla-static` (Next.js 등 라우터 부재 — §0 가정 1)
> 단위 테스트: `node --test tests/status-card-*.test.js` (focused scope · module: `status-card`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 라우트 → 디렉터리 경로 매핑:** task 설명은 검증 대상을 `/phase18-validation/status-card-1`로 표기한다. 저장소에는 실제 라우터가 없다(패키지 `name: notepad-spa`, Next.js 의존성 0건). 직전 선례인 `docs/planning/status-badge-BF-854.md` §0 가정 1이 확립한 컨벤션 — "`/demo/<name>`" 표기를 실제 HTTP 라우팅이 아니라 **저장소 내 디렉터리 경로**로 직역 — 을 그대로 적용한다. 본 문서는 신규 경로를 `src/app/phase18-validation/status-card-1/`로 정의한다.

**가정 2 — "정적 fixture 기반(외부 API 없음)"의 의미:** 이미 구현·병합된 `src/app/demo/status/`(BF-856, 커밋 `191ffcb`)와 동일하게, 페이지 로드 시 하드코딩된 JS fixture 배열에서 1회 렌더링되고 이후 값이 변하지 않는 정적 스냅샷을 의미한다. `fetch`/`XMLHttpRequest`/`WebSocket`/polling 등 어떤 형태의 외부 통신도 포함하지 않는다(§7).

**가정 3 — "기존 demo 시각 언어 재사용 범위"의 대상 = `src/app/demo/status/`:** 본 저장소에서 "서비스 상태"를 이미 시각화한 유일한 기존 모듈은 `src/app/demo/status/`(기획 `docs/planning/status-badge-BF-854.md`, 디자인 `docs/design/status-badge-BF-855.md`, 구현 BF-856)이다. 이 모듈은 이미 요약 배너·상태 배지·**`status-card` CSS 클래스를 쓰는 서비스 카드 목록**을 갖추고 있으며(`main.js`의 `li.className = "status-card"` 확인 완료), 색상 토큰(`--color-success/warning/danger`, `clock` 셸 토큰)과 접근성 패턴(`aria-label="{서비스명} 상태: {라벨}"`, 아이콘 `aria-hidden`)까지 이미 확정돼 있다. 본 검증 페이지는 **이 시각 언어 전체(마크업 구조·CSS 토큰·순수 데이터/파생 로직)를 그대로 재사용**하고 신규 시각 요소·신규 토큰을 추가하지 않는 것으로 범위를 확정한다(§6).

**가정 4 — 문서 파일명이 본 task 티켓(BF-880)이 아닌 BF-879인 이유:** BF-880 수용 기준 원문이 산출물 경로를 `docs/planning/status-card-BF-879.md`로 명시적으로 지정했다. BF-879는 "[검증 1/5]"라는 표기로 미루어 Phase 18 검증 스위트의 상위 Epic 티켓으로 추정되며, 본 문서는 그 Epic 번호를 파일명에 그대로 사용하라는 지시를 재해석하지 않고 따른다. 문서 본문 전반에서 "본 task"를 지칭할 때는 실제 작업 티켓인 BF-880을 사용한다(§13 남은 모호함 1 참고 — Epic 조회 도구 미연결로 원문 대조는 못 함).

**가정 5 — fixture 데이터 재사용:** "정적 fixture 기반" + "기존 시각 언어 재사용"을 동시에 만족하는 가장 단순한 방법은 신규 서비스 목록을 발명하지 않고 `src/app/demo/status/status.js`의 기존 fixture(웹 서버/API 게이트웨이/데이터베이스/인증 서비스, 3-state 전부 포함)를 그대로 재사용하는 것이다(Simplicity First). 본 문서는 이를 채택한다(§3).

**가정 6 — "[검증 1/5]"과 본 task 범위:** 본 task(BF-880)는 5개 검증 항목 중 1번째만 다룬다. 나머지 2~5/5의 구체적 주제·라우트(`status-card-2` 등이 존재할지 여부 포함)는 본 문서 작성 시점에 확인 불가하며, 본 문서 범위 밖이다(§13 남은 모호함 2).

**가정 7 — 파일 소유권:** 본 task의 담당 파일은 `docs/planning/status-card-BF-879.md` 1개뿐이다. `src/app/phase18-validation/status-card-1/*` 코드, `docs/design/*` 문서는 후속 designer/dev task 담당 영역이며 본 task에서 생성·수정하지 않는다.

실제 Epic(BF-879)에 위 가정과 다른 명시적 지침이 있다면 대조 확인이 필요하다(§13).

---

## 목차

1. [개요](#1-개요)
2. [사용자 가치](#2-사용자-가치)
3. [데이터 모델 (정적 fixture, 재사용)](#3-데이터-모델-정적-fixture-재사용)
4. [화면 구성 요구사항](#4-화면-구성-요구사항)
5. [기존 demo 시각 언어 재사용 범위 확정](#5-기존-demo-시각-언어-재사용-범위-확정)
6. [진입 시나리오 및 렌더 조건](#6-진입-시나리오-및-렌더-조건)
7. [제외 범위 — 필수 명세](#7-제외-범위--필수-명세)
8. [파일 구조 및 기술 제약](#8-파일-구조-및-기술-제약)
9. [Acceptance Criteria 매핑 (Given/When/Then)](#9-acceptance-criteria-매핑-givenwhenthen)
10. [Edge Case 목록](#10-edge-case-목록)
11. [비범위 (Out of Scope)](#11-비범위-out-of-scope)
12. [산출물 위치 및 참조 표](#12-산출물-위치-및-참조-표)
13. [남은 모호함 (운영자 확인 권장)](#13-남은-모호함-운영자-확인-권장)

---

## 1. 개요

### 1.1 목적

`/phase18-validation/status-card-1`(= `src/app/phase18-validation/status-card-1/`)은 Phase 18 검증 스위트의 첫 항목으로, **기존에 확립된 "서비스 상태" 시각 언어(`src/app/demo/status/`)가 새로운 경로/컨텍스트에서도 손실 없이 재사용 가능한지**를 확인하기 위한 정적 검증 페이지다. 신규 기능이 아니라 **재사용성·일관성 검증**이 목적이다.

### 1.2 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `src/app/phase18-validation/status-card-1/`(`index.html` / `styles.css` / `status-card.js` 또는 재사용 모듈 import) — §0 가정 1 |
| 기존 코드 영향 | 없음 — `src/app/demo/status/`는 수정하지 않는다(완전 독립 신규 디렉터리, §5) |
| 데이터 원천 | 하드코딩된 JS fixture(§3, 기존 재사용)뿐 — 서버/외부 API 호출 없음(§7) |
| 외부 라이브러리 | 없음 — 신규 npm 패키지 설치 없음(§7.4) |
| 영속 저장 | 없음 — `localStorage`/쿠키 등 사용하지 않음 |

### 1.3 전제 조건

- 브라우저 환경 또는 Node.js(`node --test`)로 순수 함수(fixture 조회·파생 로직) 단위 테스트
- `src/app/phase18-validation/status-card-1/` 디렉터리는 아직 존재하지 않으며, 본 task 이후 별도 designer/dev task에서 신규 생성됨
- `src/app/demo/status/status.js`는 이미 병합된 상태이며 본 검증 페이지가 재사용할 수 있는 안정적 계약으로 간주한다(§5)

---

## 2. 사용자 가치

본 페이지의 1차 사용자는 최종 고객이 아니라 **내부 검증 담당자(QA/운영자)** 다. Phase 18 검증 스위트의 성격상, 가치는 다음과 같다.

1. **재사용 가능성의 가시적 증거** — "서비스 상태" 시각 언어(배지 3-state·요약 배너·카드 레이아웃·접근성 이름 규칙)가 원본 위치(`/demo/status`)를 벗어난 새 경로에서도 동일하게 동작함을, 별도 코드 리딩 없이 화면 진입만으로 확인할 수 있다.
2. **회귀 조기 발견** — 향후 `src/app/demo/status/`의 토큰·구조가 변경될 때, 본 검증 페이지가 별도로 깨진다면 "재사용 계약이 깨졌다"는 신호가 된다(§10.3 edge case).
3. **디자인 일관성 확인** — 신규 색상·신규 컴포넌트를 전혀 추가하지 않고도 새로운 컨텍스트(Phase 18 검증 네임스페이스)에 배치 가능함을 보여줌으로써, 향후 유사 검증 항목(2~5/5)이 참조할 수 있는 "재사용 우선" 선례를 만든다.

최종 고객 관점의 신규 가치(예: 새로운 정보를 얻는다)는 없다 — 본 task는 신규 기능이 아니라 검증/증명 목적임을 명확히 한다(§11).

---

## 3. 데이터 모델 (정적 fixture, 재사용)

### 3.1 서비스 목록 — `src/app/demo/status/status.js`의 `SERVICES` 그대로 재사용 (§0 가정 5)

| id | 서비스명 | 상태값 | 설명 문구 |
|---|---|---|---|
| `web` | 웹 서버 | `operational` | 모든 페이지가 정상적으로 응답하고 있습니다. |
| `api` | API 게이트웨이 | `operational` | 모든 요청이 정상 처리되고 있습니다. |
| `database` | 데이터베이스 | `degraded` | 일부 쿼리 응답 지연이 관측되고 있습니다. |
| `auth` | 인증 서비스 | `outage` | 로그인 요청이 일시적으로 실패하고 있습니다. |

- 신규 fixture를 발명하지 않는다 — 3-state(정상/저하/장애)를 모두 포함한 기존 목록을 그대로 사용해야 "재사용 검증"의 취지(§2)에 부합한다.
- 스키마·파생 로직(`isKnownStatus`/`statusLabel`/`statusIcon`/`badgeAriaLabel`/`summarize`/`summarySubline`)도 신규 구현 없이 `status.js`에서 가져다 쓴다(§5.2, §8).

### 3.2 데이터 스키마 (계약, 변경 없음)

```
{
  id: string,
  name: string,
  status: "operational" | "degraded" | "outage",
  description: string,
}
```

---

## 4. 화면 구성 요구사항

### 4.1 페이지 구조 (`/demo/status`와 동일 구조 재사용, §5)

```
<body>
 ├─ <header class="topbar">     ← "서비스 상태 카드 검증" 타이틀 (§4.2 원본과 문구만 구분)
 └─ <main class="page">
     ├─ <section class="summary-banner">   ← §3.1 fixture 기반 전체 요약 배너 1개
     └─ <ul class="status-list">           ← §3.1 서비스별 status-card 목록(4개)
         └─ <li class="status-card">       ← 서비스명 + 상태 배지 + 설명 문구
```

### 4.2 원본과의 문구 차이 (구조는 100% 동일, 텍스트만 검증 맥락 반영)

| 요소 | `/demo/status` (원본) | `/phase18-validation/status-card-1` (본 검증) |
|---|---|---|
| `<title>` | `서비스 상태 · /demo/status` | `서비스 상태 카드 검증 · /phase18-validation/status-card-1` |
| `<h1>` | `서비스 상태` | `서비스 상태 카드 (Phase 18 검증 1/5)` |
| 본문 마크업/클래스/데이터 | — | **변경 없음** (§5) |

- 위 표 밖의 모든 마크업 구조·CSS 클래스명·색상 토큰·접근성 속성은 원본과 1:1 동일해야 한다 — 이것이 "재사용 범위 확정"의 검증 대상이다(§5, §9 AC-1).

### 4.3 반응형 · 접근성

- 반응형 브레이크포인트(`≤639px` 1열 스택)와 접근성 이름 규칙(`aria-label="{서비스명} 상태: {라벨}"`, 아이콘 `aria-hidden`)은 `docs/planning/status-badge-BF-854.md` §4.4·§5를 그대로 승계한다(재정의하지 않음).

---

## 5. 기존 demo 시각 언어 재사용 범위 확정

본 섹션은 BF-880의 핵심 수용 기준("기존 demo 시각 언어 재사용 범위를 확정한다")을 직접 충족한다.

### 5.1 재사용 대상 (그대로 가져오는 것)

| 구분 | 원본 출처 | 재사용 방식 |
|---|---|---|
| CSS 디자인 토큰 전체(`--color-*`, `--space-*`, `--radius-*`, `--text-*`, `--motion-*`) | `src/app/demo/status/styles.css` `:root`/`[data-theme="dark"]` | 값 그대로 복제(§0 가정 3) — 신규 색상/토큰 발명 금지 |
| 컴포넌트 CSS 규칙(`.summary-banner`, `.status-list`, `.status-card`, `.status-badge` 등) | 상동 | 그대로 복제 또는 상대경로로 원본 `styles.css` 직접 참조(dev 재량, §8) |
| 순수 데이터/파생 로직(`SERVICES`, `summarize`, `statusLabel`, `statusIcon`, `badgeAriaLabel` 등) | `src/app/demo/status/status.js` | **신규 구현 금지** — 상대경로 `import`로 원본 모듈 재사용(§8) |
| DOM 렌더 구조(요약 배너 → 카드 목록, `<ul><li>` 목록 마크업) | `src/app/demo/status/main.js` | 동일 구조로 재현(§4.1) |
| 접근성 이름 규칙(§4.3) | `docs/planning/status-badge-BF-854.md` §5 | 변경 없이 승계 |

### 5.2 재사용하지 않는 것(신규 허용 범위, 최소)

- `<title>`/`<h1>` 텍스트만 검증 맥락을 반영해 구분한다(§4.2) — 이는 시각 언어가 아니라 페이지 식별 문자열이므로 "재사용 범위"를 벗어나지 않는다.
- 디렉터리 경로 자체(`src/app/phase18-validation/status-card-1/`)는 당연히 신규다(검증 목적상 원본과 분리된 위치여야 재사용성 검증이 성립).

### 5.3 재사용 성공 판정 기준

디자이너/개발자가 본 검증 페이지를 구현했을 때, 원본(`/demo/status`)과 비교해 다음이 모두 참이면 "재사용 성공"으로 판정한다(§9 AC-1):

1. `styles.css`에 신규 색상 리터럴이 0건이다(원본 토큰 값과 diff 시 색상 값 불일치 없음).
2. `status-card.js`(또는 동등 모듈)가 자체 fixture/파생 함수를 재구현하지 않고 원본 `status.js`를 import하거나 그 값과 100% 동일한 재선언만 포함한다.
3. 렌더된 DOM 구조(`summary-banner` → `status-list` → `status-card`×4)가 원본과 동일한 계층·클래스명을 갖는다.

---

## 6. 진입 시나리오 및 렌더 조건

본 섹션은 BF-880의 두 번째 수용 기준("`/phase18-validation/status-card-1` 진입 시나리오와 렌더 조건이 명시된다")을 직접 충족한다.

### 6.1 진입 시나리오

| 시나리오 | 진입 경로 | 기대 동작 |
|---|---|---|
| S1. 정적 서버 경유 | `http-server`(저장소 루트, `pnpm start`)로 서빙 후 브라우저에서 `http://localhost:8888/src/app/phase18-validation/status-card-1/` 접속 | 네트워크 요청 없이 즉시 렌더(§6.2) |
| S2. `file://` 직접 열기 | `index.html`을 브라우저로 직접 오픈 | 상대경로 리소스(`styles.css`, JS 모듈)가 모두 로드되어 S1과 동일하게 렌더(§8 — CORS 이슈로 `type="module"` cross-origin 제약이 있다면 dev가 §13-3에서 대안 검토) |
| S3. 저장소 내 재사용 모듈 변경 후 재검증 | `src/app/demo/status/styles.css` 또는 `status.js`가 향후 수정된 경우 | 본 페이지가 원본을 상대경로 import로 재사용하는 구조라면 변경이 자동 반영되어 재검증 필요성이 시각적으로 드러난다(§5.3 회귀 신호) |

### 6.2 렌더 조건 (필수)

1. **로드 즉시 1회 렌더** — 페이지 진입 후 로딩 스피너·스켈레톤·지연 없이 요약 배너 1개 + 서비스 카드 4개가 동시에 나타난다(§7.2 polling 금지와 직결).
2. **오프라인 동작** — 네트워크 연결이 없어도 완전히 동일하게 렌더된다(외부 API 호출이 0건이므로).
3. **새로고침 안정성** — 몇 번을 새로고침해도 항상 동일한 fixture(§3.1) 그대로 렌더된다(비결정론적 값 없음).
4. **JS 비활성 시 폴백** — `<noscript>` 안내 문구를 표시한다(원본 `/demo/status`와 동일 패턴, §4.1).

---

## 7. 제외 범위 — 필수 명세

### 7.1 실제 health check API 금지

`fetch()`/`XMLHttpRequest`/`WebSocket`/`EventSource` 등 어떤 형태로도 헬스체크 엔드포인트를 호출하지 않는다. `/api/status`, `/health` 등 신규 API 라우트를 만들지 않는다.

### 7.2 polling(주기 갱신) 금지

`setInterval`/`setTimeout` 기반의 재조회·재렌더 로직을 두지 않는다. 페이지는 로드 시 1회 렌더되며 이후 상태가 변하지 않는다.

### 7.3 DB 연동 금지

`prisma/schema.prisma` 수정, migration 생성, DB 조회 코드 어느 것도 포함하지 않는다.

### 7.4 신규 패키지 설치 금지

`package.json`에 신규 dependency를 추가하지 않는다. 외부 CDN 스크립트/스타일도 포함하지 않는다.

### 7.5 원본 모듈(`src/app/demo/status/`) 수정 금지

본 검증 task는 원본을 "재사용"하는 것이지 "변경"하는 것이 아니다. `src/app/demo/status/*` 파일을 수정하면 이미 병합된 BF-856 기능에 회귀를 유발할 수 있으므로 절대 수정하지 않는다(§0 가정 3, §5).

### 7.6 검증 방법

| 방법 | 절차 | 통과 조건 |
|---|---|---|
| 정적 코드 검사 | `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|setInterval|setTimeout|https?://" src/app/phase18-validation/status-card-1/*` | 매치 0건 (자체 상대경로 리소스 제외) |
| 원본 미변경 확인 | PR diff에서 `src/app/demo/status/**` 변경 여부 확인 | 변경 0건 |
| `package.json`/`prisma/` diff 확인 | PR diff 확인 | 변경 0건 |

---

## 8. 파일 구조 및 기술 제약

| 파일 | 역할(제안 — 최종 파일 분할은 dev 재량) |
|---|---|
| `src/app/phase18-validation/status-card-1/index.html` | 마크업(§4.1, `<title>`/`<h1>` 문구만 §4.2 기준 변경) |
| `src/app/phase18-validation/status-card-1/styles.css` | `src/app/demo/status/styles.css` 토큰·컴포넌트 규칙 복제(§5.1) |
| `src/app/phase18-validation/status-card-1/main.js` | `../../demo/status/status.js`를 상대경로 `import`하여 재사용(§5.1) — DOM 바인딩만 신규 작성, fixture/파생 로직 재구현 금지 |

- 외부 의존성 0건, `file://`/정적 서버 양쪽 호환.
- 테스트: `node --test tests/status-card-*.test.js` — ①원본 모듈 미변경 확인(§7.6), ②재사용 import 존재 확인(자체 fixture 재구현 없음, §5.3), ③렌더 조건(§6.2) 관련 순수 로직 검증.

---

## 9. Acceptance Criteria 매핑 (Given/When/Then)

### 9.1 BF-880 수용 기준 원문 매핑

**AC-1 (기획 명세 산출물)**
> **Given** 운영자 Epic(BF-879) 요구
> **When** 기획 명세를 작성하면
> **Then** `docs/planning/status-card-BF-879.md`(본 문서)에 사용자 가치(§2)·화면 구성(§4)·데이터 fixture(§3)·수용 기준(§9)이 정리된다.

**AC-2 (진입 시나리오·렌더 조건)**
> **Given** 검증 대상 라우트 `/phase18-validation/status-card-1`
> **When** 명세를 확정하면
> **Then** §6.1 진입 시나리오(정적 서버/`file://`/재사용 모듈 변경 후 재검증) 3건과 §6.2 렌더 조건(즉시 1회 렌더/오프라인 동작/새로고침 안정성/JS 비활성 폴백) 4건이 명시된다.

### 9.2 화면 재사용 관련 파생 AC (§5 근거)

**AC-3 (시각 언어 재사용 범위)**
> **Given** `src/app/phase18-validation/status-card-1/*` 구현물
> **When** 원본 `src/app/demo/status/*`와 비교하면
> **Then** §5.3 재사용 성공 판정 기준 3항목(신규 색상 0건, fixture/파생 로직 재구현 없음, DOM 구조 동일)을 모두 만족한다.

**AC-4 (정적 fixture·외부 API 없음)**
> **Given** 본 검증 페이지
> **When** §7.6 정적 코드 검사를 실행하면
> **Then** `fetch`/`XMLHttpRequest`/`WebSocket`/`setInterval`/`setTimeout`/외부 URL 매치가 0건이다.

### 9.3 매핑 요약표

| BF-880 수용 기준 | 충족 근거 |
|---|---|
| Given 운영자 Epic 요구, When 기획 명세 작성, Then `docs/planning/status-card-BF-879.md`에 사용자 가치·화면 구성·데이터 fixture·수용 기준 정리 | 본 문서 전체(§2~§4, §9) |
| Given 검증 대상 라우트, When 명세 확정, Then `/phase18-validation/status-card-1` 진입 시나리오·렌더 조건 명시 | §6 전체 |

---

## 10. Edge Case 목록

### 10.1 상대경로 `import`가 `file://`에서 실패하는 경우

일부 브라우저는 `file://` 프로토콜에서 ES 모듈 `import`를 CORS 정책으로 차단할 수 있다. 이 경우 dev는 §6.1 S2 대신 S1(정적 서버 경유)만 공식 검증 경로로 채택하거나, `status.js` 내용을 빌드 없이 파일 복제하는 대안을 검토한다(§13-3, 강제 사항 아님).

### 10.2 원본 fixture가 향후 변경되는 경우

`src/app/demo/status/status.js`의 `SERVICES` 배열이 향후 다른 task에서 변경되면(예: 서비스 추가), 본 검증 페이지도 import 재사용 구조이므로 자동으로 그 변경을 반영한다. 이는 버그가 아니라 §5.1의 의도된 동작(재사용 계약)이다 — 값 불일치가 아니라 원본과의 100% 동기화가 성공 기준이다.

### 10.3 원본 모듈이 삭제/이동되는 경우

`src/app/demo/status/`가 삭제되거나 경로가 바뀌면 본 검증 페이지의 `import`가 깨진다. 이는 "재사용 계약 위반"의 조기 경고 신호로 간주하며(§2.2), 본 문서는 별도 폴백을 규정하지 않는다 — 발생 시 재사용 대상 자체를 재확인해야 한다(§13-4).

### 10.4 정의되지 않은 `status` 값

fixture는 §3.1 고정값만 사용하므로 발생하지 않으나, 원본 `status.js`의 `isKnownStatus`/`UNKNOWN_STATUS` 폴백 로직을 그대로 재사용하므로 향후 fixture가 확장돼도 동일한 폴백이 적용된다(원본 `docs/planning/status-badge-BF-854.md` §9.3 승계).

---

## 11. 비범위 (Out of Scope)

- 신규 상태 값·신규 서비스 종류 추가 — §3.1 fixture는 원본과 100% 동일(재사용 검증이 목적이므로 데이터 확장은 별도 task)
- 실제 헬스체크 로직·API·DB 연동 — §7에서 이미 명시적으로 배제
- `src/app/demo/status/*` 원본 코드의 수정·리팩터링 — §7.5
- Phase 18 검증 스위트의 2~5/5 항목 — 본 문서는 1/5만 다룬다(§0 가정 6, §13-2)
- 디자인 시안(정확한 mockup, 색상 대비 재검증 등) — designer 담당 영역, 원본 디자인 명세(`status-badge-BF-855.md`)를 그대로 참조하면 충분하다고 판단(§13-5)
- 배지 클릭/토글 등 인터랙션 — 원본과 동일하게 순수 표시 요소

---

## 12. 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/planning/status-card-BF-879.md` (본 문서, §0 가정 4) |
| 신규 구현 대상(후속 designer/dev task) | `src/app/phase18-validation/status-card-1/index.html`, `styles.css`, `main.js` — 미정, 본 문서 §3~§8이 계약(contract) |
| 신규 테스트 대상(후속 tester task) | `tests/status-card-*.test.js` — 미정, 본 문서 §7.6·§9가 검증 기준 |
| 재사용 원본(수정 금지) | `src/app/demo/status/index.html`, `styles.css`, `status.js`, `main.js` (BF-856) |
| 참조한 기존 선례 | `docs/planning/status-badge-BF-854.md`(fixture·렌더·접근성 계약 원본), `docs/design/status-badge-BF-855.md`(색상 토큰·컴포넌트 시각 계약 원본) |

---

## 13. 남은 모호함 (운영자 확인 권장)

1. **Epic(BF-879) 원문 미대조**: 본 세션에 Jira 조회 도구가 연결되어 있지 않아 BF-879 Epic 원문(5개 검증 항목의 전체 목록·의도)을 직접 대조하지 못했다. 본 문서는 BF-880 task 설명·수용 기준 원문만으로 작성했다.
2. **검증 2~5/5 항목의 구체 범위**: "status-card-1"의 "-1" 접미사가 향후 `status-card-2`~`-5` 같은 후속 라우트를 의미하는지, 아니면 전혀 다른 주제의 검증 4건이 이어지는지 확인되지 않는다. 확정되면 본 문서 §0 가정 6을 갱신해야 한다.
3. **`file://` cross-origin import 제약**: §10.1 — 실제 dev 구현 시 브라우저 정책으로 상대경로 모듈 import가 막히면 대안(정적 서버 전용 검증으로 축소, 또는 파일 복제)을 재검토해야 한다.
4. **원본 모듈 변경/이동 시 대응 정책**: §10.3 — 재사용 계약이 깨졌을 때 본 검증 페이지가 "실패로 표시"되어야 하는지, 아니면 별도 유지보수 없이 방치돼도 되는지는 운영자 판단이 필요하다.
5. **디자인 산출물 필요 여부**: 본 문서는 원본 디자인 명세(`status-badge-BF-855.md`) 재사용만으로 충분하다고 가정했으나(§11), Phase 18 검증 스위트가 별도 designer 산출물(신규 mockup 등)을 요구하는지는 확인되지 않는다.

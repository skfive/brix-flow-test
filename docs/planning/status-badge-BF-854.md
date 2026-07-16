# 서비스 상태 배지 데모 페이지 기획 명세 — BF-854

> 작성자: [박기획] (planner) · 작성일 2026-07-16
> 관련 티켓: BF-854 (본 planner task)
> 신규 모듈: `src/app/demo/status/` (경로 근거는 §0 가정 1)
> tech-stack: 저장소 실질 스택은 `vanilla-static` — §0 가정 1 참고 (Next.js 아님)
> 단위 테스트: `node --test tests/status-badge-*.test.js` (focused scope · module: `status-badge`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 신규 모듈 경로 `src/app/demo/status/`:** task 설명은 페이지를 "`/demo/status`"로 표기한다. 저장소에 라우터가 있는 것은 아니며(패키지에 Next.js 의존성 0건, `package.json`의 `name: notepad-spa`), 최근 선례인 clock 모듈(BF-839 Epic)에서 기획 단계(`docs/planning/clock-BF-839.md`)는 저장소 루트 `clock/`을 가정했으나, 실제 dev 구현(BF-842, 커밋 `7710ac3`/`d8a7bbc`)은 **`src/app/demo/clock/`** 경로에 vanilla-static HTML/CSS/JS로 배치되었다(`<title>시계 · /demo/clock</title>` 주석 및 실제 디렉터리 확인 완료). 이는 "`/demo/<name>`" 표기를 실제 라우팅이 아니라 **저장소 내 디렉터리 경로**로 직역하는 최신 컨벤션이 확립되었음을 의미한다. 본 문서는 이 최신 선례를 그대로 따라 신규 모듈 경로를 `src/app/demo/status/`로 정의한다.

**가정 2 — "정적"의 의미:** task 설명의 "정적 상태 배지"는 페이지 로드 시 **하드코딩된 JS fixture 배열**에서 1회 렌더링되고, 이후 값이 변하지 않는 스냅샷을 의미한다. `Date.now()`/`Math.random()` 등 비결정론적 값을 사용하지 않으며, 새로고침해도 항상 동일한 상태값이 표시된다(§3, §6). 이는 실제 헬스체크 API 연동 이전 단계의 UI 셸/디자인 검증 목적 데모로 해석한다(§6 제외 범위와 직결).

**가정 3 — 배지 대상 서비스 목록:** task 설명·수용 기준 어디에도 구체적인 서비스명·개수가 지정되어 있지 않다. 본 문서는 데모 목적에 맞는 대표 서비스 4종(웹 서버 / API 게이트웨이 / 데이터베이스 / 인증 서비스)을 §3.1 fixture로 정의한다. 실제 운영 서비스 목록과 다를 수 있으므로 확정이 필요하면 §13-1 참고.

**가정 4 — 배지 색상 토큰 채택 근거:** "기존 디자인 토큰 사용"이 수용 기준에 명시되어 있으나, 상태 배지에 필요한 3분류(정상/저하/장애) 시맨틱 색상은 기존 vanilla-static 모듈 전체를 통틀어 **`kanban/styles.css`에만** 3종 세트(`--color-success` / `--color-warning` / `--color-danger`)로 이미 정의되어 있다(clock/timer/stopwatch/notepad 등 다른 모듈은 `--color-danger`만 있고 success/warning이 없음 — 사전 확인 완료, §12). Simplicity First(신규 색상 발명 금지) 원칙에 따라 본 문서는 **`kanban`의 3종 시맨틱 색상 토큰을 재사용 근거로 채택**한다(§4.3). `kanban`은 다크 우선, `clock`류는 라이트 우선으로 나머지 셸 토큰(배경/텍스트/spacing 등)의 기본값이 서로 다르므로, 셸 토큰은 §4.2에서 `clock`(BF-839, 최신 선례) 세트를 기준으로 하되 success/warning/danger 3종만 `kanban` 값을 그대로 가져와 보충한다.

**가정 5 — 파일 소유권:** 본 planner task(BF-854)의 담당 파일은 `docs/planning/status-badge-BF-854.md` 1개뿐이다. `src/app/demo/status/*` 코드, `docs/design/*` 문서는 후속 designer/dev 담당 영역이며 본 task에서 생성·수정하지 않는다.

실제 Epic에 위 가정과 다른 명시적 지침(서비스 목록, 경로, 색상 토큰 등)이 있다면 대조 확인이 필요하다(§13).

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [상태 배지 데이터 모델 (정적 fixture)](#3-상태-배지-데이터-모델-정적-fixture)
4. [렌더 요구사항](#4-렌더-요구사항)
5. [배지 접근성 이름(Accessible Name) 규칙](#5-배지-접근성-이름accessible-name-규칙)
6. [제외 범위 — 필수 명세 (health API · polling · DB · 신규 패키지)](#6-제외-범위--필수-명세-health-api--polling--db--신규-패키지)
7. [파일 구조 및 기술 제약](#7-파일-구조-및-기술-제약)
8. [Acceptance Criteria 매핑 (Given/When/Then)](#8-acceptance-criteria-매핑-givenwhenthen)
9. [Edge Case 목록](#9-edge-case-목록)
10. [비범위 (Out of Scope)](#10-비범위-out-of-scope)
11. [산출물 위치 및 참조 표](#11-산출물-위치-및-참조-표)
12. [남은 모호함 (운영자 확인 권장)](#12-남은-모호함-운영자-확인-권장)

---

## 1. 개요

### 1.1 목적

`/demo/status` 페이지는 여러 서비스의 상태를 **정적 배지 + 설명 문구**로 보여주는 최소 데모 화면이다. 실제 헬스체크 로직은 구현하지 않으며, 하드코딩된 fixture 데이터를 화면에 렌더링하는 UI 셸/접근성 검증 목적의 페이지다.

### 1.2 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `src/app/demo/status/`(`index.html` / `styles.css` / `status.js` / `main.js`) — clock 선례(§0 가정 1)와 동일 패턴 |
| 기존 코드 영향 | 없음 — 완전 독립 신규 모듈 |
| 데이터 원천 | 페이지 내 하드코딩된 JS fixture 배열뿐 — 서버/외부 API 호출 없음(§6) |
| 외부 라이브러리 | 없음 — `file://` 프로토콜 직접 열기 가능, 신규 npm 패키지 설치 없음(§6.4) |
| 영속 저장 | 없음 — `localStorage`/쿠키 등 어떤 저장소도 사용하지 않음(정적 스냅샷이므로 저장할 상태가 없음) |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전) 또는 Node.js(`node --test`)로 순수 함수(fixture 조회·포맷팅 로직) 단위 테스트
- `src/app/demo/status/` 디렉터리는 아직 존재하지 않으며 본 task 이후 별도 designer/dev task에서 신규 생성됨
- fixture 데이터를 다루는 순수 함수는 UMD 패턴으로 작성되어 Node(CommonJS) + 브라우저(`globalThis`) 양쪽에서 로드 가능해야 함(기존 `clock/clock.js`, `rps/logic.js` 등과 동일 컨벤션)

---

## 2. 용어 정의

| 용어 | 정의 |
|---|---|
| 상태 배지(Status Badge) | 서비스 1건의 현재 상태를 시각적으로 나타내는 소형 UI 요소(색 점/칩 + 텍스트 라벨) |
| 상태값(Status Value) | 배지가 나타낼 수 있는 3분류 중 하나 — `operational`(정상) / `degraded`(저하) / `outage`(장애) |
| 설명 문구(Description) | 각 서비스 배지 옆/아래에 표시되는 정적 보조 텍스트(예: "모든 요청이 정상 처리되고 있습니다") |
| fixture | 코드에 하드코딩된 정적 데이터 배열 — API 응답이 아니라 소스 파일에 리터럴로 존재 |
| 접근성 이름(Accessible Name) | 스크린리더가 해당 요소를 호명할 때 사용하는 문자열 — `aria-label`, 텍스트 콘텐츠, `aria-labelledby` 등으로 결정됨(W3C Accessible Name 계산 규격 기준) |

---

## 3. 상태 배지 데이터 모델 (정적 fixture)

### 3.1 서비스 목록 (fixture, §0 가정 3)

| id | 서비스명 | 상태값 | 설명 문구 |
|---|---|---|---|
| `web` | 웹 서버 | `operational` | 모든 페이지가 정상적으로 응답하고 있습니다. |
| `api` | API 게이트웨이 | `operational` | 모든 요청이 정상 처리되고 있습니다. |
| `database` | 데이터베이스 | `degraded` | 일부 쿼리 응답 지연이 관측되고 있습니다. |
| `auth` | 인증 서비스 | `outage` | 로그인 요청이 일시적으로 실패하고 있습니다. |

> fixture는 3가지 상태값을 모두 최소 1회 이상 포함해야 한다(디자인/접근성 검증 시 3-state 전부를 화면에서 확인할 수 있어야 하므로). 위 표는 그 조건을 만족하는 기본값이며, 실제 서비스명이 확정되면 표만 교체하면 된다(§13-1).

### 3.2 데이터 스키마 (JS 객체 형태, 계약)

```
{
  id: string,           // 고유 식별자, kebab/lower-case, DOM id 접두어로 사용
  name: string,          // 표시용 서비스명(한국어)
  status: "operational" | "degraded" | "outage",
  description: string,   // 정적 설명 문구(한국어, 1문장)
}
```

- `status`는 위 3개 리터럴 값만 허용한다(그 외 값은 정의되지 않은 입력으로 취급, §9.3).
- fixture 배열은 `src/app/demo/status/status.js`(또는 dev가 정하는 동일 역할의 순수 데이터 모듈)에 상수로 선언하고, `main.js`가 이를 읽어 DOM에 매핑 렌더링한다(§7).

### 3.3 전체 요약 배너 (파생값, 신규 fixture 아님)

페이지 상단에는 개별 서비스 배지와 별개로 **전체 요약 문구 1줄**을 둔다. 이는 별도 fixture가 아니라 §3.1 목록에서 **파생 계산**한다:

| 조건 | 요약 상태 | 요약 문구 |
|---|---|---|
| 전체 서비스가 `operational` | `operational` | 모든 서비스가 정상 작동 중입니다. |
| 하나 이상 `degraded`이고 `outage`는 0건 | `degraded` | 일부 서비스에서 지연이 발생하고 있습니다. |
| 하나 이상 `outage` | `outage` | 일부 서비스에 장애가 발생했습니다. |

> 우선순위는 `outage` > `degraded` > `operational` 순으로 가장 심각한 상태가 요약에 반영된다(§9.1 edge case).

---

## 4. 렌더 요구사항

### 4.1 페이지 구조 (위 → 아래)

```
<body>
 ├─ <header class="topbar">     ← "서비스 상태" 타이틀
 └─ <main class="page">
     ├─ <section class="summary-banner">   ← §3.3 전체 요약 배너 1개
     └─ <ul class="status-list">           ← §3.1 서비스별 카드 목록(4개)
         └─ <li class="status-card">       ← 서비스명 + 상태 배지 + 설명 문구
```

- 서비스 카드는 `<ul><li>` 목록 구조로 마크업하여 스크린리더가 "목록, 4개 항목"으로 그룹을 인지할 수 있게 한다.
- 카드 내부 순서: (1) 서비스명, (2) 상태 배지, (3) 설명 문구 — `incident-triage`의 `.it-badge`(코드+한글명 항상 병기, `docs 확인 완료`) 패턴과 동일하게 **배지는 항상 아이콘/색 + 한글 텍스트 라벨을 함께 표시**한다(색만으로 구분 금지, §5.3).

### 4.2 배지 표시 형식

| 상태값 | 배지 텍스트 | 아이콘(장식, `aria-hidden`) |
|---|---|---|
| `operational` | 정상 | ● |
| `degraded` | 저하 | ▲ |
| `outage` | 장애 | ✕ |

- 배지 텍스트는 §4.2 표의 한국어 라벨을 **항상 함께 표시**한다(아이콘/색만 단독 사용 금지).
- 배지는 정적 표시 요소이며 버튼이 아니다(`<span>`/`<div>` 사용, 클릭 인터랙션 없음) — §10 비범위.

### 4.3 색상 매핑 (기존 토큰만 사용, §0 가정 4)

| 상태값 | 배경/점 색 토큰 | 텍스트 색 토큰 | 출처 |
|---|---|---|---|
| `operational` | `--color-success` | `--color-text-primary`(배지 내부는 흰 텍스트 권장, dev 재량) | `kanban/styles.css` 재사용(§0 가정 4) |
| `degraded` | `--color-warning` | 상동 | 상동 |
| `outage` | `--color-danger` | 상동 | `clock`/`kanban` 공통 존재 토큰(`--color-danger`) |

- `--color-success` / `--color-warning`은 `clock`류 모듈에 존재하지 않으므로, dev는 `src/app/demo/status/styles.css`의 `:root`에 `clock/styles.css`의 토큰 전체를 복제한 뒤 이 2개 값만 `kanban/styles.css`(라이트 override 기준 `#1a7f37` / `#9a6700`, 다크 `#3fb950` / `#d29922`)에서 추가로 복제한다. **신규 색상값을 임의로 정의하지 않는다** — 반드시 기존 파일에 존재하는 값을 그대로 복사한다.
- 그 외 배경/텍스트/spacing/타이포/motion 토큰은 `clock/styles.css`(BF-842, 최신 vanilla-static 선례)의 `:root` 세트를 그대로 재사용한다.

### 4.4 반응형

- 데스크톱: 서비스 카드 목록은 세로 스택(1열) 또는 2열 grid(dev 재량, 시각 디자인은 designer 담당).
- 모바일(`≤639px`): 반드시 1열 세로 스택, 카드 내부 요소(서비스명/배지/설명)가 가로로 잘리지 않아야 한다(clock 선례 §4.5 잘림 방지 원칙과 동일 기준).

---

## 5. 배지 접근성 이름(Accessible Name) 규칙

### 5.1 배지 자체의 접근성 이름

각 배지 요소는 아이콘(장식)과 텍스트 라벨로 구성되며, 접근성 이름은 **"{서비스명} 상태: {상태 한글 라벨}"** 형식의 `aria-label`로 명시적으로 부여한다.

| 상태값 | 배지 `aria-label` 예시(서비스명 `웹 서버` 기준) |
|---|---|
| `operational` | `웹 서버 상태: 정상` |
| `degraded` | `웹 서버 상태: 저하` |
| `outage` | `웹 서버 상태: 장애` |

- 배지 내부 아이콘(●/▲/✕)은 `aria-hidden="true"`로 장식 처리한다(§4.2).
- 배지의 가시 텍스트(정상/저하/장애)만으로도 의미가 통하지만, "어떤 서비스의" 상태인지는 카드 문맥에 의존하므로 `aria-label`로 서비스명을 명시적으로 포함시켜 배지 단독으로도 스크린리더가 완전한 문맥을 전달하도록 한다(카드를 벗어나 배지만 순회(rotor navigation)해도 의미 손실이 없어야 함).

### 5.2 서비스 카드의 접근성 이름

카드(`<li>`)는 `aria-label`을 별도로 부여하지 않고, 내부 텍스트(서비스명 → 배지 → 설명 문구 순서)가 자연스러운 접근성 이름/설명을 구성하도록 한다(DOM 순서 = 읽기 순서, 별도 `aria-labelledby` 재배치 불필요 — Simplicity First).

### 5.3 요약 배너의 접근성 이름

- §3.3 요약 배너는 `role="status"`(또는 동등한 정적 landmark) 없이 일반 텍스트로 렌더링한다. **정적 페이지이므로 `aria-live` 영역이 불필요하다**(값이 로드 후 변하지 않음 — clock의 `aria-live="off"`류 판단과 동일 원칙, §6.2).
- 요약 배너에도 아이콘 단독 표시 금지, 반드시 §3.3 표의 한글 문구 전체를 텍스트로 노출한다.

### 5.4 색각 접근성

- 상태 구분에 색만 사용하지 않는다 — 아이콘 모양(●/▲/✕) + 한글 텍스트 라벨을 항상 함께 노출한다(§4.2, §4.1).
- 배지 배경색과 배지 텍스트색의 명암 대비는 WCAG AA(4.5:1) 이상을 만족해야 한다 — 정확한 대비 수치 산정과 최종 색상 조합은 designer 담당(§10).

---

## 6. 제외 범위 — 필수 명세 (health API · polling · DB · 신규 패키지)

본 섹션은 BF-854 두 번째 수용 기준("제외 범위가 명시된다")을 직접 충족하는 필수 항목이다.

### 6.1 실제 health check API 금지

- `fetch()`, `XMLHttpRequest`, `WebSocket`, `EventSource` 등 어떤 형태로도 외부/내부 헬스체크 엔드포인트를 호출하지 않는다.
- `/api/status`, `/health` 등 신규 API 라우트를 만들지 않는다 — 상태값은 §3.1 fixture에 하드코딩된 값 그대로 사용한다.

### 6.2 polling(주기 갱신) 금지

- `setInterval`/`setTimeout` 기반의 상태 재조회·재렌더 로직을 두지 않는다.
- 페이지는 로드 시 1회 렌더링되며, 이후 새로고침 전까지 배지 상태는 절대 변하지 않는다(clock의 매초 tick과 달리 본 페이지는 "살아있는" 갱신이 없는 완전 정적 화면 — clock 선례를 그대로 복제하지 않도록 dev에게 명확히 구분 전달).

### 6.3 DB 연동 금지

- `prisma/schema.prisma` 수정, 신규 migration 생성, DB 조회 코드(Prisma Client 호출 등) 어느 것도 포함하지 않는다.
- 상태 데이터는 §3.2 스키마의 JS 리터럴 배열로만 존재하며 어떤 영속 저장소에도 저장되지 않는다.

### 6.4 신규 패키지 설치 금지

- `package.json`의 `dependencies`/`devDependencies`에 신규 항목을 추가하지 않는다(현재 `http-server`, `pixi.js` 2건 외 변경 없음).
- 외부 CDN 스크립트/스타일(`<script src="https://...">` 등)도 포함하지 않는다(clock §6.1과 동일한 네트워크 미사용 원칙 적용).

### 6.5 검증 방법

| 방법 | 절차 | 통과 조건 |
|---|---|---|
| 정적 코드 검사 | `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|setInterval|setTimeout|https?://" src/app/demo/status/*.js src/app/demo/status/*.html` | 매치 0건(자체 상대경로 리소스 제외) — `tests/status-badge-*.test.js`에 자동화된 assertion으로 포함 |
| `package.json` diff 확인 | PR diff에서 `dependencies`/`devDependencies` 변경 여부 확인 | 변경 0건 |
| `prisma/` diff 확인 | PR diff에서 `prisma/schema.prisma`, `prisma/migrations/` 변경 여부 확인 | 변경 0건 |

---

## 7. 파일 구조 및 기술 제약

| 파일 | 역할(제안 — 최종 파일 분할은 dev 재량) |
|---|---|
| `src/app/demo/status/index.html` | 마크업(요약 배너, 서비스 카드 목록) |
| `src/app/demo/status/styles.css` | 스타일(§4.3 토큰 복제 + 상태 배지 배치) |
| `src/app/demo/status/status.js` | 순수 데이터/계산 함수(fixture 배열, §3.3 요약 상태 파생 함수) — UMD 패턴, `node --test` 대상 |
| `src/app/demo/status/main.js` | DOM 바인딩, fixture → DOM 렌더링(1회, §6.2) |

- `file://` 프로토콜 직접 실행 호환 — `type="module"` 미사용 여부는 clock 선례(`type="module"` 사용)를 따라도 무방, 단 외부 네트워크 요청 없이 로컬 실행 가능해야 함.
- 외부 의존성 0건 — `package.json`에 신규 devDependency 추가 불필요(§6.4).
- 테스트: `node --test tests/status-badge-*.test.js` — fixture 스키마 검증(§3.2)·요약 상태 파생 로직(§3.3)·§6.5 정적 검사를 순수 함수 단위 테스트로 검증.

---

## 8. Acceptance Criteria 매핑 (Given/When/Then)

### 8.1 렌더 요구·배지 접근성 이름·기존 토큰 사용 범위

**AC-1 (배지 렌더 요구)**
> **Given** `/demo/status` 페이지(`src/app/demo/status/index.html`)가 로드된 상태
> **When** 화면이 렌더링되면
> **Then** §3.1 fixture의 서비스 4건이 각각 서비스명·상태 배지(아이콘+한글 라벨)·설명 문구를 갖춘 카드로 표시되고(§4.1), 페이지 상단에는 §3.3 파생 규칙에 따른 전체 요약 배너 1건이 표시된다.

**AC-2 (배지 접근성 이름)**
> **Given** 스크린리더 사용자가 상태 배지에 포커스/탐색하는 상황
> **When** 배지의 접근성 이름을 조회하면
> **Then** §5.1 형식(`"{서비스명} 상태: {정상|저하|장애}"`)의 `aria-label`이 각 배지에서 반환되며, 장식 아이콘은 `aria-hidden="true"`로 접근성 트리에서 제외된다.

**AC-3 (기존 디자인 토큰 사용 범위)**
> **Given** `src/app/demo/status/styles.css`
> **When** 색상·타이포·spacing 값을 검토하면
> **Then** 신규로 정의된 색상값이 0건이며, 배경/텍스트/spacing/타이포 토큰은 `clock/styles.css`의 `:root` 세트를, 상태 3분류 색상(`--color-success`/`--color-warning`/`--color-danger`)은 `kanban/styles.css`의 값을 그대로 복제한 것임이 §4.3 매핑표와 1:1 대조된다.

### 8.2 제외 범위 명시

**AC-4 (제외 범위)**
> **Given** 본 명세 문서
> **When** §6을 검토하면
> **Then** 실제 health check API 호출, polling(주기 갱신), DB 연동(prisma 스키마/migration), 신규 npm 패키지 설치가 모두 "포함하지 않는다"로 명시적으로 배제되어 있으며, §6.5에 각 항목의 검증 방법(grep 정적 검사, diff 확인)이 함께 제공된다.

### 8.3 BF-854 수용 기준 ↔ 본 문서 매핑표

| BF-854 수용 기준 | 충족 근거 |
|---|---|
| Given Epic 목표, When 명세 문서 작성, Then `/demo/status` 렌더 요구·배지 접근성 이름·기존 토큰 사용 범위가 문서로 확정된다 | §8.1 AC-1~AC-3 |
| Given 제외 범위, When 명세 검토, Then health API·polling·DB·신규 패키지 미포함이 명시된다 | §6 전체 + §8.2 AC-4 |

---

## 9. Edge Case 목록

### 9.1 요약 배너의 우선순위 계산

여러 서비스가 서로 다른 상태값을 동시에 가질 때(예: 1건 `degraded` + 1건 `outage`), §3.3 우선순위표(`outage` > `degraded` > `operational`)에 따라 가장 심각한 상태가 요약 문구에 반영된다. 단순 다수결이나 최초 항목 우선이 아님을 명확히 한다.

### 9.2 fixture 배열이 예상과 다른 개수일 때

본 문서는 4건을 기본값으로 제안하나(§3.1), dev/designer가 실제 구현에서 서비스 개수를 조정하더라도 §3.2 스키마·§3.3 파생 규칙·§4~§5 렌더/접근성 규칙은 개수와 무관하게 동일하게 적용된다(개수에 하드코딩된 로직 금지).

### 9.3 정의되지 않은 `status` 값

fixture의 `status` 필드가 §3.2의 3개 리터럴(`operational`/`degraded`/`outage`) 외의 값을 가지면 정의되지 않은 입력이다. 본 문서는 이 경우의 폴백 UI를 규정하지 않으며, dev는 방어적으로 처리(예: 콘솔 경고 + 미분류 배지)하거나 타입 검증을 fixture 작성 시점에 두는 것을 권장한다(강제 사항 아님, §12-2).

### 9.4 설명 문구 길이

설명 문구(§3.1)가 카드 폭을 넘는 긴 문장일 경우 줄바꿈(`word-break`)으로 처리하며, 말줄임(`text-overflow: ellipsis`) 등으로 잘라내지 않는다(정보 손실 방지 — 상태 설명은 전체 노출이 원칙).

---

## 10. 비범위 (Out of Scope)

- 실제 헬스체크 로직·API·DB 연동 — §6에서 이미 명시적으로 배제
- 배지 클릭/토글 등 인터랙션 — 배지는 순수 표시 요소(§4.2)
- 다국어(i18n) 지원 — 한국어 라벨 고정
- 서비스 목록의 동적 추가/삭제 UI — fixture는 소스 코드 수정으로만 변경
- 디자인 시안(정확한 색상 대비 수치, 레이아웃 그리드, 애니메이션 등) — designer 담당 영역, 본 문서는 표시 요구·접근성 이름·토큰 사용 범위만 규정
- 알림/토스트 등 상태 변화 알림 UI — 정적 페이지이므로 "변화" 자체가 없음(§6.2)

---

## 11. 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/planning/status-badge-BF-854.md` (본 문서) |
| 신규 구현 대상(후속 designer/dev task) | `src/app/demo/status/index.html`, `styles.css`, `status.js`, `main.js` — 미정, 본 문서 §3~§7이 계약(contract) |
| 신규 테스트 대상(후속 tester task) | `tests/status-badge-*.test.js` — 미정, 본 문서 §6.5·§8이 검증 기준 |
| 참조한 기존 선례 | `docs/planning/clock-BF-839.md`(신규 `/demo/*` 모듈 문서 패턴), `src/app/demo/clock/`(실제 경로 컨벤션 확정 근거, §0 가정 1), `kanban/styles.css`(success/warning/danger 3분류 색상 토큰 출처, §0 가정 4), `incident-triage/style.css`의 `.it-badge`(아이콘+텍스트 병기 배지 패턴 참고) |

---

## 12. 남은 모호함 (운영자 확인 권장)

1. **서비스 목록·개수의 원본 출처**: §0 가정 3 참고 — 본 세션에 Jira 조회 도구가 연결되어 있지 않아 BF-854 Epic 원문에 별도의 확정된 서비스 목록이 있는지 대조하지 못했다. 본 문서는 데모 목적에 맞는 대표 4개 서비스를 자체 정의했다(§3.1). Epic에 다른 목록이 명시되어 있다면 §3.1 표만 교체하면 나머지 규칙(§3.2~§8)은 그대로 적용 가능하다.
2. **경로 컨벤션(`src/app/demo/status/`) 재확인**: §0 가정 1에서 clock의 실제 구현 경로를 근거로 채택했으나, `/demo/status`가 향후 도입될 별도 라우터(Next.js 전환 등)를 염두에 둔 표기라면 본 경로 결정이 재검토되어야 한다(clock 문서 §12-2와 동일한 미해결 이슈).
3. **정의되지 않은 `status` 값의 폴백 UI**: §9.3 참고 — 강제 규정하지 않았으며, 필요 시 별도 확인 후 본 문서 개정이 선행되어야 한다.
4. **`--color-success`/`--color-warning` 토큰의 최종 채택 여부**: §0 가정 4에서 `kanban/styles.css`의 값을 재사용 근거로 제안했으나, 이는 "기존 토큰 재사용"을 만족하는 가장 근접한 기존 값일 뿐 브랜드 승인을 거친 공식 토큰은 아니다(브랜드 색상 확정은 운영자/디자인 시스템 담당 권한, 본 task 범위 밖).

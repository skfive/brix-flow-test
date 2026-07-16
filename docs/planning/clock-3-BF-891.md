# 세계시계 검증 페이지 기획 명세 — BF-891 (Phase 18 검증 3/5)

> 작성자: [박기획] (planner) · 작성일 2026-07-16
> 관련 티켓: BF-891 (Epic, File Ownership 원문 명시) · BF-892 (본 planner task)
> 검증 대상 라우트: `/phase18-validation/clock-3`
> tech-stack: 저장소 실질 스택은 `vanilla-static` (Next.js 등 라우터 부재)
> 재사용 원본(수정 금지): `src/app/demo/clock/`(BF-842) — `index.html`/`styles.css`/`clock.js`/`storage.js`/`main.js`
> 단위 테스트: `node --test tests/clock-3-*.test.js` (focused scope · module: `clock-3`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 라우트 → 디렉터리 경로 매핑:** task 설명은 검증 대상을 `/phase18-validation/clock-3`로 표기한다. 저장소에는 실제 라우터가 없다(`package.json` `name: notepad-spa`, Next.js 의존성 0건). 직전 선례(`docs/planning/status-card-BF-879.md` §0 가정 1 · Phase 18 검증 1/5, `docs/planning/a11y-counter-BF-886.md` §0 가정 1 · 2/5)가 확립한 컨벤션 — `/phase18-validation/<name>` 표기를 실제 HTTP 라우팅이 아니라 **저장소 내 디렉터리 경로**로 직역 — 을 그대로 적용한다. 본 문서는 신규 경로를 `src/app/phase18-validation/clock-3/`로 정의한다.

**가정 2 — 재사용 대상 = `src/app/demo/clock/`(BF-842), 단 재사용 범위는 "시각 언어 + 포맷팅 원칙"에 한정:** 본 저장소에서 "시계"를 이미 구현·병합한 유일한 모듈은 `src/app/demo/clock/`이다(기획 SSOT `docs/planning/clock-BF-839.md`, 디자인 `docs/design/clock-BF-839.md`, 구현 BF-842·원본 소스 확인 완료). 그러나 원본은 **로컬(브라우저 시스템) 타임존 1개만** 표시하도록 설계되었고, 원본 §10 비범위에 "타임존 변경 UI — 브라우저 실행 환경의 시스템 타임존을 그대로 사용, 별도 선택 UI 없음"이 명시적으로 배제되어 있다. 즉 **다중 타임존 표시(세계시계) 자체는 원본에 존재하지 않는 신규 기능**이며, status-card-1·counter-2처럼 "동일 기능을 새 경로에서 그대로 재현"하는 순수 재검증이 아니다. 본 문서는 재사용 범위를 (a) CSS 디자인 토큰·카드 셸(`topbar`/`page`/`card`)·시각 표시 컴포넌트 구조(`.clock-display`/`.clock-date` 계열 클래스명과 tabular-nums 처리 원칙), (b) "로케일 API에 의존하지 않고 고정 템플릿으로 직접 조립한다"는 포맷팅 철학으로 한정하고, (c) 다중 타임존 계산 로직(§4)은 신규로 정의한다(§7에서 상세 확정).

**가정 3 — `Intl.DateTimeFormat` 채택이 원본 clock 문서의 "로케일 API 회피" 원칙과 모순되지 않는 이유:** 원본 `docs/planning/clock-BF-839.md` §3.1은 `toLocaleDateString()`을 "실행 환경(OS 언어/지역 설정)에 따라 출력이 달라져 결정론적 테스트 불가능"하다는 이유로 명시적으로 회피했다. 이는 **로케일을 인자로 지정하지 않고 호출**했을 때 브라우저/OS 기본값에 의존하게 되는 문제다. 본 task 설명은 데이터 소스를 `Intl.DateTimeFormat 고정 timezone`으로 명시하는데, 이는 **`locale` 인자와 `timeZone` 옵션을 모두 코드에 고정 리터럴로 명시**해 호출하는 것을 의미한다(예: `new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ... })`). 이 경우 실행 환경(OS/브라우저 설정)과 무관하게 항상 동일한 결과가 나오므로 결정론이 보장되며, 원본의 회피 원칙(§3.1)과 충돌하지 않는다(§4.3에서 상세 확정). 로컬 환경(Node.js v22.22.3, `Intl.DateTimeFormat` full-ICU) 및 최신 Chrome/Edge/Firefox에서 `timeZone: "America/New_York"` 등 IANA 타임존 식별자가 정상 동작함을 확인했다(§4.4 검증 근거).

**가정 4 — 인터랙티브 컨트롤(정지/재개, 12/24 형식 전환, `localStorage` 영속화)은 본 검증 페이지 범위 밖:** task 설명·수용 기준 원문 어디에도 정지/재개나 형식 전환을 요구하는 문구가 없다("세 지역 timezone 선정, 갱신 주기, 기존 demo 카드 재사용 범위"만 명시). 원본의 정지/재개·형식 전환은 **단일 시계 1개**를 전제로 설계된 상태 모델이며, 이를 3개의 독립된 지역 시계에 그대로 확장하면 3배의 상태 관리 복잡도(개별 정지/재개, 개별 형식)가 발생해 "검증 페이지"라는 task 목적(§2) 대비 과잉 설계가 된다. Simplicity First 원칙에 따라 본 문서는 **정적·상시 실행(항상 running, 항상 24시간 형식) 3-카드 표시**로 범위를 확정한다(§8, §14 비범위). 인터랙티브 컨트롤이 필요하다는 것이 운영자 의도라면 별도 확인이 필요하다(§16-1).

**가정 5 — 세 지역 timezone 선정 기준:** task 설명이 "세 지역 timezone 선정"을 본 task의 핵심 산출물로 명시하므로, 본 문서가 최초로 3개 지역을 확정한다(§3). 선정 기준: (1) 저장소 UI가 한국어 기반이므로 기준 지역(로컬)으로 서울을 포함, (2) 국제적으로 통용되는 "세계시계" 데모의 대표 도시(뉴욕·런던)를 포함해 낯설지 않은 예시로 구성, (3) 서로 다른 UTC 오프셋·DST(서머타임) 특성을 가진 지역을 섞어 `Intl.DateTimeFormat`의 타임존 자동 계산(수동 UTC 오프셋 계산 불필요, DST 자동 반영)이라는 기술적 이점을 검증 가능하게 한다(§4.1, §13.1).

**가정 6 — 파일 소유권:** 본 task의 담당 파일은 `docs/planning/clock-3-BF-891.md` 1개뿐이다(File Ownership 원문 명시). `src/app/phase18-validation/clock-3/*` 코드, `docs/design/*` 문서는 후속 designer/dev task 담당 영역이며 본 task에서 생성·수정하지 않는다.

**가정 7 — 파일명이 본 task 티켓(BF-892)이 아닌 BF-891인 이유:** BF-892 File Ownership 원문이 산출물 경로를 `docs/planning/clock-3-BF-891.md`로 명시적으로 지정했다. BF-891은 "Phase 18 검증 3/5"의 상위 Epic으로 추정되며(status-card 사례 — Epic BF-879, task BF-880 — 와 동일한 번호 부여 패턴), 본 문서는 그 지시를 재해석하지 않고 그대로 따른다. 본문에서 "본 task"를 지칭할 때는 실제 작업 티켓 BF-892를 사용한다.

실제 Epic(BF-891)에 위 가정과 다른 명시적 지침이 있다면 대조 확인이 필요하다(§16 — 본 세션에는 Jira 조회 도구가 연결되어 있지 않아 Epic 원문을 직접 대조하지 못했다).

---

## 목차

1. [개요](#1-개요)
2. [사용자 가치](#2-사용자-가치)
3. [세 지역 Timezone 선정](#3-세-지역-timezone-선정)
4. [데이터 소스 — Intl.DateTimeFormat 고정 timezone](#4-데이터-소스--intldatetimeformat-고정-timezone)
5. [표시 규칙](#5-표시-규칙)
6. [갱신 주기(Tick) — 단일 시점, 3개 지역 투영](#6-갱신-주기tick--단일-시점-3개-지역-투영)
7. [기존 demo 카드 재사용 범위 확정](#7-기존-demo-카드-재사용-범위-확정)
8. [화면 구성 요구사항](#8-화면-구성-요구사항)
9. [진입 시나리오 및 렌더 조건](#9-진입-시나리오-및-렌더-조건)
10. [제외 범위 — 필수 명세](#10-제외-범위--필수-명세)
11. [파일 구조 및 기술 제약](#11-파일-구조-및-기술-제약)
12. [Acceptance Criteria 매핑 (Given/When/Then)](#12-acceptance-criteria-매핑-givenwhenthen)
13. [Edge Case 목록](#13-edge-case-목록)
14. [비범위 (Out of Scope)](#14-비범위-out-of-scope)
15. [산출물 위치 및 참조 표](#15-산출물-위치-및-참조-표)
16. [남은 모호함 (운영자 확인 권장)](#16-남은-모호함-운영자-확인-권장)

---

## 1. 개요

### 1.1 목적

`/phase18-validation/clock-3`(= `src/app/phase18-validation/clock-3/`)는 Phase 18 검증 스위트의 세 번째 항목으로, 이미 병합된 `/demo/clock`(BF-842)의 **시각 언어(카드 셸·타이포그래피·색상 토큰)가 "다중 타임존 세계시계"라는 새로운 데이터 요구로 확장될 때도 손실 없이 재사용 가능한지**, 그리고 **외부 API 없이 `Intl.DateTimeFormat`만으로 정확한 지역별 시각 계산이 가능한지**를 함께 확인하는 정적 검증 페이지다. status-card-1·counter-2와 달리 "동일 기능의 순수 재현"이 아니라 "기존 시각 언어 위에 신규 데이터 계산 로직(다중 타임존)을 얹었을 때의 일관성"을 검증한다(§0 가정 2).

### 1.2 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `src/app/phase18-validation/clock-3/`(`index.html`/`styles.css`/`regions.js`/`main.js`) — §0 가정 1 |
| 기존 코드 영향 | 없음 — `src/app/demo/clock/`는 수정하지 않는다(§7, §10.5) |
| 데이터 원천 | 클라이언트 `Date` 객체 + `Intl.DateTimeFormat`(고정 `timeZone`/`locale`)뿐 — 서버·외부 API·NTP 동기화 없음(§4) |
| 외부 라이브러리 | 없음 — `Intl` 은 브라우저/Node 표준 내장 객체(신규 의존성 아님) |
| 영속 저장 | 없음 — `localStorage`/쿠키 등 사용하지 않음(§0 가정 4) |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전, 모두 IANA 타임존 데이터베이스 포함) 또는 Node.js(`node --test`, v22.22.3 기준 `Intl.DateTimeFormat` full-ICU 확인 완료)로 순수 함수(지역별 시각 계산·포맷팅) 단위 테스트
- `src/app/phase18-validation/clock-3/` 디렉터리는 아직 존재하지 않으며, 본 task 이후 별도 designer/dev task에서 신규 생성됨
- 원본 `src/app/demo/clock/clock.js`의 `pad2`/`formatDate`/`formatTime`/`to12Hour`는 로컬 타임존 전용이라 그대로 재사용할 수 없다(§0 가정 2, §7.2) — 신규 `regions.js`에서 `Intl.DateTimeFormat` 기반으로 재정의한다

---

## 2. 사용자 가치

1차 사용자는 최종 고객이 아니라 **내부 검증 담당자(QA/운영자)**다. 목표:

1. **시각 언어 확장 가능성의 가시적 증거** — 단일 로컬 시계용으로 설계된 카드 셸·토큰·타이포그래피가 "3개 지역 동시 표시"라는 더 큰 정보 밀도의 화면에서도 신규 색상·신규 컴포넌트 없이 그대로 적용됨을 화면 진입만으로 확인한다.
2. **외부 API 없는 세계시계의 실현 가능성 증명** — 별도 timezone API·서버 호출 없이 브라우저/Node 표준 내장 `Intl.DateTimeFormat`만으로 임의 IANA 타임존의 정확한 현재 시각(DST 자동 반영 포함)을 계산할 수 있음을 실증한다. 이는 향후 유사한 "다중 지역/다국가" 기능이 외부 의존성 없이 구현 가능하다는 선례가 된다.
3. **동일 시점 보장의 신뢰성** — 3개 지역의 시각이 서로 다른 시점을 읽어 표시 오차가 생기지 않고, 항상 "지금 이 순간"의 서로 다른 지역 투영임을 검증한다(§6.2, 원본 §3.3의 "단일 Date 원천" 원칙을 다중 지역으로 일반화).

최종 고객 관점의 신규 가치(실사용 세계시계 제품)는 부차적이다 — 본 task는 검증/증명 목적임을 명확히 한다(§14).

---

## 3. 세 지역 Timezone 선정

### 3.1 선정 결과

| # | 지역(표시 라벨) | IANA Timezone ID | UTC 오프셋(기준) | DST(서머타임) | 선정 근거 |
|---|---|---|---|---|---|
| 1 | 서울 | `Asia/Seoul` | UTC+9 (고정) | 없음 | 저장소 UI 기준 로컬 지역, 오프셋 계산이 없어 "기준점" 역할에 적합 |
| 2 | 뉴욕 | `America/New_York` | UTC-5(EST) / UTC-4(EDT) | 있음(3월 둘째 일요일 ~ 11월 첫째 일요일) | 서울과 가장 큰 시차(13~14시간, DST 여부에 따라 변동) — 세계시계 데모의 대표 도시, DST 자동 반영 검증 대상 |
| 3 | 런던 | `Europe/London` | UTC+0(GMT) / UTC+1(BST) | 있음(3월 마지막 일요일 ~ 10월 마지막 일요일, 미국과 전환일이 다름) | 그리니치 기준시 대표 도시, 뉴욕과는 다른 DST 전환 규칙을 가져 "두 지역 모두 DST여도 오프셋 차이가 계절에 따라 변한다"는 edge case(§13.1)를 실증 |

### 3.2 선정하지 않은 대안과 배제 사유

- **도쿄(`Asia/Tokyo`)**: 서울과 오프셋이 동일(UTC+9, DST 없음)해 "다중 타임존 계산"을 검증하는 데 변별력이 낮음(오프셋 차이가 0).
- **시드니(`Australia/Sydney`)**: DST 방향이 북반구와 반대(남반구 계절)라 흥미로운 edge case이나, 본 task는 "검증 페이지 1건"의 최소 범위이므로 가장 널리 알려진 3개 도시(서울/뉴욕/런던)로 한정한다(Simplicity First). 남반구 DST 사례는 후속 확장 시 고려 대상으로 남긴다(§16-2).

### 3.3 데이터 구조 (계약, `regions.js`에서 정의)

```js
// src/app/phase18-validation/clock-3/regions.js (신규)
export const REGIONS = [
  { id: "seoul", label: "서울", timeZone: "Asia/Seoul" },
  { id: "newyork", label: "뉴욕", timeZone: "America/New_York" },
  { id: "london", label: "런던", timeZone: "Europe/London" },
];
```

- 배열 순서 = 화면 표시 순서(§8.2) = 서울(기준) → 뉴욕 → 런던.
- `id`는 DOM id 접두사(`clock-seoul-*` 등)로, `label`은 카드 제목으로, `timeZone`은 §4의 `Intl.DateTimeFormat` 호출 인자로 각각 사용된다.

---

## 4. 데이터 소스 — `Intl.DateTimeFormat` 고정 timezone

### 4.1 핵심 원칙 — 외부 API 미사용, 표준 내장 API만 사용

본 페이지의 유일한 시각 데이터 원천은 다음 둘뿐이다:

1. `new Date()` — 현재 시점(UTC 기준 절대 시각)을 얻는 유일한 진입점(§6).
2. `Intl.DateTimeFormat(locale, options)` — 위 `Date` 인스턴스를 특정 IANA `timeZone`으로 "투영(project)"하여 그 지역의 로컬 날짜·시각 구성요소(연/월/일/요일/시/분/초)를 얻는 유일한 변환 수단.

`fetch`/`XMLHttpRequest`/`WebSocket`/외부 timezone API(예: worldtimeapi.org)·서버 NTP 동기화는 **일체 사용하지 않는다**(§10.1). 브라우저와 Node.js는 IANA 타임존 데이터베이스(tzdata)를 내장하므로, 별도 네트워크 조회 없이도 임의 지역의 UTC 오프셋과 DST 규칙을 정확히 계산할 수 있다 — 이것이 본 검증의 핵심 증명 대상이다(§2-2).

### 4.2 왜 `Date` getter(`getHours()` 등) 대신 `Intl.DateTimeFormat`이 필수인가

원본 `/demo/clock`(§4.3)은 `date.getHours()`/`getMinutes()`/`getSeconds()` 같은 `Date` 인스턴스 getter를 사용했다. 이 getter들은 **오직 코드가 실행되는 브라우저/OS의 로컬 타임존 1개**만 반영하며, 임의의 다른 지역(예: 뉴욕)을 지정할 방법이 없다. 다중 지역 시각을 얻으려면 반드시 `timeZone` 옵션을 받는 `Intl.DateTimeFormat`(또는 동등한 표준 API)을 사용해야 한다 — 이는 대안이 아니라 세계시계 구현의 기술적 필수 조건이다.

### 4.3 결정론 보장 — `locale`과 `timeZone`을 모두 코드에 고정

```js
const formatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "America/New_York", // §3.3 REGIONS[i].timeZone — 고정 리터럴, 사용자 입력/브라우저 기본값 아님
  hour12: false,
  year: "numeric", month: "2-digit", day: "2-digit",
  weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit",
});
```

- `locale` 인자를 `"ko-KR"`로 **명시 고정**(인자 생략 시 브라우저/OS 기본 로케일에 의존해 §0 가정 3에서 언급한 비결정론이 재발한다 — 반드시 리터럴로 지정).
- `timeZone` 옵션도 §3.3 `REGIONS` 배열의 고정 문자열만 사용(사용자가 임의로 바꿀 수 있는 UI 없음, §14).
- 두 값이 모두 고정되므로 실행 환경(운영체제 언어 설정, 브라우저 종류)과 무관하게 항상 동일한 출력이 보장된다 — 원본 §3.1의 "로케일 API 회피" 원칙(비결정론 방지)과 목적은 동일하되, "로케일 인자를 생략하지 않고 고정한다"는 방법으로 동일 목적을 달성한다(§0 가정 3).

### 4.4 고정 템플릿 조립 — `formatToParts()` 사용 (로케일 기본 포맷 문자열에 의존하지 않음)

`formatter.format(date)`는 로케일의 기본 구두점/순서(예: `ko-KR` 기본은 `2026. 07. 17. (금)` 형태)를 그대로 반환해 원본 clock의 표시 규칙(`YYYY-MM-DD (요일)`, §5)과 다르다. 따라서 `.format()` 문자열을 직접 쓰지 않고, `formatter.formatToParts(date)`로 개별 파트(`year`/`month`/`day`/`weekday`/`hour`/`minute`/`second`)를 추출한 뒤 원본과 동일한 고정 템플릿으로 **직접 조립**한다(§5.1). 로컬 확인 결과(Node v22.22.3), `formatToParts()`는 위 옵션 조합에서 각 파트를 2자리 zero-padded 숫자 문자열로 반환하므로 원본의 `pad2()`에 준하는 재가공 없이 그대로 조립 가능함을 확인했다.

---

## 5. 표시 규칙

### 5.1 날짜·시간 포맷 (원본과 동일 템플릿, §0 가정 2)

원본 `docs/planning/clock-BF-839.md` §3.1~§3.2의 표시 템플릿을 그대로 승계한다 — 지역별로 템플릿 자체는 동일하고, 값만 지역별 `Intl.DateTimeFormat` 투영 결과로 채워진다.

```
날짜: YYYY-MM-DD (요일)   예: 2026-07-17 (금)
시간: HH:MM:SS (24시간 고정, §0 가정 4)   예: 14:19:07
```

| 요소 | 산출 방법 |
|---|---|
| `YYYY`/`MM`/`DD` | 지역별 `formatToParts()` 결과 중 `year`/`month`/`day` 파트 값을 그대로 사용(§4.4) |
| `요일` | 지역별 `formatToParts()`의 `weekday`(옵션 `weekday: "short"`, `locale: "ko-KR"` 고정) — 브라우저가 "월/화/수/목/금/토/일" 형태의 한 글자 한국어 요일을 반환(§4.3 확인 완료). 원본의 자체 `WEEKDAYS_KO` 배열 참조 방식(§0 가정 2)과 달리, 다중 타임존에서는 "그 지역 기준 요일"을 얻어야 하므로 `Date.getDay()`(로컬 타임존 전용)로는 계산 불가 — `Intl` 파트 사용이 필수(§4.2) |
| `HH`/`MM`/`SS` | 지역별 `formatToParts()`의 `hour`/`minute`/`second` 파트(옵션 `hour12: false`로 24시간 고정, §0 가정 4) |

### 5.2 24시간 형식 고정 (12시간 형식 미제공)

§0 가정 4에 따라 본 검증 페이지는 12/24 형식 전환 컨트롤을 제공하지 않고 **24시간 형식(`hour12: false`)으로 고정**한다. 이는 원본 기능 축소가 아니라, "3개 지역 각각의 정지/형식 상태"를 관리하는 복잡도를 검증 목적에 비해 과잉으로 판단한 결과다(§0 가정 4, §14).

### 5.3 지역별 날짜가 서로 달라질 수 있음 (정상 동작, §13.2)

세 지역은 서로 다른 UTC 오프셋을 가지므로, 동일 시점이라도 **날짜(YYYY-MM-DD)가 지역마다 다르게 표시될 수 있다**(예: 서울이 자정을 갓 지났을 때 뉴욕은 전날 오전). 이는 결함이 아니라 세계시계의 정확한 동작이며, 명시적으로 edge case로 문서화한다(§13.2).

---

## 6. 갱신 주기(Tick) — 단일 시점, 3개 지역 투영

### 6.1 갱신 주기

원본 `/demo/clock`(§4.3)과 동일하게 **1초 주기(`setInterval(tick, 1000)`)**로 화면을 갱신한다. 3개 지역 모두 동일한 주기를 공유하며, 지역별로 별도 타이머를 두지 않는다(단일 타이머, §6.2).

### 6.2 단일 `Date` 원천 → 3개 지역 투영 (원본 §3.3 원칙의 일반화)

원본 §3.3은 "한 번의 렌더 사이클에서 날짜와 시간은 동일한 단일 `new Date()` 호출 결과에서 함께 파생되어야 한다"고 규정했다. 본 문서는 이를 다중 지역으로 일반화한다:

> **매 tick 마다 `new Date()`를 정확히 1회만 호출**하고, 그 동일한 `Date` 인스턴스를 3개 지역의 `Intl.DateTimeFormat` 포매터에 각각 전달해 3개의 표시 값을 파생한다. 지역별로 별도의 `new Date()`를 호출하지 않는다.

이 원칙은:
- 세 카드가 항상 **정확히 동일한 시점**의 서로 다른 지역 투영임을 보장한다(§12 AC-3의 핵심 근거).
- 원본의 드리프트 방지 원칙(§4.3, 누적 카운터 대신 매 tick 실측)을 그대로 승계해 장시간 실행해도 오차가 누적되지 않는다.

### 6.3 `Intl.DateTimeFormat` 인스턴스 재사용 (성능, §13.5)

지역별 `Intl.DateTimeFormat` 포매터 인스턴스는 tick마다 새로 생성하지 않고, 페이지 로드 시 `REGIONS` 배열 기준으로 3개를 1회 생성해 재사용한다(`formatter.formatToParts(date)`만 매 tick 호출). `Intl.DateTimeFormat` 생성자는 상대적으로 비용이 있는 연산이므로, 초당 1회 3개 지역 갱신이라는 조건에서도 불필요한 재생성을 피한다(Simplicity First — 이미 생성된 포매터를 재사용하는 것이 가장 단순하고 명백한 최적화).

---

## 7. 기존 demo 카드 재사용 범위 확정

본 섹션은 BF-892의 핵심 수용 기준("기존 demo 카드 재사용 범위를 명시한다")을 직접 충족한다.

### 7.1 재사용 대상 (그대로 가져오는 것)

| 구분 | 원본 출처 | 재사용 방식 |
|---|---|---|
| CSS 디자인 토큰 전체(`--color-*`/`--space-*`/`--radius-*`/`--text-*`/`--motion-*`) | `src/app/demo/clock/styles.css` `:root`/`[data-theme="dark"]` | 값 그대로 복제 또는 상대경로로 원본 `styles.css` 직접 참조(dev 재량) — 신규 색상/토큰 발명 금지 |
| 페이지 셸(`.topbar`/`.page`) | 상동, `index.html` 구조 | 동일 구조 재사용(테마 전환 버튼 포함, §8.1) |
| 카드 컴포넌트 시각 언어(`.card`, 대형 시각 `tabular-nums` 처리, 날짜/시각 계층 구조) | `src/app/demo/clock/styles.css`의 `.clock-date`/`.clock-display`/`.clock-display__time` 등 클래스 규칙 | 클래스명·스타일 규칙 그대로 복제해 **카드 1개당 1지역**으로 3번 반복 사용(§8.2) — 새 지역마다 신규 컴포넌트를 발명하지 않는다 |
| "로케일 기본 포맷에 의존하지 않고 고정 템플릿을 직접 조립한다"는 포맷팅 철학 | `docs/planning/clock-BF-839.md` §3.1 | 원칙만 승계, 구현은 `Date` getter 대신 `Intl.DateTimeFormat.formatToParts()`로 대체(§4.4, §0 가정 2·3) |
| 드리프트 방지 원칙(매 tick 실측, 누적 카운터 금지) | 상동 §4.3 | 그대로 승계, §6.2에서 다중 지역으로 일반화 |

### 7.2 재사용하지 않는 것 (신규 정의, §0 가정 2)

| 구분 | 원본의 상태 | 본 문서의 처리 |
|---|---|---|
| `formatDate`/`formatTime`/`to12Hour`/`pad2`(원본 `clock.js`) | 로컬 브라우저 타임존 전용, `timeZone` 인자 없음 | **재사용 불가** — 임의 지역 계산이 불가능하므로 신규 `regions.js`에서 `Intl.DateTimeFormat` 기반 함수로 재정의(§4, §11) |
| 정지/재개 상태 모델(§4.1~4.2, 원본) | `running`/`stopped` 토글, `Space` 키 | 미제공(§0 가정 4, §14) |
| 12/24 형식 전환 + `localStorage` 영속화(§5, 원본) | `storage.js`의 `createClockStore` | 미제공 — 24시간 형식 고정(§0 가정 4, §5.2, §14) |
| 단일 시계 카드 1개 레이아웃(`max-width: 480px`) | 원본 디자인 §4.1 | 3-카드 그리드로 확장(§8.2, 신규 배치 규칙 — 색상/토큰은 불변) |

### 7.3 재사용 성공 판정 기준

designer/dev가 본 검증 페이지를 구현했을 때, 원본(`/demo/clock`)과 비교해 다음이 모두 참이면 "재사용 성공"으로 판정한다(§12 AC-5):

1. `styles.css`에 신규 색상 리터럴이 0건이다(원본 토큰 값과 diff 시 색상 값 불일치 없음).
2. 카드 1개당 표시 계층(날짜 → 대형 시각)이 원본 `.clock-date`/`.clock-display` 클래스 구조와 동일하다(라벨/지역명 표기만 추가).
3. `src/app/demo/clock/*` 원본 파일이 diff 상 변경 0건이다(§10.5).
4. 지역별 시각 계산 로직(`regions.js`)이 원본 `clock.js`의 로컬 전용 함수를 재사용하지 않고 `Intl.DateTimeFormat` 기반으로 독립 구현되어 있다(§7.2 — "재사용하지 않는 것"의 의도적 분리가 지켜졌는지 확인).

---

## 8. 화면 구성 요구사항

### 8.1 페이지 구조 (`/demo/clock` 셸 재사용 + 3-카드 그리드 신규)

```
<body>
 ├─ <header class="topbar">        ← "세계시계 검증" 타이틀 + 테마 전환 버튼 (원본 재사용, §7.1)
 └─ <main class="page">
     └─ <div class="region-grid">  ← 신규 컨테이너(배치 전용, 색상/폰트 신규 없음)
         ├─ <section class="card" aria-label="서울">   ← 원본 .card 재사용 ×3
         ├─ <section class="card" aria-label="뉴욕">
         └─ <section class="card" aria-label="런던">
```

### 8.2 카드 내부 구조 (원본과 동일 계층, 지역 라벨만 추가)

| # | 영역 | 내용 | 비고 |
|---|---|---|---|
| 0 | 지역 라벨(신규) | `서울` / `뉴욕` / `런던` | 원본에 없던 요소 — 다중 카드 구분을 위한 최소 신규 추가(§0 가정 2 허용 범위) |
| 1 | 날짜 | `2026-07-17 (금)` | 원본 `.clock-date` 재사용(§7.1) |
| 2 | 대형 시각 | `14:19:07` (24시간 고정, §5.2) | 원본 `.clock-display`/`.clock-display__time` 재사용, `프리픽스`(오전/오후) 영역은 12시간 형식 미제공이므로 항상 숨김(`hidden`) |

카드 3개는 `region-grid`(신규 배치 클래스, 예: `display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-6)`)로 가로 배치하며, 모바일(`≤639px`)에서는 세로 1열로 스택한다(원본 반응형 원칙 §4.5 계승, 배치 값만 3-카드에 맞게 조정 — 신규 색상/폰트 없음).

### 8.3 상태 배지·컨트롤 미제공

원본의 `.clock-status`(정지/재개 상태 배지)·`.controls`(정지/재개, 형식 전환 버튼)·`.kbd-hint`는 본 검증 페이지에 포함하지 않는다(§0 가정 4, §7.2) — 항상 실행 중이므로 상태를 표시할 이유가 없다.

---

## 9. 진입 시나리오 및 렌더 조건

### 9.1 진입 시나리오

| 시나리오 | 진입 경로 | 기대 동작 |
|---|---|---|
| S1. 정적 서버 경유 | `pnpm start`(`http-server . -p 8888`) 후 `http://localhost:8888/src/app/phase18-validation/clock-3/` 접속 | 네트워크 요청 없이 즉시 3개 지역 카드 렌더(§9.2) |
| S2. `file://` 직접 열기 | `index.html`을 브라우저로 직접 오픈 | 상대경로 리소스(`styles.css`, JS 모듈)만으로 S1과 동일 렌더(ES 모듈 cross-origin 제약 시 dev가 대안 검토, §16-3) |
| S3. 원본 모듈 변경 후 재검증 | `src/app/demo/clock/styles.css`가 향후 수정된 경우 | 본 페이지가 토큰을 상대경로 참조/동일 복제 구조로 재사용한다면 시각 언어 변경이 반영되어 재검증 필요성이 드러난다(§7.3 회귀 신호) |

### 9.2 렌더 조건 (필수)

1. **로드 즉시 1회 렌더** — 로딩 스피너·스켈레톤·지연 없이 3개 지역 카드(날짜+시각)가 동시에 나타난다.
2. **오프라인 동작** — 네트워크 연결이 없어도 완전히 동일하게 렌더된다(외부 API 호출 0건, §4.1).
3. **새로고침 안정성** — 몇 번을 새로고침해도 항상 동일한 3개 지역·동일한 계산 로직으로 렌더된다(비결정론적 요소 없음, §4.3).
4. **1초 갱신** — 로드 후 3개 카드 모두 매초 갱신되며, 갱신 시점은 항상 동일한 `Date` 인스턴스에서 파생된다(§6.2).
5. **JS 비활성 시 폴백** — `<noscript>` 안내 문구를 표시한다(원본과 동일 패턴 승계).

---

## 10. 제외 범위 — 필수 명세

### 10.1 실제 timezone/시각 API 호출 금지

`fetch()`/`XMLHttpRequest`/`WebSocket`/`EventSource` 등 어떤 형태로도 외부 timezone API(worldtimeapi.org, timeapi.io 등)나 NTP 서버를 호출하지 않는다. `/api/time` 등 신규 API 라우트를 만들지 않는다. 시각 계산은 오직 `Date`+`Intl.DateTimeFormat`(§4)뿐이다.

### 10.2 사용자 지정 타임존 선택 UI 금지

3개 지역은 §3.1에서 고정 확정되며, 사용자가 임의 도시/타임존을 추가·변경할 수 있는 UI를 제공하지 않는다(§14).

### 10.3 polling(추가 재조회) 금지

`setInterval`은 오직 §6.1의 1초 화면 갱신 목적 1개만 존재하며, 이 갱신도 로컬 계산(`Intl.DateTimeFormat`)일 뿐 네트워크 재조회가 아니다.

### 10.4 신규 패키지 설치 금지

`package.json`에 신규 dependency를 추가하지 않는다(`Intl`은 JS 표준 내장 전역 객체로 설치 불필요). 외부 CDN 스크립트/스타일도 포함하지 않는다.

### 10.5 원본 모듈(`src/app/demo/clock/`) 수정 금지

본 검증 task는 원본을 "재사용"하는 것이지 "변경"하는 것이 아니다. `src/app/demo/clock/*` 파일을 수정하면 이미 병합된 BF-842 기능에 회귀를 유발할 수 있으므로 절대 수정하지 않는다(§7).

### 10.6 검증 방법

| 방법 | 절차 | 통과 조건 |
|---|---|---|
| 정적 코드 검사 | `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|https?://" src/app/phase18-validation/clock-3/*` | 매치 0건(자체 상대경로 리소스 제외) |
| `Intl.DateTimeFormat` 사용 확인 | `grep -c "Intl.DateTimeFormat" src/app/phase18-validation/clock-3/regions.js` | 1건 이상(§4) |
| 원본 미변경 확인 | PR diff에서 `src/app/demo/clock/**` 변경 여부 확인 | 변경 0건 |
| `package.json` diff 확인 | PR diff 확인 | 변경 0건 |
| 동일 시점 투영 확인 | 단위 테스트: 고정된 `Date` 인스턴스 1개를 3개 지역 포매터에 전달했을 때 각 지역의 `hour` 파트가 알려진 UTC 오프셋 산술과 일치하는지 assert | §6.2, §12 AC-3 |

---

## 11. 파일 구조 및 기술 제약

| 파일 | 역할(제안 — 최종 파일 분할은 dev 재량) |
|---|---|
| `src/app/phase18-validation/clock-3/index.html` | 마크업(§8, `<title>`/`<h1>`은 "세계시계 검증"류 문구로 검증 맥락 반영) |
| `src/app/phase18-validation/clock-3/styles.css` | `src/app/demo/clock/styles.css` 토큰·카드 컴포넌트 규칙 복제 + `region-grid` 배치 전용 신규 규칙(§7.1, §8.2) |
| `src/app/phase18-validation/clock-3/regions.js` | 순수 로직: `REGIONS`(§3.3), 지역별 `Intl.DateTimeFormat` 생성·`formatToParts()` 기반 조립 함수(§4, §6.3) — UMD/ESM 패턴, `node --test` 대상 |
| `src/app/phase18-validation/clock-3/main.js` | DOM 바인딩, 단일 `setInterval` tick 루프(§6), 3개 카드 렌더 — `regions.js` import, 원본 `clock.js`/`storage.js`는 import하지 않음(§7.2) |

- `file://` 프로토콜 직접 실행 호환 목표(§9.1 S2), 외부 의존성 0건.
- 테스트: `node --test tests/clock-3-*.test.js` — ① 3개 지역 `formatToParts()` 조립 결과가 §5.1 템플릿과 일치하는지, ② 동일 `Date` 인스턴스 기준 3개 지역 시각이 알려진 오프셋과 정합하는지(§6.2), ③ §10.6 정적 검사(네트워크 호출 0건, `Intl.DateTimeFormat` 사용 확인), ④ 원본 `src/app/demo/clock/**` 미변경 확인을 순수 함수/정적 검사로 검증.

---

## 12. Acceptance Criteria 매핑 (Given/When/Then)

### 12.1 BF-892 수용 기준 원문 매핑

**AC-1 (기획 명세 산출물 — 3개 지역·갱신 방식·수용 기준)**
> **Given** Epic(BF-891) 요구
> **When** 기획 명세 작성이 완료되면
> **Then** `docs/planning/clock-3-BF-891.md`(본 문서)에 3개 지역 timezone(§3.1 서울/뉴욕/런던, IANA ID 포함)·갱신 방식(§6, 1초 tick·단일 Date 원천)·수용 기준(§12)이 검증 가능한 Given/When/Then 형태로 기술된다.

**AC-2 (외부 API 미사용 — `Intl.DateTimeFormat` 기반 계산만으로 충족)**
> **Given** 외부 API 미사용 제약
> **When** 데이터 의존성을 정의하면
> **Then** §4에 명시된 대로 `new Date()`(시점 획득)와 `Intl.DateTimeFormat(locale, { timeZone, ... })`(지역 투영) 표준 내장 API만으로 3개 지역의 정확한 현재 시각이 계산되며, §10.1·§10.6에 의해 `fetch`/`XMLHttpRequest`/`WebSocket`/외부 URL 사용이 0건임이 정적 검사로 검증 가능하도록 명시된다.

### 12.2 화면·데이터 관련 파생 AC (§6~§8 근거)

**AC-3 (동일 시점 3개 지역 투영)**
> **Given** 임의의 한 tick 시점
> **When** 3개 지역 카드가 동시에 렌더되면
> **Then** 세 카드는 모두 §6.2에서 정의한 **동일한 단일 `Date` 인스턴스**에서 파생되며, 각 지역의 `hour`/`minute`/`second` 값은 해당 IANA 타임존의 실제 UTC 오프셋(§3.1)과 정확히 일치한다.

**AC-4 (1초 갱신, 드리프트 없음)**
> **Given** 페이지가 로드되어 3개 카드가 표시 중이다
> **When** 시스템 시각이 1초 경과하면
> **Then** 3개 카드 모두 정확히 1초 갱신되며, 매 tick `new Date()`를 새로 호출하는 방식(§6.2)으로 장시간 실행해도 드리프트가 누적되지 않는다(원본 §4.3 원칙 승계).

**AC-5 (기존 demo 카드 재사용 범위)**
> **Given** `src/app/phase18-validation/clock-3/*` 구현물
> **When** 원본 `src/app/demo/clock/*`와 비교하면
> **Then** §7.3 재사용 성공 판정 기준 4항목(신규 색상 0건, 카드 표시 계층 구조 동일, 원본 미변경, 지역 계산 로직 독립 구현)을 모두 만족한다.

**AC-NETWORK (외부 네트워크 미사용 원칙)**
> **Given** `clock-3/` 모듈 소스 전체(HTML/CSS/JS)
> **When** §10.6의 정적 코드 검사를 실행하면
> **Then** `fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource`/외부 URL 호출이 0건이며, `Intl.DateTimeFormat` 사용이 1건 이상 확인된다.

### 12.3 매핑 요약표

| BF-892 수용 기준 | 충족 근거 |
|---|---|
| Given Epic 요구, When 명세 작성 완료, Then 3개 지역 timezone·갱신 방식·수용 기준이 검증 가능한 형태로 기술됨 | §3(3개 지역)·§6(갱신 방식)·§12(수용 기준) 전체 |
| Given 외부 API 미사용 제약, When 데이터 의존성 정의, Then Intl.DateTimeFormat 기반 계산만으로 충족됨이 명시됨 | §4 전체 + §10.1·§10.6 + §12 AC-2·AC-NETWORK |

---

## 13. Edge Case 목록

### 13.1 DST(서머타임) 전환 — 뉴욕·런던 전환일이 서로 다름

뉴욕(`America/New_York`)은 3월 둘째 일요일~11월 첫째 일요일, 런던(`Europe/London`)은 3월 마지막 일요일~10월 마지막 일요일에 DST를 적용한다(§3.1). 두 지역의 전환일이 다르므로, 특정 몇 주 동안은 "서울-뉴욕" 오프셋과 "서울-런던" 오프셋의 차이가 평소(약 5시간)와 달라지는 구간이 존재한다. `Intl.DateTimeFormat`은 이를 수동 계산 없이 IANA tzdata로 자동 반영하므로(§4.1), 별도 DST 보정 로직을 구현하지 않는다 — 이것이 `Intl.DateTimeFormat` 채택의 핵심 이점이다.

### 13.2 지역별 날짜(YYYY-MM-DD)가 서로 다르게 표시됨

§5.3에서 명시한 대로, 동일 시점이라도 UTC 오프셋 차이로 세 카드의 날짜 값이 다를 수 있다(예: 서울 2026-07-17 00:10 = 뉴욕 2026-07-16 11:10). 이는 결함이 아니라 세계시계의 정확한 동작이다.

### 13.3 `Intl.DateTimeFormat`이 미지원 IANA 타임존 문자열을 만나는 경우

`REGIONS`(§3.3)는 고정 리터럴 3개(`Asia/Seoul`/`America/New_York`/`Europe/London`)만 사용하며 모두 IANA tzdata의 표준 식별자로 모든 최신 브라우저·Node.js가 지원한다(§4.4 로컬 확인 완료). 사용자 입력으로 임의 타임존 문자열을 받지 않으므로(§10.2), `RangeError: Invalid time zone` 예외가 발생할 여지가 없다 — 단, 향후 지역이 추가된다면 IANA tzdata 등재 여부를 사전 확인해야 한다(§16-4).

### 13.4 백그라운드 탭에서의 타이머 스로틀링

원본 §9.4를 승계한다 — 비활성 탭에서 `setInterval` 실행이 스로틀링되어도, 매 tick `new Date()` 재측정 원칙(§6.2)에 따라 탭 재활성화 시 즉시 정확한 시각으로 따라잡으며 드리프트는 없다. 3개 지역 모두 동일한 단일 타이머를 공유하므로 지역별로 스로틀링 정도가 달라질 가능성도 없다(§6.1).

### 13.5 `Intl.DateTimeFormat` 인스턴스 생성 비용

§6.3에서 명시한 대로 포매터 인스턴스는 페이지 로드 시 1회만 생성하고 재사용한다. tick마다 재생성하면(3개 지역 × 매초) 불필요한 객체 생성 비용이 누적될 수 있으므로, dev 구현 시 이 원칙을 반드시 지켜야 한다(§11).

### 13.6 윤초(Leap Second)

`Intl.DateTimeFormat`과 `Date` 모두 윤초를 반영하지 않는(POSIX 시간 기준) 표준 동작을 따른다. 본 문서는 이를 자체 보정하지 않으며 브라우저/Node 표준 동작에 위임한다(원본 §9.6의 "달력 계산은 전적으로 표준 API에 위임" 원칙과 동일선상).

---

## 14. 비범위 (Out of Scope)

- 정지/재개 컨트롤 — §0 가정 4, 항상 실행 중인 정적 표시 페이지
- 12/24시간 형식 전환 및 `localStorage` 영속화 — §0 가정 4, §5.2, 24시간 형식 고정
- 사용자 지정 타임존 선택 UI(4번째 지역 추가 등) — §10.2, 3개 지역은 코드 고정
- 실제 외부 timezone/시각 동기화 API 연동 — §10.1에서 명시적으로 배제
- `src/app/demo/clock/*` 원본 코드의 수정·리팩터링 — §10.5
- Phase 18 검증 스위트의 1~2/5, 4~5/5 항목 — 본 문서는 3/5만 다룬다
- 디자인 시안(정확한 mockup, 3-카드 그리드의 색상 대비 재검증 등) — designer 담당 영역, 원본 디자인 명세(`docs/design/clock-BF-839.md`)의 토큰을 그대로 참조하면 충분하다고 판단(§16-5)
- 남반구 DST(계절 반대) 지역 포함 — §3.2에서 검토 후 범위 밖으로 확정

---

## 15. 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/planning/clock-3-BF-891.md`(본 문서, File Ownership 원문 명시) |
| 신규 구현 대상(후속 designer/dev task) | `src/app/phase18-validation/clock-3/index.html`, `styles.css`, `regions.js`, `main.js` — 미정, 본 문서 §3~§11이 계약(contract) |
| 신규 테스트 대상(후속 tester task) | `tests/clock-3-*.test.js` — 미정, 본 문서 §10.6·§12가 검증 기준 |
| 재사용 원본(수정 금지) | `src/app/demo/clock/index.html`, `styles.css`, `clock.js`, `storage.js`, `main.js`(BF-842) |
| 참조한 기존 선례 | `docs/planning/clock-BF-839.md`(원본 시계 기획 SSOT)·`docs/design/clock-BF-839.md`(원본 디자인 토큰)·`docs/planning/status-card-BF-879.md`(Phase 18 검증 1/5 문서 패턴 원본)·`docs/planning/a11y-counter-BF-886.md`(Phase 18 검증 2/5 문서 패턴 원본) |

---

## 16. 남은 모호함 (운영자 확인 권장)

1. **인터랙티브 컨트롤(정지/재개, 12/24 전환) 요구 여부**: §0 가정 4 — task 원문에 명시가 없어 "정적 표시 전용"으로 범위를 좁혔다. 운영자가 원본과 동일한 인터랙티브 컨트롤(지역별 개별 상태)을 원한다면 본 문서 §6·§8·§14 개정이 필요하다.
2. **Phase 18 검증 스위트 4~5/5 항목의 구체 범위**: status-card(1)·counter(2)·clock(3)까지 "각기 다른 기존 모듈의 재사용성/확장성 검증"이라는 패턴이 확인되었으나, 남은 4~5/5의 대상 모듈·라우트는 확인 불가하다.
3. **`file://` cross-origin import 제약**: §9.1 EC — 실제 dev 구현 시 브라우저 정책으로 상대경로 모듈 import가 막히면 대안(정적 서버 전용 검증으로 축소)을 재검토해야 한다.
4. **4번째 이상 지역 확장 가능성**: §3.2에서 남반구 DST 지역(시드니 등)을 검토 후 배제했다. 향후 Phase 18 검증 스위트 밖에서 "진짜 세계시계" 제품 기능으로 확장한다면 별도 기획이 필요하다.
5. **디자인 산출물 필요 여부**: 본 문서는 원본 디자인 명세(`docs/design/clock-BF-839.md`)의 토큰 재사용만으로 충분하다고 가정했으나(§14), 3-카드 그리드 레이아웃에 대한 별도 designer mockup이 필요한지는 확인되지 않는다.
6. **Epic(BF-891) 원문 미대조**: 본 세션에 Jira 조회 도구가 연결되어 있지 않아 BF-891 Epic 원문을 직접 대조하지 못했다. 본 문서는 BF-892 task 설명·수용 기준 원문 및 status-card/a11y-counter 선례만으로 작성했다.

---

*문서 종료 — [박기획] · BF-892*

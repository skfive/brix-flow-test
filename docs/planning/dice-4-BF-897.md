# 주사위 통계 검증 페이지 기획 명세 — BF-897 (Phase 18 검증 4/5)

> 작성자: [박기획] (planner) · 작성일 2026-07-16
> 관련 티켓: BF-897 (Epic, File Ownership 원문 명시) · BF-898 (본 planner task)
> 검증 대상 라우트: `/phase18-validation/dice-4`
> tech-stack: 저장소 실질 스택은 `vanilla-static` (Next.js 등 라우터 부재)
> 재사용 원본(수정 금지): `dice/`(BF-446/448/450) — `index.html`/`styles.css`/`main.js`/`storage.js`
> 단위 테스트: `node --test tests/dice-*.test.js` (focused scope · module: `dice`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 라우트 → 디렉터리 경로 매핑 (선례 오류 정정 포함):** task 설명은 검증 대상을 `/phase18-validation/dice-4`로 표기한다. 저장소에는 실제 라우터가 없다(`package.json` `name: notepad-spa`, Next.js 의존성 0건). 과거 3건의 선례 문서(`status-card-BF-879.md`, `a11y-counter-BF-886.md`, `clock-3-BF-891.md`)는 모두 신규 경로를 `src/app/phase18-validation/<name>/`로 지정했으나, **실제 dev 산출물을 확인한 결과 이 지정은 지켜지지 않았다**:

| 검증 항목 | planner 문서가 지정한 경로 | 실제 구현 경로(git 확인) |
|---|---|---|
| status-card-1 | `src/app/phase18-validation/status-card-1/` | `status-card/`(저장소 최상위, `src/app` 밖) — 커밋 `ed633d5`/`42ad303` |
| counter-2 | `src/app/phase18-validation/counter-2/` | `a11y-counter/`(저장소 최상위) — 커밋 `b900ffb`/`16f0708` |
| clock-3 | `src/app/phase18-validation/clock-3/` | `phase18-validation/clock-3/`(저장소 최상위 `phase18-validation/` 하위) — 커밋 `18f5e9a`/`99f2d82` |

즉 dev는 매번 "저장소 최상위에 독립 디렉터리"라는 이 저장소의 실제 관례(`dice/`·`snake/`·`tetris/`·`timer/`·`kanban/` 등과 동일 패턴)를 따랐고, `src/app/demo/*`(clock/counter/status 원본이 위치한 곳)와는 다른 네임스페이스를 선택했다. 가장 최근 선례(clock-3)는 `phase18-validation/`이라는 최상위 컨테이너 디렉터리를 새로 만들어 그 하위에 항목별 폴더를 두는 방식으로 수렴했다.

본 문서는 이 실측 근거에 따라 신규 경로를 **`phase18-validation/dice-4/`**(저장소 최상위, `phase18-validation/clock-3/`와 형제 디렉터리)로 확정한다. `src/app/phase18-validation/dice-4/`는 지정하지 않는다 — 과거 지정이 3연속으로 지켜지지 않은 지시를 네 번째로 반복하는 것은 Surgical/Simplicity 원칙에 반한다. designer/dev는 본 경로를 우선 채택하되, 운영자가 `src/app` 이관을 원한다면 별도 지시가 필요하다(§13-1).

**가정 2 — 재사용 대상 = `dice/`(BF-448/450), 재사용 범위는 "통계 계산·표시 로직 + 카드 셸/토큰"에 한정:** 본 저장소에서 "주사위 통계"(합계/평균/최대)를 이미 구현·병합한 유일한 모듈은 `dice/`이다(기획 SSOT `docs/spec/dice-roll-BF-848.md`, 디자인 `docs/design/dice-spa-BF-849.md`, 구현 BF-448/450, 원본 소스 확인 완료). 원본은 `.stats-card`/`.stat-row`(`#stat-sum`/`#stat-avg`/`#stat-max`) 구조로 "**단일 굴림 기준**" 통계(누적 아님, `main.js` 주석 "통계 카드 (단일 굴림 기준 — 합계 / 평균 / 최대)" 확인)를 이미 계산·표시하고 있다. 본 task("주사위 통계 E2E 검증")는 이 통계 계산·표시 계약이 새 경로에서도 손실 없이 재현 가능한지, 그리고 **외부 API 없이 순수 클라이언트 연산만으로 통계가 산출되는지**를 검증하는 것으로 범위를 확정한다(§2, §3).

**가정 3 — 재사용 범위 축소(Simplicity First) — 히스토리·전체삭제 모달·영속 저장은 본 검증 페이지 범위 밖:** task 설명·수용 기준 원문 어디에도 히스토리 누적이나 삭제 확인 모달을 요구하는 문구가 없다("렌더 요건·fetch 대상·인증 가드 필요 여부"만 명시). 원본의 히스토리(최근 10건 cap)·삭제 모달·`localStorage` 영속화는 "통계"라는 본 task의 검증 초점과 직접 관련이 없는 부가 기능이며, 이를 그대로 복제하면 검증 페이지 목적(§2) 대비 과잉 설계가 된다. 이는 clock-3(§0 가정4, 정지/재개·형식전환 드롭)·status-card-1(신규 요소 0건 원칙)이 확립한 "검증 페이지는 핵심 검증 대상만 남기고 부가 기능은 드롭한다"는 선례와 동일한 판단이다. 본 문서는 **주사위 개수 선택(1~5) + 굴리기 버튼 + 주사위 표시 + 통계 카드(합계/평균/최대)만** 재현하고, 히스토리 리스트·전체삭제 모달·`localStorage` 영속화는 비범위로 확정한다(§4, §7.3, §11). 통계 자체도 세션 in-memory 상태로만 존재하며 새로고침 시 초기화된다(§3.4, §6.2 EC).

**가정 4 — 데이터 의존성(빈 슬롯) = 없음(외부 fetch/서버/DB 미사용):** Epic이 채워야 할 빈 슬롯으로 지목한 "데이터 의존성"은 `docs/spec/dice-roll-BF-848.md` §8(범위 밖 — 저장/API/외부이미지/애니메이션 라이브러리 4항목 전부 배제, 특히 "굴림 결과는 클라이언트 `Math.random()`으로만 산출한다. `fetch`/`XMLHttpRequest`/`WebSocket` 등 원격 호출을 추가하지 않는다")로 이미 원본 수준에서 확정되어 있다. 통계(`sum`/`avg`/`max`)는 이 클라이언트 굴림 값에 대한 순수 산술 파생이므로, 데이터 의존성은 "없음"이 유일하게 정합한 답이다(§3). 저장소 전체를 조사한 결과 `dice/` 관련 서버 API·DB 스키마는 존재하지 않는다(`src/routes/api/`에는 `tetris/`만 존재하며 `prisma/schema.prisma`도 tetris 리더보드 전용 — dice와 무관, §3.2 근거).

**가정 5 — 인증 가드(빈 슬롯) = 불필요:** 본 저장소는 정적 파일 서버(`http-server . -p 8888`)로 서빙되는 `vanilla-static` 사이트이며, 어떤 페이지에도 로그인/세션/인증 미들웨어가 존재하지 않는다(전체 검색 결과 "auth"라는 문자열은 상태 카드 fixture의 서비스 이름(`status-card/status.js`의 `id: "auth"`, "인증 서비스"라는 fixture 데이터)으로만 등장하며 실제 인증 로직은 0건). Phase 18 검증 스위트의 1~3/5(status-card-1/counter-2/clock-3) 역시 인증 가드를 요구한 바 없다. 본 검증 페이지도 공개(비로그인) 정적 페이지이며 인증 가드가 불필요하다(§3.5).

**가정 6 — "수용 기준 4항목"의 해석 (Jira 원문 미접속 — 재해석 플래그):** 본 세션에는 Jira 조회 도구가 연결되어 있지 않아 Epic(BF-897) 원문을 직접 대조하지 못했다. task 설명 원문이 명시한 개념은 "렌더 요건·fetch 대상·인증 가드 필요 여부"(3개 명사구)이며, 수용 기준 2항목 중 두 번째가 언급하는 "수용 기준 4항목"이 정확히 어떤 4개를 가리키는지는 본 문서 작성 시점에 확정할 수 없다. 본 문서는 task 설명에서 명시적으로 추출 가능한 4개 축 — **① 사용자 가치, ② 데이터 의존성, ③ 렌더 요건·fetch 대상·인증 가드, ④ 기존 통계 카드 재사용 범위** — 를 4항목으로 간주하고 각각을 검증 가능한 Given/When/Then으로 재기술한다(§9). Epic 원문에 다른 4개 항목이 명시되어 있다면 대조·수정이 필요하다(§13-2).

**가정 7 — 파일 소유권:** 본 task의 담당 파일은 `docs/planning/dice-4-BF-897.md` 1개뿐이다(File Ownership 원문 명시). `phase18-validation/dice-4/*` 코드, `docs/design/*` 문서는 후속 designer/dev task 담당 영역이며 본 task에서 생성·수정하지 않는다.

**가정 8 — 파일명이 본 task 티켓(BF-898)이 아닌 BF-897인 이유:** BF-898 File Ownership 원문이 산출물 경로를 `docs/planning/dice-4-BF-897.md`로 명시적으로 지정했다. BF-897은 "Phase 18 검증 4/5"의 상위 Epic이며(status-card/counter/clock 사례와 동일한 "Epic 번호 + 1 = planner task 번호" 패턴 — BF-879→880, BF-885→886, BF-891→892, 본 task도 BF-897→898로 동일 패턴 확인), 본 문서는 그 지시를 재해석하지 않고 그대로 따른다. 본문에서 "본 task"를 지칭할 때는 실제 작업 티켓 BF-898을 사용한다.

실제 Epic(BF-897)에 위 가정과 다른 명시적 지침이 있다면 대조 확인이 필요하다(§13 — 본 세션에는 Jira 조회 도구가 연결되어 있지 않아 Epic 원문을 직접 대조하지 못했다).

---

## 목차

1. [개요](#1-개요)
2. [사용자 가치](#2-사용자-가치)
3. [데이터 모델 및 의존성](#3-데이터-모델-및-의존성)
4. [화면 구성 요구사항](#4-화면-구성-요구사항)
5. [기존 통계 카드 재사용 범위 확정](#5-기존-통계-카드-재사용-범위-확정)
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

`/phase18-validation/dice-4`(= `phase18-validation/dice-4/`)는 Phase 18 검증 스위트의 네 번째 항목으로, 이미 병합된 `dice/`(BF-448/450)의 **통계 계산·표시 계약(합계/평균/최대, 단일 굴림 기준)이 새 경로/컨텍스트에서도 손실 없이 재사용 가능한지**, 그리고 **그 통계가 외부 API·서버·인증 없이 순수 클라이언트 연산만으로 산출됨**을 함께 확인하는 정적 검증 페이지다. status-card-1(시각 언어 재사용)·counter-2(접근성 계약 재사용)·clock-3(시각 언어 확장 + 신규 계산 로직)에 이어, dice-4는 "**통계라는 파생 데이터가 어떤 외부 의존성도 없이 순수 함수로 재현 가능한가**"를 검증하는 항목이다.

### 1.2 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `phase18-validation/dice-4/`(`index.html`/`styles.css`/`stats.js`/`main.js`) — §0 가정 1 |
| 기존 코드 영향 | 없음 — `dice/`는 수정하지 않는다(§5, §7.5) |
| 데이터 원천 | 클라이언트 `Math.random()`(굴림) + 순수 산술(합계/평균/최대)뿐 — 서버·외부 API·DB 없음(§3) |
| 외부 라이브러리 | 없음 — 신규 npm 패키지 설치 없음 |
| 영속 저장 | 없음 — 세션 in-memory 상태만(§0 가정 3, §3.4) — `localStorage` 히스토리·개수 저장은 비범위 |
| 인증 | 불필요 — 공개 정적 페이지(§0 가정 5, §3.5) |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전) 또는 Node.js(`node --test`)로 순수 함수(통계 계산 로직) 단위 테스트
- `phase18-validation/dice-4/` 디렉터리는 아직 존재하지 않으며, 본 task 이후 별도 designer/dev task에서 신규 생성됨
- 원본 `dice/main.js`의 `rollOne`/`computeStats`는 IIFE 클로저 내부 함수라 외부에서 `import`/`require` 불가능하다(원본이 `export`하지 않음, `dice/storage.js`만 `globalThis.DiceStorage`로 노출) — 신규 `stats.js`에서 동일 산식으로 재정의해야 한다(§5.2, §8)

---

## 2. 사용자 가치 (Epic 빈 슬롯 ①)

1차 사용자는 최종 고객이 아니라 **내부 검증 담당자(QA/운영자)**다. 목표:

1. **통계 계산·표시 재사용 가능성의 가시적 증거** — `dice/`가 이미 확정한 "단일 굴림 기준 합계/평균/최대" 계약(값 산식·`toFixed(1)` 표시 규칙·굴림 전 `"--"` placeholder)이 새 경로에서도 신규 코드 발명 없이 동일하게 재현됨을, 별도 코드 리딩 없이 화면 진입 + 굴리기 1회만으로 확인한다.
2. **외부 의존성 없는 통계 신뢰성 증명** — 통계 값이 서버 집계·API 응답·인증된 세션 데이터가 아니라, 전적으로 브라우저에서 그 순간 생성된 굴림 값의 산술 파생임을 실증한다. 이는 "통계처럼 보이는 화면 요소가 항상 서버/DB를 필요로 하지 않는다"는 선례가 되어, 향후 유사한 소규모 통계 위젯을 외부 의존성 없이 구현할 수 있음을 보여준다(§3).
3. **회귀 조기 발견** — 향후 `dice/`의 통계 산식(`computeStats`)이나 표시 토큰이 변경될 때, 본 검증 페이지가 별도로 깨진다면 "재사용 계약이 깨졌다"는 신호가 된다(§5.3 재사용 성공 판정 기준, §10 edge case).
4. **네트워크 독립성 증명** — 오프라인 상태에서도 통계 카드가 완전히 동일하게 계산·표시됨을 확인해, "통계 = 외부 API 호출"이라는 일반적 오해를 반증한다(§6.2 렌더 조건 2).

최종 고객 관점의 신규 가치(실사용 주사위 게임 통계 확장 기능)는 부차적이다 — 본 task는 검증/증명 목적임을 명확히 한다(§11).

---

## 3. 데이터 모델 및 의존성 (Epic 빈 슬롯 ②)

### 3.1 통계 산출 공식 (재사용, `dice/main.js` `computeStats` 승계)

```js
// phase18-validation/dice-4/stats.js (신규 — dice/main.js 의 동일 산식을 독립 재구현, §0 가정3 전제)
function computeStats(rolls) {
  var sum = 0;
  var max = rolls[0];
  for (var i = 0; i < rolls.length; i += 1) {
    sum += rolls[i];
    if (rolls[i] > max) max = rolls[i];
  }
  var avg = sum / rolls.length; // 표시 시 .toFixed(1) — §4.3, 원본과 동일 규칙
  return { sum: sum, avg: avg, max: max };
}
```

- `rolls`: 현재 굴림 1회의 결과 배열(길이 1~5, 각 원소 1~6 정수) — §4.1 개수 선택과 §4.2 굴리기로 산출.
- `sum`: 정수 합.
- `avg`: 부동소수 평균, 표시 시 `.toFixed(1)`(소수 첫째 자리, 원본 §4.5 규칙 승계).
- `max`: 정수 최댓값.
- 굴림 개수가 항상 1 이상(§4.1 최소 1개)이므로 `rolls.length`가 0이 되는 나눗셈-0 시나리오는 존재하지 않는다(§10 EC 참고).

### 3.2 데이터 원천 — 외부 API/서버/DB 없음

본 페이지의 유일한 데이터 원천은 다음 둘뿐이다:

1. `Math.random()` 기반 `rollOne()`(`1 + Math.floor(Math.random() * 6)`, 원본 산식 그대로 재사용, §5.1) — 각 주사위 1회 굴림의 원시 값.
2. §3.1 `computeStats()` — 위 원시 값 배열에 대한 순수 산술 파생.

`fetch`/`XMLHttpRequest`/`WebSocket`/외부 통계 API·서버 집계·DB 조회는 **일체 사용하지 않는다**(§0 가정 4, §7.2). 저장소 전체에 `dice`와 연동된 서버 API·DB 스키마가 없음을 확인했다(`src/routes/api/tetris/*`만 존재 — tetris 리더보드 전용, `prisma/schema.prisma`도 tetris 전용 테이블뿐).

### 3.3 fetch 대상 — 없음 (0건, 정적 검사로 검증 가능)

| 확인 항목 | 값 |
|---|---|
| `fetch()` 호출 | 0건 |
| `XMLHttpRequest`/`WebSocket`/`EventSource` | 0건 |
| 외부 URL 리터럴(`https?://`) | 0건(자체 상대경로 리소스 제외) |
| 서버 API 라우트 신규 생성 | 없음 (`/api/dice*` 등 신규 라우트 없음) |

검증 방법: `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|https?://" phase18-validation/dice-4/*` 결과 매치 0건(§7.6, §9 AC-NETWORK).

### 3.4 영속 저장 — 없음 (세션 in-memory, §0 가정 3)

원본 `dice/`는 `localStorage`(`dice:history`/`dice:count`)로 개수·히스토리를 영속화하지만, 본 검증 페이지는 §0 가정 3에 따라 히스토리 기능 자체를 재현하지 않으므로 그에 연동된 영속 저장도 필요 없다. 통계는 현재 세션의 마지막 굴림 결과에서만 파생되는 **일시적(ephemeral) 파생 값**이며, 새로고침 시 초기화되어 다시 `"--"` placeholder 상태로 돌아간다(§6.2, §10 EC-04). 공유 `bf-theme` 키(테마 설정)만 예외적으로 다른 모듈과 동일하게 유지한다(§4.4 — 통계 데이터와 무관한 UI 설정이므로 "데이터 의존성" 논의 대상이 아님).

### 3.5 인증 가드 필요 여부 — 불필요 (Epic 빈 슬롯의 핵심 확정 항목)

| 근거 | 내용 |
|---|---|
| 페이지 성격 | 공개 정적 검증 페이지 — 로그인/세션 개념이 저장소 전체에 존재하지 않음(§0 가정 5) |
| 데이터 민감도 | 통계는 그 자리에서 생성된 무작위 굴림 값의 산술 파생일 뿐, 사용자 식별 정보·개인정보를 포함하지 않음 |
| 서버 연동 | 없음(§3.2) — 인증이 보호할 대상(사용자별 서버 자원)이 애초에 존재하지 않음 |
| 선례 | Phase 18 검증 1~3/5(status-card-1/counter-2/clock-3) 모두 인증 가드 없이 공개 정적 페이지로 구현됨 |

결론: `phase18-validation/dice-4/`는 인증 가드·로그인 리다이렉트·세션 체크 로직을 **포함하지 않는다**(§7.3).

---

## 4. 화면 구성 요구사항

### 4.1 페이지 구조 (`dice/` 셸 재사용 + 통계 초점 축소)

```
<body>
 ├─ <header class="topbar">        ← "주사위 통계 검증" 타이틀 + 테마 전환 버튼 (원본 재사용, §5.1)
 └─ <main class="page">
     ├─ <section class="card dice-card" aria-label="주사위">
     │   ├─ <fieldset class="dice-count">   ← 원본 1~5 개수 선택 재사용 (§5.1)
     │   ├─ <div class="dice-box" id="dice-box">   ← 원본 주사위 표시 재사용
     │   └─ <button class="roll-button" id="btn-roll">🎲 굴리기</button>
     └─ <section class="card stats-card" aria-labelledby="stats-title">   ← 검증 핵심 대상
         ├─ 합계 (#stat-sum)
         ├─ 평균 (#stat-avg)
         └─ 최대 (#stat-max)
```

히스토리 카드·전체삭제 모달은 포함하지 않는다(§0 가정 3).

### 4.2 통계 카드 표시 규칙 (원본과 동일, §5.1)

| 상태 | 합계(`#stat-sum`) | 평균(`#stat-avg`) | 최대(`#stat-max`) |
|---|---|---|---|
| 굴림 전(초기 렌더) | `--` | `--` | `--` |
| 굴림 후 | 정수 합 | `.toFixed(1)` 소수 1자리 | 정수 최댓값 |

### 4.3 개수 선택 및 굴리기 (통계 산출을 위한 최소 지원, 원본 재사용)

- 개수 선택 1~5(`role="radiogroup"`, 원본 마크업 재사용, §5.1) — 개수 변경 시 현재 통계는 초기화(원본과 동일, 개수-굴림 mismatch 방지).
- 굴리기 버튼(`#btn-roll`, `aria-label="주사위 굴리기"`) — 클릭 시 새 굴림 실행 → §3.1 통계 재계산 → 카드 갱신.
- 굴림 중 연타 방지·`prefers-reduced-motion` 동등성은 원본 동작을 승계한다(§5.1, `docs/spec/dice-roll-BF-848.md` §4 재확인 대상 — 신규 정의 아님).

### 4.4 테마 토글 (공용 셸 재사용, 데이터 의존성과 무관)

원본과 동일하게 `bf-theme` 공유 키 기반 라이트/다크 토글을 포함한다(§3.4 예외). 원본 `dice/`의 다크 default(`data-theme="dark"`, 저장값 없을 시)를 그대로 승계한다 — clock-3(라이트 default)와 달리, 재사용 원본 자체의 default를 유지하는 것이 "재사용 범위" 원칙(§5)에 부합한다.

---

## 5. 기존 통계 카드 재사용 범위 확정

본 섹션은 BF-898의 핵심 수용 기준("기존 통계 카드 재사용 범위를 명시한다"에 준하는 요구, §0 가정 6 ④)을 직접 충족한다.

### 5.1 재사용 대상 (그대로 가져오는 것)

| 구분 | 원본 출처 | 재사용 방식 |
|---|---|---|
| CSS 디자인 토큰 전체(`--color-*`/`--space-*`/`--radius-*`/`--text-*`/`--motion-*`) | `dice/styles.css` `:root` | 값 그대로 복제 또는 상대경로로 원본 `styles.css` 직접 참조(dev 재량) — 신규 색상/토큰 발명 금지 |
| 페이지 셸(`.topbar`/`.page`/`.card`) | 상동, `index.html` 구조 | 동일 구조 재사용(테마 전환 버튼 포함, §4.4) |
| 주사위 개수 선택 마크업(`.dice-count`, `role="radiogroup"`, `aria-checked`) | `dice/index.html` | 그대로 복제, 1~5 범위·default 2개 승계 |
| 주사위 표시(`.dice-box`, `role="img"` + `aria-label="주사위 {값}"`) | 상동 | 그대로 복제 |
| 통계 카드 마크업(`.stats-card`/`.stat-row`/`.stat-row--sum`, `#stat-sum`/`#stat-avg`/`#stat-max`) | 상동 | 그대로 복제 — 신규 통계 항목(예: 중앙값·표준편차) 추가 금지 |
| 통계 산식(합계/평균/최대, `.toFixed(1)`) | `dice/main.js` `computeStats` | 동일 산식으로 `stats.js`에서 재구현(§5.2) |
| 굴림 산식(`rollOne`, `1 + Math.floor(Math.random() * 6)`) | 상동 | 동일 산식 재구현(§5.2) |
| 굴림 전 `"--"` placeholder 표시 규칙 | 상동 `renderStats()` | 그대로 승계 |
| `prefers-reduced-motion` 동등성 원칙 | 상동 | 그대로 승계(§4.3) |

### 5.2 재사용 방식의 제약 — 로직은 "복제 재구현", 직접 import 불가

원본 `dice/main.js`는 IIFE(비-module) 패턴으로 `rollOne`/`computeStats`를 클로저 내부에 캡슐화하며 어떤 것도 외부로 `export`하지 않는다(`dice/storage.js`만 `globalThis.DiceStorage`로 공개). 따라서 dice-4는 이 함수들을 `import`/`require`로 직접 재사용할 수 없고, 신규 `stats.js`에서 **동일한 산식·상수(1~6 범위, `toFixed(1)`)로 다시 작성**해야 한다(§3.1). 이는 clock-3이 `Intl.DateTimeFormat` 기반 로직을 신규 `regions.js`로 독립 재구현해야 했던 것(clock-3 §0 가정2/§7.2)과 동일한 유형의 제약이다 — "시각적/산식적 계약은 재사용하되, 코드 자체는 복제 재작성"이라는 이 저장소의 공통 패턴이다.

### 5.3 재사용하지 않는 것 (의도적 축소, §0 가정 3)

| 구분 | 원본의 상태 | 본 문서의 처리 |
|---|---|---|
| 히스토리 리스트(최근 10건 cap) | `dice/main.js`의 `renderHistory`/`history-list` | 미제공 |
| 히스토리 row 클릭 재표시 | 상동 | 미제공 |
| 전체 삭제 확인 모달 | `dice/index.html`의 `#modal-backdrop` | 미제공 |
| `localStorage dice:history`/`dice:count` 영속화 | `dice/storage.js` | 미제공(§3.4) — 개수 선택은 세션 in-memory 상태로만 유지 |
| 키보드 단축키 1~5(개수)/T(테마) | `dice/main.js` keydown 핸들러 | 선택 사항(dev 재량) — 통계 검증의 필수 요건은 아니므로 포함 여부는 dev가 결정해도 무방(§13-3) |

### 5.4 재사용 성공 판정 기준

designer/dev가 본 검증 페이지를 구현했을 때, 원본(`dice/`)과 비교해 다음이 모두 참이면 "재사용 성공"으로 판정한다(§9 AC-4):

1. `styles.css`에 신규 색상 리터럴이 0건이다(원본 토큰 값과 diff 시 색상 값 불일치 없음).
2. 통계 카드 표시 계층(`.stats-card` → `.stat-row` 3종)이 원본과 동일한 DOM 구조·id·`aria-label`을 갖는다.
3. `dice/*` 원본 파일이 diff 상 변경 0건이다(§7.5).
4. 통계 산식(`computeStats`)과 굴림 산식(`rollOne`)이 원본과 동일한 산출값(같은 입력에 같은 출력)을 내되, 코드는 `stats.js`에 독립 재구현되어 있다(§5.2).

---

## 6. 진입 시나리오 및 렌더 조건

### 6.1 진입 시나리오

| 시나리오 | 진입 경로 | 기대 동작 |
|---|---|---|
| S1. 정적 서버 경유 | `pnpm start`(`http-server . -p 8888`) 후 `http://localhost:8888/phase18-validation/dice-4/` 접속 | 네트워크 요청 없이 즉시 렌더(§6.2) |
| S2. `file://` 직접 열기 | `index.html`을 브라우저로 직접 오픈 | 상대경로 리소스만으로 S1과 동일 렌더(비-module 스크립트 사용 시 CORS 제약 없음, 원본 `dice/`와 동일 안전 패턴 승계) |
| S3. 원본 모듈 변경 후 재검증 | `dice/styles.css`나 `computeStats` 산식이 향후 수정된 경우 | 본 페이지가 토큰을 동일 값으로 복제했다면 시각적 diff가, 산식이 달라졌다면 통계 값 diff가 드러나 재검증 필요성이 신호로 나타난다(§5.4 회귀 신호) |

### 6.2 렌더 조건 (필수)

1. **로드 즉시 1회 렌더** — 주사위 개수 선택(default 2)·주사위 placeholder·통계 카드(`"--"` 3종)가 지연 없이 동시에 나타난다(§4.2).
2. **오프라인 동작** — 네트워크 연결이 없어도 완전히 동일하게 렌더되고 굴리기가 동작한다(외부 API 호출 0건, §3.3).
3. **굴리기 즉시 갱신** — 굴리기 버튼 클릭 → 주사위 표시 갱신과 **동일한 커밋 시점**에 통계 3종이 함께 갱신된다(원본 `commitRoll` 원칙 승계 — 주사위 값과 통계 값이 서로 다른 시점에서 파생되어 불일치하는 경우가 없다).
4. **새로고침 시 초기화** — 통계는 영속화되지 않으므로(§3.4) 새로고침하면 항상 굴림 전 초기 상태(`"--"`, default 개수 2)로 되돌아간다. 이는 결함이 아니라 §0 가정 3의 의도된 축소다.
5. **JS 비활성 시 폴백** — `<noscript>` 안내 문구를 표시한다(원본과 동일 패턴 승계).

---

## 7. 제외 범위 — 필수 명세

### 7.1 실제 통계/데이터 API 호출 금지

`fetch()`/`XMLHttpRequest`/`WebSocket`/`EventSource` 등 어떤 형태로도 외부 통계 API·분석 서비스·서버 집계 엔드포인트를 호출하지 않는다. `/api/dice*` 등 신규 API 라우트를 만들지 않는다(§3.2, §3.3).

### 7.2 인증/세션 로직 금지

로그인 폼·세션 토큰 체크·인증 리다이렉트를 도입하지 않는다(§3.5). 페이지는 항상 공개 접근 가능해야 한다.

### 7.3 히스토리/영속 저장 신규 도입 금지

§0 가정 3·§5.3에서 확정한 대로, 히스토리 리스트·전체삭제 모달·`localStorage dice:history`/`dice:count` 저장을 신규로 도입하지 않는다. `bf-theme` 공유 키(§4.4)만 예외로 허용한다.

### 7.4 신규 패키지 설치 금지

`package.json`에 신규 dependency를 추가하지 않는다. 외부 CDN 스크립트/스타일도 포함하지 않는다.

### 7.5 원본 모듈(`dice/`) 수정 금지

본 검증 task는 원본을 "재사용"하는 것이지 "변경"하는 것이 아니다. `dice/*` 파일을 수정하면 이미 병합된 BF-448/450 기능에 회귀를 유발할 수 있으므로 절대 수정하지 않는다(§5).

### 7.6 검증 방법

| 방법 | 절차 | 통과 조건 |
|---|---|---|
| 정적 코드 검사(fetch) | `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|https?://" phase18-validation/dice-4/*` | 매치 0건(자체 상대경로 리소스 제외) |
| 정적 코드 검사(인증) | `grep -rniE "login|session|auth|redirect.*sign" phase18-validation/dice-4/*` | 매치 0건(인증 관련 코드 없음) |
| 통계 산식 재현 확인 | 단위 테스트: 고정 `rolls` 배열(예: `[3,5,2]`)을 `computeStats`에 전달했을 때 `sum=10, avg=3.3(toFixed(1)), max=5` 산출 확인 | §9 AC-3, §3.1 |
| 원본 미변경 확인 | PR diff에서 `dice/**` 변경 여부 확인 | 변경 0건 |
| `package.json` diff 확인 | PR diff 확인 | 변경 0건(루트 및 `dice/package.json` 모두) |

---

## 8. 파일 구조 및 기술 제약

| 파일 | 역할(제안 — 최종 파일 분할은 dev 재량) |
|---|---|
| `phase18-validation/dice-4/index.html` | 마크업(§4, `<title>`은 "주사위 통계 검증"류 문구로 검증 맥락 반영) |
| `phase18-validation/dice-4/styles.css` | `dice/styles.css` 토큰·카드 컴포넌트 규칙 복제(§5.1) — 신규 배치 규칙은 최소화(단일 컬럼 카드 2개면 충분) |
| `phase18-validation/dice-4/stats.js` | 순수 로직: `rollOne`(§5.1)·`computeStats`(§3.1) — UMD/IIFE 패턴, `node --test` 대상, `dice/storage.js`의 `module.exports` 패턴 참고 |
| `phase18-validation/dice-4/main.js` | DOM 바인딩, 개수 선택·굴리기 이벤트·통계 렌더(§4) — `stats.js` 사용, 원본 `dice/main.js`/`storage.js`는 import하지 않음(§5.2) |

- `file://` 프로토콜 직접 실행 호환 목표(§6.1 S2), 외부 의존성 0건.
- 비-module(IIFE/UMD) 패턴 유지 — 원본 `dice/`가 `type=module`이 아닌 이유(§6.7/§9.4 원본 명세, file:// CORS 안전)와 동일한 제약을 승계한다.
- 테스트: `node --test tests/dice-*.test.js`(기존 glob이 `dice-4-*.test.js`도 포괄, TEST_SCOPE_POLICY 기준) — ① `computeStats`가 §3.1 산식과 일치하는지, ② `rollOne`이 1~6 범위만 산출하는지(대량 반복), ③ §7.6 정적 검사(fetch/인증 코드 0건), ④ 원본 `dice/**` 미변경 확인을 순수 함수/정적 검사로 검증. 신규 테스트 파일명은 `tests/dice-4-*.test.js` 권장(module 태그는 여전히 `dice`, focused scope 가드 패턴은 `dice-storage.test.js`/`dice-ui.test.js`의 `_BRIX_MY_MODULE = "dice"` 패턴 재사용).

---

## 9. Acceptance Criteria 매핑 (Given/When/Then)

### 9.1 BF-898 수용 기준 원문 매핑

**AC-1 (Epic 빈 슬롯 충족 — 렌더 요건·fetch 대상·인증 가드 필요 여부 명문화)**
> **Given** Epic(BF-897)의 빈 슬롯(사용자 가치·데이터 의존성)이 있을 때
> **When** 본 기획 문서(`docs/planning/dice-4-BF-897.md`)를 작성하면
> **Then** `/phase18-validation/dice-4`의 렌더 요건(§6.2)·fetch 대상(§3.3, 0건)·인증 가드 필요 여부(§3.5, 불필요)가 명문화된다.

**AC-2 (수용 기준 4항목의 GWT 재기술)**
> **Given** 수용 기준 4항목(§0 가정 6 — ① 사용자 가치 ② 데이터 의존성 ③ 렌더 요건·fetch·인증 가드 ④ 기존 통계 카드 재사용 범위)
> **When** 기획을 마치면
> **Then** 각 항목이 아래 AC-사용자가치 / AC-데이터의존성 / AC-렌더 / AC-재사용 형태로 검증 가능한 Given/When/Then으로 재기술된다(§9.2).

### 9.2 4항목 개별 GWT 재기술 (§0 가정 6 대응)

**AC-사용자가치**
> **Given** Phase 18 검증 스위트에서 "통계"라는 파생 데이터의 재사용 가능성이 미검증 상태일 때
> **When** `/phase18-validation/dice-4`가 구현되어 굴리기 1회를 실행하면
> **Then** §2의 4개 사용자 가치(재사용 가시적 증거·외부 의존성 없는 신뢰성 증명·회귀 조기 발견·네트워크 독립성 증명)가 화면 진입 + 굴리기 1회만으로 확인 가능하다.

**AC-데이터의존성**
> **Given** "데이터 의존성" 빈 슬롯
> **When** 본 문서 §3이 데이터 모델을 정의하면
> **Then** 유일한 데이터 원천이 `Math.random()` 기반 굴림 값과 그에 대한 순수 산술 파생(`sum`/`avg`/`max`)뿐이며, 외부 API·서버·DB·세션 의존성이 0건임이 명시된다.

**AC-렌더**
> **Given** 페이지가 로드된 상태
> **When** 사용자가 진입하거나 굴리기를 클릭하면
> **Then** §6.2의 5개 렌더 조건(즉시 렌더·오프라인 동작·굴리기 즉시 갱신·새로고침 초기화·noscript 폴백)이 모두 충족된다.

**AC-재사용**
> **Given** `phase18-validation/dice-4/*` 구현물
> **When** 원본 `dice/*`와 비교하면
> **Then** §5.4 재사용 성공 판정 기준 4항목(신규 색상 0건, 통계 카드 DOM 구조 동일, 원본 미변경, 산식 동일값 재구현)을 모두 만족한다.

### 9.3 화면·데이터 관련 파생 AC (§3~§7 근거)

**AC-3 (통계 산식 정확성)**
> **Given** 고정된 굴림 배열(예: `[3,5,2]`)
> **When** `computeStats()`에 전달하면
> **Then** `sum=10`, `avg=3.3`(`.toFixed(1)`), `max=5`가 산출되며 원본 `dice/main.js`의 동일 입력 결과와 일치한다(§3.1, §7.6).

**AC-4 (재사용 범위, §5.4와 동일)**

**AC-NETWORK (외부 네트워크·인증 미사용 원칙)**
> **Given** `dice-4/` 모듈 소스 전체(HTML/CSS/JS)
> **When** §7.6의 정적 코드 검사를 실행하면
> **Then** `fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource`/외부 URL·로그인/세션/인증 관련 코드가 0건이다.

### 9.4 매핑 요약표

| BF-898 수용 기준 | 충족 근거 |
|---|---|
| Given Epic 빈 슬롯(사용자가치·데이터의존성), When 기획 문서 작성, Then 렌더요건·fetch대상·인증가드 필요여부가 명문화됨 | §2(사용자가치)·§3(데이터의존성·fetch·인증)·§6(렌더요건) 전체 |
| Given 수용기준 4항목, When 기획 완료, Then 각 항목이 검증가능한 GWT로 재기술됨 | §9.2 AC-사용자가치/AC-데이터의존성/AC-렌더/AC-재사용 |

---

## 10. Edge Case 목록

### 10.1 단일 주사위(개수=1)일 때 통계 값의 의미

개수가 1일 때 `sum === avg === max === rolls[0]`(모두 같은 값)이 되는 것은 결함이 아니라 산식의 자연스러운 결과다(§3.1 — 배열 길이 1에 대한 합/평균/최대는 수학적으로 동일). 별도 예외 처리를 하지 않는다.

### 10.2 나눗셈-0 불가능 (개수 최솟값 보장)

개수 선택 최솟값이 1이므로(§4.3, 원본 `DICE_COUNT_MIN=1` 승계) `computeStats`의 `sum / rolls.length`에서 `rolls.length`가 0이 되는 경우는 존재하지 않는다. `NaN` avg가 발생할 여지가 없다.

### 10.3 평균 표시 반올림 경계값

`avg.toFixed(1)`은 JS 표준 반올림 규칙을 따른다(원본과 동일 승계, 자체 반올림 로직 구현 금지). 예: `[1,2]` → `avg=1.5` → 표시 `1.5`. `[1,1,2]` → `avg=1.333...` → 표시 `1.3`.

### 10.4 새로고침 시 통계 초기화가 재사용 실패로 오인될 위험

§3.4·§6.2-4에서 명시한 대로 새로고침 후 통계가 `"--"`로 돌아가는 것은 **의도된 동작**이지 회귀가 아니다. tester가 "원본은 새로고침 후에도 마지막 굴림이 복원되는데 dice-4는 복원되지 않는다"를 결함으로 오인하지 않도록, 본 문서를 검증 기준선으로 명시적으로 참조해야 한다(§5.3).

### 10.5 굴림 진행 중(애니메이션) 연타/새 굴림 트리거

원본의 연타 방지(`isRolling` 플래그, `docs/spec/dice-roll-BF-848.md` §4-2) 동작을 그대로 승계한다 — 통계는 오직 `commitRoll` 커밋 시점에만 갱신되며, 진행 중인 스와핑 프리뷰 단계에서는 갱신되지 않는다(§6.2-3).

### 10.6 `prefers-reduced-motion` 사용자의 통계 갱신 동등성

reduced-motion 환경에서는 중간 애니메이션 없이 즉시 최종 굴림이 커밋되지만, 통계 값 자체(§3.1 산식)는 애니메이션 유무와 무관하게 동일하게 계산된다(원본 §4-4 기능 동등성 원칙 승계).

---

## 11. 비범위 (Out of Scope)

- 히스토리 리스트(최근 N건 누적) — §0 가정 3, §5.3
- 히스토리 row 클릭 재표시 — §5.3
- 전체 삭제 확인 모달 — §5.3
- `localStorage` 기반 개수/히스토리 영속화 — §3.4, §5.3(테마 공유 키만 예외)
- 실제 통계/데이터 API 연동, 서버 집계, DB 조회 — §3.2, §7.1에서 명시적으로 배제
- 인증/로그인/세션 가드 — §3.5, §7.2에서 명시적으로 배제
- 신규 통계 항목 추가(중앙값·표준편차·최소값 등) — §5.1, 원본에 없는 통계는 발명하지 않음
- `dice/*` 원본 코드의 수정·리팩터링 — §7.5
- Phase 18 검증 스위트의 1~3/5, 5/5 항목 — 본 문서는 4/5만 다룬다
- 디자인 산출물(정확한 mockup, 통계 카드 단독 레이아웃 재검증 등) — designer 담당 영역, 원본 디자인 명세(`docs/design/dice-spa-BF-849.md`)의 토큰을 그대로 참조하면 충분하다고 판단(§13-5)
- 키보드 단축키(개수 1~5/테마 T) 포함 여부 — dev 재량으로 열어둠(§5.3, §13-3)

---

## 12. 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/planning/dice-4-BF-897.md`(본 문서, File Ownership 원문 명시) |
| 신규 구현 대상(후속 designer/dev task) | `phase18-validation/dice-4/index.html`, `styles.css`, `stats.js`, `main.js` — 미정, 본 문서 §3~§8이 계약(contract) |
| 신규 테스트 대상(후속 tester task) | `tests/dice-4-*.test.js` — 미정, 본 문서 §7.6·§9가 검증 기준 |
| 재사용 원본(수정 금지) | `dice/index.html`, `styles.css`, `main.js`, `storage.js`(BF-448/450) |
| 참조한 기존 선례 | `docs/spec/dice-roll-BF-848.md`(원본 주사위 상호작용 명세, §8 데이터 의존성 배제 근거)·`docs/design/dice-spa-BF-849.md`(원본 디자인 토큰)·`docs/planning/status-card-BF-879.md`(Phase 18 검증 1/5)·`docs/planning/a11y-counter-BF-886.md`(검증 2/5)·`docs/planning/clock-3-BF-891.md`(검증 3/5, 경로 선례 정정의 근거) |

---

## 13. 남은 모호함 (운영자 확인 권장)

1. **`src/app` 이관 필요 여부**: §0 가정 1 — 본 문서는 실측 근거(status-card-1/counter-2/clock-3 모두 저장소 최상위에 구현됨)로 planner 지정 경로를 `phase18-validation/dice-4/`로 정정했다. 운영자 의도가 원래부터 `src/app/phase18-validation/*` 통합이었다면 4건 모두(과거 3건 + 본 건) 재구성이 필요하다.
2. **"수용 기준 4항목"의 정확한 원문**: §0 가정 6 — 본 세션에 Jira 조회 도구가 연결되어 있지 않아 Epic(BF-897) 원문을 대조하지 못했다. 본 문서는 task 설명에서 추출 가능한 4개 축(사용자가치/데이터의존성/렌더요건·fetch·인증가드/재사용범위)으로 대체 매핑했다(§9.1~9.2). Epic 원문에 다른 4개 항목이 명시되어 있다면 본 §9 개정이 필요하다.
3. **키보드 단축키 포함 여부**: §5.3, §11 — 통계 검증의 필수 요건은 아니라고 판단해 dev 재량으로 열어두었다. 운영자가 원본과 완전히 동일한 키보드 조작성을 요구한다면 본 문서 §4·§5.3 개정이 필요하다.
4. **Phase 18 검증 스위트 5/5 항목의 구체 범위**: status-card(1)·counter(2)·clock(3)·dice(4)까지 "각기 다른 기존 모듈의 재사용성/데이터의존성 검증"이라는 패턴이 확인되었으나, 남은 5/5의 대상 모듈·라우트는 확인 불가하다.
5. **디자인 산출물 필요 여부**: 본 문서는 원본 디자인 명세(`docs/design/dice-spa-BF-849.md`)의 토큰 재사용만으로 충분하다고 가정했으나(§11), 통계 카드 단독 축소 레이아웃(히스토리 카드 제거로 인한 세로 배치 변경)에 대한 별도 designer mockup이 필요한지는 확인되지 않는다.
6. **Epic(BF-897) 원문 미대조**: 본 세션에 Jira 조회 도구가 연결되어 있지 않아 BF-897 Epic 원문을 직접 대조하지 못했다. 본 문서는 BF-898 task 설명·수용 기준 원문 및 status-card/a11y-counter/clock-3 선례만으로 작성했다.

---

*문서 종료 — [박기획] · BF-898*

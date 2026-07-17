# 메모리 매치 기획 명세 — BF-916

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-917 (본 planner task) · BF-916 (상위 Epic/부모 스토리)
> 신규 모듈: `phase18-games/memory-match/`
> 대상 라우트: `/phase18-games/memory-match` (= 저장소 최상위 `phase18-games/memory-match/`, 신규 디렉터리 — §0 가정 1)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의
> 단위 테스트: `node --test tests/memory-match-*.test.js` (focused scope · module: `memory-match`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 경로 컨벤션(`phase18-games/memory-match/`):** 저장소에는 신규 모듈 경로 컨벤션이 두 가지 공존한다. 저장소 루트 직속(`number-guess/`, `counter/`, `rps/`, `dice/` 등)과 `phase18-games/` 하위(`phase18-games/pong/`, 선례: BF-910/911/912/913)다. 본 task 는 수용 기준에 라우트를 명시적으로 `/phase18-games/memory-match` 로 지정하므로, **가장 직접적인 최근 선례인 `phase18-games/pong/`** 패턴을 따라 `phase18-games/memory-match/`(`index.html`/`styles.css`/`logic.js`/`main.js`)를 1차 제안 경로로 확정한다. 최종 파일 분할(예: `logic.js`/`main.js` 통합 여부)은 dev 재량이며, 본 문서 §5~§6 의 계약(contract)은 배치 경로와 무관하게 유효하다.

**가정 2 — 산출물 경로는 `docs/plan/`(`docs/planning/` 아님):** `pong` 선례는 기획 SSOT를 `docs/planning/pong-BF-910.md` 에 두었으나, 본 task 의 수용 기준은 **명시적으로 `docs/plan/memory-match-BF-916.md`** 를 지정하고, 본 task 의 File Ownership 범위도 `docs/plan/**` 로 고정되어 있다. 두 경로(`docs/plan/`, `docs/planning/`) 가 저장소에 공존하는 것은 과거 컨벤션 변경의 흔적으로 판단되며, 본 문서는 task 지시를 그대로 따른다 — 후속 designer/dev 산출물이 본 문서를 SSOT로 참조할 때는 `docs/plan/memory-match-BF-916.md` 경로를 사용해야 한다.

**가정 3 — 카드 내용은 로직과 분리된 추상 식별자:** 카드 짝은 로직 상 `pairId`(정수 0~7) 로만 식별하고, 화면에 표시할 실제 기호(이모지/문자/아이콘)는 디자이너 재량으로 위임한다(§12). 이는 `vanilla-static` 제약(외부 이미지 자산 0건) 하에서 순수 로직과 시각 표현의 관심사를 분리하기 위함이며, 참고용 기본 이모지 8종을 §2.1 에 제시하되 강제하지 않는다.

**가정 4 — "이동 횟수(moves)"의 정의:** Epic 설명은 "이동횟수"만 언급하고 구체적 카운팅 단위를 명시하지 않는다. 메모리 매치 장르의 통상적 관례(2장을 뒤집어 비교하는 1회 시도 = 1 move)를 채택한다 — 즉 **낱장 뒤집기가 아니라 "2장 비교 1회"를 1 move 로 카운트**한다(§2.2, §6.2 TC 근거). 낱장 카운트를 원하면 §14-1 에서 운영자 확인이 필요하다.

**가정 5 — 데이터 의존성 없음(완전 클라이언트 in-memory):** 서버 저장·인증·외부 API·`localStorage` 영속화를 모두 사용하지 않는다(§1.2 DoD, §11). 새로고침 시 게임은 항상 초기 상태(카드 재셔플·이동 횟수 0·타이머 0)로 재시작한다.

**가정 6 — 파일 소유권:** 본 planner task(BF-917)의 담당 파일은 `docs/plan/memory-match-BF-916.md` 1개뿐이다. `phase18-games/memory-match/*` 코드, `docs/design/*` 시각 명세는 후속 designer/dev 담당 영역이며 본 task 에서 생성·수정하지 않는다.

**가정 7 — 완전 신규(forward) 모듈:** `phase18-games/memory-match/` 디렉터리·코드·테스트는 현재 저장소에 0건 존재한다(사전 확인 완료). 본 문서는 아직 존재하지 않는 UI 모듈의 최초 스펙을 정의하는 forward 설계 문서다.

---

## 목차

1. [개요 및 라우트 정보](#1-개요-및-라우트-정보)
2. [게임 규칙](#2-게임-규칙)
3. [상태 모델](#3-상태-모델)
4. [사용자 시나리오 및 UX 흐름](#4-사용자-시나리오-및-ux-흐름)
5. [파일 구조 및 모듈 경계](#5-파일-구조-및-모듈-경계)
6. [순수 함수 Contract](#6-순수-함수-contract)
7. [접근성 요구 — 키보드 조작 및 360px 조작 (검증 가능)](#7-접근성-요구--키보드-조작-및-360px-조작-검증-가능)
8. [단위 테스트 전략](#8-단위-테스트-전략)
9. [Acceptance Criteria (Given/When/Then)](#9-acceptance-criteria-givenwhenthen)
10. [Edge Case 목록](#10-edge-case-목록)
11. [비범위 (Out of Scope)](#11-비범위-out-of-scope)
12. [디자이너 위임 시각 요소](#12-디자이너-위임-시각-요소)
13. [산출물 위치 및 참조 표](#13-산출물-위치-및-참조-표)
14. [남은 모호함 (운영자 확인 권장)](#14-남은-모호함-운영자-확인-권장)

---

## 1. 개요 및 라우트 정보

### 1.1 목적

4×4 보드(16칸, 카드 8쌍)에서 카드를 두 장씩 뒤집어 짝을 맞추는 카드 매칭 게임을 바닐라 HTML/CSS/JS 로 구현한다. 서버 저장·인증·외부 API·신규 패키지 없이 클라이언트 in-memory 상태만으로 동작하며, 마우스뿐 아니라 키보드만으로도, 360px 폭의 소형 모바일 화면에서도 모든 조작이 가능해야 한다.

### 1.2 완료 조건 (Definition of Done)

| # | 완료 조건 |
|---|---|
| 1 | 페이지 로드 시 16장의 카드가 모두 뒤집힌(hidden) 상태로 4×4 그리드에 표시되고, 이동 횟수·타이머가 0으로 표시된다 |
| 2 | 카드를 1장 클릭하면 해당 카드가 앞면으로 뒤집히고, 이 시점(최초 클릭)에 타이머가 시작된다 |
| 3 | 두 번째 카드를 클릭하면 입력이 잠기고(§3), 두 카드의 짝 여부가 판정되며 이동 횟수가 1 증가한다 |
| 4 | 짝이 맞으면 두 카드는 `matched` 상태로 고정되고, 짝이 틀리면 짧은 지연 후 두 카드 모두 다시 뒤집힌(hidden) 상태로 복귀한다 |
| 5 | 8쌍이 모두 `matched` 되면 타이머가 정지하고 완료 화면(최종 이동 횟수·소요 시간)이 표시되며, 재시작 버튼으로 언제든 새 게임을 시작할 수 있다 |
| 6 | `Tab` 만으로 모든 카드·재시작 버튼에 순서대로 포커스 이동이 가능하고, 포커스 상태에서 `Enter`/`Space` 로 카드 뒤집기·재시작이 동일하게 실행된다(§7) |
| 7 | 360px 뷰포트 폭에서 가로 스크롤 없이 4×4 보드 전체가 표시되고 모든 카드가 탭 가능하다(§7) |
| 8 | 서버 저장·인증·외부 API 호출·신규 패키지 설치·`localStorage` 영속화가 0건이다(§11) |

### 1.3 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `phase18-games/memory-match/`(`index.html`/`styles.css`/`logic.js`/`main.js`) — §0 가정 1, 최종 분할은 dev 재량 |
| 기존 코드 영향 | 없음 — 완전 독립 신규 모듈 |
| 데이터 원천 | **없음** — 클라이언트 in-memory 상태만 사용(§0 가정 5) |
| 외부 라이브러리 | 없음 — `file://` 프로토콜 직접 열기 가능 |
| 영속 저장 | 없음(v1) — 새로고침 시 항상 초기 상태로 재시작 |

### 1.4 라우트 및 페이지 정보 (수용 기준 2번째 항목 대응)

> 본 절은 task 수용 기준 2번째 항목("페이지 명·데이터 의존성 없음·360px 조작 요건이 명시된다")에 직접 대응한다.

| 항목 | 값 |
|---|---|
| 라우트 | `/phase18-games/memory-match` (= 저장소 `phase18-games/memory-match/index.html`) |
| 페이지 명(`<title>`) | `메모리 매치 · /phase18-games/memory-match` (기존 `pong` 선례 `Pong 아케이드 · /phase18-games/pong` 패턴 승계) |
| 화면 타이틀(`<h1>`) | `메모리 매치` |
| 데이터 의존성 | **없음** — 서버/DB/외부 API/인증 미사용, 클라이언트 in-memory 상태만(§0 가정 5, §1.2 DoD #8, §11) |
| 360px 조작 요건 | 360px 뷰포트 폭에서 가로 스크롤 없이 4×4 보드 전체 표시 + 모든 카드가 최소 터치 타깃 규격으로 탭 가능해야 함(§7.2 상세 요건 표) |

### 1.5 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전) 또는 Node.js(`node --test`)로 순수 함수(카드 셔플·매치 판정) 단위 테스트
- `phase18-games/memory-match/` 디렉터리는 아직 존재하지 않으며 본 task 이후 별도 designer/dev task 에서 신규 생성됨
- 순수 함수는 UMD 패턴으로 작성되어 Node(CommonJS) + 브라우저(`globalThis`) 양쪽에서 로드 가능해야 함(기존 `phase18-games/pong/logic.js` 와 동일 컨벤션)

---

## 2. 게임 규칙

### 2.1 보드 구성

| 규칙 항목 | 상세 |
|---|---|
| 보드 크기 | **4×4 = 16칸** |
| 카드 쌍 수 | **8쌍**(카드 16장, 각 쌍은 동일한 `pairId` 0~7 을 공유) |
| 카드 내용 | 로직 상 `pairId`(정수)만 정의, 화면 표시 기호는 디자이너 재량(§0 가정 3). 참고용 기본 8종 예시: 🍎 🍌 🍇 🍉 🍓 🍒 🍑 🥝 |
| 셔플 | Fisher-Yates 셔플로 16장 카드 배치를 무작위화(§6.1 `shuffle`). 매 게임 시작/재시작마다 재셔플 |
| 초기 카드 상태 | 전체 16장 `hidden`(뒷면) |

### 2.2 게임 루프 규칙

| 규칙 항목 | 상세 |
|---|---|
| 카드 뒤집기(flip) | `hidden` 상태 카드를 클릭/키 입력하면 `revealed`(앞면)로 전환 |
| 동시 공개 카드 수 상한 | 최대 **2장** — 이미 2장이 `revealed`(판정 대기 `checking` 상태)인 동안 3번째 카드 클릭은 **무시**(§10 EC-02) |
| 최초 카드 클릭 | 게임 상태가 `idle`→`playing` 으로 전환되고 이 시점에 **타이머가 시작**된다(§2.4) |
| 일치 판정 시점 | 2번째 카드가 `revealed` 로 전환되는 즉시 게임 상태가 `checking`(입력 잠금)으로 전환되고, 두 카드의 `pairId` 비교로 판정 |
| 이동 횟수(moves) 집계 단위 | **2장 비교 1회 = 1 move**(낱장 카운트 아님, §0 가정 4) — 2번째 카드가 `revealed` 되는 시점에 +1 |
| 일치(match) 처리 | 두 카드 `matched` 로 고정(더 이상 뒤집을 수 없음, 항상 앞면 유지) → `matchedPairs` +1 |
| 불일치(mismatch) 처리 | 두 카드를 잠시(권장 700~900ms, §12 디자이너 재량) 앞면으로 보여준 뒤 다시 `hidden` 으로 복귀 |
| 이미 `revealed`/`matched` 카드 재클릭 | **무시**(no-op) — 이동 횟수 증가 없음(§10 EC-01) |
| 최대 이동 횟수 제한 | **없음**(v1) |

### 2.3 완료 조건

| 항목 | 상세 |
|---|---|
| 승리 조건 | `matchedPairs === 8`(16장 전부 `matched`) |
| 승리 시 동작 | 타이머 즉시 정지, 게임 상태 `won` 전환, 완료 화면에 최종 이동 횟수·소요 시간 표시, 재시작 버튼에 포커스 이동(권장, §7) |
| 패배/게임오버 조건 | **없음**(v1) — 시간/이동 횟수 제한 없이 언제든 완료 가능(§11) |

### 2.4 타이머 규칙

| 항목 | 상세 |
|---|---|
| 시작 시점 | **최초 카드 클릭 시점**(페이지 로드 시점 아님) — `idle`→`playing` 전환과 동시에 시작 |
| 진행 방식 | 카운트업(00:00 부터 증가), 1초 단위 표시(`mm:ss`) |
| 정지 시점 | `matchedPairs === 8` 로 `won` 전환되는 순간 |
| 정지 후 | 값 고정 표시(완료 화면), 재시작 전까지 변화 없음 |
| 재시작 시 | `00:00` 으로 초기화, 타이머는 다시 idle 상태(다음 최초 클릭까지 정지) |
| 드리프트 방지 | `setInterval` 누적 카운트가 아닌 `Date.now() - startedAt` 차분 계산으로 표시값을 매 tick 재계산(백그라운드 탭 전환 등으로 인한 드리프트 방지, §10 EC-08) |

### 2.5 재시작 규칙

| 항목 | 상세 |
|---|---|
| 트리거 | 재시작 버튼 클릭 또는 포커스 시 `Enter`/`Space` — **게임 진행 중(`playing`/`checking`) 에도 언제든 허용** |
| 동작 | 새 셔플로 16장 재배치, 전체 `hidden`, `moves=0`, `matchedPairs=0`, 타이머 `00:00`(정지 상태), 게임 상태 `idle` |
| `checking` 중 재시작 | 대기 중인 불일치 flip-back 타이머(있다면)를 취소하고 즉시 재시작 처리(§10 EC-07) |

---

## 3. 상태 모델

### 3.1 카드 단위 상태 (`card.state`)

| 상태 | 의미 | 다음 가능 상태 |
|---|---|---|
| `hidden` | 뒷면(기본) | `revealed`(클릭 시) |
| `revealed` | 앞면 공개, 아직 확정 아님(판정 대기 또는 판정 후 mismatch 복귀 대기) | `matched`(일치) / `hidden`(불일치, 지연 후) |
| `matched` | 짝 확정, 항상 앞면 고정, 더 이상 상호작용 없음 | (종단 상태) |

### 3.2 게임 단위 상태 (`game.status`)

| 상태 | 의미 | 입력 처리 |
|---|---|---|
| `idle` | 게임 시작 대기(재시작 직후 포함) — 타이머 미시작 | 카드 클릭 허용(클릭 시 `playing` 전환 + 타이머 시작) |
| `playing` | 진행 중, `revealedIds.length` 가 0 또는 1인 상태(다음 카드 선택 대기) | 카드 클릭 허용(`hidden` 카드만) |
| `checking` | `revealedIds.length === 2`, 판정/애니메이션 처리 중 — **입력 잠금** | 카드 클릭 **무시**(재시작 버튼은 예외적으로 항상 허용, §2.5) |
| `won` | 8쌍 모두 `matched`, 타이머 정지 | 카드 클릭 무의미(전부 `matched`), 재시작만 유효 동작 |

### 3.3 상태 전이 다이어그램

```
[idle] --(카드 1장 클릭: flip, 타이머 시작)--> [playing: revealedIds.length=1]
[playing: len=1] --(카드 2장째 클릭: flip)--> [checking: len=2, moves+=1]
[checking] --(pairId 일치: 즉시 matched 처리)--> matchedPairs+1
    ├─ matchedPairs === 8 --> [won] (타이머 정지)
    └─ matchedPairs < 8   --> [playing: revealedIds.length=0]
[checking] --(pairId 불일치: 지연 후 hidden 복귀)--> [playing: revealedIds.length=0]
[playing] --(이미 revealed/matched 카드 재클릭)--> 무변화(no-op)
[checking] --(3번째 카드 클릭)--> 무변화(no-op, 입력 무시)
[any state] --(재시작)--> [idle] (재셔플, moves=0, matchedPairs=0, 타이머 00:00)
```

### 3.4 게임 상태 객체 구조 (참조용)

```javascript
{
  status: 'idle' | 'playing' | 'checking' | 'won',
  deck: [ { id: 0, pairId: 3, state: 'hidden' }, /* ...16개 */ ],
  revealedIds: [],       // 현재 판정 대기 중인 카드 id (최대 2개)
  moves: 0,               // §2.2 정의(2장 비교 1회 = 1)
  matchedPairs: 0,        // 0~8
  startedAt: null,        // 최초 flip 시각(ms), idle 복귀 시 null
  finishedAt: null        // won 전환 시각(ms), 소요시간 = finishedAt - startedAt
}
```

---

## 4. 사용자 시나리오 및 UX 흐름

### 4.1 정상 플레이 흐름 (Happy Path)

```
[게임 시작]
  └─ 페이지 로드 → 16장 셔플·hidden 배치 → 이동 횟수 0, 타이머 00:00 표시(정지)

[첫 카드 뒤집기]
  └─ 카드 A 클릭 → A: hidden→revealed → 타이머 시작(idle→playing)

[짝 시도]
  └─ 카드 B 클릭 → B: hidden→revealed → moves+=1 → 상태 checking(입력 잠금)
      ├─ pairId 일치
      │    └─ A,B: revealed→matched → matchedPairs+=1
      │        ├─ matchedPairs===8 → 상태 won, 타이머 정지, 완료 화면 표시
      │        └─ matchedPairs<8   → 상태 playing(다음 시도 대기)
      └─ pairId 불일치
           └─ 700~900ms 대기(두 카드 앞면 유지) → A,B: revealed→hidden → 상태 playing

[반복]
  └─ matchedPairs===8 될 때까지 위 사이클 반복

[재시작]
  └─ 재시작 버튼 클릭(언제든) → 재셔플 → moves=0, matchedPairs=0, 타이머 00:00 → 상태 idle
```

### 4.2 화면 표시 요소 요약

| 요소 | 표시 규칙 |
|---|---|
| 4×4 보드 | 16장 카드, 각 카드는 `card.state` 에 따라 뒷면/앞면(기호)/고정 스타일로 표시 |
| 이동 횟수 | "이동 횟수: N회" 형식, `moves` 값과 실시간 동기화 |
| 타이머 | `mm:ss` 형식, `playing` 이후 매초 갱신, `won` 시 고정 |
| 완료 배너 | `won` 상태에서만 표시 — 최종 이동 횟수 + 소요 시간 + 재시작 버튼 강조 |
| 재시작 버튼 | 항상 표시·활성(§2.5) |

---

## 5. 파일 구조 및 모듈 경계

### 5.1 파일 목록 (제안 — 최종 배치·분할은 dev 재량, §0 가정 1)

```
phase18-games/memory-match/
├── index.html   ← 마크업(4×4 보드 + 이동 횟수/타이머 표시 + 재시작 버튼) + 스크립트 로드
├── styles.css   ← 시각 스타일(designer 담당)
└── logic.js     ← 카드 셔플·매치 판정 순수 로직 + main.js 의 DOM 바인딩(developer 담당, 필요 시 main.js 로 분할 가능)

tests/
└── memory-match-<dev-task-id>.test.js   ← shuffle/createInitialState/flipCard/evaluateCheck 등 순수 로직 단위 테스트 (node --test)
```

### 5.2 모듈 책임 분리

#### `index.html`
- 4×4 보드 컨테이너(`<div id="board">`), 카드 16개는 네이티브 `<button>` 요소로 구현(§7.1 근거)
- 이동 횟수 표시 영역(`<span id="move-count">`), 타이머 표시 영역(`<output id="timer" aria-live="polite">`)
- 재시작 버튼(`<button id="restart-btn">`), 항상 활성
- 완료 배너 영역(`<div id="win-banner" hidden>`)
- `styles.css`, 로직 스크립트 순서로 로드, 외부 CDN 금지 — `file://` 직접 실행 가능

#### `styles.css`
- 레이아웃(4×4 CSS Grid), 컬러 팔레트, 타이포그래피(자체 CSS 변수 정의)
- 카드 상태별 스타일(`data-state="hidden|revealed|matched"`)
- 360px 하한에서도 가로 스크롤 없이 보드가 표시되도록 반응형 그리드(§7.2) — 구체 breakpoint 는 designer 재량
- 포커스 링(`:focus-visible`) 스타일 필수 포함(§7.1)

#### `logic.js` (+ 필요 시 `main.js` 분할)
- 책임 #1: 순수 함수 `createDeck`/`shuffle`/`createInitialState`/`flipCard`/`evaluateCheck` 정의·export(§6)
- 책임 #2: DOM 이벤트 바인딩(카드 클릭/키 입력, 재시작 버튼)
- 책임 #3: 타이머 표시 갱신(`Date.now()` 차분 기반, §2.4)
- 책임 #4: 불일치 시 지연 flip-back 을 위한 `setTimeout` 관리 및 재시작 시 취소(§2.5, §10 EC-07)
- `localStorage` 등 영속화 로직 사용 금지(v1 in-memory 단발, §11)

---

## 6. 순수 함수 Contract

### 6.1 시그니처

```javascript
/**
 * 카드 덱 생성 (셔플 포함)
 * @param {number} pairCount 쌍 개수(본 게임 고정값 8)
 * @param {() => number} [rng] 0~1 난수 생성기(테스트 시 결정적 함수 주입 가능, 기본 Math.random)
 * @returns {Array<{id:number, pairId:number, state:'hidden'}>} 길이 16 배열(셔플됨)
 */
function createDeck(pairCount, rng) { ... }

/**
 * Fisher-Yates 셔플(원본 비변경, 새 배열 반환)
 * @param {Array<T>} array
 * @param {() => number} [rng]
 * @returns {Array<T>} 셔플된 새 배열
 */
function shuffle(array, rng) { ... }

/**
 * 초기 게임 상태 생성
 * @param {Array} deck createDeck() 반환값
 * @returns {object} §3.4 게임 상태 객체(status:'idle', moves:0, matchedPairs:0, startedAt:null)
 */
function createInitialState(deck) { ... }

/**
 * 카드 클릭 처리(1장 뒤집기)
 * @param {object} state 현재 게임 상태
 * @param {number} cardId 클릭된 카드 id
 * @param {number} [now] 현재 시각(ms) — 최초 flip 시 startedAt 기록용, 기본 Date.now()
 * @returns {object} 새 게임 상태(불변 — 원본 미변경)
 *   - status==='checking' 이거나 대상 카드가 hidden 이 아니면 상태 변화 없음(no-op, §2.2)
 *   - hidden 카드 클릭 시 revealed 전환. revealedIds 길이가 2가 되면 moves+=1, status='checking'
 */
function flipCard(state, cardId, now) { ... }

/**
 * checking 상태의 두 카드를 판정하고 결과를 상태에 반영
 * @param {object} state status==='checking' 인 게임 상태
 * @param {number} [now] 현재 시각(ms) — 승리 시 finishedAt 기록용
 * @returns {object} 새 게임 상태
 *   - pairId 일치: 두 카드 matched, matchedPairs+=1, revealedIds=[], status는 matchedPairs===8이면 'won'(finishedAt 기록) 아니면 'playing'
 *   - pairId 불일치: 두 카드 hidden, revealedIds=[], status='playing'
 */
function evaluateCheck(state, now) { ... }
```

### 6.2 반환 값 Contract 요약표

| 함수 | 조건 | 결과 |
|---|---|---|
| `createDeck(8)` | 항상 | 길이 16, `pairId` 0~7 각 2회 등장, 순서는 셔플됨 |
| `flipCard(state, id)` | `state.status==='checking'` | 상태 변화 없음(no-op) |
| `flipCard(state, id)` | 대상 카드 `state !== 'hidden'` | 상태 변화 없음(no-op, §10 EC-01) |
| `flipCard(state, id)` | `revealedIds.length===0` (hidden 카드) | 해당 카드 `revealed`, `revealedIds=[id]`, `status` `idle`→`playing`(최초 시), `startedAt` 최초 1회만 기록 |
| `flipCard(state, id)` | `revealedIds.length===1` (hidden 카드) | 해당 카드 `revealed`, `revealedIds` 길이 2, `moves+=1`, `status='checking'` |
| `evaluateCheck(state)` | `revealedIds` 두 카드 `pairId` 동일 | 두 카드 `matched`, `matchedPairs+=1`, `revealedIds=[]` |
| `evaluateCheck(state)` | `revealedIds` 두 카드 `pairId` 다름 | 두 카드 `hidden`, `revealedIds=[]` |
| `evaluateCheck(state)` | 위 일치 처리 후 `matchedPairs===8` | `status='won'`, `finishedAt=now` |

### 6.3 부작용 (Side Effects)

- **없음** — `createDeck`/`shuffle`(주입된 `rng` 호출 제외)/`createInitialState`/`flipCard`/`evaluateCheck` 모두 순수 함수. DOM 조작·`setTimeout`·전역 상태 변경 없음. 불일치 시 지연 flip-back 타이밍(`setTimeout`)은 UI 레이어(`main.js`)의 책임 — 지연 후 `evaluateCheck` 을 호출하는 것이 아니라, **`flipCard` 로 checking 진입 즉시 판정 로직 결과를 계산**해두고 불일치인 경우에만 UI가 "두 카드를 잠시 보여주다가 hidden 전환 렌더링을 지연"시키는 방식도 허용된다(순수 로직 계약은 동일, 지연은 렌더링 타이밍의 문제) — 상세 구현 전략은 dev 재량.

### 6.4 Export 방식 (테스트 호환)

`package.json` 의 `"type": "module"` 을 따르되, 브라우저 `<script>`(non-module) 로드 호환을 위해 기존 `phase18-games/pong/logic.js` 와 동일한 UMD 패턴을 사용한다:

```javascript
// phase18-games/memory-match/logic.js — UMD 패턴 (Node ESM/CJS + 브라우저 <script> 양쪽 호환)
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MemoryMatchLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function shuffle(array, rng) { /* Fisher-Yates, §6.1 */ }
  function createDeck(pairCount, rng) { /* §6.1 */ }
  function createInitialState(deck) { /* §6.1 */ }
  function flipCard(state, cardId, now) { /* §6.1 */ }
  function evaluateCheck(state, now) { /* §6.1 */ }
  return { shuffle, createDeck, createInitialState, flipCard, evaluateCheck };
});
```

테스트 파일에서는 `require('../phase18-games/memory-match/logic.js')` (또는 저장소 기존 모듈들의 실제 import 관례를 그대로 따름)로 가져온다.

---

## 7. 접근성 요구 — 키보드 조작 및 360px 조작 (검증 가능)

> 본 절은 task 수용 기준("페이지 명·데이터 의존성 없음·360px 조작 요건이 명시된다")과 §1.2 DoD #6~#7 에 직접 대응한다.

### 7.1 키보드 조작 요건

| 요건 | 상세 | 검증 방법 |
|---|---|---|
| 카드 포커스 이동 | 16장 카드 전부 네이티브 `<button>` 요소로 구현 → `Tab`/`Shift+Tab` 으로 브라우저 기본 포커스 이동(보드 좌상→우하 DOM 순서), 커스텀 `tabindex`/`role="button"` div 금지 | 정적 마크업 검사: `grep -oE "<button[^>]*class=\"card" phase18-games/memory-match/index.html \| wc -l` → 16 |
| 카드 뒤집기 활성화 키 | 포커스된 카드에서 `Enter`/`Space` 입력 시 클릭과 동일 동작(네이티브 `<button>` 기본 제공) | 브라우저 수동/E2E: 카드 포커스 후 키 입력 → `revealed` 전환 관찰 |
| `checking` 상태 입력 잠금 시 포커스 유지 | 입력 잠금 중에도 카드에 `disabled` 속성을 부여하지 않는다(포커스 이탈 방지) — 대신 `aria-disabled="true"` + JS 클릭 핸들러 내부에서 `status==='checking'` 이면 무시(§3.2) | 정적 코드 검사: `checking` 처리 분기에 `disabled=true` 대입이 없는지 코드 리뷰 |
| 재시작 버튼 | 네이티브 `<button>`, 항상 `Tab` 도달 가능·항상 활성(§2.5) | 정적 마크업 검사: `id="restart-btn"` 이 `<button>` 이며 `disabled` 속성 없음 |
| 포커스 가시성 | `:focus-visible` 스타일이 카드·재시작 버튼 어디에서도 `outline: none` 으로 완전히 제거되지 않음 | 정적 코드 검사: `styles.css` 에 `outline:\s*none` 이 대응 커스텀 포커스 스타일 없이 단독 사용되지 않는지 확인(designer 산출물 리뷰 항목) |
| 완료(`won`) 시 포커스 이동 | `won` 전환 시 재시작 버튼(또는 완료 배너 타이틀)에 포커스 이동 권장 — 필수는 아니나 스크린리더 사용자가 결과를 즉시 인지하도록 권장(§12 재량) | 수동/E2E 확인 |

### 7.2 360px 조작 요건

| 요건 | 상세 | 검증 방법 |
|---|---|---|
| 가로 스크롤 없음 | 뷰포트 폭 360px 에서 4×4 보드 전체가 `overflow-x` 없이 표시됨 — 보드 최대 폭은 `min(100vw - 좌우 패딩, 컨테이너 최대폭)` 으로 반응형 계산, 카드 크기는 보드 폭 기준 4등분으로 자동 축소 | 브라우저 뷰포트 360px 리사이즈 후 `document.documentElement.scrollWidth <= 360` 확인(E2E) |
| 터치 타깃 규격 | 각 카드의 클릭 가능 영역은 360px 폭에서도 최소 44×44px 이상 확보(WCAG 2.5.5 권장) — 좌우 패딩·카드 간 gap 을 포함해 `(360 - 패딩*2 - gap*3) / 4 >= 44` 를 만족하도록 patting/gap 값을 designer 가 산정 | 정적 계산 검토(§12 위임) + 360px 프레임 mockup 스크린샷 확인 |
| 재시작 버튼·이동 횟수·타이머 | 360px 폭에서도 줄바꿈 없이(또는 자연스러운 줄바꿈으로) 읽을 수 있어야 하며, 잘리거나(clip) 겹치지 않음 | 360px 프레임 mockup 스크린샷 확인 |
| 터치 입력 | 카드 클릭은 `click` 이벤트(터치 디바이스에서 네이티브 `<button>` 이 `pointerdown`/`touchstart` 없이도 기본 지원) 로 충분 — 드래그/스와이프 제스처 불필요(카드 뒤집기는 탭 1회) | 코드 리뷰: 별도 터치 제스처 핸들러 부재 확인 |

### 7.3 스크린리더 지원

| 요건 | 상세 |
|---|---|
| 카드 상태 안내 | 각 카드 `aria-label` 이 상태에 따라 갱신: `hidden` → "카드 N, 뒤집기 전"(N=1~16 위치), `revealed`/`matched` → "카드 N, {기호 설명}"(기호는 designer 산출물의 대체 텍스트 규칙 따름) |
| 이동 횟수·타이머 | `<output id="move-count">`/`<output id="timer">` 또는 `aria-live="polite"` 컨테이너로 값 변경 시 스크린리더 안내(단, 타이머는 매초 갱신되므로 **`aria-live` 를 타이머 자체에는 걸지 않고** 이동 횟수·매치 성공·게임 완료 시점에만 안내하는 것을 권장 — 매초 알림은 방해 요소, §14-2) |
| 매치 성공/완료 알림 | 매치 성공 시("짝을 맞췄습니다"), 게임 완료 시("모두 맞췄습니다! 이동 N회, M초") `aria-live="polite"` 영역으로 안내 |

---

## 8. 단위 테스트 전략

### 8.1 테스트 파일 위치 및 실행

```bash
# 실행 명령 (focused scope, module: memory-match)
node --test tests/memory-match-*.test.js
```

정확한 파일명(예: `tests/memory-match-BF9xx.test.js`)은 후속 dev task 번호에 따라 결정되며, 위 glob 패턴에 매치되어야 한다.

### 8.2 테스트 대상

`shuffle`/`createDeck`/`createInitialState`/`flipCard`/`evaluateCheck` 순수 함수만 단위 테스트한다. DOM 인터랙션(클릭/키 이벤트/타이머 렌더링)은 단위 테스트 범위에서 제외하고 후속 tester task 의 E2E 가드로 다룬다.

### 8.3 필수 테스트 케이스

| 케이스 ID | 대상 | 시나리오 | 기대 결과 |
|---|---|---|---|
| TC-01 | `createDeck(8, rng)` | 결정적 `rng` 주입 | 길이 16, `pairId` 0~7 각 정확히 2회 등장 |
| TC-02 | `shuffle` | 동일 배열 + 동일 결정적 `rng` 2회 호출 | 원본 배열 불변(참조·값 모두), 반환은 새 배열 |
| TC-03 | `createInitialState` | 신규 deck | `status==='idle'`, `moves===0`, `matchedPairs===0`, `startedAt===null` |
| TC-04 | `flipCard` | `idle` 상태에서 hidden 카드 1장 클릭 | 해당 카드 `revealed`, `status==='playing'`, `startedAt` 기록됨, `moves` 불변 |
| TC-05 | `flipCard` | `playing`(1장 revealed) 상태에서 2번째 hidden 카드 클릭 | `revealedIds.length===2`, `moves===1`, `status==='checking'` |
| TC-06 | `flipCard` | `status==='checking'` 인 상태에서 3번째 카드 클릭 | 상태 변화 없음(no-op, §10 EC-02) |
| TC-07 | `flipCard` | 이미 `revealed` 또는 `matched` 카드 재클릭 | 상태 변화 없음(no-op, §10 EC-01) |
| TC-08 | `evaluateCheck` | `checking` 상태, 두 카드 `pairId` 일치, `matchedPairs` 는 8 미만 | 두 카드 `matched`, `matchedPairs+=1`, `revealedIds=[]`, `status==='playing'` |
| TC-09 | `evaluateCheck` | `checking` 상태, 두 카드 `pairId` 불일치 | 두 카드 `hidden`, `revealedIds=[]`, `status==='playing'`, `moves` 불변(이미 flipCard 에서 카운트됨) |
| TC-10 | `evaluateCheck` | 마지막(8번째) 쌍 일치 판정 | `matchedPairs===8`, `status==='won'`, `finishedAt` 기록됨 |
| TC-11 | 통합 흐름 | `createInitialState`→`flipCard`×2(불일치)→`evaluateCheck`→`flipCard`×2(일치)→`evaluateCheck` 순차 호출 | 각 단계 상태가 §6.2 표와 일치, 최종 `moves===2`, `matchedPairs===1` |

### 8.4 테스트 파일 구조 (참조 템플릿)

```javascript
// tests/memory-match-<dev-task-id>.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createDeck, createInitialState, flipCard, evaluateCheck } = require('../phase18-games/memory-match/logic.js');

function deterministicRng(seedSeq) {
  let i = 0;
  return () => seedSeq[i++ % seedSeq.length];
}

describe('createDeck', () => {
  it('TC-01: 16장, pairId 0~7 각 2회', () => {
    const deck = createDeck(8, deterministicRng([0.1, 0.9, 0.3]));
    assert.equal(deck.length, 16);
    const counts = {};
    for (const c of deck) counts[c.pairId] = (counts[c.pairId] || 0) + 1;
    assert.deepStrictEqual(Object.values(counts), Array(8).fill(2));
  });
});

describe('flipCard / evaluateCheck 흐름', () => {
  it('TC-04~TC-10: 매치 성공 시 상태 전이', () => {
    const deck = createDeck(8, deterministicRng([0]));
    let state = createInitialState(deck);
    const [a, b] = deck.filter((c) => c.pairId === deck[0].pairId).map((c) => c.id);
    state = flipCard(state, a, 1000);
    assert.equal(state.status, 'playing');
    state = flipCard(state, b, 1500);
    assert.equal(state.status, 'checking');
    assert.equal(state.moves, 1);
    state = evaluateCheck(state, 1600);
    assert.equal(state.matchedPairs, 1);
  });
});
```

---

## 9. Acceptance Criteria (Given/When/Then)

### AC-01: 게임 시작 — 초기 보드 상태

> **Given** 사용자가 `phase18-games/memory-match/index.html`(`/phase18-games/memory-match`)을 브라우저에서 열었을 때
> **When** 페이지 로드가 완료되면
> **Then** 4×4(16장) 카드가 모두 `hidden` 상태로 표시되고, 이동 횟수는 0, 타이머는 `00:00`(정지 상태)으로 표시된다

### AC-02: 첫 카드 클릭 — 타이머 시작

> **Given** 게임이 `idle` 상태일 때
> **When** 사용자가 임의의 카드를 클릭(또는 포커스 후 `Enter`/`Space`)하면
> **Then** 해당 카드가 `revealed` 로 전환되고, 타이머가 `00:00` 부터 카운트업을 시작한다

### AC-03: 두 번째 카드 클릭 — 일치 판정 및 이동 횟수 증가

> **Given** 카드 1장이 이미 `revealed` 상태일 때
> **When** 사용자가 두 번째 `hidden` 카드를 클릭하면
> **Then** 이동 횟수가 1 증가하고, 두 카드의 `pairId` 가 비교되어 일치 시 `matched`(고정), 불일치 시 짧은 지연 후 두 카드 모두 `hidden` 으로 복귀한다

### AC-04: 판정 대기 중 입력 잠금

> **Given** 두 카드가 `revealed` 상태로 판정/애니메이션 처리 중(`checking`)일 때
> **When** 사용자가 세 번째 카드를 클릭하면
> **Then** 입력이 무시되고 어떤 상태 변화도 일어나지 않는다(§10 EC-02)

### AC-05: 게임 완료 — 승리 조건

> **Given** 8쌍 중 7쌍이 이미 `matched` 상태일 때
> **When** 마지막 쌍이 일치 판정되면
> **Then** 타이머가 정지하고, 완료 화면에 최종 이동 횟수와 소요 시간이 표시되며, 재시작 버튼에 포커스가 이동한다(권장, §7.1)

### AC-06: 재시작 — 언제든 허용

> **Given** 게임이 `idle`/`playing`/`checking`/`won` 중 어느 상태이든
> **When** 사용자가 재시작 버튼을 클릭(또는 포커스 후 `Enter`/`Space`)하면
> **Then** 새로운 셔플로 16장이 재배치되고, 이동 횟수 0·타이머 `00:00`·`idle` 상태로 즉시 초기화된다(대기 중인 flip-back 타이머는 취소된다)

### AC-07: 키보드만으로 전체 조작 가능

> **Given** 마우스를 사용하지 않는 사용자가 페이지에 진입한 상태일 때
> **When** `Tab` 키로 카드 16장과 재시작 버튼 순서대로 포커스를 이동하며 각 지점에서 `Enter` 또는 `Space` 를 누르면
> **Then** 대응하는 조작(카드 뒤집기·재시작)이 마우스 클릭과 동일하게 실행되고, 어떤 조작도 마우스 없이 도달 불가능하지 않다(§7.1)

### AC-08: 360px 뷰포트에서 가로 스크롤 없이 전체 조작 가능

> **Given** 뷰포트 폭이 360px 인 소형 모바일 화면일 때
> **When** 페이지를 로드하면
> **Then** 가로 스크롤 없이 4×4 보드 전체가 표시되고, 모든 카드와 재시작 버튼이 최소 44×44px 터치 타깃으로 탭 가능하다(§7.2)

### AC-09: 데이터 의존성 없음

> **Given** `phase18-games/memory-match/` 모듈 소스 전체(HTML/CSS/JS)와 저장소 `package.json`
> **When** 정적 코드 검사(`grep -rnE "fetch\(|XMLHttpRequest|WebSocket|https?://|localStorage" phase18-games/memory-match/*.js phase18-games/memory-match/*.html`)와 `package.json` diff 를 확인하면
> **Then** 네트워크 호출·인증 관련 코드·`localStorage` 사용·신규 `dependencies`/`devDependencies` 추가가 0건이다

### 9.1 BF-917 수용 기준 ↔ 본 문서 매핑표

| BF-917 수용 기준 | 충족 근거 |
|---|---|
| Given 신규 게임 요구, When 기획 명세를 작성하면, Then `docs/plan/memory-match-BF-916.md` 에 게임 규칙·상태 전이·완료 조건이 정의된다 | §2(게임 규칙) · §3(상태 모델, 전이 다이어그램 §3.3) · §2.3(완료 조건) · §9 AC-01~AC-06 |
| Given 라우트 `/phase18-games/memory-match`, When 명세를 검토하면, Then 페이지 명·데이터 의존성 없음·360px 조작 요건이 명시된다 | §1.4(라우트·페이지 명·데이터 의존성 표) · §7.2(360px 조작 요건 표) · §9 AC-08, AC-09 |

---

## 10. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|---|---|---|
| EC-01 | 이미 `revealed` 또는 `matched` 인 카드를 다시 클릭 | 무시(no-op), 이동 횟수 증가 없음(§2.2, §8.3 TC-07) |
| EC-02 | `checking`(2장 판정 대기) 상태에서 3번째 카드 클릭 | 무시(no-op), 입력 잠금 유지(§3.2, §8.3 TC-06) |
| EC-03 | 첫 클릭이 없는 상태(`idle`)에서 페이지 방치 | 타이머는 시작되지 않고 `00:00` 유지(§2.4) |
| EC-04 | 마지막 8번째 쌍이 정확히 일치 판정되는 순간 | 즉시 `won` 전환, 타이머 정지 — 별도 지연 없이 즉시 완료 화면 표시(§2.3, §8.3 TC-10) |
| EC-05 | 불일치 지연(flip-back) 애니메이션 진행 중 재시작 클릭 | 대기 중인 flip-back 타이머 취소, 즉시 재시작 처리(§2.5, §9 AC-06) |
| EC-06 | 매우 빠르게 연속 클릭(더블/트리플 클릭)으로 짧은 시간 내 여러 카드 시도 | `checking` 입력 잠금이 매 라운드 정확히 적용되어 3장 이상 동시 `revealed` 상태가 되지 않음 |
| EC-07 | 게임 진행 중 브라우저 탭을 백그라운드로 전환 후 복귀 | 타이머는 `Date.now()` 차분 계산이므로 복귀 시 실제 경과 시간이 정확히 반영됨(카운터 누적 방식이 아니므로 드리프트 없음, §2.4) |
| EC-08 | 셔플 결과 우연히 같은 배치가 재시작마다 반복되는 것처럼 보임(저확률) | `Math.random` 기반 Fisher-Yates 는 매 호출 독립적 — 사양상 결함 아님, 통계적으로 매우 낮은 확률 |
| EC-09 | 스크린리더 사용자가 `checking` 중 카드에 포커스 이동 | `disabled` 미사용(§7.1)이므로 포커스 이탈 없이 유지되며, 클릭해도 no-op 만 발생(에러 없음) |
| EC-10 | 완료(`won`) 후 카드 클릭 시도 | 전 카드가 `matched` 이므로 클릭 핸들러가 자연히 no-op(§3.2, 별도 분기 불필요) |

---

## 11. 비범위 (Out of Scope)

수용 기준이 명시적으로 요구하는 데이터 의존성 제외와, 그 외 v1 에서 다루지 않는 항목:

| 항목 | 사유 |
|---|---|
| **서버 저장 / 인증 / 외부 API** | 데이터 의존성 없음 요건(§1.4, §9 AC-09) — 클라이언트 in-memory 단발 상태만 |
| **`localStorage` 최고 기록·이어하기** | v1 은 새로고침 시 항상 초기 상태로 재시작 — 필요 시 별도 스토리 |
| 난이도 선택(보드 크기 변경, 예: 6×6) | v1 은 4×4 고정 — 별도 스토리 |
| 제한 시간 / 최대 이동 횟수 제한(게임 오버) | UX 복잡도 증가 — 별도 스토리로 분리 |
| 순위표(리더보드), 최고 기록 비교 | 저장소 의존성 — 별도 스토리 |
| 효과음 / 배경음악 | 별도 Epic |
| 카드 뒤집기 애니메이션(3D flip 등 시각 연출) | designer 재량이나 필수 아님 — 기본 상태 전환(hidden/revealed/matched 스타일 차이)만 요구 |
| 방향키 기반 그리드 내비게이션(Arrow 키로 카드 간 이동) | v1 은 `Tab` 순서 기반 네이티브 포커스 이동만 요구(§7.1) — 향후 개선 후보(§14-3) |
| 다중 플레이어 / 턴제 대전 모드 | v1 은 단일 플레이어 전용 |
| 반응형/모바일 세부 breakpoint(360px 초과 구간) | 360px 하한 동작만 필수(§7.2), 그 외 구간 최적화는 designer 재량 |

---

## 12. 디자이너 위임 시각 요소

아래 항목은 기획에서 정하지 않고 디자이너에게 위임한다:

| 항목 | 가이드라인 |
|---|---|
| 카드 실제 기호(이모지/아이콘/색상) | `pairId` 0~7 에 대응하는 8종 기호 확정(§0 가정 3 참고 이모지 예시는 강제 아님) — 색맹 대응을 위해 기호 자체로 구분 가능해야 함(색상 단독 구분 지양) |
| 카드 뒷면 디자인 | 고유 패턴/로고 등 재량 |
| `matched` 카드 시각 강조(고정 표시) | 은은한 강조(테두리·투명도 등) 재량, 단 항상 앞면 유지 |
| 불일치 시 지연 시간(700~900ms 권장) | 정확한 ms 값은 designer/dev 협의 재량(§2.2) |
| 이동 횟수·타이머 레이아웃 | "이동 횟수: N회" / "MM:SS" 형식으로 표시 위치 재량 |
| 완료 배너 연출 | 애니메이션·색상 등 재량 |
| 컬러 팔레트·타이포그래피 | 신규 CSS 변수 자체 정의(기존 게임 계열과의 톤 일관성은 §0 가정 1 의 `phase18-games` 계열 승계 권장이나 강제 아님) |
| 카드 터치 타깃 산정(gap/padding) | §7.2 "44×44px 이상" 제약 내에서 구체 수치 재량 |
| 초기 포커스 위치 | 페이지 로드 시 첫 카드에 자동 포커스를 줄지 여부는 재량(스크린리더 방해 가능성 고려, §11 counter 선례 동일 원칙) |

---

## 13. 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/plan/memory-match-BF-916.md`(본 문서) |
| 신규 구현 대상(후속 designer/dev task) | `phase18-games/memory-match/index.html`, `styles.css`, `logic.js`(+ 필요 시 `main.js`) — 최종 배치 미정(§0 가정 1), 본 문서 §2~§7 이 계약(contract) |
| 신규 테스트 대상(후속 tester/dev task) | `tests/memory-match-*.test.js` — 미정, 본 문서 §6~§8 이 검증 기준 |
| 참조한 기존 선례 문서 | `docs/design/pong-BF-910.md`(`phase18-games` 경로 컨벤션·상태 오버레이 패턴), `docs/plan/counter-BF-859.md`(가정 명시 방식·접근성 검증 표 패턴), `docs/plan/number-guess-BF-783.md`(순수 함수 contract·forward 모듈 문서 패턴) |

---

## 14. 남은 모호함 (운영자 확인 권장)

1. **이동 횟수 집계 단위**: §0 가정 4 참고 — "2장 비교 1회 = 1 move" 로 채택했다. Epic 원문이 낱장 뒤집기(flip) 단위 카운트를 의도했다면 확인이 필요하다.
2. **타이머 `aria-live` 정책**: §7.3 참고 — 매초 갱신되는 타이머 자체에는 `aria-live` 를 걸지 않고 매치/완료 이벤트에만 안내하는 것을 권장했다. 매초 안내를 원하는 특수 요구가 있다면 별도 확인이 필요하다.
3. **방향키 그리드 내비게이션**: §11 비범위 참고 — v1 은 `Tab` 순서 기반 포커스 이동만 요구했다. 4×4 그리드 특성상 방향키 내비게이션(Arrow 키로 상하좌우 카드 이동)이 접근성 모범 사례로 더 적합할 수 있어, 후속 개선 스토리로 제안한다.
4. **신규 모듈 최종 배치 경로**: §0 가정 1 참고 — `pong` 선례처럼 `phase18-games/memory-match/` 를 1차 제안했으나, 저장소 루트 직속 모듈 관례(`counter/`, `number-guess/`)와의 일관성을 우선한다면 dev 가 다른 배치를 택할 수 있다. 본 문서의 함수/마크업 계약은 배치 경로와 무관하게 유효하다.

---

*문서 종료 — [박기획] · BF-917*

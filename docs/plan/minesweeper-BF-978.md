# 지뢰찾기(Minesweeper) 기획 명세 — BF-978

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-978(본 planner task) · 형제 task BF-980(designer) · BF-982(developer) · BF-986(tester)
> 신규 모듈: `phase18-games/minesweeper/`
> 대상 라우트: `/phase18-games/minesweeper`(= 저장소 `phase18-games/minesweeper/index.html`, 신규 디렉터리 — §0 가정 1)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의
> 단위 테스트: `node --test tests/minesweeper-*.test.js` (focused scope · module: `minesweeper`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 경로 컨벤션(`phase18-games/minesweeper/`):** 저장소에는 신규 모듈 경로 컨벤션이 두 가지 공존한다 — 저장소 루트 직속(`number-guess/`, `dice/`, `game-2048/`, `tetris/` 등, 초기 세대)과 `phase18-games/` 하위(`phase18-games/{breakout,breakout-lite,memory-match,pong,simon-says,snake}/`, 최근 세대). 본 task는 라우트를 명시하지 않았으나, **가장 최근·최다 선례**인 `phase18-games/` 계열(특히 동일하게 완전 신규였던 `phase18-games/memory-match/`, BF-916/917)을 따라 `phase18-games/minesweeper/`(`index.html`/`styles.css`/`logic.js`/`main.js`)를 1차 제안 경로로 확정한다. 최종 파일 분할·배치는 dev 재량이며, 본 문서 §5~§6의 계약은 배치 경로와 무관하게 유효하다.

**가정 2 — 산출물 경로는 `docs/plan/`:** 본 task의 File Ownership 범위가 `docs/plan/**`로 고정되어 있으므로 본 문서는 `docs/plan/minesweeper-BF-978.md`에 위치한다. 후속 designer(BF-980)/developer(BF-982)/tester(BF-986) 산출물은 본 문서를 SSOT로 참조한다.

**가정 3 — 난이도 3종 프리셋(고전 Windows 지뢰찾기 표준값 채택):** Epic 설명은 "난이도"만 언급하고 구체 수치를 명시하지 않는다. 신규 수치를 추측성으로 발명하는 대신, 업계 표준(고전 Windows 지뢰찾기)의 3단계 값을 그대로 채택한다 — 초급 9×9/지뢰 10개, 중급 16×16/지뢰 40개, 고급 30×16/지뢰 99개(§2.1). 페이지 로드 시 기본값은 **초급**이다.

**가정 4 — 첫 클릭 안전 규칙(안전구역 = 클릭 셀 + 8방향 인접 셀):** Epic은 "첫 클릭 안전 규칙"만 언급하고 범위를 특정하지 않는다. 클릭한 셀 1칸만 안전 처리하는 최소 규칙 대신, **클릭 셀과 그 8방향 인접 셀(최대 9칸)을 지뢰 배치 제외 영역으로 지정**하는 방식을 채택한다(§2.3) — 고전 지뢰찾기 구현에서 흔히 쓰이는 규칙이며, 첫 클릭이 곧바로 무의미한 숫자 1칸만 여는 것을 피하고 최소한의 개활지(open area)를 보장해 UX가 개선된다. 안전구역 확보가 불가능한 극단적 설정(지뢰 밀도가 매우 높은 커스텀 보드)에 대한 폴백은 §10 EC-02에서 정의한다.

**가정 5 — 승리 조건은 "비지뢰 셀 전부 오픈" 기준(플래그 전부 일치 기준 아님):** 지뢰를 전부 정확히 flag해야 승리로 판정하는 방식은 오탐(비지뢰 셀에 flag) 처리가 복잡해지고, 고전 구현 다수가 "지뢰가 아닌 모든 셀이 open 상태"를 승리 조건으로 채택한다(§2.6). 본 문서도 동일하게 채택 — 지뢰에 flag를 걸지 않고도 나머지를 전부 열면 승리한다.

**가정 6 — 남은 지뢰 카운터는 필수, 경과 시간 타이머는 v1 비범위:** "남은 지뢰 수(= 전체 지뢰 수 − 현재 flag 수)" 표시는 플래그 토글 AC와 직결되므로 §2.7·§9 AC-07에 필수 요건으로 포함한다. 반면 경과 시간 타이머는 Epic이 언급하지 않아 v1 비범위(§11)로 명확히 배제한다 — 필요 시 별도 스토리.

**가정 7 — 키보드 내비게이션은 방향키 기반 그리드 이동(roving tabindex, WAI-ARIA grid 패턴) 채택:** 초급도 81칸(9×9), 고급은 480칸(30×16)에 달해 `Tab` 단일 이동만으로는 실질적 조작이 불가능한 규모다. 따라서 보드 그리드 내부는 방향키(←↑→↓)로 포커스를 이동하고, `Tab`은 그리드에 진입/이탈하는 단일 정지점으로 취급하는 roving tabindex 패턴을 채택한다(§7.1). 이는 16칸에 그쳐 `Tab` 순서만으로 충분했던 `memory-match`(BF-916) 선례와의 의도적 차이이며, 보드 규모 차이에 근거한 결정이다.

**가정 8 — 완전 신규(forward) 모듈:** `phase18-games/minesweeper/` 디렉터리·코드·테스트, `docs/plan/minesweeper-*.md`·`docs/design/minesweeper-*.md` 문서는 현재 저장소에 0건 존재한다(사전 확인 완료: `find . -iname "*minesweeper*"` 결과 없음). 본 문서는 아직 존재하지 않는 UI 모듈의 최초 스펙을 정의하는 forward 설계 문서다.

**가정 9 — 파일 소유권:** 본 planner task(BF-978)의 담당 파일은 `docs/plan/minesweeper-BF-978.md` 1개뿐이다. `phase18-games/minesweeper/*` 코드, `docs/design/minesweeper-*.md` 시각 명세는 후속 designer(BF-980)/developer(BF-982) 담당 영역이며 본 task에서 생성·수정하지 않는다.

---

## 목차

1. [개요 및 라우트 정보](#1-개요-및-라우트-정보)
2. [게임 규칙](#2-게임-규칙)
3. [상태 모델](#3-상태-모델)
4. [사용자 시나리오 및 UX 흐름](#4-사용자-시나리오-및-ux-흐름)
5. [파일 구조 및 모듈 경계](#5-파일-구조-및-모듈-경계)
6. [순수 함수 Contract](#6-순수-함수-contract)
7. [접근성 요구 — 키보드 조작](#7-접근성-요구--키보드-조작)
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

직사각형 그리드에 무작위로 지뢰를 배치하고, 사용자가 셀을 열어(open) 인접 지뢰 수를 단서로 안전한 칸을 모두 찾아내는 지뢰찾기 게임을 바닐라 HTML/CSS/JS로 구현한다. 서버 저장·인증·외부 API·신규 패키지 없이 클라이언트 in-memory 상태만으로 동작하며, 마우스뿐 아니라 키보드만으로도 모든 조작(셀 이동·열기·플래그 토글)이 가능해야 한다.

### 1.2 완료 조건 (Definition of Done)

| # | 완료 조건 |
|---|---|
| 1 | 페이지 로드 시 초급(9×9, 지뢰 10개) 보드가 전체 `hidden` 상태로 표시되고, 남은 지뢰 수는 10으로 표시된다 |
| 2 | 난이도(초급/중급/고급)를 선택하면 해당 규격(§2.1)으로 보드가 즉시 재초기화된다 |
| 3 | 첫 번째 셀 열기 시점에만 지뢰가 배치되며, 클릭 셀과 그 8방향 인접 셀에는 지뢰가 배치되지 않는다(§2.3) |
| 4 | 인접 지뢰가 0개인 셀을 열면 연쇄적으로 인접한 0칸·경계 숫자칸이 모두 자동으로 열린다(flood fill, §2.5) |
| 5 | 지뢰가 아닌 모든 셀을 열면 승리, 지뢰 셀을 열면 패배로 판정되고 게임이 즉시 종료(입력 잠금)된다(§2.6) |
| 6 | 셀에 플래그를 토글할 수 있고, 남은 지뢰 수 표시가 플래그 개수에 따라 실시간 갱신된다(§2.7) |
| 7 | 방향키로 보드 내 셀 간 포커스 이동, `Enter`/`Space`로 셀 열기, 전용 키로 플래그 토글이 전부 마우스 없이 가능하다(§7) |
| 8 | 서버 저장·인증·외부 API 호출·신규 패키지 설치·`localStorage` 영속화가 0건이다 |

### 1.3 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `phase18-games/minesweeper/`(`index.html`/`styles.css`/`logic.js`/`main.js`) — §0 가정 1, 최종 분할은 dev 재량 |
| 기존 코드 영향 | 없음 — 완전 독립 신규 모듈 |
| 데이터 원천 | **없음** — 클라이언트 in-memory 상태만 사용 |
| 외부 라이브러리 | 없음 — `file://` 프로토콜 직접 열기 가능 |
| 영속 저장 | 없음(v1) — 새로고침·난이도 변경 시 항상 초기 상태로 재시작 |

### 1.4 라우트 및 페이지 정보

| 항목 | 값 |
|---|---|
| 라우트 | `/phase18-games/minesweeper` (= 저장소 `phase18-games/minesweeper/index.html`) |
| 페이지 명(`<title>`) | `지뢰찾기 · /phase18-games/minesweeper` |
| 화면 타이틀(`<h1>`) | `지뢰찾기` |
| 데이터 의존성 | **없음** — 서버/DB/외부 API/인증 미사용, 클라이언트 in-memory 상태만 |

### 1.5 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전) 또는 Node.js(`node --test`)로 순수 함수(지뢰 배치·인접수 계산·오픈·flood fill·플래그) 단위 테스트
- `phase18-games/minesweeper/` 디렉터리는 아직 존재하지 않으며 본 task 이후 별도 designer(BF-980)/developer(BF-982) task에서 신규 생성됨
- 순수 함수는 UMD 패턴으로 작성되어 Node(CommonJS) + 브라우저(`globalThis`) 양쪽에서 로드 가능해야 함(기존 `phase18-games/memory-match/logic.js`와 동일 컨벤션)

---

## 2. 게임 규칙

### 2.1 보드 구성 및 난이도

| 난이도 | 보드 크기(열×행) | 지뢰 수 | 총 셀 수 | 지뢰 밀도 |
|---|---|---|---|---|
| 초급(beginner) — **기본값** | 9×9 | 10 | 81 | 약 12.3% |
| 중급(intermediate) | 16×16 | 40 | 256 | 약 15.6% |
| 고급(expert) | 30×16 | 99 | 480 | 약 20.6% |

- 난이도는 페이지 상단 컨트롤(버튼 또는 select)로 언제든 전환 가능하다. 전환 시 진행 중이던 게임은 완전히 폐기되고 §2.1 규격에 맞는 새 보드가 `ready` 상태(§3.2)로 재생성된다(§10 EC-09).
- 초기 셀 상태는 전부 `hidden`(지뢰 미배치 상태, §2.3).

### 2.2 좌표계

- 셀은 `(row, col)` 0-index 좌표로 식별한다(`row`: 0~rows-1, `col`: 0~cols-1).
- 인접 셀은 8방향(상하좌우 + 대각선)이며, 보드 경계를 벗어나는 방향은 존재하지 않는 것으로 취급한다(wrap 없음, §10 EC-08).

### 2.3 지뢰 배치 및 첫 클릭 안전 규칙

- 지뢰는 **첫 번째 셀 열기(open) 시점에만** 배치된다(페이지 로드/난이도 전환 직후에는 지뢰가 아직 없다, `minesPlaced=false`).
- 안전구역 = 최초로 클릭된 셀 `(r, c)` + 그 8방향 인접 셀(보드 경계에 걸리면 실제 존재하는 셀만, 최대 9칸, 최소 4칸(코너))(§0 가정 4).
- 지뢰 배치는 "안전구역을 제외한 전체 셀 목록"에서 `mineCount`개를 무작위로 선택(Fisher-Yates 셔플 기반)한다. 결정적 테스트를 위해 `rng` 함수를 주입할 수 있어야 한다(기본 `Math.random`).
- 지뢰 배치 직후 모든 셀의 `adjacentMines`(0~8, 8방향 지뢰 개수)를 계산한다.
- 안전구역 확보가 불가능한 경우(지뢰 수가 "총 셀 수 − 안전구역 크기"를 초과)의 폴백 규칙은 §10 EC-02에서 정의한다.

### 2.4 셀 열기(open)

| 조건 | 결과 |
|---|---|
| `hidden` 셀을 open | 지뢰 미배치 상태였다면 먼저 §2.3 규칙으로 지뢰를 배치한 뒤, 해당 셀을 `revealed`로 전환. `game.status`가 `ready`였다면 `playing`으로 전환 |
| `flagged` 셀을 open 시도 | **무시(no-op)** — 플래그가 걸린 셀은 열리지 않는다(먼저 플래그를 해제해야 함, §10 EC-04) |
| 이미 `revealed` 셀을 open 시도 | **무시(no-op)** |
| 연 셀이 지뢰(`isMine===true`) | `game.status='lost'`로 즉시 전환, §2.6 패배 처리 수행 |
| 연 셀이 지뢰가 아니고 `adjacentMines===0` | flood fill 연쇄 오픈 수행(§2.5) |
| 연 셀이 지뢰가 아니고 `adjacentMines>0` | 해당 셀만 `revealed`로 전환(연쇄 없음), 숫자 표시 |

### 2.5 연쇄 오픈(flood fill) 규칙

- 시작 셀의 `adjacentMines===0`일 때만 flood fill이 트리거된다.
- 알고리즘: 시작 셀에서 BFS/DFS로 8방향 인접 셀을 탐색하며, 방문한 셀이 `hidden` 상태이면 `revealed`로 전환한다.
  - 전환된 셀의 `adjacentMines===0`이면 그 셀의 8방향 인접 셀도 계속 큐/스택에 추가해 탐색을 이어간다.
  - 전환된 셀의 `adjacentMines>0`이면 그 셀은 열되(숫자 표시), 그 셀을 기준으로 더 이상 인접 탐색을 확장하지 않는다(경계 숫자칸에서 확산 정지).
- **`flagged` 상태의 셀은 flood fill 대상에서 제외한다** — 사용자가 걸어둔 플래그를 자동으로 열지 않고 그대로 보존한다(§10 EC-07).
- 이미 `revealed`인 셀은 재방문하지 않는다(무한 루프 방지).

### 2.6 승/패 판정

| 판정 | 조건 | 처리 |
|---|---|---|
| **패배(lost)** | `hidden` 지뢰 셀을 open | `game.status='lost'`, 클릭된 지뢰 셀을 "폭발(exploded)" 셀로 표시(`explodedCellIndex` 기록), **모든 지뢰 셀을 `revealed`로 전환**해 전체 지뢰 위치를 공개, 이후 모든 셀 open·플래그 토글 입력은 무시(입력 잠금, §9 AC-10) |
| **승리(won)** | 지뢰가 아닌 모든 셀이 `revealed` 상태(= `revealedSafeCount === totalCells - mineCount`) | `game.status='won'`, 아직 `hidden`인 지뢰 셀 전부를 `flagged`로 자동 전환(완료 표시), 이후 모든 셀 open·플래그 토글 입력은 무시(입력 잠금, §9 AC-10) |

- 승/패 판정은 매 open 처리 직후 1회 수행한다(§6.1 `openCell` 반환 계약).
- 플래그를 지뢰에 정확히 거는 것은 승리 조건이 **아니다**(§0 가정 5) — 지뢰가 아닌 셀을 전부 여는 것이 유일한 승리 조건이다.

### 2.7 플래그 토글

| 조건 | 결과 |
|---|---|
| `hidden` 셀에 플래그 토글 | `flagged`로 전환, `flaggedCount += 1` |
| `flagged` 셀에 플래그 토글 | `hidden`으로 복귀, `flaggedCount -= 1` |
| `revealed` 셀에 플래그 토글 시도 | **무시(no-op)** |
| `game.status`가 `ready`/`playing`이 아닐 때(`won`/`lost`) 플래그 토글 시도 | **무시(no-op)**(§9 AC-10) |
| 남은 지뢰 수 표시 | `mineCount - flaggedCount` — **음수 허용**(사용자가 실제 지뢰 수보다 많이 flag한 경우, §10 EC-05). 지뢰 배치 전(`minesPlaced=false`)에도 `mineCount`(난이도 고정값)를 기준으로 표시 |
| 최초 open 이전(`minesPlaced=false`) 상태에서 플래그 토글 | 허용됨 — 지뢰 배치 여부와 무관하게 `hidden` 셀에는 언제든 플래그를 걸 수 있다 |

---

## 3. 상태 모델

### 3.1 셀 단위 상태 (`cell.state`)

| 상태 | 의미 | 다음 가능 상태 |
|---|---|---|
| `hidden` | 미확인(기본) | `revealed`(open) / `flagged`(플래그 토글) |
| `flagged` | 사용자가 지뢰로 추정해 표시 | `hidden`(플래그 재토글) — `revealed`로 직접 전환되지 않음(먼저 플래그 해제 필요, §2.4) |
| `revealed` | 열림(지뢰면 폭발 표시, 아니면 숫자 또는 빈칸) | (종단 상태) |

### 3.2 게임 단위 상태 (`game.status`)

| 상태 | 의미 | 입력 처리 |
|---|---|---|
| `ready` | 페이지 로드/난이도 전환 직후, 지뢰 미배치(`minesPlaced=false`) | 셀 open 허용(최초 open 시 지뢰 배치 + `playing` 전환), 플래그 토글 허용 |
| `playing` | 진행 중, 첫 셀이 열린 이후 | 셀 open·플래그 토글 모두 허용(§2.4, §2.7) |
| `won` | 지뢰 아닌 모든 셀 `revealed` | 모든 입력 무시(§2.6, §9 AC-10) — 난이도 재선택/재시작만 유효 |
| `lost` | 지뢰 셀 open | 모든 입력 무시(§2.6, §9 AC-10) — 난이도 재선택/재시작만 유효 |

### 3.3 상태 전이 다이어그램

```
[ready] --(hidden 셀 open: 지뢰 배치 + 오픈)--> [playing]
[ready] --(hidden 셀 플래그 토글)--> [ready] (상태 유지, flaggedCount 갱신)
[playing] --(hidden 셀 open, 지뢰 아님, adjacentMines>0)--> [playing] (해당 셀만 revealed)
[playing] --(hidden 셀 open, 지뢰 아님, adjacentMines===0)--> [playing] (flood fill 연쇄 오픈)
[playing] --(hidden 셀 open, 지뢰)--> [lost] (전체 지뢰 공개, 입력 잠금)
[playing] --(open 결과 비지뢰 셀 전부 revealed)--> [won] (남은 지뢰 자동 flag, 입력 잠금)
[playing] --(hidden↔flagged 토글)--> [playing] (상태 유지, flaggedCount 갱신)
[playing] --(flagged 셀 open 시도)--> 무변화(no-op)
[revealed 셀에 open/플래그 재시도]--> 무변화(no-op)
[won 또는 lost] --(open/플래그 시도)--> 무변화(no-op, 입력 잠금)
[any state] --(난이도 재선택)--> [ready] (신규 규격 보드, 지뢰 미배치, flaggedCount=0)
```

### 3.4 게임 상태 객체 구조 (참조용)

```javascript
{
  status: 'ready' | 'playing' | 'won' | 'lost',
  difficulty: 'beginner' | 'intermediate' | 'expert',
  cols: 9,
  rows: 9,
  mineCount: 10,
  minesPlaced: false,        // 최초 open 이전엔 false
  cells: [
    // 길이 cols*rows, 인덱스 = row*cols+col
    { row: 0, col: 0, isMine: false, adjacentMines: 0, state: 'hidden' },
    // ...
  ],
  revealedSafeCount: 0,       // 지뢰 아닌 셀 중 revealed 개수 (승리 판정 기준)
  flaggedCount: 0,
  explodedCellIndex: null     // 패배 시 클릭된 지뢰 셀 인덱스, 그 외 null
}
```

---

## 4. 사용자 시나리오 및 UX 흐름

### 4.1 정상 플레이 흐름 (Happy Path — 승리)

```
[게임 시작]
  └─ 페이지 로드 → 초급(9×9/지뢰10) ready 상태, 전체 hidden, 남은 지뢰 10 표시

[첫 클릭]
  └─ 임의 셀 open → 지뢰 배치(클릭 셀+8방향 제외) → adjacentMines 전체 계산 → status: ready→playing
      └─ adjacentMines===0 이면 flood fill로 개활지 자동 확장

[반복 플레이]
  └─ 숫자를 단서로 안전한 셀을 계속 open (0칸은 자동 연쇄, 숫자칸은 단일 오픈)
  └─ 지뢰로 추정되는 셀에 플래그 토글 → 남은 지뢰 수 실시간 갱신

[승리]
  └─ 지뢰 아닌 모든 셀이 revealed → status: playing→won → 남은 hidden 지뢰 전부 자동 flag → 입력 잠금
```

### 4.2 패배 흐름

```
[진행 중 실수]
  └─ hidden 지뢰 셀 open → status: playing→lost
      └─ 클릭한 지뢰 셀 exploded 표시, 나머지 지뢰 전부 revealed(전체 공개)
      └─ 입력 잠금 — 이후 open/플래그 토글 전부 무시
```

### 4.3 화면 표시 요소 요약

| 요소 | 표시 규칙 |
|---|---|
| 난이도 선택 컨트롤 | 초급/중급/고급 전환(버튼 또는 select), 항상 활성 |
| 보드 그리드 | `cols×rows` 셀, `cell.state`에 따라 미확인/깃발/숫자/빈칸/지뢰 스타일로 표시 |
| 남은 지뢰 수 | "남은 지뢰: N" 형식, `mineCount - flaggedCount` 값과 실시간 동기화(음수 가능, §2.7) |
| 승리/패배 배너 | `won`/`lost` 상태에서만 표시, 재시작(현재 난이도로 재생성) 버튼 포함 |
| 재시작 버튼 | 항상 표시·활성 — 현재 난이도로 `ready` 상태 새 보드 재생성(난이도 전환과 동일 효과) |

---

## 5. 파일 구조 및 모듈 경계

### 5.1 파일 목록 (제안 — 최종 배치·분할은 dev 재량, §0 가정 1)

```
phase18-games/minesweeper/
├── index.html   ← 마크업(난이도 컨트롤 + 보드 그리드 + 남은 지뢰 수 + 재시작 버튼) + 스크립트 로드
├── styles.css   ← 시각 스타일(designer 담당, BF-980)
└── logic.js     ← 지뢰 배치·인접수 계산·오픈·flood fill·플래그 순수 로직 + DOM 바인딩(developer 담당, BF-982, 필요 시 main.js로 분할 가능)

tests/
└── minesweeper-<dev-task-id>.test.js   ← createBoard/placeMines/openCell/toggleFlag 등 순수 로직 단위 테스트 (node --test)
```

### 5.2 모듈 책임 분리

#### `index.html`
- 난이도 선택 컨트롤(`<div role="radiogroup">` 또는 `<select id="difficulty">`)
- 보드 그리드 컨테이너(`<div id="board" role="grid">`), 각 셀은 네이티브 `<button>` 요소(`role="gridcell"` 부모의 `role="row"` 내부, §7.1 근거)
- 남은 지뢰 수 표시 영역(`<output id="mine-counter">`)
- 재시작 버튼(`<button id="restart-btn">`), 항상 활성
- 승리/패배 배너 영역(`<div id="result-banner" hidden>`)
- `styles.css`, 로직 스크립트 순서로 로드, 외부 CDN 금지 — `file://` 직접 실행 가능

#### `styles.css`
- 레이아웃(CSS Grid, `cols×rows` 동적 크기 대응 — 고급 난이도 30열까지 스크롤 없이 또는 적절한 컨테이너 스크롤로 대응은 designer 재량)
- 컬러 팔레트, 타이포그래피(자체 CSS 변수 정의)
- 셀 상태별 스타일(`data-state="hidden|flagged|revealed"`, 지뢰/폭발/숫자 1~8 색상 구분)
- 포커스 링(`:focus-visible`) 스타일 필수 포함(§7.1)

#### `logic.js` (+ 필요 시 `main.js` 분할)
- 책임 #1: 순수 함수 `createBoard`/`placeMines`/`openCell`/`toggleFlag`/`countAdjacentMines` 정의·export(§6)
- 책임 #2: DOM 이벤트 바인딩(셀 클릭·우클릭·키 입력, 난이도 전환, 재시작 버튼)
- 책임 #3: roving tabindex 관리(포커스된 셀만 `tabindex="0"`, 나머지 `tabindex="-1"`, §7.1)
- 책임 #4: 우클릭(`contextmenu`)으로 플래그 토글 + 키보드 동등 조작(§7.1) 제공
- `localStorage` 등 영속화 로직 사용 금지(v1 in-memory 단발)

---

## 6. 순수 함수 Contract

### 6.1 시그니처

```javascript
/**
 * 난이도 프리셋 상수
 */
const DIFFICULTIES = {
  beginner: { cols: 9, rows: 9, mineCount: 10 },
  intermediate: { cols: 16, rows: 16, mineCount: 40 },
  expert: { cols: 30, rows: 16, mineCount: 99 },
};

/**
 * 지뢰 미배치 초기 보드 생성
 * @param {'beginner'|'intermediate'|'expert'} difficulty
 * @returns {object} §3.4 게임 상태 객체(status:'ready', minesPlaced:false, 전체 cell.state='hidden')
 */
function createBoard(difficulty) { ... }

/**
 * 안전구역(클릭 셀 + 8방향 인접 셀)을 제외하고 지뢰를 배치, 전체 셀의 adjacentMines 계산
 * @param {object} state createBoard() 반환값(minesPlaced:false)
 * @param {number} row 최초 클릭 셀 행
 * @param {number} col 최초 클릭 셀 열
 * @param {() => number} [rng] 0~1 난수 생성기(테스트 시 결정적 함수 주입 가능, 기본 Math.random)
 * @returns {object} 새 상태(불변 — 원본 미변경) — minesPlaced:true, 모든 cell.isMine/adjacentMines 확정.
 *   안전구역 확보 불가 시 폴백 규칙은 §10 EC-02 참고
 */
function placeMines(state, row, col, rng) { ... }

/**
 * 셀 열기(open) — 최초 호출 시 지뢰 배치를 내부적으로 트리거하고, flood fill·승패 판정까지 처리
 * @param {object} state 현재 게임 상태
 * @param {number} row
 * @param {number} col
 * @param {() => number} [rng] placeMines에 전달할 난수 생성기(최초 open일 때만 사용)
 * @returns {object} 새 게임 상태(불변)
 *   - status가 'won'/'lost'이면 상태 변화 없음(no-op, §9 AC-10)
 *   - 대상 셀이 flagged이거나 이미 revealed면 상태 변화 없음(no-op, §2.4)
 *   - 지뢰 open: status='lost', 전체 지뢰 revealed, explodedCellIndex 기록
 *   - adjacentMines===0: flood fill 연쇄 오픈(§2.5, flagged 셀 제외)
 *   - 오픈 결과 비지뢰 셀 전부 revealed: status='won', 남은 hidden 지뢰 전부 flagged로 전환
 */
function openCell(state, row, col, rng) { ... }

/**
 * 셀 플래그 토글
 * @param {object} state 현재 게임 상태
 * @param {number} row
 * @param {number} col
 * @returns {object} 새 게임 상태(불변)
 *   - status가 'won'/'lost'이면 상태 변화 없음(no-op)
 *   - 대상 셀이 revealed면 상태 변화 없음(no-op)
 *   - hidden↔flagged 토글, flaggedCount 증감
 */
function toggleFlag(state, row, col) { ... }
```

### 6.2 반환 값 Contract 요약표

| 함수 | 조건 | 결과 |
|---|---|---|
| `createBoard(difficulty)` | 항상 | `cols×rows` 셀 전부 `hidden`/`isMine:false`/`adjacentMines:0`, `status='ready'`, `minesPlaced=false` |
| `placeMines(state, r, c, rng)` | 정상(안전구역 확보 가능) | 지뢰 `mineCount`개 배치, 클릭 셀·8방향 인접 셀은 지뢰 아님 보장, 전체 `adjacentMines` 확정 |
| `placeMines(state, r, c, rng)` | 안전구역 확보 불가(§10 EC-02) | 폴백: 클릭 셀 1칸만 제외하고 배치 |
| `openCell(state, r, c)` | `status∈{'won','lost'}` | no-op |
| `openCell(state, r, c)` | 대상 `flagged` 또는 `revealed` | no-op |
| `openCell(state, r, c)` | `minesPlaced===false`(최초 open) | 내부적으로 `placeMines` 수행 후 오픈 처리, `status`가 `ready`→`playing` |
| `openCell(state, r, c)` | 대상이 지뢰 | `status='lost'`, `explodedCellIndex=index(r,c)`, 전체 지뢰 `revealed` |
| `openCell(state, r, c)` | 대상 `adjacentMines===0` | flood fill로 연결된 0칸 + 경계 숫자칸 전부 `revealed`(§2.5) |
| `openCell(state, r, c)` | 대상 `adjacentMines>0` | 해당 셀만 `revealed` |
| `openCell(state, r, c)` | 오픈 후 `revealedSafeCount===totalCells-mineCount` | `status='won'`, 남은 `hidden` 지뢰 전부 `flagged` |
| `toggleFlag(state, r, c)` | `status∈{'won','lost'}` | no-op |
| `toggleFlag(state, r, c)` | 대상 `revealed` | no-op |
| `toggleFlag(state, r, c)` | 대상 `hidden` | `flagged` 전환, `flaggedCount+=1` |
| `toggleFlag(state, r, c)` | 대상 `flagged` | `hidden` 전환, `flaggedCount-=1` |

### 6.3 부작용 (Side Effects)

- **없음** — `createBoard`/`placeMines`(주입된 `rng` 호출 제외)/`openCell`/`toggleFlag` 모두 순수 함수. DOM 조작·전역 상태 변경 없음. flood fill·승패 판정은 `openCell` 내부에서 동기적으로 완결되며 별도 비동기 처리 불필요(연출 지연이 필요하면 UI 레이어(`main.js`) 재량).

### 6.4 Export 방식 (테스트 호환)

기존 `phase18-games/memory-match/logic.js`와 동일한 UMD 패턴을 사용한다:

```javascript
// phase18-games/minesweeper/logic.js — UMD 패턴 (Node ESM/CJS + 브라우저 <script> 양쪽 호환)
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MinesweeperLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var DIFFICULTIES = { /* §6.1 */ };
  function createBoard(difficulty) { /* §6.1 */ }
  function placeMines(state, row, col, rng) { /* §6.1 */ }
  function openCell(state, row, col, rng) { /* §6.1 */ }
  function toggleFlag(state, row, col) { /* §6.1 */ }
  return { DIFFICULTIES, createBoard, placeMines, openCell, toggleFlag };
});
```

테스트 파일에서는 `require('../phase18-games/minesweeper/logic.js')`(또는 저장소 기존 모듈들의 실제 import 관례를 그대로 따름)로 가져온다.

---

## 7. 접근성 요구 — 키보드 조작

> 본 절은 task 수용 기준("포커스 이동·오픈·플래그 키맵이 명세에 포함된다")에 직접 대응한다.

### 7.1 키보드 조작 요건

| 요건 | 상세 | 검증 방법 |
|---|---|---|
| 보드 진입/이탈 | `Tab`/`Shift+Tab`으로 보드 그리드 전체를 **단일 정지점**으로 진입·이탈(roving tabindex — 그리드 내 정확히 1개 셀만 `tabindex="0"`, 나머지는 `tabindex="-1"`, WAI-ARIA grid 패턴) | 정적 마크업 검사: 임의 시점에 `tabindex="0"`인 `.cell` 요소가 정확히 1개인지 확인 |
| 셀 간 포커스 이동 | 방향키(`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`)로 포커스를 인접 셀로 이동. 그리드 경계에서 바깥쪽으로 이동 시도 시 포커스 이동 없음(wrap 없음, §10 EC-10) | 브라우저 E2E: 코너 셀 포커스 후 경계 밖 방향키 입력 → 포커스 유지 관찰 |
| 셀 열기(open) 키 | 포커스된 셀에서 `Enter` 또는 `Space` → 마우스 클릭과 동일하게 `openCell` 호출(§2.4 no-op 조건 동일 적용) | 브라우저 E2E: 셀 포커스 후 키 입력 → `revealed` 전환 관찰 |
| 플래그 토글 키 | 포커스된 셀에서 `F` 키 → 마우스 우클릭과 동일하게 `toggleFlag` 호출(§2.7 no-op 조건 동일 적용) — 우클릭은 별도 마우스 조작(`contextmenu` 이벤트, 기본 컨텍스트 메뉴는 `preventDefault`)으로도 제공하되 `F` 키가 키보드 전용 사용자의 필수 대체 수단 | 브라우저 E2E: 셀 포커스 후 `F` 입력 → `flagged` 전환 관찰 |
| `won`/`lost` 상태 입력 잠금 시 포커스 유지 | 게임 종료 후에도 셀에 `disabled` 속성을 부여하지 않는다(포커스 이탈 방지) — 대신 클릭/키 핸들러 내부에서 `status` 가드로 무시(§3.2) | 정적 코드 검사: 게임 종료 처리 분기에 `disabled=true` 대입이 없는지 코드 리뷰 |
| 난이도 컨트롤·재시작 버튼 | 네이티브 `<button>`(또는 `<select>`) 요소, `Tab` 순서로 도달 가능, `Enter`/`Space`(또는 `select`는 방향키)로 활성화 | 정적 마크업 검사 |
| 포커스 가시성 | `:focus-visible` 스타일이 셀·난이도 컨트롤·재시작 버튼 어디에서도 `outline: none`으로 완전히 제거되지 않음 | 정적 코드 검사: `styles.css`에 `outline:\s*none`이 대응 커스텀 포커스 스타일 없이 단독 사용되지 않는지 확인(designer 산출물 리뷰 항목) |
| 초기 포커스 | 페이지 로드 또는 난이도 전환 직후 보드의 `(0,0)` 셀이 roving tabindex의 활성 셀(`tabindex="0"`)이 된다(자동 포커스 이동 자체는 강제하지 않음 — 스크린리더 방해 가능성 고려, §12 재량) | 정적 코드 검사 |
| 승리/패배 시 포커스 이동 | `won`/`lost` 전환 시 결과 배너(또는 재시작 버튼)로 포커스 이동 권장 — 필수는 아니나 스크린리더 사용자가 결과를 즉시 인지하도록 권장(§12 재량) | 수동/E2E 확인 |

### 7.2 스크린리더 지원

| 요건 | 상세 |
|---|---|
| 셀 상태 안내 | 각 셀 `aria-label`이 상태에 따라 갱신: `hidden` → "R행 C열, 미확인", `flagged` → "R행 C열, 깃발", `revealed`+숫자 → "R행 C열, 인접 지뢰 N개", `revealed`+빈칸(`adjacentMines===0`) → "R행 C열, 빈칸", `revealed`+지뢰 → "R행 C열, 지뢰"(패배 시 전체 공개 셀 포함), exploded 셀 → "R행 C열, 폭발한 지뢰" |
| 남은 지뢰 수 | `<output id="mine-counter">` 또는 `aria-live="polite"` 컨테이너로 값 변경 시 스크린리더 안내 |
| 승리/패배 알림 | 승리 시("모든 안전한 칸을 찾았습니다"), 패배 시("지뢰를 밟았습니다") `aria-live="assertive"` 영역으로 즉시 안내 |
| 보드 구조 | 보드 컨테이너에 `role="grid"`, 각 행에 `role="row"`, 각 셀에 `role="gridcell"`(셀 자체는 `<button>`으로 상호작용 제공, §7.1) |

---

## 8. 단위 테스트 전략

### 8.1 테스트 파일 위치 및 실행

```bash
# 실행 명령 (focused scope, module: minesweeper)
node --test tests/minesweeper-*.test.js
```

정확한 파일명(예: `tests/minesweeper-BF9xx.test.js`)은 후속 dev task 번호에 따라 결정되며, 위 glob 패턴에 매치되어야 한다.

### 8.2 테스트 대상

`createBoard`/`placeMines`/`openCell`/`toggleFlag` 순수 함수만 단위 테스트한다. DOM 인터랙션(클릭/키 이벤트/roving tabindex 렌더링)은 단위 테스트 범위에서 제외하고 후속 tester(BF-986) task의 E2E 가드로 다룬다.

### 8.3 필수 테스트 케이스

| 케이스 ID | 대상 | 시나리오 | 기대 결과 |
|---|---|---|---|
| TC-01 | `createBoard('beginner')` | 초기 생성 | `cols===9`, `rows===9`, `mineCount===10`, 전체 81칸 `state==='hidden'`, `minesPlaced===false` |
| TC-02 | `placeMines(state, r, c, rng)` | 결정적 `rng` 주입, 임의 클릭 좌표 | 정확히 `mineCount`개 `isMine===true`, 클릭 셀과 8방향 인접 셀은 전부 `isMine===false` |
| TC-03 | `placeMines` 이후 | 지뢰 배치 완료 상태 | 모든 셀의 `adjacentMines`가 실제 8방향 지뢰 개수와 일치(코너/경계 셀 포함, §10 EC-08) |
| TC-04 | `openCell` | `minesPlaced===false`(최초 open) | 내부적으로 지뢰 배치 후 오픈, `status`가 `'ready'`→`'playing'`, 클릭 셀 `state==='revealed'` |
| TC-05 | `openCell` | 대상 셀 `adjacentMines===0` | flood fill로 연결된 모든 0칸 + 경계 숫자칸이 `revealed`, 그 너머 숫자칸은 `hidden` 유지 |
| TC-06 | `openCell` | 대상 셀이 지뢰 | `status==='lost'`, `explodedCellIndex`가 해당 셀 인덱스, 전체 지뢰 셀 `state==='revealed'` |
| TC-07 | `openCell` | 대상 셀 `state==='flagged'` | 상태 변화 없음(no-op) |
| TC-08 | `openCell` | 대상 셀 `state==='revealed'`(재오픈) | 상태 변화 없음(no-op) |
| TC-09 | `openCell` | `status∈{'won','lost'}`인 상태에서 호출 | 상태 변화 없음(no-op) |
| TC-10 | `openCell` | 오픈 결과 비지뢰 셀 전부 `revealed` | `status==='won'`, 남은 `hidden` 지뢰 전부 `state==='flagged'`로 전환 |
| TC-11 | `toggleFlag` | `hidden` 셀 대상 | `state==='flagged'`, `flaggedCount+=1` |
| TC-12 | `toggleFlag` | `flagged` 셀 대상(재토글) | `state==='hidden'`, `flaggedCount-=1` |
| TC-13 | `toggleFlag` | `revealed` 셀 대상 | 상태 변화 없음(no-op) |
| TC-14 | `toggleFlag` | `status∈{'won','lost'}`인 상태에서 호출 | 상태 변화 없음(no-op) |
| TC-15 | flood fill 플래그 보존 | 0칸 연쇄 경로 내부에 사용자가 미리 `flagged`로 걸어둔 셀 존재 | 해당 셀은 flood fill 대상에서 제외되어 `flagged` 상태 그대로 유지(§2.5, §10 EC-07) |
| TC-16 | 안전구역 폴백 | 인위적으로 매우 작은 보드 + 높은 지뢰 밀도(안전구역 확보 불가) | `placeMines`가 예외를 던지지 않고 클릭 셀 1칸만 제외한 폴백으로 정상 배치 완료(§10 EC-02) |

### 8.4 테스트 파일 구조 (참조 템플릿)

```javascript
// tests/minesweeper-<dev-task-id>.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createBoard, placeMines, openCell, toggleFlag } = require('../phase18-games/minesweeper/logic.js');

function deterministicRng(seedSeq) {
  let i = 0;
  return () => seedSeq[i++ % seedSeq.length];
}

describe('placeMines', () => {
  it('TC-02: 안전구역(클릭 셀+8방향)에는 지뢰가 배치되지 않는다', () => {
    const board = createBoard('beginner');
    const placed = placeMines(board, 4, 4, deterministicRng([0.01, 0.5, 0.99, 0.2]));
    const mineCells = placed.cells.filter((c) => c.isMine);
    assert.equal(mineCells.length, 10);
    for (const c of mineCells) {
      const dr = Math.abs(c.row - 4);
      const dc = Math.abs(c.col - 4);
      assert.ok(dr > 1 || dc > 1, `(${c.row},${c.col})는 안전구역 내부여야 하는데 지뢰가 배치됨`);
    }
  });
});

describe('openCell / toggleFlag 흐름', () => {
  it('TC-04~TC-06: 최초 오픈부터 승패 판정까지', () => {
    let state = createBoard('beginner');
    state = openCell(state, 4, 4, deterministicRng([0.01, 0.5, 0.99, 0.2]));
    assert.equal(state.status, 'playing');
    assert.equal(state.minesPlaced, true);
  });
});
```

---

## 9. Acceptance Criteria (Given/When/Then)

### AC-01: 게임 시작 — 초기 보드 상태(난이도별 규격)

> **Given** 사용자가 `phase18-games/minesweeper/index.html`(`/phase18-games/minesweeper`)을 브라우저에서 열었을 때
> **When** 페이지 로드가 완료되면
> **Then** 초급 규격(9×9, 지뢰 10개)의 보드가 전체 `hidden` 상태로 표시되고, 남은 지뢰 수는 10으로 표시된다(§2.1, §1.2 DoD #1)

### AC-02: 난이도 전환 — 보드 규격 재적용

> **Given** 게임이 임의 상태(`ready`/`playing`/`won`/`lost`)일 때
> **When** 사용자가 중급 또는 고급 난이도를 선택하면
> **Then** 해당 규격(16×16/40개 또는 30×16/99개)으로 보드가 전체 `hidden`·`ready` 상태로 즉시 재초기화된다(§2.1, §10 EC-09)

### AC-03: 첫 클릭 안전 — 지뢰 배치 시점과 안전구역

> **Given** `minesPlaced===false`인 `ready` 상태 보드일 때
> **When** 사용자가 임의의 셀 `(r, c)`를 최초로 열면(open)
> **Then** 그 시점에 지뢰가 배치되며, `(r, c)`와 그 8방향 인접 셀에는 지뢰가 배치되지 않는다(§2.3)

### AC-04: 인접 지뢰 수 계산

> **Given** 지뢰가 배치 완료된 보드일 때
> **When** 임의의 지뢰 아닌 셀을 열면
> **Then** 표시되는 숫자는 해당 셀의 8방향 인접 셀 중 실제 지뢰 개수와 정확히 일치한다(코너·경계 셀은 실제 존재하는 인접 셀만 카운트, §10 EC-08)

### AC-05: 연쇄 오픈(flood fill)

> **Given** 사용자가 연 셀의 `adjacentMines===0`일 때
> **When** open 처리가 완료되면
> **Then** 그 셀과 8방향으로 연결된 모든 `adjacentMines===0` 셀, 그리고 그 경계에 인접한 숫자칸까지 전부 자동으로 `revealed` 되며, `flagged` 상태였던 셀은 자동으로 열리지 않고 그대로 유지된다(§2.5, §10 EC-07)

### AC-06: 승리 판정

> **Given** 지뢰가 아닌 셀 중 마지막 1개만 `hidden`으로 남아 있을 때
> **When** 사용자가 그 셀을 열면
> **Then** `status==='won'`으로 전환되고, 남아 있던 `hidden` 지뢰 셀 전부가 자동으로 `flagged`로 표시되며, 이후 모든 open/플래그 입력이 무시된다(§2.6, §9 AC-10)

### AC-07: 패배 판정 — 지뢰 클릭

> **Given** 게임이 `playing` 상태일 때
> **When** 사용자가 `hidden` 지뢰 셀을 열면
> **Then** `status==='lost'`로 전환되고, 클릭된 지뢰 셀이 폭발(exploded) 표시되며, 나머지 모든 지뢰 셀이 전체 공개(`revealed`)되고, 이후 모든 open/플래그 입력이 무시된다(§2.6, §9 AC-10)

### AC-08: 플래그 토글 및 남은 지뢰 수 갱신

> **Given** 게임이 `ready` 또는 `playing` 상태일 때
> **When** 사용자가 `hidden` 셀에 플래그를 토글하면(우클릭 또는 `F` 키)
> **Then** 해당 셀이 `flagged`로 전환되고, 남은 지뢰 수 표시가 `mineCount - flaggedCount`로 즉시 갱신된다. 같은 셀에 다시 토글하면 `hidden`으로 복귀하고 수치도 원복된다(§2.7)

### AC-09: 플래그된 셀은 직접 열리지 않음

> **Given** 어떤 셀이 `flagged` 상태일 때
> **When** 사용자가 그 셀을 열려고 시도하면(클릭 또는 `Enter`/`Space`)
> **Then** 아무 상태 변화도 일어나지 않는다(no-op) — 먼저 플래그를 해제해야 열 수 있다(§2.4)

### AC-10: 키보드만으로 전체 조작 가능

> **Given** 마우스를 사용하지 않는 사용자가 페이지에 진입한 상태일 때
> **When** `Tab`으로 보드에 진입한 뒤 방향키로 셀 간 포커스를 이동하고, `Enter`/`Space`로 셀을 열고, `F` 키로 플래그를 토글하면
> **Then** 대응하는 조작(포커스 이동·오픈·플래그)이 마우스 조작과 동일하게 실행되고, 어떤 조작도 마우스 없이 도달 불가능하지 않다(§7.1)

### AC-11: 게임 종료 후 입력 잠금

> **Given** `status`가 `won` 또는 `lost`로 전환된 직후일 때
> **When** 사용자가 아무 셀에 open 또는 플래그 토글을 시도하면
> **Then** 어떤 상태 변화도 일어나지 않는다(no-op) — 난이도 재선택 또는 재시작 버튼만 새 게임을 시작할 수 있다(§2.6, §3.2)

### 9.1 BF-978 수용 기준 ↔ 본 문서 매핑표

| BF-978 수용 기준 | 충족 근거 |
|---|---|
| Given 신규 게임 시작, When 보드 초기화, Then 지뢰 개수/보드 크기/난이도 규칙이 명세에 명확히 정의된다 | §2.1(난이도 3종 규격표) · §9 AC-01, AC-02 |
| Given 셀 오픈, When 인접 지뢰 0, Then 연쇄 오픈(flood fill) 동작이 명세에 기술된다 | §2.5(flood fill 알고리즘) · §9 AC-05 · §8.3 TC-05, TC-15 |
| Given 접근성 요구, When 키보드 조작, Then 포커스 이동·오픈·플래그 키맵이 명세에 포함된다 | §7.1(키맵 표: 방향키/Enter·Space/F) · §9 AC-10 |

---

## 10. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|---|---|---|
| EC-01 | 첫 클릭이 보드 코너(`(0,0)` 등)에서 발생 | 안전구역이 보드 경계에 걸려 실제 4칸(자신+대각선 인접 3칸)만 제외되고 나머지 지뢰 배치는 정상 진행(§2.3) |
| EC-02 | 지뢰 수가 "총 셀 수 − 안전구역 크기"를 초과하는 극단적 커스텀 설정(v1 표준 3난이도에서는 발생하지 않음) | `placeMines`는 예외를 던지지 않고 안전구역을 클릭 셀 1칸으로 축소하는 폴백을 적용해 배치를 완료한다(§2.3, §6.2, §8.3 TC-16) |
| EC-03 | 이미 `revealed`된 셀에 플래그 토글 시도 | 무시(no-op, §2.7) |
| EC-04 | `flagged` 셀을 열려는 시도(클릭 또는 `Enter`/`Space`) | 무시(no-op) — 플래그 해제가 선행되어야 함(§2.4, §9 AC-09) |
| EC-05 | 실제 지뢰 수보다 더 많은 셀에 플래그를 건 경우 | 남은 지뢰 수 표시가 음수로 내려갈 수 있다(예: 지뢰 10개 보드에 12개 flag → "남은 지뢰: -2") — 오류 아님, 승패 판정과 무관(§2.7, §0 가정 5) |
| EC-06 | 패배(`lost`) 시 사용자가 잘못 flag한 비지뢰 셀 처리 | 잘못된 flag는 그대로 유지되며 별도 "오답 표시" 스타일은 designer 재량(§12) — 로직 계약상 필수는 아님 |
| EC-07 | flood fill 확산 경로 중간에 사용자가 미리 걸어둔 `flagged` 셀이 존재 | 해당 셀은 열리지 않고 `flagged` 상태 그대로 보존되며, 그 셀을 통한 확산도 더 진행되지 않는다(§2.5, §8.3 TC-15) |
| EC-08 | 보드 가장자리/코너 셀의 인접 지뢰 계산 | 8방향 중 실제 보드 내에 존재하는 방향만 카운트(경계 밖은 존재하지 않는 것으로 취급, wrap 없음, §2.2, §8.3 TC-03) |
| EC-09 | 진행 중(`playing`) 게임에서 난이도를 재선택 | 진행 상태를 완전히 폐기하고 새 규격의 `ready` 상태 보드로 재생성 — 지뢰 미배치, `flaggedCount=0`(§2.1, §9 AC-02) |
| EC-10 | 키보드 포커스가 그리드 경계 셀에서 경계를 벗어나는 방향키 입력 | 포커스 이동 없음(wrap 없음) — 예: `(0,0)`에서 `ArrowUp`/`ArrowLeft` 입력 시 포커스 유지(§7.1) |
| EC-11 | `won` 판정 시점에 지뢰가 아닌데 아직 `flagged`로 잘못 표시된 셀이 있는 경우(비지뢰 오탐 flag) | 승리 조건은 "비지뢰 셀 전부 revealed" 기준이므로, 비지뢰 셀에 걸린 오탐 flag와 무관하게 승리 판정에 영향 없음 — 다만 오탐 flag가 걸린 비지뢰 셀은 정의상 아직 `revealed`가 아니므로, 실제로는 그 셀도 열려야 승리 조건이 충족된다(즉 오탐 flag가 남아있으면 그 셀을 직접 해제 후 열어야 승리 가능, §2.6 no-op 규칙과 §2.4 상호작용 확인용) |

---

## 11. 비범위 (Out of Scope)

| 항목 | 사유 |
|---|---|
| 경과 시간 타이머 | Epic 미언급 — v1 비범위(§0 가정 6). 필요 시 별도 스토리 |
| 코드(chord) 클릭(숫자칸 주변 flag 수가 일치할 때 나머지 인접 hidden 셀을 한 번에 오픈) | Epic이 요구하는 6개 규칙(배치/인접수/첫클릭안전/승패/플래그/키보드)에 포함되지 않음 — 별도 스토리 |
| `localStorage` 최고 기록·이어하기 | v1은 새로고침·난이도 전환 시 항상 초기 상태로 재시작 — 별도 스토리 |
| 커스텀 난이도(임의 보드 크기·지뢰 수 직접 입력) | v1은 3단계 표준 프리셋 고정(§2.1) — 별도 스토리 |
| 순위표(리더보드), 최고 기록 비교 | 저장소 의존성 — 별도 스토리 |
| 효과음 / 배경음악 | 별도 Epic |
| 잘못된 flag(비지뢰 셀 오탐)에 대한 전용 시각 표시(예: X 마커) | 로직 계약상 필수 아님, designer 재량(§12) |
| 모바일 터치 제스처(길게 눌러 플래그 토글 등) | v1은 클릭=open, 우클릭/`F`=플래그로 한정 — 터치 전용 대체 제스처는 별도 스토리 |
| 반응형 breakpoint 세부 최적화(특히 고급 난이도 30열 보드의 소형 화면 대응) | 레이아웃 재량은 designer(BF-980)에 위임, 본 문서는 로직·접근성 계약만 정의 |

---

## 12. 디자이너 위임 시각 요소

아래 항목은 기획에서 정하지 않고 디자이너(BF-980)에게 위임한다:

| 항목 | 가이드라인 |
|---|---|
| 셀 색상 팔레트(숫자 1~8, 미확인, 깃발, 지뢰, 폭발) | 고전 지뢰찾기 색상 관례(1=파랑, 2=초록, 3=빨강 등) 참고 가능하나 강제 아님, 색맹 대응을 위해 숫자 자체로 구분 가능해야 함(색상 단독 구분 지양) |
| 깃발/지뢰/폭발 아이콘 | 이모지/SVG/문자 등 재량(외부 이미지 자산 0건 제약 준수, vanilla-static) |
| 고급 난이도(30×16) 레이아웃 대응 | 셀 크기 축소, 가로 스크롤 컨테이너, 반응형 등 구체 전략 재량 |
| 잘못된 flag 시각 표시 여부(§11 비범위) | 추가할지 여부 및 스타일 재량 |
| 승리/패배 배너 연출 | 애니메이션·색상 등 재량 |
| 남은 지뢰 수·난이도 컨트롤 레이아웃 | "남은 지뢰: N" 형식 유지 위치 재량 |
| 컬러 팔레트·타이포그래피 | 신규 CSS 변수 자체 정의(기존 `phase18-games` 계열과의 톤 일관성은 권장이나 강제 아님) |
| 초기 자동 포커스 여부 | 페이지 로드 시 `(0,0)` 셀에 실제 브라우저 포커스를 자동으로 줄지 여부는 재량(스크린리더 방해 가능성 고려, §7.1) |

---

## 13. 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/plan/minesweeper-BF-978.md`(본 문서) |
| 신규 시각 명세(후속 designer task) | `docs/design/minesweeper-BF-980.md` — 미정, 본 문서 §12 위임 항목 기준 |
| 신규 구현 대상(후속 developer task) | `phase18-games/minesweeper/index.html`, `styles.css`, `logic.js`(+ 필요 시 `main.js`) — 최종 배치 미정(§0 가정 1), 본 문서 §2~§7이 계약(contract) |
| 신규 테스트 대상(후속 tester/developer task) | `tests/minesweeper-*.test.js` — 미정, 본 문서 §6~§8이 검증 기준 |
| 참조한 기존 선례 문서 | `docs/plan/memory-match-BF-916.md`(완전 신규 forward 모듈 문서 구조·가정 명시 방식·순수 함수 contract 패턴), `docs/design/memory-match-BF-916.md`·`docs/design/pong-BF-910.md`(`phase18-games` 경로 컨벤션) |

---

## 14. 남은 모호함 (운영자 확인 권장)

1. **첫 클릭 안전구역 범위**: §0 가정 4 참고 — "클릭 셀 + 8방향 인접 셀(최대 9칸)"을 채택했다. 더 보수적인 "클릭 셀 1칸만 안전" 규칙을 의도했다면 확인이 필요하다.
2. **승리 조건 기준**: §0 가정 5 참고 — "비지뢰 셀 전부 오픈" 기준을 채택했다. "지뢰 전부를 정확히 flag"해야 승리로 판정하는 방식을 의도했다면 별도 확인이 필요하다.
3. **경과 시간 타이머 필요 여부**: §0 가정 6, §11 참고 — Epic이 언급하지 않아 v1 비범위로 배제했다. 고전 지뢰찾기 UX 관례상 타이머가 일반적이므로, 필요하다면 후속 스토리로 명시적으로 요청 권장.
4. **플래그 키 배정(`F` 키)**: §7.1 참고 — 우클릭의 키보드 대체 수단으로 `F` 키를 채택했다(다른 저장소 게임 모듈에 선례 없음, 신규 결정). 다른 키(예: `Shift+Enter`)를 선호한다면 확인이 필요하다.
5. **커스텀 난이도 여부**: §11 비범위 참고 — v1은 3단계 표준 프리셋(초급/중급/고급)만 제공한다. 임의 보드 크기·지뢰 수를 사용자가 직접 입력하는 기능이 필요하다면 별도 스토리로 제안한다.

---

*문서 종료 — [박기획] · BF-978*

# Breakout Lite — 게임 규칙·입력·상태 명세 및 Task Context Contract — BF-941

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-941(본 task) · Epic BF-940(Breakout Lite) · 형제 task BF-942(designer) · BF-943(developer) · BF-945(tester)
> 대상 라우트(예정): `/phase18-games/breakout-lite` (신규 module `breakout-lite`, 코드·디자인 시안은 본 task 비대상)
> tech-stack 태그: `vanilla-static` (저장소 실질 스택과 일치, 프레임워크·번들러 없음)
> 산출물 성격: **게임 규칙/입력/상태 명세 + Task Context Contract 승인** — 디자인 시안·구현 코드는 후속 task 담당

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — "Lite" 는 기존 `phase18-games/breakout`(BF-928~933) 대비 축소판 신규 module 이다:** 저장소에는 이미 정식 벽돌깨기 게임이 `phase18-games/breakout/`에 구현되어 있고(`docs/plan/breakout-BF-928.md`, `docs/design/breakout-BF-928.md` 참조), 커밋 `8751c07`/`099ca20`(BF-931)로 완성되어 있다. Epic BF-940 은 별도 신규 module `breakout-lite` 를 요구하며, 기존 `breakout` 코드는 참조만 하고 수정하지 않는다(§11 비범위). "Lite" 는 물리 정교함(가속·반사각 보정·터널링 방지 등)과 부가 규칙(콤보, 파워업)을 걷어낸 최소 플레이 가능 버전을 의미한다.

**가정 2 — 신규 module 명명 충돌 없음 (context-widening 근거):** `docs/context-contracts/**`·`docs/plan/**`만으로는 신규 module 경로가 기존 코드와 겹치는지 알 수 없어 저장소 전체를 대상으로 확인했다 — `context-widening: candidateFiles/nonGoals 확정을 위해 "breakout-lite" 문자열과 Epic 키(BF-940/BF-941) 전역 매치 여부, phase18-games/ 형제 구조를 실측해야 했음(Level 0/1 만으로는 신규 경로 확정 근거 부족)`. 결과: `grep -ril "breakout-lite" .` 0건(작업 디렉터리 내), `grep -ril "BF-940" .` 0건, `grep -ril "BF-941" .`은 `.git` 내부 참조(브랜치명 등)만 존재 — 완전 신규 module 이며 네이밍 충돌이 없다.

**가정 3 — 경로 컨벤션은 `phase18-games/` 최근 4형제(pong·memory-match·breakout·snake·simon-says) 그대로 적용:** `find phase18-games -maxdepth 3` 실측 결과 5개 게임(`pong`, `memory-match`, `breakout`, `snake`, `simon-says`)이 모두 `index.html`/`styles.css`/`logic.js`/`main.js` 4파일 동일 구조다. `git log --oneline -- phase18-games`로 BF-913(pong)→BF-919(memory-match)→BF-925(snake)→BF-931(breakout)→BF-937(simon-says) 순 연속 구현을 확인했다. `breakout-lite` 도 동일 관례를 따를 것으로 candidateFiles 를 고정한다.

**가정 4 — 테스트 명명 규칙은 기존 breakout 선례를 그대로 따른다:** `tests/breakout-BF931.test.js`(단위, 저장소 루트) + `tests/breakout/BF-933-e2e.test.js`(e2e, 하위 디렉터리) 두 계층이 실측 확인됐다. `breakout-lite` 도 동일 패턴(`tests/breakout-lite-*.test.js` 단위, `tests/breakout-lite/**` 또는 `tests/e2e/breakout-lite/**` e2e)을 candidateFiles/tests 에 모두 열거해 후속 tester task 판단 여지를 남긴다.

**가정 5 — 본 task 는 계약 승인 + 규칙 명세를 함께 산출한다 (Simon Says 계열과 달리 분리 task 없음):** Epic BF-940 은 Simon Says 계열(BF-934/935)과 달리 별도 `docs/context-contracts/**` task 를 두지 않고, 본 BF-941 하나가 "범위 정의 + Task Context Contract" 를 겸한다. 따라서 본 문서 한 파일(`docs/plan/breakout-lite-BF-941.md`)에 게임 규칙·입력·상태와 §14 Task Context Contract 를 함께 싣는다.

**가정 6 — 상태는 브라우저 메모리 전용(서버/DB 없음):** 기존 breakout·simon-says 와 동일하게 `prisma/**`, 인증, 서버 API 는 본 Epic 범위 밖이다(저장소에 해당 모듈 자체가 이 게임들과 연결된 바 없음).

**가정 7 — 디자인 시안(색상·레이아웃 목업)은 BF-942(designer) 영역이므로 본 문서는 기능·규칙·데이터 형태만 정의한다.** 픽셀 단위 좌표·색상 팔레트는 designer 산출물에서 확정하며, 본 문서는 논리적 상수(격자 크기, 속도 배수 등)만 제시한다.

---

## 목차

1. 개요
2. 용어 정의
3. 게임 규칙 — 보드·패들·공·벽돌
4. 점수·생명·종료 조건
5. 입력 모델 — 키보드 + 터치
6. 상태 모델
7. Edge Case 및 실패 케이스
8. 비범위 (Out of Scope)
9. 파일 구조 및 기술 제약
10. Acceptance Criteria 매핑
11. 산출물 위치 및 참조 표
12. Task Context Contract (승인본)

---

## 1. 개요

### 1.1 목적
`breakout-lite` 는 기존 `phase18-games/breakout` 의 축소판으로, 최소 규칙(단일 공·단일 패들·고정 속도·콤보 없음)으로 빠르게 완주 가능한 캐주얼 벽돌깨기를 제공한다. 학습/데모 목적의 경량 게임으로, 정교한 물리 보정이나 파워업 없이 "패들로 공을 튕겨 모든 벽돌을 깬다" 는 핵심 루프만 남긴다.

### 1.2 적용 범위
- 신규 정적 SPA module `phase18-games/breakout-lite/`
- 키보드 + 터치 입력
- 점수·생명·승리/패배·재시작 상태 관리
- 단일 화면, 서버/DB 연동 없음

### 1.3 전제 조건
- 번들러·프레임워크 없는 vanilla HTML/CSS/JS (저장소 전역 관례, `package.json` name=`notepad-spa` 확인)
- `http-server . -p 8888` 정적 서빙 관례를 그대로 따름
- 기존 `phase18-games/breakout` 코드는 참조용이며 본 Epic 에서 수정하지 않음

---

## 2. 용어 정의

| 용어 | 정의 |
|---|---|
| 패들(paddle) | 플레이어가 좌우로 움직이는 막대. 공을 반사시킨다 |
| 공(ball) | 화면 내를 이동하며 벽·패들·벽돌과 충돌하는 단일 오브젝트 (Lite 는 항상 1개) |
| 벽돌(brick) | 격자로 배치된 파괴 대상. 공에 맞으면 제거되고 점수 획득 |
| 서브(serve) | 공이 패들 위에 정지해 있다가 입력으로 발사되는 시작 동작 |
| 생명(lives) | 공이 하단 바닥으로 빠졌을 때 차감되는 잔여 시도 횟수 |
| 라운드 클리어 | 모든 벽돌이 제거되어 승리하는 조건 |

---

## 3. 게임 규칙 — 보드·패들·공·벽돌

### 3.1 좌표계 및 상수 (논리값, 실제 px/색상은 BF-942 디자인 산출물에서 확정)
- 보드는 상단 원점(0,0), 우측(+x), 하단(+y) 논리 좌표계
- 패들 이동은 x축(좌우)에 한정, y축 고정
- 공 속도는 **고정**(가속/감속 없음) — 기존 breakout 과의 핵심 차이점

### 3.2 벽돌 배치
- 격자: **4행 × 6열 = 24개** 벽돌 (기존 breakout 대비 축소, 전량 파괴 시 승리)
- 모든 벽돌은 동일 내구도(1회 충돌로 파괴) — 다중 타격 벽돌 없음(Lite 범위 밖)
- 벽돌 간 동일 간격, 화면 상단 영역에 정렬 배치

### 3.3 패들 초기 위치 및 이동
- 화면 하단 중앙에서 시작
- 키보드/터치 입력에 비례해 좌우 이동, 좌우 벽 경계에서 정지(벽 통과 불가)
- 이동 속도는 고정값(가속 없음)

### 3.4 공 이동 및 반사
- 좌/우/상단 벽 충돌 시 입사각=반사각으로 반사
- 하단 경계 이탈 시 "생명 손실" 처리(§4.2)
- 패들 충돌 시 반사각은 패들 표면 대비 대칭 반사(단순 모델 — 기존 breakout 의 "패들 위치별 각도 보정"은 Lite 범위 밖, §8)
- 벽돌 충돌 시 해당 벽돌 제거 + 점수 획득 + 공 반사(충돌면 기준 단순 반사)

### 3.5 게임 루프 처리 순서 (결정론적)
매 프레임: ① 입력 반영(패들 이동) → ② 공 위치 갱신 → ③ 충돌 판정(벽→패들→벽돌 순) → ④ 점수/생명/벽돌 수 갱신 → ⑤ 종료 조건 판정(§4.3) → ⑥ 렌더링

### 3.6 서브(발사) 동작
- 라운드 시작/생명 손실 후 공은 패들 위에 정지한 "서브 대기" 상태로 시작
- 발사 입력(§5) 전까지 공은 패들과 함께 좌우 이동만 함

---

## 4. 점수·생명·종료 조건

### 4.1 점수
- 벽돌 1개 파괴 = 고정 점수(예: 10점, 정확한 값은 BF-943 구현 시 상수로 확정)
- 콤보·배율·보너스 없음(Lite 범위 밖, §8)

### 4.2 생명(Lives)
- 시작 생명: **3**
- 공이 하단으로 이탈할 때마다 1 차감
- 생명 0 도달 시 즉시 패배(§4.3)
- 생명 손실 후 공/패들 위치 초기화, 서브 대기 상태로 복귀(라운드 유지, 벽돌 상태는 유지 — 리셋 아님)

### 4.3 종료 조건
| 조건 | 결과 | 우선순위 |
|---|---|---|
| 모든 벽돌 파괴 | 승리(win) | 벽돌 파괴와 생명 손실이 같은 프레임에 겹칠 수 없음(§3.5 순서상 벽돌 판정이 먼저) → 승리가 항상 우선 확정 |
| 생명 0 | 패배(lose) | 승리 조건 미충족 시에만 적용 |
| 재시작 입력 | idle 상태로 즉시 복귀, 모든 상태 초기화 | 언제든 가능(§6.2) |

---

## 5. 입력 모델 — 키보드 + 터치

### 5.1 통합 조작 원칙
- 키보드·터치 입력은 동일한 논리 액션(패들 이동/발사/일시정지/재시작)에 매핑되며 동시 지원
- 입력 소스 전환 시 별도 모드 전환 UI 불필요(입력이 오는 즉시 반영)

### 5.2 키보드 조작
| 키 | 동작 |
|---|---|
| `←` / `A` | 패들 좌측 이동 |
| `→` / `D` | 패들 우측 이동 |
| `Space` | 서브 대기 중 공 발사 / 플레이 중 일시정지·재개 토글 |
| `R` | 즉시 재시작(idle 로 복귀 후 재시작) |

- 좌우 키 동시 입력 시 순 이동량 0(상쇄) — 기존 breakout 규칙과 동일하게 적용

### 5.3 터치 조작
- 보드 영역 드래그: 터치 x좌표에 패들 중심을 추종시켜 좌우 이동
- 탭(짧은 터치): 서브 대기 중이면 발사, 게임오버/승리 화면이면 재시작
- 멀티터치는 첫 번째 터치 포인트만 유효(추가 포인터 무시)
- 포인터가 보드 밖으로 이탈해도 마지막 유효 x좌표로 패들 위치 유지(드래그 취소 아님)

---

## 6. 상태 모델

### 6.1 상태 데이터 형태 (in-memory 전용)
```
{
  phase: "idle" | "serve" | "playing" | "paused" | "win" | "lose",
  score: number,       // 0부터 시작
  lives: number,       // 3부터 시작, 0까지 감소
  bricksRemaining: number, // 24부터 시작
  paddleX: number,
  ball: { x: number, y: number, vx: number, vy: number }
}
```

### 6.2 상태 전이표
| From | 이벤트 | To |
|---|---|---|
| idle | 시작 입력(첫 서브 대기 진입) | serve |
| serve | 발사 입력(Space/탭) | playing |
| playing | 생명 손실(패들 미스), 잔여 생명>0 | serve |
| playing | 생명 손실, 잔여 생명=0 | lose |
| playing | 마지막 벽돌 파괴 | win |
| playing | 일시정지 입력 | paused |
| paused | 재개 입력 | playing |
| serve/playing/paused/win/lose | 재시작 입력(R/탭) | idle → (자동) serve |

### 6.3 상태별 수용 기준 (Given/When/Then, 발췌)
- **Given** `phase=idle`, **When** 사용자가 시작 입력을 보내면, **Then** 공이 패들 위에 배치되고 `phase=serve` 로 전환된다.
- **Given** `phase=serve`, **When** 발사 입력, **Then** 공이 고정 속도로 발사되고 `phase=playing` 이 된다.
- **Given** `phase=playing`이고 `lives=1`, **When** 공이 하단으로 이탈, **Then** `lives=0`, `phase=lose` 로 전환되고 재시작 전까지 입력이 패들/공에 반영되지 않는다.
- **Given** `phase=playing`이고 `bricksRemaining=1`, **When** 그 벽돌이 파괴, **Then** `bricksRemaining=0`, `phase=win` 으로 즉시 전환된다(§4.3 우선순위).
- **Given** 임의의 `phase`, **When** 재시작 입력, **Then** `score=0`, `lives=3`, `bricksRemaining=24` 로 리셋되고 `phase=idle` 로 복귀한다.
- **Given** `phase=paused`, **When** 재개 입력, **Then** 공/패들 상태 변경 없이 `phase=playing` 으로만 전환된다(위치·속도 보존).

---

## 7. Edge Case 및 실패 케이스

1. **좌우 동시 키 입력**: 순 이동 0으로 상쇄, 패들 정지(§5.2)
2. **일시정지 중 재시작 입력**: 즉시 idle 로 전환 허용(paused 라도 재시작 차단하지 않음)
3. **서브 대기 중 일시정지 시도**: `serve` 상태에서도 `Space` 는 발사로만 동작 — 별도 일시정지 상태 없음(재해석 방지를 위해 Space 의 이중 의미는 `playing` 진입 이후만 "토글"로 정의)
4. **터치 드래그 중 포인터 이탈**: §5.3 대로 마지막 좌표 유지
5. **멀티터치**: 첫 포인터만 유효, 나머지 무시(§5.3)
6. **승리와 생명 손실 동시 발생 불가**: §3.5 순서(벽돌 판정 우선)로 원천 차단
7. **생명 손실 후 패들 위치**: 초기화하지 않고 직전 위치 유지(공만 서브 위치로 재배치)
8. **탭 백그라운드 전환 후 델타타임 급증**: 프레임 간 delta 를 상한 클램프해 공이 벽을 통과(터널링)하지 않도록 구현 시 고려(세부 수치는 BF-943 구현 판단, 본 문서는 요구사항만 명시)

---

## 8. 비범위 (Out of Scope)

- **파워업/아이템**: 확장 패들, 다중 볼, 관통구 등 — Lite 범위 밖
- **콤보/점수 배율**: 고정 점수만 사용
- **다중 타격(내구도 2+) 벽돌**: 전량 단일 타격
- **패들 반사각 보정(위치별 각도 조정)**: 단순 대칭 반사만 사용
- **레벨 진행(다음 스테이지)**: 승리 시 1회 라운드 종료로 끝, 다음 스테이지 없음
- **사운드/이펙트**: 본 문서는 기능 규칙만 정의, 오디오·비주얼 이펙트는 designer/developer 판단 영역(§13 devDependencies 에 이미 audio 관련 패키지 없음)
- **기존 `phase18-games/breakout` 코드/문서 수정**: 참조만, 변경 금지
- **서버 API·DB·인증**: 브라우저 메모리 상태만 사용

---

## 9. 파일 구조 및 기술 제약

- `phase18-games/breakout-lite/index.html` — 진입 마크업
- `phase18-games/breakout-lite/styles.css` — 스타일(디자인 세부는 BF-942 산출물 반영)
- `phase18-games/breakout-lite/logic.js` — 게임 규칙/상태 순수 로직(테스트 대상 핵심)
- `phase18-games/breakout-lite/main.js` — DOM 바인딩/입력 핸들러/렌더 루프
- 외부 라이브러리 없음(vanilla), `package.json` devDependencies 변경은 developer 판단 필요 시 별도 근거로 제안(본 task 는 미변경)

---

## 10. Acceptance Criteria 매핑

| AC (원문) | 근거 |
|---|---|
| Given Epic BF-940 요구, When planner 산출, Then `docs/plan/breakout-lite-*.md` 에 게임 규칙·입력·상태·산출물 경로 정리 | 본 문서 §3~§6(규칙/입력/상태), §9(산출물 경로) |
| Given 고유 경로 규칙, When contract 작성, Then 유효 Task Context Contract 10개 이하 유지 | §14 `candidateFiles` 9개 항목(고유 경로 기준 ≤10) |
| Given 범위 제약, When 참조, Then 무관한 전역 탐색 없이 제공된 pre-scope 활용 | §0 가정 2·3·4에 명시한 최소 범위 실측(sibling 구조·grep 확인)만 수행, 무관 모듈 상세 열람 없음 |

---

## 11. 산출물 위치 및 참조 표

| 산출물 | 경로 | 담당 | 상태 |
|---|---|---|---|
| 본 규칙/계약 명세 | `docs/plan/breakout-lite-BF-941.md` | planner(BF-941, 본 task) | 완료 |
| 디자인 시안 | `docs/design/breakout-lite-BF-942.md` (예정) | designer(BF-942) | 후속 |
| 구현 코드 | `phase18-games/breakout-lite/{index.html,styles.css,logic.js,main.js}` (예정) | developer(BF-943) | 후속 |
| 단위/e2e 테스트 | `tests/breakout-lite-*.test.js`, `tests/breakout-lite/**` 또는 `tests/e2e/breakout-lite/**` (예정) | tester(BF-945) | 후속 |
| 참조(수정 금지) | `phase18-games/breakout/**`, `docs/plan/breakout-BF-928.md`, `docs/design/breakout-BF-928.md` | — | 기존 자산, 참조 전용 |

---

## 12. Task Context Contract (승인본)

```json
{
  "contractVersion": "task-context-contract-v1",
  "candidateFiles": [
    "phase18-games/breakout-lite/index.html",
    "phase18-games/breakout-lite/styles.css",
    "phase18-games/breakout-lite/logic.js",
    "phase18-games/breakout-lite/main.js",
    "docs/plan/breakout-lite-*.md",
    "docs/design/breakout-lite-*.md",
    "tests/breakout-lite-*.test.js",
    "tests/breakout-lite/**",
    "tests/e2e/breakout-lite/**"
  ],
  "entryPoints": [
    "phase18-games/breakout-lite/index.html",
    "phase18-games/breakout-lite/main.js"
  ],
  "tests": [
    "tests/breakout-lite-*.test.js",
    "tests/breakout-lite/**",
    "tests/e2e/breakout-lite/**"
  ],
  "dependencyEvidence": [
    "find phase18-games -maxdepth 3: pong·memory-match·breakout·snake·simon-says 5개 형제 module 이 index.html/styles.css/logic.js/main.js 4파일 동일 구조로 확인됨",
    "git log --oneline -- phase18-games: BF-913(pong)→BF-919(memory-match)→BF-925(snake)→BF-931(breakout)→BF-937(simon-says) 순 동일 관례 연속 구현 확인",
    "grep -ril \"breakout-lite\" . → 0건(작업 디렉터리) — 신규 module 네이밍 충돌 없음",
    "grep -ril \"BF-940\" . → 0건, grep -ril \"BF-941\" . → .git 내부 참조만 존재 — Epic/본 task 모두 저장소 내 선행 코드·문서 없는 순수 신규 스코프",
    "tests/breakout-BF931.test.js(단위) + tests/breakout/BF-933-e2e.test.js(e2e) 실측 — 기존 breakout 테스트 배치 패턴을 breakout-lite 명명에 그대로 적용",
    "docs/plan/breakout-BF-928.md, docs/design/breakout-BF-928.md 존재 확인 — 동일 `<topic>-<JIRA-KEY>.md` 명명 규칙이 games 계열 전체에 일관 적용됨",
    "package.json: name=notepad-spa, 번들러/라우터 없는 vanilla static 구조, test 스크립트가 module 별 node --test 직접 호출 패턴임을 확인"
  ],
  "nonGoals": [
    "phase18-games/breakout/** (기존 정식 벽돌깨기 — 참조만, 수정 금지)",
    "phase18-games/pong/**, phase18-games/memory-match/**, phase18-games/snake/**, phase18-games/simon-says/** (기존 형제 게임 — 비대상)",
    "snake/**, dice/**, rps/**, tetris/**, game-2048/**, baseball/**, clicker/**, kanban/**, notepad/**, number-guess/**, palette/**, pomodoro/**, status-card/**, stopwatch/**, timer/**, weather/**, incident-command/**, incident-triage/**, a11y-counter/** (기존 최상위 게임/앱 모듈 전부 — 비대상)",
    "src/**, package.json, package-lock.json (공용 SPA 런타임/의존성 설정 — 신규 module 전용 스크립트 추가 여부는 후속 dev task 판단)",
    ".github/** 및 저장소 배포/CI 설정 전반 (비대상)",
    "prisma/** (DB 스키마/마이그레이션 비대상, 본 module 은 브라우저 메모리 상태만 사용)",
    "인증 관련 코드/설정 전반 (저장소에 인증 모듈 자체 미확인, 본 Epic 비대상)",
    "docs/design/mockups/**, palette/**, docs/design/palette-BF-461.md 등 공용 디자인 시스템/토큰 자산 (디자인 시안 자체는 BF-942 designer 영역)",
    "phase18-games/breakout-lite/* 실제 구현 코드 작성 (본 task 는 규칙 명세 + 계약만 산출, File Ownership: docs/plan/breakout-lite-*.md)"
  ],
  "knownFacts": [
    "phase18-games/ 하위에 pong·memory-match·breakout·snake·simon-says 5개 게임이 동일 4파일(index.html/styles.css/logic.js/main.js) 구조로 이미 구현되어 있다.",
    "기존 breakout(BF-928~933)이 이미 정식 벽돌깨기를 구현했고, breakout-lite(BF-940~945)는 이를 축소한 별도 신규 module이다.",
    "\"breakout-lite\" 문자열 전역 검색 결과 0건 — 완전 신규 module이며 네이밍 충돌이 없다.",
    "\"BF-940\"/\"BF-941\" 검색 결과 저장소 내 선행 코드·문서 없음(순수 신규 스코프, .git 내부 브랜치 참조만 존재).",
    "테스트는 단위(tests/<module>-BF<key>.test.js, 저장소 루트)와 e2e(tests/<module>/ 또는 tests/e2e/<module>/) 두 패턴이 게임 계열 내에서 혼용된다(breakout 선례: tests/breakout-BF931.test.js + tests/breakout/BF-933-e2e.test.js).",
    "docs/plan, docs/design 산출물은 games 계열 전체에서 `<topic>-<JIRA-KEY>.md` 명명 규칙을 일관 적용한다.",
    "저장소는 번들러/라우터 없는 vanilla static 구조(package.json name=notepad-spa)이며 서버/DB/인증 모듈이 이 게임들과 연결되어 있지 않다.",
    "TEST_SCOPE_POLICY(focused, primary_module=breakout-lite)는 node --test tests/breakout-lite-*.test.js 직접 호출을 가이드하며, package.json 에 breakout-lite 전용 스크립트를 아직 추가할 필요가 없다(후속 dev task 판단 영역)."
  ],
  "wideningBudget": {
    "maxCalls": 3,
    "maxAddedPaths": 10,
    "maxLevel": 2
  }
}
```

---

## 13. 후속 task 안내

- BF-942(designer): 본 문서 §3~§6 규칙을 기반으로 `docs/design/breakout-lite-BF-942.md` 시안 작성(색상·레이아웃·픽셀 좌표 확정)
- BF-943(developer): 본 문서 규칙·상태 모델·§9 파일 구조를 그대로 구현, `phase18-games/breakout-lite/*` 4파일 생성
- BF-945(tester): §6.3 Given/When/Then 및 §7 Edge Case 를 단위/e2e 테스트로 커버
- 범위 재조정이 필요하면 Jira 코멘트로 근거를 남기고 본 문서를 개정한다(재해석 금지, 근거 기반 개정만 허용)

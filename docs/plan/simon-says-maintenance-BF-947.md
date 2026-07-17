# Simon Says 유지보수 범위 명세 — BF-947

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-947(본 planner task) · 형제 task BF-948(designer)·BF-949(developer)·BF-951(tester)
> 대상 모듈: `phase18-games/simon-says/`(기존 구현, BF-937) — **신규 모듈 아님, 유지보수**
> 선행 산출물: `docs/context-contracts/simon-says-BF-935.md`(계약) · `docs/design/simon-says-BF-936.md`(디자인)
> 개선 축 3개: ① 접근성 ② visibility(탭 비활성) 일시정지 ③ 최고점수 저장

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 본 task 는 "범위 계약" 이지 구현이 아니다:** File Ownership 이 `docs/plan/simon-says-*.md` 로 고정되어 있다. 코드(`phase18-games/simon-says/**`)·디자인(`docs/design/simon-says-*.md`)은 후속 BF-949(developer)·BF-948(designer)이 직접 작성한다. 본 문서는 "무엇을 어떤 기준으로 바꿔야 하는지"만 확정한다.

**가정 2 — 기존 경로를 우선 사용, 저장소 전체 탐색은 최소화:** task 지시대로 `phase18-games/simon-says/**`, `docs/plan|design/simon-says-*`, `tests/simon-says-*`, `tests/e2e/simon-says/**`를 1차 근거로 삼았다. 다만 "최고점수 저장" 방식(세션 in-memory vs 영속 localStorage)의 선례 유무는 이 경로만으로 판단할 수 없어 아래 **context-widening**을 1회 수행했다.

**가정 3 — context-widening: 최고점수 저장 패턴 선례 확인 (Level 2):**
`context-widening: candidateFiles/nonGoals 만으로는 최고점수 "저장"이 세션 내(in-memory) 유지인지 재방문 후에도 남는 영속 저장인지, 그리고 저장소에 참고할 기존 패턴이 있는지 판단할 근거가 없어 phase18-games/ 전체 및 저장소 최상위 게임들을 grep 으로 확인함.`
- `phase18-games/snake/{logic.js,main.js,index.html}`: `highScore` 필드가 존재하지만 **`state` 내 in-memory 값**일 뿐 `localStorage` 미사용 — 새로고침하면 리셋된다. `phase18-games/` 4형제(pong/memory-match/breakout/snake) 전체에 `localStorage`·`visibilitychange` 사용 0건(grep 실측) — **phase18-games 계열은 지금까지 영속 저장 사례가 없다.**
- 저장소 최상위 게임/앱(`dice/`, `timer/`, `kanban/`, `pomodoro/`, `weather/`, `clicker/`, `notepad/`, `tetris/`, `palette/`, `stopwatch/` 등)은 `<module>-storage.js` UMD 모듈 패턴을 광범위하게 사용 중이다. 예: `dice/storage.js` — `createDiceStore(storage)` 팩토리, 기본값 `globalThis.localStorage`, 테스트용 `createMemoryStorage()` in-memory adapter, prefix key(`"dice:"`), `JSON.parse` 실패·값 훼손 시 **silent fallback**(예외로 게임이 깨지지 않음).
- 이 패턴은 **Simon Says 최고점수 영속 저장에 그대로 재사용 가능한 저장소 표준 관례**로 판단, §5 API 스펙에 반영했다(신규 추상 발명 대신 기존 관례 재사용 = Simplicity First).
- widening 사용량: `wideningBudget.maxCalls=3` 중 2회 사용(phase18-games 내부 grep 1회, 저장소 전체 grep + `dice/storage.js` 열람 1회) — 예산 내.

**가정 4 — 실제 코드 실측 결과, 3개 축 모두 "미구현 gap"이 실재한다 (추측 아님):**
- 접근성: `index.html`의 `.round-badge`는 `role="img"`이고 `aria-live` 속성이 없다. `main.js renderRound()`는 `aria-label`만 갱신하므로 라운드 변경이 스크린리더에 능동적으로 공지되지 않는다(`.status`만 `aria-live="polite"`).
- visibility 일시정지: `main.js` 전체에 `document.visibilitychange`(또는 `document.hidden`) 참조 0건(grep 실측) — 탭이 백그라운드로 가도 `playbackTimers`의 `setTimeout` 재생이 그대로 진행된다. 사용자가 돌아왔을 때 이미 몇 스텝 재생이 끝나 있거나, 입력 대기 중 자리를 비운 사이 "느낌"만으로 오답 처리될 여지가 없는 대신(타임아웃 판정 로직 자체가 없음) 시퀀스 관찰 기회를 놓치는 문제가 있다.
- 최고점수 저장: `logic.js`/`main.js`/`index.html`에 최고점수 관련 코드 0건. 게다가 `tests/simon-says-BF937.test.js:71-76`의 "가드: fetch/XHR/WebSocket/외부 URL/localStorage 0건" 테스트가 **`localStorage` 사용 자체를 정적으로 금지**하고 있다 — 이번 기능 도입 시 반드시 손대야 하는 지점으로 사전 식별한다(§5.4).

**가정 5 — logic.js 순수성은 유지, PAUSED 상태 1개 확장만 허용:** `logic.js`는 UMD·순수 함수·Node 테스트 가능 구조를 그대로 유지해야 한다(design SSOT 계승). visibility 일시정지는 재생 **타이머**의 문제이지 게임 규칙의 문제가 아니므로, 최소 확장(예: `STATUS.PAUSED` 1개 추가 또는 `main.js` 레벨 타이머 pause만으로 처리)을 dev 재량으로 열어두고, 시퀀스 생성·판정 공식(`handleInput`/`randomPad`) 자체는 불변으로 못박는다.

---

## 1. 개선 범위 (to-be) 요약

| 축 | 현재 상태 (as-is) | 개선 목표 (to-be) |
|---|---|---|
| ① 접근성 | `.status`만 `aria-live`, `.round-badge`는 `aria-label`만 갱신(공지 안 됨) | 라운드 변경·최고기록 갱신이 스크린리더에 능동 공지됨 + 신규 UI(최고기록 표시)도 접근 가능한 이름 보유 |
| ② visibility 일시정지 | `visibilitychange` 리스너 없음 — 탭 비활성 중에도 재생 타이머 계속 진행 | 탭이 숨겨지면 재생/입력 대기가 일시정지, 복귀 시 정확히 그 지점부터 재개 |
| ③ 최고점수 저장 | 최고점수 개념 자체 없음, `localStorage` 사용은 테스트가 정적 금지 | 게임오버 시 라운드를 `localStorage`에 영속 저장(신규 최고치만 갱신), 재방문 시 복원 표시 |

---

## 2. Acceptance Criteria (Given/When/Then)

### 2.1 접근성

- **AC-A1** Given 게임이 진행되어 라운드가 증가, When `round-badge`의 값이 갱신됨, Then 해당 변경이 스크린리더에 능동적으로 공지된다(`aria-live` 영역 갱신 또는 `.status` 문구에 라운드 정보 포함 — 구현 방식은 dev 재량, 공지 자체가 AC).
- **AC-A2** Given 최고기록 UI 요소가 화면에 추가됨, When 스크린리더 사용자가 접근, Then "최고 기록 N 라운드" 형태로 읽을 수 있는 접근 가능한 이름(텍스트 또는 `aria-label`)을 가진다.
- **AC-A3** Given `prefers-reduced-motion: reduce` 환경, When 최고기록 갱신 등 신규 시각 효과가 추가됨, Then 기존 reduced-motion 대응 규칙(`styles.css` 하단 media query)이 회귀 없이 유지된다(스케일/글로우 애니메이션 미적용).
- **AC-A4** Given 일시정지 상태(§2.2)에 진입, When 화면이 전환됨, Then 상태 텍스트(`.status`, `aria-live="polite"`)가 "일시정지" 등으로 갱신되어 스크린리더 사용자도 정지 사실을 인지할 수 있다.

### 2.2 visibility 일시정지

- **AC-B1** Given 시퀀스 재생 중(`watch`) 또는 입력 대기 중(`input`), When 탭/창이 비활성화됨(`document.hidden === true`, `visibilitychange` 발생), Then 진행 중이던 재생 타이머·피드백 타이머가 일시정지되고 패드 입력이 무시된다.
- **AC-B2** Given 일시정지 상태, When 탭이 다시 보이게 됨(`document.hidden === false`), Then 멈춘 지점부터 정확히 재개된다(건너뛴 패드 점등 없음, 자동 오답 처리 없음, 잔여 지연시간 기준 재생).
- **AC-B3** Given 게임오버(`gameover`) 또는 대기(`idle`) 상태, When 탭이 비활성/재활성됨, Then 아무 부수효과가 없다(정적 상태는 일시정지 대상이 아님).
- **AC-B4** Given 일시정지 상태, When 사용자가 "다시하기"를 클릭, Then 기존 `clearPlaybackTimers()` 경로로 정상 새 게임이 시작된다(일시정지 타이머와 충돌·중복 재생 없음).

### 2.3 최고점수 저장

- **AC-C1** Given 최초 방문(저장된 기록 없음), When 게임을 진행해 라운드에 도달 후 게임오버, Then 도달한 라운드(= gameover 시점 `state.round`)가 최고기록으로 `localStorage`에 저장된다.
- **AC-C2** Given 기존 최고기록이 존재, When 새 게임오버 시점 라운드가 기존 기록 이하, Then 기존 기록을 덮어쓰지 않는다(최고값만 유지).
- **AC-C3** Given 기존 최고기록이 존재, When 새 게임오버 시점 라운드가 기존 기록보다 큼, Then 최고기록이 갱신되고 화면에 즉시 반영된다.
- **AC-C4** Given 최고기록이 저장된 상태, When 페이지를 새로고침(재방문), Then 저장된 최고기록이 초기 렌더 시 UI에 복원되어 표시된다(게임을 시작하지 않아도 보임).
- **AC-C5** Given `localStorage` 접근이 불가능한 환경(비공개 모드 예외, quota 초과, 값 손상), When 저장/조회를 시도, Then 예외가 게임 진행을 깨뜨리지 않고 조용히 무시되며 최고기록은 0(또는 "기록 없음")으로 폴백한다.

---

## 3. Edge Case / 실패 케이스

| # | 시나리오 | 기대 동작 |
|---|---|---|
| E1 | 재생 중(`watch`) 탭 전환 → 복귀 | 남은 시퀀스가 처음부터 다시 재생되지 않고, 멈춘 지점부터 재개(AC-B2). 처음부터 재생은 "시퀀스 관찰 기회 보장" 취지에 어긋남 |
| E2 | 입력 대기(`input`) 중 탭 전환 → 복귀 | 이미 입력한 `inputIndex` 진행 상태가 보존됨(오답 처리되지 않음) |
| E3 | 일시정지 중 키보드 숫자키 입력 | 무시됨(재생/입력 판정 로직에 반영되지 않음) — AC-B1 |
| E4 | 게임오버 상태에서 라운드 1도 못 채우고 종료(`round=1`에서 오답) | 최고기록 비교 시 `round-1`(즉 도달 성공한 마지막 라운드) 기준인지 `round`(진행 중 라운드) 기준인지 dev가 정의해야 함 — **본 문서 권장: 성공적으로 완주한 라운드 수, 즉 `state.round - 1` 이 아니라 §2.3 표현대로 gameover 시점의 `state.round`를 "도달 라운드"로 통일**(round 필드는 현재 도전 중이던 라운드 번호이므로, 오답 시점 그대로 저장). 후속 dev/tester가 이 정의를 UI 문구와 함께 재확인할 것(§6 남은 모호함 참고) |
| E5 | `localStorage` 값이 숫자가 아닌 문자열로 손상됨 | 파싱 실패 시 "기록 없음"(0)으로 안전 폴백(AC-C5, `dice/storage.js` 패턴과 동일) |
| E6 | 여러 브라우저 탭에서 동시에 게임 실행 | 탭 간 실시간 동기화(`storage` 이벤트 리스닝)는 **비대상**(§4 nonGoals) — 과잉 설계 방지 |
| E7 | reduced-motion 환경에서 최고기록 갱신 애니메이션 | 애니메이션 없이 값만 즉시 갱신(AC-A3) |

---

## 4. 비대상 (nonGoals)

- `phase18-games/{pong,memory-match,breakout,snake}/**`, 저장소 최상위 개별 게임/앱 전부 — 기존 게임 코드 수정 금지.
- `src/**`, `package.json`, `package-lock.json` — 공용 SPA 런타임/의존성.
- `.github/**` 및 배포/CI 설정 전반.
- `prisma/**`, 인증 관련 코드 — 본 module 은 서버리스 브라우저 상태만 사용.
- `docs/design/mockups/**`, `palette/**`, `docs/design/palette-BF-461.md` 등 공용 디자인 토큰 — 색·타이포는 `docs/design/simon-says-BF-936.md` §2.1 표준 토큰을 그대로 승계, 신규 토큰이 필요하면 module 내부(`styles.css` `:root`)에 한정.
- 멀티탭 동기화(`storage` 이벤트), 서버/백엔드 저장, 다중 사용자 리더보드 — 로컬 단일 브라우저 최고기록 1건만 스코프(E6).
- 방향키(←↑→↓) 전체 매핑 확정 — `docs/design/simon-says-BF-936.md` §5.6에 이미 "선택 확장(dev 판단)"으로 명시되어 있고 본 task 설명에 명시적 요구가 없어 필수 AC로 승격하지 않는다(과잉 확장 방지). dev가 여력이 되면 자유 구현하되 필수 아님.
- `logic.js`의 게임 규칙(시퀀스 생성·판정 공식) 자체 변경 — `handleInput`/`randomPad`/`startGame` 공식은 불변, 확장은 상태 필드/신규 함수 추가에 한정.

---

## 5. API 스펙 / 데이터 모델 초안 (dev 재량 허용, 방향만 고정)

### 5.1 저장 위치 제안
`phase18-games/simon-says/storage.js` 신규 파일(선례: `dice/storage.js`) — UMD 패턴, `globalThis.SimonStorage` / `module.exports`. `logic.js`(순수 로직)와 분리해 파일 구조 관례(§가정 5)를 지킨다.

### 5.2 storage key
```
prefix: "simon-says:"
key:    "simon-says:best-round"   → 문자열 정수(최고 도달 라운드)
```

### 5.3 제안 함수 시그니처 (`dice/storage.js` 패턴 준용)
```js
createSimonStore(storage?)     // storage 기본값 globalThis.localStorage, 테스트 시 createMemoryStorage() 주입
  .loadBestRound()              // → number, 없거나 손상 시 0
  .saveBestRoundIfHigher(round) // round > 기존 값일 때만 저장, 저장 후 값 반환
createMemoryStorage()           // Web Storage 호환 in-memory adapter (테스트 격리용, dice/storage.js 동일 패턴)
```

### 5.4 기존 가드 테스트 개정 필요 (breaking, 의도된 정책 변경)
`tests/simon-says-BF937.test.js:71-76`(`가드: fetch/XHR/WebSocket/외부 URL/localStorage 0건`)는 `localStorage` 전역 금지를 강제한다. 최고점수 저장 도입 시 이 테스트를 다음 중 하나로 개정해야 한다:
1. `localStorage` 검사 대상에서 `storage.js`(또는 지정 파일)만 예외 처리, 또는
2. `logic.js`/`main.js`는 여전히 `localStorage` 0건 유지하고 신규 `storage.js`에만 허용하도록 검사 범위를 파일 단위로 좁힘(§5.1 파일 분리 제안과 정합적 — **권장**).

BF-949(developer)가 구현 시 함께 개정하고, BF-951(tester)이 e2e에서 저장·복원 흐름을 검증한다. 이는 회귀가 아니라 사전에 식별된 의도적 정책 갱신이다.

### 5.5 visibility 일시정지 훅 위치 제안
`main.js`에 전역 리스너 추가:
```js
document.addEventListener("visibilitychange", function () {
  if (document.hidden) { /* 재생 타이머 pause, 입력 무시 */ }
  else { /* 잔여 지연시간 기준 재개 */ }
});
```
`playbackTimers`(현재 `setTimeout` id 배열)만으로는 "남은 지연시간"을 알 수 없으므로, 각 타이머 예약 시점의 목표 시각(또는 잔여 ms)을 함께 기록하는 자료구조 확장이 필요하다(예: `{id, remainingMs}` 배열, 또는 pause 시점에 `clearTimeout` 후 hidden 해제 시 남은 delay로 재예약). 세부 구현은 BF-949 재량.

---

## 6. 남은 모호함 (운영자 확인 권장, 필수 아님)

- **E4 관련**: "최고기록"의 정의가 "게임오버 시점 라운드"(도전 중이던 라운드, 완주 실패 포함)인지 "완주에 성공한 마지막 라운드 수"인지 — 본 문서는 전자(gameover 시점 `state.round` 그대로)로 권장하되, UI 문구("최고 기록 N 라운드")와 게임오버 로직상 자연스러운 값이므로 별도 확인 없이 이 정의로 진행 가능. 운영자 이견 시 BF-949 착수 전 Jira 코멘트로 조정.
- **방향키 확장 여부**: §4 nonGoals에 따라 미필수. 접근성 감사에서 추가 요구가 나오면 별도 후속 task로 분리 권장(현재 task 범위 유지 — Simplicity First).

---

## 7. Task Context Contract (JSON, 승인본은 문서 하단 마커 참고)

아래는 §승인 섹션과 동일한 JSON이며, 후속 task(BF-948/BF-949/BF-951)가 그대로 참조한다.

```json
{
  "contractVersion": "task-context-contract-v1",
  "candidateFiles": [
    "docs/plan/simon-says-*.md",
    "docs/design/simon-says-*.md",
    "phase18-games/simon-says/**",
    "tests/simon-says-*.test.js",
    "tests/e2e/simon-says/**",
    "docs/context-contracts/simon-says-*.md"
  ],
  "entryPoints": [
    "phase18-games/simon-says/index.html",
    "phase18-games/simon-says/main.js",
    "phase18-games/simon-says/logic.js"
  ],
  "tests": [
    "tests/simon-says-*.test.js",
    "tests/e2e/simon-says/**"
  ],
  "dependencyEvidence": [
    "index.html 실측: .round-badge 는 role=img 이며 aria-live 속성 없음 — renderRound() 는 aria-label 만 갱신, 스크린리더 능동 공지 안 됨(접근성 gap)",
    "main.js 전수 검토: document.visibilitychange/document.hidden 참조 0건 — tab hidden 시에도 playbackTimers 의 setTimeout 재생이 계속 진행(visibility 일시정지 미구현 실측)",
    "logic.js/main.js/index.html 전수: localStorage·최고점수 관련 코드 0건 — 최고점수 저장은 완전 신규 기능",
    "tests/simon-says-BF937.test.js:71-76 '가드: fetch/XHR/WebSocket/외부 URL/localStorage 0건' 이 localStorage 사용을 전역 금지 — 최고점수 저장 도입 시 이 가드를 파일 단위로 개정 필요(사전 식별)",
    "context-widening 실측: phase18-games/{pong,memory-match,breakout,snake} 전체에 localStorage/visibilitychange 0건, phase18-games/snake 의 highScore 는 in-memory state 뿐(영속 아님) — phase18-games 계열은 영속 저장 선례가 없음",
    "context-widening 실측: 저장소 최상위 게임(dice/timer/kanban/pomodoro/weather/clicker/notepad/tetris/palette/stopwatch 등)은 <module>-storage.js UMD 패턴(createXxxStore(storage), createMemoryStorage() 테스트 어댑터, prefix key, JSON 파싱 실패 시 silent fallback)을 광범위 사용 — 예시 dice/storage.js"
  ],
  "nonGoals": [
    "phase18-games/{pong,memory-match,breakout,snake}/**, 저장소 최상위 개별 게임/앱 전부",
    "src/**, package.json, package-lock.json, .github/**, prisma/**, 인증 관련 코드",
    "docs/design/mockups/**, palette/**, docs/design/palette-BF-461.md 등 공용 디자인 토큰(값 승계만, 리팩터링 금지)",
    "멀티탭 storage 이벤트 동기화, 서버/백엔드 저장, 다중 사용자 리더보드",
    "방향키(←↑→↓) 전체 매핑 확정 — design §5.6 상 '선택 확장', 본 task 필수 아님",
    "logic.js 의 시퀀스 생성/판정 공식(handleInput/randomPad/startGame) 변경 — 상태 필드/함수 추가에 한정"
  ],
  "knownFacts": [
    "phase18-games/simon-says/ 는 4파일(index.html/styles.css/logic.js/main.js) 구조로 이미 구현 완료(BF-937) — 신규 모듈 아님, 유지보수 대상",
    "logic.js 는 UMD 순수 함수 구조(Node 테스트 가능), main.js 가 DOM/타이머/이벤트를 담당하는 관심사 분리가 이미 확립되어 있음",
    ".round-badge 는 role=img + aria-label 갱신뿐이라 라운드 변경이 스크린리더에 능동 공지되지 않음",
    "document.visibilitychange 리스너가 없어 탭 비활성 중에도 재생 타이머가 계속 흐름",
    "localStorage 사용은 tests/simon-says-BF937.test.js 가 정적으로 금지 중 — 최고점수 저장 시 반드시 이 가드를 파일 단위로 개정해야 함",
    "저장소에는 <module>-storage.js UMD 패턴(예: dice/storage.js)이 최고점수/기록 영속 저장의 표준 선례로 존재 — 신규 추상 발명 대신 재사용 권장",
    "phase18-games 4형제 계열은 지금까지 localStorage 영속 저장 사례가 없어 Simon Says 가 이 계열 첫 영속 저장 사례가 됨"
  ],
  "wideningBudget": {
    "maxCalls": 3,
    "maxAddedPaths": 10,
    "maxLevel": 2
  }
}
```

---

## 8. 역할 인계 (후속 task 안내)

- **BF-948(designer)**: §2.1(접근성 AC-A2 최고기록 UI), §5.2(storage key), §6(라운드 정의 모호함) 참고해 `docs/design/simon-says-*.md`(신규 topic, 예: `simon-says-maintenance-BF-948.md`)에 최고기록 표시 위치·일시정지 상태 시각(§2.2 AC-A4)을 명세한다. 기존 `docs/design/simon-says-BF-936.md` 토큰(§2.1 표준 토큰)은 값 불변 승계.
- **BF-949(developer)**: §5 API 스펙 초안(특히 §5.4 가드 테스트 개정, §5.5 타이머 pause/resume)을 참고해 구현. `logic.js` 순수성 유지(§가정 5), `storage.js` 신규 파일은 `dice/storage.js` 패턴 재사용 권장.
- **BF-951(tester)**: §2 AC 전체(A1~A4, B1~B4, C1~C5)를 `tests/e2e/simon-says/**`에 회귀 가드로 추가. 특히 AC-B1/B2(visibility 일시정지)는 실 브라우저에서 `page.evaluate(() => document.dispatchEvent(...))`류로 `visibilitychange`를 시뮬레이션해야 하며, 기존 `round-progress-gameover-keyboard.test.js`의 결정론 rand 기법(§ 파일 상단 주석)을 그대로 재사용 가능.

---

## 9. AC 매핑 (수용 기준 검증)

| 수용 기준 | 충족 근거 |
|---|---|
| Given 기존 Simon Says 경로, When 범위 분석, Then 고유 경로 10개 이하의 유효 contract 산출 | §7 JSON `candidateFiles` 6개 경로(모두 기존 Simon Says 관련 경로), 6개 키(candidateFiles/entryPoints/tests/dependencyEvidence/nonGoals/knownFacts) 전부 채움 |
| Given 근거 미발견, When widening 필요, Then widening 사유·추가 경로를 명시 | §0 가정 3에 `context-widening:` 사유 명시 + §7 `dependencyEvidence` 에 확대 확인한 경로(phase18-games 전체, dice/storage.js 등)와 결과 기록 |
| Given 산출물, When 검토, Then docs/plan/simon-says-*.md 에 범위·역할 인계 명세 기록 | 본 문서(`docs/plan/simon-says-maintenance-BF-947.md`) §1~§6 범위, §8 역할 인계 전부 포함 |

# 랭킹 API·UI 실행 설계 (BF-1548)

> planner 산출물 (BF-1551). 이 문서는 **frozen blueprint** (`planning-contract@v1`,
> `ui-contract@v1`) 를 실행 가능한 구현 계획과 handoff 계약으로 렌더링한다.
> 새 파일·역할·요구사항을 **추가하지 않으며**, frozen 계약의 파일·소유자·상태·후조건과
> POST/GET API 요청·응답 스키마를 그대로 동결해 설명한다.
> designer(BF-1549) 와 developer(BF-1550) 는 본 문서를 handoff 계약으로 참조한다.

---

## 0. 범위와 대상

- **대상 데모**: `demo/neon-snake-fullscreen-0802/` (vanilla ESM, 정적 서빙)
- **통합 런타임**: `index.html` 의 `<script type="module">` 이 `src/game.js` 순수 규칙과
  `cpu.js` CPU 의사결정을 조합해 구동한다. UI 상태 어휘는
  `mode-selection` → `difficulty-selection` → `playing` → `paused` → `game-over` 이며
  모드는 `local`(2인 로컬) / `cpu`(1인 vs CPU) 두 가지다.
- **이번 작업**: 게임 종료 화면에 **랭킹 등록/조회 보드**를 추가한다. 닉네임 + 점수를
  원격 API 에 등록(POST)하고 상위 랭킹을 조회(GET)해 보드에 렌더한다. 네트워크 계층은
  순수/주입 가능한 fetch 모듈로 분리하고, 실패 시 게임 흐름을 중단하지 않고 error 상태로
  안전하게 fallback 한다.
- **명시적 non-goal**: 게임 규칙·tick 루프·충돌 판정·기존 localStorage 최고 기록 로직
  (`highscore.js` / `src/game.js`)은 **수정하지 않는다**. 랭킹은 기존 최고 기록과 별개의
  additive 기능이다.

### 산출 계약 파일과 소유자 (frozen — 재정의 금지)

| 파일 | 소유자 | 상태(정책) |
| --- | --- | --- |
| `demo/neon-snake-fullscreen-0802/index.html` | **developer** | additive |
| `demo/neon-snake-fullscreen-0802/src/ranking.js` | **developer** | additive |
| `demo/neon-snake-fullscreen-0802/src/scores-api.js` | **developer** | additive |
| `demo/neon-snake-fullscreen-0802/tests/ranking.test.js` | **developer** | additive |
| `docs/design/snake-ranking-BF-1548.md` | **designer** | additive |
| `docs/plans/snake-ranking-plan-BF-1548.md` (본 문서) | **planner** | — |

- 파일 소유권·상태 계약의 유일한 권위는 frozen blueprint 다. 본 문서는 이를 **재정의하지
  않고** 그대로 설명한다.
- 위 5개 계약 파일은 모두 **additive** 정책이다. 기존 selector/token/함수 export 를
  삭제하거나 의미를 바꾸지 않고 **추가**만 한다.

---

## 1. 사용자 시나리오 (UseCase)

- **행위자**: 플레이어(사람)
- **선행조건**: 데모 페이지 로드 완료, 게임 1판 종료(점수 확정), 네트워크 접근
  가능/불가능 둘 다 허용
- **주 흐름**
  1. 게임이 종료되면 종료 화면에 랭킹 보드(`#snake-rank-board`)가 노출되고, 상위 랭킹
     GET 조회가 시작된다.
  2. 조회가 완료되면 보드에 상위 10개 순위(`순위 · 닉네임 · 점수`)가 렌더된다.
  3. 플레이어가 닉네임(`#snake-rank-nickname`)을 입력하고 **"랭킹 등록"**
     (`#snake-rank-submit`) 버튼을 누른다.
  4. 등록 요청(POST) 중에는 버튼이 비활성화되고 상태 텍스트에 **"등록 중…"** 이 표시된다
     (submitting).
  5. 등록이 성공하면 상태 텍스트에 **"등록 완료 · 내 순위 N위"** 가 표시되고(success),
     보드가 최신 상위 10개로 갱신된다.
- **대안 흐름**
  - A1. GET/POST 요청이 실패(네트워크 오류·비 2xx 응답)함 → 상태 텍스트에
    **"랭킹을 불러올 수 없습니다"** 를 표시하고(error), **게임은 그대로 진행**된다.
  - A2. 닉네임이 비어 있거나 공백만 있음 → 등록을 시작하지 않고 idle 을 유지한다
    (요청 없이 클라이언트에서 방어).
- **후조건**: 초기화·취소·실패 뒤에는 상태 텍스트와 진행 표시를 초기값(idle)으로 되돌리고,
  주 실행 control(`#snake-rank-submit`)을 다시 사용할 수 있다.

---

## 2. 요구사항 & Acceptance Criteria (Given/When/Then)

### REQ-SUBMIT — 닉네임+점수 랭킹 등록(POST)과 내 순위 반환
- **G** 유효한 닉네임과 확정된 점수가 있음
  **W** 플레이어가 "랭킹 등록"(`#snake-rank-submit`)을 누름
  **T** `POST /api/scores` 를 §5.1 요청 스키마로 호출하고, 진행 중 상태는 submitting 이다.
- **G** POST 응답이 2xx 이고 `rank` 를 포함함
  **W** 응답 수신
  **T** 상태 텍스트를 **"등록 완료 · 내 순위 N위"**(`rank` 값)로 표시하고(success), 보드를
  응답의 상위 10개로 갱신한다.
- **G** 닉네임이 비었거나 공백만 있음
  **W** "랭킹 등록"을 누름
  **T** 요청을 보내지 않고 idle 을 유지한다.

### REQ-BOARD — 상위 랭킹 조회(GET)와 상위 10개 렌더
- **G** 종료 화면 진입
  **W** 랭킹 보드 렌더
  **T** `GET /api/scores` 를 §5.2 스키마로 호출하고, 응답 `entries` 를 점수 내림차순으로
  정렬해 **상위 10개**를 `#snake-rank-board` 에 렌더한다.
- **G** 응답 `entries` 가 10개를 초과함
  **W** 렌더
  **T** 상위 10개만 표시한다(초과분 절삭). 각 행은 `순위·닉네임·점수` 를 화면 텍스트로 노출한다.

### REQ-STATES — idle/submitting/success/error 상태 전이와 접근성
- **G** 보드가 idle
  **W** 렌더
  **T** "랭킹 등록" 버튼이 활성이고 상태 텍스트(`#snake-rank-status`)는 비어 있다.
- **G** POST 진행 중
  **W** 렌더
  **T** 버튼이 비활성이고 상태 텍스트는 "등록 중…" 이다(submitting).
- **G** 임의의 상태
  **W** 렌더
  **T** 상태 영역은 `role="status"` + `aria-live="polite"` 로 상태명을 화면 텍스트와 접근성
  이름으로 노출하며, 색상만으로 상태를 구분하지 않는다.

### REQ-RESILIENCE — 실패 fallback과 게임 흐름 보존
- **G** GET 또는 POST 가 네트워크 오류나 비 2xx 를 반환함
  **W** 응답/오류 수신
  **T** 상태 텍스트를 **"랭킹을 불러올 수 없습니다"**(error)로 표시하고, 예외를 삼켜
  게임 흐름을 중단하지 않는다.
- **G** 실패·취소·재시작 이후
  **W** 종료 화면 재진입 또는 초기화
  **T** 상태와 진행 표시를 idle 초기값으로 되돌리고 "랭킹 등록" control 을 다시 사용할 수 있다.

---

## 3. 모듈 시그니처 (planning-contract@v1)

### 3.1 `src/scores-api.js` — 네트워크 계층(주입 가능한 fetch 클라이언트)

`scores-api.js` 는 fetch 구현을 **인자로 주입**받아, 테스트에서 페이크 fetch 로 결정론적
검증이 가능하도록 한다. 브라우저에서는 `window.fetch` 를 주입한다. 이 모듈은 DOM 에
의존하지 않는다.

```js
// 랭킹 API base 경로 (frozen). 정적 서빙 환경에서 상대/절대 경로로 해석된다.
export const SCORES_API_BASE = '/api/scores';

// 상위 랭킹 조회. 반환: { entries: Array<{ nickname, score, rank }> }
// 비 2xx 응답이나 네트워크 오류는 throw 하여 호출 측 error 상태로 이어진다.
export function fetchScores(fetchImpl, { mode, limit = 10 });   // -> Promise<{entries}>

// 점수 등록. 반환: { rank: number, entries: Array<...> }
// 비 2xx 응답이나 네트워크 오류는 throw 한다.
export function submitScore(fetchImpl, { nickname, score, mode }); // -> Promise<{rank, entries}>
```

- **`fetchScores(fetchImpl, {mode, limit})`**: `GET ${SCORES_API_BASE}?mode={mode}&limit={limit}`
  를 호출한다. `response.ok` 가 false 이면 throw. 성공 시 JSON 을 파싱해 `{ entries }` 반환.
- **`submitScore(fetchImpl, {nickname, score, mode})`**: `POST ${SCORES_API_BASE}` 에
  `Content-Type: application/json` 과 §5.1 요청 body 를 보낸다. `response.ok` 가 false 이면
  throw. 성공 시 `{ rank, entries }` 반환.
- 두 함수 모두 **error 는 삼키지 않고 throw** 한다. error → UI error 상태 변환은 `ranking.js`
  / 통합 런타임의 책임이다(관심사 분리).

### 3.2 `src/ranking.js` — 순수 표현·검증 로직

`ranking.js` 는 DOM/window/시간/난수/네트워크에 의존하지 않는 순수 모듈이다.

```js
// 닉네임 유효성: trim 후 비어 있지 않은가.
export function isValidNickname(nickname);                 // -> boolean

// 상위 N개 정렬·절삭: 점수 내림차순 상위 limit 개, 각 항목에 rank(1-based) 부여.
export function topEntries(entries, limit = 10);           // -> Array<{ nickname, score, rank }>

// 상태 텍스트 포매터(frozen 상태 텍스트).
export function statusText(state, rank);                   // state: 'idle'|'submitting'|'success'|'error'
```

- **`isValidNickname(nickname)`**: `typeof nickname === 'string' && nickname.trim().length > 0`.
- **`topEntries(entries, limit)`**: `entries` 를 `score` 내림차순으로 안정 정렬하고 상위
  `limit` 개만 남긴 뒤 1-based `rank` 를 부여한다. 비배열/빈 배열은 `[]` 를 반환한다.
- **`statusText(state, rank)`**: 상태별 frozen 텍스트를 반환한다.
  - `idle` → `''`
  - `submitting` → `'등록 중…'`
  - `success` → `` `등록 완료 · 내 순위 ${rank}위` ``
  - `error` → `'랭킹을 불러올 수 없습니다'`

---

## 4. 데이터 형태 (DataModel — 전송 스키마)

랭킹은 **API 를 통한 원격 전송 데이터**이며, 이 데모는 저장소를 소유하지 않는다. 아래는
요청/응답에 등장하는 랭킹 엔트리의 논리적 형태다.

| 필드 | 타입 | 의미 |
| --- | --- | --- |
| `nickname` | string (trim 후 비어있지 않음) | 플레이어 표시 이름 |
| `score` | number (비음수 정수) | 확정된 게임 점수 |
| `mode` | `'local'` \| `'cpu'` | 랭킹 격리 모드(통합 런타임 모드와 동일) |
| `rank` | number (1-based) | 응답에서 부여되는 순위 |

- **불변식**: `entries` 는 `score` 내림차순, `rank` 는 1-based 연속. 보드는 상위 10개만 노출한다.
- **모드 격리**: `mode` 별로 랭킹을 분리 조회·등록한다. 다른 모드 랭킹에 영향을 주지 않는다.
- **마이그레이션 제약**: 기존 localStorage 최고 기록(`highscore.js`, `neon-snake-fullscreen-0802:highscore*`)
  키의 읽기/쓰기는 **변경하지 않는다**. 랭킹은 별도 원격 데이터로 additive 공존한다.

---

## 5. API 요청·응답 스키마 (interface-contract — frozen, 변경 금지)

designer 와 developer 는 아래 요청/응답 스키마를 **변경하거나 재정의하지 않는다**.

### 5.1 `POST /api/scores` — 점수 등록

**요청** (`Content-Type: application/json`):

```json
{
  "nickname": "플레이어1",
  "score": 120,
  "mode": "cpu"
}
```

**성공 응답** `200 OK` (`Content-Type: application/json`):

```json
{
  "rank": 3,
  "entries": [
    { "nickname": "goat", "score": 320, "rank": 1 },
    { "nickname": "ace",  "score": 210, "rank": 2 },
    { "nickname": "플레이어1", "score": 120, "rank": 3 }
  ]
}
```

- `rank`: 방금 등록한 점수의 순위(1-based). success 상태 텍스트 "등록 완료 · 내 순위 N위" 의 N.
- `entries`: 갱신된 상위 랭킹(점수 내림차순). 클라이언트는 `topEntries` 로 상위 10개만 렌더.

### 5.2 `GET /api/scores?mode={mode}&limit={limit}` — 상위 랭킹 조회

**요청**: query string `mode`(필수, `local`|`cpu`), `limit`(선택, 기본 10).

**성공 응답** `200 OK` (`Content-Type: application/json`):

```json
{
  "entries": [
    { "nickname": "goat", "score": 320, "rank": 1 },
    { "nickname": "ace",  "score": 210, "rank": 2 }
  ]
}
```

### 5.3 오류 계약

| 상황 | 응답/동작 | UI 상태 |
| --- | --- | --- |
| 네트워크 오류(fetch reject) | `fetchScores`/`submitScore` 가 throw | error("랭킹을 불러올 수 없습니다"), 게임 계속 |
| 비 2xx 응답(4xx/5xx) | `response.ok === false` → throw | error, 게임 계속 |
| 빈 닉네임 | 요청 미발송(클라이언트 방어) | idle 유지 |

- **버저닝**: `/api/scores` 는 v1 계약이다. 필드 추가는 하위호환(additive)만 허용하며 기존
  필드명·타입·의미는 변경하지 않는다.

---

## 6. UI 계약 (ui-contract@v1 — frozen, 변경 금지)

designer 와 developer 는 아래 selector·token·상태·접근성·반응형을 **변경하거나 재정의하지
않는다**. 아래 값은 frozen blueprint 의 exact 값을 그대로 옮긴 것이다.

### 6.1 DOM selector (frozen)

| 종류 | 값 |
| --- | --- |
| DOM id | `snake-rank-board`, `snake-rank-nickname`, `snake-rank-submit`, `snake-rank-status` |
| CSS class | `snake-rank`, `snake-rank__row`, `snake-rank__form`, `snake-rank__submit` |

- `#snake-rank-board` (`.snake-rank`): 랭킹 보드 컨테이너. 각 순위 행은 `.snake-rank__row`.
- `#snake-rank-nickname`: 닉네임 입력. 등록 폼은 `.snake-rank__form`.
- `#snake-rank-submit` (`.snake-rank__submit`): "랭킹 등록" 제출 control.
- `#snake-rank-status`: 상태 텍스트 영역.

### 6.2 상태(frozen)

| 상태 | 표현 |
| --- | --- |
| `idle` | "랭킹 등록" 버튼 활성, 상태 텍스트(`#snake-rank-status`) 비어 있음 |
| `submitting` | 버튼 비활성, 상태 텍스트 "등록 중…" |
| `success` | 상태 텍스트 "등록 완료 · 내 순위 N위" |
| `error` | 상태 텍스트 "랭킹을 불러올 수 없습니다", 게임은 그대로 진행 |

### 6.3 design token (frozen, exact 값)

```css
:root {
  --snake-rank-accent: #39ff14;  /* 랭킹 강조 (네온 그린) */
  --snake-rank-bg: #0a0f0a;      /* 보드 배경 */
  --snake-rank-gap: 8px;         /* 보드 항목 간격 */
  --snake-rank-radius: 6px;      /* 보드/행 모서리 반경 */
}
```

### 6.4 접근성(frozen)

- 닉네임 입력(`#snake-rank-nickname`)은 `aria-label="닉네임 입력"` 을 가진다.
- 랭킹 등록 control(`#snake-rank-submit`)은 `aria-label="랭킹 등록"` 을 가진다.
- 상태 영역(`#snake-rank-status`)은 `role="status"` 와 `aria-live="polite"` 를 가진다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 6.5 반응형(frozen)

- 320px 이상에서 랭킹 보드 content overflow 가 발생하지 않는다.
- 좁은 화면에서 랭킹 보드는 세로 스크롤로 상위 10개를 모두 노출한다.

---

## 7. 게임 lifecycle hook 지점 (index.html 통합 런타임)

랭킹 보드는 통합 런타임의 **뷰 동기화·상태 전이** 지점에 배선한다. 아래는 developer 를 위한
**추가(additive) hook 지점**이며 기존 함수의 시그니처·동작은 바꾸지 않는다. (참조 함수는
`index.html` §`uiState`/`syncView`/`goModeSelection`/`startLocal`/`startCpu`/`handleGameOver`/
`restartToMenu` 로 확인됨.)

| hook 지점(기존 함수) | 추가 동작(additive) |
| --- | --- |
| `handleGameOver()` (`uiState → 'game-over'`) | 랭킹 보드 노출 + `fetchScores` 조회 시작, `topEntries` 로 상위 10개 렌더. 상태는 idle. 확정 점수·현재 모드를 등록 폼에 바인딩 |
| "랭킹 등록"(`#snake-rank-submit`) 클릭 | `isValidNickname` 통과 시 submitting → `submitScore` → success("내 순위 N위") + 보드 갱신. 실패 시 error |
| `restartToMenu()` / `goModeSelection()` (종료→모드 선택 복귀) | 랭킹 보드를 idle 초기값으로 되돌리고 상태 텍스트를 비움 |
| `startLocal()` / `startCpu()` (`uiState → 'playing'`) | 랭킹 보드를 숨기거나 비활성으로 전환(플레이 중 노출하지 않음) |

- **현재 점수·모드 출처**: 종료 시점의 확정 점수와 현재 모드(`local`/`cpu`)를 등록 요청에
  전달한다. 구체 매핑은 developer 구현이 frozen 스키마(§5)와 상태 텍스트(§6.2)를 만족하는
  범위에서 결정한다.
- **중복 등록 방지**: submitting 중에는 버튼이 비활성이므로 동일 요청의 중복 발송을 막는다.

---

## 8. 불변 보장 (기존 동작 변경 금지 — ArchitectureModel constraints)

이번 작업은 **additive** 이며 아래 기존 동작을 **변경하지 않는다**. developer 는 focused
회귀 테스트(`tests/game.test.js`, `tests/cpu.test.js`, `tests/highscore.test.js`)로 확인한다.

- **게임 규칙·tick 루프**: `MP_TICK_MS` 고정 tick 누적 루프와 `step`/`stepMultiplayer` 규칙 불변.
- **충돌 판정**: 벽·자기·상호 충돌 및 head-to-head 판정 불변.
- **기존 localStorage 최고 기록**: `highscore.js` 의 저장/조회/신기록 판정 로직 불변(랭킹과 별개).
- **selector/token 재정의 금지**: designer·developer 는 §6 selector 와 token 을 변경/재정의하지 않는다.
- **관심사 분리**: `scores-api.js` 는 네트워크(throw-on-error), `ranking.js` 는 순수 표현/검증만
  담당한다. 시드/fetch 고정 시 결정론적으로 테스트 가능해야 한다.
- **후조건 복원**: 초기화·취소·실패 뒤에는 상태와 진행 표시를 idle 초기값으로 되돌리고 주 실행
  control 을 다시 사용할 수 있어야 한다.

---

## 9. 테스트 계획 (focused)

| TestSpec | 레벨 | 대상 |
| --- | --- | --- |
| TS-API | unit | `scores-api.js` — 페이크 fetch 주입: GET/POST 요청 URL·body 형태, 2xx 파싱, 비 2xx/네트워크 오류 시 throw |
| TS-RANKING | unit | `ranking.js` — `isValidNickname`(공백/빈값 방어), `topEntries`(내림차순 정렬·상위 10 절삭·rank 부여), `statusText`(상태별 frozen 텍스트) |
| TS-UI | integration | 보드 상태(idle/submitting/success/error) DOM 렌더, selector·aria(`role=status`/`aria-live`) 노출, 320px overflow 없음, 좁은 화면 세로 스크롤 상위 10 |

- 신규 테스트는 `demo/neon-snake-fullscreen-0802/tests/ranking.test.js`(developer 소유)에 둔다.
- fetch 는 페이크(성공/비2xx/reject)로 주입해 결정론적으로 검증한다.
- 실행 범위는 **focused**: 신규/영향 테스트만 실행하되, 공통 런타임 회귀 가드는 기존 test
  파일로 함께 확인한다.

---

## 10. handoff 요약

- **designer(BF-1549 → `docs/design/snake-ranking-BF-1548.md`)**: §6 UI 계약을 시각 명세로
  구체화. selector·token·상태·접근성·반응형을 **재정의하지 말고** 준수. 새 파일/역할 추가 금지.
- **developer(BF-1550 → `src/ranking.js`/`src/scores-api.js`/`index.html`/`tests/ranking.test.js`)**:
  §3 모듈 구현 + §5 API 스키마 준수 + §7 hook 배선 + §9 테스트. 5개 계약 파일 모두
  **additive**. §8 불변 보장 준수.
- **reviewer(BF review)**: 위 additive 계약·frozen selector/token·API 스키마 준수와 §8 불변
  보장을 검토한다.
- **tester(BF test)**: §9 TestSpec 의 실제 `test_result` 로 REQ-SUBMIT/REQ-BOARD/REQ-STATES/
  REQ-RESILIENCE 를 검증한다.

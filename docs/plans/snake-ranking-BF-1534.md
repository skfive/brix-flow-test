# 랭킹 API·UI · 실행 설계 (BF-1534)

> planner 산출물 (BF-1534). 이 문서는 **frozen blueprint** (`planning-contract@v1`,
> `ui-contract@v1`) 를 실행 가능한 구현 계획과 handoff 계약으로 렌더링한다. 새 파일·역할·
> 요구사항을 **추가하지 않으며**, frozen 계약의 파일·소유자·상태·후조건을 그대로 설명한다.
> designer(BF-1530/BF-1531) 와 developer(BF-1533) 는 본 문서를 handoff 계약으로 참조한다.

> **산출물 경로 결정(중요)**: frozen RoleWorkPacket 의 deliverable label 은
> `docs/plans/implementation-plan.md` 이지만, 그 경로에는 이미 **다른 Jira Task(BF-1504,
> 2인 스네이크 멀티플레이)** 의 planner 산출물이 커밋되어 있다. 그 파일을 덮어쓰면 BF-1504
> 산출물이 파괴되고 머지 충돌·노이즈가 발생한다(BF-558 결함 사례와 동일 유형). 따라서 본
> 산출물은 designer 형제 산출물(`docs/design/snake-ranking-BF-1530.md`)과 동일한
> `<topic>-<JIRA-KEY>` 컨벤션을 따라 **`docs/plans/snake-ranking-BF-1534.md`** 에 저장한다.
> downstream producer 는 이 경로를 실행 설계 계약으로 참조한다.

---

## 0. 범위와 대상

- **대상 데모**: `demo/neon-snake-fullscreen-0802/` (vanilla ESM, 정적 서빙, `serve_root=.`)
- **대상 route**: `/demo/neon-snake-fullscreen-0802/index.html` (root-relative-static)
- **통합 런타임**: `index.html` 의 `<script type="module">` 이 `src/game.js`(순수 규칙),
  `cpu.js`(CPU 의사결정), `highscore.js`(localStorage 최고 기록)를 조합해 구동한다. UI 상태
  어휘는 `mode-selection` → `difficulty-selection` → `playing` → `paused` → `game-over`,
  모드는 `local`(2인 로컬) / `cpu`(1인 vs CPU) 두 가지다.
- **이번 작업**: 시작/종료 화면에 **서버 기반 랭킹 보드**를 추가한다. 플레이어가 닉네임을
  입력해 점수를 서버(`POST /api/snake-scores`)에 등록하고, 모드별 상위 10위를
  (`GET /api/snake-scores`) 조회해 보드에 표시한다. 저장소는 신규 테이블 `snake_scores`
  (마이그레이션 additive)이며, 기존 localStorage 최고 기록 로직은 **보존**한다.

### 산출 계약 파일과 소유자 (frozen — 재정의 금지)

| 파일 | 소유자 | 상태(정책) |
| --- | --- | --- |
| `demo/neon-snake-fullscreen-0802/index.html` | **developer** | additive |
| `demo/neon-snake-fullscreen-0802/ranking.css` | **developer** | additive |
| `demo/neon-snake-fullscreen-0802/ranking.js` | **developer** | additive |
| `demo/neon-snake-fullscreen-0802/tests/ranking.test.js` | **developer** | additive |
| `docs/design/snake-ranking-BF-1530.md` | **designer** | additive |
| `docs/design/snake-ranking-mockup-BF-1530.html` | **designer** | additive |
| `migrations/20260802_snake_scores.sql` | **canonical work packet owner** | additive |
| `src/routes/snakeScores.js` | **developer** | additive |
| `test/snakeScores.test.js` | **developer** | additive |
| `docs/plans/snake-ranking-BF-1534.md` (본 문서) | **planner** | — |

- 파일 소유권·상태 계약의 유일한 권위는 frozen blueprint 다. 본 문서는 이를 **재정의하지
  않고** 그대로 설명한다.
- 위 9개 계약 파일은 모두 **additive** 정책이다. 기존 selector/token/함수 export/route/스키마를
  삭제하거나 의미를 바꾸지 않고 **추가**만 한다.

---

## 1. 사용자 시나리오 (UseCase)

- **행위자**: 플레이어(사람)
- **선행조건**: 데모 페이지 로드 완료, 랭킹 API 도달 가능/불가능(오프라인) 둘 다 허용
- **주 흐름**
  1. 플레이어가 게임을 종료한다(기존 조작·규칙·최고 기록 로직 그대로).
  2. 랭킹 보드(`#ranking-board`)가 해당 모드의 상위 10위를 조회(`loading`)해 표시한다(`idle`).
  3. 플레이어가 닉네임 입력(`#nickname-input`)에 이름을 적고 랭킹 등록(`#rank-submit`)을 누른다.
  4. 클라이언트가 `POST /api/snake-scores` 로 점수를 제출한다(`submitting`).
  5. 서버가 검증·저장 후 갱신된 상위 10위를 반환하고, 보드가 새 목록과 등록 결과를 표시한다(`success`).
- **대안 흐름**
  - A1. 닉네임/점수가 유효하지 않음 → 서버가 `400` + 오류 코드 반환, 보드는 `error` 상태로
    `role="alert"` 메시지를 노출하고 입력·등록 control 을 다시 사용할 수 있게 한다.
  - A2. 네트워크/서버 오류(오프라인·5xx) → `error` 상태로 재시도 안내를 노출하고, 기존
    localStorage 최고 기록·게임 흐름은 영향받지 않는다.
- **후조건**: 등록 성공·취소·실패 이후 상태와 진행 표시는 초기값(`idle`)으로 되돌아가고,
  주 실행 control(`#rank-submit`)을 다시 사용할 수 있다.

---

## 2. 요구사항 & Acceptance Criteria (Given/When/Then)

### REQ-SUBMIT — 점수 등록 + 닉네임 검증 + score 제약
- **G** 유효한 `mode∈{local,cpu}`, 검증 통과 `nickname`, 비음수 정수 `score`
  **W** `POST /api/snake-scores` 호출
  **T** `201` 과 저장된 레코드(+`rank`)를 반환하고 `snake_scores` 에 1행이 추가된다.
- **G** `nickname` 이 검증 규칙(§4.2) 위반(공백만/길이 초과/제어문자 등)
  **W** `POST /api/snake-scores` 호출
  **T** `400` + `{ error: "invalid_nickname" }` 를 반환하고 저장하지 않는다.
- **G** `score` 가 비정수·음수·상한 초과·`NaN`, 또는 `mode` 가 허용값 밖
  **W** `POST /api/snake-scores` 호출
  **T** `400` + `{ error: "invalid_score" | "invalid_mode" }` 를 반환하고 저장하지 않는다.

### REQ-TOPLIST — 모드별 상위 10위 조회
- **G** `snake_scores` 에 여러 모드·점수 레코드 존재
  **W** `GET /api/snake-scores?mode=cpu` 호출
  **T** `mode=cpu` 레코드만 `score DESC, created_at ASC` 로 정렬한 상위 **최대 10개**를 반환한다.
- **G** 해당 모드 레코드 없음
  **W** `GET /api/snake-scores?mode=local`
  **T** `200` + 빈 배열(`{ mode, entries: [] }`)을 반환한다.
- **G** `mode` 파라미터 누락/허용값 밖
  **W** `GET /api/snake-scores`
  **T** `400` + `{ error: "invalid_mode" }` 를 반환한다.

### REQ-BOARD-UI — 랭킹 보드 UI + 상태 전이
- **G** 시작/종료 화면
  **W** 렌더
  **T** `#ranking-board`(`.rank-board`)에 상위 10위 행(`.rank-board__row`)과 닉네임 입력
  (`#nickname-input`)·등록 control(`#rank-submit`, `.rank-submit`)이 노출된다.
- **G** 조회 중/제출 중
  **W** 렌더
  **T** 각각 `loading`/`submitting` 상태를 **화면 텍스트로도** 노출하고 등록 control 을 비활성화한다.
- **G** 등록 성공
  **W** 응답 수신
  **T** `success` 상태로 갱신된 상위 10위를 다시 그리고, 입력·control 을 `idle` 로 복원한다.

### REQ-A11Y — 접근성 & 반응형
- **G** 랭킹 보드 렌더
  **W** 스크린리더 탐색
  **T** `#nickname-input` 은 `aria-label="닉네임 입력"`, `#rank-submit` 은 `aria-label="랭킹 등록"`
  을 가지며, `error` 상태 메시지는 `role="alert"` 로 announce 된다.
- **G** 모든 상태(idle/loading/submitting/success/error)
  **W** 렌더
  **T** 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.
- **G** 320px 이상 폭 / 좁은 화면
  **W** 렌더
  **T** 보드 content overflow 가 없고, 상위 10개 항목은 세로 스크롤로 접근 가능하다.

---

## 3. API 계약 (InterfaceContract `snake-scores` — api)

`src/routes/snakeScores.js` 는 아래 2개 엔드포인트를 **additive** 로 추가한다. base path 는
`/api/snake-scores` 이며 JSON 요청/응답을 사용한다.

### 3.1 `POST /api/snake-scores` — 점수 등록

요청 body (`application/json`):

```json
{ "mode": "cpu", "nickname": "네온장인", "score": 240 }
```

| 필드 | 타입 | 제약 |
| --- | --- | --- |
| `mode` | string | `"local"` \| `"cpu"` (그 외 → `400 invalid_mode`) |
| `nickname` | string | §4.2 검증 규칙 통과 (위반 → `400 invalid_nickname`) |
| `score` | integer | 비음수 정수, `0 ≤ score ≤ 1_000_000` (위반 → `400 invalid_score`) |

성공 응답 `201`:

```json
{
  "id": 42,
  "mode": "cpu",
  "nickname": "네온장인",
  "score": 240,
  "rank": 3,
  "createdAt": "2026-08-02T12:00:00.000Z",
  "entries": [
    { "rank": 1, "nickname": "…", "score": 320, "createdAt": "…" }
  ]
}
```

- `rank` 는 저장 후 해당 모드 내 순위(`score DESC, created_at ASC` 기준, 1-based).
- `entries` 는 저장 직후 갱신된 상위 10위(§3.2 와 동일 형식)로, 클라이언트가 재조회 없이 보드를 갱신한다.

### 3.2 `GET /api/snake-scores?mode=<local|cpu>&limit=<1..10>` — 상위 조회

| 쿼리 | 타입 | 제약 |
| --- | --- | --- |
| `mode` | string | `"local"` \| `"cpu"` (누락/그 외 → `400 invalid_mode`) |
| `limit` | integer | 선택, 기본 `10`, `1..10` 로 clamp |

성공 응답 `200`:

```json
{
  "mode": "cpu",
  "entries": [
    { "rank": 1, "nickname": "네온장인", "score": 320, "createdAt": "2026-08-02T11:59:00.000Z" }
  ]
}
```

### 3.3 오류 계약 (frozen 오류 코드)

| 상태 | body | 원인 |
| --- | --- | --- |
| `400` | `{ "error": "invalid_mode" }` | `mode` 누락/허용값 밖 |
| `400` | `{ "error": "invalid_nickname" }` | 닉네임 §4.2 위반 |
| `400` | `{ "error": "invalid_score" }` | score 비정수/음수/상한 초과/`NaN` |
| `500` | `{ "error": "internal_error" }` | 저장소 오류(클라이언트는 `error` 상태로 재시도 안내) |

- **버전**: `v1` (base path `/api/snake-scores`). 스키마 변경 시 additive(신규 필드 추가) 로만 확장한다.
- **소비자**: `ranking.js`(클라이언트), `test/snakeScores.test.js`(계약 테스트).

---

## 4. 데이터 계약 (DataModel — `snake_scores`)

### 4.1 테이블 스키마 (`migrations/20260802_snake_scores.sql`, additive)

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | 정수 PK (auto increment) | PRIMARY KEY, NOT NULL |
| `mode` | text | NOT NULL, `CHECK (mode IN ('local','cpu'))` |
| `nickname` | text | NOT NULL |
| `score` | integer | NOT NULL, `CHECK (score >= 0)` |
| `created_at` | timestamp | NOT NULL, DEFAULT 현재 시각(UTC) |

참고 DDL(엔진 중립 표기 — 실제 dialect 은 develop-api 가 저장소 규약에 맞춰 렌더):

```sql
CREATE TABLE snake_scores (
  id         INTEGER PRIMARY KEY,
  mode       TEXT      NOT NULL CHECK (mode IN ('local','cpu')),
  nickname   TEXT      NOT NULL,
  score      INTEGER   NOT NULL CHECK (score >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- (mode, score) 상위 조회 인덱스: 모드별 score 내림차순 상위 N 조회를 커버.
CREATE INDEX idx_snake_scores_mode_score
  ON snake_scores (mode, score DESC, created_at ASC);
```

### 4.2 닉네임 검증 규칙 (frozen)

서버(`snakeScores.js`)가 저장 전 다음을 **모두** 만족하는지 검증한다. 위반 시 저장하지 않고
`400 invalid_nickname` 을 반환한다.

1. 타입은 문자열이어야 한다(문자열 아님/누락 → 위반).
2. 앞뒤 공백 제거(trim) 후 **1~12자**(코드 포인트 기준). 빈 문자열·공백만 → 위반.
3. 제어문자(`U+0000`–`U+001F`, `U+007F`)를 포함하면 위반.
4. 저장은 trim 된 값으로 한다. 렌더 시 HTML 이스케이프는 클라이언트(`ranking.js`) 책임이다.

### 4.3 score 제약 (frozen)

- `Number.isInteger(score) && 0 ≤ score ≤ 1_000_000` 만 허용. `NaN`·실수·음수·상한 초과 → `400 invalid_score`.
- 상한(`1_000_000`)은 명백한 조작값 차단용 상한이며, 정상 플레이 점수를 제한하지 않는다.

### 4.4 데이터 불변식 (migrationConstraints)

- **인덱스 불변식**: `(mode, score DESC, created_at ASC)` 복합 인덱스로 모드별 상위 10위
  조회가 정렬 없이 인덱스 순회로 처리된다(동점은 먼저 등록된 기록이 상위).
- **모드 격리**: 조회/집계는 항상 `WHERE mode = ?` 로 격리한다.
- **additive**: 마이그레이션은 신규 테이블·인덱스 **생성만** 하며 기존 스키마를 변경하지 않는다.
- **레거시 보존**: 기존 localStorage 최고 기록(`neon-snake-fullscreen-0802:highscore:*`)은
  이번 작업에서 읽기/쓰기 동작을 **변경하지 않는다**. 서버 랭킹은 그와 독립적으로 공존한다.

---

## 5. UI 계약 (ui-contract@v1 — frozen, 변경 금지)

designer 와 developer 는 아래 selector·token·상태·접근성·반응형을 **변경하거나 재정의하지
않는다**. 아래 값은 frozen blueprint 의 exact 값을 그대로 옮긴 것이다.

### 5.1 DOM selector (frozen)

| 종류 | 값 |
| --- | --- |
| DOM id | `ranking-board`, `nickname-input`, `rank-submit` |
| CSS class | `rank-board`, `rank-board__row`, `rank-submit` |

- `#ranking-board` (`.rank-board`): 랭킹 보드 컨테이너(상위 10위 목록 + 입력/등록 영역)
- 상위 10위 각 행은 `.rank-board__row`
- `#nickname-input`: 닉네임 입력 필드
- `#rank-submit` (`.rank-submit`): 랭킹 등록 control

### 5.2 상태 (frozen)

| 상태 | 표현(색상만이 아니라 화면 텍스트로도 구분) |
| --- | --- |
| `idle` | 상위 10위 목록 + 닉네임 입력·등록 control 사용 가능 |
| `loading` | 상위 10위 조회 중 — "불러오는 중" 텍스트, 등록 control 비활성 |
| `submitting` | 등록 요청 중 — "등록 중" 텍스트, 등록 control 비활성 |
| `success` | 등록 성공 — 갱신된 상위 10위 표시 후 `idle` 로 복원 |
| `error` | 실패 — `role="alert"` 오류 메시지 노출, 입력·등록 control 재사용 가능 |

### 5.3 design token (frozen, exact 값)

```css
:root {
  --color-rank-accent: #39ff14;  /* 랭킹 강조 (네온 그린) */
  --color-rank-error: #ff4d4d;   /* 오류 상태 (네온 레드) */
  --space-rank-row-gap: 8px;     /* 보드 행 간격 */
}
```

### 5.4 접근성 (frozen)

- `#nickname-input` 은 `aria-label="닉네임 입력"` 을 가진다.
- `#rank-submit` control 은 `aria-label="랭킹 등록"` 을 가진다.
- `error` 상태 메시지는 `role="alert"` 로 스크린리더에 announce 된다.
- 모든 상태(idle/loading/submitting/success/error)는 색상만으로 구분하지 않고 상태명을 화면
  텍스트와 접근성 이름으로 노출한다.

### 5.5 반응형 (frozen)

- 320px 이상 폭에서 랭킹 보드 content overflow 가 발생하지 않는다.
- 좁은 화면에서 상위 10개 항목은 **세로 스크롤**로 접근 가능하다.

---

## 6. 통합 지점 & lifecycle hook (index.html / ranking.js)

랭킹 보드는 통합 런타임의 **뷰 동기화·상태 전이** 지점에 additive 로 배선한다. 기존 함수의
시그니처·동작은 바꾸지 않는다.

| hook 지점(기존 함수) | 추가 동작(additive) |
| --- | --- |
| 종료 진입(`handleGameOver()` → `game-over`) | 해당 모드 상위 10위 조회(`GET`, `loading`→`idle`), 닉네임 입력·등록 control 노출 |
| 등록 클릭(`#rank-submit`) | 입력값 클라이언트 1차 검증 후 `POST`(`submitting`), 응답으로 보드 갱신(`success`) 또는 오류 노출(`error`) |
| 취소/실패 이후 | 상태·진행 표시를 `idle` 로 되돌리고 `#rank-submit` 재활성 |
| 시작 화면(`mode-selection`) | 해당 모드 상위 10위를 조회·표시(선택적, `idle`) |

- **연동 계약**: `ranking.js` 는 §3 API 계약과 §5 selector·token·상태만을 계약으로 사용한다.
- **점수 출처**: 등록 점수는 기존 최고 기록 계산과 동일 규칙(CPU 모드=사람 점수, 로컬=최고 점수)을
  따르되, 서버 등록 값은 이번 게임 종료 점수다(§4.3 제약 통과 값).

---

## 7. 불변 보장 (기존 동작 변경 금지 — ArchitectureModel constraints)

이번 작업은 **additive** 이며 아래 기존 동작을 **변경하지 않는다**.

- **게임 규칙**: `stepMultiplayer`/`step` 의 벽·자기·상호·head-to-head 충돌 판정 불변.
- **tick 루프**: `MP_TICK_MS` 고정 tick 누적 루프(`loop`) 타이밍·누적 로직 불변.
- **pause/resume/restart**: 일시정지·재개·재시작 상태 전이 불변.
- **localStorage 최고 기록**: `highscore.js` 및 `neon-snake-fullscreen-0802:highscore:*` 키의
  읽기/쓰기 동작 불변(서버 랭킹은 독립 공존).
- **selector/token 재정의 금지**: designer·developer 는 §5 selector·token 을 변경·재정의하지 않는다.
- **후조건 복원**: 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값(`idle`)으로 되돌리고 주
  실행 control(`#rank-submit`)을 다시 사용할 수 있어야 한다.
- **마이그레이션 additive**: `migrations/20260802_snake_scores.sql` 는 신규 테이블·인덱스만 생성한다.

---

## 8. 테스트 계획 (focused)

| TestSpec | 레벨 | 대상 | 파일 |
| --- | --- | --- | --- |
| TS-API-SUBMIT | integration | `POST` — 정상 등록, 닉네임 검증(공백/길이/제어문자), score 제약, `mode` 검증, 오류 코드 | `test/snakeScores.test.js` |
| TS-API-TOPLIST | integration | `GET` — 모드 격리, `score DESC/created_at ASC` 정렬, 상위 10 clamp, 빈 결과, `mode` 검증 | `test/snakeScores.test.js` |
| TS-UI-BOARD | unit/integration | `ranking.js` 상태(idle/loading/submitting/success/error) 렌더, selector·aria 노출, 오류 `role=alert` | `demo/neon-snake-fullscreen-0802/tests/ranking.test.js` |

- 실행 범위는 **focused**: 신규/영향 테스트만 실행한다. API 테스트는 인메모리/픽스처 저장소로,
  UI 테스트는 fetch 를 스텁하여 결정론적으로 검증한다.

---

## 9. handoff 요약

- **designer(BF-1530 → `docs/design/snake-ranking-BF-1530.md`,
  `docs/design/snake-ranking-mockup-BF-1530.html`)**: §5 UI 계약을 시각 명세·목업으로 구체화.
  selector·token·상태·접근성·반응형을 **재정의하지 말고** 준수. 새 파일/역할 추가 금지.
- **developer(BF-1533)**:
  - API/DB: `src/routes/snakeScores.js`(§3), `migrations/20260802_snake_scores.sql`(§4),
    `test/snakeScores.test.js`(§8) — additive.
  - UI: `demo/.../ranking.js`, `ranking.css`, `index.html`(§5·§6), `tests/ranking.test.js`(§8) — additive.
  - §7 불변 보장(게임 규칙·tick·충돌·localStorage 최고 기록 보존) 준수.
</content>
</invoke>

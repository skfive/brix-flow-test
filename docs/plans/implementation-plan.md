# 스네이크 랭킹 cross-repo 실행 설계 및 UI/API 계약 (BF-1543)

> 본 문서는 planner가 먼저 작성하고 **designer(BF-1540) / developer(BF-1542) / reviewer / tester** 가 그대로 따르는
> 실행 설계(`planning-contract@v1`)이자 동결 UI 계약(`ui-contract@v1`)의 렌더링본입니다.
> **selector·상태 텍스트·token·API 스키마·검증 규칙·DB 인덱스/멱등성은 아래 값이 유일한 권위**이며 후속 페르소나는 이를 변경·재정의하지 않습니다.
> 본 문서는 frozen blueprint의 파일·소유자·상태·후조건을 설명할 뿐, 새 파일이나 새 역할을 추가하지 않습니다.

- Jira: BF-1543 (planner)
- Epic 형제 Task: BF-1540(designer) · BF-1542(developer)
- executionProfile: `implementation-strict` / 기획 보증 수준: `standard`
- 대상 저장소: backend (primary, vanilla-static / esm / serve_root=`.`) · infra (reference, read-only)
- 대상 route: `/demo/neon-snake-fullscreen-0802`
- API 엔드포인트: `POST /api/snake/scores` · `GET /api/snake/scores`

---

## 1. Problem Statement

### 현재 상황
네온 스네이크 게임은 클라이언트에서만 최고 점수를 다루며(localStorage 기반), 여러 플레이어의 점수를 모아 보여주는
공유 랭킹 보드가 없다. backend 프런트 UI(랭킹 보드·닉네임 입력)와 랭킹 점수를 저장·조회하는 API/DB 계약이
병렬 producer가 참조 가능한 형태로 **동결**되지 않으면, 각자 다른 스키마·검증 규칙·selector로 구현해 handoff
충돌이 발생한다.

### 목표
- 점수 등록(`POST`)·랭킹 조회(`GET`) `/api/snake/scores` 의 요청/응답 스키마와 닉네임/점수/모드 검증 규칙을 확정한다.
- `snake_scores` 테이블 스키마·인덱스·마이그레이션 멱등성 요구를 명시한다.
- 랭킹 보드/닉네임 입력 UI 계약(파일·DOM ID/class·상태 모델·token·접근성·반응형)을 동결한다.
- **서버 오류 시에도 게임 진행이 유지되고 localStorage 최고 점수가 보존되는** 보존 영역 제약을 명시한다.

### 비즈니스 임팩트
동결된 실행 설계와 UI/API 계약은 병렬 producer의 재작업·머지 충돌을 제거하고, 멱등 마이그레이션과 명시적 검증
규칙은 랭킹 데이터의 무결성과 재현 가능한 배포를 보장한다.

---

## 2. Proposed Solution (Overview)

클라이언트 랭킹 UI가 게임 종료 시 닉네임과 점수를 `POST /api/snake/scores` 로 제출하고, `GET /api/snake/scores`
로 상위 랭킹을 조회해 보드를 갱신한다. 서버는 검증 통과 시 `snake_scores` 테이블에 저장하고 모드별 순위를 산출한다.
서버 오류가 나도 게임은 계속 진행되며 클라이언트는 `error` 상태로 전이하되 진행·localStorage를 보존하고 재시도할 수 있다.

### 파일 소유권 (frozen — 재정의 금지)

| 파일 | 소유자 | 정책 | 역할 |
| --- | --- | --- | --- |
| `docs/design/snake-ranking-BF-1539.md` | designer (BF-1540) | additive | 랭킹 보드/닉네임 입력 상태별 시각 설계·token 매핑 명세 |
| `demo/neon-snake-fullscreen-0802/index.html` | developer (BF-1542) | additive | 랭킹 보드/닉네임 입력 DOM + token 정의 |
| `demo/neon-snake-fullscreen-0802/ranking.js` | developer (BF-1542) | additive | 랭킹 조회/제출·상태 전이·보존 로직 (ESM) |
| `demo/neon-snake-fullscreen-0802/tests/ranking.test.js` | developer (BF-1542) | additive | 프런트 랭킹/보존 계약 검증 테스트 |
| `src/db/snake-scores.js` | developer (BF-1542) | additive | `snake_scores` 스키마·마이그레이션·조회/삽입 (ESM) |
| `src/routes/snake-scores.js` | developer (BF-1542) | additive | `POST`/`GET /api/snake/scores` 라우트·검증 |
| `tests/snake-scores.test.js` | developer (BF-1542) | additive | API/DB 계약 검증 테스트 |
| `docs/plans/implementation-plan.md` | planner (BF-1543, 본 문서) | — | 실행 설계 + RTM |

> 위 소유권과 상태 계약의 유일한 권위는 frozen blueprint이며 본 planner 문서는 이를 재정의하지 않는다.
> `additive` 정책: 후속 페르소나는 아래 계약된 selector/token/상태/스키마/규칙을 **추가·구현**하되 변경·삭제·재정의하지 않는다.

---

## 3. Exact UI Contract (frozen — 유일 권위)

### 3.1 파일
- `demo/neon-snake-fullscreen-0802/index.html`
- `demo/neon-snake-fullscreen-0802/ranking.js`
- `demo/neon-snake-fullscreen-0802/tests/ranking.test.js`
- `docs/design/snake-ranking-BF-1539.md`

### 3.2 DOM ID (변경 금지)

| 역할 | DOM ID |
| --- | --- |
| 랭킹 보드 컨테이너 | `snake-ranking-board` |
| 닉네임 입력 | `snake-nickname-input` |
| 점수 등록 버튼 | `snake-score-submit` |

### 3.3 CSS class (변경 금지)

| 역할 | class |
| --- | --- |
| 랭킹 보드 | `ranking-board` |
| 랭킹 보드 행 | `ranking-board__row` |
| 점수 등록 버튼 | `score-submit` |

### 3.4 상태(state) 모델 (변경 금지)

| state | 의미 | 화면 텍스트(예시, 상태명 노출 필수) |
| --- | --- | --- |
| `idle` | 초기/입력 대기 | `대기 중` |
| `submitting` | `POST` 제출 진행 중 | `등록 중…` |
| `success` | 등록 성공·보드 갱신 | `등록 완료` |
| `error` | 서버/검증 실패(진행 보존) | `등록 실패 — 다시 시도` |

- 4개 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름 양쪽으로 노출한다.
- `submitting` 중에는 `snake-score-submit` 을 비활성화하고, `success`/`error` 후 다시 사용할 수 있어야 한다(§3.8).

### 3.5 Design token / CSS 변수 (변경 금지)

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-rank-accent` | `#39ff14` | 랭킹 강조색(상위 순위·강조 텍스트) |
| `--space-ranking-row-gap` | `8px` | 랭킹 보드 행 간격 |

### 3.6 접근성 (Accessibility — 필수)

1. `snake-nickname-input` 은 `aria-label="닉네임"` 을 가진다.
2. `snake-score-submit` 은 `aria-label="랭킹 등록"` 을 가진다.
3. `snake-nickname-input` 에서 **Enter 키**로 랭킹 등록을 제출할 수 있다.
4. `snake-ranking-board` 는 목록/표 시맨틱과 순위 정보를 스크린리더에 노출한다(예: `role="list"`/`table` + 순위 텍스트).
5. 모든 상태(§3.4)는 색상만으로 구분하지 않고 상태명을 **화면 텍스트와 접근성 이름** 양쪽으로 노출한다.

### 3.7 반응형 (Responsive — 필수)

1. `320px` 이상 뷰포트에서 `snake-ranking-board` 가 **가로 overflow 없이** 표시된다.
2. 기존 게임 캔버스 레이아웃과 breakpoint는 유지된다(랭킹 UI가 게임 캔버스 레이아웃을 침범·재정의하지 않는다).

### 3.8 상태 후조건 / 보존 (필수)

- 초기화·취소·실패(`error`) 뒤에는 상태와 진행 표시를 초기값(`idle`)으로 되돌리고, 주 실행 control
  (`snake-score-submit` / Enter)을 다시 사용할 수 있어야 한다.
- **보존 영역 제약:** 서버 오류(네트워크 실패/`5xx`) 시 **게임 진행은 유지**되고, 클라이언트의 localStorage
  최고 점수는 **보존**된다. 랭킹 제출 실패가 게임 상태나 로컬 저장 점수를 손상·초기화하지 않는다.

---

## 4. API 계약 — `/api/snake/scores` (frozen — 유일 권위)

### 4.1 `POST /api/snake/scores` — 점수 등록

요청(`Content-Type: application/json`):

```json
{ "nickname": "네온왕", "score": 1200, "mode": "solo" }
```

| 필드 | 타입 | 검증 규칙 |
| --- | --- | --- |
| `nickname` | string | 필수. 앞뒤 공백 trim 후 길이 `1–12`. 제어문자 금지. 빈 문자열/공백-only 거부. |
| `score` | integer | 필수. 정수. `0 ≤ score ≤ 999999`. 소수·음수·`NaN`·문자열 숫자 거부. |
| `mode` | string(enum) | 필수. `solo` \| `cpu` \| `versus` 중 하나. 그 외 값 거부. |

응답 `201 Created`:

```json
{ "id": 42, "nickname": "네온왕", "score": 1200, "mode": "solo", "rank": 3, "createdAt": "2026-08-02T09:00:00.000Z" }
```

- `rank` 는 **같은 `mode`** 안에서 `score` 내림차순 기준 순위(1-base). 동점은 `createdAt` 오름차순(먼저 등록이 상위).

실패 응답:

| 상태 | 조건 | body |
| --- | --- | --- |
| `400 Bad Request` | 검증 실패(위 규칙 위반) | `{ "error": "validation_error", "message": "<사유>" }` |
| `500 Internal Server Error` | 서버/DB 오류 | `{ "error": "internal_error", "message": "<사유>" }` |

### 4.2 `GET /api/snake/scores` — 랭킹 조회

쿼리 파라미터:

| 파라미터 | 타입 | 규칙 |
| --- | --- | --- |
| `mode` | string(enum) | 선택. `solo`\|`cpu`\|`versus`. 지정 시 해당 모드만 필터, 미지정 시 전체. 잘못된 값은 `400`. |
| `limit` | integer | 선택. 기본 `10`, 최대 `100`. 범위 밖·비정수는 `400` 또는 clamp(기본 `10`)—구현은 `400` 반환을 권장. |

응답 `200 OK` (정렬: `score` DESC → `createdAt` ASC):

```json
{
  "scores": [
    { "rank": 1, "nickname": "네온왕", "score": 1500, "mode": "solo", "createdAt": "2026-08-02T08:00:00.000Z" }
  ]
}
```

- 결과가 없으면 `{ "scores": [] }` 를 `200` 으로 반환한다(빈 보드는 오류가 아니다).

### 4.3 계약 불변식
- 응답 필드명·정렬 규칙·enum 값(`solo`/`cpu`/`versus`)은 위 값을 유일 권위로 삼으며 변경하지 않는다.
- 검증은 서버 측에서 반드시 수행한다(클라이언트 검증은 UX 보조일 뿐 권위가 아니다).

---

## 5. 데이터 모델 · DB 계약 (frozen — 유일 권위)

### 5.1 테이블 `snake_scores`

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY (autoincrement) |
| `nickname` | TEXT | NOT NULL (trim 후 1–12자) |
| `score` | INTEGER | NOT NULL (`0 ≤ score ≤ 999999`) |
| `mode` | TEXT | NOT NULL (`solo`\|`cpu`\|`versus`) |
| `created_at` | TEXT | NOT NULL (ISO-8601 UTC, 기본값 현재 시각) |

### 5.2 인덱스
- `idx_snake_scores_mode_score` on (`mode`, `score` DESC) — 모드별 랭킹 조회 정렬 최적화.

### 5.3 마이그레이션 멱등성 (필수)
- `CREATE TABLE IF NOT EXISTS snake_scores (...)` — 이미 존재하면 재생성하지 않는다.
- `CREATE INDEX IF NOT EXISTS idx_snake_scores_mode_score ...` — 이미 존재하면 재생성하지 않는다.
- **마이그레이션을 여러 번 실행해도 부작용(중복 테이블/인덱스/데이터 유실)이 없어야 한다.**

### 5.4 불변식
- `score` 는 항상 정수 `≥ 0`. `mode` 는 3개 enum 값만 저장된다. `nickname` 은 trim 후 비어있지 않다.

---

## 6. User Stories & Scenarios (Given/When/Then)

### US-1. 점수 등록
- **Given** 게임이 끝나 랭킹 UI가 `idle` 이고 유효한 점수가 있다
- **When** 닉네임을 입력하고 `snake-score-submit`(또는 Enter)로 제출한다
- **Then** `submitting → success` 로 전이하고 `POST /api/snake/scores` 가 `201` 을 반환하며 보드가 갱신된다

### US-2. 검증 실패
- **Given** 닉네임이 공백-only 이거나 `score` 가 음수/비정수이거나 `mode` 가 enum 밖이다
- **When** 제출한다
- **Then** 서버가 `400 validation_error` 를 반환하고 클라이언트는 `error` 상태로 사유를 노출한다(게임/로컬 점수 보존)

### US-3. 랭킹 조회
- **Given** 저장된 점수가 존재한다
- **When** `GET /api/snake/scores?mode=solo&limit=10` 을 조회한다
- **Then** `score` DESC → `createdAt` ASC 정렬로 상위 10개가 `rank` 와 함께 반환되어 보드에 표시된다

### US-4. 서버 오류 · 보존
- **Given** 랭킹 서버가 `5xx` 또는 네트워크 오류를 반환한다
- **When** 점수를 제출한다
- **Then** 클라이언트는 `error` 상태로 전이하되 **게임 진행과 localStorage 최고 점수는 보존**되고, 재시도할 수 있다

### US-5. 접근성 · 반응형
- **Given** 스크린리더 사용자가 320px 뷰포트에서 랭킹을 본다
- **When** 상태가 전이되거나 보드를 읽는다
- **Then** 각 상태명이 화면 텍스트·접근성 이름으로 노출되고, 닉네임/버튼은 `aria-label` 과 Enter 제출을 지원하며,
  보드는 가로 overflow 없이 순위 정보를 노출한다(기존 캔버스 레이아웃 유지)

---

## 7. Edge / 실패 케이스

| # | 케이스 | 기대 동작 |
| --- | --- | --- |
| E-1 | `nickname` 공백-only / 13자 이상 | `400 validation_error` |
| E-2 | `score` 음수 / 소수 / `NaN` / 문자열 | `400 validation_error` |
| E-3 | `mode` enum 밖 값 | `400 validation_error` |
| E-4 | `GET` `limit` 초과(>100) / 비정수 | `400`(권장) 또는 기본 `10` clamp — 구현은 `400` 반환 |
| E-5 | 저장 데이터 없음 | `GET` → `200 { "scores": [] }` |
| E-6 | 동점 점수 | `createdAt` 오름차순으로 순위 결정(먼저 등록 상위) |
| E-7 | 마이그레이션 재실행 | 테이블/인덱스 재생성·데이터 유실 없음(멱등) |
| E-8 | 서버 `5xx`/네트워크 실패 | 클라이언트 `error` 상태, 게임 진행·localStorage 보존, 재시도 가능 |
| E-9 | 320px 좁은 뷰포트 | `snake-ranking-board` 가로 overflow 없음, 캔버스 레이아웃 유지 |

---

## 8. Requirements Traceability Matrix (RTM)

| Req | 수용 기준(요약) | 시나리오 | 검증(TestSpec) | Evidence |
| --- | --- | --- | --- | --- |
| REQ-1 | `POST /api/snake/scores` 점수 등록 + nickname/score/mode 검증 | US-1,US-2 / E-1~E-3 | TS-API | build_result, test_result |
| REQ-2 | `GET /api/snake/scores` 정렬·필터·limit 랭킹 조회 | US-3 / E-4~E-6 | TS-API | build_result, test_result |
| REQ-3 | `snake_scores` 스키마·인덱스·마이그레이션 멱등성 | (전체) / E-7 | TS-API | build_result, test_result |
| REQ-4 | 랭킹 보드/닉네임 입력 exact UI 계약(DOM/class/상태/token/접근성/반응형) | US-5 / E-9 | TS-FE | build_result, test_result |
| REQ-5 | 서버 오류 시 게임 진행 유지 + localStorage 보존 | US-4 / E-8 | TS-FE | build_result, test_result |

### 마이그레이션 무결
- `snake_scores` 는 `IF NOT EXISTS` 로 멱등 생성. 기존 저장소 규약(vanilla-static/esm/npm) 유지.
- 파일 정책은 모두 `additive` — 기존 파일 구조를 파괴하지 않는다.

### 롤백
- 신규 추가 파일(`src/db/snake-scores.js`, `src/routes/snake-scores.js`, `demo/neon-snake-fullscreen-0802/ranking.js` 등)
  제거와 `snake_scores` 테이블 drop 으로 무손상 롤백 가능. 공유 utility·전역 상태 변경 없음.

### KPI (Success Metrics)
- API 정확도: 검증 규칙 4종(E-1~E-3) 100% 차단, 정렬(E-6) 재현율 100%.
- 멱등성: 마이그레이션 N회 반복 시 스키마/데이터 불변 100%.
- 보존: 서버 오류 시 게임 진행·localStorage 보존율 100%.
- 접근성/반응형: 상태 4종 텍스트+접근성 이름 노출, 320px overflow 0건.

---

## 9. Handoff 지시 (후속 페르소나)

- **designer (BF-1540)** — `docs/design/snake-ranking-BF-1539.md` 에 §3 상태별(4종) 시각 스타일(token 매핑,
  랭킹 보드/행/버튼/입력)을 명세한다. selector·상태·token 값은 §3을 그대로 사용하고 변경하지 않는다.
- **developer (BF-1542)** — API/DB(`src/db/snake-scores.js`·`src/routes/snake-scores.js`·`tests/snake-scores.test.js`)는
  §4~§5 스키마·검증·인덱스·멱등성을, 프런트(`index.html`·`ranking.js`·`tests/ranking.test.js`)는 §3 selector/token/
  상태/접근성/반응형과 §3.8 보존 제약을 그대로 구현한다. reference repo `infra` 는 read-only 참조만 한다.
- **reviewer** — §4~§5 API/DB 계약값과 §3 UI 계약값이 재정의 없이 그대로 구현됐는지, §3.8/§7 E-8 보존 제약과
  §5.3 멱등성이 지켜지는지 검토한다.
- **tester** — 검증 규칙(§4)·정렬/필터(§4.2)·멱등성(§5.3)·보존(§3.8)·접근성/반응형(§3.6~§3.7)을 검증한다.

> 모든 후속 페르소나는 본 문서 §3~§5 계약값을 유일 권위로 삼으며 selector·token·상태·API 스키마·검증 규칙을 재정의하지 않는다.

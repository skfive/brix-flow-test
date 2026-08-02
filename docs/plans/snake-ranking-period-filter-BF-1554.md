# 랭킹 기간 필터 구현 설계 (BF-1554)

- 상태: active (planner 동결 실행 설계 — designer/developer가 그대로 따른다)
- 작성: planner(박기획) · BF-1557
- 소비: designer(BF-1555), developer(BF-1556)
- 원칙: 이 문서는 frozen Execution Blueprint의 **파일·소유자·상태·후조건을 그대로 렌더**한다. 새 파일·새 역할·selector/token 재정의를 추가하지 않는다.

---

## 1. 목표와 범위

게임 종료 랭킹 보드에 **기간 필터 토글**(`전체` / `최근 7일`)을 추가한다.
- 랭킹 조회 API에 `period` 파라미터를 **additive**로 도입한다.
- 랭킹 보드 UI에 기간 토글 control을 **additive**로 추가한다.
- 게임 로직·POST 저장 경로·`localStorage` 최고 기록은 **보존**한다.

Non-goal: 게임 규칙/충돌 판정/tick 루프 변경, 점수 등록(POST) 계약 변경, 새 데이터 엔티티 추가.

---

## 2. 파일·소유자·상태 계약 (frozen blueprint 그대로)

| 경로 (frozen 표기) | 소유자 | artifact-policy | 상태 |
| --- | --- | --- | --- |
| `docs/plans/snake-ranking-period-filter-BF-1554.md` | planner | — | active |
| `docs/design/snake-ranking-period-filter-BF-1554.md` | designer | additive | 후속 작성 |
| `demo/neon-snake-fullscreen-0802/index.html` | developer | additive | 후속 작성 |
| `demo/neon-snake-fullscreen-0802/ranking.js` | developer | additive | 후속 작성 |
| `demo/neon-snake-fullscreen-0802/scores-api.js` | developer | additive | 후속 작성 |
| `demo/neon-snake-fullscreen-0802/tests/ranking-period.test.js` | developer | additive | 후속 작성 |

> **실제 저장소 경로 참고(grounding)**: 현재 base SHA에서 랭킹 코드는 `demo/neon-snake-fullscreen-0802/src/ranking.js`, `demo/neon-snake-fullscreen-0802/src/scores-api.js`에 있고 테스트는 `demo/neon-snake-fullscreen-0802/tests/` 아래에 있다. developer는 위 frozen 표기의 소유 파일을 **현재 위치의 동일 모듈**에 additive로 반영한다(파일 이동·신설 금지, selector/token 재정의 금지).

- **backend 단일 저장소 산출물 원칙**: 점수 조회/저장 로직은 `scores-api.js` 단일 모듈에서만 다룬다. period 필터 계산은 이 모듈에 additive로 추가하고, 별도 저장소·중복 저장 계층을 만들지 않는다.

---

## 3. API 스펙 — 랭킹 기간 필터 (`period`)

### 3.1 계약

`GET /api/snake/scores` 조회에 **additive** `period` 쿼리 파라미터를 추가한다.

| 항목 | 계약 |
| --- | --- |
| 허용 값 | `period=all` \| `period=7d` |
| 생략 시 | `all`과 동일 (기존 호환) |
| 잘못된 값 | HTTP `400` (예: `period=30d`, `period=`, `period=xyz`) |
| `all` 응답 | 전체 기간 상위 10개, score 내림차순 |
| `7d` 응답 | `recordedAt`이 **요청 시점 기준 7일 이내**인 기록만 대상으로 상위 10개, score 내림차순 |
| 응답 형식 | `{ rank, nickname, score, recordedAt }` (기존과 동일 — 변경 없음) |

- `period` 미지정 호출은 **기존과 완전히 동일하게** 동작한다(무한 호환). 응답 항목 형식 `{ rank, nickname, score, recordedAt }`을 유지한다.
- 현재 base SHA의 `fetchScores(fetchImpl, { mode, limit })`는 유지하며, `period`는 **추가** 인자/쿼리로만 전달한다(기존 `mode`/`limit` 의미 불변).
- 400 판정은 서버측(정적 데모의 `createScoresStore`/store fetch 어댑터 포함)에서 수행하고, 클라이언트는 400/네트워크 오류를 `error` 상태로 변환한다.

### 3.2 시간 경계 규칙 (7d)

- 기준: `now - recordedAt <= 7일`. 경계값 `정확히 7일`은 포함(≤), `7일 초과`는 제외.
- 정렬: score 내림차순. 동점 처리는 기존 랭킹 정렬 규칙(먼저 기록된 순 → 닉네임 asc)을 그대로 따른다.
- 절삭: 필터 후 상위 10개.

---

## 4. UI 계약 — 랭킹 기간 토글 (frozen ui-contract 그대로)

### 4.1 DOM

| 항목 | 값 |
| --- | --- |
| DOM ID | `ranking-period-toggle`, `ranking-period-all`, `ranking-period-7d`, `ranking-board-list` |
| CSS class | `ranking-toggle`, `ranking-toggle__option`, `ranking-toggle__option--active` |

- selector와 token은 **변경·재정의 금지**. 위 이름을 그대로 사용한다.

### 4.2 상태

`idle` → `loading` → `success` / `error`
- `idle`: 초기값. 진행 표시 없음.
- `loading`: 선택한 기간의 점수를 조회 중.
- `success`: 조회 성공, 보드 렌더 완료.
- `error`: 조회 실패. 색상 외에 `'랭킹을 불러올 수 없습니다'` 텍스트를 화면에 표시.
- 모든 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.
- 초기화·취소·실패 뒤에는 상태와 진행 표시를 **초기값으로 되돌리고** 주 실행 control(토글)을 다시 사용할 수 있어야 한다.

### 4.3 디자인 토큰

| 토큰 | 값 |
| --- | --- |
| `--color-ranking-toggle-active` | `#39ff14` |
| `--color-ranking-toggle-idle` | `#94a3b8` |
| `--space-ranking-toggle-gap` | `8px` |

### 4.4 접근성

- 기간 토글 컨테이너는 `role=radiogroup`과 `aria-label="랭킹 기간 선택"`을 가진다.
- 각 토글 옵션은 `aria-pressed`로 선택 상태를 노출하고, **좌우 화살표 키**로 옵션 간 이동이 가능하다.
- `error` 상태에서는 색상 외에 `'랭킹을 불러올 수 없습니다'` 텍스트를 화면에 표시한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.5 반응형

- `320px` 이상에서 토글과 랭킹 리스트에 **가로 overflow가 발생하지 않는다**.
- 좁은 폭에서 토글 옵션이 줄바꿈되어도 랭킹 보드 레이아웃이 유지된다.

---

## 5. 사용자 시나리오

플레이어는 게임을 마친 뒤 랭킹 보드에서 기간을 골라 순위를 본다.

1. 보드가 열리면 기본 `전체(all)` 기준 상위 10위가 표시된다.
2. 플레이어가 `최근 7일(7d)` 토글을 선택한다.
3. 보드가 `loading`을 표시하고, 7일 이내 상위 10위를 score 내림차순으로 다시 렌더한다(`success`).
4. 다시 `전체`를 선택하면 전체 기준 상위 10위로 복귀한다.
5. 조회가 실패하면 `error` 텍스트가 표시되고, 토글은 다시 선택 가능한 상태로 유지된다.

---

## 6. Acceptance Criteria (Given / When / Then)

### AC-1 · period 기본 호환
- **Given** 랭킹 조회 시 `period`를 지정하지 않고
- **When** `GET /api/snake/scores`를 호출하면
- **Then** `all`과 동일하게 상위 10개를 score 내림차순으로 반환하고, 각 항목은 `{ rank, nickname, score, recordedAt }` 형식이다.

### AC-2 · period=all
- **Given** `period=all`로
- **When** 조회하면
- **Then** 전체 기간 상위 10개를 score 내림차순으로 반환한다.

### AC-3 · period=7d
- **Given** `period=7d`로
- **When** 조회하면
- **Then** `recordedAt`이 요청 시점 기준 7일 이내인 기록만 대상으로 상위 10개를 score 내림차순으로 반환한다.

### AC-4 · 잘못된 값 거부
- **Given** `period`가 `all`/`7d`가 아닌 값(예: `30d`)일 때
- **When** 조회하면
- **Then** 서버는 HTTP `400`을 반환하고, UI는 `error` 상태로 전환한다.

### AC-5 · 토글 UI 상태
- **Given** 랭킹 보드가 열려 있고
- **When** 플레이어가 `ranking-period-7d`를 선택하면
- **Then** 보드는 `loading` → `success`로 전환되고, 선택된 옵션에 `ranking-toggle__option--active`와 `aria-pressed`가 반영된다.

### AC-6 · 접근성/반응형
- **Given** 토글 컨테이너가 렌더되면
- **When** 화면 폭이 `320px` 이상이거나 스크린리더로 접근하면
- **Then** 가로 overflow가 없고, `role=radiogroup`·`aria-label="랭킹 기간 선택"`·옵션별 `aria-pressed`·좌우 화살표 이동이 동작한다.

### AC-7 · 보존 영역
- **Given** 이번 변경이 적용되어도
- **When** 게임 실행/충돌/tick/POST 저장/`localStorage` 최고 기록을 사용하면
- **Then** 기존과 동일하게 동작한다(수정되지 않는다).

---

## 7. 데이터 모델

**신규 엔티티/필드 없음.** 기존 점수 레코드 `{ nickname, score, recordedAt }`를 그대로 사용한다.
- `period=7d` 필터는 기존 `recordedAt`(ISO 문자열)을 기준으로 조회 시점에 **계산만** 한다(저장 스키마 변경 없음).
- 점수 저장(POST), 멱등 upsert, 닉네임/점수 검증 규칙은 변경하지 않는다.

---

## 8. Edge / 실패 케이스

| 케이스 | 기대 동작 |
| --- | --- |
| `period` 생략 | `all`과 동일 (호환) |
| `period=all` | 전체 상위 10 |
| `period=7d`, 7일 이내 기록 0건 | 빈 보드(항목 0개), `success` |
| `period` 경계값 정확히 7일 | 포함(≤) |
| `period=30d` / `period=` / 오타 | 서버 `400` → UI `error` |
| 네트워크/조회 실패 | UI `error` + `'랭킹을 불러올 수 없습니다'` 텍스트, 토글 재사용 가능 |
| 토글 재선택(all↔7d 반복) | 매번 `loading`→`success`, 직전 상태로 되돌아갈 수 있음 |
| 좁은 폭(320px) | 가로 overflow 없음, 옵션 줄바꿈되어도 레이아웃 유지 |

---

## 9. 보존 영역 가드 (수정 금지)

- 게임 규칙·충돌 판정·tick 루프 (`src/game.js`, `cpu.js`).
- 점수 등록 `POST` 경로 및 멱등 upsert·검증 (`scores-api.js`의 `submitScore`/`post`).
- `localStorage` 최고 기록 (`highscore.js`).
- 기존 selector·design token — **재정의 금지**.
- 모든 소유 파일 변경은 **additive**로만 반영한다.

---

## 10. 핸드오프 계약

- **designer(BF-1555)**: `docs/design/snake-ranking-period-filter-BF-1554.md`에 위 §4 UI 계약(DOM ID/class, 상태, 토큰, 접근성, 반응형)을 시각 명세로 렌더한다. selector·token 변경 금지.
- **developer(BF-1556)**: `scores-api.js`에 `period` 필터를 additive로, `ranking.js`+`index.html`에 토글 control을 additive로 구현하고 `tests/ranking-period.test.js`로 검증한다. §3 API 계약과 §4 UI 계약을 그대로 따른다.
- **reviewer / tester**: §6 AC와 §8 edge 케이스를 verdict/E2E 기준으로 사용한다.

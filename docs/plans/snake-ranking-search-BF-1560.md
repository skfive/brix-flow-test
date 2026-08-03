# 닉네임 검색 구현 설계 (snake ranking search)

- Jira Epic: BF-1560 (닉네임 검색)
- planner task: BF-1563
- 상태: 실행 설계(frozen blueprint 렌더링) — designer/developer가 그대로 따르는 계약
- 대상: `demo/neon-snake-fullscreen-0802` 네온 스네이크 랭킹 + `api/snake/scores`

> 이 문서는 frozen Execution Blueprint의 파일·소유자·상태·후조건을 **그대로 설명**한다.
> 새 파일·새 역할·계약 밖 요구사항을 추가하지 않는다. 파일 소유권/상태 계약의 유일한 권위는
> frozen blueprint이며, 본 문서는 이를 재정의하지 않는다.

---

## 1. 배경 · 목표

기존 네온 스네이크 랭킹에는 이미 점수 저장·조회·기간 필터가 존재한다. 사용자가 자신의
닉네임으로 랭킹에서 "내 순위"를 즉시 찾을 수 있는 검색 기능을 추가한다.

- 목표: 닉네임 입력 → "내 순위 찾기" → 해당 닉네임의 순위/점수/기록 시각을 한 줄로 표시.
- 범위: 검색은 **추가(additive)** 기능이다. 기존 랭킹 조회·저장·게임 루프·localStorage 최고
  기록은 손대지 않는다.

## 2. 기존 경로 보존 규칙 (반드시 준수 — additive only)

designer/developer는 아래 경로를 **읽기 전용 불변**으로 취급한다. 응답 형태·요청 경로·동작을
변경하지 않는다.

| 보존 대상 | 규칙 |
| --- | --- |
| `GET /api/snake/scores` | 랭킹 목록 응답 스키마/정렬/기간 필터 파라미터를 변경하지 않는다. 검색은 별도 endpoint를 신설한다. |
| `POST` 점수 저장 경로 | 저장 요청/응답·검증 로직을 변경하지 않는다. 검색은 저장을 트리거하지 않는 순수 조회다. |
| 게임 루프 | 스네이크 게임 루프·렌더링·타이밍·일시정지 입력 처리에 손대지 않는다. |
| localStorage 최고 기록 | 로컬 최고 점수 저장/복원 로직을 변경하지 않는다. 검색 결과는 localStorage에 쓰지 않는다. |
| 기존 랭킹 UI/기간 토글 | 기존 랭킹 목록·기간 필터 DOM/이벤트를 재정의하지 않는다. 검색 UI는 인접에 **추가**된다. |

## 3. 검색 API 계약 — `GET /api/snake/scores/search`

신규 endpoint. 기존 `GET /api/snake/scores`와 **분리**한다.

### 요청 파라미터

| 파라미터 | 필수 | 규칙 |
| --- | --- | --- |
| `nickname` | 필수 | 2~12자, 한글/영문/숫자만 허용. 범위 밖이면 400. |
| `mode` | 선택 | `single` 또는 `versus`. 기본값 `single`. 그 외 값은 400. |

### 응답

- **200 (found)** — 해당 닉네임의 최고 기록 1건:

  ```json
  { "rank": 1, "nickname": "박기획", "score": 1234, "recordedAt": "2026-08-03T12:00:00.000Z" }
  ```

  - `rank`: 정수(1-base), 해당 mode 랭킹 내 순위.
  - `nickname`: 조회한 닉네임(정규화된 원문).
  - `score`: 정수 점수.
  - `recordedAt`: ISO-8601 기록 시각.

- **404 (not-found)** — 유효한 닉네임이지만 기록이 없을 때. 본문은 검색 실패를 나타내며
  UI는 not-found 상태로 처리한다.
- **400 (bad-request)** — `nickname` 길이/문자 위반 또는 `mode` 값 위반. UI는 error 상태로
  처리한다.

### 서버 파일 (developer 소유, additive)

- `api/snake/scores/search.js` — 검색 endpoint 구현.
- `api/snake/scores/search.test.js` — found/not-found/400(길이·문자·mode) 단위 테스트.

## 4. UI 계약 (frozen — selector/token 변경 금지)

designer와 developer는 아래 selector·token을 **변경하거나 재정의하지 않는다**. 검색 UI는 기존
랭킹 영역에 additive로 삽입한다.

### 4.1 파일 (소유자)

| 파일 | 소유자 | 정책 |
| --- | --- | --- |
| `demo/neon-snake-fullscreen-0802/index.html` | developer | additive |
| `demo/neon-snake-fullscreen-0802/ranking-search.js` | developer | additive |
| `demo/neon-snake-fullscreen-0802/tests/ranking-search.test.js` | developer | additive |
| `docs/design/snake-ranking-search-BF-1560.md` | designer | additive (시각 명세) |
| `api/snake/scores/search.js` | developer | additive |
| `api/snake/scores/search.test.js` | developer | additive |

### 4.2 DOM ID / class

| 요소 | ID | class |
| --- | --- | --- |
| 닉네임 입력창 | `rank-search-input` | `rank-search` (컨테이너) |
| "내 순위 찾기" submit | `rank-search-submit` | `rank-search__submit` |
| 결과 표시 영역 | `rank-search-result` | `rank-search__result` |

### 4.3 상태 (states)

`idle` · `searching` · `found` · `not-found` · `error`

| 상태 | 트리거 | 화면 텍스트 |
| --- | --- | --- |
| `idle` | 초기/입력 대기 | 결과 영역 비움, submit 활성 |
| `searching` | submit 클릭 후 응답 대기 | 진행 표시, 중복 submit 방지 |
| `found` | 200 응답 | 순위·닉네임·점수·기록 시각 한 줄 표시 |
| `not-found` | 404 응답 | "해당 닉네임의 기록이 없습니다" |
| `error` | 400/네트워크 오류 | "검색 중 오류가 발생했습니다" |

- **초기화/취소/실패 후**: 상태와 진행 표시를 초기값(`idle`)으로 되돌리고 submit control을
  다시 사용할 수 있어야 한다.

### 4.4 Design token / CSS 변수

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-action-primary` | `#22d3ee` | submit control 주 액션 색 |
| `--color-feedback-error` | `#f87171` | not-found·error 피드백 색 |
| `--space-control-gap` | `12px` | 입력창–버튼 간격 |

### 4.5 접근성 (accessibility)

- 닉네임 입력창은 `aria-label="닉네임 검색"`을 가진다.
- "내 순위 찾기" submit control은 명시적인 `aria-label`을 가진다.
- not-found·error 상태는 색상뿐 아니라 화면 텍스트("해당 닉네임의 기록이 없습니다",
  "검색 중 오류가 발생했습니다")로 안내한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.6 반응형 (responsive)

- 320px 이상 폭에서 입력창과 버튼이 가로 overflow 없이 배치된다.
- 결과 한 줄(순위·닉네임·점수·기록 시각)이 좁은 화면에서 넘치지 않게 줄바꿈/축약 처리한다.

## 5. Acceptance Criteria (Given/When/Then)

### AC-1 정상 검색 (found)
- **Given** 랭킹에 닉네임 "박기획"의 single mode 기록이 존재하고,
- **When** 사용자가 `rank-search-input`에 "박기획"을 입력하고 `rank-search-submit`을 누르면,
- **Then** `GET /api/snake/scores/search?nickname=박기획&mode=single`가 200을 반환하고,
  `rank-search-result`에 순위·닉네임·점수·기록 시각이 한 줄로 표시되며 상태는 `found`이다.

### AC-2 기록 없음 (not-found)
- **Given** 유효한 닉네임이지만 랭킹에 기록이 없을 때,
- **When** 검색을 실행하면,
- **Then** API가 404를 반환하고, 화면에 "해당 닉네임의 기록이 없습니다"가 표시되며 상태는
  `not-found`이다. (색상만으로 구분하지 않는다.)

### AC-3 입력 검증 오류 (error / 400)
- **Given** 닉네임이 1자 이하이거나 13자 이상이거나 허용되지 않는 문자를 포함하거나 `mode`가
  `single|versus` 밖일 때,
- **When** 검색을 실행하면,
- **Then** API가 400을 반환하고, 화면에 "검색 중 오류가 발생했습니다"가 표시되며 상태는
  `error`이다.

### AC-4 mode 기본값
- **Given** `mode` 파라미터를 지정하지 않았을 때,
- **When** 검색을 실행하면,
- **Then** `single`로 조회한다.

### AC-5 진행 상태 · 복구
- **Given** 검색이 진행 중일 때,
- **When** 응답 대기(`searching`) 중이면,
- **Then** 진행 표시가 노출되고 중복 submit이 방지되며, 응답/실패/취소 후 상태와 진행 표시는
  `idle`로 복귀하고 submit control을 다시 사용할 수 있다.

### AC-6 기존 경로 보존
- **Given** 검색 기능이 추가된 상태에서,
- **When** 기존 랭킹 조회(`GET /api/snake/scores`)·점수 저장(POST)·게임 루프·localStorage
  최고 기록을 사용하면,
- **Then** 응답 스키마·저장 경로·게임 동작·로컬 기록이 검색 추가 이전과 동일하게 동작한다.

## 6. Edge case · 실패 케이스

- 닉네임 앞뒤 공백: 정규화 후 길이 검증(2~12자). 정규화 후 길이 위반이면 400/error.
- 경계 길이: 정확히 2자·12자는 허용, 1자·13자는 400.
- 허용 외 문자(특수문자·이모지·공백 포함): 400/error.
- `mode`에 임의 문자열: 400. 대소문자 등 정확 일치만 허용(`single`/`versus`).
- 네트워크/타임아웃 오류: `error` 상태, "검색 중 오류가 발생했습니다", submit 재사용 가능.
- 연속 submit: `searching` 중 추가 submit은 무시(중복 요청 방지).
- 결과 표시 폭 초과(320px): 결과 한 줄 줄바꿈/축약으로 overflow 방지.

## 7. Handoff (역할별 후조건)

| packet | role | 산출물 | 선행 |
| --- | --- | --- | --- |
| `plan` | planner | `docs/plans/snake-ranking-search-BF-1560.md` (본 문서) | — |
| `design` | designer | `docs/design/snake-ranking-search-BF-1560.md` (시각 명세) | `plan` |
| `develop` | developer | `api/snake/scores/search.js` · `search.test.js` · `index.html` · `ranking-search.js` · `tests/ranking-search.test.js` | `plan` |
| `review` | reviewer | 검토 verdict | `design`, `develop` |
| `test` | tester | E2E/통합 검증 | `review` |

- designer/developer는 §3·§4의 API·selector·token을 **동결값 그대로** 구현한다.
- 기존 `GET /api/snake/scores` 응답·POST 저장 경로·게임 루프는 수정하지 않는다.

# 전달 상태 보드 구현 설계 동결 — BF-1275

> 이 문서는 frozen blueprint(`ui-contract@v1`, `planning-contract@v1`)를 실행 계획과
> handoff 계약으로 렌더링한 것입니다. 파일 소유권·상태 계약·selector·token 의 유일한
> 권위는 frozen blueprint 이며, 본 문서는 그 값을 재정의하지 않고 그대로 설명합니다.
> 새 파일·새 역할·계약 밖 요구사항을 추가하지 않습니다.

## 1. 목표와 범위

- **목표**: 전달(delivery) 진행 상황을 역할별 상태로 보여주는 정적 상태 보드를 additive
  신규 경로로 구현한다.
- **소비자**: designer(BF-1273), developer(BF-1274) 가 본 실행 설계와 UI 계약을 병렬로
  소비한다. tester(BF-1277) 가 후속 검증한다.
- **범위 밖(non-goal)**: 기존 파일·데이터 변경 없음. 백엔드 API 신규 구현 없음(보드는
  정적 상태 모델을 렌더링). 계약에 없는 상태/역할/토큰 추가 없음.

## 2. 파일 소유권 경계 (handoff 계약)

frozen blueprint 가 지정한 소유권을 그대로 따른다. 각 페르소나는 자신의 소유 경로만
생성/수정하며, 상대 경로의 selector·token 을 변경·재정의하지 않는다.

| 파일 | 소유자 | 성격 |
| --- | --- | --- |
| `demo/delivery-board/index.html` | developer | additive 신규 |
| `demo/delivery-board/src/board.js` | developer | additive 신규 |
| `demo/delivery-board/styles.css` | developer | additive 신규 |
| `docs/design/delivery-board-contract.md` | designer | additive 신규 |
| `docs/design/delivery-board-mockup.html` | designer | additive 신규 |
| `docs/planning/delivery-board-plan.md` | planner(본 문서) | additive 신규 |

- **경계 원칙**: designer 는 `docs/design/**` 만, developer 는 `demo/delivery-board/**`
  만 소유한다. 서로의 경로를 건드리면 병렬 작업 머지 충돌이 발생한다.
- **additive 전략**: 위 경로는 모두 신규 파일이다. 기존 파일이나 데이터를 변경하지 않는다.
  (`artifact-policy: additive` — 각 파일은 신규 생성만 허용)

## 3. exact UI 계약 (동결)

아래 값은 frozen `ui-contract@v1` 이 유일한 권위이며, designer 와 developer 는 이
selector·token 을 그대로 사용한다(변경·재정의 금지).

### 3.1 DOM ID

| ID | 역할 |
| --- | --- |
| `board-root` | 보드 최상위 컨테이너 |
| `board-revision` | 현재 리비전/버전 표시 영역 |
| `board-role-list` | 역할별 상태 목록(라이브 리전) |
| `board-refresh` | 상태 새로고침 control |

### 3.2 CSS class

| class | 역할 |
| --- | --- |
| `board` | 보드 루트 스타일 |
| `board__role` | 개별 역할 항목 |
| `board__status` | 상태 배지/라벨 |
| `board__refresh` | 새로고침 control 스타일 |

### 3.3 상태 모델 (텍스트 라벨 포함)

역할별 상태는 **색상만으로 구분하지 않고** 아래 텍스트 라벨을 화면 텍스트와 접근성
이름으로 함께 노출한다.

| 상태 토큰 | 텍스트 라벨 | 색상 token |
| --- | --- | --- |
| done | 완료 | `--color-status-done` |
| active | 진행 중 | `--color-status-active` |
| pending | 대기 | `--color-status-pending` |

보드 화면 자체의 로딩/데이터 상태(state): `idle`, `loading`, `ready`, `error`.

### 3.4 design token

| token | 값 |
| --- | --- |
| `--color-status-done` | `#16a34a` |
| `--color-status-active` | `#2563eb` |
| `--color-status-pending` | `#94a3b8` |
| `--space-board-gap` | `16px` |

### 3.5 접근성 (accessibility)

- `board-refresh` control 은 명시적 `aria-label="전달 상태 새로고침"` 을 가진다.
- `board-role-list` 는 `aria-live="polite"` 로 상태 갱신을 전달한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명(완료/진행 중/대기)을 화면 텍스트와
  접근성 이름으로 노출한다.

### 3.6 반응형 (responsive)

- 320px 이상에서 content overflow 가 발생하지 않는다.
- 480px 미만에서 역할 상태 항목(`board__role`)이 세로로 스택된다.

## 4. 상태 전이 및 후조건 (behavior)

frozen invariant 를 그대로 따른다.

- 진입: `idle` → 새로고침 트리거 시 `loading` → 성공 시 `ready`(역할 상태 렌더),
  실패 시 `error`.
- **초기화/취소/실패 후조건**: 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로
  되돌리고, 주 실행 control(`board-refresh`)을 다시 사용할 수 있어야 한다.

## 5. 페르소나별 handoff (실행 설계)

### designer (BF-1273, `docs/design/**`)
- `docs/design/delivery-board-contract.md`: 위 UI 계약(selector/token/상태/접근성/반응형)을
  설계 문서로 명세.
- `docs/design/delivery-board-mockup.html`: 동일 selector·token 을 사용한 시각 mockup.
- selector·token·상태 라벨을 변경하지 않는다.

### developer (BF-1274, `demo/delivery-board/**`)
- `demo/delivery-board/index.html`: `board-root` 이하 DOM 구조와 `board-refresh` control.
- `demo/delivery-board/src/board.js`(ESM): 상태 모델 렌더링, 새로고침 동작, 상태 전이 및
  초기화/취소/실패 후조건 처리.
- `demo/delivery-board/styles.css`: `board`/`board__*` class 와 design token 정의.
- serve root 는 저장소 root(`.`), root-relative 정적 경로로 접근.

### tester (BF-1277)
- 검증 대상: `demo/delivery-board/tests/board.test.js` (read-only 계약 기준).
- 검증 명령: `npm test`.

## 6. 검증

- 저장소 권위 검증 명령: `npm test` (focused scope).
- 수용 기준: selector/token/상태/접근성/반응형이 위 exact 값과 일치, 파일 소유권 경계
  준수, additive 신규 경로 전략 준수.

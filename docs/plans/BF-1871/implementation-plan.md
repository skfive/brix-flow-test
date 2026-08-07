# BF-1871 cascade 검증 페이지 구현 설계 (implementation-plan)

> 본 문서는 planner 가 동결한 **단일 페이지 실행 설계**이자 **UI 계약**입니다.
> developer 는 이 계약의 selector·token·상태·후조건을 변경/재정의하지 않고 그대로 구현합니다.
> 파일 소유권·상태 계약의 유일한 권위는 frozen Execution Blueprint 이며, 본 문서는 이를 재정의하지 않고 그대로 설명합니다.

## 1. 목적 (Objective)

cascade 자동 dispatch 흐름(planner → developer → reviewer → tester)이 정상 동작하는지 눈으로 확인할 수 있는 **단일 페이지 검증 화면**을 만든다. 페이지는 버튼을 눌러 카운터를 증가시키는 최소 상호작용만 제공하며, 이 상호작용이 정상 렌더/동작하면 cascade 파이프라인이 끝까지 흐른 것으로 간주한다.

## 2. 산출물 범위 (Ownership)

| 파일 | 소유자 | 정책 |
| --- | --- | --- |
| `cascade-check-0808/index.html` | developer | additive (신규 단일 파일) |
| `docs/plans/BF-1871/implementation-plan.md` | planner | 본 설계 문서 |

- 구현 산출물은 **신규 디렉터리 `cascade-check-0808/` 하나로 한정**한다.
- `index.html` **외 추가 파일을 만들지 않는다.** CSS/JS 는 **inline** 으로 유지한다.
- 전체 파일은 **60줄 이하**, **단일 파일** 로 유지한다.

## 3. 사용자 시나리오 (UseCase)

- **Actor**: 운영자(cascade 파이프라인 검증자)
- **선행 조건**: cascade 파이프라인이 planner→developer 로 진행되어 `cascade-check-0808/index.html` 이 배포됨.
- **주 흐름**
  1. 운영자가 `cascade-check-0808/index.html` 을 브라우저로 연다.
  2. 페이지는 `initial` 상태로 렌더되며 카운터 값 `0` 과 증가 버튼을 화면 텍스트로 노출한다.
  3. 운영자가 증가 버튼을 클릭(또는 키보드 Enter/Space)한다.
  4. 카운터 값이 `1` 증가하고 상태는 `incremented` 로 전환되며, 현재 숫자와 상태명이 화면 텍스트로 갱신된다.
- **후행 조건**: 카운터 표시가 마지막 증가 값을 화면 텍스트로 노출한다.

## 4. Acceptance Criteria (Given/When/Then)

- **AC-1 초기 렌더**
  - Given 운영자가 페이지를 처음 연다
  - When 페이지가 렌더된다
  - Then `#cascade-counter-value` 는 `0` 을 화면 텍스트로 노출하고 상태는 `initial` 이며 `#cascade-increment-btn` 이 활성 상태로 표시된다.
- **AC-2 증가 상호작용**
  - Given `initial` 상태
  - When 운영자가 `#cascade-increment-btn` 을 클릭한다
  - Then 카운터 값이 1 증가하고 상태는 `incremented` 로 전환되며 화면 텍스트가 갱신된다.
- **AC-3 키보드 접근성**
  - Given 포커스가 `#cascade-increment-btn` 에 있다
  - When 운영자가 Enter 또는 Space 를 누른다
  - Then 클릭과 동일하게 카운터가 1 증가한다.
- **AC-4 접근성 이름**
  - Given 증가 버튼
  - When 보조기술이 버튼을 읽는다
  - Then `aria-label="카운터 1 증가"` 를 노출한다.
- **AC-5 상태 표기**
  - Given 임의의 상태(`initial`/`incremented`)
  - When 상태가 표시된다
  - Then 상태를 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.
- **AC-6 반응형**
  - Given 뷰포트 폭 320px 이상
  - When 페이지가 렌더된다
  - Then content overflow 가 발생하지 않는다.

## 5. 실패·엣지 케이스 (Failure / Recovery)

- **초기화/취소/실패 뒤 복귀**: 초기화·취소·실패가 발생하면 상태와 진행 표시를 **초기값(`initial`, 카운터 `0`)** 으로 되돌리고, 주 실행 control(`#cascade-increment-btn`)을 다시 사용할 수 있어야 한다.
- **JS 미로드**: JS 가 로드되지 않아도 초기 카운터 값 `0` 과 상태명 `initial` 은 정적 화면 텍스트로 노출된다(색상 의존 금지).
- **좁은 뷰포트(320px)**: 컨트롤 간격은 `--space-control-gap=12px` 를 사용하되 가로 overflow 없이 배치한다.

## 6. Exact UI 계약 (Frozen — 변경 금지)

developer 는 아래 selector 와 token 을 **그대로** 사용한다. selector/token 을 변경하거나 재정의하지 않는다.

### 6.1 파일
- `cascade-check-0808/index.html` (단일 파일, inline CSS/JS, 60줄 이하)

### 6.2 DOM 구조
| 종류 | 값 | 용도 |
| --- | --- | --- |
| id | `cascade-check-root` | 페이지 루트 컨테이너 |
| id | `cascade-increment-btn` | 카운터 증가 버튼(주 실행 control) |
| id | `cascade-counter-value` | 현재 카운터 숫자 표시 |
| class | `cascade-check` | 루트 블록 |
| class | `cascade-check__button` | 증가 버튼 요소 |
| class | `cascade-check__counter` | 카운터 표시 요소 |

### 6.3 상태 (States)
- `initial`: 카운터 값 `0`, 상태명 `initial` 을 화면 텍스트로 노출.
- `incremented`: 최소 1회 증가 후 상태. 현재 숫자와 상태명 `incremented` 를 화면 텍스트로 노출.

### 6.4 Design Tokens
| Token | 값 |
| --- | --- |
| `--color-action-primary` | `#2563eb` |
| `--space-control-gap` | `12px` |

### 6.5 접근성 (Accessibility)
- 증가 버튼은 `aria-label="카운터 1 증가"` 를 가지고 키보드 Enter/Space 로 활성화된다.
- 카운터 표시는 화면 텍스트로 현재 숫자를 노출한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 6.6 반응형 (Responsive)
- 320px 이상에서 content overflow 가 발생하지 않는다.

## 7. developer 실행 체크리스트

1. `cascade-check-0808/index.html` 단일 파일 생성(디렉터리 신규).
2. 위 6절 DOM id/class, token, 상태, 접근성, 반응형 계약을 그대로 구현.
3. CSS/JS 는 inline, 전체 60줄 이하 유지.
4. 초기화/취소/실패 시 초기값 복귀 및 주 실행 control 재사용 가능 확인.
5. 계약 밖 파일 추가·selector/token 변경 금지.

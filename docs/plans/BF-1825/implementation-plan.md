# 클릭 카운터 구현 설계 (BF-1825)

> planner packet: BF-1828 · frozen 실행 계약(`planning-contract@v1`, `ui-contract@v1`)을 구현 가능한 설계로 렌더링한다.
> designer / developer 는 이 문서와 아래 frozen UI 계약을 그대로 따른다. selector·token·파일 소유권·상태 계약을 변경하거나 재정의하지 않는다.

## 1. 목표 (Objective)

- 사용자가 버튼을 눌러 클릭 횟수를 세고, 언제든 0 으로 초기화할 수 있는 정적 클릭 카운터 페이지를 구현한다.
- backend repo 는 **vanilla-static** 실행 모델이다. 번들러·서버 사이드 렌더링 없이 브라우저가 정적 파일(`.html` + `.js`)을 직접 로드해 동작한다.
- 이 문서는 frozen blueprint 의 파일·소유자·상태·후조건을 그대로 설명하며 새 파일이나 새 역할을 추가하지 않는다.

## 2. 실행 모델 (vanilla-static)

- serve root: 저장소 루트(`.`), route mapping: root-relative-static.
- 산출물은 브라우저가 파일 시스템/정적 서버에서 직접 여는 정적 파일이다.
- `counter.html` 이 `counter.js` 를 `<script type="module" src="./counter.js">` 로 로드한다(module type ESM).
- 외부 런타임 의존성 없음. 상태(카운트)는 페이지 메모리 안 변수로만 관리하며 서버 통신·영속화는 하지 않는다.

## 3. 산출물 파일 · 소유권 (frozen)

frozen blueprint 가 파일 소유권과 상태 계약의 유일한 권위이며, 본 문서는 이를 재정의하지 않고 그대로 옮긴다. 모든 산출물의 artifact-policy 는 `additive`(기존 파일 삭제·재정의 없이 추가)이다.

| 경로 | 소유자 | 내용 |
| --- | --- | --- |
| `docs/design/counter-BF-1825.md` | designer | 시각 명세(레이아웃, token 적용, 상태별 화면) |
| `iteration-check2/counter.html` | developer | 마크업 구조와 DOM |
| `iteration-check2/counter.js` | developer | 증가·초기화 동작과 화면 텍스트 갱신 |
| `iteration-check2/counter.test.js` | developer | 초기·증가·초기화 동작 단위 테스트 |

> 이 planner 문서 자체의 산출물 경로는 `docs/plans/BF-1825/implementation-plan.md` 이다.

## 4. Frozen UI 계약 (변경 금지)

designer 와 developer 는 아래 selector 와 token 을 변경하거나 재정의하지 않는다.

### 4.1 DOM 구조

- 루트 컨테이너: `id="counter-root"`, `class="counter"`
- 카운트 표시: `id="counter-value"`, `class="counter__value"`
- 증가 버튼: `id="counter-increment"`, `class="counter__increment"`
- 초기화 버튼: `id="counter-reset"`, `class="counter__reset"`

권장 마크업 골격(developer 는 이 구조를 따른다):

```html
<div id="counter-root" class="counter">
  <p id="counter-value" class="counter__value" aria-live="polite">클릭 횟수: 0</p>
  <div class="counter__controls">
    <button id="counter-increment" class="counter__increment" type="button" aria-label="카운트 증가">+1</button>
    <button id="counter-reset" class="counter__reset" type="button" aria-label="카운트 초기화">초기화</button>
  </div>
</div>
```

### 4.2 상태 (화면 텍스트)

| 상태 | 트리거 | `#counter-value` 텍스트 |
| --- | --- | --- |
| 초기 | 페이지 로드 | `클릭 횟수: 0` |
| 증가 | `#counter-increment` 클릭마다 | `클릭 횟수: N` (N = 현재 카운트) |
| 초기화 | `#counter-reset` 클릭 | `클릭 횟수: 0` 으로 복원 |

- 초기화 뒤에는 상태와 진행 표시를 초기값(0)으로 되돌리고, 주 실행 control(`#counter-increment`)을 다시 사용할 수 있어야 한다.
- 카운트는 음수가 될 수 없다(증가·초기화만 존재하며 감소 동작은 계약에 없다).

### 4.3 Design token / CSS 변수

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-action-primary` | `#2563eb` | 증가 버튼 등 주 실행 control 색 |
| `--color-count-text` | `#111827` | 카운트 표시 텍스트 색 |
| `--space-control-gap` | `12px` | 버튼 그룹 control 간 간격 |

- designer 는 위 token 을 CSS 변수로 정의하고, developer 는 정의된 변수를 참조한다. 변수명·값을 재정의하지 않는다.

### 4.4 접근성 (accessibility)

- `#counter-increment` 는 `aria-label="카운트 증가"` 를 가진다.
- `#counter-reset` 는 `aria-label="카운트 초기화"` 를 가진다.
- `#counter-value` 는 `aria-live="polite"` 로 카운트 변경을 스크린리더에 알린다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트(`클릭 횟수: N`)와 접근성 이름으로 노출한다.

### 4.5 반응형 (responsive)

- 320px 이상 뷰포트에서 카운터 카드와 버튼 그룹에 content overflow 가 발생하지 않는다.
- 버튼 그룹은 `--space-control-gap` 간격을 유지하며, 좁은 폭에서도 잘리지 않게 배치한다.

## 5. 사용자 시나리오 (User scenarios)

1. 방문자가 페이지를 열면 `클릭 횟수: 0` 이 보이고, `+1`·`초기화` 버튼이 나타난다.
2. 방문자가 `+1` 을 누를 때마다 숫자가 1 씩 증가하며 화면 텍스트가 즉시 갱신된다.
3. 방문자가 `초기화` 를 누르면 숫자가 0 으로 돌아간다.
4. 스크린리더 사용자는 버튼의 aria-label 로 기능을 인지하고, 카운트 변경을 aria-live 로 듣는다.

## 6. Acceptance Criteria (Given/When/Then)

### AC-1 초기 표시
- Given 브라우저가 `iteration-check2/counter.html` 을 로드하면
- When 사용자 조작이 없을 때
- Then `#counter-value` 는 `클릭 횟수: 0` 을 표시한다.

### AC-2 증가
- Given 카운트가 N 인 상태에서
- When 사용자가 `#counter-increment` 를 한 번 클릭하면
- Then `#counter-value` 는 `클릭 횟수: N+1` 로 갱신된다.

### AC-3 연속 증가
- Given 초기 상태(0)에서
- When 사용자가 `#counter-increment` 를 3 번 클릭하면
- Then `#counter-value` 는 `클릭 횟수: 3` 을 표시한다.

### AC-4 초기화
- Given 카운트가 1 이상인 상태에서
- When 사용자가 `#counter-reset` 를 클릭하면
- Then `#counter-value` 는 `클릭 횟수: 0` 으로 복원되고, `#counter-increment` 를 다시 클릭하면 `클릭 횟수: 1` 이 된다.

### AC-5 접근성
- Given 페이지가 로드되면
- When 접근성 트리를 검사하면
- Then `#counter-increment` 는 `aria-label="카운트 증가"`, `#counter-reset` 는 `aria-label="카운트 초기화"`, `#counter-value` 는 `aria-live="polite"` 를 가진다.

### AC-6 반응형
- Given 뷰포트 폭이 320px 인 상태에서
- When 카운터 카드를 렌더링하면
- Then 카드와 버튼 그룹에 content overflow(가로 스크롤·잘림)가 발생하지 않는다.

### AC-7 계약 selector/token 준수
- Given 산출물 파일이 구현되면
- When DOM ID·class·CSS 변수를 검사하면
- Then §4.1 selector 4 종과 §4.3 token 3 종이 계약값과 정확히 일치한다.

## 7. Edge case · 실패 케이스

- **빠른 연속 클릭**: 클릭마다 카운트가 정확히 1 씩 증가해야 하며 누락·중복 증가가 없어야 한다.
- **초기화 직후 증가**: 초기화 뒤 첫 `+1` 은 `클릭 횟수: 1` 을 만든다(상태가 0 에서 다시 시작).
- **초기 상태에서 초기화**: 이미 0 일 때 `초기화` 를 눌러도 `클릭 횟수: 0` 을 유지하며 오류가 없다.
- **스크립트 로드 실패 대비**: `counter.js` 가 module 로 로드되므로, 마크업 초기 텍스트는 `클릭 횟수: 0` 으로 두어 JS 미실행 시에도 초기 상태가 보이게 한다(진행 표시 초기값 유지).
- **감소 동작 없음**: 계약에 감소가 없으므로 음수 카운트는 발생하지 않는다.

## 8. 단위 테스트 범위 (developer, focused)

`iteration-check2/counter.test.js` 는 최소 다음을 검증한다(module ESM):

- 초기 렌더 시 `#counter-value` 텍스트가 `클릭 횟수: 0`.
- `#counter-increment` 클릭 후 `클릭 횟수: 1`, 3 회 클릭 후 `클릭 횟수: 3`.
- `#counter-reset` 클릭 후 `클릭 횟수: 0` 복원, 이후 증가가 1 부터 재개.
- selector(ID/class)와 aria 속성이 계약값과 일치.

test scope 는 focused 이며, 본 작업이 만든/수정한 테스트와 owned_paths 관련 테스트만 실행한다.

## 9. Handoff 요약

- **designer (BF-1826)**: `docs/design/counter-BF-1825.md` 에 §4 token·상태·접근성·반응형을 반영한 시각 명세를 작성한다. selector/token 변경 금지.
- **developer (BF-1827)**: `iteration-check2/counter.html`·`counter.js`·`counter.test.js` 를 §4 계약과 §8 테스트 범위대로 구현한다. DOM ID/class 와 CSS 변수를 계약값 그대로 사용한다.

# 진행 막대 데모 구현 설계 (BF-1843)

- **Jira**: BF-1843 (Epic) / 기획 task BF-1846
- **작성자 역할**: planner (박기획)
- **문서 성격**: designer·developer가 그대로 따르는 실행 설계 + 동결(UI) 계약 렌더링
- **상태**: active

> 이 문서는 frozen blueprint(planning-contract@v1, ui-contract@v1)를 실행 가능한 계획으로
> 옮긴 것입니다. 파일·소유자·상태·후조건은 frozen blueprint가 유일한 권위이며 본 문서는
> 이를 재정의하지 않고 그대로 설명합니다. 새 파일·새 역할·계약 밖 요구사항을 추가하지 않습니다.

---

## 1. 목표 (Objective)

버튼으로 진행률을 증가시키고 초기화할 수 있는 **진행 막대(progress bar) 데모** 페이지를
구현한다. 진행률은 0~100 범위이며, `progress-increment` 조작으로 증가하고 100에 도달하면
`complete` 상태가 된다. `progress-reset` 조작은 진행률과 상태를 초기값(`idle`, 0)으로 되돌린다.

- 관람용 데모(vanilla static, ESM). 백엔드·데이터 저장·인증 없음.
- 접근성·반응형을 계약 수준으로 만족한다.

---

## 2. 사용자 시나리오 (User Scenarios)

- **S1 — 진행 증가**: 사용자가 페이지를 열면 진행 막대는 0%(idle)로 표시된다. `progress-increment`
  버튼을 누를 때마다 진행률이 일정 단계만큼 증가하고, 막대가 채워지며 상태가 `progressing`으로 바뀐다.
- **S2 — 완료**: 진행률이 100에 도달하면 상태가 `complete`로 바뀌고, 완료가 화면 텍스트와
  접근성 이름으로 함께 노출된다. 이후 `progress-increment`를 눌러도 진행률은 100을 넘지 않는다.
- **S3 — 초기화**: `progress-reset` 버튼을 누르면 진행률이 0, 상태가 `idle`로 복귀하고
  주 실행 control(`progress-increment`)을 다시 사용할 수 있다.
- **S4 — 키보드 사용자**: 사용자가 Tab으로 두 control에 도달하고 Enter/Space로 조작할 수 있으며,
  스크린 리더가 현재 진행률과 상태명을 읽어준다.

---

## 3. Acceptance Criteria (Given/When/Then)

### AC-1 초기 상태 (idle)
- **Given** 페이지를 처음 로드하면
- **When** 아무 조작도 하지 않았을 때
- **Then** `#progress-bar`의 `aria-valuenow`는 0, 상태는 `idle`이고, 진행률 0%가 화면 텍스트로 노출된다.

### AC-2 진행 증가 (progressing)
- **Given** 진행률이 100 미만인 상태에서
- **When** `#progress-increment`를 조작하면
- **Then** 진행률이 증가하고 `#progress-fill` 폭과 `aria-valuenow`가 실시간 갱신되며 상태는 `progressing`이다.

### AC-3 완료 (complete)
- **Given** 진행률을 계속 증가시켜
- **When** 진행률이 100에 도달하면
- **Then** 상태가 `complete`가 되고 `aria-valuenow=100`이며, 완료 상태명이 화면 텍스트와 접근성 이름으로 노출된다.
- **And** 추가로 `#progress-increment`를 조작해도 `aria-valuenow`는 100을 넘지 않는다.

### AC-4 초기화 (reset)
- **Given** 진행률이 0보다 큰 임의의 상태에서
- **When** `#progress-reset`을 조작하면
- **Then** 진행률이 0, 상태가 `idle`로 복귀하고 `#progress-increment`를 다시 사용할 수 있다.

### AC-5 접근성
- **Given** 진행 막대가 렌더된 상태에서
- **When** 스크린 리더/키보드로 접근하면
- **Then** `#progress-bar`는 `role="progressbar"`, `aria-valuemin=0`, `aria-valuemax=100`, 실시간 `aria-valuenow`를 갖고,
  두 control은 명시적 `aria-label`을 가지며 키보드로 조작 가능하고, 상태는 색상만이 아니라 상태명 텍스트로도 구분된다.

### AC-6 반응형
- **Given** 320px 이상 뷰포트에서
- **When** 페이지를 렌더하면
- **Then** content overflow가 발생하지 않고 진행 막대가 컨테이너 폭에 맞춰 늘어난다.

---

## 4. 동결 UI 계약 (ui-contract@v1) — 그대로 구현

> 아래 selector·token·상태는 **동결값**이다. designer와 developer는 selector와 token을
> 변경하거나 재정의하지 않는다. 값 수정이 필요하면 planner에게 계약 개정을 요청한다.

### 4.1 산출물 파일과 소유자

| 파일 | 소유자 | 정책 |
|------|--------|------|
| `docs/design/progress-BF-1843.md` | designer | additive |
| `docs/design/progress-mockup.html` | designer | additive |
| `iteration-check2/progress.html` | developer | additive |
| `iteration-check2/tests/progress.test.js` | developer | additive |

- 실행 페이지 파일명은 **`iteration-check2/progress.html`** 이다(정적 serve root 기준 root-relative).
- additive 정책: 위 파일은 새로 추가하며 기존 파일·소유권을 재배정하지 않는다.

### 4.2 DOM ID (동결)

| ID | 용도 |
|----|------|
| `progress-root` | 데모 루트 컨테이너 |
| `progress-bar` | 진행 막대 (role="progressbar") |
| `progress-fill` | 채워지는 진행 표시 |
| `progress-label` | 진행률/상태명 텍스트 라벨 |
| `progress-increment` | 진행 증가 control |
| `progress-reset` | 초기화 control |

### 4.3 CSS class (동결)

| class | 용도 |
|-------|------|
| `progress` | 진행 막대 블록 |
| `progress__track` | 진행 막대 트랙(배경) |
| `progress__fill` | 진행 막대 채움 |
| `progress__label` | 진행률/상태 라벨 |
| `progress__control` | increment/reset control 공통 |

### 4.4 상태 (동결)

| 상태 | 의미 | 조건 |
|------|------|------|
| `idle` | 초기/초기화 후 | 진행률 0 |
| `progressing` | 진행 중 | 0 < 진행률 < 100 |
| `complete` | 완료 | 진행률 = 100 |

- 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값(`idle`, 0)으로 되돌리고
  주 실행 control(`progress-increment`)을 다시 사용할 수 있어야 한다.

### 4.5 Design token / CSS 변수 (동결)

| 변수 | 값 |
|------|----|
| `--color-progress-fill` | `#2563eb` |
| `--color-progress-track` | `#e5e7eb` |
| `--progress-height` | `24px` |
| `--progress-radius` | `12px` |

### 4.6 접근성 (동결)

- `#progress-bar`는 `role="progressbar"`와 `aria-valuenow` / `aria-valuemin=0` / `aria-valuemax=100`을 **실시간 갱신**한다.
- `#progress-increment`, `#progress-reset` control은 명시적 `aria-label`을 가지며 **키보드로 조작 가능**하다.
- 모든 상태는 색상만으로 구분하지 않고 **상태명을 화면 텍스트와 접근성 이름으로 노출**한다.

### 4.7 반응형 (동결)

- **320px 이상** 뷰포트에서 content overflow가 발생하지 않고, 진행 막대가 **컨테이너 폭에 맞춰** 늘어난다.

---

## 5. 데이터 모델 / API 스펙

- **API 없음**: 백엔드 통신·영속 데이터·마이그레이션 없음(vanilla static 데모).
- **클라이언트 상태(메모리)**: `{ value: 0..100 정수, status: idle|progressing|complete }`.
  - `value`는 0 이상 100 이하로 clamp한다. `status`는 `value`에서 파생한다
    (`value===0 → idle`, `0<value<100 → progressing`, `value===100 → complete`).

---

## 6. Edge case · 실패 케이스

- **E1**: 진행률이 100인 상태에서 increment 조작 → 100 초과 금지(clamp), 상태는 `complete` 유지.
- **E2**: 진행률이 0(idle)인 상태에서 reset 조작 → idle/0 유지, 오류 없이 idempotent.
- **E3**: 마지막 증가 단계가 100을 초과하는 폭이면 정확히 100으로 clamp하여 `complete` 진입.
- **E4**: 키보드(Enter/Space)와 포인터 조작이 동일한 결과를 낸다.
- **E5**: 320px 뷰포트에서 라벨·control이 줄바꿈되더라도 가로 overflow가 없어야 한다.
- **E6**: 상태 변경 시 `aria-valuenow`와 화면 텍스트가 서로 어긋나지 않고 동기화된다.

---

## 7. 역할별 handoff (execution wave)

- **planner (BF-1846, 본 task)**: 본 실행 설계 + UI 계약 동결 → commit.
- **designer (BF-1844)**: `docs/design/progress-BF-1843.md`, `docs/design/progress-mockup.html`
  작성. 위 selector·token·상태·접근성·반응형 계약을 그대로 시각 명세로 옮긴다.
- **developer (BF-1845)**: `iteration-check2/progress.html`, `iteration-check2/tests/progress.test.js`
  구현. 동결 DOM ID/class/token/상태를 그대로 사용하고 AC-1~AC-6를 검증하는 테스트를 작성한다.
- **reviewer**: design·develop 완료 후 계약 준수 검토.
- **tester**: review 통과 후 AC 기반 검증(test_result).

> designer와 developer는 승인된 본 실행 설계를 따르며, selector와 token을 변경하거나 재정의하지 않는다.

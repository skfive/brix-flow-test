# 디지털 시계 구현 설계 (BF-1807)

> planner 산출물 · packet=`plan` · 대상 Epic BF-1807 · planner task BF-1810
> 본 문서는 frozen Execution Blueprint(`ui-contract@v1`, `planning-contract@v1`)를 실행 계획으로 풀어 쓴 것입니다.
> **frozen blueprint가 파일 소유권·상태·후조건의 유일한 권위이며, 본 문서는 이를 재정의하지 않고 그대로 설명합니다.**
> 새 파일·새 역할·계약 밖 요구사항을 추가하지 않습니다.

---

## 1. 목표

브라우저에서 현재 시각을 1초 간격으로 표시하는 순수 정적(vanilla-static) 디지털 시계를 구현한다.
사용자는 12시간제 ↔ 24시간제를 토글로 전환할 수 있다. 서버·API·빌드 도구 없이 정적 파일만으로 동작한다.

---

## 2. 사용자 시나리오

- **관찰**: 사용자가 페이지를 열면 현재 시각이 즉시 표시되고 1초마다 갱신된다. 기본 형식은 12시간제이다.
- **전환**: 사용자가 토글 버튼을 누르면 표시 형식이 24시간제로 바뀌고, 다시 누르면 12시간제로 돌아온다. 버튼 라벨은 "다음에 전환될 형식"을 안내한다.
- **접근성 사용자**: 스크린리더 사용자는 시각 갱신을 `aria-live`로 통지받고, 토글 버튼의 목적을 `aria-label`로 인지한다.

---

## 3. Acceptance Criteria (Given/When/Then)

### AC-1. 초기 렌더 — 12시간제
- **Given** 사용자가 `iteration-check/clock.html`을 연다
- **When** 페이지가 로드된다
- **Then** `#clock-time`에 `hh:mm:ss AM/PM` 형식의 현재 시각이 표시되고,
  `#clock-toggle` 라벨은 `24시간제로`이다.

### AC-2. 1초 간격 갱신
- **Given** 시계가 렌더된 상태
- **When** 1초가 경과한다
- **Then** `#clock-time` 텍스트가 현재 시각으로 갱신된다(현재 선택된 형식 유지).

### AC-3. 24시간제 전환
- **Given** 12시간제로 표시 중
- **When** 사용자가 `#clock-toggle`을 누른다
- **Then** `#clock-time`은 `HH:mm:ss` 형식으로 바뀌고, `#clock-toggle` 라벨은 `12시간제로`가 된다.

### AC-4. 12시간제 복귀
- **Given** 24시간제로 표시 중
- **When** 사용자가 `#clock-toggle`을 다시 누른다
- **Then** `#clock-time`은 `hh:mm:ss AM/PM` 형식으로 돌아오고, 라벨은 `24시간제로`가 된다.

### AC-5. 접근성
- **Given** 시계가 렌더된 상태
- **When** 스크린리더로 접근한다
- **Then** `#clock-toggle`은 `aria-label="시간 형식 전환"`을 노출하고,
  `#clock-time` 영역은 `aria-live="polite"`로 갱신을 통지하며,
  현재 형식은 색상만이 아니라 화면 텍스트(토글 라벨)와 접근성 이름으로 구분된다.

### AC-6. 반응형
- **Given** 뷰포트 폭이 320px 이상
- **When** 시각 표시와 토글이 배치된다
- **Then** overflow 없이 배치되고, 폭에 따라 `#clock-time` 폰트 크기가 축소되어도 텍스트가 잘리지 않는다.

### AC-7. 토큰 소비
- **Given** 스타일이 적용된 상태
- **When** 색상·간격·폰트가 렌더된다
- **Then** 모든 스타일 값은 `iteration-check/tokens.css`의 CSS 변수를 `var()`로만 소비하고, 값을 하드코딩하지 않는다.

---

## 4. 동결 UI 계약 (ui-contract@v1)

> 아래 selector·token·상태 텍스트는 **동결값**이다. designer/developer는 이를 변경하거나 재정의하지 않는다.

### 4.1 파일과 소유자 (additive — 신규 파일만 추가, iteration-check/ 밖 파일 비수정)

| 파일 | 소유자 | 정책 |
| --- | --- | --- |
| `docs/design/clock-BF-1807.md` | designer | additive |
| `iteration-check/clock.html` | developer | additive |
| `iteration-check/clock.js` | developer | additive |
| `iteration-check/format-time.js` | developer | additive |
| `iteration-check/format-time.test.js` | developer | additive |

- **`iteration-check/` 밖의 파일은 생성·수정하지 않는다.** (designer 문서 `docs/design/clock-BF-1807.md` 제외)
- 위 목록 밖의 새 파일을 추가하거나 소유자를 재배정하지 않는다.

### 4.2 DOM ID / class

| 요소 | DOM ID | class |
| --- | --- | --- |
| 루트 컨테이너 | `clock-root` | `clock` |
| 시각 표시 | `clock-time` | `clock__time` |
| 형식 토글 버튼 | `clock-toggle` | `clock__toggle` |

### 4.3 상태 ↔ 화면 텍스트

| 상태 | `#clock-time` 텍스트 | 갱신 주기 | `#clock-toggle` 라벨 |
| --- | --- | --- | --- |
| 12시간제 | `hh:mm:ss AM/PM` | 1초 | `24시간제로` |
| 24시간제 | `HH:mm:ss` | 1초 | `12시간제로` |

- 초기 상태는 12시간제이다.

### 4.4 tokens.css CSS 변수 소비 (`var()` 전용, 하드코딩 금지)

| CSS 변수 | 값 | 용도(권장) |
| --- | --- | --- |
| `--color-surface` | `#0f172a` | 배경 표면 |
| `--color-text-primary` | `#f8fafc` | 시각 텍스트 |
| `--color-accent` | `#38bdf8` | 토글 강조 |
| `--font-family-mono` | `monospace` | 시각 표시 폰트 |
| `--space-md` | `16px` | 요소 간 간격/여백 |

- 스타일은 위 변수를 `var(--토큰명)`으로만 소비한다. 색상·간격·폰트 값을 직접 기입하지 않는다.

### 4.5 접근성

- `#clock-toggle`은 `aria-label="시간 형식 전환"`을 가진다.
- `#clock-time` 영역은 `aria-live="polite"`로 스크린리더에 갱신을 통지한다.
- 모든 상태는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.6 반응형

- 320px 이상에서 시각 표시와 토글이 overflow 없이 배치된다.
- 뷰포트 폭에 따라 `#clock-time` 폰트 크기가 축소되어도 텍스트가 잘리지 않는다.

---

## 5. 로직·모듈 구조 (developer 참고)

순수 로직과 렌더/타이머를 분리한다.

- **`format-time.js`** — 순수 함수. 입력 `Date`(또는 시/분/초)와 형식 플래그(12/24)를 받아 표시 문자열을 반환한다.
  - 12시간제: `hh:mm:ss AM/PM` (시 01–12, 두 자리 zero-pad, `AM`/`PM`)
  - 24시간제: `HH:mm:ss` (시 00–23, 두 자리 zero-pad)
  - 부수효과 없음 — 시각을 인자로 주입받아 결정론적으로 테스트 가능해야 한다.
- **`clock.js`** — DOM 바인딩·1초 타이머·토글 상태 관리. `format-time.js`를 import(ESM)해 표시 문자열을 생성하고 `#clock-time`에 반영한다.
- **`clock.html`** — `clock-root` / `clock-time` / `clock-toggle` 마크업, `tokens.css` 링크, `clock.js` ESM 로드.
- **`format-time.test.js`** — `format-time.js` 순수 함수의 단위 테스트(형식별 경계·zero-pad·AM/PM 경계 포함).

### 데이터/상태 모델

런타임 상태는 화면에 저장되며 영속 저장·서버 통신이 없다.

| 상태 | 타입 | 초기값 | 설명 |
| --- | --- | --- | --- |
| 표시 형식 | `is24Hour: boolean` | `false`(12시간제) | 토글 시 반전 |
| 현재 시각 | 매 tick의 `new Date()` | — | 1초 타이머로 갱신 |

- **API 스펙: 해당 없음** — 네트워크 호출 없는 순수 클라이언트 정적 페이지.

---

## 6. Edge case · 실패 케이스

- **자정/정오 경계 (12시간제)**: `00:00:00` → `12:00:00 AM`, `12:00:00` → `12:00:00 PM`. 12/0 치환 규칙을 테스트로 고정한다.
- **한 자리 값 zero-pad**: 시/분/초가 한 자리일 때 두 자리로 pad (`09:05:03`).
- **타이머 재초기화**: 형식 토글 직후에도 다음 tick을 기다리지 않고 현재 형식으로 즉시 재렌더하여 표시가 1초간 이전 형식으로 남지 않게 한다.
- **취소/재초기화 후조건**: 초기화·취소·실패 뒤에는 표시 상태를 초기값(12시간제)으로 되돌리고, 주 실행 control(`#clock-toggle`)을 다시 사용할 수 있어야 한다.
- **탭 비활성/재활성**: 타이머가 멈추더라도 재활성 시 첫 tick에서 정확한 현재 시각으로 복구된다(1초 이내 정합).

---

## 7. 산출물 경로

- planner: `docs/plans/BF-1807/implementation-plan.md` (본 문서)
- designer: `docs/design/clock-BF-1807.md`
- developer: `iteration-check/clock.html`, `iteration-check/clock.js`, `iteration-check/format-time.js`, `iteration-check/format-time.test.js`

## 8. 검증 방식 (tester 참고, focused)

- `format-time.js` 단위 테스트(`format-time.test.js`): 형식별 문자열·경계값 검증. `npm test` 범위의 focused 실행.
- 수용 기준 AC-1~AC-7을 렌더/토글 동작으로 확인.

---

## 9. 실행 원칙 (불변식 재확인)

1. designer와 developer는 승인된 본 실행 설계를 따른다.
2. **`iteration-check/` 밖의 파일은 생성·수정하지 않는다** (designer 문서 제외).
3. designer와 developer는 selector와 token을 변경하거나 재정의하지 않는다.
4. 스타일은 `iteration-check/tokens.css`의 CSS 변수만 `var()`로 소비하고 **값을 하드코딩하지 않는다.**
5. 파일 소유권·상태 계약은 frozen blueprint가 유일한 권위이며 본 문서는 이를 재정의하지 않는다.

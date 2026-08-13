# 컬러 팔레트 생성기 — UI 시안 (BF-2072)

- Jira: BF-2072 (designer) / 상위 Epic: BF-2071
- 참조: `docs/plans/BF-2071/implementation-plan.md` (BF-2074, planner — frozen UI 계약)
- 작성자: 이디자인 (designer)
- 상태: active

> 본 문서의 DOM ID / CSS class / 상태 / 디자인 토큰 / 접근성 / 반응형 규칙은 planner가 동결(frozen)한 계약을 그대로 인용한다. designer는 이를 재정의하지 않고 레이아웃·컬러·타이포만 시각화한다.

## 1. 시안 개요

- **변경 범위**: HEX 색상 코드 1개를 입력받아 5개의 파생 스와치(회전색)를 생성해 보여주는 단일 화면 정적 도구의 UI 시안.
- **사용자 경험 목표**:
  - 입력 → 생성 → 결과 확인까지 단일 화면에서 끊김 없이 진행되는 흐름 제공
  - `hex-input`과 `color-picker`가 항상 같은 색을 반영해 어떤 입력 방식을 쓰든 혼란이 없도록 함
  - 각 스와치가 HEX 값·권장 텍스트 대비색·복사 버튼을 명확히 노출해 실무자가 바로 값을 가져다 쓸 수 있게 함
  - 에러/성공 상태가 색상에 의존하지 않고 텍스트로도 인지 가능하도록 함 (접근성)
- **비목표**: 팔레트 저장/히스토리, 다중 색상 입력, 색맹 시뮬레이션 — 본 시안 스코프 밖 (구현 설계 6절과 동일)

## 2. 컬러 팔레트

frozen 디자인 토큰(구현 설계 4.5절)을 기준으로, 시안에서 추가로 필요한 배경/텍스트 색상만 designer가 보완한다.

| 역할 | 토큰명 | HEX | 출처 |
|---|---|---|---|
| accent (primary action) | `--color-accent` | `#2563eb` | frozen |
| error | `--color-error` | `#dc2626` | frozen |
| success | `--color-success` | `#16a34a` | frozen |
| swatch 테두리 | `--color-swatch-border` | `#e2e8f0` | frozen |
| 배경 (page) | `--color-bg` | `#f8fafc` | designer 보완 |
| 배경 (card/app) | `--color-surface` | `#ffffff` | designer 보완 |
| 본문 텍스트 | `--color-text` | `#0f172a` | designer 보완 |
| 보조 텍스트 | `--color-text-muted` | `#64748b` | designer 보완 |

- `--color-accent`는 `generate-btn`과 포커스 링에 사용한다.
- `--color-error`/`--color-success`는 `status-message`의 상태별 텍스트·좌측 보더 색에 사용하며, 반드시 아이콘/문구(텍스트)와 함께 노출한다(색만으로 상태 구분 금지 — 접근성 4.6절).

## 3. 타이포그래피

`--font-family-base`(frozen, `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)를 heading/body/caption 공통으로 사용한다.

| 용도 | font-size | font-weight | line-height |
|---|---|---|---|
| heading (`palette-app` 타이틀) | 24px (1.5rem) | 700 | 1.3 |
| body (input label, status-message) | 16px (1rem) | 400 | 1.5 |
| swatch__hex | 15px (0.9375rem) | 600 | 1.4 |
| swatch__contrast-label | 13px (0.8125rem) | 400 | 1.4 |
| caption (swatch__copy-feedback) | 12px (0.75rem) | 500 | 1.3 |

## 4. 레이아웃

### 4.1 섹션 구조 (`palette-app` 내부, 상단 → 하단)

1. 헤더: 타이틀 + 설명 caption
2. 입력 영역: `hex-input`(텍스트) + `color-picker`(`<input type="color">`) — 가로 정렬, 두 입력은 항상 동일 색 동기화(AC-3)
3. 액션 영역: `generate-btn`(primary), `reset-btn`(secondary)
4. `status-message` (role="status") — 에러/성공 문구, 내용 없을 땐 빈 영역으로 레이아웃 시프트 최소화
5. `swatch-list` — 5개 스와치 렌더 영역

### 4.2 spacing

- `palette-app` 카드 내부 padding: 24px (모바일 16px)
- 섹션 간 간격: 20px
- `swatch-list` 내부 스와치 간 간격: `--space-swatch-gap`(frozen, 12px)
- `swatch` 내부 padding: 16px

### 4.3 breakpoint 별 동작 (frozen, 구현 설계 4.7절)

| viewport | `swatch-list` 배치 |
|---|---|
| 320px ~ 767px | 세로 스택 (1열), overflow 없음 |
| 768px 이상 | 가로 5열 그리드 |

- 입력 영역(`hex-input` + `color-picker`)도 320px에서 세로 스택으로 전환해 overflow를 방지한다.
- `palette-app` 카드 최대 너비: 720px, 중앙 정렬.

## 5. 컴포넌트 명세

### 5.1 `palette-app` (root container)

- 상태: `idle` | `generating` | `success` | `error` (frozen, 구현 설계 4.4절)
- `generating` 동안 `generate-btn`은 로딩 라벨("생성 중…")로 텍스트 전환, 클릭 비활성화. 완료 즉시 `success`/`error`로 전환되며 버튼은 다시 사용 가능(후조건 4.8절 — 진행 표시는 초기값으로 복귀).

### 5.2 `hex-input`

- props/attr: `aria-label='HEX 색상 코드 입력'` (frozen), `placeholder="#2563EB"`, `type="text"`
- 인터랙션: 값 변경 시 `color-picker`와 동기화(AC-3), Enter 키 입력 시 `generate-btn`과 동일 동작 트리거

### 5.3 `color-picker`

- `<input type="color">`, `hex-input`과 양방향 동기화(AC-3)

### 5.4 `generate-btn`

- props/attr: `aria-label='팔레트 생성'` (frozen), Enter로 활성화
- 상태별 라벨: `idle`/`error`/`success` → "팔레트 생성" · `generating` → "생성 중…"(비활성)

### 5.5 `reset-btn`

- 모든 상태에서 클릭 시 `hex-input`/`color-picker`/`swatch-list`/`status-message`를 초기값으로 되돌리고 `idle`로 전환(AC-5)
- secondary 스타일(테두리만, 배경 투명)로 `generate-btn`과 시각적 위계 구분

### 5.6 `status-message`

- `role='status'` (frozen)
- `error` 상태: `--color-error` 텍스트 + "유효한 HEX 색상 코드를 입력해주세요" 류 문구, 좌측 4px 보더 `--color-error`
- `success` 상태(선택적 안내): `--color-success` 텍스트, 좌측 보더 `--color-success`
- 비어있을 때는 문구 없이 최소 높이만 유지(레이아웃 시프트 방지)

### 5.7 `swatch-list`

- 5개 `swatch` 자식을 구현 설계 2.4절 순서(기준색 → 유사색−30° → 유사색+30° → 보색 → 보색의 유사색)대로 좌→우(≥768px) 렌더링
- `error` 상태에서도 직전 `swatch-list` 내용을 보존(AC-2)

### 5.8 `swatch` (× 5)

- 자식 요소: `swatch__hex`(텍스트), `swatch__contrast-label`(텍스트), `swatch__copy-btn`(버튼), `swatch__copy-feedback`(일시 텍스트)
- 배경색: 해당 스와치의 HEX 값. 텍스트(`swatch__hex`, `swatch__contrast-label`, `swatch__copy-btn`)는 `contrastRatio` 결과에 따라 흰색/검정 중 권장색 사용
- `swatch__copy-btn`: `aria-label='HEX {value} 복사'` (frozen), 클릭/Enter/Space로 복사 트리거(AC-4)
- `swatch__copy-feedback`: 복사 성공 시 "복사됨" 텍스트를 일시 노출(`copied`는 스와치 단위 상태, 전체 앱 상태 비영향)
- 테두리: `--color-swatch-border` 1px solid

## 6. AC 매핑 표

| AC | 요약 | 시안 반영 위치 |
|---|---|---|
| AC-1 | 팔레트 생성 정상 흐름 | 4.1절 입력→액션→`swatch-list` 흐름, 5.4 `generate-btn` 상태별 라벨, 5.7 `swatch-list` 5개 스와치 |
| AC-2 | 유효하지 않은 입력 → error, 기존 스와치 보존 | 5.6 `status-message` error 스타일, 5.7 `swatch-list` 보존 규칙, 5.4 `generate-btn` 즉시 재사용 |
| AC-3 | `hex-input` ↔ `color-picker` 동기화 | 4.1 §2 입력 영역, 5.2/5.3 양방향 동기화 명시 |
| AC-4 | HEX 복사 | 5.8 `swatch__copy-btn`/`swatch__copy-feedback` |
| AC-5 | 초기화 | 5.5 `reset-btn` 전체 초기값 복귀 |
| AC-6 | 반응형 (320px 세로 스택 / 768px 5열) | 4.3절 breakpoint 표, mockup 내 두 뷰포트 시뮬레이션 섹션 |
| AC-7 | 접근성 (aria-label, role, 텍스트 상태 표기) | 5.2/5.4/5.6/5.8 각 컴포넌트 aria 속성, 2절 색+텍스트 병행 원칙 |

## 7. dev 구현 가이드

- CSS 변수는 frozen 토큰명(`--color-accent`, `--color-error`, `--color-success`, `--color-swatch-border`, `--space-swatch-gap`, `--font-family-base`)을 `:root`에 그대로 선언하고, 본 문서 2절의 designer 보완 토큰(`--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`)을 추가로 선언해 사용한다.
- DOM id/class는 구현 설계 4.2/4.3절 및 본 문서 5절 명세를 그대로 사용한다(재정의 금지).
- `swatch-list`의 반응형 전환은 CSS Grid + media query(`min-width: 768px`)로 구현 권장: 모바일 `grid-template-columns: 1fr`, 데스크톱 `repeat(5, 1fr)`.
- `status-message`는 내용이 없어도 DOM에 존재하되 빈 상태를 유지해 `role="status"` 스크린리더 announce가 항상 동일 노드에서 발생하도록 한다.
- 버튼 비활성화(`generating` 중 `generate-btn`)는 `disabled` 속성과 `aria-disabled` 동시 적용을 권장(추가 접근성 보강, frozen 계약 위배 아님).
- 상세 색 변환/대비 계산 로직은 본 문서 범위가 아니며 `docs/plans/BF-2071/implementation-plan.md` 2절을 따른다.

## 8. mockup 참조

시각 mockup: [`docs/design/mockup-palette-BF-2071.html`](mockup-palette-BF-2071.html)

> 본 task의 frozen 계약(owned_paths / file_owner)에서 mockup 경로를 `docs/design/mockup-palette-BF-2071.html`로 고정했으므로 해당 경로를 그대로 사용한다.

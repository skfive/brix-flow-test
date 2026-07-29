# 실행 계약 상태 대시보드 — 구현 설계 (BF-1249)

> 본 문서는 designer(BF-1247)·developer(BF-1248)가 그대로 따라야 하는 **동결(frozen) 실행 계약**을 렌더링한다.
> selector·token·상태 모델·파일 소유권은 frozen blueprint(`ui-contract@v1`)가 유일한 권위이며, 본 문서는 이를 재정의하지 않는다.
> 새 파일·새 역할·계약 밖 요구사항을 추가하지 않는다.

## 1. 목적 (Objective)

실행 계약(dossier)의 요구사항·역할·테스트 진행 상태를 하나의 대시보드에서 조회한다.
외부 API·네트워크 없이 결정론적 로컬 fixture만으로 동작하며, designer/developer가 selector·token을
변경하지 않고 바로 구현할 수 있도록 UI 계약을 exact 값으로 고정한다.

- route: `/demo/dossier-trace`
- entry: `demo/dossier-trace/index.html`
- 검증 명령(권위): `node --test demo/dossier-trace/tests/*.test.js`

## 2. 파일 소유권 및 상태 계약 (frozen — 재정의 금지)

| 파일 | 소유자 | 정책 |
| --- | --- | --- |
| `demo/dossier-trace/index.html` | developer | additive |
| `demo/dossier-trace/app.js` | developer | additive |
| `demo/dossier-trace/fixtures.js` | developer | additive |
| `demo/dossier-trace/styles.css` | developer | additive |
| `docs/design/dossier-trace-BF-1246.md` | designer | additive |
| `docs/design/dossier-trace-mockup.html` | designer | additive |

- 후조건 불변식: **초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control을 다시 사용할 수 있어야 한다.**
- 파일 소유권과 상태 계약은 frozen blueprint가 유일한 권위이다. 본 planner 문서는 이를 설명할 뿐 재정의하지 않는다.

## 3. UI 계약 (exact — selector/token 변경 금지)

### 3.1 DOM ID
- `dossier-trace-root` — 대시보드 루트 컨테이너
- `dossier-filter-all` — 전체 필터 버튼
- `dossier-filter-progress` — 진행 필터 버튼
- `dossier-filter-done` — 완료 필터 버튼
- `dossier-list` — 카드 리스트 컨테이너
- `dossier-detail-panel` — 선택 항목 상세 패널

### 3.2 CSS class
- `dossier` — 대시보드 스코프 루트 class
- `dossier__filters` — 필터 버튼 그룹
- `dossier__card` — 상태 카드 공통
- `dossier__card--requirement` — 요구사항 카드 변형
- `dossier__card--role` — 역할 카드 변형
- `dossier__card--test` — 테스트 카드 변형
- `dossier__status-badge` — 상태 badge
- `dossier__detail` — 상세 패널 본문

### 3.3 상태 (states)
`loading` · `empty` · `ready` · `error` — 네 상태만 존재하며 각 상태는 색상만이 아니라 화면 텍스트로 구분한다.

### 3.4 디자인 토큰 (값 포함 — exact)
| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-bg-surface` | `#0f172a` | 대시보드 표면 배경 |
| `--color-text-primary` | `#e2e8f0` | 기본 텍스트 |
| `--color-status-ready` | `#22c55e` | 완료(ready) 상태 |
| `--color-status-progress` | `#f59e0b` | 진행(progress) 상태 |
| `--color-status-error` | `#ef4444` | 오류(error) 상태 |
| `--space-card-gap` | `16px` | 카드 간 간격 |

### 3.5 접근성 (accessibility)
- 상태 badge는 색상만이 아니라 **아이콘 + 텍스트(완료/진행/대기)** 를 병기한다.
- 필터 버튼과 카드 리스트는 **Tab/Shift+Tab** 과 **화살표 키**로 탐색 가능하고, 선택 항목은 `aria-selected`로 표시한다.
- 상세 패널 열림/닫힘은 `aria-label`을 가진 control로 조작하며, `prefers-reduced-motion` 시 전환 애니메이션을 제거한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형 (responsive)
- **360px 이상**에서 카드 리스트(`dossier-list`)와 상세 패널(`dossier-detail-panel`)이 **세로 스택**으로 재배치되며 content overflow가 발생하지 않는다.

## 4. 데이터 계약 (결정론적 로컬 fixture)

- 데이터는 `demo/dossier-trace/fixtures.js`에서만 제공한다. **외부 API·network·fetch 금지.**
- fixture는 결정론적(고정 값, 랜덤·타임스탬프 비의존)이어야 하며 동일 입력에 동일 렌더 결과를 보장한다.
- 각 항목은 카드 종류(`requirement`/`role`/`test`)와 상태(`done`/`progress`/`대기`)를 갖는다.
- 카드 종류 → CSS 변형 매핑: requirement → `dossier__card--requirement`, role → `dossier__card--role`, test → `dossier__card--test`.
- 상태 → badge 색상 토큰 매핑: 완료 → `--color-status-ready`, 진행 → `--color-status-progress`, 오류 → `--color-status-error`.

## 5. 사용자 시나리오 & Acceptance Criteria (Given/When/Then)

### AC-1 초기 로딩
- **Given** 사용자가 `/demo/dossier-trace`에 진입하면
- **When** fixture 로드가 진행 중이면 `loading` 상태를 화면 텍스트로 노출하고
- **Then** 로드 완료 후 `ready` 상태로 전환되어 `dossier-list`에 카드가 렌더된다.

### AC-2 빈 데이터
- **Given** 필터 결과 표시할 카드가 없으면
- **When** 대시보드가 렌더되면
- **Then** `empty` 상태를 화면 텍스트로 노출하고 상세 패널은 열리지 않는다.

### AC-3 상태 필터
- **Given** `ready` 상태에서
- **When** `dossier-filter-all`/`dossier-filter-progress`/`dossier-filter-done` 중 하나를 선택하면
- **Then** 해당 조건의 카드만 `dossier-list`에 남고 활성 필터는 `aria-selected`로 표시된다.

### AC-4 상세 패널
- **Given** 카드가 렌더된 상태에서
- **When** 카드를 선택하면
- **Then** `dossier-detail-panel`이 열리며 `dossier__detail`에 선택 항목 상세가 표시되고 `aria-label` control로 닫을 수 있다.

### AC-5 키보드 탐색
- **Given** 포커스가 필터 또는 리스트에 있을 때
- **When** Tab/Shift+Tab과 화살표 키를 사용하면
- **Then** 필터·카드 간 이동이 가능하고 선택 항목이 `aria-selected`로 반영된다.

### AC-6 오류 및 복구
- **Given** fixture 로드/렌더가 실패하면
- **When** `error` 상태가 되면 상태명을 화면 텍스트로 노출하고
- **Then** 초기화·재시도 뒤에는 상태와 진행 표시가 초기값으로 돌아가고 주 실행 control을 다시 사용할 수 있다.

### AC-7 반응형
- **Given** viewport 폭이 360px일 때
- **When** 대시보드가 렌더되면
- **Then** 리스트와 상세 패널이 세로 스택으로 재배치되고 overflow가 없다.

### AC-8 reduced-motion
- **Given** `prefers-reduced-motion: reduce`가 설정되면
- **When** 상세 패널을 열고 닫으면
- **Then** 전환 애니메이션이 제거된다.

## 6. Edge / 실패 케이스

- 빈 fixture: `empty` 상태로 폴백, 상세 패널 미개방 (AC-2).
- 로드 실패: `error` 상태 + 화면 텍스트, 재시도 시 초기값 복구 (AC-6, 후조건 불변식).
- 필터 결과 0건: `empty` 상태 텍스트 노출, 오류로 취급하지 않음.
- 색각 이상 사용자: 상태를 색상만으로 판별 불가하므로 아이콘+텍스트 병기 필수 (AC-1, 3.5).
- 360px 미만은 계약 범위 밖 — 360px를 최소 지원 폭으로 고정.

## 7. handoff 노트 (designer/developer)

- designer(BF-1247): `docs/design/dossier-trace-BF-1246.md`, `docs/design/dossier-trace-mockup.html`에 위 token·selector·상태·접근성을 그대로 반영한다. 새 selector/token을 만들지 않는다.
- developer(BF-1248): `demo/dossier-trace/{index.html,app.js,fixtures.js,styles.css}`를 additive로 구현하고 검증 명령 `node --test demo/dossier-trace/tests/*.test.js`를 통과시킨다.
- 두 역할 모두 본 계약의 selector와 token을 변경·재정의하지 않는다.

# 관리형 세션 상태 카드 — 시각 명세 (BF-1421)

> 본 문서는 `docs/plans/managed-session-canary-BF-1421.md`에 동결된 `ui-contract@v1`을 그대로 표현한 시각 명세다. selector·상태 텍스트·토큰·접근성·반응형 규칙은 재정의하지 않는다.

## 1. 시안 개요

- **변경 범위**: `demo/managed-session-canary-0801` 정적 캔버스에서 관리형 세션의 페르소나별 상태를 카드 목록으로 시각화한다.
- **사용자 경험 목표**: 운영자가 세션 데이터 로딩·정상 표시·빈 결과·오류를 한눈에 구분하고, 오류 발생 시 새로고침으로 즉시 재시도할 수 있게 한다.
- **범위 제외**: 필터링, 정렬, 페르소나 상세 페이지 등은 이번 시안에 포함하지 않는다(frozen 계약에 없음).

## 2. 컬러 팔레트

| 토큰 | 값 | 용도 | 출처 |
|---|---|---|---|
| `--color-surface-card` | `#ffffff` | 카드 배경색 | frozen (planner) |
| `--color-status-pass` | `#16a34a` | "통과/정상" 상태 강조색 | frozen (planner) |
| `--color-text` | `#0f172a` | 본문 텍스트 | designer 자체 정의 |
| `--color-text-muted` | `#475569` | 보조 텍스트(상태 설명, 안내문) | designer 자체 정의 |
| `--color-border` | `#e2e8f0` | 카드·컨트롤 테두리 | designer 자체 정의 |
| `--color-page-bg` | `#f1f5f9` | 페이지 배경 | designer 자체 정의 |

`--color-status-pass` 외 다른 상태(예: 실패)의 강조색은 frozen 계약에 정의되어 있지 않으므로, 색상만으로 상태를 구분하지 않는다는 6절 접근성 규칙에 따라 기본 텍스트색(`--color-text`)과 상태명 텍스트로 구분한다.

## 3. 타이포그래피

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| Heading (`session-status-root` 제목) | system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif | 20px | 700 | 1.4 |
| Body (카드 본문, 상태 텍스트) | 위와 동일 | 14px | 500 | 1.5 |
| Caption (state 안내 라벨) | 위와 동일 | 12px | 600 | 1.4 |

vanilla-static 규약에 따라 시스템 폰트 스택만 사용하고 외부 폰트 의존성은 두지 않는다.

## 4. 레이아웃

- **섹션 구조**: `session-status-root`(루트, `aria-live="polite"`) → 상태별 콘텐츠(로딩 텍스트 / `persona-card-list` / 빈 상태 텍스트 / 오류 텍스트) → `session-refresh` 컨트롤.
- **spacing**: 카드 간 간격은 `--space-card-gap`(16px)을 그대로 사용한다. 카드 내부 padding은 16px.
- **breakpoint 별 동작**:
  - 320px 이상: `persona-card-list`가 1열 세로 스택(`grid-template-columns: 1fr`)으로 배치되고 카드 내용은 overflow 없이 줄바꿈된다.
  - 768px 이상: `persona-card-list`가 다열 그리드(`grid-template-columns: repeat(2, 1fr)`)로 배치된다.

## 5. 컴포넌트 명세

### 5.1 `#session-status-root` (상태 루트)
- **props/속성**: `aria-live="polite"` (frozen). 내부 콘텐츠는 현재 상태(`loading` / `ready` / `empty` / `error`)에 따라 교체된다.
- **상태별 표시**:
  - `loading`: `세션 데이터를 불러오는 중…` 텍스트 + 진행 표시(spinner 또는 progress bar).
  - `ready`: 텍스트 없이 `#persona-card-list` 렌더.
  - `empty`: `표시할 세션이 없습니다` 텍스트.
  - `error`: `데이터를 불러오지 못했습니다. 다시 시도하세요` 텍스트 + 재시도 안내.
- **인터랙션**: 상태 전환 시 스크린리더가 `aria-live="polite"`로 변경 내용을 안내하므로, 상태 텍스트는 항상 완전한 문장으로 노출한다(아이콘/색상 단독 전달 금지).

### 5.2 `#persona-card-list` (카드 목록 컨테이너)
- **props**: 없음(정적 컨테이너).
- **상태**: `ready`일 때만 자식 카드가 채워지고, 그 외 상태에서는 비어 있거나 DOM에서 대체 콘텐츠로 교체된다.
- **인터랙션**: 없음(정적 목록).

### 5.3 `.session-card` (개별 상태 카드)
- **구조**: `.session-card` > `.session-card__persona`(페르소나명) + `.session-card__status`(상태명).
- **props**: 페르소나명(문자열), 상태명(문자열, 예: "통과"/"실패"/"대기").
- **상태**: 상태값에 따라 `.session-card__status`의 텍스트가 바뀐다. "통과" 상태만 `--color-status-pass`로 강조하고, 다른 상태는 기본 텍스트색을 사용하며 상태명 텍스트로 구분한다.
- **인터랙션**: 정적 표시 전용(클릭 등 인터랙션 없음). hover 시 배경을 `--color-page-bg`로 살짝 강조해 스캔 가독성을 돕는다(장식적 효과, 접근성 필수 요소 아님).

### 5.4 `#session-refresh` (새로고침 control)
- **props**: `aria-label="세션 상태 새로고침"` (frozen).
- **상태**: 기본적으로 항상 활성(enabled). `error` 상태에서 클릭 시 초기화되어 `loading` 상태로 되돌아간다. 진행 중 실패가 발생해도 control은 비활성(disabled) 상태로 고정되지 않고 즉시 재사용 가능해야 한다.
- **인터랙션**:
  - 클릭 → 상태를 `loading`으로 리셋 + 진행 표시 복원.
  - 초기화·취소·실패 이후에도 control은 항상 클릭 가능한 상태를 유지한다(4.1절 재시도 규칙).

## 6. dev 구현 가이드

1. `session-status-root` 요소는 `aria-live="polite"`를 유지한 채 상태별 콘텐츠만 교체한다(요소 자체를 제거·재생성하지 않는 것을 권장 — 스크린리더 announce 안정성).
2. 상태 텍스트는 정확히 frozen 문구를 사용한다: `세션 데이터를 불러오는 중…` / `표시할 세션이 없습니다` / `데이터를 불러오지 못했습니다. 다시 시도하세요`.
3. CSS 변수명은 `--color-surface-card`, `--color-status-pass`, `--space-card-gap`을 그대로 사용하고, 추가 변수가 필요하면 `--color-text`, `--color-text-muted`, `--color-border`, `--color-page-bg` 네이밍을 따른다(designer mockup과 동일).
4. 클래스명은 `session-card`, `session-card__persona`, `session-card__status`를 그대로 사용한다(BEM 스타일 유지, 새 이름 금지).
5. `session-refresh` 버튼은 `disabled` 속성을 상태 전환 로직에서 제어하지 않는다 — 실패 후에도 항상 클릭 가능해야 하므로, 로딩 중 잠깐의 비활성화가 필요하더라도 실패/초기화 직후에는 즉시 재활성화한다.
6. 반응형은 CSS `grid-template-columns` + `@media (min-width: 768px)` 미디어쿼리로 구현하고, 320px 뷰포트에서 카드 텍스트가 잘리거나 넘치지 않도록 `word-break`/`min-width: 0`을 고려한다.
7. 카드 목록이 비어 있을 때(`empty`)와 로드 실패(`error`)는 서로 다른 문구이므로 상태 분기 로직에서 혼동하지 않는다.

## 7. mockup 참조

- 시각 mockup: [`docs/design/mockups/managed-session-canary-BF-1421.html`](./mockups/managed-session-canary-BF-1421.html)
- mockup은 `loading` / `ready` / `empty` / `error` 4개 상태와 320px / 768px 반응형 레이아웃을 각각 정적으로 시뮬레이션한다.

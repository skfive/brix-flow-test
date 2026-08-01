# 피드백 카드 실행 설계 — BF-1446 (operator-feedback)

## 목적

designer(`docs/design`)와 developer(`phase21-validation/operator-feedback`)가 서로 충돌 없이 병렬로 구현할 수 있도록, 피드백 카드의 selector·상태·token·접근성·소유권을 이 문서에서 동결(freeze)한다. 이 문서는 새로운 요구사항을 추가하지 않으며, frozen Execution Blueprint(`ui-contract@v1`, sha256:51af5d40...)에 이미 확정된 계약을 그대로 옮겨 적은 것이다.

## 파일 소유권 (겹치지 않음)

| 경로 | 소유자 | 비고 |
|---|---|---|
| `docs/design/operator-feedback-BF-1446.md` | designer | 시각 명세 (색상 적용, 레이아웃 diagram 등) |
| `docs/design/operator-feedback-mockup.html` | designer | 정적 mockup |
| `phase21-validation/operator-feedback/operator-feedback.html` | developer | 실제 마크업 |
| `phase21-validation/operator-feedback/operator-feedback.js` | developer | 상태 로직 |
| `phase21-validation/operator-feedback/operator-feedback.test.js` | developer | 단위 테스트 |
| `phase21-validation/operator-feedback/operator-feedback.e2e.test.js` | tester (BF-1452, 후속 task) | E2E 회귀 가드 — 이번 task 범위 아님, read-only 참조만 |
| `docs/plans/operator-feedback-BF-1446.md` | planner (본 문서) | 실행 설계·handoff 계약 |

designer는 `docs/design/*` 만, developer는 `phase21-validation/operator-feedback/*` 만 수정한다. 두 영역은 디렉터리가 분리되어 있어 병렬 작업 시 머지 충돌이 발생하지 않는다.

## DOM 계약

- `#feedback-card-root` — 카드 루트 컨테이너
- `#feedback-confirm-btn` — 1차 확인 버튼
- `#feedback-submit-btn` — 최종 제출 버튼
- `#feedback-status-live` — 상태 메시지 출력 영역 (`aria-live="polite"`)

CSS 클래스:
- `.feedback-card`
- `.feedback-card__actions`
- `.feedback-card__status`
- `.feedback-card__message`

## 상태 모델 (idle → confirming → submitting → success | warning | failure)

```
idle ── (확인 버튼 클릭) ──> confirming
confirming ── (제출 버튼 클릭) ──> submitting
confirming ── (취소/ESC) ──> idle
submitting ── (성공 응답) ──> success
submitting ── (경고 응답) ──> warning
submitting ── (실패 응답) ──> failure
success | warning | failure ── (재시도/초기화) ──> idle
```

| 상태 | `feedback-confirm-btn` | `feedback-submit-btn` | `feedback-status-live` 텍스트 |
|---|---|---|---|
| idle | 활성 | 비활성(숨김 또는 disabled) | (비어있음 또는 안내 문구) |
| confirming | 비활성 | 활성 | "확인됨 — 제출을 눌러주세요" |
| submitting | 비활성 | 비활성(진행 표시) | "제출 중..." |
| success | 활성(초기화됨) | 비활성 | "성공: 처리 완료" |
| warning | 활성(초기화됨) | 비활성 | "경고: 확인이 필요합니다" |
| failure | 활성(초기화됨) | 비활성 | "실패: 다시 시도해주세요" |

후조건(모든 결과 상태 공통): 취소·실패 뒤에는 상태와 진행 표시가 `idle`로 되돌아가고 `feedback-confirm-btn`이 다시 사용 가능해야 한다. 이 후조건은 frozen invariant이며 designer/developer 모두 구현 시 반드시 지켜야 한다.

## Design Token

- `--color-action-primary: #2563eb`
- `--color-status-success: #16a34a`
- `--color-status-warning: #d97706`
- `--color-status-failure: #dc2626`
- `--space-card-gap: 12px`

## 접근성 계약

- `#feedback-status-live`는 `aria-live="polite"`로 상태 변경을 스크린리더에 알린다.
- `#feedback-confirm-btn`, `#feedback-submit-btn`은 명시적 `aria-label`을 가진다.
- 키보드만으로 확인 → 제출 → 결과 확인 흐름을 완주할 수 있다 (Tab/Enter/Space로 전체 조작 가능).
- 모든 상태는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름(예: `aria-label`, 텍스트 콘텐츠)으로 함께 노출한다.

## 반응형 계약

- 320px 이상 뷰포트에서 카드 콘텐츠 overflow가 발생하지 않는다.
- 480px 미만에서는 `.feedback-card__actions` 내 액션 버튼이 세로로 스택된다.

## Handoff 순서

1. designer는 위 DOM/CSS/token/상태/접근성 계약을 그대로 사용해 `docs/design/operator-feedback-BF-1446.md`(시각 명세)와 `docs/design/operator-feedback-mockup.html`(정적 mockup)을 작성한다. selector·token·상태명을 새로 정의하지 않는다.
2. developer는 동일 계약을 그대로 사용해 `phase21-validation/operator-feedback/operator-feedback.html`, `.js`, `.test.js`를 구현한다. selector·token·상태 모델을 재정의하지 않는다.
3. designer와 developer는 서로 다른 디렉터리를 소유하므로 병렬 진행 가능하며 blocked_by는 본 planner task(`plan`) 완료만 해당한다.
4. reviewer는 design·develop 완료 후 두 산출물이 본 문서의 계약과 일치하는지 검토한다.
5. tester는 reviewer 승인 후 `operator-feedback.e2e.test.js`로 idle→confirming→submitting→success|warning|failure 전이와 접근성(키보드/aria-live)을 회귀 가드로 검증한다.

## Non-goals

- 디자인 시안(색상 적용, 실제 CSS 값 조정)은 이 문서의 책임이 아니다 — designer 영역.
- 코드 구현(JS 로직, 마크업)은 이 문서의 책임이 아니다 — developer 영역.
- 새로운 파일, 새로운 상태, 새로운 역할을 추가하지 않는다. 위 표에 없는 selector/token/상태는 frozen 계약 위반이다.

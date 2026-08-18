# 타자 연습기 구현 설계 (BF-2181)

- Epic: BF-2178
- 관련 Task: BF-2179 (designer), BF-2180 (developer)
- 작성: 박기획 (planner)
- 상태: frozen — designer/developer는 아래 계약을 그대로 따른다. 이 문서는 새 파일이나 역할을 추가하지 않는다.

## 1. 사용자 시나리오

연습자는 화면에 표시된 목표 문장(prompt-text)을 보고 입력창(typed-input)에 그대로 타이핑한다.

1. 화면을 열면 idle 상태로 시작한다 — 목표 문장이 보이고 입력은 비어 있다.
2. 첫 글자를 입력하면 typing 상태로 전환되고, 입력한 글자마다 정오답 색상이 표시된다.
3. 목표 문장 길이만큼 입력을 마치면 done 상태로 전환되고, 진행 결과가 stats-panel에 표시된다.
4. 연습자는 언제든 restart-button을 눌러 idle 상태로 되돌아가 다시 시작할 수 있다.

## 2. 상태 전이표

| 현재 상태 | 트리거 | 다음 상태 | 화면 텍스트(색상 아님) | typed-input | restart-button |
|---|---|---|---|---|---|
| (초기 로드) | 화면 렌더링 | idle | "대기 중 — 입력을 시작하세요" | 비어 있음, 활성 | 활성 |
| idle | 첫 글자 입력 | typing | "입력 중" | 입력값 반영, 활성 | 활성 |
| typing | 문자 계속 입력 (미완료) | typing | "입력 중" | 입력값 반영, 활성 | 활성 |
| typing | 백스페이스로 입력이 모두 삭제됨 | idle | "대기 중 — 입력을 시작하세요" | 비어 있음, 활성 | 활성 |
| typing | 입력 길이가 prompt-text 길이에 도달 | done | "완료되었습니다" | 비활성(readonly/disabled) | 활성(포커스 이동) |
| done | restart-button 클릭 | idle | "대기 중 — 입력을 시작하세요" | 비어 있음, 다시 활성 | 활성 |

상태 텍스트는 색상 변화와 별개로 화면에 문구로 노출되어야 하며, `char--correct`/`char--incorrect`/`char--pending` 클래스만으로 상태를 구분하지 않는다.

## 3. 재시작(restart) 규칙

- `restart-button` 클릭 시 다음을 원자적으로 수행한다:
  1. `typed-input` 값을 빈 문자열로 초기화하고, disabled/readonly였다면 다시 활성화한 뒤 포커스를 이동한다.
  2. `prompt-text`의 문자별 클래스(`char--correct`/`char--incorrect`/`char--pending`)를 모두 `char--pending`으로 되돌린다.
  3. `stats-panel`의 진행 지표(정확도, 소요 시간 등)를 초기값(0 또는 빈 상태)으로 되돌린다.
  4. 상태를 idle로 전환하고 idle 상태 문구를 노출한다.
  5. `paste-warning`이 표시되어 있었다면 숨긴다.
- restart는 idle/typing/done 어느 상태에서 호출되어도 동일하게 동작한다.

## 4. 입력 규칙

- **Enter 무시**: `typed-input`에서 Enter(Keydown `key === "Enter"`)는 기본 동작(줄바꿈/폼 제출)을 막고 값과 상태를 변경하지 않는다. idle, typing 상태 모두 동일하다.
- **붙여넣기 차단**: `paste` 이벤트(단축키, 우클릭 붙여넣기, 드래그앤드롭 텍스트 삽입 포함)는 `preventDefault()`로 막아 `typed-input` 값에 반영되지 않는다. 동시에 `paste-warning`을 노출한다.
- **paste-warning 노출 규칙**: `role="alert"`로 스크린리더에 즉시 안내되며, 붙여넣기 시도가 발생한 시점의 상태(idle 또는 typing)를 유지한 채로 표시된다. 상태 전이는 발생하지 않는다.
- **done 상태 입력 차단**: done 상태에서는 `typed-input`이 비활성화되어 추가 입력을 받지 않는다.

## 5. Acceptance Criteria (Given/When/Then)

### AC-1. 상태 전이와 화면 텍스트
- Given 화면이 처음 로드되었을 때, When 아무 입력도 없으면, Then 상태는 idle이고 "대기 중 — 입력을 시작하세요" 문구가 노출된다.
- Given idle 상태에서, When 연습자가 첫 글자를 입력하면, Then 상태는 typing으로 전환되고 "입력 중" 문구가 노출된다.
- Given typing 상태에서, When 입력 길이가 prompt-text 길이에 도달하면, Then 상태는 done으로 전환되고 "완료되었습니다" 문구와 함께 stats-panel에 결과가 표시된다.
- Given typing 상태에서, When 백스페이스로 입력이 모두 삭제되면, Then 상태는 idle로 돌아가고 idle 문구가 노출된다.

### AC-2. 재시작 초기화
- Given done 상태에서, When 연습자가 restart-button을 클릭하면, Then typed-input이 비워지고 재활성화되며, stats-panel과 문자별 진행 표시가 초기값으로 복원되고, 상태는 idle로 전환된다.
- Given typing 상태에서, When 연습자가 restart-button을 클릭하면, Then 동일하게 idle로 초기화된다.

### AC-3. Enter 무시
- Given idle 또는 typing 상태에서, When 연습자가 typed-input에서 Enter를 입력하면, Then 값과 상태가 변경되지 않고 기본 동작(줄바꿈/제출)도 발생하지 않는다.

### AC-4. 붙여넣기 차단
- Given idle 또는 typing 상태에서, When 연습자가 typed-input에 붙여넣기를 시도하면, Then 붙여넣은 내용이 값에 반영되지 않고 paste-warning이 `role="alert"`로 노출되며 상태는 시도 시점의 상태를 유지한다.

### 실패/엣지 케이스
- prompt-text 길이가 0인 경우는 발생하지 않음(항상 비어 있지 않은 목표 문장이 주어짐을 전제로 한다).
- done 상태에서의 추가 키 입력은 typed-input이 비활성화되어 있으므로 무시된다.
- 붙여넣기 차단과 Enter 무시는 상태와 무관하게 항상 동일하게 동작해야 한다(idle/typing 모두).

## 6. UI 계약 (frozen — designer/developer는 selector·token을 변경·재정의하지 않는다)

### 산출물 경로 및 소유자
| 경로 | 소유자 | 정책 |
|---|---|---|
| `docs/design/BF-2178/typing-practice.md` | designer | additive |
| `docs/design/mockups/BF-2178-typing.html` | designer | additive |
| `typing/index.html` | developer | additive |
| `typing/style.css` | developer | additive |
| `typing/typing.js` | developer | additive |
| `typing/typing.test.js` | developer | additive |

이 문서(`docs/plans/BF-2178/implementation-plan.md`)는 planner 소유이며, 위 표는 frozen blueprint의 소유권을 그대로 설명한다. 새 파일이나 새 역할을 추가하지 않는다.

### DOM ID / class
- `#typing-root` (`.typing-app`) — 최상위 컨테이너
- `#prompt-text` — 목표 문장 표시
- `#typed-input` — 입력 control
- `#stats-panel` — 진행 지표 표시
- `#restart-button` (`.btn-restart`) — 다시 시작 버튼
- `#paste-warning` — 붙여넣기 차단 경고
- 문자별 상태 class: `.char--correct`, `.char--incorrect`, `.char--pending`

### 상태
`idle`, `typing`, `done` — 3장의 상태 전이표(2절)를 그대로 따른다.

### Design Token
| Token | 값 | 용도 |
|---|---|---|
| `--color-char-correct` | `#16a34a` | 정타 문자 색상 |
| `--color-char-error` | `#dc2626` | 오타 문자 색상 |
| `--color-char-pending` | `#6b7280` | 미입력 문자 색상 |
| `--color-bg` | `#0f172a` | 배경색 |
| `--space-control-gap` | `12px` | control 간 여백 |

### 접근성
- `typed-input`은 `aria-label="타이핑 연습 입력"`을 가진다.
- `restart-button`은 `aria-label="다시 시작"`을 가지고 키보드 Tab/Enter로 조작 가능하다.
- `paste-warning`은 `role="alert"`로 스크린리더에 즉시 안내된다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다(2절 상태 전이표의 문구 참조).

### 반응형
- 320px 이상 뷰포트에서 `prompt-text`와 `stats-panel`이 줄바꿈되며 가로 overflow가 발생하지 않는다.

## 7. 테스트 범위 (참고)

focused test scope: `typing` 모듈. developer는 `typing/typing.test.js`에 상태 전이(idle/typing/done), 재시작 초기화, Enter 무시, 붙여넣기 차단을 커버하는 단위 테스트를 작성한다. 실행: `node --test tests/typing-*.test.js` 또는 동등한 focused 명령.

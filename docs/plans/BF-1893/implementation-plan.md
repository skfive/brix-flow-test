# 실행 설계: 카드 짝맞추기 게임 (games/memory.html)

- Jira: BF-1909 (planner) / BF-1907 (developer)
- 대상 파일: `games/memory.html` (신규, 단일 파일, 프레임워크 없는 vanilla HTML/CSS/JS)
- 파일 소유자: developer (BF-1907). 본 문서는 계약만 동결하며 `games/memory.html`을 직접 생성/수정하지 않는다.
- 서빙: 정적 파일, route `/games/memory.html` (root-relative-static)

developer는 아래 계약(DOM id/class, 상태 모델, CSS 토큰, 접근성, 반응형, 점수/재시작 규칙)을 **그대로** 구현한다. selector·상태명·토큰 값을 변경하거나 재정의하지 않는다.

## 1. 카드 배치 (16장 / 8쌍)

- 카드 총 16장, 8종 심볼 × 2장씩 배치한다.
- 심볼 집합(고정 8종, 순서 무관): `🍎 사과, 🍌 바나나, 🍇 포도, 🍓 딸기, 🍒 체리, 🍍 파인애플, 🥝 키위, 🍉 수박`
- 최초 로드 및 재시작 시 16장의 위치를 무작위로 셔플한다.
- 각 카드는 `data-pair-id`(0~7, 심볼 식별) 속성을 가진다.

## 2. DOM 구조 (exact id/class)

```html
<main>
  <h1>카드 짝맞추기</h1>
  <div id="score-display">점수: 0</div>
  <div id="status-display" role="status" aria-live="polite">진행 중</div>
  <div id="memory-board" role="group" aria-label="카드 보드">
    <!-- 16개 카드 버튼 반복, N=1..16 -->
    <button type="button" class="memory-card" data-card-index="0" data-pair-id="{0-7}"
            aria-label="카드 1, 뒤집기">
    </button>
    <!-- ... 총 16개 -->
  </div>
  <button type="button" id="restart-button" aria-label="게임 다시 시작">다시 시작</button>
</main>
```

### exact ID
| id | 요소 | 역할 |
|---|---|---|
| `memory-board` | 카드 컨테이너 (grid) | 16개 `.memory-card` 버튼을 담는다 |
| `score-display` | 점수 텍스트 | `점수: {N}` 형식 |
| `status-display` | 상태 텍스트 (`role="status"`, `aria-live="polite"`) | 상태별 문구 표시 (§3) |
| `restart-button` | 재시작 버튼 | `aria-label="게임 다시 시작"` |

### exact class
| class | 대상 | 의미 |
|---|---|---|
| `memory-card` | 카드 버튼 기본 클래스 (16개 모두 항상 보유) | 카드 뒷면 상태 |
| `memory-card--flipped` | 뒤집힌(공개된) 카드에 추가 | 현재 앞면 노출 중, 아직 매칭 확정 전 |
| `memory-card--matched` | 매칭 확정된 카드에 추가 | 영구 공개, 클릭 비활성 |

## 3. 상태 모델 (playing / checking / won)

전역 게임 상태는 3가지이며, `status-display` 텍스트와 접근성 이름으로 항상 노출한다(색상만으로 구분 금지).

| state | 진입 조건 | `status-display` 텍스트 | 사용자 카드 클릭 허용 |
|---|---|---|---|
| `playing` | 초기 로드 / 재시작 직후 / 짝 비교 결과 처리 완료 후 | `진행 중` | O (뒤집힌 카드 0장 또는 1장일 때) |
| `checking` | 두 번째 카드를 뒤집어 짝 비교 시작 | `확인 중` | X (신규 카드 클릭 무시) |
| `won` | 8쌍(16장) 모두 `memory-card--matched` | `승리! 점수: {N}점` | X (모든 카드 버튼 disabled) |

### 상태 전이

1. `playing`에서 카드 클릭 → 해당 카드에 `memory-card--flipped` 추가. 뒤집힌 카드가 1장이면 `playing` 유지, 2장이 되면 `checking`으로 전이.
2. `checking` 진입 시 두 카드의 `data-pair-id` 비교:
   - **일치**: 두 카드에 `memory-card--matched` 추가(‑`memory-card--flipped`` 제거), 각 버튼 `disabled=true`, `aria-label`을 `카드 N, {심볼명}, 매칭됨`으로 갱신, `score-display` +10점 반영, 매칭된 쌍이 8쌍 미만이면 `playing`으로 복귀, 8쌍이면 `won`으로 전이.
   - **불일치**: 약 600ms 후 두 카드에서 `memory-card--flipped` 제거(`aria-label`을 `카드 N, 뒤집기`로 되돌림), 점수 변화 없음, `playing`으로 복귀.
3. `won` 상태에서는 모든 카드 버튼이 `disabled`이며 `restart-button`만 조작 가능하다.

## 4. 점수 표시 규칙

- 초기 점수: `0`, 표시: `점수: 0`
- 매칭 성공 1회당 `+10`점, 표시 갱신: `점수: {N}`
- 불일치 시 점수 변화 없음(감점 없음)
- 승리 시 `status-display`에 최종 점수를 포함해 표시: `승리! 점수: {N}점` (동일 값을 `score-display`에도 유지)

## 5. 재시작(restart) 초기화 범위

`restart-button` 클릭 시 아래를 **모두** 초기값으로 되돌리고, 이후 주 실행 control(카드 버튼, 재시작 버튼)을 즉시 다시 사용할 수 있어야 한다.

- `score-display` → `점수: 0`
- 16장 전체: `memory-card--flipped`, `memory-card--matched` 클래스 제거, `disabled` 해제, `aria-label`을 `카드 N, 뒤집기`로 초기화
- 카드-심볼(`data-pair-id`) 배치를 새로 무작위 셔플하여 재배치
- `status-display` → `진행 중`
- 전역 상태 → `playing`
- `restart-button`은 초기화 도중/이후에도 항상 클릭 가능해야 한다(재시작 자체가 실패하거나 중단되는 경로는 없음).

## 6. CSS 커스텀 프로퍼티 (exact 값)

```css
:root {
  --color-card-back: #1e293b;
  --color-card-face: #f8fafc;
  --color-card-matched: #22c55e;
  --space-board-gap: 12px;
}
```

- `.memory-card` (기본, 뒷면): `background: var(--color-card-back)`
- `.memory-card--flipped`, `.memory-card--matched` (앞면 공개): `background: var(--color-card-face)`
- `.memory-card--matched`: 추가로 `background: var(--color-card-matched)` 또는 테두리 등 시각 강조 — 단, §3/§8 규칙대로 색상만으로 구분하지 않도록 카드 내부에 심볼 텍스트/이모지와 `aria-label` 갱신을 반드시 병행한다.
- `#memory-board`의 카드 간격은 `gap: var(--space-board-gap)`을 사용한다.

## 7. 반응형 (320px 이상, 가로 스크롤 없음)

- `#memory-board { display: grid; grid-template-columns: repeat(auto-fit, minmax(56px, 1fr)); gap: var(--space-board-gap); width: 100%; box-sizing: border-box; }`
- 각 `.memory-card`는 `aspect-ratio: 1 / 1;`로 정사각형을 유지해 세로 오버플로를 방지한다.
- 페이지 컨테이너(`main`)는 `padding: 16px; box-sizing: border-box;` 이하로 유지해, 320px 뷰포트(사용 가능 너비 288px)에서 `minmax(56px, 1fr)` + `gap: 12px` 기준 4열이 자동 배치되고(16장 → 4×4), 가로 스크롤 overflow가 발생하지 않는다.
- `html, body { margin: 0; overflow-x: hidden; }`로 뷰포트 밖 가로 스크롤을 추가 방지한다.

## 8. 접근성

- 16개 카드는 모두 `<button type="button">` 요소이며, 항상 명시적 `aria-label`을 가진다.
  - 뒤집기 전: `카드 N, 뒤집기` (N=1~16, 화면상 카드 순번)
  - 공개(뒤집힘/매칭) 상태: `카드 N, {심볼명}, 뒤집기`(매칭 전) 또는 `카드 N, {심볼명}, 매칭됨`(매칭 확정)
- `#restart-button`은 `aria-label="게임 다시 시작"`을 가진다.
- 모든 카드/재시작 버튼은 Tab 키로 포커스 이동 가능하고, `Enter` 또는 `Space` 키로 활성화된다(네이티브 `<button>` 동작 사용, 별도 keydown 핸들러 불필요).
- 전역 상태(`playing`/`checking`/`won`)는 `#status-display`의 화면 텍스트로 노출되며, `role="status"` + `aria-live="polite"`로 스크린리더에도 상태 변경이 전달된다.
- 매칭 상태는 배경색(`--color-card-matched`)만으로 구분하지 않고, 카드 내부 텍스트/심볼과 `aria-label`의 `매칭됨` 문구로 함께 노출한다.

## 9. Edge case / 실패 케이스

- `checking` 상태 중 카드 클릭: 무시(상태/DOM 변경 없음).
- 이미 `memory-card--matched`이거나 `disabled`인 카드 클릭: 무시.
- 동일 카드를 연속 두 번 클릭(같은 `data-card-index`): 두 번째 클릭은 무시하여 자기 자신과 매칭되지 않도록 한다.
- 재시작을 `checking` 상태(딜레이 대기 중) 도중 클릭: 대기 중이던 불일치 되돌리기 타이머를 무효화하고 즉시 §5 초기화를 수행한다(초기화 후 잔여 타이머가 상태를 되돌리지 않아야 한다).
- `won` 상태에서 카드 클릭: 무시(모든 카드 `disabled`이므로 발생하지 않아야 하지만, 방어적으로 무시 처리).

## 10. 완료 조건 (frozen blueprint 그대로)

- 대상 파일은 `games/memory.html` 1개이며, developer(BF-1907)가 신규 생성한다. planner는 파일을 추가하지 않는다.
- 파일 소유자: developer. 이후 변경도 developer 소유 범위이며, 본 계약(§2~§9)의 selector/상태명/토큰 값은 재정의하지 않는다.
- 상태: 본 문서는 draft가 아닌 **동결된 실행 계약**이며, developer는 이를 그대로 구현하고 reviewer/tester가 이 문서 기준으로 검증한다.
- 후조건: 초기화(재시작) 후에도 상태와 진행 표시가 초기값으로 복귀하고 주 실행 control(카드, 재시작 버튼)을 즉시 다시 사용할 수 있어야 한다(§5).

# 타이핑 속도 테스트 구현 설계 — BF-1919 (Epic BF-1916)

## 0. 문서 성격 및 범위 제약 (frozen, 재정의 금지)

본 문서는 이 task(BF-1919)의 **유일한 산출물**이다
(`docs/plans/BF-1916/implementation-plan.md`, `planning-contract@v1`
sha256:98c65e80d185f3f30f9a9ccca8aea1f5a2bf0bf702e7a6ff51ae81ab226a3a5b).
아래 파일 소유권·상태·후조건은 상위 frozen Execution Blueprint
(`ui-contract@v1`, sha256:076a7d2ed4597a916c367779fe0489ff41c3d9c93f4df5e5d01ee23cccab1f22)를
**재정의 없이** 그대로 서술한다. 본 문서는 신규 파일·신규 역할을 추가하지 않는다.

| 파일 | 소유자 | task | 정책 |
| --- | --- | --- | --- |
| `docs/plans/BF-1916/implementation-plan.md` (본 문서) | planner | BF-1919 | 본 task 산출물 |
| `docs/design/contract.md` | designer | BF-1917 (blocked_by: plan) | additive — 기존 절(BF-1478/BF-1502) 보존, 본 epic 절만 추가 |
| `typing-test.html` | developer | BF-1918 (blocked_by: plan) | additive — **신규 파일 1개만 생성**, 다른 파일 수정 금지 |

- **제약**: developer는 `typing-test.html` **하나만** 생성한다. 별도 CSS/JS 파일 분리, 빌드 설정 변경,
  기존 파일 수정을 하지 않는다(`vanilla-static` 스택, 외부 의존성 0건 — HTML/CSS/JS를
  단일 파일에 inline).
- designer는 `docs/design/contract.md`에 본 epic(BF-1916) 전용 절을 **추가**하며, 기존 다른
  Jira key 절(BF-1478 `agent-queue-legend-canary`, BF-1502 `neon-snake-fullscreen-0802`)은
  변경·삭제하지 않는다.
- 본 문서 §3(UI 계약)의 DOM ID/class/token/state는 **frozen** — designer/developer는
  selector와 token 값을 변경하거나 재정의하지 않는다.
- API/서버 데이터 모델: 없음. 본 기능은 순수 클라이언트 정적 페이지이며 네트워크 호출이
  없다. §5 데이터 모델은 브라우저 메모리(JS 변수) 상의 런타임 상태만 정의한다.

## 1. 기능 개요

사용자가 화면에 제시된 문장을 입력하여 타이핑 속도(WPM)와 정확도(%)를 실시간으로
측정하는 단일 페이지 도구.

- 대상 파일: `typing-test.html` (developer, BF-1918 소유, 단일 파일)
- 사용자 목표: 문장 입력 시작 시 자동으로 측정이 시작되고, 문장을 끝까지 입력하면
  자동으로 종료되어 최종 WPM·정확도를 확인할 수 있다. 언제든 "다시 시작"으로 새 문장을
  받아 재도전할 수 있다.
- 실시간 오타 구분: 입력 중인 글자마다 정답/오답/현재 커서 위치를 색상 + 화면 텍스트
  이중으로 구분해, 색각 이상 사용자도 진행 상황을 인지할 수 있다.

## 2. 사용자 시나리오 (Given/When/Then)

### 2.1 정상 흐름 — idle → running → finished

- **Given** 사용자가 `typing-test.html`을 처음 열었다.
- **When** 페이지가 로드된다.
- **Then** `state=idle`, 문장 목록 중 하나가 무작위로 `#typing-test-sentence`에
  표시되고, `#typing-test-status`는 "입력을 시작하면 측정이 시작됩니다"를 보여주며,
  `#typing-test-timer`="00:00", `#typing-test-wpm`="0 WPM",
  `#typing-test-accuracy`="정확도 100%"이다. `#typing-test-input`은 비어 있고 사용 가능하다.

- **Given** `state=idle`이고 `#typing-test-input`에 포커스가 있다.
- **When** 사용자가 첫 글자를 입력한다.
- **Then** `state=running`으로 전이되고 타이머가 0부터 카운트업을 시작하며,
  `#typing-test-status`="입력 중…"으로 바뀐다. 입력한 글자에 해당하는
  `#typing-test-sentence` 내 `.typing-test__char`에 `--correct` 또는 `--incorrect`
  modifier가 즉시 부여되고, 다음 글자에는 `--current`가 부여된다.

- **Given** `state=running`이고 사용자가 문장 끝까지 입력했다(입력 길이 == 문장 길이).
- **When** 마지막 글자가 입력된다.
- **Then** `state=finished`로 전이되고 타이머가 멈추며, `#typing-test-status`="완료!",
  `#typing-test-wpm`/`#typing-test-accuracy`가 최종 값으로 고정되고,
  `#typing-test-result`에 "완료 — {WPM} WPM, 정확도 {정확도}%" 요약이 표시된다.
  `#typing-test-input`은 더 이상 새 입력을 받지 않는다(readonly).

### 2.2 오타 정정 (실시간 재계산)

- **Given** `state=running`이고 사용자가 한 글자를 오타로 입력했다(`--incorrect`).
- **When** 사용자가 백스페이스로 그 글자를 지우고 올바른 글자를 다시 입력한다.
- **Then** 해당 위치의 `.typing-test__char`가 `--incorrect`에서 `--correct`로 갱신되고,
  `#typing-test-accuracy`가 즉시 재계산되어 반영된다(§4.2 계산식 — 누적 오타가 아니라
  현재 입력 상태 기준 재계산).

### 2.3 다시 시작 (모든 state에서 idle 복귀 — frozen 후조건)

- **Given** `state`가 `idle`/`running`/`finished` 중 어느 것이든 상관없다(진행 중 취소 포함).
- **When** 사용자가 `#typing-test-restart`를 클릭(또는 Tab 이동 후 Enter/Space)한다.
- **Then** 새 문장이 무작위로 선택되어 `#typing-test-sentence`에 표시되고, `state=idle`로
  복귀하며 타이머/WPM/정확도가 초기값(`00:00`/`0 WPM`/`정확도 100%`)으로 리셋되고,
  `#typing-test-result`는 숨겨지며, `#typing-test-input`은 즉시 다시 입력 가능한 상태가
  된다. `#typing-test-restart`는 어느 state에서도 항상 활성 상태다(비활성 고착 금지).

## 3. UI 계약 (frozen — designer/developer 그대로 구현)

### 3.1 DOM 구조

```
#typing-test-root
├─ #typing-test-sentence               ── 목표 문장, 글자별 <span class="typing-test__char [--correct|--incorrect|--current]">
├─ #typing-test-input                  ── <input type="text"> 또는 <textarea>, aria-label="타이핑 테스트 입력"
├─ (통계 그룹, 각 요소 개별 aria-live="polite")
│   ├─ #typing-test-status  (.typing-test__stat)  ── 상태 텍스트
│   ├─ #typing-test-timer   (.typing-test__stat)  ── 경과 시간 mm:ss
│   ├─ #typing-test-wpm     (.typing-test__stat)  ── "{n} WPM"
│   └─ #typing-test-accuracy(.typing-test__stat)  ── "정확도 {n}%"
├─ #typing-test-restart                ── <button> "다시 시작"
└─ #typing-test-result (.typing-test__result)     ── finished에서만 표시, 그 외 숨김
```

- 위 ID 9개(`typing-test-root`, `typing-test-sentence`, `typing-test-input`,
  `typing-test-status`, `typing-test-timer`, `typing-test-wpm`, `typing-test-accuracy`,
  `typing-test-restart`, `typing-test-result`)와 class 6개(`typing-test__char`,
  `typing-test__char--correct`, `typing-test__char--incorrect`, `typing-test__char--current`,
  `typing-test__stat`, `typing-test__result`)는 frozen이며 변경·삭제·재정의하지 않는다.

### 3.2 state별 화면 텍스트 (exact, frozen)

| state | `#typing-test-status` | `#typing-test-input` | `#typing-test-restart` | `#typing-test-result` |
| --- | --- | --- | --- | --- |
| `idle` | `입력을 시작하면 측정이 시작됩니다` | 비어 있음, 사용 가능(활성) | 활성 | 숨김 |
| `running` | `입력 중…` | 사용 가능(활성), 입력값 유지 | 활성 | 숨김 |
| `finished` | `완료!` | readonly(비활성 입력, 값 유지) | 활성(즉시 재사용 가능) | 표시: `완료 — {WPM} WPM, 정확도 {정확도}%` |

- `#typing-test-timer` 초기값(모든 state 진입 직후 `idle`)은 `00:00`,
  `#typing-test-wpm` 초기값은 `0 WPM`, `#typing-test-accuracy` 초기값은 `정확도 100%`.
- `running` 중 `#typing-test-timer`는 `mm:ss` 형식으로 카운트업하며, `#typing-test-wpm`/
  `#typing-test-accuracy`는 §4.2 계산식으로 실시간 갱신된다.
- `finished` 전이 시 타이머는 멈추고 그 시점 값을 고정 표시한다(그 이후 갱신 없음).

### 3.3 색상 token (frozen, `:root` CSS 커스텀 프로퍼티로만 정의)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-char-correct` | `#16a34a` | `.typing-test__char--correct` 텍스트/배경 강조 |
| `--color-char-incorrect` | `#dc2626` | `.typing-test__char--incorrect` 텍스트/배경 강조 |
| `--color-char-current` | `#2563eb` | `.typing-test__char--current` 커서 위치 강조(예: 밑줄/배경) |
| `--color-bg` | `#0f172a` | 페이지 배경 |
| `--color-surface` | `#1e293b` | 카드/입력 영역 표면 |
| `--color-text` | `#e2e8f0` | 기본 텍스트 |
| `--space-control-gap` | `12px` | 통계 항목(`.typing-test__stat`) 및 control 간 간격 |

신규 상태/색상 토큰 추가 금지. 위 7개 토큰 외 필요한 보조 값(테두리·그림자 등)은
developer 재량이나 하드코딩 대신 CSS 커스텀 프로퍼티 사용을 권장한다(비-frozen).

### 3.4 접근성 (frozen)

1. `#typing-test-input`은 `aria-label="타이핑 테스트 입력"`을 가진다.
2. `#typing-test-status`, `#typing-test-timer`, `#typing-test-wpm`, `#typing-test-accuracy`
   4개 요소는 각각 `aria-live="polite"`를 가져, state 전이·통계 갱신 시 스크린리더가
   변화를 읽어준다.
3. `#typing-test-restart`는 네이티브 `<button>` 요소이며, Tab으로 포커스 이동 후
   Enter 또는 Space만으로 실행 가능하다(별도 키 핸들러 불필요).
4. 모든 state(§3.2)와 글자별 정오답(`--correct`/`--incorrect`/`--current`)은 색상만으로
   구분하지 않는다 — state는 화면 텍스트로, 글자 상태는 시각적 표식(예: 밑줄·굵기 차이)을
   색상과 함께 병행하는 것을 권장한다(비-frozen 구현 세부, 단 "색상만 의존 금지" 원칙은
   frozen).

### 3.5 반응형 (frozen)

1. **320px 폭**에서 `#typing-test-sentence`, `#typing-test-input`, 통계 영역
   (`.typing-test__stat` 그룹)이 가로 스크롤 없이 **세로로 순서대로 쌓인다**
   (`flex-direction: column` 또는 동등 구현).
2. **768px 이상**에서는 `#typing-test-timer`, `#typing-test-wpm`, `#typing-test-accuracy`
   3개 통계 항목이 `--space-control-gap`(`12px`) 간격을 두고 **가로 정렬**로 표시된다
   (`#typing-test-status`의 배치는 developer 재량, 단 320px 규칙은 유지).
3. 320px~767px 사이 모든 폭에서 content overflow(가로 스크롤)가 발생하지 않는다.

### 3.6 상태 후조건 / 복구 (frozen)

- 초기화·취소(진행 중 다시 시작)·완료 후 다시 시작 뒤에는 `state`와 진행 표시(타이머,
  WPM, 정확도, 글자별 정오답 표식)를 **초기값**(`idle`, `00:00`, `0 WPM`, `정확도 100%`,
  표식 없음)으로 되돌리고, 새 문장을 표시하며, `#typing-test-input`과
  `#typing-test-restart`가 **즉시 다시 사용 가능**해야 한다(비활성 고착 금지).

## 4. 로직 설계

### 4.1 문장 목록 (5개 이상, developer가 배열 상수로 구현)

```js
const SENTENCES = [
  "가을 하늘은 높고 파랗다",
  "타이핑 연습은 매일 조금씩 하는 것이 중요하다",
  "빠른 갈색 여우가 게으른 개를 뛰어넘는다",
  "오늘도 좋은 하루 되세요",
  "꾸준한 연습이 실력을 만든다",
  "커피 한 잔의 여유를 즐겨보세요",
];
```

- `idle` 진입(최초 로드, `#typing-test-restart` 클릭) 시 배열에서 무작위로 1개 선택한다.
- 문장이 2개 이상 남아있는 한 직전 문장과 동일한 문장이 연속으로 나오지 않도록 한다
  (비-frozen 권장, developer 재량).

### 4.2 WPM · 정확도 계산식

- `typedChars` = 현재 `#typing-test-input` 값의 길이(공백 포함, 최대 문장 길이로
  `maxlength` 제한 권장 — 오버타이핑 방지).
- `elapsedSeconds` = `(now - startTimestamp) / 1000`, `startTimestamp`는 첫 입력 keystroke
  시각(= `idle → running` 전이 시각). 0으로 나누기 방지를 위해 `elapsedSeconds < 1`이면
  `1`로 clamp.
- `elapsedMinutes = elapsedSeconds / 60`
- 매 입력 이벤트마다 처음부터 다시 비교하여(정정 반영) `correctChars`/`incorrectChars`를
  재계산한다:
  - `index < typedChars`인 각 글자: `input[index] === sentence[index]`이면 correct,
    아니면 incorrect로 카운트.
- **WPM(net)** = `round(max(0, (typedChars / 5) - incorrectChars) / elapsedMinutes)`
- **정확도(%)** = `typedChars === 0 ? 100 : round((correctChars / typedChars) * 100)`
- `running` 중 위 값을 매 입력 이벤트 + 주기적 타이머(예: 250ms interval, 타이머 표시
  갱신용)로 재계산해 `#typing-test-wpm`/`#typing-test-accuracy`/`#typing-test-timer`에
  반영한다. `finished` 전이 시점 값으로 고정한다.

### 4.3 실시간 오타 구분 로직

- `#typing-test-sentence`는 로드/재시작 시 문장의 각 글자를
  `<span class="typing-test__char">글자</span>`로 렌더링한다.
- 매 입력 이벤트마다 `index`를 0부터 `sentence.length - 1`까지 순회하며 modifier를
  갱신한다:
  - `index < typedChars` 이고 `input[index] === sentence[index]` → `--correct`
  - `index < typedChars` 이고 불일치 → `--incorrect`
  - `index === typedChars` (다음에 입력할 글자, 아직 `finished` 아님) → `--current`
  - 그 외(`index > typedChars`) → modifier 없음(미입력 기본 상태)
- `typedChars === sentence.length`가 되는 순간 `state=finished`로 전이하고, 마지막 글자
  이후 `--current` modifier는 부여하지 않는다(더 이상 다음 글자 없음).

### 4.4 런타임 상태 모델 (§0 명시대로 서버 API/영속 데이터 모델 없음 — 브라우저 메모리)

```js
{
  state: 'idle' | 'running' | 'finished',
  sentence: string,          // 현재 목표 문장
  startTimestamp: number|null,
  typedChars: number,
  correctChars: number,
  incorrectChars: number,
  wpm: number,
  accuracy: number,          // 0~100
}
```

## 5. edge case / 실패 케이스

| # | 상황 | 기대 동작 |
| --- | --- | --- |
| 1 | 입력 필드에 포커스 없이 페이지만 로드 | `state=idle` 유지, 타이머 시작 안 함 |
| 2 | `running` 중 문장 전체를 지우고(Ctrl+A, Delete) 다시 처음부터 입력 | `typedChars=0` 기준으로 재계산, `state`는 `running` 유지(이미 `startTimestamp` 존재) |
| 3 | `running` 중 `#typing-test-restart` 클릭(중도 취소) | §2.3대로 즉시 `idle` 복귀, 새 문장, 통계 초기화 |
| 4 | `finished` 상태에서 `#typing-test-input`에 추가 입력 시도(readonly 우회 등) | 무시(입력 반영 안 함), 상태 변화 없음 |
| 5 | 문장 마지막 글자가 오타여도 길이가 문장과 같아짐 | `finished` 전이(§3.2), 정확도는 100% 미만으로 표시 |
| 6 | 320px 폭에서 문장이 길어 여러 줄 필요 | `.typing-test__char`가 줄바꿈으로 자연 흡수, 가로 스크롤 없음(§3.5-1) |
| 7 | 키보드만 사용하는 사용자가 `#typing-test-restart`를 조작 | Tab 이동 후 Enter/Space로 실행 가능(§3.4-3) |
| 8 | 스크린리더 사용자가 `running` 진입/완료를 인지해야 함 | `aria-live="polite"` 4개 요소가 텍스트 변화를 알림(§3.4-2) |

## 6. Self-critique

| # | 점검 항목 | 결과 |
| --- | --- | --- |
| 1 | AC 매핑 | AC1(§0 단일 파일 제약 명시), AC2(§3 전체에 DOM ID/class/state별 텍스트/token/접근성/반응형 exact 값), AC3(§4.1 문장 6개, §4.2 WPM·정확도 계산식, §4.3 오타 구분 로직), AC4(§0 표에 frozen 파일·소유자·§3.6 후조건을 재정의 없이 서술, 신규 파일/역할 없음) 모두 충족. |
| 2 | frozen 재정의 여부 | §3의 모든 ID/class/token/state는 work packet frozen 목록과 1:1 일치, 신규 selector 추가 없음. |
| 3 | 범위 준수 | 본 문서 외 파일 생성/수정 없음. `docs/design/contract.md`/`typing-test.html`은 읽기 전용 참조로도 다루지 않고(신규 파일이라 존재하지 않음), 각각 designer/developer 몫으로 위임만 함. |
| 4 | 모호함 flag | `--current` 표식의 정확한 시각 형태(밑줄/배경 등)와 통계 그룹 wrapper 유무는 frozen selector가 아니므로 designer/developer 재량으로 명시(§3.4-4, §3.1). |

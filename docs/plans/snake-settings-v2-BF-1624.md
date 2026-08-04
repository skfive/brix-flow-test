# snake 설정 v1→v2 마이그레이션 명세 (BF-1627 / planning-contract@v1)

> 작성: 박기획 (planner)
> 산출물 경로: `docs/plans/snake-settings-v2-BF-1624.md`
> 근거 코드: `snake/logic.js` (SNAKE_SETTINGS_* 및 `validateAndMergeSettings`)
> 소비자: designer(BF-1625), developer(BF-1626), tester(BF-1629)

이 문서는 designer/developer 가 그대로 따를 v1→v2 마이그레이션 명세와 frozen UI 계약을
확정한다. 파일 소유권·상태 계약은 frozen Execution Blueprint 가 유일한 권위이며 본 문서는
그것을 재정의하지 않는다. 새 파일·새 역할을 추가하지 않는다.

---

## 1. 현재 v1 설정 코드 (근거)

`snake/logic.js` 에서 실제 확인한 현행 계약이다. **기존 7개 필드의 의미·허용 범위는 변경하지 않는다.**

### 1-1. 상수
- `SNAKE_SETTINGS_LS_KEY = "bf-snake-settings"` (localStorage 키) — 변경 없음
- `SNAKE_SETTINGS_SCHEMA_VERSION = 1` — v2 에서 `2` 로 상향

### 1-2. `SNAKE_SETTINGS_DEFAULTS` (v1, Object.freeze)
| 필드 | 기본값 | 타입 |
|---|---|---|
| `schemaVersion` | `1` | number |
| `difficulty` | `"normal"` | `"easy" \| "normal"` |
| `cpuCount` | `1` | `0..5` 정수 |
| `itemsEnabled` | `false` | boolean |
| `itemSpawnRate` | `0.5` | `0.0..1.0` |
| `multiplierEnabled` | `true` | boolean |
| `timeLimitSec` | `null` | `null \| 60..600` 정수 |
| `initialLength` | `3` | `3 \| 5 \| 7` |

### 1-3. `SNAKE_SETTINGS_LIMITS`
- `difficulty: ["easy", "normal"]`
- `cpuCount: [0, 1, 2, 3, 4, 5]`
- `itemSpawnRate: { min: 0.0, max: 1.0 }` (clamp)
- `timeLimitSec: { min: 60, max: 600 }` (clamp)
- `initialLength: [3, 5, 7]`

### 1-4. `validateAndMergeSettings(raw)` 현행 동작
1. `SNAKE_SETTINGS_DEFAULTS` 복사본에서 시작 → 모르는 필드는 무시.
2. `raw` 가 `null/undefined/non-object` 이면 기본값 그대로 반환.
3. 각 필드: 타입·범위 검증 후 유효하면 채택, 아니면 기본값 폴백(+`console.warn`). `itemSpawnRate`·`timeLimitSec` 는 범위 밖이면 clamp.
4. **미래 버전 처리(현행, logic.js:187–191)**: `raw.schemaVersion > 1` 이면 `console.info` 만 남기고 **알려진 필드만 추출** → `out.schemaVersion` 을 **무조건 `1` 로 재기록**. 즉 현행은 미래 버전을 v1 으로 **강등(정규화)** 한다.

> **핵심 충돌 지점**: 현행의 "미래 버전 → schemaVersion 강제 1" 동작은 v2 도입 후에도 그대로 두면 v2 데이터를 v1 으로 강등해 데이터 손실을 유발한다. §3 에서 이를 additive 하게 교정한다.

---

## 2. v2 데이터 모델 (additive)

기존 7개 필드는 **그대로 보존**하고, 신규 필드 2개만 additive 추가한다.

### 2-1. 신규 필드
| 필드 | 기본값 | 타입/허용값 | 대응 UI |
|---|---|---|---|
| `soundEnabled` | `true` | boolean | `settings-sound-toggle` (사운드 켜짐/꺼짐) |
| `controlScheme` | `"arrows"` | `"arrows" \| "wasd" \| "both"` | `settings-control-scheme` (방향키/WASD/둘 다) |

- 기본값 근거: `controlScheme="arrows"` 는 기존 게임의 방향키 조작 동작을 그대로 보존(behavior-preserving). `soundEnabled=true` 는 신규 기능 기본 노출값이며, 실제 사운드 자산 연결은 developer 재량(본 명세 범위는 설정값 계약까지).

### 2-2. v2 `SNAKE_SETTINGS_DEFAULTS` (목표)
```
{
  schemaVersion:     2,          // ← 1에서 상향
  difficulty:        "normal",
  cpuCount:          1,
  itemsEnabled:      false,
  itemSpawnRate:     0.5,
  multiplierEnabled: true,
  timeLimitSec:      null,
  initialLength:     3,
  soundEnabled:      true,        // ← 신규
  controlScheme:     "arrows",    // ← 신규
}
```

### 2-3. v2 `SNAKE_SETTINGS_LIMITS` 추가분
- `controlScheme: ["arrows", "wasd", "both"]`
- (`soundEnabled` 은 boolean 이라 별도 LIMITS 항목 불필요)

---

## 3. v1→v2 마이그레이션 명세

### 3-1. 원칙 (frozen invariant)
- **멱등(idempotent)**: 이미 v2 인 입력을 다시 마이그레이션해도 결과가 동일하다.
- **데이터 보존(no data loss)**: 저장된 유효한 필드 값은 절대 유실되지 않는다.
- **미래 버전 강등 금지**: `schemaVersion > 2` 인 입력을 v2 로 **정규화·강등하지 않는다**. 알려진 필드만 읽되 저장된 `schemaVersion` 은 그대로 **보존**한다(§3-3).

### 3-2. 마이그레이션 규칙 (버전별)
- **미저장 / `null` / non-object**: v2 기본값 전체 반환.
- **`schemaVersion` 없음 또는 `1` (v1 데이터)**:
  1. 기존 7개 필드는 §1-4 의 검증 규칙 그대로 병합(의미·범위 불변).
  2. `soundEnabled`·`controlScheme` 필드는 저장값이 없으므로 §2-1 기본값 주입.
  3. `schemaVersion` 을 `2` 로 상향.
- **`schemaVersion === 2` (v2 데이터)**: 9개 필드 전부 검증 병합. 신규 필드가 유효하면 채택, 아니면 기본값 폴백. 결과 `schemaVersion=2`. (멱등)
- **`schemaVersion > 2` (미래 버전)**: 알려진 9개 필드만 검증 병합하되 **`out.schemaVersion` 을 저장된 원본 값으로 보존**(강등 금지). `console.info` 로 미래 버전 경고만 남긴다.

### 3-3. 현행 코드와의 차이 (developer 필수 반영)
현행 `validateAndMergeSettings` 마지막 블록(logic.js:187–191)은
`out.schemaVersion = SNAKE_SETTINGS_SCHEMA_VERSION;` 로 **무조건 1(→2) 강제**한다.
v2 에서는 이 라인을 아래로 교정한다:
- 저장 `schemaVersion <= 2` (없음·1·2 포함): `out.schemaVersion = 2`.
- 저장 `schemaVersion > 2`: `out.schemaVersion = raw.schemaVersion` (원본 보존, 강등 금지).

> 이는 additive 교정이다. 기존 7개 필드 검증 로직·기본값·LIMITS 는 손대지 않는다.

---

## 4. Acceptance Criteria (Given/When/Then)

### AC-1 v1 데이터 마이그레이션
- **Given** localStorage 에 `{ difficulty:"easy", cpuCount:3 }` (schemaVersion 없음)
- **When** `validateAndMergeSettings` 호출
- **Then** 결과는 `difficulty:"easy"`, `cpuCount:3` 을 보존하고 나머지 5개 기존 필드는 기본값, `soundEnabled:true`, `controlScheme:"arrows"`, `schemaVersion:2`.

### AC-2 멱등성
- **Given** AC-1 의 결과 객체
- **When** `validateAndMergeSettings` 를 재호출
- **Then** 결과가 첫 호출과 **완전히 동일**(deep equal)하다.

### AC-3 v2 신규 필드 검증
- **Given** `{ schemaVersion:2, controlScheme:"wasd", soundEnabled:false }`
- **When** 호출
- **Then** `controlScheme:"wasd"`, `soundEnabled:false`, `schemaVersion:2` 유지.

### AC-4 신규 필드 잘못된 값 폴백
- **Given** `{ schemaVersion:2, controlScheme:"joystick", soundEnabled:"yes" }`
- **When** 호출
- **Then** `controlScheme:"arrows"`(기본값 폴백), `soundEnabled:true`(비boolean → 기본값), `console.warn` 발생.

### AC-5 미래 버전 강등 금지
- **Given** `{ schemaVersion:5, controlScheme:"both", difficulty:"easy" }`
- **When** 호출
- **Then** `controlScheme:"both"`, `difficulty:"easy"` 보존, **`schemaVersion:5` 그대로 보존**(2 로 강등 안 함), `console.info` 로그.

### AC-6 기존 필드 계약 불변
- **Given** 기존 7개 필드에 대한 §1 의 모든 검증·clamp·폴백 케이스
- **When** v2 코드로 호출
- **Then** 기존 7개 필드의 결과는 v1 과 동일하다(회귀 없음).

### AC-7 frozen gameover 계약 보존
- **Given** frozen `snake/tests/gameover-menu.test.js` 의 14개 테스트
- **When** v2 UI/코드 반영 후 실행
- **Then** 14개 테스트 전부 통과(preserve — 수정 금지).

---

## 5. Frozen UI 계약 (ui-contract@v1 — exact 동결)

designer·developer 는 아래 selector·token·값을 **변경·재정의하지 않는다**. gameover 메뉴 기존
계약을 훼손하지 않는 **additive** 확장이다.

### 5-1. 파일 및 소유자
| 파일 | 소유자 | artifact-policy |
|---|---|---|
| `docs/design/snake-settings-v2-BF-1624.md` | designer | additive |
| `docs/design/snake-settings-v2-mockup.html` | designer | additive |
| `snake/index.html` | developer | additive |
| `snake/logic.js` | developer | additive |
| `snake/snake.js` | developer | additive |
| `snake/styles.css` | developer | additive |
| `snake/tests/gameover-menu.test.js` | developer | **preserve** (수정 금지) |
| `snake/tests/migrate-settings.test.js` | developer | additive |

### 5-2. DOM ID (exact)
`settings-panel`, `settings-open-button`, `settings-sound-toggle`, `settings-control-scheme`

### 5-3. CSS class (exact)
`settings__field`, `settings__field--sound`, `settings__field--control`

### 5-4. 상태 (states, exact)
`settings-closed`, `settings-open`, `sound-enabled`, `sound-disabled`, `control-arrows`, `control-wasd`, `control-both`

### 5-5. Design token (값 포함, exact)
- `--snake-settings-field-gap: 12px`
- `--snake-control-active-fg: #2563eb`
- `--snake-toggle-on-bg: #16a34a`

### 5-6. 접근성 (exact)
- 사운드 토글(`settings-sound-toggle`)은 `aria-label="사운드"` 를 가진다.
- 조작 방식 컨트롤(`settings-control-scheme`)은 `aria-label="조작 방식"` 을 가진다.
- 설정 닫힘 후 `설정` 버튼(`settings-open-button`)으로 키보드 포커스가 복원된다.
- 각 상태는 색상 외에 화면 텍스트(사운드 켜짐/꺼짐, 조작 방식 방향키/WASD/둘 다)로 구분된다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 5-7. 반응형 (exact)
- 320px 이상에서 신규 설정 항목 2개가 overflow 없이 배치된다.
- 기존 게임 오버 메뉴 레이아웃은 320px 이상에서 유지된다.

---

## 6. Frozen 계약 충돌 지점 및 additive 처리 방침

frozen `snake/tests/gameover-menu.test.js`(14개 테스트)가 동결한 계약과의 충돌을 식별하고
additive 처리 방침을 명시한다.

| # | frozen 계약 (gameover-menu.test.js 근거) | 잠재 충돌 | additive 방침 |
|---|---|---|---|
| C1 | `.gameover-menu` 컨테이너 + `gameover-restart-btn`/`gameover-settings-btn` 두 버튼 존재(line 135–140) | 신규 설정 항목이 gameover 마크업을 변형 | 신규 UI 는 `settings-panel` 내부에만 추가. gameover 컨테이너·버튼 구조 불변. |
| C2 | aria-label `"다시하기 (Space)"`, `"설정 (S)"` exact(line 142–145) | 신규 aria-label 이 기존 것을 덮어씀 | 신규 aria-label(`사운드`,`조작 방식`)은 **신규 selector 에만** 부여. 기존 두 aria-label 은 그대로. |
| C3 | kbd 배지 `.gameover-btn__key` = Space/S(line 147–150) | 신규 키 배지 추가 시 기존 배지 매칭 훼손 | 신규 항목은 kbd 배지 계약을 재사용하지 않음. 기존 배지 텍스트 불변. |
| C4 | `settings-modal`/`window.openSettingsModal` 기존 핸들러 재사용, 닫힘 후 `gameover-settings-btn` 포커스 복원(line 57–100, 103–126) | 신규 `settings-open-button`·포커스 복원 배선이 기존 배선과 충돌 | 기존 `bootstrapGameOverMenu` 배선·`isAwaitingSettingsClose`/`notifySettingsClosed` 계약 **그대로 재사용**. 신규 항목은 설정 패널 내부 컨트롤로만 추가, 기존 open/close/focus 흐름에 얹는다. |
| C5 | go-score/go-item-stats/go-new-record/go-play-time/paused-overlay 보존(line 156–162) | 마크업 이동/삭제 | 신규 마크업은 이 요소들과 무관한 위치에 additive 삽입. 기존 id 전부 보존. |
| C6 | gameover design token(`--gameover-menu-gap:12px` 등)·`.gameover-btn` 반응형(line 165–178) | 신규 token 이 기존 token 재정의 | 신규 token 은 별도 이름(`--snake-settings-*`,`--snake-control-*`,`--snake-toggle-*`)으로만 추가. 기존 gameover token 불변. |
| C7 | 상태 초기화 계약: 취소·닫힘 후 주 실행 control 재사용 가능(포커스 복원) | 신규 설정 취소 시 상태 미복원 | 설정 닫힘/취소/실패 후 상태·진행 표시를 초기값으로 되돌리고 `settings-open-button` 으로 포커스 복원(§5-6). |

**총괄 방침**: gameover-menu 관련 파일/selector/token/핸들러는 전부 **preserve**. 신규 기능은
`settings-panel` 하위의 신규 selector/class/token/필드로만 additive 확장한다. frozen 14개
테스트는 수정하지 않으며 v2 반영 후에도 전부 통과해야 한다(AC-7).

---

## 7. Edge case / 실패 케이스

| EC | 입력 | 기대 |
|---|---|---|
| EC-1 | localStorage 파싱 실패(깨진 JSON) | v2 전체 기본값 반환, 예외 미전파 |
| EC-2 | `schemaVersion` 이 문자열 `"2"` | 숫자 아님 → 미래버전 분기 미진입, 알려진 필드 병합 후 `schemaVersion:2` |
| EC-3 | `controlScheme` 대소문자 `"ARROWS"` | 허용값 배열 미포함 → 기본값 `"arrows"` 폴백 + warn |
| EC-4 | `soundEnabled: null` | boolean 아님 → 기본값 `true` |
| EC-5 | v2 결과를 저장 후 재로드→재검증 | 멱등(AC-2), 데이터 보존 |
| EC-6 | 기존 7개 필드 범위 밖(예: `cpuCount:9`) | §1 규칙대로 기본값 폴백(회귀 없음, AC-6) |
| EC-7 | `schemaVersion` 이 `Infinity`/`NaN` | `> 2` 비교가 false(NaN) 또는 알려진 필드만 병합. NaN 은 미래버전 분기 미진입 → `schemaVersion:2`. Infinity 는 미래버전 → 원본 보존(§3-2 규칙 적용, 강등 금지) |

---

## 8. 후속 페르소나 인계 사항
- **designer(BF-1625)**: §5 exact 값으로 `docs/design/snake-settings-v2-BF-1624.md` + `docs/design/snake-settings-v2-mockup.html` 작성. gameover 시안 additive 확장, 기존 selector/token 재정의 금지.
- **developer(BF-1626)**: §2·§3 대로 `snake/logic.js` 의 defaults/limits/`validateAndMergeSettings` additive 수정 + §5 UI 반영. `snake/tests/gameover-menu.test.js` **수정 금지**, `snake/tests/migrate-settings.test.js` 신규 추가(AC-1~AC-6 커버).
- **tester(BF-1629)**: `node --test snake/tests/migrate-settings.test.js snake/tests/gameover-menu.test.js` 로 마이그레이션 + frozen 회귀 검증.

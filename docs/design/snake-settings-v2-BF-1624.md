# snake 설정 화면 신규 항목 시안 (v2) — BF-1625 / ui-contract@v1

> 작성: 이디자인 (designer)
> 1차 산출물(본 문서): `docs/design/snake-settings-v2-BF-1624.md`
> 2차 산출물(mockup): `docs/design/snake-settings-v2-mockup.html`
> 상위 계약: planner `docs/plans/snake-settings-v2-BF-1624.md` (planning-contract@v1 / ui-contract@v1)
> 기존 시각 언어 참조: `docs/design/mockups/snake-game-settings-BF-579.html` (BF-579 설정 모달)

이 문서는 설정 화면에 신규 2개 항목(**사운드 토글**, **조작 방식 선택**)을 **additive** 로
추가하기 위한 시각 명세다. planner 가 동결한 selector·token·상태·접근성 계약(§5 of the plan)을
**재정의하지 않고 그대로 구현**한다. 기존 게임 오버 메뉴 계약과 기존 설정 항목(난이도·적 지렁이
수·먹이·아이템·게임 시간)은 **변경하지 않는다**.

---

## 1. 시안 개요

### 1-1. 변경 범위 (additive only)
설정 패널(`settings-panel`) 내부에 신규 필드 2개를 **끝에 이어 붙인다**. 기존 필드·게임 오버
메뉴·HUD 는 마크업·selector·token 모두 불변.

| 신규 항목 | 컨트롤 유형 | frozen id | 기본값 | 상태 |
|---|---|---|---|---|
| 사운드 | 토글 스위치 (switch) | `settings-sound-toggle` | 켜짐(`soundEnabled=true`) | `sound-enabled` / `sound-disabled` |
| 조작 방식 | 3-선택 라디오 그룹 | `settings-control-scheme` | 방향키(`controlScheme="arrows"`) | `control-arrows` / `control-wasd` / `control-both` |

### 1-2. 사용자 경험 목표
- 플레이어가 설정 패널을 열어 **사운드 on/off** 와 **키보드 조작 방식**을 한 화면에서 조정한다.
- 두 항목 모두 **색상만으로 상태를 구분하지 않는다** — 항상 화면 텍스트(켜짐/꺼짐, 방향키/WASD/둘 다)를 함께 노출한다(색각 이상·저대비 환경 대응).
- 설정 패널을 닫으면 키보드 포커스가 **`설정` 진입 버튼(`settings-open-button`)** 으로 복원되어, 키보드 사용자가 흐름을 잃지 않는다.
- 신규 항목은 기존 필드와 동일한 row 리듬·spacing 을 따라 시각적으로 이질감이 없다.

### 1-3. non-goal (범위 밖)
- 런타임 HTML/CSS/JS 생성 (developer 담당: `snake/index.html`, `snake/styles.css`, `snake/snake.js`, `snake/logic.js`).
- 실제 사운드 자산 연결·오디오 재생 로직 (설정값 계약까지만).
- 기존 게임 오버 메뉴·기존 7개 설정 필드·HUD 의 시각/동작 변경.

---

## 2. 컬러 팔레트

### 2-1. frozen 신규 토큰 (값 변경 금지 — ui-contract@v1 §5-5)
planner 가 동결한 아래 3개 토큰을 **exact 값 그대로** 사용한다. 재정의·이름 변경 금지.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--snake-settings-field-gap` | `12px` | 신규 필드 간·필드 내부 요소 수직/수평 간격 |
| `--snake-control-active-fg` | `#2563eb` | 조작 방식 **선택된 옵션**의 전경색(텍스트/보더 강조) |
| `--snake-toggle-on-bg` | `#16a34a` | 사운드 토글 **켜짐** 상태의 트랙 배경색 |

> 참고: 위 두 색(`#2563eb` 파랑 / `#16a34a` 초록)은 기존 네온-그린 테마(`#4cff80`)와는
> 다른 표준 접근성 팔레트다. 이는 planner 가 신규 항목에 한해 동결한 값이므로 designer/developer
> 는 **변경하지 않는다**. 신규 필드에만 적용하며 기존 필드/HUD 토큰은 건드리지 않는다.

### 2-2. 기존(재사용) 팔레트 — 신규 필드 배경/구조에 사용, 변경 없음
| 토큰(기존) | 값 | 용도 |
|---|---|---|
| `--settings-modal-bg` | `#111` | 패널 배경 |
| `--settings-section-divider` | `rgba(255,255,255,0.10)` | 신규 필드 상단 divider |
| `--ctrl-label-text` | `#e0e0e0` | 필드 라벨 텍스트 |
| `--ctrl-value-text` | `#aaaaaa` | 상태 텍스트(꺼짐 등)·보조 설명 |
| `--ctrl-track-bg` | `rgba(255,255,255,0.10)` | 토글 off 트랙·라디오 미선택 배경 |
| `--sound-focus-ring` | `#4cff80` | focus-visible 링(기존과 동일 톤 유지) |

### 2-3. 상태별 색 매핑
| 상태 | 전경/배경 | 텍스트(색 외 구분) |
|---|---|---|
| `sound-enabled` | 트랙 `--snake-toggle-on-bg`(#16a34a), 텍스트 `#e0e0e0` | "켜짐" |
| `sound-disabled` | 트랙 `--ctrl-track-bg`, 텍스트 `--ctrl-value-text` | "꺼짐" |
| `control-arrows`(선택) | 전경 `--snake-control-active-fg`(#2563eb) + 보더 강조 | "방향키" (aria-pressed=true) |
| `control-wasd`(선택) | 전경 `--snake-control-active-fg`(#2563eb) + 보더 강조 | "WASD" (aria-pressed=true) |
| `control-both`(선택) | 전경 `--snake-control-active-fg`(#2563eb) + 보더 강조 | "둘 다" (aria-pressed=true) |
| 조작 방식 미선택 옵션 | 전경 `#e0e0e0`, 배경 `--ctrl-track-bg` | 각 라벨 (aria-pressed=false) |

---

## 3. 타이포그래피

기존 설정 모달과 동일 스택을 유지한다(vanilla-static: 외부 폰트 CDN 금지, 로컬 시스템 폰트만).

| 요소 | font-family | size | weight | line-height |
|---|---|---|---|---|
| 섹션 타이틀("조작") | `'Courier New', Courier, monospace` | 11px | 700 | 1.4 |
| 필드 라벨(사운드/조작 방식) | 동일 | 13px | 400 | 1.4 |
| 토글 상태 텍스트(켜짐/꺼짐) | 동일 | 12px | 700 | 1.2 |
| 라디오 옵션 텍스트(방향키/WASD/둘 다) | 동일 | 12px | 700 | 1.2 |
| 보조 설명(caption) | 동일 | 11px | 400 | 1.6 |

- 한글·영문 혼용 텍스트("방향키", "WASD")는 monospace 에서 폭이 달라도 라디오 버튼 min-width 로 정렬한다.

---

## 4. 레이아웃

### 4-1. 삽입 위치 (additive)
설정 패널(`settings-panel`) 본문에서 **기존 마지막 섹션 뒤에 신규 섹션 "조작"을 추가**하고,
그 안에 `사운드` 필드와 `조작 방식` 필드를 순서대로 배치한다.

```
settings-panel
├─ (기존) 게임 섹션 — 난이도 / 적 지렁이 수 / 시작 길이   ← 불변
├─ (기존) 먹이 섹션                                       ← 불변
├─ (기존) 아이템 섹션                                     ← 불변
├─ (기존) 게임 시간 섹션                                  ← 불변
└─ (신규) 조작 섹션  ★ additive
   ├─ .settings__field.settings__field--sound   → #settings-sound-toggle
   └─ .settings__field.settings__field--control → #settings-control-scheme
```

### 4-2. 필드 구조 · spacing
- 각 신규 필드는 `.settings__field` 를 기반 클래스로 갖고, 변형 클래스(`--sound` / `--control`)를 추가한다.
- 필드 내부 **라벨 ↔ 컨트롤**, 라디오 옵션 **버튼 간 간격**, 필드 **상하 간격**은 모두
  `--snake-settings-field-gap`(12px) 을 사용한다.
- 필드는 flex row: 왼쪽 라벨(고정폭 40%), 오른쪽 컨트롤. 320px 이하로 좁아지면 column 으로 접힌다(§4-3).

### 4-3. breakpoint 별 동작
| viewport | 필드 레이아웃 | 근거 |
|---|---|---|
| ≥ 480px (데스크톱) | 라벨(좌) + 컨트롤(우) 가로 배치 | 기존 모달 기본 |
| ≥ 320px 且 좁은 화면 | 필드가 column 으로 접힘(라벨 위, 컨트롤 아래). 라디오 3개는 wrap. **overflow 없음** | AC: 320px 이상 신규 2개 항목 overflow 없이 배치 |
| — | 조작 방식 라디오 옵션은 `flex-wrap: wrap` 으로 3개가 다음 줄로 흘러도 잘리지 않음 | 좁은 폭 대응 |

- 기존 게임 오버 메뉴 레이아웃은 320px 이상에서 **그대로 유지**된다(신규 마크업이 gameover 컨테이너 밖 `settings-panel` 내부에만 추가되므로 영향 없음).

---

## 5. 컴포넌트 명세

### 5-1. 사운드 토글 — `#settings-sound-toggle`
- **마크업 권장**: `<button id="settings-sound-toggle" role="switch" aria-checked="true" aria-label="사운드" class="settings__field ... ">`
  (실제 배선은 developer. 아래 props/상태 계약을 따른다.)
- **props / 데이터 바인딩**
  | prop | 값 | 설명 |
  |---|---|---|
  | `aria-label` | `"사운드"` (frozen, 고정) | 접근성 이름 |
  | `role` | `switch` | 토글 시맨틱 |
  | `aria-checked` | `"true"`(켜짐) / `"false"`(꺼짐) | `soundEnabled` 와 동기 |
  | 상태 텍스트 | `"켜짐"` / `"꺼짐"` | 색 외 구분 (화면에 항상 노출) |
- **상태**
  | 상태명 | aria-checked | 트랙 배경 | 화면 텍스트 |
  |---|---|---|---|
  | `sound-enabled` | true | `--snake-toggle-on-bg` (#16a34a) | 켜짐 |
  | `sound-disabled` | false | `--ctrl-track-bg` | 꺼짐 |
- **인터랙션**: 클릭/Space/Enter 로 토글 → `aria-checked` 반전 + 상태 텍스트 갱신 + 트랙 배경 전환. hover 시 트랙 명도 소폭 상승. `:focus-visible` 시 `--sound-focus-ring` 아웃라인.
- 기본값 **켜짐**(planner §2-1 `soundEnabled=true`).

### 5-2. 조작 방식 선택 — `#settings-control-scheme`
- **마크업 권장**: `<div id="settings-control-scheme" role="radiogroup" aria-label="조작 방식" class="settings__field settings__field--control">` 내부에 옵션 버튼 3개(`role="radio"` 또는 `aria-pressed` 토글 버튼).
- **props / 데이터 바인딩**
  | prop | 값 | 설명 |
  |---|---|---|
  | `aria-label` | `"조작 방식"` (frozen, 고정) | 그룹 접근성 이름 |
  | `role` | `radiogroup` | 단일 선택 그룹 |
  | 선택값 | `"arrows"` / `"wasd"` / `"both"` | `controlScheme` 와 동기 |
- **옵션 3종**
  | 옵션값 | 화면 텍스트 | 상태명 | 선택 시 표시 |
  |---|---|---|---|
  | `arrows` | 방향키 | `control-arrows` | 전경 #2563eb + 보더 강조, aria-pressed=true |
  | `wasd` | WASD | `control-wasd` | 동일 |
  | `both` | 둘 다 | `control-both` | 동일 |
- **인터랙션**: 옵션 클릭/화살표키 이동으로 단일 선택. 선택 옵션만 `aria-pressed="true"` + `--snake-control-active-fg` 전경. 미선택은 중립 배경. `:focus-visible` 아웃라인.
- 기본값 **방향키**(planner §2-1 `controlScheme="arrows"` — 기존 조작 동작 보존).
- **색 외 구분**: 선택 여부를 색만으로 표현하지 않는다 — 선택 옵션은 `aria-pressed="true"` + 보더 두께/전경 대비로 구분되며, 각 옵션 텍스트("방향키"/"WASD"/"둘 다")가 항상 노출된다.

### 5-3. 설정 진입 버튼 & 포커스 복원 — `#settings-open-button`
- 신규로 마크업을 재정의하지 않는다. **기존 진입 버튼(planner frozen `settings-open-button`)을 그대로 사용**한다.
- **포커스 복원 계약**: 설정 패널이 `settings-open` → `settings-closed` 로 전환(닫힘·취소·저장·Esc)될 때, 키보드 포커스를 **`settings-open-button` 으로 복원**한다.
  - 이는 기존 게임 오버 메뉴의 `notifySettingsClosed()` → `settingsBtn.focus()` 배선(`snake/tests/gameover-menu.test.js` line 72–86)과 **동일 계약**이며, developer 는 기존 배선을 재사용한다(신규 배선 추가 금지).

### 5-4. 패널 상태 — `#settings-panel`
| 상태명 | 설명 | 시각 |
|---|---|---|
| `settings-closed` | 패널 닫힘(기본) | 패널 비표시. 포커스는 `settings-open-button` 에 위치(복원 완료 상태 포함) |
| `settings-open` | 패널 열림 | 오버레이 + 패널 표시. 신규 "조작" 섹션 포함 전체 필드 노출 |

---

## 6. dev 구현 가이드 (developer BF-1626)

> 아래는 frozen selector/token/상태를 그대로 반영하기 위한 단계별 지침이다.
> **frozen 값은 변경 금지**. 기존 요소는 preserve.

1. **CSS 토큰 정의(styles.css, additive)** — `:root` 에 아래 3개 신규 토큰을 **exact 값**으로 추가. 기존 gameover/settings 토큰은 건드리지 않는다.
   ```css
   --snake-settings-field-gap: 12px;
   --snake-control-active-fg: #2563eb;
   --snake-toggle-on-bg: #16a34a;
   ```
2. **마크업(index.html, additive)** — 기존 `#settings-panel`(설정 모달/패널) 본문 **끝에** 신규 "조작" 섹션을 추가:
   - `<button id="settings-sound-toggle" role="switch" aria-checked="true" aria-label="사운드" class="settings__field settings__field--sound">` — 트랙 + thumb + 상태 텍스트("켜짐"/"꺼짐").
   - `<div id="settings-control-scheme" role="radiogroup" aria-label="조작 방식" class="settings__field settings__field--control">` — 옵션 버튼 3개(방향키/WASD/둘 다).
   - **기존 gameover 마크업**(`.gameover-menu`, `gameover-restart-btn`, `gameover-settings-btn`, `go-score`, `go-item-stats` 등)과 **기존 설정 필드**는 이동/삭제/변형하지 않는다.
3. **CSS 클래스(styles.css, additive)** — `.settings__field`(공통 row), `.settings__field--sound`, `.settings__field--control` 정의.
   - 간격은 전부 `var(--snake-settings-field-gap)`.
   - 사운드 켜짐: 트랙 배경 `var(--snake-toggle-on-bg)`.
   - 조작 방식 선택 옵션: 전경 `var(--snake-control-active-fg)`.
4. **상태 클래스/속성** — `aria-checked`(사운드), `aria-pressed`(조작 방식 옵션)로 상태 반영. CSS 는 이 속성 selector 로 스타일링(예: `#settings-sound-toggle[aria-checked="true"] .track { background: var(--snake-toggle-on-bg); }`).
5. **상태 텍스트 필수** — 사운드는 "켜짐"/"꺼짐", 조작 방식은 각 옵션 텍스트를 **항상 DOM 에 렌더**(색만으로 구분 금지).
6. **포커스 복원 배선(snake.js)** — 기존 `bootstrapGameOverMenu` / `notifySettingsClosed()` 흐름을 **재사용**하여 패널 닫힘 시 `settings-open-button` 으로 `focus()`. 신규 배선을 추가하지 않는다.
7. **반응형(styles.css, additive)** — 좁은 화면 media query 에서 `.settings__field` 를 column 으로 접고 조작 방식 라디오는 `flex-wrap: wrap`. 320px 이상에서 overflow 없음 확인.
8. **테스트** — `snake/tests/gameover-menu.test.js` **수정 금지**(preserve, 14개 통과 유지). 마이그레이션은 `snake/tests/migrate-settings.test.js` 로 별도(planner §8, developer 담당).

### 6-1. 권장 CSS 변수/클래스 요약
| 종류 | 이름 | 비고 |
|---|---|---|
| id | `settings-panel` / `settings-open-button` / `settings-sound-toggle` / `settings-control-scheme` | frozen exact |
| class | `settings__field` / `settings__field--sound` / `settings__field--control` | frozen exact |
| token | `--snake-settings-field-gap` / `--snake-control-active-fg` / `--snake-toggle-on-bg` | frozen exact 값 |

---

## 7. mockup 참조

- 파일: `docs/design/snake-settings-v2-mockup.html`
- 내용: 설정 패널 열림 상태에서 신규 "조작" 섹션(사운드 토글 + 조작 방식 3-선택)을 기존 필드와 함께 시각화. 아래 컷 포함
  1. 설정 패널 열림(`settings-open`) — 신규 필드 2개 포함 전체
  2. 사운드 토글 상태 비교(`sound-enabled` / `sound-disabled`)
  3. 조작 방식 상태 비교(`control-arrows` / `control-wasd` / `control-both`)
  4. 포커스 복원 흐름(`settings-open` → 닫힘 → `settings-open-button` 포커스) 다이어그램
  5. 320px 반응형 컷(신규 필드 column 접힘, overflow 없음)
  6. 신규 frozen 토큰 카탈로그
- mockup 은 dev 의 실제 산출물이 아니라 시안 시각화용이며, dev 는 참조 가이드로만 사용한다(픽셀 일치 의무 없음).

---

## 8. frozen 계약 준수 체크 (재정의 없음 선언)

| 항목 | frozen 값 | 본 시안 준수 |
|---|---|---|
| DOM id | settings-panel / settings-open-button / settings-sound-toggle / settings-control-scheme | ✅ 그대로 사용 |
| CSS class | settings__field / settings__field--sound / settings__field--control | ✅ 그대로 사용 |
| 상태 | settings-closed/-open, sound-enabled/-disabled, control-arrows/-wasd/-both | ✅ 전부 반영 |
| 토큰 값 | field-gap 12px / control-active-fg #2563eb / toggle-on-bg #16a34a | ✅ exact 값 |
| aria-label | 사운드 / 조작 방식 | ✅ exact |
| 포커스 복원 | 닫힘 후 settings-open-button | ✅ 명세(§5-3) |
| 색 외 텍스트 | 켜짐/꺼짐, 방향키/WASD/둘 다 | ✅ 항상 노출 |
| 반응형 | 320px+ overflow 없음, gameover 유지 | ✅ §4-3 |
| gameover 계약 | 버튼/aria-label/핸들러/점수·아이템 블록 | ✅ 불변(additive 배치) |

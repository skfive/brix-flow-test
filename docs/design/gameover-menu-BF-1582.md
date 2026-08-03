<!-- bf:primary-module:snake -->
# 게임 오버 메뉴 시각 명세 (Design Spec) · BF-1582

- 작성: 이디자인 (designer) · 본 task: BF-1583
- 대상 epic task: BF-1582 (게임 오버 메뉴) · primary module: `snake` · primary repo: `backend`
- 근거 실행 설계: `docs/plans/implementation-plan-BF-1582.md` (planner, BF-1585)
- 후속 페르소나: developer (BF-1584)

> 이 문서는 planner 가 동결한 `ui-contract@v1` / `planning-contract@v1` 을 **시각으로 구현**한 명세입니다.
> selector · CSS class · design token · 상태 · 접근성 · 반응형 계약을 **재정의하지 않고 그대로** 시각화합니다.
> 파일 소유권과 상태 계약은 frozen blueprint 가 유일 권위이며, 본 문서는 이를 재정의하지 않습니다 (additive).
> 신규 로직 · 신규 selector · 신규 token 을 만들지 않습니다.

> **revision (BF-1583 cycle):** 버튼의 시각값(base 배경 · hover 틴트 · focus 셀렉터 · token 스코프)을
> BF-1584 에서 실제 머지된 `snake/styles.css` 구현과 **동기화**했습니다 — base 배경 `transparent`,
> hover `rgba(…,0.12)`, `:focus` outline, token 은 `.gameover-menu` 스코프. frozen 계약 대상
> (selector · token 값 · 상태 · 접근성 · 반응형)은 **변경 없음**이며, 색상 틴트는 frozen 이 아니라
> 문서·구현 일치를 위한 정정입니다.

---

## 1. 시안 개요

### 변경 범위
기존 `#gameover-overlay` (게임 결과 화면) 하단에 **눈에 보이는 `다시하기` / `설정` 두 버튼**을 추가합니다.
버튼은 기존 `#paused-overlay` 의 `.paused-btn` + `<kbd>` 배지 패턴을 **시각적으로 재사용**하며,
기존 재시작·설정 핸들러(`doRestart()`, `openSettingsModal()`)를 그대로 호출하는 **순수 UI 추가**입니다.

### 보존 (변경 금지)
- 최종 점수 블록: `.go-score` (`#go-score` / `#go-cpu-score`), 신기록 배지 `#go-new-record`, 이전 최고점 `#go-prev-high-score`, 플레이 시간 `#go-play-time`
- 아이템 획득 현황 블록: `#go-item-stats` (`.go-item-list` 5종 아이템)
- 위 블록의 마크업 · 레이아웃 · 데이터는 **변경하지 않으며**, 버튼은 그 아래 `.gameover-menu` 컨테이너로 **추가**됩니다.

### 사용자 경험 목표
- 게임 오버 후 재시작 / 설정을 **키보드 없이도** (마우스 · 터치) 접근 가능하게 한다.
- 기존 단축키(`Space` = 다시하기, `S` = 설정)를 `<kbd>` 배지로 **화면에 명시**해 발견성을 높인다.
- 색상 외 텍스트 · `aria-label` 로 상태 의미를 전달해 접근성을 보장한다.

---

## 2. 컬러 팔레트

게임 오버 메뉴는 **기존 snake 팔레트를 그대로 사용**하며 신규 색상을 정의하지 않습니다.
`.paused-btn` 규약을 따르되, 게임 오버 컨텍스트의 시각 위계에 맞게 아래와 같이 매핑합니다.

| 역할 | 대상 | HEX / 값 | 출처 (기존 변수) |
| --- | --- | --- | --- |
| primary (다시하기) | `#gameover-restart-btn` 텍스트/보더 | `#4cff80` (green) | `.gameover-box` border · `--btn-resume-color` 계열 |
| primary bg (base) | `#gameover-restart-btn` 배경 | `transparent` (hover 시 `rgba(76,255,128,0.12)`) | `.paused-btn` base 투명 규약 |
| secondary (설정) | `#gameover-settings-btn` 텍스트/보더 | `#00cfff` (cyan) | `--btn-restart-color` (`.paused-btn` 재시작) |
| secondary bg (base) | `#gameover-settings-btn` 배경 | `transparent` (hover 시 `rgba(0,207,255,0.12)`) | `.paused-btn` base 투명 규약 |
| kbd 배지 배경 | `.gameover-btn__key` | `rgba(255, 255, 255, 0.12)` | `--btn-kbd-bg` |
| kbd 배지 보더 | `.gameover-btn__key` | `rgba(255, 255, 255, 0.25)` | `--btn-kbd-border` |
| overlay 배경 | `#gameover-overlay` (기존) | `#111` box / `rgba(0,0,0,·)` dim | `.gameover-box` |
| text | 점수/본문 (기존) | `#e0e0e0` | `.go-score` |
| accent (신기록) | `#go-new-record` (기존) | `#ffcc00` (gold) | `--go-new-record-color` |
| muted | 힌트/구분선 (기존) | `#888` / `rgba(255,255,255,0.10)` | `.go-hint` / `--go-section-divider` |

> **매핑 결정 (token 재정의 아님):** 다시하기 = 주 실행 control 이므로 오버레이 강조색인 green,
> 설정 = 보조 action 이므로 cyan 으로 위계를 준다. 두 색 모두 **기존 팔레트 값**이며 새 변수를 만들지 않는다.
> developer 는 픽셀 일치 의무 없이 `.paused-btn` focus outline 규약(`outline: 2px solid <색>; outline-offset: 2px`)을 따르면 된다.

---

## 3. 타이포그래피

기존 게임 UI 의 monospace 시스템을 그대로 따릅니다 (신규 폰트 없음).

| 요소 | font-family | size | weight | letter-spacing | line-height |
| --- | --- | --- | --- | --- | --- |
| 결과 타이틀 `#go-result` (기존) | 게임 기본 | 2.4rem | 700 | 2px | 기본 |
| 점수 `.go-score` (기존) | 게임 기본 | 1.4rem | 400 | 기본 | 기본 |
| 버튼 라벨 `.gameover-btn` | `'Courier New', Courier, monospace` | 14px | 700 | 1.5px | 1 |
| kbd 배지 `.gameover-btn__key` | `'Courier New', Courier, monospace` | 11px | 600 | 0.5px | 1 |
| 힌트 `.go-hint` (기존) | 게임 기본 | 1rem | 400 | 1px | 기본 |

> 버튼 · kbd 타이포는 `.paused-btn` / `.paused-btn kbd` 규약(14px/700/1.5px, 11px/600/0.5px)과 **동일**합니다.

---

## 4. 레이아웃

### 4-1. 섹션 구조 (위 → 아래, `#gameover-overlay` > `.gameover-box`)
```
[ #go-result        ] 결과 타이틀 (YOU WIN / GAME OVER)   ── 기존 보존
[ .go-score         ] PLAYER vs CPU 점수                  ── 기존 보존
[ #go-new-record    ] ★ 신기록! (신기록 시)               ── 기존 보존
[ #go-prev-high-score] 이전 최고 점수 (있을 때)            ── 기존 보존
[ #go-play-time     ] 플레이 시간                         ── 기존 보존
[ <hr .go-divider>  ] 구분선                              ── 기존 보존
[ #go-item-stats    ] 아이템 획득 현황 (5종)              ── 기존 보존
──────────────────────────────────────────────────
[ .gameover-menu    ] ▼▼ 신규 추가 ▼▼
   ├ #gameover-restart-btn   [ 다시하기  <kbd>Space</kbd> ]
   └ #gameover-settings-btn  [ 설정      <kbd>S</kbd>     ]
```
- `.go-hint` ("Press Space to restart") 는 버튼 추가로 정보가 중복되므로, dev 는 버튼과 힌트 중 시각 정리를 판단하되 **버튼은 반드시 힌트 위/아래로 `.gameover-menu` 안에 추가**한다. (힌트 마크업 자체는 additive 범위에서 보존 권장.)

### 4-2. spacing (frozen design token — exact)
| 변수 | 값 | 적용 |
| --- | --- | --- |
| `--gameover-menu-gap` | `12px` | `.gameover-menu` 내 버튼 간 gap |
| `--gameover-btn-padding` | `10px 20px` | `.gameover-btn` 내부 padding |
| `--gameover-btn-min-width` | `120px` | `.gameover-btn` 최소 너비 |

- `.gameover-menu` 는 `#go-item-stats` 아래에 **상단 여백**(예: `margin-top` 또는 구분)을 두어 통계 블록과 시각 분리.

### 4-3. breakpoint 별 동작
| 뷰포트 | `.gameover-menu` 배치 |
| --- | --- |
| 넓은 화면 (기본) | 두 버튼 **가로 나란히** (`flex-direction: row`), gap `12px`, `justify-content: center` |
| 좁은 화면 (≤ 약 360px) | 두 버튼 **세로 스택** (`flex-direction: column`), 각 버튼 full-width 이되 `min-width: 120px` 유지 |
| **320px 이상 (frozen)** | 버튼 2개가 **오버플로 없이** 배치된다. 세로로 접혀도 버튼 텍스트 · `kbd` 배지가 **잘리지 않는다**. |

> 권장: `.gameover-menu { display: flex; flex-wrap: wrap; }` + 좁을 때 `flex-direction: column`.
> `.gameover-btn { min-width: var(--gameover-btn-min-width); white-space: nowrap; }` 으로 텍스트 clip 방지.

---

## 5. 컴포넌트 명세

### 5-1. `.gameover-menu` (버튼 컨테이너, 신규)
| 항목 | 값 |
| --- | --- |
| 위치 | `#gameover-overlay` > `.gameover-box` 내부, `#go-item-stats` 아래 |
| display | `flex`, gap `var(--gameover-menu-gap)` (12px), `justify-content: center` |
| 반응형 | 넓은 화면 row / 좁은 화면 column (§4-3) |
| 상태 | 오버레이가 `gameover` 일 때만 렌더/포커스 대상. 오버레이 `hidden` 이면 버튼도 비노출 |

### 5-2. `#gameover-restart-btn` · `다시하기` (신규)
| 항목 | 값 |
| --- | --- |
| 태그 / class | `<button type="button" class="gameover-btn">` |
| 화면 텍스트 | `다시하기` + `<kbd class="gameover-btn__key">Space</kbd>` |
| `aria-label` (frozen) | `다시하기 (Space)` |
| padding / min-width | `var(--gameover-btn-padding)` (10px 20px) / `var(--gameover-btn-min-width)` (120px) |
| 색상 | text `#4cff80`, border `rgba(76,255,128,0.30)`, base bg `transparent` |
| interaction — hover | bg `rgba(76,255,128,0.12)` (텍스트 변화 없음) |
| interaction — focus | `outline: 2px solid #4cff80; outline-offset: 2px` (`.paused-btn` 규약) |
| interaction — active | `transform: scale(0.97)` (`.paused-btn:active` 규약) |
| 동작 (재사용) | 클릭 / `Enter` / `Space` → 기존 `doRestart()` 호출 → `restart-activated` (§6) |
| 키보드 | Tab 순서 포함, `Enter`/`Space` 로 활성화 |

### 5-3. `#gameover-settings-btn` · `설정` (신규)
| 항목 | 값 |
| --- | --- |
| 태그 / class | `<button type="button" class="gameover-btn">` |
| 화면 텍스트 | `설정` + `<kbd class="gameover-btn__key">S</kbd>` |
| `aria-label` (frozen) | `설정 (S)` |
| padding / min-width | `var(--gameover-btn-padding)` / `var(--gameover-btn-min-width)` |
| 색상 | text `#00cfff`, border `rgba(0,207,255,0.30)`, base bg `transparent` |
| interaction — hover | bg `rgba(0,207,255,0.12)` |
| interaction — focus | `outline: 2px solid #00cfff; outline-offset: 2px` |
| interaction — active | `transform: scale(0.97)` |
| 동작 (재사용) | 클릭 / `Enter` / `S` → 기존 `openSettingsModal()` 호출 → `settings-open` (§6) |
| 키보드 | Tab 순서 포함, `Enter`/`Space` 로 활성화 |

### 5-4. `.gameover-btn__key` (kbd 배지, 신규)
| 항목 | 값 |
| --- | --- |
| 태그 | `<kbd>` (버튼 라벨 안) |
| 배경 / 보더 | `rgba(255,255,255,0.12)` / `1px solid rgba(255,255,255,0.25)` |
| radius / padding | `4px` / `1px 5px` |
| typo | 11px / 600 / letter-spacing 0.5px, `margin-left: 8px` |
| 표기 | 다시하기 → `Space`, 설정 → `S` (`.paused-btn kbd` 규약과 동일) |

### 5-5. 상태 계약 (frozen states — 색상만으로 구분 금지)
| 상태 | 화면/동작 계약 | 화면 텍스트 · 접근성 이름 |
| --- | --- | --- |
| `gameover-idle` | 오버레이에 최종 점수·아이템 현황 + `다시하기`/`설정` 버튼 표시 | 버튼 라벨 텍스트 + `aria-label` 상시 노출 |
| `restart-activated` | 다시하기 실행 → 오버레이 숨김, 같은 설정으로 새 게임 시작 | `다시하기 (Space)` 활성화로 진입 |
| `settings-open` | 설정 모달 열림, 게임 오버 오버레이는 뒤에 유지 | `설정 (S)` 활성화로 진입 |
| `settings-closed` | 설정 모달 닫으면 포커스가 `#gameover-settings-btn` 로 복원, 오버레이 재활성 | 포커스 링(§5-3 focus)으로 위치 명시 |

> **후조건 불변식 (frozen):** 초기화·취소·실패 뒤에는 상태·진행 표시를 초기값으로 되돌리고
> 주 실행 control(`다시하기` 버튼)을 다시 사용할 수 있어야 한다.

---

## 6. dev 구현 가이드 (developer / BF-1584)

> 대상 파일: `snake/index.html` · `snake/snake.js` · `snake/tests/gameover-menu.test.js` (모두 **additive**).
> 아래는 권장 CSS 변수명 · 클래스명 · 배선이며, **selector/token 은 §2·§4-2·frozen 계약 그대로** 사용한다.

1. **마크업 추가 (`snake/index.html`)** — `#gameover-overlay` > `.gameover-box` 안, `#go-item-stats` 아래에:
   ```html
   <div class="gameover-menu">
     <button id="gameover-restart-btn" class="gameover-btn" type="button"
             aria-label="다시하기 (Space)">
       다시하기 <kbd class="gameover-btn__key">Space</kbd>
     </button>
     <button id="gameover-settings-btn" class="gameover-btn" type="button"
             aria-label="설정 (S)">
       설정 <kbd class="gameover-btn__key">S</kbd>
     </button>
   </div>
   ```
2. **CSS 토큰 (frozen 값 그대로)** — 아래는 BF-1584 에서 실제 머지된 `snake/styles.css` 구현과 **동기화된** 값입니다.
   token 은 `.gameover-menu` 스코프에 두어 전역 오염을 피하고, 버튼 base 배경은 `transparent` (hover 시에만 틴트):
   ```css
   .gameover-menu {
     --gameover-menu-gap: 12px;
     --gameover-btn-padding: 10px 20px;
     --gameover-btn-min-width: 120px;
     display: flex; flex-wrap: wrap; justify-content: center;
     gap: var(--gameover-menu-gap); margin-top: 20px;
     pointer-events: auto; /* overlay(pointer-events:none) 위에서 클릭 복원 */
   }
   .gameover-btn {
     padding: var(--gameover-btn-padding);
     min-width: var(--gameover-btn-min-width);
     white-space: nowrap; /* 텍스트 clip 방지 */
     font-family: 'Courier New', Courier, monospace;
     font-size: 14px; font-weight: 700; letter-spacing: 1.5px;
     border: 1px solid rgba(76,255,128,0.30); border-radius: 8px;
     background: transparent; color: #4cff80; cursor: pointer;
   }
   .gameover-btn:hover  { background: rgba(76,255,128,0.12); }
   .gameover-btn:active { transform: scale(0.97); }
   .gameover-btn:focus  { outline: 2px solid #4cff80; outline-offset: 2px; }
   #gameover-settings-btn { color: #00cfff; border-color: rgba(0,207,255,0.30); }
   #gameover-settings-btn:hover { background: rgba(0,207,255,0.12); }
   #gameover-settings-btn:focus { outline: 2px solid #00cfff; outline-offset: 2px; }
   .gameover-btn__key {
     display: inline-flex; align-items: center; padding: 1px 5px; margin-left: 8px;
     background: var(--btn-kbd-bg); border: 1px solid var(--btn-kbd-border);
     border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
   }
   @media (max-width: 360px) {
     .gameover-menu { flex-direction: column; align-items: stretch; }
     .gameover-btn { width: 100%; }
   }
   ```
3. **배선 (`snake/snake.js`, 기존 핸들러 재사용 — 신규 로직 금지)**:
   - `#gameover-restart-btn` click → 기존 재시작 진입점(`doRestart()`, 게임 오버 `Space` 분기와 동일 경로) 호출.
   - `#gameover-settings-btn` click → 기존 설정 진입점(`openSettingsModal()`, 게임 오버 `S` 분기와 동일 경로) 호출.
   - 설정 모달 닫힘 시 포커스를 `#gameover-settings-btn` 로 복원(AC-4 / `settings-closed`).
4. **edge case (실행 설계 §7 준수)**: 재시작 중 중복 입력은 기존 `state.status === "gameover"` 가드로 무시(EC-1), 설정 열림 중 게임 오버 단축키 비동작(EC-2), 취소/저장 어느 경로로 닫아도 포커스 복원(EC-3), 320px 세로 스택 시 clip 금지(EC-4), 색상 외 텍스트·aria 전달(EC-5), 오버레이 hidden 시 비노출(EC-6).
5. **보존 확인**: 점수 블록 · `#go-item-stats` 마크업/데이터 무변경, 버튼은 그 아래 추가만.

---

## 7. mockup 참조

- 시각 mockup HTML: **`docs/design/gameover-menu-mockup.html`** (frozen 계약이 지정한 정확 경로 — 본 명세와 함께 커밋).
- mockup 은 본 명세의 컬러 · 타이포 · 레이아웃 · 상태(hover/focus)를 정적으로 시각화하며, dev 의 실제 산출물이 아니라 **시안 시각 시뮬레이션**입니다. dev 는 참조 가이드로 사용하되 픽셀 일치 의무는 없습니다.
- 포함 시뮬레이션: (1) `gameover-idle` 기본, (2) hover/focus 상태, (3) 320px 좁은 화면 세로 스택.

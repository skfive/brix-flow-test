# 지렁이게임 설정 모달 시각 디자인 명세 — BF-579

> 작성자: [이디자인] · 작성일 2026-05-15
> 관련 티켓: BF-581 (designer task), BF-579 (부모 스토리), BF-580 (planner 명세)
> 기반 모듈: `snake/` (game.js / styles.css / index.html)
> 의존 명세: `docs/spec/snake-game-settings-BF-579.md` (UX·데이터·상태 전이 — planner 산출물), `docs/design/snake-hud-BF-558.md` (HUD 색상 토큰·모달 패턴), `docs/design/snake-sound-toggle-BF-565.md` (토글 토큰 패턴)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃·Spacing](#4-레이아웃spacing)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [dev 구현 가이드](#6-dev-구현-가이드)
7. [mockup 참조](#7-mockup-참조)
8. [Self-critique · AC 매핑 표](#8-self-critique--ac-매핑-표)

---

## 1. 시안 개요

### 1-1. 변경 범위

planner 명세(BF-580 §10)가 위임한 시각 요소를 모달 전체 디자인으로 완전히 명세화한다. 대상:

- 설정 모달(`#settings-modal`) — 다이얼로그 본체
- 모달 진입 버튼(`#settings-trigger`) — start screen / pause overlay 양쪽
- HUD 남은 시간 표시(`#hud-time-remaining`) — `timeLimitSec ≠ null` 일 때
- 의존 컨트롤 disabled 시각 표현

### 1-2. 사용자 경험 목표

| 목표 | 설명 |
|------|------|
| 게임 분위기 일관성 | 기존 HUD/일시정지 모달의 네온 그린 다크 톤을 유지 — 신규 색상 도입 최소화 |
| 입력 컴포넌트 직관성 | 항목 성격에 맞는 컨트롤 (이산값=라디오 / 연속값=슬라이더 / 토글=스위치) — 학습 비용 최소 |
| 의존 관계 즉시 인지 | `itemsEnabled` off 시 슬라이더가 회색 + cursor:not-allowed 로 즉시 표현 |
| 반응형 보장 | 데스크톱 480px 고정 모달 / 모바일 full-width(≤640px) — 슬라이더 터치 타겟 ≥ 44px |
| 키보드 접근성 | Tab 순환, Esc 닫기, focus-visible outline 명세 — 기존 `--sound-focus-ring` 패턴 재사용 |

### 1-3. 비범위(Out of Scope)

- 효과음 토글 UI — planner §5-3 결정에 따라 **모달 안에서는 안내 텍스트만 노출**(우상단 `#sound-toggle` 분리 유지)
- 격자 크기 / 테마 변경 — planner §1-3 비범위
- HUD 남은 시간의 색 변화(만료 임박 깜박임 등) — 본 시안은 기본 표시만 정의, 만료 임박 효과는 별도 후속 시안

---

## 2. 컬러 팔레트

### 2-1. 참조 토큰 (기존 — 변경 금지)

| 토큰명 | HEX / rgba | 출처 |
|--------|-----------|------|
| (배경) `body` | `#0d0d0d` | `styles.css` §14 |
| `--hud-panel-bg` | `rgba(0,0,0,0.45)` | `styles.css` §255 (BF-558) |
| `--hud-panel-border` | `rgba(76,255,128,0.22)` | `styles.css` §256 |
| `--hud-panel-text` | `#e0e0e0` | `styles.css` §257 |
| `--btn-resume-color` | `#4cff80` | 모달 액션 그린 (BF-558) |
| `--btn-restart-color` | `#00cfff` | 모달 액션 시안 (BF-558) |
| `--btn-quit-color` | `#ff6b4c` | 모달 액션 레드 (BF-558) |
| `--sound-focus-ring` | `#4cff80` | focus-visible outline (BF-565) |

> **원칙**: 기존 패널/모달 톤 100% 재사용. 새 색을 도입하지 않음.

### 2-2. 신규 토큰 — 설정 모달 배경·구조

| CSS 변수명 | HEX / rgba | 용도 |
|-----------|-----------|------|
| `--settings-overlay-bg` | `rgba(0,0,0,0.72)` | 모달 뒤 dim — 기존 `#gameover-overlay` 와 동일 톤 |
| `--settings-modal-bg` | `#111` | 모달 본체 배경 — 기존 `.paused-box` / `.gameover-box` 동일 |
| `--settings-modal-border` | `rgba(76,255,128,0.30)` | 모달 외곽선 — 그린 중채도 (HUD 그린 계열 정합) |
| `--settings-modal-shadow` | `0 0 30px rgba(76,255,128,0.25)` | 모달 글로우 — paused-box(0.3) 보다 약간 약화하여 정보 밀집 모달 가독성 우선 |
| `--settings-section-divider` | `rgba(255,255,255,0.10)` | 섹션(먹이/아이템/시간) 구분선 — `--go-section-divider` 재사용 |
| `--settings-section-title` | `rgba(255,255,255,0.40)` | 섹션 라벨 색 — `--go-muted-text` 재사용 |

### 2-3. 신규 토큰 — 컨트롤 (라디오/슬라이더/토글)

| CSS 변수명 | HEX / rgba | 용도 |
|-----------|-----------|------|
| `--ctrl-track-bg` | `rgba(255,255,255,0.10)` | 슬라이더 트랙 배경 / 라디오 그룹 배경 |
| `--ctrl-track-fill` | `#4cff80` | 슬라이더 채워진 부분 — 플레이어 그린 |
| `--ctrl-thumb` | `#4cff80` | 슬라이더 thumb / 라디오 선택 점 |
| `--ctrl-thumb-glow` | `0 0 6px rgba(76,255,128,0.55)` | thumb 글로우 — `--sound-on-text-shadow` 패턴 |
| `--ctrl-border` | `rgba(76,255,128,0.25)` | 라디오/토글 미선택 테두리 |
| `--ctrl-border-active` | `rgba(76,255,128,0.55)` | 라디오/토글 선택 테두리 |
| `--ctrl-disabled-opacity` | `0.35` | disabled 상태 전체 투명도 |
| `--ctrl-label-text` | `#e0e0e0` | 항목 라벨 텍스트 — `--hud-panel-text` 재사용 |
| `--ctrl-value-text` | `#aaaaaa` | 슬라이더 현재 값 표시 |
| `--ctrl-hover-bg` | `rgba(76,255,128,0.08)` | 라디오/토글 hover 시 셀 배경 |

### 2-4. 신규 토큰 — 액션 버튼

기존 `.paused-btn` 패턴(BF-558 §5-2) 100% 재사용. 추가 신규 토큰 없음.

- `[저장]` → `--btn-resume-color` (그린) + `--btn-resume-bg` / `--btn-resume-hover-bg`
- `[취소]` → `--btn-quit-color` (레드) + `--btn-quit-bg` / `--btn-quit-hover-bg`
- `[기본값 복원]` → `--btn-restart-color` (시안) + `--btn-restart-bg` / `--btn-restart-hover-bg`

> 색상 의미가 paused 모달과 정확히 일치 — 사용자 학습 비용 0.

### 2-5. 신규 토큰 — 설정 진입 버튼 (⚙)

| CSS 변수명 | HEX / rgba | 용도 |
|-----------|-----------|------|
| `--settings-trigger-bg` | `rgba(0,0,0,0.45)` | 기본 배경 — `--sound-off-bg` 재사용 (중립 톤) |
| `--settings-trigger-border` | `rgba(255,255,255,0.15)` | 기본 테두리 — `--sound-off-border` 재사용 |
| `--settings-trigger-hover-bg` | `rgba(76,255,128,0.18)` | hover — 그린 저채도 (활성 가능성 암시) |
| `--settings-trigger-hover-border` | `rgba(76,255,128,0.35)` | hover 테두리 |

> 평소엔 중립(검은+화이트), hover 시 그린으로 — `#sound-toggle` 와 시각 무게 유사하게.

### 2-6. 신규 토큰 — HUD 남은 시간 표시

| CSS 변수명 | HEX / rgba | 용도 |
|-----------|-----------|------|
| `--hud-time-label` | `rgba(255,255,255,0.50)` | "남은 시간" 라벨 — `--hud-panel-label` 재사용 |
| `--hud-time-value` | `#e0e0e0` | mm:ss 텍스트 — `--hud-panel-text` 재사용 |

> 별도 색상 토큰 없이 기존 HUD 패턴 그대로. 만료 임박 효과는 본 시안 비범위.

---

## 3. 타이포그래피

### 3-1. font-family

| 영역 | 값 | 비고 |
|------|----|----|
| 전 모듈 | `'Courier New', Courier, monospace` | 기존 `styles.css` §19 — 변경 금지 |

### 3-2. 모달 내 텍스트 위계

| 요소 | font-size | font-weight | letter-spacing | line-height |
|------|-----------|-------------|----------------|-------------|
| 모달 타이틀 (`<h2>` "게임 설정") | `1.4rem` | `700` | `3px` | `1.2` |
| 섹션 라벨 ("먹이"/"아이템"/"게임 시간") | `11px` | `400` | `2px` | `1.4` (uppercase) |
| 컨트롤 라벨 ("난이도"/"적 지렁이 수") | `13px` | `400` | `0.5px` | `1.4` |
| 라디오/토글 텍스트 ("easy"/"normal") | `12px` | `700` | `0.5px` | `1.0` |
| 슬라이더 현재 값 (예: `0.5`) | `12px` | `700` | `0` | `1.0` |
| 도움말 텍스트 (예: "곧 추가 예정") | `10px` | `400` | `0.5px` | `1.4` |
| 액션 버튼 텍스트 ("저장"/"취소") | `14px` | `700` | `1.5px` | `1.0` |

> 위계 근거: `.paused-btn`(14px·700·1.5px) / `.hud-status-label`(11px·400·1px) / `.go-item-section-title`(11px·400·2px·uppercase) 와 정확히 정렬.

### 3-3. HUD 남은 시간

| 요소 | font-size | font-weight | letter-spacing |
|------|-----------|-------------|----------------|
| "남은 시간" 라벨 | `11px` | `400` | `1px` |
| `mm:ss` 값 | `14px` | `700` | `0` |

> `#hud-status-panel` 의 `.hud-status-label` / `.hud-status-value` 와 동일.

---

## 4. 레이아웃·Spacing

### 4-1. 모달 크기 (반응형)

| viewport | 모달 width | 모달 max-height | overflow |
|----------|-----------|----------------|---------|
| ≥ 641px (데스크톱) | `480px` (고정) | `calc(100vh - 80px)` | 본체 overflow-y: auto |
| ≤ 640px (모바일) | `calc(100vw - 32px)` (max 480px) | `calc(100vh - 64px)` | 본체 overflow-y: auto |

- 가로 중앙·세로 중앙 정렬 (`inset:0; display:flex; align-items:center; justify-content:center`)
- 모달 본체 `border-radius: 12px` (paused-box 동일)
- padding 내부: `24px 28px` (데스크톱) / `20px 20px` (모바일 — 가로폭 부족 대응)

### 4-2. 모달 내부 수직 spacing

```
┌─────────────────────────────────────┐
│  [헤더 영역 — padding-bottom: 16px] │
│   <h2>게임 설정</h2>      [×]      │  ← 타이틀 + 닫기 X
├─── divider: border-top 1px ────────┤
│  [본문 영역 — overflow-y: auto]    │
│   gap between 컨트롤 row: 14px     │
│   섹션 간 추가 여백: 12px           │
│   섹션 divider: border-top 1px      │
├─── divider: border-top 1px ────────┤
│  [액션 영역 — padding-top: 16px]   │
│   gap between 버튼: 8px            │
│   [기본값 복원]   [취소] [저장]    │  ← 좌측 1 + 우측 2 정렬
└─────────────────────────────────────┘
```

### 4-3. 컨트롤 row 구조 (기본)

```
┌─[ control-row ]──────────────────────┐
│  [label 영역 — width 40%]            │
│  "난이도"                            │
│                                       │
│  [control 영역 — flex: 1]            │
│  [ easy ][ normal ]                   │
└──────────────────────────────────────┘
```

- 데스크톱: `display: flex; gap: 12px; align-items: center`
- 모바일(≤ 640px): `flex-direction: column; align-items: stretch; gap: 6px` — 라벨 위, 컨트롤 아래

### 4-4. 진입 버튼 위치

| 진입 경로 | 셀렉터 | 위치 |
|-----------|--------|------|
| start screen / gameover overlay | `#settings-trigger` (`<button>`) | `position: fixed; top: 16px; right: 60px;` — `#sound-toggle`(right: 20px) 와 8px 간격 |
| pause overlay 내부 | `#paused-btn-settings` (`<button>`) — `.paused-btn` 클래스 재사용 | `.paused-btn-container` 의 4번째 버튼 (resume → restart → settings → quit) |

> HUD 영역과 겹치지 않도록 `#settings-trigger` 는 `#sound-toggle` 왼쪽에 배치. 모바일 ≤ 480px 에서는 right: 60px 유지(`#sound-toggle` 동일하게 fixed 유지).

### 4-5. HUD 남은 시간 표시 위치

`#hud-status-panel` 내부에 3번째 row 추가 (길이·속도 다음). `timeLimitSec === null` 일 때는 row 자체 hidden.

```
[hud-status-panel]
  길이  3
  속도  ●●○
  남은 시간  04:23
```

### 4-6. 터치 타겟 최소 크기 (모바일)

| 컴포넌트 | 최소 크기 |
|----------|----------|
| 슬라이더 thumb | `20×20px` (실제 hit area 40×40 — `::-webkit-slider-thumb` margin 으로 확장) |
| 라디오 옵션 셀 | `min-height: 44px` |
| 토글 스위치 | `48×28px` (thumb 24×24) |
| 액션 버튼 | `min-height: 44px` (데스크톱 40px → 모바일 44px) |
| 닫기(×) | `40×40px` (hit area), 아이콘은 20px |

---

## 5. 컴포넌트 명세

### 5-1. 항목별 컴포넌트 매핑

| planner 항목 (BF-580 §2-1) | 타입 | 선택한 컴포넌트 | 근거 |
|---------------------------|------|----------------|------|
| `difficulty` | enum (2값) | **라디오 그룹 (버튼식)** | 이산값 2개 — select 보다 한눈에 비교 가능 |
| `cpuCount` | integer (0/1/2) | **라디오 그룹 (버튼식)** + `2` 옵션 disabled | 이산값 3개 — 라디오로 즉시 비교 |
| `itemsEnabled` | boolean | **토글 스위치** | on/off 의미 — 토글이 가장 직관적 |
| `itemSpawnRate` | number (0.0~1.0, step 0.1) | **슬라이더** + 현재 값 표시 | 연속값(11단계) — 슬라이더 적합 |
| `multiplierEnabled` | boolean | **토글 스위치** | 동일 |
| `timeLimitSec` | integer \| null | **라디오 그룹 (5프리셋)** + "직접 입력" 토글 → 숫자 입력 | 프리셋 우선 노출 + 고급 사용자용 입력 |
| `initialLength` | integer (3/5/7) | **라디오 그룹 (버튼식)** | 이산값 3개 |

### 5-2. 라디오 그룹 (버튼식) — `.ctrl-radio-group`

```html
<div class="ctrl-radio-group" role="radiogroup" aria-label="난이도">
  <button type="button" class="ctrl-radio" aria-pressed="false" data-value="easy">easy</button>
  <button type="button" class="ctrl-radio" aria-pressed="true"  data-value="normal">normal</button>
</div>
```

| 상태 | 시각 표현 |
|------|----------|
| 미선택 (`aria-pressed="false"`) | 배경 `--ctrl-track-bg`, 테두리 `--ctrl-border`, 텍스트 `--hud-panel-text` |
| 선택 (`aria-pressed="true"`) | 배경 `rgba(76,255,128,0.18)`, 테두리 `--ctrl-border-active`, 텍스트 `#4cff80`, text-shadow `0 0 6px rgba(76,255,128,0.40)` |
| hover (미선택) | 배경 `--ctrl-hover-bg` |
| focus-visible | outline `2px solid var(--sound-focus-ring)`, offset `3px` |
| disabled (예: cpuCount=2) | opacity `--ctrl-disabled-opacity`, cursor `not-allowed`, hover/focus 무반응 |

- padding: `8px 14px` (데스크톱) / `10px 16px` (모바일 — 44px 터치 확보)
- border-radius: `6px`
- 그룹 내 옵션 gap: `6px`
- 컨테이너: `display: inline-flex; flex-wrap: wrap`

### 5-3. 토글 스위치 — `.ctrl-toggle`

```html
<button type="button" class="ctrl-toggle" role="switch" aria-checked="false">
  <span class="ctrl-toggle-track" aria-hidden="true">
    <span class="ctrl-toggle-thumb"></span>
  </span>
  <span class="ctrl-toggle-text">off</span>
</button>
```

| 상태 | 시각 표현 |
|------|----------|
| off (`aria-checked="false"`) | track `--ctrl-track-bg`, thumb 좌측, 텍스트 `--ctrl-value-text` "off" |
| on (`aria-checked="true"`) | track `rgba(76,255,128,0.30)`, thumb 우측 `--ctrl-thumb`, box-shadow `--ctrl-thumb-glow`, 텍스트 `#4cff80` "on" |
| hover | track 배경 살짝 밝아짐 (off→0.15, on→0.40) |
| focus-visible | outline `2px solid var(--sound-focus-ring)`, offset `3px` |

- 트랙: `width: 48px; height: 24px; border-radius: 12px`
- 썸: `width: 18px; height: 18px; border-radius: 50%; margin: 3px; transition: transform 0.18s ease`
- on 상태 thumb `transform: translateX(24px)`
- 텍스트는 트랙 우측 8px 간격

### 5-4. 슬라이더 — `.ctrl-slider`

기본은 `<input type="range">` 사용 + CSS 커스터마이즈.

```html
<div class="ctrl-slider">
  <input type="range" min="0" max="10" step="1" value="5" aria-label="아이템 등장 확률">
  <span class="ctrl-slider-value">0.5</span>
</div>
```

> step 은 `0.1` 단위지만 UI 입력 값은 `0..10` 정수 + 화면 표시 시 `(value/10).toFixed(1)` 매핑 (정밀도 이슈 회피).

| 영역 | 시각 |
|------|------|
| 트랙 | `height: 6px; background: --ctrl-track-bg; border-radius: 3px` |
| 채워진 부분 | gradient 또는 `::before` 로 채움 색 `--ctrl-track-fill` (`width: calc(value% * track)`) |
| thumb | `width: 18px; height: 18px; background: --ctrl-thumb; border-radius: 50%; box-shadow: --ctrl-thumb-glow` |
| hover thumb | `box-shadow: 0 0 10px rgba(76,255,128,0.80)` |
| focus-visible thumb | outline `2px solid #4cff80`, offset `2px` |
| disabled | 컨테이너 전체 opacity `--ctrl-disabled-opacity`, cursor `not-allowed`, pointer-events `none` |

- 현재 값 표시: 슬라이더 우측 `min-width: 32px; text-align: right; color: --ctrl-value-text`
- 모바일에서 트랙 height 8px, thumb 22×22px (터치 확보)

### 5-5. 시간 제한 컨트롤 (특수)

라디오 그룹 + 직접 입력 토글의 복합. planner §2-2 의 "무제한/1분/3분/5분/10분" 프리셋 + 수치 입력.

```html
<div class="ctrl-time-limit">
  <div class="ctrl-radio-group" role="radiogroup" aria-label="시간 제한">
    <button class="ctrl-radio" aria-pressed="true"  data-value="null">무제한</button>
    <button class="ctrl-radio" aria-pressed="false" data-value="60">1분</button>
    <button class="ctrl-radio" aria-pressed="false" data-value="180">3분</button>
    <button class="ctrl-radio" aria-pressed="false" data-value="300">5분</button>
    <button class="ctrl-radio" aria-pressed="false" data-value="600">10분</button>
    <button class="ctrl-radio ctrl-radio-custom" aria-pressed="false" data-value="custom">직접 입력</button>
  </div>
  <div class="ctrl-time-custom" hidden>
    <input type="number" min="60" max="600" step="10" value="120" aria-label="제한 시간(초)">
    <span class="ctrl-time-custom-unit">초</span>
  </div>
</div>
```

- "직접 입력" 라디오 선택 시 `<div class="ctrl-time-custom">` 의 `hidden` 해제 + 다른 라디오의 `aria-pressed` 모두 false
- 숫자 입력: `width: 88px; padding: 8px 10px; background: --ctrl-track-bg; border: 1px solid --ctrl-border; color: --hud-panel-text; border-radius: 6px`
- 모바일에서 라디오 그룹 `flex-wrap: wrap` 으로 2~3줄로 떨어짐 허용

### 5-6. 액션 버튼 — `.settings-btn`

기존 `.paused-btn` 패턴 100% 재사용 (BF-558 §5-2). 클래스명만 분리해 polluton 회피.

```html
<div class="settings-btn-bar">
  <button class="settings-btn settings-btn-reset" type="button">기본값 복원</button>
  <div class="settings-btn-bar-spacer"></div>
  <button class="settings-btn settings-btn-cancel" type="button">취소 <kbd>Esc</kbd></button>
  <button class="settings-btn settings-btn-save"   type="button">저장 <kbd>Enter</kbd></button>
</div>
```

- 좌측 1 (기본값 복원) + spacer(flex:1) + 우측 2 (취소 / 저장)
- 너비: 데스크톱 auto + min-width `100px`, 모바일은 전체 row 가 wrap → 우측 2개가 한 줄, 기본값 복원이 윗줄
- 색상 매핑: §2-4 참조

### 5-7. 닫기 버튼 (×)

```html
<button class="settings-close" type="button" aria-label="설정 닫기">×</button>
```

- 위치: 헤더 우측 끝, `position: absolute; top: 12px; right: 12px`
- 크기: `40×40px` (hit area), 아이콘 글자 `font-size: 22px`
- 색상: 기본 `--ctrl-value-text` (#aaa), hover `#e0e0e0`, focus-visible outline 그린

### 5-8. 설정 진입 버튼 — `#settings-trigger`

```html
<button id="settings-trigger" type="button" aria-label="게임 설정 열기">⚙</button>
```

- 위치: §4-4
- 크기: `32×32px`, padding 6px (#sound-toggle 동일)
- font-size: `18px`
- 기본 배경 `--settings-trigger-bg`, 테두리 `--settings-trigger-border`, border-radius `8px`
- hover: 배경 `--settings-trigger-hover-bg`, 테두리 `--settings-trigger-hover-border`
- focus-visible: outline `2px solid #4cff80`, offset `3px`
- 게임 진행 중(`state.status === "playing"`)에는 `disabled` 속성 + `opacity: 0.35`, pointer-events none (planner §3-1)

### 5-9. 의존 컨트롤 disabled 표현

planner §2-3 의 의존: `itemsEnabled = false` → `itemSpawnRate` disabled.

- 슬라이더 row 전체 (`.ctrl-row[data-disabled="true"]`) 에:
  - 라벨 opacity `--ctrl-disabled-opacity`
  - 슬라이더 자체 pointer-events none + opacity `--ctrl-disabled-opacity`
  - cursor not-allowed
  - aria-disabled="true" 속성 부여
- 값 텍스트는 회색 유지 (사용자가 어떤 값인지 알아볼 수 있게)

### 5-10. cpuCount=2 비활성 시각 표현

planner §6-4 의 "곧 추가 예정" 처리.

- 해당 라디오 버튼만 `disabled` + `aria-disabled="true"`
- opacity `--ctrl-disabled-opacity`
- 텍스트는 "2" 뒤에 작은 별표 `*` (font-size 9px, color #aaa, vertical-align: super)
- hover/focus 시 툴팁(`<span class="ctrl-tooltip">곧 추가 예정</span>`) 표시 — `title` 속성 폴백 포함

### 5-11. 진입/퇴장 애니메이션

- 모달 본체: `animation: modal-enter 0.20s ease-out forwards` (BF-558 §6-1 의 `@keyframes modal-enter` 재사용 — `opacity 0→1, scale 0.92→1`)
- 오버레이 dim: `animation: fade-in 0.15s ease-out forwards`
- 닫기 시 inline transition `opacity` 0.12s 후 `display:none` (CSS 만으로 가능 — `dialog::backdrop` 활용 시 더 단순. 본 시안은 `<div>` 기반 권장 — `<dialog>` 는 iOS 호환 이슈)

### 5-12. HUD 남은 시간 row (`#hud-time-remaining`)

```html
<div class="hud-status-row" id="hud-time-remaining" hidden>
  <span class="hud-status-label">남은 시간</span>
  <span class="hud-status-value" id="hud-time-value">--:--</span>
</div>
```

- `timeLimitSec === null` → `hidden` 속성 유지
- `timeLimitSec` 정수 → `hidden` 제거, `mm:ss` 포맷으로 업데이트
- 색상 변화(임박 깜박임 등)는 본 시안 비범위

---

## 6. dev 구현 가이드

### 6-1. 신규 CSS 변수 (정의 위치)

`snake/styles.css` 최하단 `:root` 블록에 추가 (기존 `:root` 들과 동일 패턴).

```css
/* ─── 설정 모달 — BF-579 §2 ────────────────────────────── */
:root {
  /* 모달 구조 */
  --settings-overlay-bg:      rgba(0, 0, 0, 0.72);
  --settings-modal-bg:        #111;
  --settings-modal-border:    rgba(76, 255, 128, 0.30);
  --settings-modal-shadow:    0 0 30px rgba(76, 255, 128, 0.25);
  --settings-section-divider: rgba(255, 255, 255, 0.10);
  --settings-section-title:   rgba(255, 255, 255, 0.40);

  /* 컨트롤 (라디오/슬라이더/토글) */
  --ctrl-track-bg:           rgba(255, 255, 255, 0.10);
  --ctrl-track-fill:         #4cff80;
  --ctrl-thumb:              #4cff80;
  --ctrl-thumb-glow:         0 0 6px rgba(76, 255, 128, 0.55);
  --ctrl-border:             rgba(76, 255, 128, 0.25);
  --ctrl-border-active:      rgba(76, 255, 128, 0.55);
  --ctrl-disabled-opacity:   0.35;
  --ctrl-label-text:         #e0e0e0;
  --ctrl-value-text:         #aaaaaa;
  --ctrl-hover-bg:           rgba(76, 255, 128, 0.08);

  /* 진입 버튼 */
  --settings-trigger-bg:           rgba(0, 0, 0, 0.45);
  --settings-trigger-border:       rgba(255, 255, 255, 0.15);
  --settings-trigger-hover-bg:     rgba(76, 255, 128, 0.18);
  --settings-trigger-hover-border: rgba(76, 255, 128, 0.35);
}
```

### 6-2. HTML 마크업 추가 (snake/index.html)

`#paused-overlay` 뒤에 다음 블록 추가:

```html
<!-- ⚙ 설정 진입 버튼 — BF-579 (start screen / gameover overlay 에서 노출) -->
<button id="settings-trigger" type="button" aria-label="게임 설정 열기">⚙</button>

<!-- 설정 모달 — BF-579 -->
<div id="settings-modal" hidden role="dialog" aria-modal="true" aria-labelledby="settings-title">
  <div class="settings-modal-overlay"></div>
  <div class="settings-modal-box">
    <header class="settings-header">
      <h2 id="settings-title" class="settings-title">게임 설정</h2>
      <button class="settings-close" type="button" aria-label="설정 닫기">×</button>
    </header>

    <div class="settings-body">
      <!-- 게임 -->
      <div class="settings-section">
        <div class="ctrl-row">
          <span class="ctrl-label">난이도</span>
          <div class="ctrl-radio-group" role="radiogroup" aria-label="난이도" data-key="difficulty">
            <button class="ctrl-radio" data-value="easy"   aria-pressed="false">easy</button>
            <button class="ctrl-radio" data-value="normal" aria-pressed="true">normal</button>
          </div>
        </div>
        <div class="ctrl-row">
          <span class="ctrl-label">적 지렁이 수</span>
          <div class="ctrl-radio-group" role="radiogroup" aria-label="적 지렁이 수" data-key="cpuCount">
            <button class="ctrl-radio" data-value="0" aria-pressed="false">0</button>
            <button class="ctrl-radio" data-value="1" aria-pressed="true">1</button>
            <button class="ctrl-radio" data-value="2" aria-pressed="false" disabled aria-disabled="true" title="곧 추가 예정">2<sup>*</sup></button>
          </div>
        </div>
        <div class="ctrl-row">
          <span class="ctrl-label">시작 지렁이 길이</span>
          <div class="ctrl-radio-group" role="radiogroup" aria-label="시작 지렁이 길이" data-key="initialLength">
            <button class="ctrl-radio" data-value="3" aria-pressed="true">3</button>
            <button class="ctrl-radio" data-value="5" aria-pressed="false">5</button>
            <button class="ctrl-radio" data-value="7" aria-pressed="false">7</button>
          </div>
        </div>
      </div>

      <!-- 먹이 -->
      <div class="settings-section">
        <p class="settings-section-title">먹이</p>
        <div class="ctrl-row">
          <span class="ctrl-label">배수 먹이 등장</span>
          <button class="ctrl-toggle" role="switch" aria-checked="true" data-key="multiplierEnabled">
            <span class="ctrl-toggle-track" aria-hidden="true"><span class="ctrl-toggle-thumb"></span></span>
            <span class="ctrl-toggle-text">on</span>
          </button>
        </div>
      </div>

      <!-- 아이템 -->
      <div class="settings-section">
        <p class="settings-section-title">아이템</p>
        <div class="ctrl-row">
          <span class="ctrl-label">아이템 등장</span>
          <button class="ctrl-toggle" role="switch" aria-checked="false" data-key="itemsEnabled">
            <span class="ctrl-toggle-track" aria-hidden="true"><span class="ctrl-toggle-thumb"></span></span>
            <span class="ctrl-toggle-text">off</span>
          </button>
        </div>
        <div class="ctrl-row" data-disabled="true">
          <span class="ctrl-label">등장 확률</span>
          <div class="ctrl-slider">
            <input type="range" min="0" max="10" step="1" value="5" aria-label="아이템 등장 확률" data-key="itemSpawnRate">
            <span class="ctrl-slider-value">0.5</span>
          </div>
        </div>
      </div>

      <!-- 게임 시간 -->
      <div class="settings-section">
        <p class="settings-section-title">게임 시간</p>
        <div class="ctrl-row">
          <span class="ctrl-label">시간 제한</span>
          <div class="ctrl-time-limit">
            <div class="ctrl-radio-group" role="radiogroup" aria-label="시간 제한" data-key="timeLimitSec">
              <button class="ctrl-radio" data-value="null" aria-pressed="true">무제한</button>
              <button class="ctrl-radio" data-value="60"   aria-pressed="false">1분</button>
              <button class="ctrl-radio" data-value="180"  aria-pressed="false">3분</button>
              <button class="ctrl-radio" data-value="300"  aria-pressed="false">5분</button>
              <button class="ctrl-radio" data-value="600"  aria-pressed="false">10분</button>
              <button class="ctrl-radio ctrl-radio-custom" data-value="custom" aria-pressed="false">직접 입력</button>
            </div>
            <div class="ctrl-time-custom" hidden>
              <input type="number" min="60" max="600" step="10" value="120" aria-label="제한 시간(초)">
              <span class="ctrl-time-custom-unit">초</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 효과음 안내 (planner §5-3 결정에 따라 안내만) -->
      <div class="settings-section">
        <p class="settings-section-note">효과음은 화면 우상단 🔊 버튼으로 변경하세요.</p>
      </div>
    </div>

    <footer class="settings-btn-bar">
      <button class="settings-btn settings-btn-reset" type="button">기본값 복원</button>
      <div class="settings-btn-bar-spacer"></div>
      <button class="settings-btn settings-btn-cancel" type="button">취소 <kbd>Esc</kbd></button>
      <button class="settings-btn settings-btn-save"   type="button">저장 <kbd>Enter</kbd></button>
    </footer>
  </div>
</div>
```

### 6-3. 일시정지 모달에 "설정" 버튼 추가

기존 `.paused-btn-container` 에 4번째 버튼 삽입 (resume → restart → **settings** → quit):

```html
<button id="paused-btn-settings" class="paused-btn" type="button">설정 <kbd>S</kbd></button>
```

- 색상: 시안(`--btn-restart-*`) 또는 별도 토큰. 본 시안은 **레스타트와 구분**을 위해 paused 컬러 그룹 중 미사용 색을 권장 → BF-558 토큰에 없으므로 dev 가 임시로 `--btn-restart-*` 재사용해도 OK, 단 시각 혼동 회피 위해 우상단 ⚙ 진입을 권장.

### 6-4. HUD 상태 패널에 row 추가

`#hud-status-panel` 내부 3번째 row:

```html
<div class="hud-status-row" id="hud-time-remaining" hidden>
  <span class="hud-status-label">남은 시간</span>
  <span class="hud-status-value" id="hud-time-value">--:--</span>
</div>
```

dev 가 game.js 에서 매 tick `timeLimitSec - elapsedSec` 을 `mm:ss` 로 포맷하여 갱신. `null` 이면 `hidden` 유지.

### 6-5. CSS 구현 핵심 (요약)

각 selector 별 핵심 속성만 (mockup HTML 의 인라인 `<style>` 이 더 정확한 참조 — §7).

| Selector | 핵심 속성 |
|----------|----------|
| `#settings-modal` | `position: fixed; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center` |
| `.settings-modal-overlay` | `position: absolute; inset: 0; background: var(--settings-overlay-bg); animation: fade-in 0.15s ease-out` |
| `.settings-modal-box` | `position: relative; background: var(--settings-modal-bg); border: 1px solid var(--settings-modal-border); border-radius: 12px; box-shadow: var(--settings-modal-shadow); width: 480px; max-height: calc(100vh - 80px); display: flex; flex-direction: column; animation: modal-enter 0.20s ease-out` |
| `.settings-body` | `flex: 1; overflow-y: auto; padding: 0 28px` |
| `.ctrl-row` | `display: flex; gap: 12px; align-items: center; padding: 8px 0` |
| `@media (max-width: 640px)` | `.settings-modal-box { width: calc(100vw - 32px) }`, `.ctrl-row { flex-direction: column; align-items: stretch }` |

### 6-6. JS 인터랙션 가이드 (dev 위임 — 본 시안은 시각만)

planner §3, §4 의 상태 머신을 따라:
- `#settings-trigger` 클릭 → `#settings-modal` `hidden` 제거 + `draftSettings ← appliedSettings` 캡처
- 컨트롤 변경 → `draftSettings` 갱신 + 의존 컨트롤 `[data-disabled]` 토글
- `.settings-btn-save` 클릭 → planner §3-3 저장 흐름
- Esc 키 → `.settings-btn-cancel` 동일
- `state.status === "playing"` → `#settings-trigger` `disabled` 속성 부여

### 6-7. 회귀 가드

기존 컴포넌트에 영향 X 확인:
- `#sound-toggle` 위치(top:16px, right:20px) 미변경 — `#settings-trigger` 가 right:60px 로 왼쪽 배치
- `#hud-status-panel` 의 기존 2개 row(길이/속도) 마크업 미변경 — 3번째 row 추가만
- `.paused-btn-container` 의 기존 3개 버튼 미변경 — settings 버튼은 선택적 추가(권장은 ⚙ 진입)

---

## 7. mockup 참조

시각 시뮬레이션 산출물: **`docs/design/mockups/snake-game-settings-BF-579.html`**

mockup 구성:
1. 모달 닫힌 상태(start screen) — `#settings-trigger` 위치 시각화
2. 모달 열린 상태(데스크톱 480px) — 전체 컨트롤 노출
3. 의존 컨트롤 disabled (itemsEnabled=off 일 때 슬라이더 회색) 비교 컷
4. HUD 남은 시간 row 표시 컷
5. 모바일 viewport 시뮬레이션 (≤ 640px 가로폭에서 모달 layout 변화)
6. 컬러 토큰 + 컴포넌트 상태 변형 카탈로그(라디오/슬라이더/토글 hover·focus·disabled)

> mockup HTML 은 외부 의존성 0건 (vanilla CSS, system font + Courier New). 단일 self-contained 파일.

---

## 8. Self-critique · AC 매핑 표

### 8-1. AC 매핑

| AC (epic / task) | 본 시안 충족 섹션 |
|------------------|------------------|
| **AC1** — 설정 모달이 모든 항목을 적절한 입력 컴포넌트로 표시하고 mockup 에서 확인 가능 | §5-1 (항목별 매핑 표), §5-2~§5-7 (컴포넌트 상세), §7 (mockup HTML 모달 열린 상태) |
| **AC2** — 디자인 토큰 정합성: 색상·폰트·spacing 이 기존 module 규약과 일치하거나 신규 토큰이 명세에 정의 | §2-1 (기존 토큰 재사용 매핑), §2-2~§2-6 (신규 토큰 정의), §3 (타이포 — 기존 .paused-btn / .hud-status-* 와 정렬) |
| **AC3** — 모바일·데스크톱에서 반응형으로 깨짐 없이 동작 | §4-1 (viewport 별 width/max-height), §4-3 (모바일 column layout), §4-6 (터치 타겟), §5-4 모바일 thumb 확대, §7 (mockup 의 모바일 viewport 컷) |

### 8-2. Self-critique 체크리스트

1. **AC 매핑** — §8-1 표로 AC1/2/3 각각 정확히 어느 섹션이 충족하는지 명시. ✅
2. **dev 구현 가이드** — §6 에 신규 CSS 변수 정의, HTML 마크업 전체, selector 별 핵심 속성, 회귀 가드까지 포함. dev 가 시안 보지 않고 markdown 만으로도 90% 구현 가능. ✅
3. **기존 요소 보존** — §6-7 회귀 가드에 `#sound-toggle` / `#hud-status-panel` / `.paused-btn-container` 보존 명시. ✅
4. **컴포넌트 매핑** — §5-1 표로 planner §2-1 의 7개 항목 → 시각 컴포넌트 1:1 매핑 + 선택 근거. ✅
5. **모호함 flag** —
   - planner §3-1 의 "S 키 단축키" 와 본 시안 §6-3 의 paused 모달 "설정 <kbd>S</kbd>" 버튼이 동일 키 사용 — dev 가 단축키 충돌 없도록 핸들러 통합 필요(설정 모달이 열릴 때만 S 키 핸들러 활성).
   - paused 모달에 "설정" 버튼을 추가할지(§6-3) vs 우상단 ⚙ 만 쓸지 — 본 시안은 **⚙ 진입 우선 권장** (paused 모달의 색상 토큰 4번째가 미정의이므로). 운영자 결정 사항.
   - cpuCount=2 의 "곧 추가 예정" 툴팁(§5-10) — 현재는 `title` 속성 폴백 + `<span class="ctrl-tooltip">` 권장. 정확한 툴팁 컴포넌트가 module 에 없어 dev 가 간단 구현(hover 시 absolute positioned `<span>`)을 그대로 사용해도 됨.

### 8-3. 다음 페르소나에게 (dev-1)

| 항목 | 결정 |
|------|------|
| 컬러 토큰은 §6-1 의 CSS 변수 블록을 `snake/styles.css` 의 가장 마지막 `:root` 블록 뒤에 그대로 붙여 추가 |
| HTML 마크업은 §6-2 의 블록을 `snake/index.html` 의 `#paused-overlay` 뒤에 그대로 삽입 |
| 슬라이더 `value/10` 매핑은 dev 가 game.js 에서 처리 — 본 시안은 정수 0~10 입력값을 표준으로 함 |
| 모달 진입 단축키 S 와 paused 모달 "설정" 버튼은 dev 가 통합 결정 (본 시안 권장: ⚙ 진입만, 단축키는 planner 명세 그대로) |
| 신기능과 무관한 회귀 가드(§6-7)는 PR 에서 자동 검증 안 됨 → dev 가 수동 확인 |

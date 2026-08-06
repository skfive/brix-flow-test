# Phaser 엔드리스 러너 — UI 계약 시각 명세 (Frozen Contract Visual Spec)

- **작업**: BF-1758 (designer) · 의존 BF-1762 (branch `chore/BF-1762-phaser-ui`)
- **권위 원본**: [`docs/plans/BF-1716/implementation-plan.md`](../docs/plans/BF-1716/implementation-plan.md) (planner frozen blueprint)
- **역할**: 이 문서는 동결된 토큰·상태·selector·접근성·반응형 계약을 **눈으로 확인 가능하게 정리한 시각 명세**다. 계약을 **재정의하지 않으며**, selector·token·상태·파일 소유권을 그대로 반영한다.
- **런타임 산출물 아님**: 이 문서는 HTML/CSS/JS를 생성하지 않는다. `design-tokens.html`·`design-mockup.html`·`index.html`·`src/**`·`tests/**` 는 **developer(BF-1760)** 가 이 명세를 구현한다.

> 이 명세와 frozen blueprint가 충돌하면 blueprint가 유일한 권위다. designer는 selector/token/상태를 변경하지 않는다.

---

## 1. 실행 방법 (정적 서버)

- **빌드 스텝 없음** — `vanilla-static`, ESM, `serve_root=.` 기준 root-relative 정적 서빙.
- **Phaser 3는 CDN 로드** — 번들러/npm 의존성 추가 없이 `<script>` CDN 태그로 로드.

```bash
# phaser-endless-runner/ 가 있는 저장소 루트에서
npx serve .
#   → http://localhost:3000/phaser-endless-runner/index.html            (게임)
#   → http://localhost:3000/phaser-endless-runner/design-tokens.html    (토큰 참조 시트)
#   → http://localhost:3000/phaser-endless-runner/design-mockup.html     (4개 상태 목업)
```

> 두 시각 시트(`design-tokens.html`, `design-mockup.html`)는 정적 서버로 열면 **그 자체로 렌더링**되며 외부 의존성이 없어야 한다(토큰 CSS는 인라인 `:root` 선언).

---

## 2. 조작법 (Controls)

| 조작 | 키 / 입력 | 결과 |
| --- | --- | --- |
| 점프 | `Space`, `ArrowUp` | 지면(ground) 장애물 회피 |
| 숙이기 | `ArrowDown` | 공중(air) 장애물 회피 |
| 게임 시작 | `start-button` 클릭 | `start` → `playing` |
| 재개 | `resume-button` 클릭 | `paused` → `playing` |
| 재시작 | `restart-button` 클릭 | `gameover` → 초기값 복원 후 재개 |

> 모든 주 실행 control(start/resume/restart)은 마우스/터치 클릭과 명시적 `aria-label`을 함께 제공한다.

---

## 3. 파일 구조 (동결 — additive)

| 경로 | 소유자 | 설명 |
| --- | --- | --- |
| `phaser-endless-runner/README.md` | **designer (본 문서)** | 실행 방법·조작법·UI 계약 시각 명세 |
| `phaser-endless-runner/design-tokens.html` | developer | 디자인 토큰 참조 시트(색상/타이포/스페이싱 시각화) |
| `phaser-endless-runner/design-mockup.html` | developer | 정적 UI 목업(4개 상태 오버레이 레이아웃) |
| `phaser-endless-runner/index.html` | developer | 진입점 — Phaser CDN 로드, DOM 컨테이너, 토큰 CSS |
| `phaser-endless-runner/src/game-logic.js` | developer | 순수 게임 로직(렌더링 비의존, RNG 주입) |
| `phaser-endless-runner/src/main.js` | developer | Phaser scene·렌더링·입력 바인딩 |
| `phaser-endless-runner/tests/game-logic.test.js` | developer | 순수 로직 단위 테스트 |

---

## 4. 컬러 팔레트 (동결 — exact 값)

각 색상은 반드시 `:root` CSS custom property로 선언하고, 견본/컴포넌트는 그 변수를 **실제 참조**한다(하드코딩 금지).

| 토큰 | HEX | 역할 | 견본 |
| --- | --- | --- | :---: |
| `--color-bg-top` | `#0b1120` | 배경 그라디언트 상단 (밤하늘) | `▓▓▓` |
| `--color-bg-bottom` | `#1e293b` | 배경 그라디언트 하단 | `▓▓▓` |
| `--color-ground` | `#334155` | 지면 바닥 | `▓▓▓` |
| `--color-player` | `#38bdf8` | 플레이어 캐릭터 | `▓▓▓` |
| `--color-obstacle-ground` | `#f43f5e` | 지면 장애물 (점프로 회피) | `▓▓▓` |
| `--color-obstacle-air` | `#a855f7` | 공중 장애물 (숙이기로 회피) | `▓▓▓` |
| `--color-accent` | `#fbbf24` | 강조 — 점수/버튼/타이틀 하이라이트 | `▓▓▓` |
| `--color-text` | `#f8fafc` | 기본 텍스트 (오버레이/HUD) | `▓▓▓` |

**배경 그라디언트**: `linear-gradient(180deg, var(--color-bg-top) 0%, var(--color-bg-bottom) 100%)`
**대비**: `--color-text(#f8fafc)` 는 `--color-bg-top(#0b1120)` 위에서 명암비 ≈ 17:1 로 WCAG AAA 만족. `--color-accent` 는 배경 대비 시각 강조 전용이며 본문 텍스트로는 사용하지 않는다.

---

## 5. 타이포그래피 (동결)

| 용도 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| 오버레이 타이틀 (`runner__title`) | system-ui / sans-serif stack | `var(--font-size-title)` = **48px** | `var(--font-weight-bold)` = **700** | 1.1 |
| HUD 수치 (`hud-*`) | system-ui / sans-serif stack | `var(--font-size-hud)` = **20px** | 400–700 | 1.3 |
| 버튼 라벨 (`runner__button`) | system-ui / sans-serif stack | `var(--font-size-hud)` = **20px** | `var(--font-weight-bold)` = **700** | 1.2 |
| 보조/설명 텍스트 | system-ui / sans-serif stack | 14–16px | 400 | 1.4 |

- **font-family**: 외부 의존성 0건을 위해 system font stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`) 사용. 웹폰트 CDN 불필요.
- frozen 토큰은 `--font-size-title`, `--font-size-hud`, `--font-weight-bold` **3개만** 정의한다. 보조 텍스트 크기는 토큰이 아닌 로컬 값으로 처리하되 신규 토큰을 만들지 않는다(계약 재정의 금지).

---

## 6. 스페이싱 · 반경 · elevation 토큰 (동결)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--space-sm` | `8px` | 인접 요소 간 최소 간격 (HUD 항목 내부) |
| `--space-md` | `16px` | 패널 패딩, 버튼 상하 간격 |
| `--space-lg` | `24px` | 오버레이 패널 외곽 여백, 섹션 간 간격 |
| `--radius-panel` | `12px` | 오버레이 패널(`runner__panel`) 모서리 반경 |

> **elevation(그림자) 정책**: frozen 토큰 집합에는 **shadow 토큰이 정의되어 있지 않다.** 계약을 재정의하지 않기 위해 신규 shadow 토큰을 만들지 않으며, 패널의 층위감은 `--radius-panel` + 반투명 오버레이 배경(예: `rgba(11,17,32,0.85)`)의 **배경 대비**로만 표현한다.

---

## 7. 컴포넌트 · selector 명세 (동결 — 이 id/class만 사용)

### 7.1 DOM ID

| ID | 소속 상태 | 용도 |
| --- | --- | --- |
| `game-root` | 전체 | Phaser 캔버스가 마운트되는 루트 컨테이너 |
| `hud-score` | playing | 현재 점수 표시 |
| `hud-distance` | playing | 진행 거리 표시 |
| `hud-highscore` | playing | 최고 점수 표시 |
| `start-overlay` | start | 시작 상태 오버레이 |
| `start-button` | start | 게임 시작 control (`aria-label` 필수) |
| `pause-overlay` | paused | 일시정지 상태 오버레이 |
| `resume-button` | paused | 재개 control (`aria-label` 필수) |
| `gameover-overlay` | gameover | 게임오버 오버레이 (`role="alert"`) |
| `gameover-score` | gameover | 최종 점수 표시 |
| `restart-button` | gameover | 재시작 control (`aria-label` 필수) |

### 7.2 CSS class (정확히 이 class만)

`runner`, `runner__hud`, `runner__overlay`, `runner__panel`, `runner__title`, `runner__button`

| class | 역할 | 주요 토큰 |
| --- | --- | --- |
| `runner` | 게임 전체 래퍼 (배경 그라디언트, 종횡비 유지) | `--color-bg-top`, `--color-bg-bottom` |
| `runner__hud` | 상단 HUD 바 (score/distance/highscore) | `--font-size-hud`, `--space-sm`, `--color-text`, `--color-accent` |
| `runner__overlay` | 상태별 전체 덮개 (중앙 정렬) | 반투명 배경 |
| `runner__panel` | 오버레이 내부 카드 | `--radius-panel`, `--space-lg`, `--color-text` |
| `runner__title` | 오버레이 대제목 | `--font-size-title`, `--font-weight-bold`, `--color-accent` |
| `runner__button` | 주 실행 control 버튼 | `--color-accent`, `--font-weight-bold`, `--radius-panel`, `--space-md` |

### 7.3 버튼 상태(interaction) 명세

| 상태 | 시각 표현 |
| --- | --- |
| 기본 | 배경 `--color-accent`, 텍스트 `--color-bg-top`, 반경 `--radius-panel` |
| `:hover` | 밝기 +8% (배경 lighten), 커서 pointer |
| `:focus-visible` | `--color-player` 2px outline (키보드 포커스 가시화) |
| `:active` | 밝기 -6% (눌림 피드백) |

---

## 8. 레이아웃 · 4개 상태 (동결)

상태 흐름: `start → playing → paused → gameover`. 각 상태는 **색상만이 아니라 화면 텍스트**로 구분되며, 상태명이 접근성 이름(텍스트/`aria`)으로 노출된다.

```
┌──────────────────────────────────────────┐  ← .runner  (배경 그라디언트, 고정 종횡비)
│  [SCORE 0]   [DIST 0m]   [HIGH 0]         │  ← .runner__hud  (상단 바, playing에서 노출)
│                                            │
│         ┌────────────────────┐             │  ← #game-root (Phaser 캔버스 자리표시)
│         │ .runner__overlay   │             │
│         │  ┌──────────────┐  │             │
│         │  │ .runner__panel│ │             │  ← 상태별 오버레이 패널
│         │  │  TITLE(48px) │  │             │
│         │  │  설명 텍스트  │  │             │
│         │  │  [ 버튼 ]     │  │             │
│         │  └──────────────┘  │             │
│         └────────────────────┘             │
│  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁  ground     │  ← --color-ground
└──────────────────────────────────────────┘
```

### 8.1 `start` — 초기/부트

- 노출: `#start-overlay` + `#start-button`
- 화면 텍스트: 타이틀 **"ENDLESS RUNNER"**, 상태 라벨 **"준비"**, 안내 "Space / ▲ 점프 · ▼ 숙이기"
- `#start-button` `aria-label="게임 시작"` → 클릭 시 `playing` 진입
- HUD 는 초기값(SCORE 0 / DIST 0m / HIGH 0)로 표시

### 8.2 `playing` — 진행 중 (HUD)

- 오버레이 없음. `#hud-score`·`#hud-distance`·`#hud-highscore` 실시간 갱신
- 플레이어(`--color-player`)가 지면 장애물(`--color-obstacle-ground`)·공중 장애물(`--color-obstacle-air`) 회피
- 입력 활성: `Space`/`ArrowUp` 점프, `ArrowDown` 숙이기
- 화면 상단 상태 라벨(스크린 리더용 텍스트 포함) **"진행 중"**

### 8.3 `paused` — 일시정지

- 노출: `#pause-overlay` + `#resume-button`
- 화면 텍스트: 타이틀 **"일시정지"**, 상태 라벨 **"정지됨"**
- `#resume-button` `aria-label="게임 재개"` → 클릭 시 `playing` 복귀
- HUD 수치는 정지 시점 값을 그대로 유지

### 8.4 `gameover` — 게임오버 → 초기 상태 복원

- 노출: `#gameover-overlay`(`role="alert"`) + `#gameover-score` + `#restart-button`
- `role="alert"` 로 **최종 점수와 최고 점수**를 스크린 리더에 안내 (예: "게임 종료. 최종 점수 1240, 최고 점수 1240")
- 화면 텍스트: 타이틀 **"게임 오버"**, `#gameover-score` 에 최종/최고 점수
- `#restart-button` `aria-label="다시 시작"` → 클릭 시 **점수·거리·속도를 초기값(0)으로 되돌리고** 주 실행 control이 **다시 활성화된 초기 상태 복원 화면**을 보여준 뒤 재개
- **후조건 불변식**: 초기화·취소·실패 뒤에는 상태와 진행 표시(점수/거리)를 초기값으로 되돌리고, 주 실행 control(start/restart)을 다시 사용할 수 있어야 한다.

> `design-mockup.html` 은 위 **4개 상태를 모두** 한 페이지에 배치하고, `gameover` 시안에서 재시작 control이 활성화된 복원 화면을 보여준다. 모든 값은 `design-tokens.html` 과 **동일한 CSS 변수**를 참조하며 하드코딩하지 않는다.

---

## 9. 접근성 (동결)

- `#start-button`·`#resume-button`·`#restart-button` 은 **명시적 `aria-label`** 을 가진다.
- 점프는 `Space` 와 `ArrowUp`, 숙이기는 `ArrowDown` 키로 동작한다.
- `#gameover-overlay` 는 `role="alert"` 로 최종 점수와 최고 점수를 안내한다.
- 모든 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.
- 버튼 `:focus-visible` outline(`--color-player`)으로 키보드 포커스를 가시화한다.

---

## 10. 반응형 (동결)

- **320px 이상**에서 캔버스와 HUD가 뷰포트 밖으로 overflow하지 않는다.
- 게임 캔버스는 **고정 종횡비를 유지**하며 뷰포트 폭에 맞춰 축소된다(Phaser `Scale.FIT` 계열). `#game-root` 은 실제 비율의 자리표시자로 배치된다.
- HUD 는 좁은 폭에서 항목 간 `--space-sm` 을 유지하며 줄바꿈 없이 한 줄 축약 표시.
- 오버레이 패널(`runner__panel`)은 최대 폭을 두고 좌우 `--space-lg` 여백으로 320px에서도 넘치지 않는다.

---

## 11. dev 구현 가이드 (developer / BF-1760 참조)

1. **토큰 선언**: `index.html`·`design-tokens.html`·`design-mockup.html` 의 `:root` 에 §4~§6 토큰을 **exact 이름=값**으로 선언. 색상/치수는 반드시 `var(--token)` 참조 — 하드코딩 금지.
2. **`design-tokens.html`**: §4 색상, §5 타이포, §6 스페이싱/반경 견본을 나열하고 각 견본이 실제 CSS 변수를 참조하도록 구성.
3. **`design-mockup.html`**: §8 의 4개 상태(start/playing/paused/gameover)를 `<section>` 으로 구분해 한 페이지에 배치. `design-tokens.html` 과 동일한 `:root` 변수 사용, 값 하드코딩 금지. `gameover` 섹션은 재시작 control이 재활성화된 복원 화면 포함.
4. **selector**: §7 의 DOM id / class 를 **정확히** 사용(추가·개명 금지).
5. **접근성/반응형**: §9·§10 을 그대로 구현.
6. **런타임 분리**: 판정 로직은 `src/game-logic.js`(순수, RNG 주입), 렌더링/입력은 `src/main.js`. 테스트는 `tests/game-logic.test.js`.

> 시안(`design-mockup.html`)은 참조 가이드이며 픽셀 단위 일치 의무는 없다. selector·token·상태·접근성·반응형 **계약 값**만 정확히 지키면 된다.

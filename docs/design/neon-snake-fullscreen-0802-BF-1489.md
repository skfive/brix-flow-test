# 네온 스네이크 전체화면 시각 명세 — neon-snake-fullscreen-0802 (BF-1489)

> 작성자: [이디자인] (designer) · 작성일 2026-08-02
> 관련 티켓: BF-1489 (Epic) · BF-1490 (본 designer task) · BF-1492 (planner) · BF-1491 (dev)
> tech-stack: `vanilla-static` — 외부 프레임워크·번들러·CDN·webfont 0건, system font 만 사용
> 실행 설계 SSOT(권위): `docs/plans/neon-snake-fullscreen-0802-BF-1489.md`([박기획], BF-1492)
> 대상 라우트: `/demo/neon-snake-fullscreen-0802`
> 진입 파일(developer 소유, frozen): `demo/neon-snake-fullscreen-0802/index.html`
> mockup: `docs/design/mockups/neon-snake-fullscreen-0802-BF-1490.html`

---

## 0. 문서 성격 및 전제 (필독)

**전제 1 — frozen UI 계약을 재정의하지 않는다:** 상위 Execution Blueprint의
`ui-contract@v1`
(sha256:a253bef00b56013f2ca578b7d057f940e02e9782a140d042ed34005316450072)과
planner 실행 설계(`docs/plans/neon-snake-fullscreen-0802-BF-1489.md`)가
파일 목록·DOM ID/class·상태·디자인 토큰·접근성·반응형을 이미 **frozen** 했다.
본 문서는 그 계약을 **그대로 서술**하고 그 위에 네온 야간 테마의 시각
표현(그라데이션·글로우·절제된 파티클·상태 전환)만 구체화한다. selector·상태명·
토큰 이름/값을 **변경하거나 재정의하지 않는다**(frozen 불변식).

**전제 2 — designer 산출물 경계:** 본 문서는 디자인 명세(컬러·타이포·레이아웃·
컴포넌트 계약·상태별 시각 표현)와 시각 mockup HTML 까지다. 실제 런타임
코드(`index.html`/`styles.css`/`src/game.js`/`src/main.js`/`tests/game.test.js`)는
developer(BF-1491) 소유이며 본 task 에서 생성·수정하지 않는다(non-goal).

**전제 3 — 기존 코드 미참조:** frozen 불변식에 따라 기존 코드 검색·복사·import·
재사용, 패키지 추가, API/DB/외부 네트워크 사용을 하지 않는다. 본 명세는 planner
문서만을 근거로 작성했다.

**전제 4 — 정적(`file://`) 열람:** mockup HTML 은 외부 의존성 0건 self-contained
단일 파일로, `file://` 로 바로 열람 가능해야 한다.

**전제 5 — 토큰 권위:** §2.1 의 6개 토큰은 frozen 이며 **값·이름 고정**이다. §2.2 의
표현용(presentational) 값은 frozen 6토큰 위에 얹는 designer 권고이며, frozen
토큰을 **덮어쓰지 않는다**. developer 는 §2.2 를 참고로 텍스트/글로우/스크림을
표현하되 6 frozen 토큰의 값은 그대로 사용한다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [상태별 시각 표현 (ready/running/paused/gameover)](#6-상태별-시각-표현)
7. [dev 구현 가이드](#7-dev-구현-가이드)
8. [mockup 참조 / 남은 모호함](#8-mockup-참조--남은-모호함)

---

## 1. 시안 개요

### 1.1 변경 범위

`/demo/neon-snake-fullscreen-0802` 화면의 **네온 야간 테마 시각 표현**을 정의한다.
viewport 전체(`100vw × 100dvh`)를 채우는 다크 배경 위에 네온 격자 스네이크가
놓이고, HUD(점수/최고 점수/속도)와 상태 overlay(시작/일시정지/게임 오버)가
게임 영역 위에 겹쳐 표시된다. 뱀·먹이의 네온 글로우, 절제된 배경 파티클,
상태 전환 시의 스크림·색조 전환을 시각 명세로 구체화한다.

### 1.2 사용자 경험 목표

| 목표 | 설명 |
|---|---|
| 몰입형 전체화면 | 배경(`--bg-night`)이 화면 끝까지 차서 브라우저 크롬 외 방해 요소 없음. 게임 격자는 종횡비와 무관하게 왜곡 없이 중앙 레터박스 배치 |
| 네온 심미 | 뱀 머리(시안)·몸통(그린)·먹이(핑크)가 다크 배경 위에서 발광. 글로우는 가독성을 해치지 않는 절제된 강도 |
| 상태 명료성 | ready/running/paused/gameover 를 **색 + 화면 텍스트 + 접근성 이름** 3중 채널로 구분. 색만으로 정보를 전달하지 않음(WCAG 1.4.1) |
| 예측 가능한 흐름 | 시작→진행→일시정지↔재개→게임 오버→다시 시작이 언제나 동일 위치의 주 control 로 조작 가능. 실패·중단 후에도 주 control 즉시 재사용 가능(frozen 불변식) |
| 접근성 우선 | `role="img"` 격자 + `aria-live` 상태 안내 + `focus-visible` 포커스 링 + `prefers-reduced-motion` 정적 대안 |

### 1.3 AC 매핑

| BF-1490 수용 기준 | 충족 근거 |
|---|---|
| `docs/design` 명세가 frozen selector 와 `--token` 값을 그대로 사용하고 재정의하지 않는다 | §2.1(frozen 토큰 그대로) · §3~§5 selector 그대로 · §0 전제 1·5 |
| ready/running/paused/gameover 각 상태의 색상 외 화면 텍스트와 시각 전환이 명세에 포함된다 | §6.1~§6.5(상태별 화면 텍스트·전환) · §5.5 overlay |
| 네온 야간 테마·HUD 오버레이·충분한 대비·prefers-reduced-motion 대안이 시각적으로 명시된다 | §2(팔레트·대비) · §4(HUD overlay 겹침) · §6.6(모션·reduced-motion) |
| 시각 명세 범위는 `docs/design/neon-snake-fullscreen-0802-BF-1489.md` 이며 런타임 HTML/CSS/JS 를 생성하지 않는다 | 본 문서 + mockup(시각 시뮬레이션)만 산출, 런타임 파일 non-goal(§0 전제 2) |

---

## 2. 컬러 팔레트

### 2.1 Frozen 디자인 토큰 (값·이름 변경 금지 — planner §3.3)

아래 6개 토큰은 frozen 이다. developer 는 `styles.css :root` 에 이 이름·값
그대로 정의하고 하드코딩하지 않는다.

| 토큰 | 값 | 권장 용도 |
|---|---|---|
| `--neon-primary` | `#39ff14` | 뱀 몸통·주 강조(네온 그린) |
| `--neon-secondary` | `#00e5ff` | 뱀 머리·보조 강조(시안) |
| `--neon-food` | `#ff2d95` | 먹이 색상(네온 핑크) |
| `--bg-night` | `#050510` | `snake-stage`/`snake-canvas` 배경 |
| `--overlay-scrim` | `rgba(5,5,16,0.55)` | overlay 반투명 스크림 |
| `--hud-gap` | `16px` | `hud` 내부 항목 간격 |

### 2.2 표현용 권고 값 (frozen 위에 얹음 — frozen 토큰 덮어쓰지 않음)

frozen 토큰에 텍스트·글로우·격자선처럼 표현에 필요한 보조 값을 designer
권고로 더한다. developer 는 이 값을 상수/보조 변수로 사용하되 §2.1 6토큰의
값은 그대로 둔다. 색만으로 정보를 전달하지 않으므로 아래 색은 항상 텍스트와
함께 쓰인다.

| 역할 | 권고 이름(예) | 값 | 용도 |
|---|---|---|---|
| 본문/HUD 텍스트 | `--text-primary` | `#eafcff` | 점수·overlay 제목 등 주 텍스트(거의 흰색, 시안 틴트) |
| 보조 텍스트 | `--text-secondary` | `#8ea9bf` | HUD 레이블·overlay 보조 설명 |
| 격자선 | `--grid-line` | `rgba(0,229,255,0.06)` | canvas 안 옅은 시안 격자(선택, 절제) |
| 배경 상단 광원 | `--bg-glow-top` | `rgba(0,229,255,0.10)` | 상단 은은한 시안 방사 그라데이션 |
| 배경 하단 광원 | `--bg-glow-bottom` | `rgba(57,255,20,0.06)` | 하단 은은한 그린 방사 그라데이션 |
| 뱀 머리 글로우 | (그림자) | `0 0 12px rgba(0,229,255,0.85)` | `--neon-secondary` 발광 |
| 뱀 몸통 글로우 | (그림자) | `0 0 8px rgba(57,255,20,0.7)` | `--neon-primary` 발광 |
| 먹이 글로우 | (그림자) | `0 0 14px rgba(255,45,149,0.85)` | `--neon-food` 발광(맥동) |
| gameover 색조 | `--gameover-tint` | `rgba(255,45,149,0.16)` | overlay 스크림에 핑크 색조 |
| ready/pause 포커스 링 | `--focus-ring` | `rgba(0,229,255,0.6)` | `focus-visible` 링(시안) |

> **배경 그라데이션 정의:** `--bg-night`(`#050510`) 단색 위에 상단 시안·하단
> 그린 방사 광원(위 `--bg-glow-*`)을 아주 옅게 얹어 "야간 네온" 깊이를
> 만든다. 광원은 배경 장식일 뿐 게임 격자 가독성을 침범하지 않는다. frozen
> `--bg-night` 값 자체는 변경하지 않는다.

### 2.3 대비(명도차) 확인 — `--bg-night`(#050510) 기준

| 조합 | 용도 | 대비비(근사) | 판정 |
|---|---|---|---|
| `#eafcff` on `#050510` | 주 텍스트(점수·overlay 제목) | ≈ 19:1 | AAA |
| `#8ea9bf` on `#050510` | HUD 레이블·보조 설명 | ≈ 8.5:1 | AAA |
| `#39ff14` on `#050510` | 뱀 몸통(그래픽·비텍스트) | ≈ 16:1 | AAA(그래픽 3:1 충분) |
| `#00e5ff` on `#050510` | 뱀 머리(그래픽) | ≈ 13:1 | AAA(그래픽) |
| `#ff2d95` on `#050510` | 먹이(그래픽) | ≈ 5.6:1 | 그래픽 3:1 통과 |
| `#050510` on `#39ff14` | primary 버튼 텍스트(어두운 글자/네온 배경) | ≈ 16:1 | AAA |

> 네온 3색은 게임 그래픽(비텍스트 UI)이라 WCAG 1.4.11 그래픽 대비 3:1 기준을
> 모두 통과한다. 화면에 표시되는 **글자**(점수·상태명·버튼 라벨)는 `--text-*`
> 값으로 AA 이상을 확보한다. overlay 위 텍스트는 `--overlay-scrim` 이 배경을
> 어둡게 눌러 대비를 추가 확보한다.

---

## 3. 타이포그래피

외부 webfont 없이 system font stack 만 사용(vanilla-static).

```
--font-sans: system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--font-mono: ui-monospace, Menlo, Consolas, "Courier New", monospace;
```

| 역할 | 요소 | font-family | size | weight | line-height | 비고 |
|---|---|---|---|---|---|---|
| overlay 제목 | overlay 헤드라인(시작/일시정지/게임 오버) | sans | `clamp(24px, 7vw, 40px)` | 700 | 1.15 | 상태명 화면 텍스트 |
| overlay 설명 | overlay 보조 안내문 | sans | `clamp(14px, 3.5vw, 17px)` | 400 | 1.5 | secondary 색 |
| HUD 값 | `#hud-score`/`#hud-highscore`/`#hud-speed` 값 | **mono** | `clamp(18px, 4.5vw, 26px)` | 700 | 1 | `tabular-nums` — 자릿수 흔들림 방지 |
| HUD 레이블 | `.hud__metric` 레이블 | sans | 11px | 600 | 1.2 | uppercase, `letter-spacing 0.08em`, secondary 색 |
| overlay 통계 | 게임 오버 점수/최고 점수 | **mono** | `clamp(16px, 4vw, 22px)` | 700 | 1.3 | `tabular-nums` |
| 버튼 | `.overlay__button` | sans | 15px | 700 | 1 | 대문자 아님 |
| sr-status | `#sr-status` | (시각적 숨김) | — | — | — | 스크린리더 전용 텍스트 |

> 숫자(점수·최고 점수·속도)는 **mono + `font-variant-numeric: tabular-nums`** 로
> 실시간 갱신 시 폭 흔들림을 방지한다. `#sr-status` 는 시각적으로 숨기되
> DOM/접근성 트리에는 존재해 `aria-live` 낭독을 제공한다(§5.6).

---

## 4. 레이아웃

### 4.1 DOM 구조 (frozen — planner §3.1 그대로)

```
#snake-stage (.stage)                                   ← 100vw × 100dvh, position:relative
├─ <canvas> #snake-canvas (.stage__canvas)              ← role="img" + aria-label, 게임 렌더
├─ .hud                                                  ← 게임 위 겹침(absolute), gap: --hud-gap
│   ├─ #hud-score      (.hud__metric)                    ← 점수
│   ├─ #hud-highscore  (.hud__metric)                    ← 최고 점수
│   └─ #hud-speed      (.hud__metric)                    ← 속도(레벨)
├─ #screen-start    (.overlay.overlay--start)            ← #action-start (.overlay__button)
├─ #screen-pause    (.overlay.overlay--pause)
├─ #screen-gameover (.overlay.overlay--gameover)         ← #action-restart (.overlay__button)
└─ #sr-status                                            ← aria-live="polite" (시각적 숨김)
```

frozen DOM ID(11개)·class(10개)는 planner §3.1 목록 그대로이며 추가·재정의하지
않는다. HUD 내부 wrapper·canvas 밖 장식의 세부 배치는 frozen selector 범위 밖
developer 재량이나, 위 ID/class 집합은 고정이다.

### 4.2 겹침 구조 (HUD/overlay 는 게임 영역을 잠식하지 않음 — frozen 반응형)

- `#snake-stage` 는 `position: relative` 로 뷰포트를 채우는 유일한 레이아웃
  컨테이너다. `#snake-canvas`·`.hud`·overlay 3종은 모두 stage 안에서 **겹쳐**
  배치(`position: absolute`)되어, HUD/overlay 가 canvas 격자 렌더 영역을
  레이아웃 flow 에서 축소하지 않는다(frozen 반응형 3항).
- `body` 는 `margin:0; overflow:hidden` — 스크롤·바운스 없음.

```
┌─ #snake-stage (100vw × 100dvh, --bg-night + 배경 광원) ────────────┐
│  ┌─ .hud (top, 가로 중앙 또는 좌상단) ─────────────────────────┐  │
│  │  [점수 0]   [최고 200]   [속도 Lv.0]   ← gap: --hud-gap      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│              ┌─ #snake-canvas (정사각 격자, 중앙 레터박스) ─┐    │
│              │   · · · · · · · · · · · · · · · · · · ·      │    │
│              │   · ●(먹이 핑크) · · · ▮▮▮(뱀) · · · ·      │    │
│              │   · · · · · · · · · · · · · · · · · · ·      │    │
│              └────────────────────────────────────────────┘    │
│                                                                  │
│   ┌─ overlay (해당 상태에서만; 나머지는 .is-hidden) ──────────┐  │
│   │        [상태 제목]  [설명]  [action 버튼]                 │  │
│   └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3 canvas 격자 렌더 (frozen 반응형 — planner §8)

- 논리 격자 `28 × 28`(planner §4) 를 **정사각 셀**로 렌더:
  `cell = floor(min(cssW, cssH) / 28)`, 격자를 stage 중앙에 배치(레터박스)해
  종횡비와 무관하게 왜곡 없이 표시한다.
- `devicePixelRatio`·`resize`·`orientationchange` 시 backing store 해상도를
  재계산(`canvas.width = cssW * dpr` 등)하고 컨텍스트를 dpr 스케일한다.
- 게임 로직(순수 함수)은 뷰포트 크기와 독립적이다(planner §5).

### 4.4 HUD 배치 · spacing

- `.hud` 는 stage 상단에 겹쳐(`position:absolute; top`) 가로로 3개 metric 을
  배치, 항목 간격은 frozen `--hud-gap`(16px) 을 일관 적용한다.
- 각 `.hud__metric` 은 위(레이블 uppercase)·아래(값 mono) 2줄 스택. 반투명
  다크 패널(`--overlay-scrim` 계열) 배경으로 격자 위에서도 값이 읽힌다.
- 안전 여백: 노치/둥근 모서리 대비 `env(safe-area-inset-*)` 를 padding 에
  더하는 것을 권장(선택, developer 재량).

### 4.5 breakpoint 별 동작

| 뷰포트 | 동작 |
|---|---|
| 기본(모든 크기) | stage 전체화면, canvas 중앙 레터박스. HUD/overlay 겹침. 가로/세로 스크롤 없음 |
| ≥320px(하한) | HUD 3항목이 겹쳐 표시되어 격자를 축소하지 않음(frozen 3항). 좁으면 HUD 값 size 하한(`clamp` 최소값) 적용 |
| 모바일 스와이프 | canvas `touch-action: none` 권장 — 스와이프 방향 입력이 페이지 스크롤/줌을 유발하지 않도록(입력 처리는 developer, §5.3) |
| 세로/가로 회전 | `orientationchange` 시 §4.3 재계산으로 정사각 격자 유지 |

> 단일 레이아웃(전체화면 겹침) — 별도 데스크톱/모바일 분기 없이 `100dvh`·중앙
> 레터박스로 모든 뷰포트를 커버한다.

---

## 5. 컴포넌트 명세

각 컴포넌트의 시각 상태·인터랙션·접근성 계약. selector 는 frozen(§4.1) 그대로다.

### 5.1 stage `#snake-stage` (.stage)

| 항목 | 계약 |
|---|---|
| 크기 | `100vw × 100dvh`, `position: relative`, `overflow: hidden` |
| 배경 | `--bg-night`(#050510) + 상/하 은은한 방사 광원(§2.2 `--bg-glow-*`) |
| 파티클 | 절제된 배경 파티클(작은 시안/그린 점의 느린 부유). reduced-motion 시 정지·정적(§6.6) |
| 역할 | HUD·canvas·overlay 3종의 유일한 겹침 컨테이너 |

### 5.2 canvas `#snake-canvas` (.stage__canvas)

| 항목 | 계약 |
|---|---|
| 접근성 | `role="img"` + 명시적 `aria-label`(예: "네온 스네이크 게임 보드, 점수 N, 최고 점수 M") — 상태 반영 권장(frozen 접근성 1항) |
| 배경 | `--bg-night`. 선택적 옅은 격자선(`--grid-line`, 시안 6% alpha) — 절제, 없어도 무방 |
| 뱀 머리 | `--neon-secondary`(시안) 채움 + 글로우 `0 0 12px rgba(0,229,255,0.85)`. 진행 방향 쪽 살짝 둥근 모서리로 머리 식별 |
| 뱀 몸통 | `--neon-primary`(그린) 채움 + 글로우 `0 0 8px rgba(57,255,20,0.7)`. 셀은 라운드 사각(radius ≈ 셀의 20%), 셀 간 1~2px 간격으로 마디 구분 |
| 먹이 | `--neon-food`(핑크) 원형 + 글로우 `0 0 14px rgba(255,45,149,0.85)`. running 중 은은한 맥동(scale/opacity), reduced-motion 시 정적 |
| 렌더 요소 | 격자(선택) · 뱀(머리+몸통) · 먹이 1개(§4.3 논리 좌표) |

> 글로우는 canvas 2D `shadowBlur`/`shadowColor` 또는 다중 패스로 표현(developer
> 재량). 강도는 위 값을 상한 기준으로 하되 가독성을 해치지 않게 절제한다.

### 5.3 HUD `.hud` + `.hud__metric`

| 항목 | 계약 |
|---|---|
| 컨테이너 | stage 상단 겹침, 항목 간격 `--hud-gap`(16px), 반투명 다크 패널 배경 |
| `#hud-score` | 레이블 "점수" + 값(mono, `tabular-nums`). 값 변경 시 즉시 갱신 |
| `#hud-highscore` | 레이블 "최고" + 값(mono). `localStorage` 최고 점수(developer 연동) |
| `#hud-speed` | 레이블 "속도" + 값(예: "Lv.0"). speedLevel 반영(planner §6.3) |
| 접근성 | 텍스트 값은 항상 노출. 실시간 낭독은 `#sr-status` 가 담당(§5.6), HUD 자체는 시각 표시 |
| 색 | 레이블 `--text-secondary`, 값 `--text-primary`. 색만으로 정보 전달 금지(레이블 텍스트 병기) |

> 입력 이벤트로 뱀을 조작하는 것은 canvas/문서 레벨 키보드·포인터 처리이며
> HUD 는 정적 표시 컴포넌트다.

### 5.4 overlay 3종 `.overlay` (`--start`/`--pause`/`--gameover`)

frozen 상태-overlay 매핑(planner §3.2)을 그대로 따른다. 각 overlay 는 자신이
활성인 상태에서만 노출되고, 그 외에는 `is-hidden` 공통 유틸 class 로 감춘다.

| overlay | 노출 상태 | 감춤 상태(`.is-hidden`) | 포함 요소 |
|---|---|---|---|
| `#screen-start` (`.overlay--start`) | ready | running·paused·gameover | 제목·설명·`#action-start` |
| `#screen-pause` (`.overlay--pause`) | paused | ready·running·gameover | 제목·설명(버튼 없음, 키/재개 안내) |
| `#screen-gameover` (`.overlay--gameover`) | gameover | ready·running·paused | 제목·점수/최고 통계·`#action-restart` |

| 공통 항목 | 계약 |
|---|---|
| 스크림 | `--overlay-scrim`(rgba(5,5,16,0.55)) — 게임 격자를 어둡게 눌러 텍스트 대비 확보. running 에서는 3종 모두 `is-hidden` |
| 카드 | 중앙 정렬, 반투명 다크 패널 + 네온 테두리(1px, 상태별 색: start=시안, pause=그린, gameover=핑크) |
| 제목 | overlay 제목 타이포(§3), `--text-primary`. 상태명을 **화면 텍스트로** 노출 |
| 색조 | gameover 는 스크림에 `--gameover-tint`(핑크) 색조를 더해 결과를 색+텍스트로 이중 표시 |
| 포커스 | 노출 시 주 버튼(있으면) 또는 제목(`tabindex="-1"`)에 포커스 이동해 스크린리더 낭독(developer 재량) |

### 5.5 버튼 `.overlay__button` (`#action-start` / `#action-restart`)

| 상태 | 표현 |
|---|---|
| 기본 | 네온 그린(`--neon-primary`) 채움 + 어두운 글자(`--bg-night`), `min-height:44px`(터치 타깃 ≥44px, WCAG 2.5.5), radius ≈ 10px |
| hover | 밝기 소폭 상승 + 글로우 강화(reduced-motion 무관, 색 변화만) |
| active | `transform: scale(0.97)` (reduced-motion 시 없음) |
| focus-visible | `outline: 2px solid --neon-secondary; outline-offset: 2px` + `box-shadow 0 0 0 4px --focus-ring`(시안 링) (frozen 접근성 3항) |
| 접근성 | 각각 `aria-label`(예: "게임 시작", "다시 시작") 보유(frozen 3항). 네이티브 `<button>` 권장 — Enter/Space 네이티브 activation |

- `#action-start`: ready overlay 안. "시작" 라벨. 클릭/Enter/Space 로 게임 시작.
- `#action-restart`: gameover overlay 안. "다시 시작" 라벨. 클릭/Enter/Space 로
  `ready` 로 리셋(최고 점수 보존, frozen 불변식) 후 즉시 재사용 가능.

### 5.6 sr-status `#sr-status` (aria-live="polite")

| 항목 | 계약 |
|---|---|
| 시각 | 시각적으로 숨김(`.sr-only` 류: `position:absolute; width:1px; height:1px; clip` 등) — 화면 표시는 안 하되 접근성 트리에 존재 |
| 역할 | 상태 전이·점수 변화를 텍스트로 안내(frozen 접근성 2항). 예: "게임 시작", "점수 120", "일시정지", "게임 오버, 점수 120, 최고 점수 200" |
| 갱신 | 상태 전이·먹이 섭취·게임 오버 시 developer 가 텍스트 갱신 → `aria-live="polite"` 로 낭독 |

> `#sr-status` 는 색맹/저시력/스크린리더 사용자를 위한 텍스트 채널로, "색만으로
> 정보를 전달하지 않는다"(frozen 접근성 6항)를 완성하는 핵심 요소다.

---

## 6. 상태별 시각 표현

frozen 상태 모델 4개(`ready | running | paused | gameover`)를 시각으로 정의한다.
**모든 상태는 색 + 화면 텍스트 + 접근성 이름 3중 채널로 구분**한다(frozen
접근성 6항). 화면 텍스트는 예시이며 문구는 designer 소관이나, 상태명이 텍스트로
드러나야 한다는 요건은 frozen 이다.

### 6.1 `ready` — 준비됨(시작 대기)

| 요소 | 표현 |
|---|---|
| 노출 overlay | `#screen-start`(나머지 2종 `.is-hidden`) |
| canvas | 중앙 3칸 뱀(머리 시안·몸통 그린) 정지 상태, 먹이 없음(food null). 배경 광원·정적 |
| HUD | 점수 `0` · 최고 `저장된 값`(예: 0 또는 이전 최고) · 속도 `Lv.0` |
| overlay 제목 | "준비됨" |
| overlay 설명 | "시작을 눌러 플레이 · 방향키/WASD 이동 · Space 또는 P 일시정지" |
| 버튼 | `#action-start` "시작"(네온 그린, 시안 테두리 카드) |
| sr-status | "준비됨. 시작을 눌러 플레이하세요." |
| 시각 전환 | (진입) 페이드 인. reduced-motion 시 즉시 표시 |

### 6.2 `running` — 진행 중

| 요소 | 표현 |
|---|---|
| 노출 overlay | 없음 — 3종 모두 `.is-hidden`(방해 없는 플레이) |
| canvas | 뱀 이동(tick 마다), 먹이 1개 표시(핑크·맥동 글로우). 먹이 섭취 시 성장·새 먹이 |
| HUD | 점수 먹이당 +10 즉시 갱신 · 속도 3개 먹을 때마다 Lv +1(planner §6.3) · 최고 점수는 유지 |
| 화면 텍스트 | overlay 없음. 상태는 HUD 값 + `#sr-status` 로 안내 |
| sr-status | "게임 시작"(전이 시), 점수 변화 시 "점수 N"(과도한 낭독 방지 위해 developer 가 스로틀 권장) |
| 시각 전환 | ready→running: overlay 페이드 아웃 → 첫 먹이 등장. 먹이 섭취 시 짧은 파티클 버스트(절제, reduced-motion 시 생략) |

### 6.3 `paused` — 일시정지

| 요소 | 표현 |
|---|---|
| 노출 overlay | `#screen-pause`(나머지 2종 `.is-hidden`) |
| canvas | 뱀·먹이가 정지 상태로 스크림 아래 보임(진행 위치 보존) |
| HUD | 정지 시점의 점수·최고·속도 그대로 유지 |
| overlay 제목 | "일시정지" |
| overlay 설명 | "Space 또는 P 로 재개" |
| 버튼 | 없음(키보드 재개). 카드 테두리 그린 색조 |
| sr-status | "일시정지" |
| 시각 전환 | running→paused: 스크림 페이드 인, 배경 파티클·먹이 맥동 정지. resume 시 역전환. 정지→재개 시 뱀 위치·score·speedLevel·food 그대로 이어짐(planner §6.6) |

### 6.4 `gameover` — 게임 오버

| 요소 | 표현 |
|---|---|
| 노출 overlay | `#screen-gameover`(나머지 2종 `.is-hidden`) |
| canvas | 충돌 지점의 뱀 정지 상태 + 스크림. 스크림에 `--gameover-tint`(핑크) 색조 |
| HUD | 최종 점수·최고 점수(갱신되었으면 반영)·속도 유지 |
| overlay 제목 | "게임 오버" — 핑크(`--neon-food`) 강조 |
| overlay 통계 | "점수 {score} · 최고 점수 {highScore}"(mono, `tabular-nums`) |
| overlay 설명 | "벽 또는 몸에 부딪혔어요"(충돌) / "격자를 가득 채웠어요"(만석 클리어성 종료) |
| 버튼 | `#action-restart` "다시 시작"(핑크 테두리 카드) |
| sr-status | "게임 오버, 점수 {score}, 최고 점수 {highScore}" |
| 시각 전환 | running→gameover: 짧은 충돌 플래시(화면 가장자리 핑크 글로우 1회, reduced-motion 시 생략) → 스크림·overlay 페이드 인. `#action-restart` 즉시 사용 가능 |

### 6.5 상태 → overlay/버튼 노출 매트릭스 (frozen §3.2)

| status | 노출 overlay | `.is-hidden` overlay | 노출 버튼 | 화면 상태 텍스트 |
|---|---|---|---|---|
| ready | `#screen-start` | pause·gameover | `#action-start` | "준비됨" |
| running | (없음) | start·pause·gameover | (없음) | HUD + sr-status |
| paused | `#screen-pause` | start·gameover | (없음) | "일시정지" |
| gameover | `#screen-gameover` | start·pause | `#action-restart` | "게임 오버 · 점수/최고" |

> overlay 노출·`is-hidden` 토글의 정확한 시점 로직은 developer(planner §6 상태
> 전이표 우선). 위 표는 시각 의도의 기준선이며 frozen 매핑과 일치한다.

### 6.6 모션 · `prefers-reduced-motion`

frozen 접근성 5항: `prefers-reduced-motion: reduce` 시 글로우·파티클
애니메이션을 비활성화하고 정적 렌더로 대체한다.

| 연출 | 기본(motion) | reduced-motion |
|---|---|---|
| 배경 파티클 | 느린 부유 | 정지(정적 점) 또는 미표시 |
| 먹이 맥동 | 은은한 scale/opacity 맥동 | 정적(고정 크기·불투명) |
| 뱀 글로우 | 정적 발광(애니메이션 아님) — 유지 | 정적 발광 유지(성능 시 blur 감소 가능) |
| 먹이 섭취 파티클 버스트 | 짧은 버스트 | 생략 |
| gameover 충돌 플래시 | 1회 플래시 | 생략(즉시 overlay) |
| overlay 페이드 | 페이드 인/아웃(120~180ms) | 즉시 표시(트랜지션 제거) |
| 버튼 hover/active | 트랜지션 | 색 변화만, transform 제거 |

> 게임 핵심 이동(뱀 tick 이동)은 게임 플레이 자체이므로 유지된다. reduced-motion
> 은 **장식 연출**(파티클·맥동·플래시·페이드)만 끈다.

---

## 7. dev 구현 가이드

developer(BF-1491)가 따라할 지침. **핵심: frozen selector·상태·6토큰을 그대로
사용하고 재정의하지 않는다.** 본 명세는 그 위의 시각 표현만 권고한다.

### 7.1 CSS 변수 (frozen 6개 — 이름·값 고정)

`styles.css :root` 에 아래를 하드코딩 없이 정의:
`--neon-primary:#39ff14; --neon-secondary:#00e5ff; --neon-food:#ff2d95;
--bg-night:#050510; --overlay-scrim:rgba(5,5,16,0.55); --hud-gap:16px;`

표현용 보조 값(§2.2, 예: `--text-primary`, `--text-secondary`, `--grid-line`,
`--focus-ring`, `--gameover-tint`, `--bg-glow-*`)은 필요 시 추가로 정의하되
**위 6토큰의 값을 덮어쓰지 않는다**. canvas 안 네온색은 `getComputedStyle(root)
.getPropertyValue('--neon-primary')` 로 읽거나 동일 값 상수 미러링(developer 재량).

### 7.2 마크업/selector (frozen — 변경 금지)

- DOM ID(11): `snake-stage`, `snake-canvas`, `hud-score`, `hud-highscore`,
  `hud-speed`, `screen-start`, `screen-pause`, `screen-gameover`, `action-start`,
  `action-restart`, `sr-status`
- class(10): `stage`, `stage__canvas`, `hud`, `hud__metric`, `overlay`,
  `overlay--start`, `overlay--pause`, `overlay--gameover`, `overlay__button`,
  `is-hidden`
- 위 집합 외 wrapper/장식 class 추가는 developer 재량이나, 위 이름은 고정.

### 7.3 구현 단계

1. **stage/전체화면** — `#snake-stage.stage` 를 `100vw × 100dvh`,
   `position:relative; overflow:hidden`. `body{margin:0; overflow:hidden}`(§4.1).
2. **배경** — `--bg-night` + 상/하 방사 광원(§2.2). 절제된 파티클은 선택.
3. **canvas** — `#snake-canvas.stage__canvas` 에 `role="img"`·`aria-label`.
   `touch-action:none` 권장. dpr/resize 재계산 + 28×28 정사각 중앙 레터박스(§4.3).
4. **HUD** — `.hud`(absolute 겹침, gap `--hud-gap`) 안에 3 `.hud__metric`(레이블
   sans uppercase + 값 mono tabular-nums). 격자 영역 축소 금지(§4.2·§4.4).
5. **overlay 3종** — `is-hidden` 유틸로 상태별 노출 토글(§5.4·§6.5). 스크림
   `--overlay-scrim`, gameover 는 `--gameover-tint` 색조.
6. **버튼** — `.overlay__button`(`#action-start`/`#action-restart`),
   `min-height:44px`, `aria-label`, `:focus-visible` 시안 링(§5.5).
7. **sr-status** — 시각적 숨김 + `aria-live="polite"`, 상태/점수 텍스트 갱신(§5.6).
8. **키보드** — 방향키/WASD 이동, Space/P 일시정지·재개(planner §7). 게임 조작
   키의 페이지 스크롤 기본동작 차단은 developer 재량.
9. **reduced-motion** — `@media (prefers-reduced-motion: reduce)` 에서 파티클·
   맥동·플래시·페이드·transform 제거, 정적 렌더(§6.6).

### 7.4 검증 포인트 (시안 대비)

- frozen 6토큰이 `:root` 에 이름·값 그대로 정의되고 색 하드코딩 0건인가?
- 11 ID·10 class 가 그대로 존재하고 추가 재정의가 없는가?
- ready/running/paused/gameover 4상태에서 overlay 노출/`is-hidden` 이 §6.5 표와
  일치하는가?
- 상태명이 화면 텍스트 + `#sr-status` + (버튼) `aria-label` 로 노출되는가(색만
  의존 금지)?
- HUD/overlay 가 canvas 격자 영역을 축소하지 않고 겹치는가? 320px 에서도?
- `prefers-reduced-motion` 에서 장식 연출이 꺼지는가? 게임 이동은 유지되는가?
- 버튼 터치 타깃 ≥44px, focus-visible 링이 보이는가?
- `file://` 로 열어도 외부 요청 0건인가(system font, 외부 의존성 0)?

> **주의:** 본 mockup HTML 은 시각 시뮬레이션이며 dev 의 실제 산출물이 아니다.
> 픽셀 단위 일치 의무는 없고, frozen 토큰·selector·상태 시각 의도만 준수하면 된다.

---

## 8. mockup 참조 / 남은 모호함

### 8.1 mockup 참조

- 경로: **`docs/design/mockups/neon-snake-fullscreen-0802-BF-1490.html`**
- 성격: 단일 self-contained HTML(외부 의존성 0건, system font). `file://` 로 바로
  열람 가능.
- 내용: §2.1 frozen 토큰 스와치 + ready/running/paused/gameover **4개 상태를
  `<section>` 으로 병렬 배치**해 상태별 시각 표현(overlay·HUD·격자·네온 글로우)을
  한 화면에서 비교. canvas 대신 CSS 격자로 뱀·먹이를 정적 렌더해 UX 의도 전달.
- markdown 의 컬러/타이포/레이아웃과 동기화됨.

### 8.2 남은 모호함 (운영자/후속 task 확인 권장)

1. **표현용 보조 색(§2.2) 정식화 여부**: frozen 토큰은 6개뿐이라 텍스트·격자선·
   글로우·스크림 색조는 designer 권고로 더했다. developer 가 이를 CSS 변수로
   정식 추가할지 상수로 둘지는 재량으로 남긴다(frozen 6토큰은 불변). 다른 값이
   필요하면 운영자 확인 후 본 §2.2 개정.
2. **파티클 강도·개수**: "절제된 파티클" 의 정확한 밀도·속도는 시각 취향 영역.
   본 시안은 가독성·성능을 해치지 않는 최소 연출을 기준으로 하며, reduced-motion
   에서는 전부 정지/생략한다. 과한 연출은 금지.
3. **HUD 정렬(좌상단 vs 상단 중앙)**: 본 시안은 상단 가로 배치를 기준선으로
   제시했으나 정확한 정렬은 frozen selector 범위 밖 developer 재량이다. 어느
   경우든 격자 영역을 축소하지 않아야 한다(frozen 반응형 3항).
4. **파일명 키 표기**: 시각 명세 파일은 frozen 산출물명대로 `...BF-1489.md`,
   mockup 은 본 designer task 키대로 `...BF-1490.html` 을 사용한다(설계상 정상).

---

## Self-critique

PR commit 직전 자기 점검(5 항목):

1. **AC 매핑** — BF-1490 AC 4건(frozen selector/token 재정의 금지 / 4상태 화면
   텍스트·전환 / 네온 테마·HUD overlay·대비·reduced-motion / 산출 범위)을 §1.3
   표에서 명세 섹션과 1:1 매핑. ✅
2. **dev 구현 가이드** — §7 에 frozen 6토큰·11 ID·10 class 를 그대로 쓰라는
   명령 + 9단계 절차 + 검증 포인트 명시. 하드코딩·재정의 금지 강조. ✅
3. **기존 요소 보존** — planner frozen UI 계약(selector·상태·토큰·접근성·반응형)을
   재정의 없이 그대로 서술(§2.1·§4.1·§5·§6.5). 표현용 보조 값은 frozen 위에
   얹고 덮어쓰지 않음을 §0 전제 5·§7.1 에서 명시. ✅
4. **컴포넌트 매핑** — stage·canvas·HUD(3 metric)·overlay(3종)·버튼(2개)·
   sr-status 를 planner §3 상태 모델·§5 함수 계약과 매핑(§5·§6). 4 status 전부
   시각 정의 + overlay/버튼 노출 매트릭스(§6.5)가 frozen §3.2 와 일치. ✅
5. **모호함 flag** — 표현용 보조 색 정식화·파티클 강도·HUD 정렬·파일명 키를
   §8.2 에 명시적으로 flag. frozen 6토큰·selector 는 불변으로 못박음. ✅

**남은 리스크:** canvas 네온색을 developer 가 `getComputedStyle` 로 읽을지 상수
미러링할지는 재량으로 남김(§7.1) — 시안 의도(frozen 토큰 단일 출처)만 전달하면
충분하다고 판단. 진입 파일(`index.html`)이 아직 미생성이나, 이는 developer
소유의 후속 산출물이며 본 명세는 planner frozen 계약만을 권위로 작성했다.

---

*문서 종료 — [이디자인] · BF-1490 (네온 스네이크 전체화면 시각 명세, Epic BF-1489)*

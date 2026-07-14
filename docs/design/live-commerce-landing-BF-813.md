# 라이브커머스 SaaS 랜딩페이지 디자인 명세 — BF-813

> 작성자: [이디자인] · 작성일 2026-07-14
> designer task: **BF-814** · 상위 Epic: **BF-813** (designer-only 모드 — dev/review/test cascade 없음)
> mockup: **`docs/design/mockups/live-commerce-landing-BF-814.html`** (§8)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font stack, CSS 변수 자체 정의, `file://` 직접 실행 호환
>
> **파일명 안내**: 본 명세 파일명은 BF-814 수용 기준에 명시된 경로(`docs/design/live-commerce-landing-BF-813.md`)를 그대로 따랐다(Epic 키 기준). mockup 은 designer task 키(BF-814)로 생성한다 — 기존 `incident-triage-BF-806` / `-BF-808` 사례와 동일한 규칙.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 · 스페이싱 · 반응형](#4-레이아웃--스페이싱--반응형)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [Pricing 섹션 상세 — 라이브 전용 vs 일반 커머스 겸용](#6-pricing-섹션-상세--라이브-전용-vs-일반-커머스-겸용)
7. [dev 구현 가이드](#7-dev-구현-가이드)
8. [mockup 참조](#8-mockup-참조)
9. [AC ↔ 산출물 매핑 표](#9-ac--산출물-매핑-표)
10. [Self-critique](#10-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

라이브커머스 SaaS(가칭 **LiveCart**)의 **신규 마케팅 랜딩페이지 1페이지**에 대한 시각 시안. 현행 SaaS SPA 랜딩 트렌드 순서를 그대로 적용한다.

```
[헤더/네비] → 1 히어로 → 2 핵심 가치(3) → 3 기능(6+지그재그) → 4 소셜프루프(지표·로고·후기)
           → 5 Pricing(2트랙 + 비교표) → 6 최종 CTA → [푸터]
```

- 본 Epic 은 **designer-only** — 구현 task 가 생성되지 않는다. 따라서 산출물은 **명세 md 1건 + 목업 HTML 1건**이며, `live-commerce/` 모듈 코드는 만들지 않는다.
- 후속 구현 Epic 이 게시되면 dev 는 `live-commerce/index.html` + `style.css` (필요 시 `landing.js`) 로 구현하고, 본 문서의 §7 을 따른다.
- CSS 변수 프리픽스: **`--lc-*`** (기존 모듈 `--it-*` / `--ith-*` 등과 충돌 없음)

### 1.2 사용자 경험 목표

| 목표 | 시각 전략 |
|------|-----------|
| 3초 안에 "무엇을 파는 SaaS 인가" 인지 | 히어로 H1 한 문장 + 우측 **라이브 방송 프리뷰 카드**(LIVE 배지·시청자 수·실시간 구매 토스트) — 텍스트가 아니라 화면으로 제품을 보여준다 |
| 라이브커머스의 핵심 가치(전환) 각인 | 히어로 하단 **지표 스트립 3종**(전환율 4.2배 / 셋업 5분 / 방송당 GMV +38%) — 숫자를 히어로 안으로 끌어올림 |
| "우리 규모에도 맞나" 불안 해소 | 소셜프루프 후기 3건을 **소상공인 / 중견 브랜드 / 엔터프라이즈** 3계층으로 배치 |
| **"라이브 안 해도 쓸 수 있나?" 해소** (Epic 핵심) | Pricing 을 **2트랙**(라이브 전용 / 일반 커머스 겸용)으로 물리적으로 분리 + 두 트랙을 잇는 **겸용 비교표**로 "커머스로 시작 → 준비되면 라이브 켜기" 경로를 명시 (§6) |
| 스크롤 어디서든 전환 가능 | sticky 헤더 우측 상시 CTA + 히어로 CTA + Pricing 각 카드 CTA + 최종 CTA 밴드 — 4개 접점 |

### 1.3 디자인 톤

- **라이브(방송)의 에너지 + SaaS 의 신뢰**를 동시에. 다크 잉크 배경(히어로·CTA·푸터)에 라이브 시그널 컬러(코럴 핑크 = REC 램프 은유)를 **점(accent)으로만** 사용하고, 본문 섹션은 밝은 캔버스로 되돌려 가독성과 신뢰를 확보한다 (다크→라이트→다크 리듬).
- 장식 최소: radius 12~20px, 얕은 그림자 1단계, 그라데이션은 히어로/CTA 배경 1곳씩만.
- 애니메이션은 **LIVE 도트 pulse 1개**로 한정하고 `prefers-reduced-motion: reduce` 에서 정지 (§5.2).

---

## 2. 컬러 팔레트

`vanilla-static` 규약 — design-tokens.json 없음. 아래 값을 목업/구현의 `:root` 에 그대로 정의한다.

### 2.1 토큰 표

| 역할 | 변수 | HEX | 용도 |
|------|------|-----|------|
| Primary (Live) | `--lc-primary` | `#FF2D6F` | LIVE 배지, 주 CTA 버튼 배경, 강조 아이콘 |
| Primary Strong | `--lc-primary-700` | `#D1004E` | **밝은 배경 위 텍스트/링크용** 코럴 (대비 확보용, §2.2) |
| Primary Soft | `--lc-primary-050` | `#FFF0F5` | 추천 플랜 카드 배경, 배지 pill 배경 |
| Secondary | `--lc-secondary` | `#6C4CF1` | 일반 커머스 트랙 식별색, 보조 배지 |
| Secondary Soft | `--lc-secondary-050` | `#F1EDFE` | 겸용 트랙 카드 배경 |
| Accent | `--lc-accent` | `#00A97A` | 성장/전환 지표, 체크 리스트 아이콘 |
| Background (dark) | `--lc-bg-ink` | `#0B0C15` | 히어로·최종 CTA·푸터 배경 |
| Background (dark 2) | `--lc-bg-ink-2` | `#171932` | 히어로 그라데이션 종점, 다크 카드 |
| Canvas | `--lc-canvas` | `#F7F7FB` | 짝수 섹션(핵심 가치·소셜프루프) 배경 |
| Surface | `--lc-surface` | `#FFFFFF` | 카드, 홀수 섹션 배경 |
| Text 900 | `--lc-ink-900` | `#12131C` | 밝은 배경 위 heading/본문 |
| Text 600 | `--lc-ink-600` | `#4C4F66` | 밝은 배경 위 보조 문구 |
| Text 400 | `--lc-ink-400` | `#7C8099` | 캡션, 각주 (14px 이상에서만) |
| Text on dark | `--lc-on-ink` | `#FFFFFF` | 다크 배경 위 heading |
| Text on dark (mute) | `--lc-on-ink-mute` | `#B9BDD6` | 다크 배경 위 보조 문구 |
| Border | `--lc-border` | `#E4E5EF` | 카드 테두리, 구분선 |
| Border (dark) | `--lc-border-ink` | `#2A2D4A` | 다크 영역 구분선 |

### 2.2 대비(WCAG) 규칙 — dev 가 반드시 지킬 것

| 조합 | 대비비(근사) | 판정 | 규칙 |
|------|------------|------|------|
| `--lc-ink-900` on `--lc-surface` | 15.6:1 | AAA | 본문 기본 |
| `--lc-ink-600` on `--lc-canvas` | 7.6:1 | AAA | 보조 문구 |
| `--lc-ink-400` on `--lc-surface` | 4.1:1 | AA(대형만) | **14px 미만 금지** — 캡션 14px+ 에서만 |
| `--lc-on-ink` on `--lc-bg-ink` | 18.9:1 | AAA | 히어로 heading |
| `--lc-on-ink-mute` on `--lc-bg-ink` | 9.8:1 | AAA | 히어로 서브카피 |
| `#FFFFFF` on `--lc-primary` | 3.9:1 | AA(대형/UI) | **버튼 라벨은 16px/700 이상**(대형 텍스트 기준)으로만 사용 — 14px 일반 텍스트 금지 |
| `--lc-primary` on `--lc-surface` | 3.6:1 | ✗(본문) | **텍스트로 쓰지 말 것.** 밝은 배경 위 코럴 텍스트/링크는 `--lc-primary-700`(5.9:1, AA) 사용 |
| `--lc-accent` on `--lc-surface` | 3.6:1 | ✗(본문) | 아이콘·그래픽 전용. 지표 숫자는 24px+ 볼드에서만 |

> 색은 **보조 채널**로만 쓴다. LIVE 상태는 색(코럴) + 형태(도트) + 텍스트("LIVE") 3중 신호, 추천 플랜은 색 + 테두리 굵기 + "가장 많이 선택" 배지 3중 신호.

---

## 3. 타이포그래피

폰트: **system stack 전용** (외부 CDN 0건 — `vanilla-static` 규약)

```css
--lc-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR",
           "Malgun Gothic", Roboto, "Helvetica Neue", Arial, sans-serif;
--lc-font-num: "SF Mono", "Cascadia Mono", Consolas, monospace; /* 지표 숫자 정렬용 */
```

| 스타일 | 변수 | size (desktop) | size (≤768px) | weight | line-height | letter-spacing | 용도 |
|--------|------|----------------|---------------|--------|-------------|----------------|------|
| Display | `--lc-fs-display` | 56px | 34px | 800 | 1.08 | -0.02em | 히어로 H1 |
| H2 | `--lc-fs-h2` | 36px | 26px | 750 | 1.2 | -0.015em | 섹션 제목 |
| H3 | `--lc-fs-h3` | 20px | 18px | 700 | 1.35 | -0.01em | 카드 제목, 플랜명 |
| Lead | `--lc-fs-lead` | 19px | 16px | 400 | 1.6 | 0 | 히어로·섹션 서브카피 |
| Body | `--lc-fs-body` | 16px | 15px | 400 | 1.65 | 0 | 본문, 리스트 |
| Caption | `--lc-fs-caption` | 14px | 14px | 500 | 1.5 | 0 | 각주, 배지 하단 |
| Overline | `--lc-fs-overline` | 12px | 12px | 700 | 1.4 | 0.12em (UPPERCASE) | 섹션 eyebrow ("PRICING") |
| Price | `--lc-fs-price` | 40px | 32px | 800 | 1.1 | -0.02em | 플랜 금액 (`--lc-font-num`) |
| Metric | `--lc-fs-metric` | 32px | 26px | 800 | 1.1 | -0.02em | 지표 숫자 |

- 반응형은 `clamp()` 1줄로 처리 권장: 예) `--lc-fs-display: clamp(34px, 5vw + 8px, 56px);`
- 한글 가독성을 위해 body line-height 는 **1.6 이상 고정**(영문 기준 1.5 보다 높게).
- 줄바꿈 제어: 히어로 H1 은 `word-break: keep-all;` (한글 어절 단위 줄바꿈).

---

## 4. 레이아웃 · 스페이싱 · 반응형

### 4.1 그리드

| 항목 | 값 |
|------|-----|
| 콘텐츠 최대 폭 | `--lc-max: 1160px` (Pricing 비교표는 예외적으로 1160px 꽉 채움) |
| 좌우 거터 | desktop 32px / ≤768px 20px |
| 섹션 세로 패딩 | desktop 96px / ≤768px 64px (히어로만 상단 72px + 하단 96px) |
| 카드 그리드 | `repeat(auto-fit, minmax(260px, 1fr))` — 3열 → 2열 → 1열 자연 붕괴 |

### 4.2 스페이싱 스케일 (4pt 기반)

```
--lc-s1: 4px   --lc-s2: 8px   --lc-s3: 12px  --lc-s4: 16px
--lc-s5: 24px  --lc-s6: 32px  --lc-s7: 48px  --lc-s8: 64px  --lc-s9: 96px
```
반경/그림자:
```
--lc-r-sm: 8px  --lc-r-md: 12px  --lc-r-lg: 20px  --lc-r-pill: 999px
--lc-shadow: 0 1px 2px rgba(18,19,28,.04), 0 8px 24px rgba(18,19,28,.06);
--lc-shadow-lg: 0 12px 40px rgba(255,45,111,.18);   /* 추천 플랜 카드 전용 */
```

### 4.3 브레이크포인트

| BP | 조건 | 동작 |
|----|------|------|
| Desktop | ≥1024px | 히어로 2열(텍스트 1.05fr / 프리뷰 0.95fr), 가치 3열, 기능 3×2, 후기 3열, Pricing 전용 3열 + 겸용 2열, 비교표 4열 |
| Tablet | 768–1023px | 히어로 1열(프리뷰가 텍스트 아래), 가치 2열, 기능 2열, 후기 2열(3번째 100%), Pricing 트랙별 2열, 비교표 유지(가로 스크롤 허용 `overflow-x:auto`) |
| Mobile | ≤767px | 전 섹션 1열 스택, 헤더 네비 링크 숨김(CTA 버튼만 유지 — 햄버거 없이 단순화), CTA 버튼 `width:100%`, 비교표는 **카드형 스택으로 전환**(§6.3) |
| Small | ≤380px | Display 34px 유지, 지표 스트립 3열 → 1열 |

> 모바일에서 헤더 네비를 **햄버거 대신 제거**한 이유: 랜딩 1페이지 + 앵커 5개뿐이라 메뉴 오버레이는 과설계. 스크롤 자체가 네비게이션이며, 전환 버튼만 상시 노출하는 편이 CVR 에 유리하다. (햄버거가 필수 요구면 §10 flag 참조)

---

## 5. 컴포넌트 명세

각 컴포넌트는 dev 구현 시 그대로 매핑 가능하도록 **클래스명 / props(데이터 속성) / 상태 / 인터랙션**을 정의한다. 구현 스택이 정해지지 않았으므로(현행 vanilla) props 는 **HTML 데이터 계약**으로 표기하고, 컴포넌트 프레임워크 도입 시 동일 이름의 prop 으로 1:1 치환한다.

### 5.1 `lc-header` (sticky 네비)

| 항목 | 값 |
|------|-----|
| 구조 | 좌: 워드마크 `LiveCart` / 중: 앵커 링크 5개(핵심 가치·기능·고객 사례·요금제·문의) / 우: `lc-btn--ghost`(로그인) + `lc-btn--primary`(무료로 시작) |
| props | `variant: "transparent" \| "solid"` — 초기 transparent(히어로 위), scrollY>24 에서 solid(흰 배경 + 하단 1px border + 그림자) |
| 상태 | default / hover(링크 밑줄 2px `--lc-primary`) / focus-visible(2px outline `--lc-secondary`, offset 2px) |
| 인터랙션 | 앵커 클릭 → `scroll-behavior: smooth` (CSS만, JS 불필요). solid 전환은 JS 1줄 또는 목업처럼 solid 고정도 허용 |
| 높이 | 64px (모바일 56px), `position: sticky; top: 0; z-index: 50` |

### 5.2 `lc-hero`

| 항목 | 값 |
|------|-----|
| 배경 | `linear-gradient(160deg, #0B0C15 0%, #171932 62%, #241B3D 100%)` + 우상단 코럴 radial glow(`rgba(255,45,111,.22)`, blur) |
| 좌열 | `lc-eyebrow`(pill: "🔴 LIVE COMMERCE SaaS") → H1 → Lead → CTA 2개 → `lc-hero__note`(캡션: "신용카드 없이 14일 무료 · 5분 셋업") → `lc-metric-strip` |
| H1 카피 | **"방송 켜는 순간, 매출이 켜집니다."** (2줄, `keep-all`) |
| Lead 카피 | "라이브 방송·상품·주문·정산을 한 화면에서. 라이브를 하지 않는 날에도 커머스는 계속 돌아갑니다." ← 겸용 메시지를 히어로에서 미리 심는다 |
| CTA | primary "무료로 시작하기" / ghost-on-dark "라이브 데모 보기" |
| 우열 | `lc-live-preview` (아래) |
| props | `headline`, `subcopy`, `primaryCta{label,href}`, `secondaryCta{label,href}`, `metrics[]` |

**`lc-metric-strip`** — 3칸 grid, 각 칸: `value`(Metric 스타일, `--lc-accent` 아님 → 다크 배경이므로 `#3DDCA8` 밝은 변형 사용) + `label`(Caption, `--lc-on-ink-mute`)
- 값: `4.2×` 평균 구매 전환율 / `5분` 방송 셋업 시간 / `+38%` 방송당 GMV

### 5.3 `lc-live-preview` (히어로 우측 시각 증거)

| 항목 | 값 |
|------|-----|
| 구조 | 다크 카드(`--lc-bg-ink-2`, radius 20px, border `--lc-border-ink`) 안: ① 상단바(LIVE 배지 + 👁 시청자 `1,284명`) ② 16:9 방송 화면 placeholder(그라데이션 + 중앙 재생 아이콘) ③ 하단 실시간 구매 토스트 2줄 ④ 우하단 상품 카드(썸네일+가격+"바로 구매" 버튼) |
| LIVE 배지 | 코럴 pill + 6px 흰 도트, 도트에 `pulse` 애니메이션(1.6s, opacity 1→.35→1 + scale) |
| props | `viewers:number`, `toasts[]{user, product}`, `product{name, price, thumb}` |
| 접근성 | 장식용 → 카드 전체 `aria-hidden="true"` 는 **금지**(가격 정보가 있음). 대신 `role="img"` + `aria-label="라이브 방송 화면 예시 — 시청자 1,284명, 실시간 구매 알림"` 로 요약 제공 |
| 모션 | `@media (prefers-reduced-motion: reduce) { animation: none; }` **필수** |

### 5.4 `lc-value-card` (핵심 가치 — 3개)

| props | `icon`(이모지/인라인 SVG), `title`, `desc`, `proof`(캡션 — 숫자 근거) |
|---|---|
| 상태 | default / hover(`translateY(-4px)`, 그림자 강화, 200ms ease) / focus-within |
| 3개 콘텐츠 | ① **끊김 없는 시청→구매 동선** — "영상 위 상품 카드 탭 1회로 결제까지. 이탈 구간을 없앴습니다." (proof: 평균 결제 단계 4→1) ② **재고·주문·정산 자동 연동** — "방송 중 팔린 재고가 실시간으로 차감되고, 주문은 기존 커머스 주문과 같은 테이블로 흐릅니다." (proof: 수기 대사 0건) ③ **방송이 끝나도 남는 자산** — "하이라이트 클립·상품 페이지·CRM 세그먼트가 자동 생성됩니다." (proof: 방송 후 D+7 재구매 +21%) |

### 5.5 `lc-feature-grid` + `lc-feature-split`

- **`lc-feature-grid`**: 6개 기능 아이템 3×2. props `items[]{icon, title, desc}`
  - 실시간 스트리밍(저지연 2s), 오버레이 상품 핀, 라이브 채팅·모더레이션, 쿠폰/타임세일 스케줄러, 멀티채널 동시 송출, 실시간 대시보드
- **`lc-feature-split`**: 지그재그 2블록(이미지 placeholder ↔ 텍스트 좌우 반전). props `reverse:boolean`, `title`, `desc`, `bullets[]`(체크 아이콘 `--lc-accent`)
  - 블록 A: "라이브를 위한 스튜디오" / 블록 B: "**라이브가 없는 날의 커머스**" ← 겸용 메시지의 기능적 근거를 Pricing 이전에 배치

### 5.6 `lc-social-proof`

| 하위 | 명세 |
|------|------|
| `lc-logo-row` | 고객사 워드마크 6개(텍스트 placeholder, `--lc-ink-400`, `filter: grayscale(1)`, hover 시 컬러 복귀). 캡션: "3,200+ 브랜드가 사용 중" |
| `lc-testimonial` ×3 | props `quote`, `author`, `role`, `company`, `tier`("소상공인"\|"중견 브랜드"\|"엔터프라이즈"), `metric`(강조 결과값) — tier 배지 색: 소상공인 `--lc-accent` / 중견 `--lc-secondary` / 엔터프라이즈 `--lc-ink-600` |
| 후기 3번째 | **일반 커머스로 먼저 도입한 고객**의 목소리를 넣어 겸용 서사를 보강: "라이브는 분기 1회지만, 매일 쓰는 건 주문·CRM 이었습니다." |

### 5.7 `lc-btn`

| variant | 배경 | 라벨 | hover | active | focus-visible | disabled |
|---------|------|------|-------|--------|---------------|----------|
| `--primary` | `--lc-primary` | #FFF / 700 / 16px | `#E82260` + `translateY(-1px)` + shadow-lg | `translateY(0)` scale .99 | 2px `--lc-secondary` outline, offset 2px | opacity .5, `cursor:not-allowed` |
| `--secondary` | `--lc-secondary` | #FFF | `#5B3BE0` | 동일 | 동일 | 동일 |
| `--ghost` | transparent + 1px `--lc-border` | `--lc-ink-900` | 배경 `--lc-canvas` | 동일 | 동일 | 동일 |
| `--ghost-on-dark` | transparent + 1px `rgba(255,255,255,.28)` | `#FFF` | 배경 `rgba(255,255,255,.08)` | 동일 | outline `#FFF` | 동일 |

공통: height 48px(모바일 52px), padding 0 24px, radius `--lc-r-pill`, transition 160ms ease. **모든 CTA 는 `<a>` 또는 `<button>` 시맨틱 유지, 최소 터치 타깃 44×44px.**

### 5.8 `lc-cta-band` (최종 CTA) · `lc-footer`

- `lc-cta-band`: 다크 잉크 배경 + 중앙 정렬. H2 "오늘 방송, 오늘 매출." + Lead + primary CTA + ghost-on-dark("영업팀과 상담") + 캡션("신용카드 불필요 · 언제든 해지").
- `lc-footer`: 4열(제품/솔루션/리소스/회사) + 하단 저작권 줄. 다크 배경, 링크 `--lc-on-ink-mute` → hover `#FFF`.

---

## 6. Pricing 섹션 상세 — 라이브 전용 vs 일반 커머스 겸용

> **Epic 핵심 요구**: "일반 커머스 고객도 쓸 수 있다"를 요금제에서 설득력 있게 드러낼 것.

### 6.1 구조 결정 — 탭 전환이 아닌 **2트랙 동시 노출**

세그먼트 토글(탭)로 두 트랙을 감추면 *일반 커머스 방문자는 "라이브 전용 서비스"라고 오해한 채 이탈*한다. 따라서 **한 섹션 안에 트랙 A / 트랙 B 를 세로로 모두 노출**하고, 그 사이를 **브리지 문구 + 겸용 비교표**로 연결한다. (JS 상태 없음 → `vanilla-static` 에 유리)

```
[ PRICING eyebrow ]
H2  라이브를 하든, 하지 않든 — 커머스는 계속됩니다.
Lead 라이브 전용 플랜과 일반 커머스 겸용 플랜을 따로 준비했습니다. 언제든 서로 전환할 수 있습니다.

┌ 트랙 A · 라이브커머스 전용 ─────────────────────────┐   (트랙 헤더: 코럴 좌측 4px 바 + 배지 "LIVE")
│  Live Starter │ Live Growth ★추천 │ Live Scale     │
└──────────────────────────────────────────────────┘
        ↕  [ lc-bridge ] "라이브는 아직인가요? 커머스 기능만 먼저 쓰고, 준비되면 애드온으로 방송을 켜세요."
┌ 트랙 B · 일반 커머스 겸용 ───────────────────────────┐   (트랙 헤더: 바이올렛 좌측 4px 바 + 배지 "COMMERCE")
│  Commerce Core  │  Commerce Plus                   │
└──────────────────────────────────────────────────┘
[ lc-compare-table ] 4열 비교 — 어떤 플랜이 내 얘기인지 1표로 확인
[ 캡션 ] 모든 플랜: 14일 무료 · 계약 기간 없음 · 트랙 간 이동 시 데이터 100% 유지
```

### 6.2 플랜 명세 (`lc-plan-card` props: `track`, `name`, `price`, `period`, `target`, `value`, `features[]`, `cta`, `recommended:boolean`)

#### 트랙 A — 라이브커머스 전용 (`track: "live"`, 액센트 `--lc-primary`)

| 플랜 | 금액 | **타깃** | **가치 문구** | 주요 포함 |
|------|------|----------|---------------|-----------|
| **Live Starter** | ₩0 /월 (수수료 3.5%) | 이제 첫 방송을 해보려는 1인 셀러 | "고정비 0원으로, 첫 방송의 매출을 먼저 확인하세요." | 월 3회 방송, 동시 시청 300명, 상품 핀·채팅, 기본 대시보드 |
| **Live Growth** ★ | ₩149,000 /월 (수수료 1.5%) | 주 1회 이상 정기 방송을 돌리는 성장 브랜드 | "방송이 루틴이 되는 순간, 수수료가 아니라 고정비가 이깁니다." | 무제한 방송, 동시 5,000명, 멀티채널 송출, 쿠폰·타임세일, 하이라이트 자동 클립, 실시간 GMV 대시보드 |
| **Live Scale** | 별도 문의 | 자체 앱/여러 브랜드를 운영하는 엔터프라이즈 | "우리 앱 안에서, 우리 브랜드로 방송하세요." | Growth 전체 + 임베드 SDK·화이트라벨, SSO, 전용 CSM, SLA 99.9% |

#### 트랙 B — 일반 커머스 겸용 (`track: "commerce"`, 액센트 `--lc-secondary`)

| 플랜 | 금액 | **타깃** | **가치 문구** | 주요 포함 |
|------|------|----------|---------------|-----------|
| **Commerce Core** | ₩89,000 /월 | 라이브 계획은 없지만 상품·주문·CS 를 한 곳에서 관리하려는 일반 커머스 | "라이브 기능값은 내지 마세요. **쓰는 만큼만 냅니다.**" | 상품·재고·주문·배송, 고객/CRM 세그먼트, 결제·정산 리포트, 기본 스토어프론트 **(라이브 기능 미포함 — 요금에서 제외)** |
| **Commerce Plus** | ₩119,000 /월 + **라이브 애드온 ₩59,000** | 분기·시즌마다 이벤트성 방송만 하는 커머스 | "평소엔 커머스, 필요할 때만 라이브. **애드온은 언제든 끄고 켤 수 있습니다.**" | Core 전체 + 자동화 워크플로·A/B 테스트 / *애드온 활성 시*: 월 2회 방송, 동시 1,000명, 상품 핀 |

> **설득 장치 3종** (dev 는 이 3개를 반드시 UI 로 살릴 것)
> 1. **"라이브 기능값은 내지 마세요"** — Commerce Core 카드 안에 *"라이브 기능 미포함"*을 **취소선이 아닌 회색 dash 아이콘 + 명시 문구**로 당당하게 표기 → 감춘 게 아니라 *가격에서 뺀 것*임을 전달.
> 2. **`lc-bridge` 브리지 밴드** — 두 트랙 사이 전폭 밴드(`--lc-secondary-050` 배경, 좌우 화살표 아이콘): *"라이브는 아직인가요? 커머스로 시작해서, 준비되면 애드온으로 켜세요. 데이터는 그대로 이어집니다."*
> 3. **트랙 간 이동 보증 캡션** — 섹션 하단: *"트랙 간 전환 시 상품·주문·고객 데이터 100% 유지, 위약금 없음."*

#### `lc-plan-card` 상태 정의

| 상태 | 스타일 |
|------|--------|
| default | `--lc-surface`, 1px `--lc-border`, radius 20px, padding 32px 24px |
| `recommended` | border 2px `--lc-primary`, 배경 `--lc-primary-050`, `--lc-shadow-lg`, 상단 중앙 pill 배지 "가장 많이 선택", `transform: scale(1.03)`(≥1024px 에서만 — 모바일은 scale 제거) |
| hover | `translateY(-4px)` + 그림자 강화 (recommended 는 scale 유지) |
| focus-within | outline 2px `--lc-secondary`, offset 3px |
| track 식별 | 카드 상단 4px 컬러 바 (live=코럴, commerce=바이올렛) — **색만이 아니라 카드 상단 텍스트 배지("LIVE"/"COMMERCE")도 병기** |

### 6.3 `lc-compare-table` (겸용 설득의 최종 근거)

4열: **비교 항목 | Live 트랙 | Commerce Core | Commerce Plus + 애드온**
행(8): 라이브 방송 / 상품·재고 관리 / 주문·배송 / CRM·세그먼트 / 정산 리포트 / 멀티채널 송출 / 하이라이트 클립 / 월 고정비
표기: 포함 `✓`(`--lc-accent`) / 미포함 `–`(`--lc-ink-400`) / 조건부 `애드온`(바이올렛 pill)

- 접근성: `<table>` + `<caption>` + `<th scope="col|row">`, 아이콘 셀에는 `<span class="sr-only">포함/미포함</span>` 병기 (아이콘만으로 의미 전달 금지).
- **≤767px**: 표를 카드 스택으로 전환 — 각 플랜이 1카드, 행 항목이 라벨-값 리스트. (`display:block` + `::before{content:attr(data-label)}` 패턴)
- 768–1023px: `overflow-x: auto` + 첫 열 `position: sticky; left:0`.

---

## 7. dev 구현 가이드 (후속 구현 Epic 용)

> 본 Epic 은 designer-only 이므로 아래는 **후속 구현 task 를 위한 사전 지침**이다.

1. **파일 구성** — `live-commerce/index.html`, `live-commerce/style.css` (+ 헤더 solid 전환/부드러운 스크롤에 JS 가 필요하면 `live-commerce/landing.js` 1개까지). 외부 CDN·번들러 금지, `file://` 로 열려야 한다.
2. **토큰 먼저** — `style.css` 최상단 `:root` 에 §2.1 / §3 / §4.2 변수를 **그대로** 선언. 이후 CSS 어디에서도 **HEX 하드코딩 금지**(그라데이션 정의부 제외).
3. **섹션 골격** — `<header class="lc-header">` → `<main>` 안에 `<section id="hero|values|features|proof|pricing|cta">` 6개 → `<footer class="lc-footer">`. 헤더 앵커는 이 id 와 1:1.
4. **클래스 네이밍** — 블록 `lc-<block>`, 엘리먼트 `lc-<block>__<el>`, 수식어 `lc-<block>--<mod>` (BEM). §5 표의 이름을 그대로 사용.
5. **그리드** — 카드 열은 전부 `grid-template-columns: repeat(auto-fit, minmax(260px,1fr))`. 미디어쿼리는 §4.3 의 3개(1023/767/380)만 사용.
6. **Pricing** — 트랙 A/B 를 **각각 별도 `<div class="lc-track">`** 으로 감싸고 `data-track="live|commerce"` 부여. 카드 액센트는 `[data-track="live"] .lc-plan-card { --plan-accent: var(--lc-primary); }` 식으로 **로컬 변수 1개만 스위치**.
7. **접근성 체크리스트** — ① 모든 상호작용 요소 `:focus-visible` 링 ② 아이콘 단독 의미 전달 금지(sr-only 텍스트 병기) ③ `prefers-reduced-motion` 에서 pulse 정지 ④ 대비 §2.2 준수 ⑤ heading 계층 h1(1개)→h2(섹션)→h3(카드) 위반 금지.
8. **성능** — 이미지 없음(placeholder 는 CSS 그라데이션/도형). 실제 스크린샷 도입 시 `loading="lazy"` + 고정 `width/height` 로 CLS 0 유지.
9. **검증** — `node --test tests/live-commerce-*.test.js` (구현 시 테스트 파일 신설). scope=focused 이므로 타 모듈 회귀는 CI 위임.

---

## 8. mockup 참조

- 경로: **`docs/design/mockups/live-commerce-landing-BF-814.html`**
- 단일 self-contained HTML — 외부 의존성 0건, 인라인 `<style>`, system font. `file://` 더블클릭으로 열림.
- 포함 범위: 헤더 → 히어로(라이브 프리뷰 카드 포함) → 핵심 가치 3 → 기능 6 + 지그재그 2 → 소셜프루프(로고·후기 3) → **Pricing 2트랙 + 브리지 + 비교표** → 최종 CTA → 푸터 (전 섹션).
- 목업은 **시안 시각화 전용**이며 dev 산출물이 아니다. dev 는 픽셀 단위 일치 의무가 없고, §2–§6 의 토큰/규칙이 source of truth 다.
- 반응형 확인: 브라우저 폭 1280 / 900 / 375 에서 레이아웃 붕괴 없음(가로 스크롤 미발생) 확인함.

---

## 9. AC ↔ 산출물 매핑 표

| # | Epic 수용 기준 | 충족 산출물 | 위치 |
|---|----------------|-------------|------|
| AC-1 | `docs/design/live-commerce-landing-BF-813.md` 에 **섹션 구조·디자인 토큰(컬러/타이포/스페이싱)·컴포넌트 명세·반응형 브레이크포인트** 문서화 | 본 문서 | 섹션 구조 §1.1 / 컬러 §2.1 / 타이포 §3 / 스페이싱 §4.2 / 컴포넌트 §5 / 브레이크포인트 §4.3 |
| AC-2 | Pricing 에 **라이브 전용 · 일반 커머스 겸용 플랜이 구분**되어 제시되고 각 플랜의 **타깃/가치 문구** 명시 | 본 문서 §6.2 (트랙 A 3플랜 · 트랙 B 2플랜, 각 플랜 타깃/가치 열) + 설득 장치 3종 + 비교표 §6.3 / 목업 Pricing 섹션 | §6, mockup `#pricing` |
| AC-3 | 목업 HTML 을 `file://` 로 열면 **외부 의존성 없이 히어로~CTA 전 섹션 렌더**, 데스크톱/모바일 폭에서 **레이아웃 미붕괴** | 목업 HTML (인라인 style, system font, 이미지/폰트/스크립트 외부 요청 0건, 미디어쿼리 3단) | `docs/design/mockups/live-commerce-landing-BF-814.html` |
| AC-4 | PR 본문에 **Epic AC ↔ 산출물 매핑 표** 포함 | PR 본문 `## Self-critique` 상단 매핑 표 (본 §9 와 동일) | PR 본문 |

---

## 10. Self-critique

| # | 체크 항목 | 결과 |
|---|-----------|------|
| 1 | **AC 매핑** — 모든 AC 가 산출물의 특정 위치로 추적되는가 | ✅ §9 표 4행 전부 파일·섹션 단위로 지목. AC-3(무의존성)은 목업에 `<link>`/`<script src>`/`<img src>` 가 0건임을 확인. |
| 2 | **dev 구현 가이드** — 파일·클래스·변수까지 지시했는가 | ✅ §7 에 파일 구성·BEM 네이밍·`:root` 토큰·미디어쿼리 3개·`data-track` 스위치·접근성 5항목·검증 명령까지 명시. 단, **본 Epic 은 designer-only 라 즉시 소비할 dev 가 없음** — 후속 Epic 용 사전 지침으로 남긴다. |
| 3 | **기존 요소 보존** — 기존 모듈/토큰을 침범하지 않는가 | ✅ 신규 랜딩이라 기존 파일 변경 0건. CSS 변수 프리픽스 `--lc-*` 는 기존 `--it-*`/`--ith-*`/게임 모듈과 충돌 없음. 수정 범위도 `docs/design/**` 내부에만 존재. |
| 4 | **컴포넌트 매핑** — 시안의 모든 UI 요소가 컴포넌트 명세를 갖는가 | ✅ header/hero/live-preview/metric-strip/value-card/feature-grid/feature-split/logo-row/testimonial/plan-card/bridge/compare-table/btn/cta-band/footer — 목업에 등장하는 15개 블록 전부 §5–§6 에 props·상태·인터랙션 정의. |
| 5 | **모호함 flag** | ⚠️ 아래 4건 — 후속 구현 Epic 게시 전 운영자 판단 권장 |

### 모호함 flag (운영자 확인 요망)

1. **가격·지표 수치는 전부 placeholder** — ₩0/₩89,000/₩119,000/₩149,000, "4.2×", "3,200+ 브랜드", 후기·로고 전부 시안용 더미다. 실제 사업 수치가 확정되면 **문구만 교체**하면 되도록 레이아웃은 자릿수 변동(최대 8자)에 견디게 설계했다.
2. **제품명 `LiveCart`** — 브랜드명 미지정이라 가칭 사용. 확정 시 워드마크/푸터 텍스트만 치환하면 된다(로고 이미지 의존 없음).
3. **모바일 헤더에 햄버거 메뉴 없음** — 앵커 5개뿐인 1페이지 랜딩이라 의도적으로 생략하고 CTA 만 남겼다(§4.3 각주). 메뉴가 필수 요구면 오버레이 드로어 스펙을 추가하겠다.
4. **명세 파일명이 task 키(BF-814)가 아닌 Epic 키(BF-813)** — AC 에 경로가 리터럴로 박혀 있어 AC 를 따랐다(선례: `incident-triage-history-BF-806.md` + mockup `-BF-808.html`). mockup 만 task 키를 쓴다.

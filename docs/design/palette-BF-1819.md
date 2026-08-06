# 팔레트 페이지 시각 명세 (BF-1819)

> 작성: designer (이디자인) · Task BF-1820
> 근거 계약: `ui-contract@v1`, `planning-contract@v1` (frozen blueprint) — `docs/plans/BF-1819/implementation-plan.md`
> 본 문서는 frozen UI 계약을 **시각 명세**로 구체화한 것으로, selector·token·state·hex·색상 이름을 **재정의하지 않고 그대로** 반영합니다.
> 파일·소유권·상태 계약의 유일한 권위는 frozen blueprint 이며, 본 문서는 이를 재할당·재정의하지 않습니다.
> 본 문서 범위는 시각 명세뿐이며 런타임 HTML/CSS/JS 를 생성하지 않습니다 (developer 가 `iteration-check2/**` 에서 구현).

---

## 1. 시안 개요

### 변경 범위
브랜드 색상 4종(Primary / Secondary / Accent / Neutral)을 카드 그리드로 제시하고, 각 카드에서 hex 값을 클립보드로 복사할 수 있는 정적(vanilla-static) 팔레트 페이지의 **시각 시안**입니다.

- observed stack: `vanilla-static` (외부 의존성 0건, system font, CSS 변수 자체 정의)
- 신규 UI 요소·역할을 추가하지 않습니다 — frozen 계약의 selector/token/state 만 시각화합니다.

### 사용자 경험 목표
1. 4개 브랜드 색상을 **스와치(색상 견본) + 색상 이름 텍스트 + hex 값** 세트로 한눈에 파악한다.
2. "복사" 버튼 하나로 hex 값을 클립보드에 담아 코드/디자인에 즉시 재사용한다.
3. 복사 성공/실패 피드백을 **색상에 의존하지 않고 텍스트로도** 인지한다 (접근성).
4. 320px 이상 어떤 폭에서도 overflow 없이 카드가 재배치되어 좁은 화면에서도 사용 가능하다.

---

## 2. 컬러 팔레트

### 2.1 Design token (frozen — exact 값)

CSS 변수는 아래 exact 값으로 고정합니다. designer/developer 모두 이 값을 변경하지 않습니다.

```css
:root {
  --brand-primary:   #2563eb;
  --brand-secondary: #7c3aed;
  --brand-accent:    #f59e0b;
  --brand-neutral:   #111827;
  --palette-card-gap: 16px;
}
```

### 2.2 브랜드 색상 4종 (frozen — 순서·이름·hex 고정)

카드는 아래 4색을 **이 순서대로** 렌더링합니다. 색상 이름 텍스트와 표시·복사되는 hex 값(대문자 6자리)은 고정입니다.

| 순서 | 색상 이름 텍스트 | 표시·복사 hex 값 | 스와치 배경 token | 스와치 위 텍스트 대비색 |
| --- | --- | --- | --- | --- |
| 1 | Primary   | `#2563EB` | `var(--brand-primary)`   | 흰색 계열 (어두운 스와치) |
| 2 | Secondary | `#7C3AED` | `var(--brand-secondary)` | 흰색 계열 (어두운 스와치) |
| 3 | Accent    | `#F59E0B` | `var(--brand-accent)`    | 짙은 뉴트럴 (`#111827`) — 밝은 스와치 |
| 4 | Neutral   | `#111827` | `var(--brand-neutral)`   | 흰색 계열 (어두운 스와치) |

> - `.palette__swatch` 배경은 각 색상의 token 을 사용합니다.
> - `.palette__value` 에 표시·복사되는 값은 위 hex 문자열(대문자 6자리)입니다. token 정의는 소문자, 표시값은 대문자 — 계약 그대로 유지합니다.
> - 색상 이름 텍스트는 스와치 색상에만 의존하지 않고 **항상 시각적으로 노출**됩니다 (§5·§7 접근성).

### 2.3 페이지 표면·텍스트 색 (시각 가이드, 비-frozen)

frozen token 외 배경/텍스트는 아래 권장값을 사용합니다. 이 값들은 계약 token 이 아니므로 developer 재량 조정 가능하되, 4.5:1 이상 대비를 유지합니다.

| 용도 | 권장값 | 비고 |
| --- | --- | --- |
| 페이지 배경 | `#f9fafb` | 카드가 떠 보이도록 밝은 뉴트럴 |
| 카드 배경 | `#ffffff` | 스와치·텍스트 영역 표면 |
| 카드 테두리 | `#e5e7eb` | 1px, 저채도 |
| 본문 텍스트 | `var(--brand-neutral)` (`#111827`) | 색상 이름·값 텍스트 |
| 보조 텍스트 | `#6b7280` | 라벨·상태 보조 안내 |

---

## 3. 타이포그래피

외부 폰트 로드 없이 **system font stack** 을 사용합니다 (vanilla-static 규약).

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Apple SD Gothic Neo",
             "Noto Sans KR", sans-serif;
```

| 역할 | 요소(예) | font-size | font-weight | line-height | letter-spacing |
| --- | --- | --- | --- | --- | --- |
| 페이지 제목 (heading) | 페이지 상단 `<h1>` | 24px | 700 | 1.3 | -0.01em |
| 색상 이름 (subheading) | `.palette__card` 내 이름 텍스트 | 16px | 600 | 1.4 | 0 |
| hex 값 (mono-body) | `.palette__value` | 15px | 500 | 1.4 | 0.02em (monospace) |
| 버튼 라벨 (action) | `.palette__copy` | 14px | 600 | 1 | 0 |
| 상태 안내 (caption) | `#palette-status` | 14px | 500 | 1.4 | 0 |

> - `.palette__value` 는 hex 문자열 가독성을 위해 monospace 계열 권장: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`.
> - 폰트 크기는 상대 단위(`rem`)로 구현해도 무방하나, 위 px 는 기준 시각 크기입니다.

---

## 4. 레이아웃

### 4.1 섹션 구조

```
#palette-root .palette
├─ <h1> 페이지 제목 ("브랜드 팔레트" 등 — placeholder 가능)
├─ #palette-grid                      ← 카드 그리드 컨테이너
│   ├─ .palette__card (Primary)
│   ├─ .palette__card (Secondary)
│   ├─ .palette__card (Accent)
│   └─ .palette__card (Neutral)
└─ #palette-status  (aria-live=polite) ← 복사 피드백 라이브 영역
```

- `#palette-status` 는 그리드 **하단(또는 상단 고정)** 에 1개만 두어, 어떤 카드에서 복사하든 이 단일 영역으로 상태를 안내합니다.

### 4.2 spacing

| 항목 | 값 | 근거 |
| --- | --- | --- |
| 카드 간 간격(그리드 gap) | `var(--palette-card-gap)` = **16px** | frozen token |
| 페이지 좌우 padding | 16px (모바일) ~ 24px (데스크탑) | 320px 하한에서 overflow 방지 |
| 카드 내부 padding | 16px | 스와치·텍스트·버튼 여백 |
| 카드 내 요소 세로 간격 | 12px | 스와치→이름→값→버튼 |

### 4.3 카드 내부 구성 (`.palette__card`)

세로 스택 구조:

```
┌───────────────────────────┐
│  .palette__swatch          │  ← 색상 견본 (배경=token, 높이 ≈ 88px)
│  (배경 위 색상 이름 표기 옵션) │
├───────────────────────────┤
│  색상 이름 텍스트 (Primary)  │  ← 스와치와 별개로 항상 노출
│  .palette__value  #2563EB  │  ← 표시·복사 대상 hex (대문자)
│  ┌─────────────────────┐   │
│  │ .palette__copy [복사] │   │  ← <button>, 키보드 포커스 가능
│  └─────────────────────┘   │
└───────────────────────────┘
```

- 카드와 복사 버튼 모두 키보드 포커스 대상입니다 (§5·§7).

### 4.4 breakpoint 별 동작 (frozen 반응형 계약)

CSS Grid `repeat(auto-fit, minmax(...))` 또는 동등 기법으로 **320px 이상에서 content overflow 없이 1~4열**로 재배치합니다.

| 뷰포트 폭 | 열 수 | 카드 최소폭 기준 |
| --- | --- | --- |
| ≈320px (하한) | 1열 | 카드가 컨테이너 폭에 맞춰 축소, overflow 없음 |
| ~480px | 2열 | `minmax(~140px, 1fr)` 도달 시 |
| ~720px | 3열 | |
| ≥ ~960px | 4열 (최대) | 4색이므로 4열이 상한 |

권장 구현:
```css
#palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--palette-card-gap);
}
```
> - `minmax` 하한(예 140px)은 320px 뷰포트에서 1열이 되도록 좌우 padding 을 감안해 조정합니다.
> - 320px 미만은 계약 범위 밖입니다 (하한 미만 overflow-free 는 요구하지 않음 — plan §9 E4).

---

## 5. 컴포넌트 명세

frozen selector 를 그대로 사용합니다. 아래는 각 요소의 역할·상태·인터랙션 정의입니다.

### 5.1 컨테이너 (DOM ID — exact)

| ID | 요소 | 역할 | 속성 |
| --- | --- | --- | --- |
| `palette-root` | `<div>`(또는 `<main>`) | 페이지 루트 컨테이너. class `palette` 부여 | — |
| `palette-grid` | `<div>` | 색상 카드 그리드 컨테이너 | 4개 `.palette__card` 포함 |
| `palette-status` | `<div>`(또는 `<p>`) | 복사 피드백 라이브 영역 | `aria-live="polite"` (필수) |

### 5.2 카드 컴포넌트 (CSS class — exact)

| class | 요소 | 역할 | 데이터 |
| --- | --- | --- | --- |
| `palette` | 루트 | 팔레트 블록 (BEM 블록) | — |
| `palette__card` | `<div>`/`<article>` | 개별 색상 카드. 키보드 포커스 가능 | `PaletteItem` 1건 |
| `palette__swatch` | `<div>` | 색상 견본. `background: var(--brand-*)` | token |
| `palette__value` | `<span>`/`<code>` | 표시·복사되는 hex 값(대문자) | hex |
| `palette__copy` | `<button>` | 복사 실행 control. `aria-label` 필수 | — |

### 5.3 데이터 모델 (`PaletteItem` — plan §8 그대로)

| 필드 | 타입 | 값/제약 |
| --- | --- | --- |
| `name` | string | 색상 이름 텍스트 (`Primary` / `Secondary` / `Accent` / `Neutral`) |
| `hex` | string | 대문자 6자리 hex (`#2563EB` / `#7C3AED` / `#F59E0B` / `#111827`) |
| `token` | string | 대응 CSS 변수명 (`--brand-primary` 등) |

4개 항목은 §2.2 순서·값으로 고정됩니다.

### 5.4 상태 (States — exact, frozen)

`.palette__copy` 버튼과 `#palette-status` 로 표현되는 3개 상태입니다. **모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출**합니다.

| 상태 | 버튼 화면 텍스트 | `#palette-status` 텍스트 | 진입 조건 | 시각 표현(가이드) |
| --- | --- | --- | --- | --- |
| `idle` | "복사" | (빈 값 또는 안내 없음) | 초기 상태 / 복사 후 초기화 / 취소·실패 복구 후 | 기본 버튼 스타일, 뉴트럴 |
| `copied` | "복사됨" | "복사됨" (색상 이름 포함 가능: "Primary #2563EB 복사됨") | 클립보드 복사 성공 | 성공 강조(예: 체크 아이콘/굵기), **텍스트 병행** |
| `error` | "복사 실패" | "복사 실패" | 클립보드 API 부재/거부/reject | 오류 강조(예: 경고색), **텍스트 병행** |

> - 상태 강조에 색을 써도 되지만, **색이 유일 신호가 되면 안 됩니다** — 항상 상태명 텍스트를 병행합니다.
> - `copied`/`error` 는 타임아웃 또는 후속 상호작용 후 `idle` 로 복구되고, `.palette__copy` 는 다시 사용 가능해야 합니다 (plan AC-3).

### 5.5 인터랙션

| 트리거 | 대상 | 결과 |
| --- | --- | --- |
| 클릭 / Enter / Space | `.palette__copy` | 해당 카드 hex 를 클립보드에 write → 성공 시 `copied`, 실패 시 `error` |
| Tab / Shift+Tab | `.palette__card`, `.palette__copy` | 키보드 포커스 이동 (모두 포커스 가능) |
| hover / focus | `.palette__copy` | 시각 강조(배경/테두리 변화) — 상태 의미 전달은 아님, affordance 용 |
| 타임아웃(≈1.5~2s) | `copied`/`error` → `idle` | 상태·`#palette-status` 초기화, 재복사 가능 |
| 연속 클릭 | `.palette__copy` | 이전 상태 표시 초기화 후 최신 결과만 반영 (plan §9 E3) |

**포커스 표시**: `.palette__card`, `.palette__copy` 는 `:focus-visible` 시 2px outline(예: `var(--brand-primary)`) 등 명확한 포커스 링을 노출합니다.

---

## 6. dev 구현 가이드

developer(BF-1821)가 `iteration-check2/palette.html|js|test.js` 를 구현할 때 따라야 할 지침입니다. selector·token·상태·hex·이름은 §2·§5 값을 **그대로** 사용합니다.

### 6.1 마크업 골격 (`palette.html` — 참조용, 픽셀 일치 의무 없음)

```html
<main id="palette-root" class="palette">
  <h1>브랜드 팔레트</h1>

  <div id="palette-grid">
    <!-- 카드 1: Primary -->
    <article class="palette__card" tabindex="0">
      <div class="palette__swatch" style="background: var(--brand-primary)"></div>
      <span class="palette__name">Primary</span>
      <code class="palette__value">#2563EB</code>
      <button class="palette__copy" type="button"
              aria-label="Primary #2563EB 복사">복사</button>
    </article>

    <!-- 카드 2~4: Secondary / Accent / Neutral 동일 구조 -->
  </div>

  <div id="palette-status" aria-live="polite"></div>
</main>
```

> - 색상 이름 텍스트 요소의 class(`palette__name`)는 frozen 목록에 없는 보조 class 입니다. developer 재량으로 명명하되, frozen class(`palette`, `palette__card`, `palette__swatch`, `palette__value`, `palette__copy`)는 **정확히** 사용해야 합니다.
> - 카드 데이터 4건을 JS 배열(`PaletteItem[]`)로 정의해 반복 렌더링하거나, 정적 마크업으로 직접 작성해도 됩니다.

### 6.2 CSS 변수·클래스 권장

- `:root` 에 §2.1 token 5개를 exact 값으로 선언합니다 (하드코딩 색상 금지 — 스와치 배경은 `var(--brand-*)`).
- 그리드: §4.4 `repeat(auto-fit, minmax(140px, 1fr))` + `gap: var(--palette-card-gap)`.
- 상태 class 권장(예): 버튼/상태 영역에 `is-copied`, `is-error` 를 토글하되, 반드시 **텍스트도 함께** 갱신합니다.

### 6.3 복사 로직 (`palette.js`, ESM)

1. `.palette__copy` 클릭/키보드 활성화 시 해당 카드의 hex 문자열을 `navigator.clipboard.writeText(hex)` 로 write.
2. 성공(resolve) → `copied` 상태: 버튼 텍스트 "복사됨", `#palette-status` 에 상태명 텍스트 갱신.
3. 실패(reject / `navigator.clipboard` 부재 / 비보안 컨텍스트) → `error` 상태: 버튼 텍스트 "복사 실패", `#palette-status` 갱신.
4. 타임아웃(≈1.5~2s) 후 `idle` 로 복구: 버튼 텍스트 "복사", `#palette-status` 초기화, 재복사 가능.
5. 연속 클릭 시 이전 타이머/상태를 clear 후 최신 결과만 반영.

### 6.4 접근성 체크

- 각 `.palette__copy` 에 색상 이름 포함 `aria-label`(예: `"Primary #2563EB 복사"`).
- `#palette-status` 에 `aria-live="polite"`.
- `.palette__card`, `.palette__copy` 키보드 포커스 가능 (버튼은 `<button>` 사용, 카드는 필요 시 `tabindex="0"`).
- 상태(idle/copied/error)를 색상만이 아닌 텍스트로 구분.

### 6.5 반응형 검증

- 320px, 480px, 720px, 960px 폭에서 각각 1/2/3/4열 및 overflow 없음 확인.

---

## 7. mockup 참조 (카드 레이아웃 시각 시뮬레이션)

> 본 task 는 frozen work packet(BF-1820)상 **런타임/별도 HTML mockup 파일을 생성하지 않습니다** (AC-3 · deliverables). 아래는 markdown 내 카드 레이아웃 mockup 설명으로, developer 의 시각 참조 가이드입니다 (픽셀 일치 의무 없음).

### 7.1 데스크탑 (≥960px, 4열)

```
브랜드 팔레트
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │░░░░░░░░░░░░░░│ │██████████████│
│▓ #2563EB 스와치│ │▓ #7C3AED 스와치│ │░ #F59E0B 스와치│ │█ #111827 스와치│
├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤
│ Primary       │ │ Secondary     │ │ Accent        │ │ Neutral       │
│ #2563EB       │ │ #7C3AED       │ │ #F59E0B       │ │ #111827       │
│ [   복사   ]  │ │ [   복사   ]  │ │ [   복사   ]  │ │ [   복사   ]  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

palette-status(aria-live): (idle — 안내 없음)
```
(▓ = 어두운 파랑/보라, ░ = 밝은 주황, █ = 짙은 뉴트럴 — 시각 표현용 기호)

### 7.2 모바일 (≈320px, 1열)

```
브랜드 팔레트
┌────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓  #2563EB 스와치         │
├────────────────────────┤
│ Primary                 │
│ #2563EB                 │
│ [        복사        ]  │
└────────────────────────┘
┌────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓ Secondary … │
└────────────────────────┘
        ⋮  (Accent, Neutral 이어서 세로 배치)

palette-status(aria-live): (idle)
```

### 7.3 상태별 시각 (Accent 카드 예시)

```
[idle]                     [copied]                   [error]
┌──────────────┐          ┌──────────────┐           ┌──────────────┐
│░ Accent 스와치 │          │░ Accent 스와치 │           │░ Accent 스와치 │
│ Accent        │          │ Accent        │           │ Accent        │
│ #F59E0B       │          │ #F59E0B       │           │ #F59E0B       │
│ [   복사   ]  │          │ [  복사됨 ✓ ] │           │ [ 복사 실패 ! ]│
└──────────────┘          └──────────────┘           └──────────────┘
status: (없음)            status: "복사됨"            status: "복사 실패"
                          → ≈1.5s 후 idle 복구         → ≈1.5s 후 idle 복구
```

> 상태 강조는 색 + **텍스트("복사됨"/"복사 실패") + 아이콘/기호** 병행 — 색상 단독 신호 금지.

---

## 8. 계약 준수 매핑 (AC 대비 자체 점검)

| frozen 계약 항목 | 본 명세 반영 위치 |
| --- | --- |
| DOM ID `palette-root/grid/status` | §4.1, §5.1 (재정의 없이 그대로) |
| CSS class `palette/__card/__swatch/__value/__copy` | §5.2 (exact) |
| 상태 `idle/copied/error` | §5.4 (텍스트 병행) |
| token 5종 exact 값 | §2.1 |
| 4색 hex·이름·순서 | §2.2 |
| 접근성 (aria-label/aria-live/포커스/비색상) | §5.4, §5.5, §6.4 |
| 반응형 320px+ 1~4열 overflow-free | §4.4, §6.5 |
| 스와치·이름·hex 레이아웃 시각 정의 | §4.3, §7 |

---

## 9. 모호함·플래그 (dev 인계 주의)

- 없음 — frozen blueprint 가 selector/token/state/hex/이름/접근성/반응형을 모두 확정했으며, 본 명세는 이를 시각 형태로만 구체화했습니다.
- 비-frozen 항목(페이지 배경색 §2.3, 폰트 크기 §3, 상태 강조 아이콘 §7.3)은 "가이드/권장"으로 명시했고 developer 재량 조정을 허용합니다. 단 4.5:1 대비와 "색상 단독 신호 금지" 제약은 유지합니다.

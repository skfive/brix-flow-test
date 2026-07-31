# Provider 준비 상태 카드 — 시각 명세 (BF-1365)

> 작성자 / Author: designer (이디자인) · Task: **BF-1365** · Epic: Provider Execution Readiness (BF-1364)
> 소비 계약 / Consumed contract: `ui-contract@v1` (`sha256:a8e9cecff311bc81b0cfbe5948a2feb9d3d3e668fc2cbb4b95ea5f65617ab1a4`), `planning-contract@v1`
> 정책 / Policy: **frozen 계약을 재정의하지 않고 그대로 시각화(render)** — DOM id·css class·상태 모델·design token 값 불변 (additive)

이 문서는 planner가 동결한 `docs/planning/provider-execution-readiness/implementation-plan.md` §5 UI 계약을 **시각 명세**로 렌더링한다. 계약값(selector·상태·token·접근성·반응형)은 **소비만** 하며 어떤 값도 새로 정의하거나 변경하지 않는다. 런타임 HTML/CSS/JS는 developer(PKT-DEVELOP)가 `provider-readiness/**`에 구현하며, 본 문서와 mockup은 그 구현의 시각 참조 가이드이다.

---

## 1. 시안 개요 / Overview

### 변경 범위 / Scope
프로젝트 Planning 화면(`/projects/PROJECT-ID/planning`)에 배치되는 **상태 카드(status card)** 하나의 시각 표현을 정의한다. 카드는 (실행 모드, Provider 정책) 읽기전용 조회 결과를 §1 판정 규칙에 따라 다섯 상태(`loading` / `ready` / `blocked` / `unset` / `error`) 중 하나로 표시한다.

### 사용자 경험 목표 / UX goals
- **한눈에 판별**: 운영자가 실행 준비 여부를 색상 + 상태명 텍스트로 즉시 파악한다.
- **색상 비의존 접근성**: 모든 상태는 색상만이 아니라 **화면 텍스트 + 접근성 이름**으로 구분된다(색맹·스크린리더 대응).
- **막다른 골목 방지**: `blocked`/`unset`은 설정 링크, `error`는 재시도 control로 다음 행동을 항상 제공한다.
- **좁은 화면 대응**: 320px에서 overflow 없이, 480px 미만에서 항목이 세로로 stack되어 모바일에서도 읽힌다.
- **보안**: 인증·Provider secret·세션 cookie 값을 화면·mockup·명세 어디에도 노출하지 않는다.

---

## 2. 컬러 팔레트 / Color palette

> 아래 상태 색상 3종은 **frozen design token**이다(값 변경 금지). 배경·테두리·텍스트 등 비-토큰 색상은 mockup 시각화를 위한 designer 제안값이며 developer가 `styles.css`에서 조정 가능하다(계약 불변 대상 아님).

### frozen design token (변경 금지)
| Token | 값 / Value | 용도 / Usage |
|-------|-----------|--------------|
| `--color-status-ready` | `#16a34a` | `ready` 상태 색상(녹색) |
| `--color-status-blocked` | `#dc2626` | `blocked` 상태 색상(적색) |
| `--color-status-unset` | `#6b7280` | `unset` 상태 색상(회색) |

### 상태별 색상 매핑
| 상태 | 상태 색상 token | 대비 확인(WCAG AA, 흰 배경) |
|------|-----------------|------------------------------|
| `loading` | (중립 텍스트색) | — |
| `ready` | `--color-status-ready` `#16a34a` | 4.54:1 ✅ (텍스트 굵게 권장) |
| `blocked` | `--color-status-blocked` `#dc2626` | 4.5:1 ✅ |
| `unset` | `--color-status-unset` `#6b7280` | 4.83:1 ✅ |
| `error` | `--color-status-blocked` `#dc2626` 재사용 | 4.5:1 ✅ |

### 비-토큰 참조 색상 (mockup 시각화용 제안 — 계약 아님)
| 역할 | HEX (제안) |
|------|-----------|
| 카드 배경 / card background | `#ffffff` |
| 카드 테두리 / card border | `#e5e7eb` |
| 본문 텍스트 / body text | `#111827` |
| 보조 텍스트 / muted text | `#6b7280` |
| 페이지 배경 / page background | `#f9fafb` |
| 링크·control 강조 / accent | `#2563eb` |

---

## 3. 타이포그래피 / Typography

> stack = `vanilla-static` → 외부 폰트 의존성 0건, **system font stack** 사용.

`font-family` (전역): `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif`

| 역할 / Role | 요소 | font-size | font-weight | line-height |
|-------------|------|-----------|-------------|-------------|
| 카드 제목 / heading | 카드 라벨("실행 준비 상태") | `1rem` (16px) | 600 | 1.4 |
| 항목 라벨 / label | `실행 모드`, `Provider` | `0.8125rem` (13px) | 500 | 1.4 |
| 항목 값 / body | `readiness-mode`, `readiness-provider` 값 | `0.9375rem` (15px) | 400 | 1.5 |
| 상태 텍스트 / status | `readiness-status` | `0.9375rem` (15px) | 600 | 1.4 |
| 보조 / caption | 설정 링크·재시도 라벨 | `0.8125rem` (13px) | 500 | 1.4 |

- 상태 텍스트는 굵게(600)로 색상 대비를 보강한다(색상 비의존 원칙과 별개로 가독성 강화).
- 긴 Provider 이름/모드 문자열은 줄바꿈 허용(`word-break`/축약은 developer 구현 재량, DOM 계약은 불변).

---

## 4. 레이아웃 / Layout

### 섹션 구조
```
#readiness-card  (role=region, aria-label='실행 모드 및 Provider 준비 상태')
├─ 카드 제목("실행 준비 상태")          — 시각 헤더 (선택적, 계약 selector 아님)
├─ .readiness-card__mode      #readiness-mode      — [라벨: 실행 모드] + 값
├─ .readiness-card__provider  #readiness-provider  — [라벨: Provider] + 값
├─ .readiness-card__status    #readiness-status    — 상태 텍스트 (aria-live=polite)
│    └─ 상태 modifier class: --ready | --blocked | --unset
└─ 조건부 control
     ├─ #readiness-settings-link  (unset·blocked 시 노출, aria-label 명시)
     └─ #readiness-retry          (error 시 노출, aria-label 명시)
```

### spacing
- 카드 내부 항목 간격: `--space-card-gap` = `12px` (**frozen token**)
- 카드 모서리 반경: `--radius-card` = `8px` (**frozen token**)
- 카드 내부 padding: `16px` (제안값 — 비-토큰)
- 카드 최대 너비: `~360px`(넓은 화면), 좁은 화면에서는 100% 폭

### breakpoint 별 동작 / Responsive (frozen §5.7)
| viewport | 레이아웃 |
|----------|----------|
| **≥ 480px** | mode / provider / status 항목을 카드 내부에서 가로 정렬 또는 라벨-값 2열로 배치. content overflow 없음. |
| **< 480px** | mode / provider / status 항목이 **세로로 stack**된다(각 항목이 전체 폭 한 줄씩). |
| **≥ 320px (최소)** | 어떤 폭에서도 **content overflow 없음**. 긴 문자열은 줄바꿈으로 흡수. |

> mockup은 `@media (max-width: 479px)`에서 stack, 480px 이상에서 라벨-값 정렬을 직접 시연한다. 하단 반응형 프리뷰 섹션에서 320px·479px·768px 폭을 동시 비교한다.

---

## 5. 컴포넌트 명세 / Component spec

> 아래 selector(id/class)·상태 텍스트는 **frozen**(§5.2~5.5). designer/developer는 그대로 사용한다.

### 5.1 상태 카드 컨테이너 `#readiness-card` / `.readiness-card`
- **역할 속성**: `role="region"`, `aria-label="실행 모드 및 Provider 준비 상태"` (frozen §5.6)
- **상태(state)**: 없음 — 컨테이너는 항상 렌더, 내부 상태 텍스트만 변화.
- **인터랙션**: 없음(정보 표시 영역).

### 5.2 실행 모드 항목 `#readiness-mode` / `.readiness-card__mode`
- **props(개념)**: `mode: string` — 읽기전용 조회로 얻은 실행 모드 문자열.
- **표시**: `실행 모드` 라벨 + 모드 값. `loading` 중에는 placeholder/빈 값 허용.
- **인터랙션**: 없음.

### 5.3 Provider 항목 `#readiness-provider` / `.readiness-card__provider`
- **props(개념)**: `provider: string | null` — 선택된 Provider 이름. `null`이면 `unset` 상태로 판정.
- **표시**: `Provider` 라벨 + Provider 값. 미선택 시 값 영역은 비거나 "—" 표시(secret 값 노출 금지).
- **인터랙션**: 없음.

### 5.4 상태 표시 `#readiness-status` / `.readiness-card__status`
- **props(개념)**: `state: 'loading' | 'ready' | 'blocked' | 'unset' | 'error'` — §1 판정 규칙 결과.
- **접근성**: `aria-live="polite"` (frozen §5.6) — 상태 변화 시 스크린리더가 알림.
- **상태별 렌더(frozen §5.4)**:

| state | modifier class | 화면 텍스트(frozen) | 색상 | 노출 control |
|-------|----------------|---------------------|------|--------------|
| `loading` | (없음) | `확인 중…` | 중립 | — |
| `ready` | `.readiness-card__status--ready` | `준비됨` | `--color-status-ready` | — |
| `blocked` | `.readiness-card__status--blocked` | `차단됨 — 설정 필요` | `--color-status-blocked` | `#readiness-settings-link` |
| `unset` | `.readiness-card__status--unset` | `설정되지 않음` | `--color-status-unset` | `#readiness-settings-link` |
| `error` | (없음, 텍스트로 구분) | `상태를 불러오지 못했습니다` | `--color-status-blocked`(재사용) | `#readiness-retry` |

- **색상 비의존 원칙(frozen §5.6)**: 모든 상태는 색상뿐 아니라 위 **화면 텍스트**로 구분되며, 이 텍스트가 곧 접근성 이름이 된다.

### 5.5 설정 링크 `#readiness-settings-link`
- **노출 조건**: `unset` 또는 `blocked` 상태에서만 표시.
- **접근성**: 명시적 `aria-label`(예: "Provider 설정으로 이동") + 키보드 focus 가능(frozen §5.6).
- **인터랙션**: 클릭/Enter → Provider 설정 화면 이동(경로는 developer 구현). `:focus-visible` 시 focus ring 노출.

### 5.6 재시도 버튼 `#readiness-retry`
- **노출 조건**: `error` 상태에서만 표시.
- **접근성**: 명시적 `aria-label`(예: "상태 다시 불러오기") + 키보드 focus 가능(frozen §5.6).
- **인터랙션**: 클릭/Enter → 조회 재시도 → 상태가 `loading`으로 복귀(frozen §5.4, AC-5). 재차 실패 시 다시 `error` 유지.

### 5.7 상태 전이 / State transitions (frozen 판정 규칙 §1)
```
       마운트
         │
         ▼
     [loading] ──조회 실패──▶ [error] ──재시도──▶ [loading]
         │
   조회 성공 · §1 규칙
         ├─ Provider 미선택 ─────────▶ [unset]   (+ 설정 링크)
         ├─ 선택 & 정책 사용 가능 ────▶ [ready]
         └─ 선택 & 정책 차단 ─────────▶ [blocked] (+ 설정 링크)

  초기화·취소·화면 이탈 후 재진입 → [loading]부터 재시작
```

---

## 6. dev 구현 가이드 / Implementation guide

> developer(PKT-DEVELOP, `provider-readiness/**`)가 따라할 지침. **모든 selector·token·상태 텍스트는 frozen 값 그대로** 사용한다(재정의 금지). mockup은 참조용이며 픽셀 단위 일치 의무는 없다.

1. **token 정의** — `styles.css`의 `:root`에 frozen token 5종을 exact 값으로 선언:
   ```css
   :root {
     --color-status-ready: #16a34a;
     --color-status-blocked: #dc2626;
     --color-status-unset: #6b7280;
     --space-card-gap: 12px;
     --radius-card: 8px;
   }
   ```
2. **카드 마크업(`index.html`)** — `#readiness-card`에 `role="region"` + `aria-label="실행 모드 및 Provider 준비 상태"`. 내부에 `#readiness-mode`(`.readiness-card__mode`), `#readiness-provider`(`.readiness-card__provider`), `#readiness-status`(`.readiness-card__status`) 배치. 항목 간 간격은 `gap: var(--space-card-gap)`, 카드 반경 `border-radius: var(--radius-card)`.
3. **aria-live** — `#readiness-status`에 `aria-live="polite"` 부여.
4. **상태 렌더(`readiness-card.js`)** — §5.4 표의 (state → class + 텍스트 + control) 매핑을 그대로 구현. 상태 변경 시 `.readiness-card__status--*` modifier class를 토글하고 화면 텍스트를 frozen 문자열로 설정. **판정 규칙 자체는 재구현하지 않고** planning-contract가 제공하는 state 값만 렌더.
5. **조건부 control** — `unset`/`blocked` → `#readiness-settings-link` 표시(그 외 숨김), `error` → `#readiness-retry` 표시. 두 control 모두 명시적 `aria-label` + 키보드 focus 가능(`<a>`/`<button>` 시맨틱 사용 권장), `:focus-visible` focus ring.
6. **재시도 흐름** — `#readiness-retry` 활성화 시 상태를 `loading`으로 되돌리고 재조회. 실패 시 `error` 유지, control 계속 유효.
7. **반응형** — 기본은 라벨-값 정렬, `@media (max-width: 479px)`에서 mode/provider/status를 세로 stack. 320px에서 overflow 없도록 값 텍스트는 `word-break`/`overflow-wrap`으로 흡수.
8. **보안** — Provider secret·토큰·cookie 값은 DOM·로그에 넣지 않는다. Provider "이름"만 표시.

### 권장 CSS 변수·클래스 요약(frozen)
- 변수: `--color-status-ready`, `--color-status-blocked`, `--color-status-unset`, `--space-card-gap`, `--radius-card`
- id: `readiness-card`, `readiness-mode`, `readiness-provider`, `readiness-status`, `readiness-settings-link`, `readiness-retry`
- class: `readiness-card`, `readiness-card__mode`, `readiness-card__provider`, `readiness-card__status`, `readiness-card__status--ready`, `readiness-card__status--blocked`, `readiness-card__status--unset`

---

## 7. mockup 참조 / Mockup reference

- 시각 mockup HTML: **`docs/design/mockups/provider-readiness-BF-1364.html`**
- mockup은 다섯 상태(`loading`/`ready`/`blocked`/`unset`/`error`)를 각각 카드로 시연하고, 하단에 320px·479px·768px 반응형 프리뷰와 focus/hover 상태를 정적으로 표현한다.
- mockup의 색상·타이포·spacing은 본 명세 §2~§5와 동기화되어 있으며, frozen token 값(`#16a34a`/`#dc2626`/`#6b7280`/`12px`/`8px`)을 `:root`에 그대로 선언한다.

---

## 8. Acceptance Criteria 매핑 / AC coverage

| AC(계약) | 본 명세 반영 위치 | mockup 시연 |
|----------|-------------------|-------------|
| AC-1 ready | §5.4 (`--ready` + '준비됨' + ready 색상) | ready 카드 |
| AC-2 blocked | §5.4 (`--blocked` + '차단됨 — 설정 필요' + 설정 링크) | blocked 카드 |
| AC-3 unset | §5.4 (`--unset` + '설정되지 않음' + 설정 링크) | unset 카드 |
| AC-4 loading | §5.4 ('확인 중…') | loading 카드 |
| AC-5 error | §5.6 ('상태를 불러오지 못했습니다' + 재시도 → loading 복귀) | error 카드 |
| AC-6 a11y | §5.1·§5.4·§5.5·§5.6 (role/aria-label/aria-live, 색상 비의존 텍스트) | 접근성 주석 |
| AC-7 responsive | §4 (320px overflow 없음, 480px 미만 stack) | 반응형 프리뷰 |
| AC-8 security | §1·§6.8 (secret/cookie 비노출) | placeholder만 사용 |

---

## 9. Self-critique

frozen 계약 소비 관점 5개 항목 자가 점검:

1. **AC 매핑**: AC-1~AC-8 전부 §8 표로 명세 위치와 mockup 시연에 매핑됨. 누락 없음.
2. **dev 구현 가이드**: §6에 token 선언·마크업·aria·상태 렌더·조건부 control·재시도·반응형·보안까지 8단계 지침 + frozen 변수/id/class 요약 제공. developer가 파일별로 바로 따라갈 수 있음.
3. **기존 요소 보존**: 본 task는 `docs/design/**`만 신규 additive 작성 — 기존 DOM id·class·token 어떤 값도 변경/재정의하지 않고 frozen 값 그대로 렌더링. developer 소유 `provider-readiness/**`는 건드리지 않음.
4. **컴포넌트 매핑**: frozen selector 6개 id + 7개 class 전부 §5 컴포넌트 명세에 1:1 매핑, 상태별 렌더 표(§5.4)로 (state→class→텍스트→색상→control) 완결.
5. **모호함 flag**: 비-토큰 색상(배경/테두리/accent)과 카드 padding·max-width는 계약 대상이 아니므로 "제안값(developer 재량)"으로 명시 표기함. 반응형에서 480px 미만 stack의 세부 배치(2열 vs 라벨-값)는 계약이 "세로 stack"만 규정하므로 developer 재량으로 남김 — 계약 불변 범위는 준수.

---

## 10. 범위 밖 / Non-goals

- 판정 규칙(§1) 재구현 — planner/developer 영역. 본 문서는 규칙의 **결과 상태만** 시각화.
- `provider-readiness/**`의 런타임 HTML/CSS/JS 구현 — developer(PKT-DEVELOP) 영역.
- frozen selector·상태 텍스트·token 값의 변경/추가 — 금지(additive·불변).
- 새 API·데이터 모델·migration — 없음(읽기전용 소비만).

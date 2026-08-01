# 전달 상태 배지 시각 명세 (BF-1440)

> 본 문서는 designer(이디자인)가 작성한 **시각 명세(additive)** 입니다.
> planner가 동결한 `planning-contract@v1` / `ui-contract@v1`(참조: `docs/plans/delivery-status-BF-1440-plan.md`, BF-1443)의
> selector·상태·token·접근성·반응형 계약을 **변경·재정의하지 않고** 시각 결과로 구현합니다.
> selector/token/상태 계약의 유일한 권위는 frozen blueprint입니다. 본 문서는 이를 재정의하지 않습니다.

- Jira: BF-1441 (designer) / 산출물 참조 키: BF-1440
- 대상 저장소: backend · stack: vanilla-static (외부 의존성 0건, system font, CSS 변수 자체 정의)
- 동결 계약: `planning-contract@v1`, `ui-contract@v1` (박기획, BF-1443)
- mockup: [`docs/design/delivery-status-BF-1440-mockup.html`](./delivery-status-BF-1440-mockup.html)

---

## 1. 시안 개요

대시보드에서 운영자가 전달(delivery) 상태를 즉시 파악할 수 있도록 `normal / warning / failed` 3단계 상태를 배지로 노출하는 컴포넌트의 시각 명세입니다.

- **변경 범위**: 전달 상태 배지 카드(`#delivery-status-root`) 1종과 새로고침 control(`#delivery-status-refresh`)의 5개 상태(`loading` / `normal` / `warning` / `failed` / `error`) 시각 표현.
- **사용자 경험 목표**:
  - 운영자가 배지 색상과 한글 상태 텍스트를 함께 보고 현재 전달 상태를 즉시 인지한다.
  - 상태는 **색상 + 상태명 텍스트 + 접근성 이름**으로 이중 인지되어 색맹/스크린리더 사용자도 구분 가능하다.
  - 새로고침으로 최신 상태를 재조회하며, `error`/`failed`로 귀결되어도 새로고침 control은 즉시 재사용 가능하다.
- **비목표(non-goal)**: 런타임 HTML/CSS/JS 생성, API 구현(`GET /api/phase21-validation/delivery-status`), selector/token 재정의. (모두 developer(BF-1442)·frozen blueprint 소관)

---

## 2. 컬러 팔레트

### 2.1 frozen 상태 토큰 (ui-contract@v1 — 변경 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-status-normal` | `#16a34a` | `normal` 배지 색상 |
| `--color-status-warning` | `#d97706` | `warning` 배지 색상 |
| `--color-status-failed` | `#dc2626` | `failed` 배지 색상 |
| `--color-status-error` | `#6b7280` | `error` 배지 색상 |
| `--space-card-gap` | `16px` | 카드 내부 요소 간 gap |

> 위 5개 토큰은 **frozen 값**이며 designer가 재정의하지 않습니다.

### 2.2 additive 보조 팔레트 (designer 정의 — 시각 완결용, frozen 토큰 미침범)

frozen 토큰이 정의하지 않은 배경·텍스트·`loading` 상태 표현을 위한 **추가** 값입니다. frozen selector/token을 대체하지 않습니다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-card-surface` | `#ffffff` | 카드 배경 |
| `--color-card-border` | `#e2e8f0` | 카드 테두리 |
| `--color-text-primary` | `#1e293b` | 라벨 기본 텍스트 |
| `--color-text-muted` | `#64748b` | 갱신 시각(`#delivery-status-updated`) 텍스트 |
| `--color-status-loading` | `#94a3b8` | `loading` 상태 중립 인디케이터 |

- 상태 색상은 **의미 전달 보조**일 뿐이며, `#delivery-status-label`의 한글 상태 텍스트가 항상 함께 노출됩니다(색상 단독 판단 금지).

---

## 3. 타이포그래피

vanilla-static 규약에 따라 **system font stack** 만 사용합니다(외부 폰트 CDN 없음).

```
--font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                    "Helvetica Neue", Arial, "Apple SD Gothic Neo",
                    "Noto Sans KR", sans-serif;
```

| 역할 | 대상 | font-size | font-weight | line-height |
| --- | --- | --- | --- | --- |
| heading (카드 제목) | `.delivery-status__title` | 16px (1rem) | 700 | 1.4 |
| body (상태 라벨) | `#delivery-status-label` | 15px (0.9375rem) | 600 | 1.4 |
| caption (갱신 시각) | `#delivery-status-updated` | 13px (0.8125rem) | 400 | 1.4 |
| 새로고침 control | `#delivery-status-refresh` | 13px (0.8125rem) | 500 | 1 |

---

## 4. 레이아웃

### 4.1 섹션 구조

```
#delivery-status-root (.delivery-status)
└─ .delivery-status__card                      ← 카드 컨테이너
   ├─ .delivery-status__title                   ← "전달 상태" (고정 제목, additive)
   ├─ #delivery-status-badge (.delivery-status__badge
   │    .delivery-status__badge--normal|warning|failed)
   │    ← 배지, aria-live="polite" (loading/error 시 상태색 토큰 미적용, §2.2 참조)
   │  └─ #delivery-status-label                 ← 상태명 텍스트 (필수)
   ├─ #delivery-status-updated                  ← ISO 8601 갱신 시각 (normal/warning/failed에서 노출)
   └─ #delivery-status-refresh (.delivery-status__refresh)  ← 새로고침 button
```

### 4.2 spacing

| 항목 | 값 |
| --- | --- |
| 카드 내부 요소 간 gap (`--space-card-gap`, frozen) | `16px` |
| 카드 내부 padding | `16px` |
| 카드 border-radius | `12px` |
| 배지 내부 padding | `4px 12px` |
| 배지 border-radius | `999px` (pill) |

- `.delivery-status__card`는 `display: flex; flex-direction: column; gap: var(--space-card-gap);` 로 배치합니다.

### 4.3 breakpoint 동작 (responsive)

- **320px 이상 보장**: 카드 콘텐츠(배지, 라벨, 갱신 시각, 새로고침 버튼)가 **overflow 없이** 표시됩니다.
  - 카드 `max-width: 100%; box-sizing: border-box;`, 텍스트 요소 `word-break: keep-all; overflow-wrap: anywhere;` 로 좁은 폭에서 줄바꿈 유지.
- **480px 미만**: 카드 내부 요소(배지, 라벨, 갱신시각, 새로고침 버튼)가 **단일 컬럼으로 세로 배치**됩니다.
  - `.delivery-status__card { flex-direction: column; align-items: stretch; }`, `#delivery-status-refresh { width: 100%; }` 를 미디어쿼리 `@media (max-width: 479px)` 로 적용.
- 480px 이상에서는 배지/라벨과 새로고침 버튼을 가로 정렬(`row`)해도 무방합니다(additive, 계약 미강제).

---

## 5. 컴포넌트 명세

### 5.1 카드 root — `#delivery-status-root` (`.delivery-status`)

| 항목 | 값 |
| --- | --- |
| 역할 | 전달 상태 배지 카드 컨테이너 |
| 자식 | `.delivery-status__card` (§4.1) |

### 5.2 배지 — `#delivery-status-badge` (`.delivery-status__badge`)

| 항목 | 값 |
| --- | --- |
| 역할 | 상태 인디케이터 |
| 접근성 | `aria-live="polite"` (상태 변경을 스크린리더에 polite 알림) |
| 상태(state) | `loading` / `normal` / `warning` / `failed` / `error` |
| 상태 클래스 | `.delivery-status__badge--normal` / `--warning` / `--failed` (frozen, 3종만 존재) |

- `loading`/`error`는 frozen 배지 클래스가 정의되지 않으므로, 배지 배경은 §2.2 `--color-status-loading`(loading) 또는 `--color-status-error`(error, frozen 토큰)를 인라인/보조 클래스로 적용합니다. 이 보조 스타일 적용 방식은 developer 재량이며 frozen 3개 클래스명을 대체하지 않습니다.

### 5.3 상태별 표현 (states)

| 상태 | `#delivery-status-label` 텍스트 | `#delivery-status-updated` | 배지 색상 토큰 | `#delivery-status-refresh` |
| --- | --- | --- | --- | --- |
| `loading` | `확인 중…` | 미노출 | `--color-status-loading` (#94a3b8) | 사용 가능(비활성화하지 않음) |
| `normal` | `정상` | ISO 8601 갱신 시각(API `updatedAt`) | `--color-status-normal` (#16a34a) | 사용 가능 |
| `warning` | `경고` | ISO 8601 갱신 시각(API `updatedAt`) | `--color-status-warning` (#d97706) | 사용 가능 |
| `failed` | `실패` | ISO 8601 갱신 시각(API `updatedAt`) | `--color-status-failed` (#dc2626) | 사용 가능 |
| `error` | `오류` | 미노출 (또는 "-") | `--color-status-error` (#6b7280) | 사용 가능 |

> `normal`/`warning`/`failed` 상태 텍스트("정상"/"경고"/"실패")는 **frozen 계약 값**(§3.5 접근성 원문 예시) 그대로입니다. designer/developer가 문구를 변경하지 않습니다. `loading`/`error` 텍스트는 frozen 계약이 정확한 문구를 강제하지 않아 designer가 제안한 additive 값이며, 색상만으로 구분하지 않는다는 원칙(모든 상태에 상태명 텍스트 노출)만 지킵니다.
> §3.6 초기화 원칙에 따라, `error` 또는 `failed`로 귀결되어도 `#delivery-status-refresh`는 비활성화되지 않고 즉시 재사용 가능합니다.

### 5.4 새로고침 control — `#delivery-status-refresh`

| 항목 | 값 |
| --- | --- |
| 태그 | `<button>` (시맨틱) |
| 접근성 이름 | `aria-label="전달 상태 새로고침"` (명시적, frozen) |
| 키보드 | **Tab** 포커스 이동 + **Enter / Space** 로 활성화(button 기본 동작) |
| 상태 | 모든 상태(`loading` 포함)에서 활성 유지 — 어떤 상태에서도 `disabled` 로 잠그지 않음 |
| 인터랙션 | `:hover` 시 배경 강조, `:focus-visible` 시 outline 표시 |

### 5.5 상태 전이 (인터랙션)

```
[진입] ──▶ loading ──(200, status=normal)──▶ normal
                    ├─(200, status=warning)──▶ warning
                    ├─(200, status=failed)───▶ failed
                    └─(네트워크/응답 오류)──────▶ error
normal/warning/failed/error ──(refresh 클릭·Tab+Enter/Space)──▶ loading ──▶ …
```

- **초기화·취소·실패 후조건**: `delivery-status-refresh` 클릭 시 항상 `loading`으로 재진입하며, 배지·라벨·갱신시각은 이전 상태 잔상 없이 `loading` 초기값으로 리셋됩니다. `error`/`failed` 귀결 후에도 새로고침 control은 즉시 재사용 가능합니다.

---

## 6. dev 구현 가이드 (developer / BF-1442)

> developer는 `delivery-status/index.html`, `delivery-status/src/delivery-status.js`, `delivery-status/tests/delivery-status.test.js` 소관.
> 아래는 시각 계약을 코드로 옮길 때의 권장 매핑입니다. **selector/token/상태 텍스트는 frozen 값 그대로 사용**하세요.

1. **CSS 변수 정의** (`:root` 또는 컴포넌트 스코프)
   - frozen: `--color-status-normal: #16a34a;` `--color-status-warning: #d97706;` `--color-status-failed: #dc2626;` `--color-status-error: #6b7280;` `--space-card-gap: 16px;`
   - 보조(additive): §2.2 표의 `--color-card-surface` 등. 필요 범위에서만 추가하고 frozen 토큰을 덮어쓰지 마세요.
2. **마크업 골격**
   ```html
   <div id="delivery-status-root" class="delivery-status">
     <div class="delivery-status__card">
       <h2 class="delivery-status__title">전달 상태</h2>
       <span id="delivery-status-badge" class="delivery-status__badge" aria-live="polite">
         <span id="delivery-status-label"><!-- 상태 텍스트 --></span>
       </span>
       <span id="delivery-status-updated"><!-- ISO 8601 갱신 시각 --></span>
       <button id="delivery-status-refresh" class="delivery-status__refresh" aria-label="전달 상태 새로고침">새로고침</button>
     </div>
   </div>
   ```
3. **상태 클래스 스위칭**: `normal`/`warning`/`failed`는 `#delivery-status-badge`에 `delivery-status__badge--normal|warning|failed` 를 부여(frozen, 3종 중 1개만 동시 적용). `loading`/`error`는 이 3개 클래스를 모두 제거하고 §2.2/§5.2 보조 색상을 별도 방식(예: `data-state` 속성 또는 인라인 style)으로 적용 — frozen 3개 클래스명을 새로 만들거나 변형하지 마세요.
4. **`GET /api/phase21-validation/delivery-status` 재호출**: `#delivery-status-refresh` 클릭 또는 Enter/Space 시 `loading`으로 전환 후 재호출. 계약 외 `status` 값은 `error`로 취급(§8 edge case).
5. **`#delivery-status-label` 렌더링**: `normal`→"정상", `warning`→"경고", `failed`→"실패" (frozen 문구 그대로), `loading`→"확인 중…", `error`→"오류" (additive 제안, 텍스트 노출 원칙만 준수하면 문구 조정 가능).
6. **`#delivery-status-updated` 렌더링**: API `updatedAt`(ISO 8601)을 그대로 표시. `loading`/`error`에서는 미노출 또는 이전 값 유지 중 developer 재량.
7. **새로고침 control 비활성화 금지**: 어떤 상태에서도 `#delivery-status-refresh`에 `disabled`를 부여하지 마세요(§3.6 원복 원칙 — loading 중에도 재클릭 가능해야 함). 중복 요청 처리는 최신 응답만 반영하는 방식으로 구현(§8).
8. **접근성**: `#delivery-status-badge` `aria-live="polite"`, `#delivery-status-refresh` `aria-label="전달 상태 새로고침"` 필수. Enter/Space 활성화(button 기본 동작으로 충족).
9. **반응형**: 카드 `max-width: 100%; box-sizing: border-box;`, 텍스트 `overflow-wrap: anywhere;` 로 320px 이상 overflow 방지. `@media (max-width: 479px)` 에서 `.delivery-status__card { flex-direction: column; }` 로 단일 컬럼 배치.

- ⚠️ mockup HTML은 **참조 가이드**이며 픽셀 단위 일치 의무는 없습니다. selector·상태 텍스트·frozen 토큰만 정확히 일치시키면 됩니다.

---

## 7. mockup 참조

- 시각 mockup: [`docs/design/delivery-status-BF-1440-mockup.html`](./delivery-status-BF-1440-mockup.html)
- 5개 상태(`loading` / `normal` / `warning` / `failed` / `error`)와 hover/focus-visible 인터랙션, 320px~479px 반응형(단일 컬럼)을 `<section>`으로 구분해 정적 시뮬레이션합니다.

---

## Self-critique

| # | 체크 항목 | 결과 |
| --- | --- | --- |
| 1 | **AC 매핑** | AC-1~AC-6 전부 §5.3 상태표·§5.5 전이·§4.3 반응형·§5.4 접근성에 대응. normal/warning/failed 배지 클래스+한글 라벨/갱신시각(AC-1,2), 새로고침 시 loading 재진입 후 갱신+재사용 가능(AC-3), error 텍스트 노출+재시도 가능(AC-4), aria-live/aria-label(AC-5), 320px~479px 단일 컬럼(AC-6) 모두 반영. |
| 2 | **dev 구현 가이드** | §6에 마크업 골격·CSS 변수·상태 클래스 스위칭·재호출·비활성화 금지·반응형까지 9단계 지침 제공. frozen selector/token/문구 그대로 사용 명시. |
| 3 | **기존 요소 보존** | 신규 파일 생성(additive). frozen DOM ID 5개·CSS 클래스 7개·상태 5종·토큰 5개·접근성/반응형 요구 재정의 없음. |
| 4 | **컴포넌트 매핑** | `#delivery-status-root`, `#delivery-status-badge`(+`--normal/--warning/--failed`), `#delivery-status-label`, `#delivery-status-updated`, `#delivery-status-refresh` 전부 계약 값과 1:1 매핑. |
| 5 | **모호함 flag** | frozen 계약은 `loading`/`error` 상태의 정확한 라벨 문구와 배지 색상 클래스를 정의하지 않음(3개 클래스는 normal/warning/failed 전용) → designer가 §2.2/§5.3에서 additive 보조 토큰·문구("확인 중…", "오류")로 제안, developer 재량으로 조정 가능. 카드 제목(`.delivery-status__title` "전달 상태")도 frozen 미요구 additive 요소. |

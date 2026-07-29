# 전달 상태 배지 시각 명세 (BF-1227)

> 본 문서는 designer(이디자인)가 작성한 **시각 명세(additive)** 입니다.
> planner가 동결한 `ui-contract@v1`(참조: `docs/plans/phase21-delivery-status-BF-1227.md`)의
> selector·상태 텍스트·token을 **변경·재정의하지 않고** 시각 결과로 구현합니다.
> selector/token/상태 계약의 유일한 권위는 frozen blueprint입니다. 본 문서는 이를 재정의하지 않습니다.

- Jira: BF-1228 (designer) / 산출물 참조 키: BF-1227
- 대상 저장소: backend · stack: vanilla-static (외부 의존성 0건, system font, CSS 변수 자체 정의)
- 동결 계약: `planning-contract@v1`, `ui-contract@v1` (박기획, BF-1230)
- mockup: `docs/design/mockups/delivery-status-badge-BF-1227.html`

---

## 1. 시안 개요

Phase 21 검증 화면의 **전달 상태 배지**에 대한 시각 명세입니다.

- **변경 범위**: 전달 상태 배지 컴포넌트 1종(`#delivery-status-badge`)과 새로고침 control(`#delivery-status-refresh`)의 4개 상태(loading / success / error / forbidden) 시각 표현.
- **사용자 경험 목표**:
  - 운영자가 현재 전달 상태와 마지막 갱신 시각을 한눈에 확인한다.
  - 상태는 **색상 + 상태명 텍스트 + 접근성 이름**으로 이중 인지되어 색맹/스크린리더 사용자도 구분 가능하다.
  - 새로고침으로 최신 상태를 재조회하며, 조회 중에는 control이 비활성화되어 중복 요청을 방지한다.
- **비목표(non-goal)**: 런타임 HTML/CSS/JS 생성, API 구현, selector/token 재정의. (모두 developer(BF-1229)·frozen blueprint 소관)

---

## 2. 컬러 팔레트

### 2.1 frozen 상태 토큰 (ui-contract@v1 — 변경 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-status-success` | `#16a34a` | success 상태 라벨/인디케이터 |
| `--color-status-error` | `#dc2626` | error 상태 라벨/인디케이터 |

> 위 두 토큰과 아래 spacing 토큰은 **frozen 값**이며 designer가 재정의하지 않습니다.

### 2.2 additive 보조 팔레트 (designer 정의 — 시각 완결용, frozen 토큰 미침범)

frozen 토큰이 정의하지 않은 배경·텍스트·중립 상태(loading/forbidden) 표현을 위한 **추가** 값입니다. frozen selector/token을 대체하지 않습니다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-badge-surface` | `#f8fafc` | 배지 배경 |
| `--color-badge-border` | `#e2e8f0` | 배지 테두리 |
| `--color-text-primary` | `#1e293b` | 라벨 기본 텍스트 |
| `--color-text-muted` | `#64748b` | 갱신 시각(`.delivery-status__timestamp`) 텍스트 |
| `--color-status-loading` | `#64748b` | loading 상태 중립 인디케이터 |
| `--color-status-forbidden` | `#b45309` | forbidden 상태 경고 인디케이터 |

- 상태 색상은 **의미 전달 보조**일 뿐이며, 상태명 텍스트가 항상 함께 노출됩니다(색상 단독 판단 금지).

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
| 상태 라벨 | `.delivery-status__label` | 15px (0.9375rem) | 600 | 1.4 |
| 갱신 시각 | `.delivery-status__timestamp` | 13px (0.8125rem) | 400 | 1.4 |
| 새로고침 control | `#delivery-status-refresh` | 13px (0.8125rem) | 500 | 1 |

---

## 4. 레이아웃

### 4.1 섹션 구조

```
#delivery-status-badge (.delivery-status)   ← 배지 root, aria-live="polite"
├─ [상태 인디케이터 dot]                       ← 색상 보조 (선택적 시각 요소)
├─ .delivery-status__label                    ← 상태명 텍스트 (필수)
├─ .delivery-status__timestamp                ← ISO 8601 갱신 시각 (success에서만 노출)
└─ #delivery-status-refresh                   ← 새로고침 control (button)
```

### 4.2 spacing

| 항목 | 값 |
| --- | --- |
| 요소 간 gap (`--space-badge-gap`, frozen) | `8px` |
| 배지 내부 padding | `8px 12px` |
| 배지 border-radius | `8px` |

- 배지는 `display: flex; align-items: center; gap: var(--space-badge-gap);` 로 배치합니다.

### 4.3 breakpoint 동작 (responsive)

- **320px 이상 보장**: 라벨(`.delivery-status__label`)과 갱신 시각(`.delivery-status__timestamp`) 텍스트가 **overflow 없이 줄바꿈**됩니다.
  - `flex-wrap: wrap;` + 텍스트 요소 `word-break: keep-all; overflow-wrap: anywhere;` 로 좁은 폭에서 줄바꿈 유지.
- 320px 미만은 계약 범위 밖(보장하지 않음).

---

## 5. 컴포넌트 명세

### 5.1 배지 root — `#delivery-status-badge` (`.delivery-status`)

| 항목 | 값 |
| --- | --- |
| 역할 | 상태 컨테이너 |
| 접근성 | `aria-live="polite"` (상태 변경을 스크린리더에 polite 알림) |
| 상태(state) | `loading` / `success` / `error` / `forbidden` |

### 5.2 상태별 표현 (states — frozen 텍스트, 변경 금지)

| 상태 | `.delivery-status__label` 텍스트 | `.delivery-status__timestamp` | 인디케이터 색상 | `#delivery-status-refresh` |
| --- | --- | --- | --- | --- |
| `loading` | `전달 상태 확인 중…` | 미노출 | `--color-status-loading` (#64748b) | **비활성** (`disabled`) |
| `success` | 전달 상태 라벨(API `label`) | ISO 8601 갱신 시각(API `updatedAt`) | `--color-status-success` (#16a34a) | 재활성 |
| `error` | `전달 상태를 불러오지 못했습니다` | 이전 상태 값 복원 | `--color-status-error` (#dc2626) | 재활성 |
| `forbidden` | `전달 상태 접근 권한이 없습니다` | 미노출 | `--color-status-forbidden` (#b45309) | 재활성 |

> 상태 텍스트는 **frozen 계약 값** 그대로입니다. designer/​developer가 문구를 변경하지 않습니다.
> `error`는 **이전 상태를 복원한 뒤** 새로고침 control을 재활성화합니다(진행 표시 초기화 후조건).

### 5.3 새로고침 control — `#delivery-status-refresh`

| 항목 | 값 |
| --- | --- |
| 태그 | `<button>` (시맨틱) |
| 접근성 이름 | `aria-label="전달 상태 새로고침"` (명시적, frozen) |
| 키보드 | **Enter / Space** 로 활성화 |
| 상태 | `loading`에서 `disabled`(비활성), 그 외 상태에서 재활성 |
| 인터랙션 | `:hover` 시 배경 강조, `:disabled` 시 투명도 감소 + `cursor: not-allowed` |

### 5.4 상태 전이 (인터랙션)

```
[진입] ──▶ loading ──(200 응답)──▶ success
                    ├─(실패)──────▶ error  (이전 상태 복원 후 refresh 재활성)
                    └─(403)───────▶ forbidden
success/error/forbidden ──(refresh 클릭·Enter·Space)──▶ loading ──▶ …
```

- **초기화·취소·실패 후조건**: 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control(새로고침)을 다시 사용할 수 있어야 합니다.

---

## 6. dev 구현 가이드 (developer / BF-1229)

> developer는 `src/features/delivery-status-badge/**`, `src/routes/phase21-validation.ts`(additive) 소관.
> 아래는 시각 계약을 코드로 옮길 때의 권장 매핑입니다. **selector/token/상태 텍스트는 frozen 값 그대로 사용**하세요.

1. **CSS 변수 정의** (`:root` 또는 컴포넌트 스코프)
   - frozen: `--color-status-success: #16a34a;` `--color-status-error: #dc2626;` `--space-badge-gap: 8px;`
   - 보조(additive): 2.2 표의 `--color-badge-surface` 등. 필요 범위에서만 추가하고 frozen 토큰을 덮어쓰지 마세요.
2. **마크업 골격**
   ```html
   <div id="delivery-status-badge" class="delivery-status" aria-live="polite">
     <span class="delivery-status__label"><!-- 상태 텍스트 --></span>
     <span class="delivery-status__timestamp"><!-- ISO 8601 갱신 시각 --></span>
     <button id="delivery-status-refresh" aria-label="전달 상태 새로고침">새로고침</button>
   </div>
   ```
3. **상태 클래스 권장(additive)**: root에 `data-state="loading|success|error|forbidden"` 를 부여해 인디케이터 색상을 CSS로 스위칭. (frozen class는 그대로 두고 상태 표현만 추가)
4. **loading 진입 시** `#delivery-status-refresh`에 `disabled` 부여, 응답 수신 시 제거.
5. **success 렌더링**: `.delivery-status__label` ← API `label`, `.delivery-status__timestamp` ← API `updatedAt`(ISO 8601 그대로).
6. **error**: `전달 상태를 불러오지 못했습니다` 표시 + 이전 상태 복원 + refresh 재활성.
7. **forbidden(403)**: `전달 상태 접근 권한이 없습니다` 표시 + refresh 재활성.
8. **접근성**: root `aria-live="polite"`, refresh `aria-label="전달 상태 새로고침"` 필수. Enter/Space 활성화(button 기본 동작으로 충족).
9. **반응형**: 배지 컨테이너 `flex-wrap: wrap;`, 텍스트 요소 `overflow-wrap: anywhere;` 로 320px 이상 줄바꿈 보장.

- ⚠️ mockup HTML은 **참조 가이드**이며 픽셀 단위 일치 의무는 없습니다. selector·상태 텍스트·frozen 토큰만 정확히 일치시키면 됩니다.

---

## 7. mockup 참조

- 시각 mockup: [`docs/design/mockups/delivery-status-badge-BF-1227.html`](./mockups/delivery-status-badge-BF-1227.html)
- 4개 상태(loading / success / error / forbidden)와 hover/disabled 인터랙션, 320px 반응형을 `<section>`으로 구분해 정적 시뮬레이션합니다.

---

## Self-critique

| # | 체크 항목 | 결과 |
| --- | --- | --- |
| 1 | **AC 매핑** | AC-1~AC-7 전부 §5.2 상태표·§5.4 전이·§4.3 반응형·§5.3 접근성에 대응. loading 비활성/success 라벨+timestamp/error 복원/forbidden/refresh 재조회/aria-live/320px 모두 반영. |
| 2 | **dev 구현 가이드** | §6에 마크업 골격·CSS 변수·상태 스위칭·단계별 지침 제공. frozen selector/token 그대로 사용 명시. |
| 3 | **기존 요소 보존** | 신규 파일 생성(additive). frozen selector/token/상태 텍스트 재정의 없음. 보조 토큰은 frozen 미침범 additive로만 추가. |
| 4 | **컴포넌트 매핑** | `#delivery-status-badge`, `#delivery-status-refresh`, `.delivery-status__label/__timestamp` 전부 계약 값과 1:1 매핑. |
| 5 | **모호함 flag** | success의 인디케이터 dot·`data-state` 속성은 designer additive 제안이며 frozen 계약이 강제하지 않음 → developer 재량. loading/forbidden 색상은 frozen 미정의라 보조 팔레트로 지정(계약 위반 아님). |

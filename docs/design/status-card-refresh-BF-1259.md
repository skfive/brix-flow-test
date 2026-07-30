# 디자인 명세 — status-card 새로고침 상태 UX (BF-1260)

> 본 명세는 planner Delivery Dossier `docs/plans/status-card-refresh-BF-1259.md` 의
> **ui-contract@v1 (blueprint-frozen)** 를 시각 산출물로 렌더한 것입니다.
> selector / 상태 텍스트 / 디자인 토큰 / 접근성 / 반응형 계약을 **재정의하지 않고 그대로** 서술합니다.
> 실제 런타임 HTML/CSS/JS 는 developer(BF-1261) 소유이며 본 명세는 시각 명세만 담습니다.

- 원본 계약: `docs/plans/status-card-refresh-BF-1259.md` (Revision 1, `implementation-strict`)
- Primary module: `status-card`
- Tech stack (observed): vanilla-static — 외부 의존성 0건, CSS 변수 자체 정의, system font
- 소비 계약: `planning-contract@v1`, `ui-contract@v1`

---

## 1. 시안 개요

### 변경 범위
status-card 에 **명시적 새로고침 control** 과 **상태 텍스트 영역**을 추가하여,
사용자가 갱신을 실행하고 `idle → loading → success | error` 전이를
**화면 텍스트 + 접근성 이름**으로 확인할 수 있게 한다.

### 사용자 경험 목표
- 색각 이상 사용자·스크린리더 사용자도 상태를 알 수 있도록 **색상만으로 상태를 구분하지 않는다.**
  네 상태 각각 고유한 화면 텍스트와 접근성 이름을 노출한다.
- loading 중 중복 클릭을 막고, error 뒤 재시도로 복구 가능하게 한다.
- 초기화·취소·실패 뒤 상태·진행 표시를 초기값으로 되돌리고 주 실행 control 을 다시 활성화한다.
- 320px 이상 폭에서 텍스트·버튼이 overflow 없이 배치된다.

---

## 2. 컬러 팔레트

frozen `designTokens` 값을 그대로 사용한다. **값 변경 금지.**

| 역할 | 토큰 | HEX | 사용처 |
| --- | --- | --- | --- |
| loading (진행) | `--status-loading-color` | `#2563eb` | loading 상태 텍스트·버튼 진행 표시 |
| success (성공) | `--status-success-color` | `#16a34a` | success 상태 텍스트 |
| error (실패) | `--status-error-color` | `#dc2626` | error 상태 텍스트(`.status-card__status-text--error`) |

> ⚠️ 위 색상은 상태의 **보조** 신호일 뿐이다. 상태 구분의 1차 신호는 항상 화면 텍스트다.

### 보조 색상 (시각 명세 전용 — frozen 아님)
프로토타입의 카드/배경/테두리 등 중립 색상은 계약 대상이 아니며 참고용이다.

| 역할 | HEX | 비고 |
| --- | --- | --- |
| 카드 배경 | `#ffffff` | 참고용 |
| 페이지 배경 | `#f1f5f9` | 참고용 |
| 본문 텍스트 | `#1e293b` | 참고용 |
| 보조 텍스트 | `#64748b` | last-updated 등 |
| 테두리 | `#e2e8f0` | 참고용 |

---

## 3. 타이포그래피

vanilla-static 규약에 따라 system font stack 사용.

```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans KR", sans-serif;
```

| 요소 | size | weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| 카드 제목(heading) | 18px | 600 | 1.4 | 카드 라벨 |
| 상태 텍스트(body) | 15px | 500 | 1.5 | `#status-card-status-text` |
| 버튼 라벨 | 15px | 600 | 1.2 | `#status-card-refresh-button` |
| 마지막 갱신 시각(caption) | 13px | 400 | 1.4 | `#status-card-last-updated`, 보조 색상 |

---

## 4. 레이아웃

### 섹션 구조
```
.status-card (카드 컨테이너)
├─ 제목(heading)
├─ #status-card-status-text  (aria-live="polite", 상태 텍스트)
├─ #status-card-last-updated (마지막 갱신 시각 — success 시 표기)
└─ action row (gap: --status-refresh-gap)
   ├─ #status-card-refresh-button  (.status-card__refresh)
   └─ #status-card-retry-action    (error 시에만 노출)
```

### spacing
- 주 실행 control 과 인접 요소 사이 간격: `--status-refresh-gap=12px` (frozen)
- 카드 내부 패딩: 24px (참고용)
- 상태 텍스트 ↔ action row 세로 간격: 16px (참고용)

### breakpoint 별 동작
- **≥ 320px**: action row 는 가로 배치를 유지하되, 폭이 좁으면 버튼이 자연 줄바꿈(`flex-wrap: wrap`)되어 overflow 가 발생하지 않는다. 상태 텍스트는 `word-break` 로 카드 폭 안에서 줄바꿈된다.
- `--status-refresh-gap` 간격은 모든 폭에서 유지된다.

---

## 5. 컴포넌트 명세

### 5.1 상태 모델 (frozen — `StatusCardState`)
| 상태 | 화면 텍스트(exact) | last-updated | retry 노출 | 버튼 상태 |
| --- | --- | --- | --- | --- |
| `idle` | `최근 상태를 확인하려면 새로고침하세요.` | 없음 | 없음 | 활성 |
| `loading` | `상태를 불러오는 중…` | 없음 | 없음 | `disabled` + `aria-busy="true"` |
| `success` | `상태를 방금 갱신했습니다.` | 갱신 시각 표기 | 없음 | 활성(idle 복귀) |
| `error` | `상태를 불러오지 못했습니다. 다시 시도해 주세요.` | 없음 | 노출 | 활성 |

> 불변식: `retryAvailable` 은 `status=error` 일 때만 true. `status=loading` 일 때만 주 실행 control 비활성.

### 5.2 새로고침 버튼 — `#status-card-refresh-button`
- class: `status-card__refresh` (loading 시 `status-card__refresh--loading` 추가)
- 접근성: `aria-label="상태 새로고침"`
- 상태·인터랙션:
  - **idle/success/error**: 활성. 클릭 시 `refresh` 액션 → `idle→loading` 전이.
  - **loading**: `disabled` + `aria-busy="true"` → 중복 클릭 차단. 시각적으로 `--status-loading-color` 진행 표시.
  - hover(활성 시): 배경 톤 강조. focus: 가시적 focus ring.

### 5.3 상태 텍스트 — `#status-card-status-text`
- class: `status-card__status-text` (error 시 `status-card__status-text--error` 추가)
- 접근성: `aria-live="polite"` → 상태 전이 시 스크린리더가 결과 낭독.
- error modifier 적용 시 텍스트 색상 `--status-error-color`. 단 색상은 보조이며 텍스트가 상태를 명시.

### 5.4 마지막 갱신 시각 — `#status-card-last-updated`
- success 상태에서 갱신 시각을 표기(예: `마지막 갱신: 오후 3:24`). 다른 상태에서는 빈 값/비표기.

### 5.5 재시도 control — `#status-card-retry-action`
- error 상태에서만 노출. 실행 시 `retry` 액션 → `error→loading` 재진입.
- 접근성: 명시적 라벨 텍스트("다시 시도")로 화면·접근성 이름 노출.

### 5.6 상태 전이 (frozen ProcessFlow)
```
idle ──(새로고침 클릭)──▶ loading ──▶ 판정 ──(성공)──▶ success ──(복귀)──▶ idle
                                          └─(실패)──▶ error ──(재시도)──▶ loading
```
초기화·취소·실패 뒤: 상태/진행 표시 초기값 복귀 + 주 실행 control 재활성화.

---

## 6. dev 구현 가이드 (developer / BF-1261)

> developer 는 `apps/status-card/**` 를 additive 로 구현한다. 아래는 frozen selector 기준 권장 지침이며,
> **DOM ID / class / 상태 텍스트 / 토큰 값은 계약 그대로 사용**해야 한다(변경 금지).

### 6.1 CSS 변수 (`:root` 또는 `.status-card`)
```css
:root {
  --status-refresh-gap: 12px;
  --status-loading-color: #2563eb;
  --status-success-color: #16a34a;
  --status-error-color: #dc2626;
}
```

### 6.2 마크업 골격 (권장)
```html
<section class="status-card">
  <h2>상태 카드</h2>
  <p id="status-card-status-text" class="status-card__status-text" aria-live="polite">
    최근 상태를 확인하려면 새로고침하세요.
  </p>
  <p id="status-card-last-updated"></p>
  <div class="status-card__actions"><!-- gap: var(--status-refresh-gap) -->
    <button id="status-card-refresh-button" class="status-card__refresh" type="button"
            aria-label="상태 새로고침">새로고침</button>
    <button id="status-card-retry-action" type="button" hidden>다시 시도</button>
  </div>
</section>
```

### 6.3 상태 전이 시 DOM 갱신 규칙
| 전이 | 적용 |
| --- | --- |
| → loading | 버튼에 `.status-card__refresh--loading` 추가, `disabled` + `aria-busy="true"` 설정. status-text = `상태를 불러오는 중…`. retry 숨김. |
| → success | 버튼 loading modifier·`disabled`·`aria-busy` 해제(idle 복귀). status-text = `상태를 방금 갱신했습니다.`. `#status-card-last-updated` 에 갱신 시각. |
| → error | 버튼 재활성화. status-text = `상태를 불러오지 못했습니다. 다시 시도해 주세요.` + `.status-card__status-text--error`. `#status-card-retry-action` 노출. |
| → idle (복귀/취소) | 모든 modifier 제거, retry 숨김, last-updated 비표기, 버튼 활성. |

### 6.4 반응형
- `.status-card__actions` 는 `display: flex; gap: var(--status-refresh-gap); flex-wrap: wrap;`
- status-text 는 `overflow-wrap: anywhere;` 로 320px 폭에서 overflow 방지.

### 6.5 접근성 체크리스트 (구현 시 필수)
- [ ] 새로고침 버튼 `aria-label="상태 새로고침"`
- [ ] status-text 영역 `aria-live="polite"`
- [ ] loading 중 버튼 `aria-busy="true"` + `disabled`
- [ ] 네 상태 모두 색상 외 화면 텍스트로 상태명 노출
- [ ] error 텍스트가 색상뿐 아니라 텍스트로 실패를 명시

---

## 7. mockup 참조

- 프로토타입(HTML): `docs/design/prototypes/status-card-refresh.html`
- 프로토타입은 네 상태(idle/loading/success/error)를 각 `<section>` 으로 나란히 시각화하고,
  frozen 토큰·selector·텍스트·접근성 속성을 그대로 반영한다.
- 프로토타입은 시안 시각화 전용이며 developer 의 실제 산출물이 아니다. 픽셀 단위 일치 의무는 없다.

---

## Self-critique

- **AC 매핑**: idle/loading/success/error 각 화면 텍스트(§5.1)·last-updated(§5.4)·실패/취소 후 로딩 해제 및 버튼 재활성화 복원(§5.6·§6.3 idle 복귀 행)을 명세함 — AC-1 충족.
- **frozen 계약 시각화**: domIds·cssClasses·designTokens·aria-label/aria-live·320px 반응형(§5·§6·§4)을 계약 값 그대로 서술 — AC-2 충족.
- **범위 준수**: 산출물은 `.md` 명세 + `prototypes/*.html` 프로토타입 2건뿐이며 런타임 HTML/CSS/JS 미생성 — AC-3 충족.
- **기존 요소 보존**: 두 파일 모두 신규(additive). frozen selector/토큰/상태 텍스트를 변경·재정의하지 않음.
- **모호함 flag**: last-updated 시각 포맷(예: `오후 3:24`)은 계약에 exact 값이 없어 developer 재량으로 위임함을 명시. 그 외 모호함 없음.

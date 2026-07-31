# Dossier 근거 상태 배지 — 시각 명세 (BF-1341)

- 상태: designer 산출물 (frozen `ui-contract@v1` 재정의 없이 시각 문서화)
- 작성 역할: designer (이디자인)
- 대상 저장소: backend (`notepad-spa`, vanilla-static / ESM)
- 서빙 route: `/planning/` (static, `planning/index.html`)
- 권위 원칙: 파일 소유권·selector·token·상태 계약은 **frozen Execution Blueprint / `docs/plans/planning-dossier-status-plan.md`** 가 유일한 권위이며, 본 명세는 이를 **재정의하지 않고 그대로 렌더링**한다. developer는 아래 값을 변경하지 않고 그대로 구현한다.
- 상위 계약: `docs/plans/planning-dossier-status-plan.md` (BF-1343, frozen)

> ⚠️ 본 문서는 **시각 명세 문서**다. 런타임 HTML/CSS/JS(=`planning/index.html`, `planning/src/dossier-status-badge.js`)는 **developer 소유**이며 designer는 생성하지 않는다. 아래 코드 예시는 구현 값을 고정하기 위한 참조이지 designer의 산출 파일이 아니다.

---

## 1. 시안 개요

### 변경 범위
Planning Dossier 화면(`/planning/`)에 **근거(evidence) 충족 상태 배지**를 additive로 추가한다. 배지는 기존 Planning Dossier GET 응답 데이터를 읽어 파생 표시만 하며, 기존 GET 계약·데이터 구조·빈 상태 동작을 **변경하지 않는다**.

### 사용자 경험 목표
- 사용자가 현재 대시보드의 근거 충족 상태를 **색상과 무관하게 화면 텍스트로 즉시 인지**한다.
- 색각 이상 사용자도 상태명을 텍스트/접근성 이름으로 동일하게 인지한다.
- 상태 전이(loading → sufficient/insufficient/empty/error) 중 진행 상황을 텍스트로 관측할 수 있다.
- 근거 부족 시 상세 보기 링크로 후속 행동(상세 확인)이 가능하다.

### 무변경·rollback 불변식
- 배지는 **additive** — 기존 응답 데이터를 읽어 파생 표시만 수행한다.
- 배지 컴포넌트 전체 제거(`planning/src/dossier-status-badge.js` 미로드 + `#dossier-status-badge` 노드 제거) 시 화면이 원래 빈 상태/기존 동작으로 복구된다.
- 초기화·취소·실패 뒤에는 상태·진행 표시를 초기값(loading 이전)으로 되돌리고 주 control(상세 보기 링크·재시도)을 재사용할 수 있어야 한다.

---

## 2. 컬러 팔레트

> frozen token(§3.4) 외 신규 색상을 도입하지 않는다. 아래 3개 CSS 변수가 상태 표시 색의 유일한 권위다.

| 역할 | CSS 변수 | HEX | 용도 |
| --- | --- | --- | --- |
| evidence-sufficient | `--color-evidence-sufficient` | `#16a34a` | `sufficient` 상태 표시 색(녹색) |
| evidence-insufficient | `--color-evidence-insufficient` | `#dc2626` | `insufficient` 상태 표시 색(적색) |
| (spacing token) | `--space-badge-gap` | `8px` | 배지·상세 링크 간격 (색상 아님, §4 참조) |

### 색상 외 표시 보조 (색상만 의존 금지)
- 색상은 **보조 신호**일 뿐이며, 모든 상태는 §3 화면 텍스트 + `aria-label` 로 구분한다.
- `loading`/`error`/`empty` 는 위 색상 토큰을 사용하지 않는다(중립 텍스트/숨김). 색상 토큰은 `sufficient`/`insufficient` 두 상태의 **보조 시각 강조**로만 사용한다.
- 텍스트 대비: 상태 라벨 텍스트는 배경 대비 WCAG AA(4.5:1) 이상을 만족하는 중립 전경색을 사용하고, 토큰 색은 배지 테두리/도트 등 보조 요소에 적용해 텍스트 자체 가독성을 색에 의존시키지 않는다.

---

## 3. 타이포그래피

vanilla-static 규약 — 외부 폰트 의존 0건, system font stack 사용.

| 요소 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| 상태 라벨 (`.dossier-status__label`) | system-ui, -apple-system, "Segoe UI", Roboto, sans-serif | 14px (0.875rem) | 600 | 1.4 |
| 상세 보기 링크 (`.dossier-status__detail`) | (상속) | 13px (0.8125rem) | 500 | 1.4 |
| loading 진행 텍스트 | (상속) | 14px | 500 | 1.4 |

- 최소 폰트 크기 13px 이상 유지 — 320px 뷰포트에서도 가독성 확보.
- 상태 라벨은 화면 축소 시에도 줄바꿈으로 처리하며 잘라내지 않는다(§6 반응형).

---

## 4. 레이아웃

### 구조
```
#dossier-status-badge  (.dossier-status)            ← 배지 컨테이너 루트 / wrapper
  └─ span  (.dossier-status__badge)                 ← 배지 요소 (상태 시각 강조)
       └─ #dossier-status-label (.dossier-status__label)   ← 상태 텍스트 라벨
  └─ a  #dossier-status-detail-link (.dossier-status__detail)  ← 상세 보기 링크 (insufficient 시 활성)
```

- wrapper(`.dossier-status`)는 **가로 flex**, `align-items: center`, `gap: var(--space-badge-gap)` (`8px`).
- 배지(`.dossier-status__badge`)와 라벨(`.dossier-status__label`)은 인라인 그룹, 상세 링크(`.dossier-status__detail`)는 그 오른쪽에 gap `8px` 간격.
- 배지는 Planning Dossier 헤더/요약 영역 인근에 배치(기존 레이아웃을 밀어내지 않는 additive 삽입). 정확한 삽입 위치·DOM 구조는 developer가 기존 마크업에 맞춰 additive로 결정하되, 위 selector 계층은 유지한다.

### spacing
- 배지↔상세 링크 간격: `var(--space-badge-gap)` = `8px` (frozen).
- 배지 내부 패딩: 세로 2px / 가로 8px 권장(잘림 방지, 토큰 아님 — 권장값).

### breakpoint 별 동작
| 뷰포트 | 동작 |
| --- | --- |
| ≥ 320px | 배지·라벨·상세 링크 모두 표시, overflow 없음. 공간 부족 시 `flex-wrap: wrap` 으로 상세 링크가 다음 줄로 내려가며 **잘리지 않는다**. |
| ≥ 480px | 한 줄 배치 유지(배지 + 라벨 + 상세 링크). |

---

## 5. 컴포넌트 명세

### 5.1 selector 계약 (frozen — 정확히 이 값, 재정의 금지)

**DOM ID**
| ID | 역할 |
| --- | --- |
| `dossier-status-badge` | 배지 컨테이너 루트 |
| `dossier-status-label` | 상태 텍스트 라벨 |
| `dossier-status-detail-link` | 상세 보기 링크 |

**CSS class**
| class | 역할 |
| --- | --- |
| `dossier-status` | 최상위 wrapper |
| `dossier-status__badge` | 배지 요소 |
| `dossier-status__label` | 상태 라벨 텍스트 |
| `dossier-status__detail` | 상세 보기 링크 |

### 5.2 상태 모델 (정확히 5개 — 색상 외 화면 텍스트 + aria-label 필수)

| 상태 | 화면 텍스트 | 진행/링크 표시 | aria-label | 색상 토큰 |
| --- | --- | --- | --- | --- |
| `loading` | `근거 상태 확인 중` | 진행 표시(progress indicator) 노출 | `근거 상태 확인 중` | 없음(중립) |
| `sufficient` | `근거 충족` | 텍스트 배지만 노출 | `근거 충족` | `--color-evidence-sufficient` (#16a34a) |
| `insufficient` | `근거 부족` | 텍스트 배지 + **상세 보기 링크 활성** | `근거 부족` | `--color-evidence-insufficient` (#dc2626) |
| `empty` | (배지 숨김) | 배지 숨김, 기존 빈 상태 유지 | — (배지 미노출) | 없음 |
| `error` | `상태를 불러오지 못했습니다` | 재시도 가능 | `상태를 불러오지 못했습니다` | 없음(중립) |

### 5.3 상태 전이 (interaction / process flow)

- 시작 → `loading`
- `loading` → 데이터 있고 근거 충족 → `sufficient`
- `loading` → 데이터 있고 근거 부족 → `insufficient`
- `loading` → 데이터 없음 → `empty` (배지 숨김, 기존 빈 상태 유지)
- `loading` → 조회 실패 → `error`
- `error` → 재시도 → `loading` (초기값 복구 후 재진입)
- 취소/초기화 → 초기값(`loading` 이전)으로 복귀, 진행 표시 제거, 주 control 재사용 가능

### 5.4 상세 보기 링크 (`#dossier-status-detail-link`) props / 상태

| 속성 | 값 |
| --- | --- |
| 노출 조건 | `insufficient` 상태에서만 **활성/노출** |
| `aria-label` | `근거 상세 보기` (명시적, 고정) |
| 키보드 | focus 가능(`<a href>` 시맨틱, tab 이동 가능) |
| 그 외 상태 | 비노출 또는 비활성(다른 상태에서 클릭 대상 아님) |

### 5.5 접근성 (accessibility) — frozen §3.5

- 배지(`#dossier-status-badge`)는 **색상과 무관하게 현재 상태 텍스트를 담은 `aria-label`** 을 가진다(위 5.2 표의 aria-label 열).
- 상세 보기 링크(`#dossier-status-detail-link`)는 명시적 `aria-label='근거 상세 보기'` 를 가지며 키보드 focus 가능하다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 **화면 텍스트 + 접근성 이름**으로 노출한다.
- `empty` 는 의도적 숨김(배지 미노출) — 접근성 트리에서도 제외되어 빈 상태를 왜곡하지 않는다.

### 5.6 반응형 (responsive) — frozen §3.6

- **320px 이상** 뷰포트에서 배지·상세 링크에 content overflow 가 발생하지 않는다. 공간 부족 시 `flex-wrap` 줄바꿈 또는 축소를 허용하되 **잘림은 금지**한다.

---

## 6. dev 구현 가이드 (developer 참조 — additive)

> developer 소유 파일: `planning/index.html`, `planning/src/dossier-status-badge.js`. 아래는 frozen 계약을 그대로 옮긴 구현 참조이며 selector·token·텍스트를 변경하지 않는다.

### 6.1 CSS 변수 (`:root` 또는 스코프에 정의 — 정확히 이 값)
```css
:root {
  --color-evidence-sufficient: #16a34a;
  --color-evidence-insufficient: #dc2626;
  --space-badge-gap: 8px;
}
```

### 6.2 마크업 골격 (additive 삽입 — ID/class 정확히)
```html
<!-- Planning Dossier 헤더/요약 인근에 additive 삽입 -->
<div id="dossier-status-badge" class="dossier-status" aria-label="근거 상태 확인 중">
  <span class="dossier-status__badge">
    <span id="dossier-status-label" class="dossier-status__label">근거 상태 확인 중</span>
  </span>
  <a id="dossier-status-detail-link" class="dossier-status__detail"
     href="#" aria-label="근거 상세 보기" hidden>상세 보기</a>
</div>
```
- 초기 렌더는 `loading` 상태(화면 텍스트 `근거 상태 확인 중`, `aria-label` 동일)로 진입.
- `empty` 는 `#dossier-status-badge` 를 `hidden`/미표시 처리(기존 빈 상태 유지).
- 상태 변경 시 `#dossier-status-label` 의 텍스트와 `#dossier-status-badge` 의 `aria-label` 을 **함께** 갱신(색상과 무관하게 텍스트가 권위).

### 6.3 상태 렌더 규칙 (렌더 모듈 `dossier-status-badge.js`)
- 5개 상태 각각에 대해 5.2 표의 **화면 텍스트 + aria-label** 을 세팅한다(색상만 바꾸지 않는다).
- `insufficient` 에서만 `#dossier-status-detail-link` 를 노출/활성(`hidden` 제거)한다.
- `error` 후 재시도, 취소/초기화 시 **초기값(loading 이전)** 으로 되돌리고 진행 표시를 제거한다(rollback 불변식).
- 색상 토큰은 `sufficient`/`insufficient` 배지의 보조 시각 강조에만 적용(테두리/도트 등), 텍스트 가독성은 중립 전경색으로 확보.

### 6.4 반응형 구현 힌트
```css
.dossier-status {
  display: flex;
  align-items: center;
  gap: var(--space-badge-gap);
  flex-wrap: wrap;   /* 320px 에서 상세 링크가 다음 줄로, 잘림 방지 */
}
```

### 6.5 additive / rollback 준수
- 기존 Planning Dossier GET 계약·데이터 구조를 **읽기만** 하고 변경하지 않는다.
- 배지 노드/스크립트 제거 시 화면이 원래 빈 상태로 복구되도록, 배지는 기존 DOM에 **곁들여** 삽입한다(기존 노드 대체 금지).

---

## 7. mockup 참조

- 시각 mockup HTML: `docs/design/mockups/dossier-status-badge-BF-1341.html`
- 5개 상태(loading / sufficient / insufficient / empty / error)를 **색상 외 화면 텍스트와 함께** 각 `<section>` 으로 시각화한다.
- mockup 은 시안 시각화 전용이며 developer 의 런타임 산출물이 아니다(픽셀 단위 일치 의무 없음). selector·token·상태 텍스트는 본 명세 §2·§5 값을 그대로 반영한다.

---

## 8. Self-critique

| 체크 항목 | 결과 |
| --- | --- |
| **AC 매핑** | AC1(5개 상태 색상 외 화면 텍스트) → §5.2 + mockup 5 section. AC2(token·selector·접근성 이름 계약 일치, 재정의 없음) → §5.1/§5.5/§6.1, 값 전부 frozen plan §3 그대로. AC3(범위=`docs/design/dossier-status-badge.md`, 런타임 HTML/CSS/JS 미생성) → 명세 markdown만 산출, `planning/*` 미생성(developer 소유). |
| **dev 구현 가이드** | §6 에 CSS 변수·마크업 골격·상태 렌더 규칙·반응형·rollback 단계 제공. developer 가 selector/token 변경 없이 additive 구현 가능. |
| **기존 요소 보존** | additive 원칙·rollback 불변식(§1, §6.5) 명시 — 기존 GET 계약/빈 상태 미변경, 배지 제거 시 복구. |
| **컴포넌트 매핑** | DOM ID 3종·CSS class 4종·token 3종을 frozen §3.2–3.4 와 1:1 매핑(§5.1, §6.1). 재정의·신규 selector 없음. |
| **모호함 flag** | 배지의 **정확한 삽입 위치**와 색상 토큰의 세부 적용(테두리 vs 배경)은 frozen 계약이 지정하지 않음 → developer 재량(§4, §6.3)으로 명시. 이는 계약 미지정 영역이며 selector/token/텍스트/접근성/반응형 계약은 재정의 없이 고정. |

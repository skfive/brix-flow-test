# status-card 시안 · UI 계약 시각 명세 (BF-1631 / BF-1632)

> 본 문서는 planner가 동결한 **`ui-contract@v1`** (implementation-plan §5) 을 **재정의 없이 시각화**한 designer 산출물이다.
> selector·상태·token·접근성·반응형은 frozen blueprint 가 유일 권위이며, 본 문서는 그 값을 **그대로 그려** dev/reviewer/운영자가
> PR 만 보고 시안을 확인할 수 있게 한다. 새 selector·token·상태·파일 경로를 만들지 않는다.
>
> - 시각 mockup: [`docs/design/status-card-mockup.html`](./status-card-mockup.html) (§7 mockup 참조)
> - 상위 계약: [`docs/plans/implementation-plan.md`](../plans/implementation-plan.md) §5 (backend status-card UI 계약)
> - 관측 stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의

---

## 1. 시안 개요

### 변경 범위 (additive)
기존 status-card 레이아웃(제목 + 상태 텍스트 + 새로고침 control)과 상태 머신을 **그대로 유지**하면서,
health 응답의 **`uptimeSec`(가동 시간)** 과 **`version`(배포 버전)** 두 필드를 표시하는 영역만 **additive** 로 추가한다.
기존 요소를 이동·삭제·재정의하지 않는다.

### 사용자 경험 목표
- 운영자가 카드 한 장에서 **상태(status) + 가동 시간(uptime) + 배포 버전(version)** 을 한 번에 읽는다.
- 상태를 **색상만으로 구분하지 않고** 항상 화면 텍스트(상태명)로도 전달 → 색약·스크린리더 사용자 동등 경험.
- 구버전 infra(필드 없음) 응답에서도 카드가 **깨지지 않고** "정보 없음" 으로 graceful degrade (`legacy`).
- 로드 실패(`error`)·취소·초기화 뒤 **상태·진행 표시를 초기값으로 복원**하고 새로고침 control 을 다시 쓸 수 있다.

### 시각 명세 범위 (non-goal 명시)
- 본 task 산출은 **명세 markdown + mockup HTML 뿐**이다. 런타임 `index.html`/`refresh.js`/CSS/JS 는 생성하지 않는다(developer 소유).
- mockup 은 **시각 시뮬레이션용** — dev 는 참조 가이드로 쓰되 픽셀 단위 일치 의무 없음.

---

## 2. 컬러 팔레트

frozen token(§5.7) 은 **값 포함 변경 금지**. 아래 표의 `--color-status-ok` / `--color-status-error` 는 frozen 값 그대로다.
나머지(배경·본문·중립 테두리)는 mockup 을 그리기 위한 **additive 보조 변수** 로, frozen token 을 덮어쓰지 않는다.

| 역할 | 변수 | HEX | 출처 |
| --- | --- | --- | --- |
| primary (정상 상태) | `--color-status-ok` | `#16a34a` | **frozen (§5.7 — 변경 금지)** |
| accent (오류 상태) | `--color-status-error` | `#dc2626` | **frozen (§5.7 — 변경 금지)** |
| secondary (중립 상태 loading/legacy) | `--color-status-neutral` | `#64748b` | additive 보조 |
| background (카드 배경) | `--color-surface` | `#ffffff` | additive 보조 |
| background (페이지) | `--color-canvas` | `#f1f5f9` | additive 보조 |
| text (본문) | `--color-text` | `#0f172a` | additive 보조 |
| text (보조 라벨) | `--color-text-muted` | `#64748b` | additive 보조 |
| border (카드/필드 구분선) | `--color-border` | `#e2e8f0` | additive 보조 |

- **상태 색은 보조 신호일 뿐** — 각 상태는 상태명 텍스트(§4·§5)로 항상 구분된다(§5.8-3 준수).
- `legacy`/`loading` 등 frozen token 이 없는 상태는 중립색(`--color-status-neutral`)으로 그리며, 이는 **의미 신호가 아니라 시각 톤** 이다.

---

## 3. 타이포그래피

`vanilla-static` 규약에 따라 **system font stack** 사용(외부 폰트 CDN 호출 없음).

```
--font-family-base: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
```

| 역할 | 요소 | size | weight | line-height |
| --- | --- | --- | --- | --- |
| heading | 카드 제목 (`.status-card__heading`, 기존) | 18px | 700 | 1.3 |
| status label | 상태 텍스트 (`.status-card__status`) | **14px** (`--font-size-status-label`, **frozen**) | 600 | 1.4 |
| field label | uptime/version 라벨 ("가동 시간"/"버전") | 12px | 600 | 1.4 |
| field value | uptime/version 값 | 15px | 500 | 1.4 |
| caption | 보조 안내·오류 메시지 | 12px | 400 | 1.5 |

- 상태 라벨 글자 크기는 **frozen token `--font-size-status-label=14px`** 를 그대로 사용한다(§5.7).
- 필드 라벨/값은 additive 표시 영역용 타이포이며 frozen token 을 만들지 않는다.

---

## 4. 레이아웃

### 섹션 구조 (세로 스택, additive 영역 표시)

```
┌──────────────────────────────────────────┐  ← .status-card  (#status-card-root)
│  상태 카드                                  │     └ .status-card__heading  (기존 유지)
│                                            │
│  ● 상태: 정상 갱신됨                         │  ← .status-card__status  (#status-card-status, aria-live)
│                                            │        기존 상태 텍스트 영역 유지
│  ┌───────────────┬────────────────────┐   │  ← ▼ additive 표시 영역 (신규)
│  │ 가동 시간       │ 버전                │   │
│  │ 1시간 2분 0초   │ 1.4.0              │   │  ← .status-card__uptime  (#status-card-uptime)
│  └───────────────┴────────────────────┘   │     .status-card__version (#status-card-version)
│                                            │
│  [ 새로고침 ]                               │  ← .status-card__refresh (#status-card-refresh)
└──────────────────────────────────────────┘
```

- **기존 요소 보존**: 제목 → 상태 텍스트 → 새로고침 control 순서를 유지. uptime/version 필드 블록을 **상태 텍스트와 control 사이에 additive 삽입**.
- uptime·version 은 **2열 필드 그리드**(라벨 위 / 값 아래). 각 필드는 라벨 텍스트를 항상 노출.

### spacing
- 카드 내부 요소 세로 간격: **`--space-card-gap = 12px` (frozen §5.7)** 를 flex/grid `gap` 으로 사용.
- 카드 padding: 20px (additive 보조), 필드 그리드 내부 gap: `--space-card-gap`.

### breakpoint 별 동작 (반응형 §5.9)
- **≥ 320px (필수 계약)**: `status`/`uptime`/`version` 텍스트가 **content overflow 없이** 표시. 필드 그리드는 폭이 좁으면 2열 → 1열로 wrap, 긴 version 문자열은 `overflow-wrap: anywhere` 로 줄바꿈.
- **≥ 480px**: 필드 그리드 2열 유지, 카드 최대 폭 360px 중앙 정렬.
- 별도 상위 breakpoint 없음 — 카드형 단일 컴포넌트라 max-width 로 상한만 둔다.

---

## 5. 컴포넌트 명세

### 5.1 selector 매핑 (frozen — 재정의 금지)

| 역할 | DOM ID (frozen §5.2) | class (frozen §5.3) |
| --- | --- | --- |
| 카드 루트 | `status-card-root` | `status-card` |
| 상태 텍스트 | `status-card-status` | `status-card__status` |
| uptime 표시 | `status-card-uptime` | `status-card__uptime` |
| version 표시 | `status-card-version` | `status-card__version` |
| 새로고침 버튼 | `status-card-refresh` | `status-card__refresh` |

> ⚠️ **dev 확인 필요(모호함 flag)**: 현재 저장소의 `apps/status-card/index.html` 는 `status-card-status-text`,
> `status-card-refresh-button`, `status-card-last-updated`, `status-card-retry-action` 등 **접미사가 붙은 ID** 를 쓰고 있어
> frozen §5.2 의 bare ID(`status-card-status`, `status-card-refresh`)와 다르다. 본 시안은 **frozen 계약값을 유일 권위**로 삼아
> bare ID 로 그린다. 두 ID 체계의 정합(기존 ID 유지 vs frozen ID 채택)은 `index.html`/`refresh.js` 를 소유한 **developer 가
> additive 원칙 안에서 판단**한다 — designer 는 selector 를 재정의하지 않으므로 여기서 결정하지 않는다.

### 5.2 상태(state) 명세 — 화면 텍스트 + 접근성 (frozen §5.4)

각 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름 양쪽으로 노출한다(§5.8-3).
상태는 루트/상태 영역의 `data-state` 속성으로 표현한다.

| state | `data-state` | 상태 텍스트(화면·접근성) | uptime 영역 | version 영역 | 색 신호 | control |
| --- | --- | --- | --- | --- | --- | --- |
| `idle` | `idle` | "대기 중 — 새로고침하세요" | "—" | "—" | 중립 | 새로고침 활성 |
| `loading` | `loading` | "상태 확인 중…" | "확인 중…" | "확인 중…" | 중립 | 새로고침 **비활성**(`aria-busy="true"`) |
| `success` | `success` | "정상 갱신됨" | uptime 포맷 값(§5.5) | version 문자열 | `--color-status-ok` | 새로고침 활성 |
| `error` | `error` | "불러오지 못했습니다 — 다시 시도" | "—" | "—" | `--color-status-error` | 새로고침 **재사용 가능**(초기값 복원) |
| `legacy` | `legacy` | "상태만 표시(구버전 응답)" | "정보 없음" | "정보 없음" | 중립 | 새로고침 활성 |

- **상태명 텍스트 문구는 mockup 확정값**(위 표). frozen 계약의 "상태명을 화면·접근성 이름으로 노출" 규칙을 지키며, 정확한 문구는
  additive 구현에서 확정한다(§5.5 uptime 포맷 문구와 동일 원칙).
- `success` 는 상태 영역 앞 상태 점(●)에 `--color-status-ok`, `error` 는 `--color-status-error` 를 칠하되 **점은 보조 신호**이고
  상태명 텍스트가 항상 함께 노출된다.

### 5.3 uptime 포맷 표시 (frozen §5.5 — 순수 함수, dev 구현)

uptime 값은 developer 의 **순수 함수**(`refresh.js`)가 포맷하며, 시안은 그 **표시 규칙**만 그린다.

| 입력 `uptimeSec` | 표시 예 (mockup 확정 표기) |
| --- | --- |
| `0` | `0초` |
| `59` | `59초` |
| `3720` | `1시간 2분 0초` |
| `100000` | `1일 3시간 46분 40초` |

- 단위 규칙(§5.5): 일/시간/분/초, **값이 0인 상위 단위 생략**, 최소 `초` 단위는 항상 표기. 결정적·부작용 없음(시계 미접근).
- 위 표기 문구(`일/시간/분/초`)는 mockup 확정값이며 단위 규칙·순수성·경계(§5.5)는 변경하지 않는다.

### 5.4 상태 전이 · 복구 (frozen §5.4 후조건)

- 초기화·취소·`error` 뒤에는 **상태와 진행 표시를 초기값으로 되돌리고** `status-card-refresh` 를 다시 사용할 수 있어야 한다.
- `loading` 진입 시 새로고침 control 을 비활성(`disabled` + `aria-busy="true"`)해 중복 실행을 막고, 완료/실패 후 재활성화한다.

---

## 6. dev 구현 가이드 (developer 참조 — additive)

> developer(`develop-backend`)가 `apps/status-card/index.html` · `refresh.js` 를 additive 로 구현할 때 참조하는 시각 가이드.
> **frozen §5 selector/token 이 유일 권위** — 아래는 시각 배치 권장일 뿐 계약값을 바꾸지 않는다.

1. **DOM 추가(index.html, additive)**: 기존 상태 텍스트와 새로고침 control 사이에 uptime/version 필드 블록을 삽입한다.
   - uptime 표시: `<span id="status-card-uptime" class="status-card__uptime">` (라벨 "가동 시간" 과 짝)
   - version 표시: `<span id="status-card-version" class="status-card__version">` (라벨 "버전" 과 짝)
   - 루트 컨테이너·상태 영역·새로고침 버튼은 frozen §5.2 ID/class 를 사용(기존 ID 정합은 §5.1 flag 참조).
2. **CSS 변수 정의(additive)**: `:root` 또는 `.status-card` 에 frozen token 4개를 **값 그대로** 선언한다.
   ```css
   :root {
     --color-status-ok: #16a34a;      /* frozen */
     --color-status-error: #dc2626;   /* frozen */
     --space-card-gap: 12px;          /* frozen */
     --font-size-status-label: 14px;  /* frozen */
   }
   ```
   - 카드 내부 세로 간격에 `gap: var(--space-card-gap)`, 상태 라벨에 `font-size: var(--font-size-status-label)` 를 적용.
   - 하드코딩 색상 대신 위 변수를 참조(§5.7).
3. **상태 렌더(refresh.js, additive)**: 응답에 `uptimeSec`(정수)·`version`(문자열)이 있으면 `success` 로 §5.5 포맷 결과와 version 을
   렌더하고, 없으면 `legacy` 로 두 영역에 대체 텍스트("정보 없음")를 넣는다. 기존 상태 머신(idle/loading/success/error)은 보존.
4. **접근성(§5.8)**: `status-card-status` 에 `aria-live="polite"`, `status-card-refresh` 에 `aria-label="상태 새로고침"`.
   상태명은 화면 텍스트 + 접근성 이름 양쪽에 노출(색상 단독 금지).
5. **반응형(§5.9)**: 필드 값에 `overflow-wrap: anywhere`, 필드 그리드에 `flex-wrap`/`minmax` 로 320px 에서 overflow 방지.

권장 클래스/변수명은 모두 frozen 계약값(§5.2·§5.3·§5.7)이며 새 이름을 만들지 않는다.

---

## 7. mockup 참조

- 파일: [`docs/design/status-card-mockup.html`](./status-card-mockup.html)
- 내용: 5개 상태(idle / loading / success / error / legacy)를 카드 인스턴스로 나란히 렌더하고, 320px 반응형 프리뷰와
  상태별 색·텍스트·필드 표시를 시각화. frozen token 4개를 `:root` 에 값 그대로 정의.
- 각 카드 요소에 frozen DOM ID 를 `data-dom-id` 주석/속성으로 표기해 selector 매핑(§5.1)을 시각 확인 가능.

---

## Self-critique (PR 직전 자기 점검)

| # | 체크 항목 | 결과 |
| --- | --- | --- |
| 1 | **AC 매핑** — 상태 카드 명세+mockup 제출, 기존 레이아웃 유지 + uptime/version additive | ✅ §1·§4 (기존 순서 보존 + 필드 블록 additive 삽입) |
| 2 | **dev 구현 가이드** — 단계별 지침(DOM/CSS 변수/상태/접근성/반응형) | ✅ §6 (1~5 단계) |
| 3 | **기존 요소 보존** — 제목·상태 텍스트·새로고침 control·상태 머신 미변경 | ✅ §4·§5.4 (additive only) |
| 4 | **컴포넌트 매핑** — frozen selector/state/token 을 재정의 없이 시각화 | ✅ §5.1·§5.2·§2·§3 (frozen 값 그대로, 보조 변수만 additive) |
| 5 | **모호함 flag** — 미해결 지점 명시 | ⚠️ §5.1: 기존 `index.html` 의 접미사 ID(`-status-text`/`-refresh-button`) vs frozen bare ID 정합은 developer 판단 영역으로 flag. designer 는 selector 재정의 금지라 여기서 결정하지 않음. |

- 색상 외 상태 구분(§5.8-3): 모든 상태에 상태명 화면 텍스트 노출 확인(§5.2 표).
- 로드 실패·취소 후 복원(§5.4): error/idle 복구 + control 재사용 명시 확인.
- frozen token 4개 값 불변·경로 2개 exact 준수 확인.

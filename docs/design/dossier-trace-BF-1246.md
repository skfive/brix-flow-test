# 실행 계약 상태 대시보드 — 시각 명세 (BF-1247)

> 본 명세는 planner 가 동결한 `ui-contract@v1` 을 **그대로 시각화**한다.
> selector·CSS class·디자인 토큰·상태 모델·파일 소유권은 frozen blueprint 가 유일한 권위이며, 본 문서는 이를 **재정의하지 않고 시각적으로만 확정**한다.
> 새 selector·새 token·계약 밖 요구사항을 추가하지 않는다. (참조: `docs/plans/dossier-trace-implementation-plan.md`)

- route: `/demo/dossier-trace`
- entry(개발자 소유): `demo/dossier-trace/index.html`
- 검증 명령(권위): `node --test demo/dossier-trace/tests/*.test.js`

---

## 1. 시안 개요

실행 계약(dossier)의 **요구사항 · 역할 · 테스트** 진행 상태를 하나의 다크 테마 대시보드에서 조회한다.

- **변경 범위**: 신규 데모 화면 `/demo/dossier-trace` 의 시각 명세 및 mockup. 런타임 HTML/CSS/JS 는 생성하지 않는다(developer 소유).
- **사용자 경험 목표**
  - 상태를 **색상만으로 구분하지 않고** 아이콘 + 텍스트를 병기해 색각 이상 사용자도 즉시 판별.
  - 필터로 상태를 좁히고, 카드를 선택하면 상세 패널에서 항목 세부를 확인.
  - 키보드만으로 필터·카드 탐색이 가능하고 선택 상태가 접근성 이름으로 노출.
  - 360px 좁은 폭에서도 overflow 없이 세로 스택으로 재배치.
  - `prefers-reduced-motion` 시 패널 전환 애니메이션 제거.

> **mockup 경로 주의**: frozen ui-contract 가 mockup 산출물을 `docs/design/dossier-trace-mockup.html` 로 명시하므로, 일반 designer 규약의 `docs/design/mockups/` 하위가 아니라 계약이 지정한 경로를 따른다.

---

## 2. 컬러 팔레트

### 2.1 계약 토큰 (frozen — 값 변경 금지)

| 토큰 | 값 (HEX) | 용도 |
| --- | --- | --- |
| `--color-bg-surface` | `#0f172a` | 대시보드 표면 배경 (background) |
| `--color-text-primary` | `#e2e8f0` | 기본 텍스트 (text) |
| `--color-status-ready` | `#22c55e` | 완료(ready) 상태 — primary status |
| `--color-status-progress` | `#f59e0b` | 진행(progress) 상태 — secondary status |
| `--color-status-error` | `#ef4444` | 오류(error) 앱 상태 — accent status |

역할 매핑: primary background = `--color-bg-surface`, primary text = `--color-text-primary`, 상태 accent = `ready/progress/error` 3색.

### 2.2 mockup 시각 보조값 (비계약 — dev 채택 의무 없음)

frozen 토큰 6종에 없는 표면 계층·경계·중립 상태를 mockup 에서 그리기 위한 보조값이다. **계약 토큰을 재정의하지 않으며**, dev 는 픽셀 일치 의무가 없다.

| 보조 변수 | 값 | 용도 |
| --- | --- | --- |
| `--mk-bg-elevated` | `#1e293b` | 카드·패널 표면(배경보다 한 단계 밝게) |
| `--mk-border` | `#334155` | 카드·패널·필터 경계선 |
| `--mk-text-muted` | `#94a3b8` | 보조 텍스트·caption |
| `--mk-status-wait` | `#64748b` | **대기** 상태 중립색 (아래 5.3 ⚠️ 참조) |

---

## 3. 타이포그래피

외부 폰트 의존 0건 — vanilla-static 규약(system font stack)을 따른다.

```
--mk-font: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
```

| 역할 | font-size | weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| heading (대시보드 제목) | 20px | 700 | 1.3 | `--color-text-primary` |
| section (필터 그룹 라벨/상세 헤더) | 15px | 600 | 1.4 | `--color-text-primary` |
| body (카드 제목) | 14px | 600 | 1.45 | `--color-text-primary` |
| body (카드 설명/상세 본문) | 13px | 400 | 1.55 | `--mk-text-muted` |
| badge (상태 텍스트) | 12px | 600 | 1 | 상태색, 대문자 없이 한국어 |
| caption (메타/키보드 힌트) | 11px | 400 | 1.4 | `--mk-text-muted` |

---

## 4. 레이아웃

### 4.1 섹션 구조 (위→아래)

1. **헤더** — 대시보드 제목 + 상태 요약(app state 텍스트).
2. **필터 바** (`dossier__filters`) — `전체 / 진행 / 완료` 버튼 3종.
3. **본문 2열 (≥ 640px)**
   - 좌: 카드 리스트 (`dossier-list`) — 상태 카드 세로 나열.
   - 우: 상세 패널 (`dossier-detail-panel`) — 선택 항목 상세.
4. **360px ~ 639px** — 리스트와 상세 패널이 **세로 스택**으로 재배치.

### 4.2 spacing

- 카드 간 간격: `--space-card-gap` = `16px` (frozen).
- 컨테이너 padding: 20px (데스크톱) / 16px (360px).
- 필터 버튼 간격: 8px.
- 카드 내부 padding: 14px 16px.

### 4.3 breakpoint 동작

| viewport | 리스트/패널 배치 | 컨테이너 padding | 비고 |
| --- | --- | --- | --- |
| ≥ 640px | 2열 (리스트 좌 · 패널 우) | 20px | 패널 폭 고정 320px |
| 360px ~ 639px | 1열 세로 스택 | 16px | 리스트 위, 패널 아래. overflow 없음 |
| < 360px | 계약 범위 밖 | — | 360px 를 최소 지원 폭으로 고정 |

---

## 5. 컴포넌트 명세

### 5.1 루트 컨테이너

- selector: `#dossier-trace-root.dossier`
- data-state: `loading` \| `empty` \| `ready` \| `error` (4상태, 색상 아닌 화면 텍스트로 구분).

### 5.2 필터 버튼 그룹 (`dossier__filters`)

| 버튼 | id | 라벨 | 필터 조건 |
| --- | --- | --- | --- |
| 전체 | `dossier-filter-all` | 전체 | 모든 카드 |
| 진행 | `dossier-filter-progress` | 진행 | 진행 상태 카드 |
| 완료 | `dossier-filter-done` | 완료 | 완료 상태 카드 |

- 상태: 기본 / hover / focus-visible / 활성(선택).
- **활성 버튼**은 `aria-selected="true"` + 시각 강조(밑줄/배경 강조).
- 인터랙션: Tab 으로 그룹 진입, **화살표 키**로 버튼 간 이동, Enter/Space 로 적용.
- props(권장): `active: boolean`, `count: number`(옵션 배지).

### 5.3 상태 badge (`dossier__status-badge`)

색상 + **아이콘 + 텍스트** 3중 병기 (색각 이상 대응 필수).

| 항목 상태 | 텍스트 | 아이콘 | 색상 토큰 |
| --- | --- | --- | --- |
| 완료 | `완료` | ✓ | `--color-status-ready` (#22c55e) |
| 진행 | `진행` | ◐ | `--color-status-progress` (#f59e0b) |
| 대기 | `대기` | ○ | `--mk-status-wait` (#64748b) ⚠️ |

> ⚠️ **flag (dev 확인 필요)**: frozen 토큰은 `완료→ready / 진행→progress / 오류→error` 3종만 색상을 지정한다. 항목 상태 목록(planner §4)에는 `대기` 가 있으나 매핑되는 frozen 색상 토큰이 없다. `--color-status-error`(#ef4444)는 **앱 레벨 `error` 상태 배너**에만 사용하고, `대기` 는 오해를 막기 위해 중립 slate(`--mk-status-wait`)로 표현했다. dev/planner 가 `대기` 전용 토큰을 확정하기 전까지 이 값은 mockup 시각 보조로만 사용한다.

- badge 접근성 이름: 색상과 무관하게 상태명 텍스트가 화면·accessible name 에 노출.

### 5.4 상태 카드 (`dossier__card`)

- 공통: `dossier__card` + 종류별 변형 class.

| 카드 종류 | 변형 class | 좌측 accent |
| --- | --- | --- |
| 요구사항 | `dossier__card--requirement` | 종류 구분용 세로 accent 바 |
| 역할 | `dossier__card--role` | 종류 구분용 세로 accent 바 |
| 테스트 | `dossier__card--test` | 종류 구분용 세로 accent 바 |

- 구성: 카드 제목(body) + 종류 라벨(caption) + 상태 badge(5.3).
- 상태: 기본 / hover / focus-visible / 선택(`aria-selected="true"`).
- 인터랙션: 리스트 내 화살표 키 이동, Enter/Space 로 선택 → 상세 패널 오픈.
- props(권장): `kind: 'requirement'|'role'|'test'`, `status: '완료'|'진행'|'대기'`, `title`, `selected: boolean`.

### 5.5 상세 패널 (`dossier-detail-panel` / `dossier__detail`)

- `dossier-detail-panel`: 패널 컨테이너. 열림/닫힘.
- `dossier__detail`: 선택 항목 상세 본문(제목·종류·상태·설명).
- 닫기 control: `aria-label="상세 패널 닫기"` 를 가진 버튼.
- 열림/닫힘 전환에 짧은 애니메이션 사용, **`prefers-reduced-motion: reduce` 시 전환 제거**.
- **후조건 불변식**: 초기화·취소·실패 뒤에는 상태·진행 표시를 초기값으로 되돌리고 주 실행 control(필터·카드)을 다시 사용 가능하게 한다.

### 5.6 앱 상태별 화면 (states)

| 상태 | 화면 표현 (색상 아닌 텍스트) |
| --- | --- |
| `loading` | "불러오는 중…" 텍스트 + 스켈레톤(reduced-motion 시 정적). 상세 패널 미개방. |
| `empty` | "표시할 항목이 없습니다" 텍스트. 상세 패널 미개방. |
| `ready` | 카드 리스트 렌더 + 필터 활성. |
| `error` | `--color-status-error` 배너 + "불러오지 못했습니다" 텍스트 + 재시도 control. 재시도 시 초기값 복구. |

---

## 6. 접근성 요약 (frozen 계약 반영)

- 상태 badge: 색상 + 아이콘 + 텍스트(완료/진행/대기) 병기.
- 필터·카드 리스트: Tab/Shift+Tab + 화살표 키 탐색, 선택 항목 `aria-selected`.
- 상세 패널: `aria-label` control 로 열고 닫음, `prefers-reduced-motion` 시 애니메이션 제거.
- 모든 상태: 색상만으로 구분하지 않고 상태명을 화면 텍스트 + accessible name 으로 노출.
- focus-visible: 모든 상호작용 요소에 명확한 focus ring(2px, `--color-status-progress` 계열 or 텍스트색 대비).

---

## 7. dev 구현 가이드 (BF-1248)

> 아래는 **frozen 계약값을 그대로 옮긴** 권장 가이드다. selector/token 은 계약값 고정, 시각 보조값은 참조용.

1. `demo/dossier-trace/styles.css` `:root` 에 계약 토큰 6종을 정의한다.
   ```css
   :root {
     --color-bg-surface: #0f172a;
     --color-text-primary: #e2e8f0;
     --color-status-ready: #22c55e;
     --color-status-progress: #f59e0b;
     --color-status-error: #ef4444;
     --space-card-gap: 16px;
   }
   ```
2. 루트 `#dossier-trace-root.dossier` 에 `data-state` 로 loading/empty/ready/error 를 스위칭.
3. 필터 그룹 `.dossier__filters` 에 `#dossier-filter-all/-progress/-done` 버튼, 활성 버튼 `aria-selected="true"`.
4. 리스트 `#dossier-list` 에 카드 `.dossier__card` + `--requirement/--role/--test` 변형, 카드 간 `gap: var(--space-card-gap)`.
5. 상태 badge `.dossier__status-badge` 는 아이콘 + 텍스트 병기(§5.3), 색상은 상태 토큰.
6. 상세 패널 `#dossier-detail-panel` > `.dossier__detail`, 닫기 버튼 `aria-label`, `@media (prefers-reduced-motion: reduce)` 로 transition 제거.
7. 반응형: `@media (max-width: 639px)` 에서 리스트·패널 세로 스택, 360px overflow 없음.
8. 데이터는 `demo/dossier-trace/fixtures.js` 결정론적 fixture 만 사용(외부 fetch 금지).
9. `대기` 상태 색상 토큰이 계약에 없으므로(§5.3 ⚠️), 확정 전까지 중립색 처리 또는 planner 재확인.

권장 CSS 변수/클래스명은 위 계약값과 §2.2 보조값을 사용한다. **계약 selector·token 은 변경하지 않는다.**

---

## 8. mockup 참조

- 시각 mockup: **`docs/design/dossier-trace-mockup.html`** (frozen 계약이 지정한 경로)
- 단일 self-contained HTML, 외부 의존성 0건, 다크 테마.
- 포함 시안: ready(2열·상세 열림) / loading / empty / error / 360px 세로 스택 / 상태·hover·focus 상태 카탈로그 / reduced-motion 노트.
- dev 는 mockup 을 **참조 가이드**로 사용하되 픽셀 단위 일치 의무는 없다.
</content>
</invoke>

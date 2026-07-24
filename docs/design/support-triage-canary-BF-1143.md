# 고객 문의 분류 SPA — 디자인 명세 (BF-1143 / 작업 BF-1149)

route: `/demo/support-triage-canary` · module: `support-triage-canary` · tech-stack marker: `typescript-monorepo`

> **stack 관측 정정**: 저장소 base(`a9c2b6b`) 관측 결과 실제 규약은 `vanilla-static`(외부 의존성 0, system font, `:root` CSS 변수 자체 정의)이다. 요청 marker(`typescript-monorepo`)와 불일치하므로 본 명세는 **관측된 vanilla-static 규약**을 따른다 — design-tokens.json 이 아니라 기존 demo `:root` 토큰 세트를 참조·재사용한다.
> **ownership 정정(fail-honest)**: 요청 route 의 구현 진입점 `demo/support-triage-canary/index.html` 은 designer 소유 경로가 아니다. 본 task 는 디자인 명세 + mockup 만 생성하며, 실제 SPA 구현(진입점/로직/테스트)은 dev-1 담당이다.

---

## 1. 시안 개요

### 변경 범위
- 신규 경량 SPA `/demo/support-triage-canary` 의 화면 디자인 명세.
- 접수된 고객 문의를 **우선순위(긴급/일반)** × **담당 영역(결제/계정/배송/기술)** 으로 필터링하고, 각 문의의 **처리 상태(신규/처리중/완료)** 를 배지로 표시하는 단일 화면.
- 로컬 상태 전용(네트워크 없음, sibling `demo/service-request-triage` 와 동일한 로컬 시드 패턴).

### 사용자 경험 목표
- 상담원이 상단 필터 바에서 우선순위·담당 영역을 좁혀 **긴급 문의를 먼저** 처리할 수 있게 한다.
- 카드 한 장에서 **우선순위 · 담당 영역 · 처리 상태**를 서로 다른 시각 인코딩으로 구분해 한눈에 파악한다.
- 기존 demo(`service-request-triage`) 와 **동일한 토큰·레이아웃 언어**로 학습 비용 없이 사용한다.

### 기존 demo·공용 토큰과의 일관성 (참조 전용 — 변경 없음)
- 컬러/타이포/스페이싱/라운드 토큰은 `demo/service-request-triage/index.html` `:root` 세트를 **그대로 재사용**한다(HEX 동일). **신규 토큰 추가·기존 토큰 변경 없음.**
- 시각 인코딩 원칙도 sibling 을 계승: **범주형=outline 태그**, **서열/우선순위=시맨틱 색상 배지 + accent**, 색만으로 서열을 암시하지 않고 형태를 병행한다.
- 페이지 골격(`.page` 940~1000px 컨테이너, `.page__header`, `.section`, `.panel`, `.notice`, `.divider`)과 반응형 breakpoint(≤640px)를 정렬한다.

---

## 2. 컬러 팔레트 (공용 토큰 재사용 — 신규 없음)

| 역할 | 토큰 | HEX | 용도 |
|---|---|---|---|
| Primary | `--color-primary` | `#2563EB` | 필터 칩 선택 상태 텍스트/보더, 신규 상태 |
| Primary hover | `--color-primary-hover` | `#1D4ED8` | (구현 시) 버튼 hover 강조 |
| Primary soft | `--color-primary-soft` | `#EAF1FE` | 선택 칩 배경, 신규 배지 배경, focus ring |
| Background | `--color-bg` | `#F7F8FA` | 페이지 배경, 상태 배지 중립 배경 |
| Surface | `--color-surface` | `#FFFFFF` | 카드·필터 바·패널 배경 |
| Border | `--color-border` | `#E2E5EA` | 카드/칩/구분선 보더, 좌측 accent 기본 |
| Text | `--color-text` | `#1F2430` | 제목/본문 텍스트 |
| Text muted | `--color-text-muted` | `#6B7280` | 부제/메타/일반 우선순위 텍스트 |
| Warning | `--color-warning` | `#D97706` | 긴급 우선순위, 처리중 상태 |
| Warning soft | `--color-warning-soft` | `#FEF3E2` | 긴급 배지·처리중 배지 배경 |
| Success | `--color-success` | `#16A34A` | 완료 상태 |
| Success soft | `--color-success-soft` | `#ECFDF3` | 완료 배지 배경 |
| Pending | `--color-pending` | `#9CA3AF` | 일반 우선순위 accent, 상태 dot 기본 |
| Pending soft | `--color-pending-soft` | `#F3F4F6` | 일반 우선순위 배지 배경 |

> **색 충돌 회피**: 긴급(우선순위)과 처리중(상태)이 모두 warning 계열이므로 **형태로 분리**한다 — 우선순위는 `🔥` glyph 를 가진 solid soft 배지 + 카드 좌측 accent, 상태는 선행 dot 을 가진 배지. 담당 영역은 색 서열 없는 outline 태그로 별개 축임을 명확히 한다.

---

## 3. 타이포그래피 (공용 토큰 재사용)

font-family 는 전역 `--font-sans` (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans KR", sans-serif`) 단일 사용. Google Fonts 등 외부 폰트 없음.

| 역할 | size / line-height | weight | 적용 |
|---|---|---|---|
| Page title | 22px / 30px | 700 | `.page__title` |
| Page subtitle | 14px / 20px | 400 | `.page__subtitle` (muted) |
| Section heading | 15px / 22px | 600 | `.section__heading` |
| Card title | 15px / 22px | 600 | `.inquiry-card__title` |
| Card snippet/body | 13px / 20px | 400 | `.inquiry-card__snippet` (muted) |
| Chip / tag / badge | 12–13px / 16–18px | 500–700 | 필터 칩·배지·태그 |
| Footer / caption | 12px / 16px | 400–500 | `.inquiry-card__footer`, `.chip__count` |

---

## 4. 레이아웃

### 섹션 구조 (위→아래)
1. **헤더** (`.page__header`) — 타이틀 + 부제(문의 분류 목적 안내).
2. **필터 바** (`.filter-bar`) — 2개 필터 그룹(우선순위, 담당 영역)을 세로 스택. 각 그룹은 라벨 + 칩 세트.
3. **결과 요약 줄** (`.result-bar`) — 현재 필터에 매칭된 문의 건수 + 정렬 안내.
4. **문의 리스트** (`.inquiry-list`) — 문의 카드 세로 스택(최신순).
5. **빈 상태** (`.notice`) — 필터 결과 0건 안내.
6. **인코딩 범례 · 상태 참조** (`.panel`) — 세 축의 시각 인코딩 + 배지/칩 상태 시각화(명세 검증용).

### spacing (공용 `--space-*` 재사용)
- 페이지 패딩: `--space-6`(상하) / `--space-4`(좌우), 컨테이너 max-width 1000px 중앙 정렬.
- 필터 그룹 간 간격 `--space-4`, 칩 간격 `--space-2`.
- 카드 간격 `--space-3`, 카드 내부 요소 간격 `--space-2`, 카드 패딩 `--space-4`.

### breakpoint 별 동작
- **≥ 641px (기본)**: 필터 칩 가로 wrap, 카드 head 는 제목(좌)–상태 배지(우) 양끝 정렬.
- **≤ 640px**: 카드 `__head` 를 세로 스택(제목 아래 상태 배지), 칩 간격 `--space-1` 로 축소. 리스트는 항상 1열(모바일 우선 단일 컬럼).

---

## 5. 컴포넌트 명세

### 5.1 FilterChipGroup (필터 칩 그룹)
- **props**: `label`(string), `options[] = { key, label, glyph?, count }`, `selectedKey`, `onSelect(key)`.
- **상태**: 기본 / hover(보더·텍스트 primary) / 선택(`aria-pressed="true"`, primary-soft 배경) / focus-visible(primary focus ring).
- **인터랙션**: 단일 선택(라디오 성격). "전체" 는 해당 축 필터 해제. 두 필터 그룹은 AND 결합.
- **접근성**: `role="group"` + `aria-label`, 각 칩은 `<button type="button">` + `aria-pressed`.

### 5.2 PriorityBadge (우선순위 배지 — 긴급/일반)
- **props**: `priority: "urgent" | "normal"`.
- `urgent` → `.priority-badge--urgent` (warning-soft 배경 / warning 텍스트 / `🔥` glyph), 카드 좌측 accent warning.
- `normal` → `.priority-badge--normal` (pending-soft 배경 / muted 텍스트 / glyph 없음), 카드 좌측 accent pending.
- **상태**: 정적 표시(상호작용 없음).

### 5.3 AreaTag (담당 영역 태그)
- **props**: `area: "billing" | "account" | "delivery" | "technical"`, 각 glyph(`💳`/`👤`/`📦`/`🛠`) + 라벨(결제/계정/배송/기술).
- outline 스타일(surface 배경 + border), **색 서열 없음** — 범주형임을 명확히.

### 5.4 StatusBadge (처리 상태 배지 — 신규/처리중/완료)
- **props**: `status: "new" | "progress" | "done"`.
- 선행 `.status-dot` + 라벨. `new`→primary, `progress`→warning, `done`→success (dot + soft 배경 + 텍스트 동색).
- **상태**: 정적 표시.

### 5.5 InquiryCard (문의 카드)
- **props**: `title`, `snippet`, `priority`, `area`, `status`, `author`, `ticketId`, `relativeTime`.
- **구성**: head(제목 + 상태 배지) / snippet / meta(우선순위 배지 + 영역 태그) / footer(문의자 · 티켓번호 · 상대시간).
- 좌측 4px accent 로 우선순위 서열을 배지와 **이중 인코딩**.

### 5.6 EmptyState (빈 상태)
- 필터 결과 0건일 때 `.notice`(dashed border) 로 "해당 문의 없음 + 필터 변경 유도" 표시.

---

## 6. dev 구현 가이드 (dev-1 용)

> 구현 진입점(dev 소유): `demo/support-triage-canary/index.html` (+ 필요 시 로컬 모듈/시드). 관측 규약 = **vanilla-static**: 단일 self-contained HTML, 외부 의존성 0, `:root` 토큰 자체 정의(아래 세트 복사).

1. **토큰 `:root`**: sibling `demo/service-request-triage/index.html` 의 `:root` 블록을 **그대로 복사**. 신규 custom property 추가 금지, HEX 변경 금지.
2. **필터 상태**: `state = { priority: 'all'|'urgent'|'normal', area: 'all'|'billing'|'account'|'delivery'|'technical' }`. 두 필터 AND 결합 후 리스트 재렌더. 칩 클릭 → 해당 축 `state` 갱신 + `aria-pressed` 토글.
3. **권장 클래스명 (mockup 과 정렬)**:
   - 필터: `.filter-bar`, `.filter-group`, `.filter-group__label`, `.filter-chips`, `.chip`(+ `[aria-pressed="true"]`), `.chip__count`.
   - 리스트/카드: `.inquiry-list`, `.inquiry-card`(+ `--urgent`/`--normal`), `.inquiry-card__head/__title/__snippet/__meta/__footer`.
   - 배지: `.priority-badge`(+ `--urgent`/`--normal`), `.area-tag`, `.status-badge`(+ `--new`/`--progress`/`--done`), `.status-dot`.
   - 공통: `.page`, `.section`, `.panel`, `.notice`, `.divider`, `.result-bar`.
4. **결과 요약**: 필터 매칭 건수를 `.result-bar__count` 에 반영. 0건이면 리스트 대신 `.notice`(빈 상태) 렌더.
5. **접근성**: 필터 그룹 `role="group"`+`aria-label`, 상태 배지의 dot 은 `aria-hidden`, 상태 텍스트는 라벨로 노출. focus-visible ring 유지.
6. **반응형**: ≤640px 에서 `.inquiry-card__head` 세로 스택 규칙 적용.
7. **금지**: 공용 토큰 값/이름 변경, 신규 토큰 추가, 외부 폰트/라이브러리 도입.

---

## 7. mockup 참조

- **파일(owned 경로)**: `docs/design/mockups/support-triage-canary/support-triage-canary-BF-1143.html`
- 본 명세의 컬러·타이포·레이아웃·컴포넌트를 단일 self-contained HTML(외부 의존성 0)로 시각화. placeholder 데이터 6건 + 빈 상태 + 인코딩 범례/상태 참조 포함.
- 픽셀 단위 일치 의무 없음 — UX 의도·시각 인코딩 전달용 참조.
- **staging 참고(fail-honest)**: 본 Run 런타임의 `cross-canary-scope-guard` 가 `.html` 파일에 대한 Bash `git add` 를 (경로 무관) 차단하여 designer 가 mockup 을 수동 stage 하지 못했다. mockup 파일은 owned 경로에 생성 완료되어 있으며, owned-path staging 은 시스템/worker 에 위임한다. `.md` 명세는 정상 stage/commit 됨.

---

## 8. AC 매핑 표

| 수용 기준 | 충족 근거 | 위치 |
|---|---|---|
| AC1 — 명세에 필터·우선순위·상태표시 UI 포함 | 필터 칩 그룹(§5.1), 우선순위 배지(§5.2), 처리 상태 배지(§5.4) 명세화 | §2·§4·§5, mockup |
| AC1 — AC 매핑 표 포함 | 본 표(§8) | §8 |
| AC1 — 문서 경로 `docs/design/support-triage-canary-BF-1143.md` | 본 파일 경로 준수 | 파일 자체 |
| AC2 — 공용 토큰 재사용 | §2 팔레트 전량 기존 `:root` 토큰(HEX 동일) | §2, mockup `:root` |
| AC2 — 신규 토큰 추가·기존 토큰 변경 없음 | 신규 custom property 0건, HEX 변경 0건 (§6-1·§6-7 dev 금지 조항 포함) | §2·§6, mockup |
| Epic 가치 — 긴급 문의 우선 처리 | 우선순위 필터 + 긴급 accent/배지 이중 인코딩 | §5.2·§5.5 |
| 담당 영역 필터 UI | AreaTag 4종 + 담당 영역 칩 필터(AND 결합) | §5.1·§5.3 |
| 처리 상태 배지 레이아웃 | 신규/처리중/완료 dot+라벨 배지 | §5.4 |

---

## 9. Self-critique

- **AC 매핑**: 두 AC 를 §8 표로 명시 매핑. 필터/우선순위/상태 UI + 매핑 표 + 공용 토큰 재사용/무변경 모두 커버. ✅
- **dev 구현 가이드**: §6 에 상태 모델·클래스명·토큰 복사·반응형·접근성·금지 조항까지 단계별 제시. dev 가 바로 착수 가능. ✅
- **기존 요소 보존**: 공용 토큰은 참조·재사용만, 신규/변경 0건. sibling `service-request-triage` 의 인코딩 언어·페이지 골격 계승. ✅
- **컴포넌트 매핑**: mockup 의 모든 컴포넌트(FilterChipGroup/PriorityBadge/AreaTag/StatusBadge/InquiryCard/EmptyState)를 §5 props/상태로 1:1 명세. ✅
- **모호함 flag**:
  1. 관측 stack = `vanilla-static` ≠ 요청 marker `typescript-monorepo`. 본 명세는 관측 규약을 authority 로 채택(§ 상단 정정). dev 는 design-tokens.json 이 아닌 `:root` 복사 방식으로 구현.
  2. 담당 영역 4종(결제/계정/배송/기술)·상대시간·티켓번호 형식은 **예시 데이터**다. 실제 도메인 카테고리·데이터 스키마는 dev/기획 시드 기준으로 조정 가능(디자인 축·인코딩은 불변).
  3. 정렬(최신순) 외 정렬 옵션·페이지네이션은 본 시안 범위 밖(경량 SPA 단일 화면). 필요 시 후속 task 로 분리 권장.

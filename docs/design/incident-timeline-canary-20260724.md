# 장애 타임라인 패널 — 디자인 명세 (BF-1133)

- 대상: 데스크톱 운영 콘솔의 **장애 타임라인 패널**(단일 패널, 신규 시안)
- 관련 Task: **BF-1133(designer, 본 문서 — designer-only 단독 모드)**
- mockup 참조: `docs/design/mockups/incident-timeline-canary-20260724.html`
- 스택 규약: 저장소 관측 규약 = `vanilla-static`. 외부 의존성 0건, system font stack, 토큰은 `:root` CSS 변수로 자체 정의. 하드코딩 색상 금지(모든 색상은 토큰 변수 경유).
- 산출 범위: 본 명세 markdown + mockup HTML 신규 2파일만. **기존 파일 수정 없음.** 후속 구현이 필요하면 별도 Epic 게시 권장(본 task 는 cascade 없음).

> ⚠️ **신규 색상 토큰 0건 (핵심 제약).** 본 시안은 상태(정상·저하·장애)를 **색상이 아닌 형태·패턴·라벨**로 구분한다. 그 결과 상태 표현에 새 색상 토큰이 전혀 필요 없다. `:root` 에 선언한 색상은 모두 brix-Flow 공용 중립 팔레트(기존 canary 시안과 동일 값)를 **재사용**한 것이며, 본 명세가 새로 도입하는 색상 토큰은 없다(§2 참조).

---

## 1. 시안 개요

### 무엇을, 누구를 위해
- **주체**: on-call 운영자 / 인시던트 커맨더(IC)가 지켜보는 장애 대응 콘솔의 한 패널.
- **한 가지 임무**: 스트레스 상황에서 한 번의 스캔으로 **"무엇이 얼마나 망가졌고(현재 영향), 언제 그렇게 됐고(타임라인), 누가 맡고 있고(담당자), 지금 뭘 해야 하나(다음 액션)"** 4가지를 즉시 답한다.

### 변경 범위
- 4개 정보 영역을 **한 패널**에 배치한 신규 정적 시안:
  1. **현재 영향 요약 바** — 지금 상태 · 영향 서비스/사용자 · 경과 시간 · 담당자.
  2. **장애 타임라인 레일** — 이벤트를 시간 순서로 세로 스캔(위=과거, 아래=현재).
  3. **담당자** — 현재 소유자(IC) 표시 + 재지정 입력.
  4. **다음 액션 패널** — 현재 상태에서 운영자가 즉시 실행할 우선 액션(primary CTA 1개 + 보조 액션).
- 빈 상태(진행 중 장애 없음)와 실패 상태(타임라인 로드 실패)를 명확히 구분해 정의.

### 사용자 경험 목표
1. **형태로 각인, 색으로 의존하지 않음** — 정상/저하/장애를 도형 실루엣 + 테두리 패턴 + 텍스트 라벨의 **3중 중복 부호화**로 구분. 색맹·모노크롬 화면에서도 완전히 판별 가능.
2. **시간 순서 스캔** — 세로 레일 한 줄을 위에서 아래로 훑으면 사건 전개가 그대로 읽힌다. 각 노드에 절대 시각 + 직전 이벤트로부터 경과(Δ)를 병기.
3. **최소 조작으로 즉시 액션** — "다음 액션"은 현재(가장 최근·가장 심각) 상태에 연동된 단일 primary CTA를 항상 최상단에 고정.
4. **접근성 기본 보장** — 키보드만으로 전체 흐름 수행, 명시적 포커스 순서, 4.5:1 이상 텍스트 대비, 모든 인터랙티브 요소 라벨링, `prefers-reduced-motion` 존중.

### signature — "상태를 칠하지 않는 콘솔"
색을 뺀 자리를 **형태**가 채운다. 좌측 세로 레일의 각 노드는 상태별로 다른 도형(● ◆ ■)과 테두리 패턴(실선/파선/이중선), 배경 해칭으로 스스로를 설명한다. 화면 전체에서 채도 있는 색은 단 하나 — 운영자가 눌러야 할 **다음 액션 CTA**(및 장애 표식의 danger 강조)에만 등장한다. 절제가 곧 signature다.

---

## 2. 컬러 팔레트 (전부 기존 공용 토큰 재사용 — 신규 0건)

모든 값은 brix-Flow 공용 중립 팔레트로 기존 canary 시안과 동일하며, mockup `:root` 와 1:1 동기화한다. 대비값은 WCAG 기준(본문 4.5:1, 큰 텍스트/UI 컴포넌트 3:1) 충족.

| 토큰 | HEX | 용도 | 대비 검증 |
|---|---|---|---|
| `--bf-color-bg` | `#f4f6f9` | 패널 바깥 배경 | — |
| `--bf-color-surface` | `#ffffff` | 패널/카드 배경 | — |
| `--bf-color-surface-muted` | `#eef1f6` | 요약 바 / 해결된 노드 배경 | — |
| `--bf-color-border` | `#d5dae1` | 테두리/구분선 | 표면 대비 ≈ 3:1↑(UI) |
| `--bf-color-text` | `#1a2230` | 본문/제목 텍스트 | on `#ffffff` ≈ 14.8:1 |
| `--bf-color-text-muted` | `#4d5769` | 시각·라벨·보조 텍스트 | on `#ffffff` ≈ 7.1:1 |
| `--bf-color-primary` | `#1d4ed8` | 다음 액션 primary CTA / 포커스 링 | white 텍스트 ≈ 6.3:1 |
| `--bf-color-primary-hover` | `#1740a6` | primary CTA hover | white 텍스트 ≈ 8.4:1 |
| `--bf-color-on-primary` | `#ffffff` | primary CTA 텍스트 | — |
| `--bf-color-danger` | `#b3261e` | 장애(outage) 표식 강조 / 실패 상태 텍스트 | on `#ffffff` ≈ 6.6:1 |
| `--bf-color-focus` | `#1d4ed8` | `:focus-visible` outline | 표면 대비 ≈ 6.3:1(UI) |

> **상태 표현에는 색상 토큰을 배정하지 않는다.** 정상·저하·장애는 아래 §5.2 의 형태/패턴/라벨로만 구분된다. `--bf-color-danger` 는 "장애" 상태의 색이 아니라, 장애 노드의 아이콘/현재 표식을 **보강**하는 강조일 뿐이며(라벨·도형·패턴이 이미 상태를 전달), 색을 못 보는 사용자도 정보 손실이 없다.

---

## 3. 타이포그래피

system font stack + system monospace stack 사용(외부 폰트 로드 없음). 타임스탬프를 **모노스페이스**로 세팅해 "운영 로그 스트립"의 정체성을 부여하고 세로 정렬을 안정화한다.

```
--bf-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
--bf-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
```

| 역할 | 토큰 | font-size | weight | line-height | 용도 |
|---|---|---|---|---|---|
| Panel title (h1) | `--bf-type-h1` | 22px (1.375rem) | 700 | 1.3 | 패널 제목 "장애 타임라인" |
| Section title (h2) | `--bf-type-h2` | 16px (1rem) | 600 | 1.35 | "타임라인" / "다음 액션" |
| Node title (h3) | `--bf-type-h3` | 15px (0.9375rem) | 600 | 1.4 | 타임라인 이벤트 제목 |
| Body | `--bf-type-body` | 14px (0.875rem) | 400 | 1.5 | 본문/입력/버튼 |
| Timestamp (mono) | `--bf-type-mono` | 13px (0.8125rem) | 500 | 1.4 | 노드 시각·경과(Δ)·경과 타이머 |
| Caption | `--bf-type-caption` | 12px (0.75rem) | 500 | 1.45 | 라벨·보조 메타 |

- 최소 본문 14px 유지. 모든 숫자(경과 시간·영향 사용자 수·Δ)는 `font-variant-numeric: tabular-nums` 로 정렬 안정화.

---

## 4. 레이아웃

### 전체 구조 (단일 패널, 데스크톱 우선)
```
┌ panel (max-width 1080px, 중앙 정렬, surface 배경, 1px border, radius 12px) ─────┐
│ <header> 현재 영향 요약 바 (surface-muted)                                       │
│   h1: 장애 타임라인            [상태 표식 ■ 장애]   경과 00:42:17(mono, live)      │
│   영향 서비스: 결제·정산·영수증(3)   ·   영향 사용자: ~12,400   ·   심각도: SEV-1  │
│   담당(IC): 김온콜  ·  [담당 재지정 ▾]                                            │
│ ───────────────────────────────────────────────────────────────────────────── │
│ <main> 2-column (좌 레일 : 우 액션 = 1fr : 320px)                                │
│  ┌ 좌: <section> 타임라인 레일 ───────────┐  ┌ 우: <aside> 다음 액션 ─────────┐ │
│  │  ┃                                     │  │ h2: 다음 액션                   │ │
│  │  ┣● 14:02 · Δ—    정상 · 배포 완료      │  │ 지금 (장애 · 결제 API)          │ │
│  │  ┃                                     │  │ ▸ [롤백 실행]  ← primary CTA    │ │
│  │  ┣◆ 14:20 · Δ18m  저하 · 응답지연 감지  │  │ ▸ 상태페이지 업데이트           │ │
│  │  ┃  ⌇⌇(dashed/hatch)                   │  │ ▸ 인시던트 브릿지 열기          │ │
│  │  ┣■ 14:31 · Δ11m  장애 · 결제 5xx 급증  │  │ ───────────────                │ │
│  │  ┃  ▓▓(double/dense) ◀ 현재            │  │ 담당 재지정 [________] [지정]   │ │
│  │  ┃                                     │  │                                 │ │
│  └─────────────────────────────────────── ┘  └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────── ┘
```

### 스페이싱 (8px 그리드 토큰)
`--bf-space-1:4px · -2:8px · -3:12px · -4:16px · -5:20px · -6:24px · -8:32px`
- 패널 내부 padding: `--bf-space-6`. 요약 바 하단 여백: `--bf-space-5`.
- 레일 노드 간 세로 간격: `--bf-space-5`. 노드 내부 padding: `--bf-space-3`.
- 좌우 컬럼 gap: `--bf-space-6`.

### 타임라인 레일 상세
```
 축(1px 세로 라인, --bf-color-border) 이 좌측을 관통.
 각 노드 = [도형 마커(원/축 위)] + [노드 카드(시각·Δ·상태라벨·제목·요약)]
 정렬: 위=과거, 아래=현재(chronological asc). 최신(현재) 노드에 "◀ 현재" 표식 + 강조 테두리.
```

### 반응형 breakpoint
- **≥ 960px (desktop)**: 위 2-column. 요약 바 메타는 한 줄 정렬(가로 wrap).
- **640–959px (narrow desktop/tablet)**: 다음 액션 패널이 레일 **아래로** 스택(1-column). 액션 CTA는 100% 폭.
- **< 640px (mobile)**: 요약 바 메타 세로 스택. 레일 노드 카드 100% 폭. 터치 타겟 최소 높이 44px. 경과 타이머·CTA 항상 노출.

---

## 5. 컴포넌트 명세

### 5.1 `IncidentTimelinePanel` (패널 컨테이너)
- props: `incident: { id, severity, elapsedSeconds, impactedServices: string[], impactedUsers: number, owner: string } | null`, `events: TimelineEvent[]`, `loadState: "ok" | "empty" | "error"`
- 파생: `currentEvent = events[events.length - 1]`(최신), `currentStatus = currentEvent?.status`. 다음 액션은 `currentStatus` 에 연동.
- 렌더 분기: `loadState==="error"` → §5.7 실패 상태 / `loadState==="empty"` 또는 `events.length===0` → §5.6 빈 상태 / 그 외 → 요약 바 + 레일 + 액션 패널.

### 5.2 `StatusMarker` — 상태를 **색 없이** 표현 (핵심 컴포넌트)
- props: `status: "operational" | "degraded" | "outage"`, `isCurrent?: boolean`
- **3중 중복 부호화(색상 비의존)**:

| status | 라벨(항상 표기) | 도형 글리프 | 노드 테두리 패턴 | 배경 해칭 | 색 강조 |
|---|---|---|---|---|---|
| `operational` | "정상" | `●` (원) | `solid 1px` | 없음(surface) | 없음(중립) |
| `degraded` | "저하" | `◆` (마름모) | `dashed 2px` | 대각 빗금(중립 hatch) | 없음(중립) |
| `outage` | "장애" | `■` (사각) | `double 3px` | 촘촘한 크로스해치(중립) | 아이콘/현재 표식만 `--bf-color-danger` 보강 |

- 도형 실루엣(원/마름모/사각)은 축약 없이도 서로 다른 외곽선으로 구분 → 저해상도·모노크롬에서도 판별.
- `aria-label` = `"상태: 정상|저하|장애"`. 도형은 `aria-hidden`(라벨이 정보 전달), 라벨 텍스트가 접근성 소스.
- `isCurrent` 이면 마커에 "◀ 현재" 텍스트 표식 + 노드 카드에 강조 테두리(색이 아닌 굵기/오프셋).

### 5.3 `SummaryBar` (현재 영향)
- props: `severity`, `elapsedSeconds`, `impactedServices`, `impactedUsers`, `owner`, `currentStatus`
- 요소: 패널 제목(h1) · 현재 상태 표식(`StatusMarker`, isCurrent) · **경과 타이머**(mono, `HH:MM:SS`, `aria-live="off"`로 스크린리더 폭주 방지—값은 접근 가능하나 초단위 낭독 안 함) · 영향 서비스 리스트 · 영향 사용자 수(tabular-nums) · 심각도(SEV-n) · 담당자.
- 경과 타이머는 정적 mockup 에서 대표 값(`00:42:17`) 표기. 실제 구현에서 1초 tick(§6 참조).

### 5.4 `TimelineRail` + `TimelineNode`
- `TimelineRail` props: `events: TimelineEvent[]`(시간 오름차순 정렬 후 주입)
- `TimelineNode` props: `event: { id, at: ISOstring, deltaFromPrev: string, status, title, summary }`, `isCurrent`
- 노드 카드 구성: 상단 행 = `[StatusMarker 도형]` + 시각(mono) + `Δ경과`(mono, 첫 노드는 "—") + 상태 라벨. 하단 = 제목(h3) + 요약(body).
- 정렬: **오름차순(위=과거 → 아래=현재)** 고정 — 시간 순서 스캔 목표(§1-2). 최신 노드는 `isCurrent`.
- 인터랙션: 노드 전체가 `tabindex="0"` 포커스 가능(포커스 시 상세 강조). `:focus-visible` 2px outline.

### 5.5 `NextActionPanel` (다음 액션)
- props: `currentStatus`, `actions: { primary: Action, secondary: Action[] }`, `onReassign(owner)`
- 구성:
  - 컨텍스트 캡션: "지금 · {현재 상태 라벨} · {현재 영향 서비스}".
  - **primary CTA 1개**(`--bf-color-primary`) — 현재 상태 연동 라벨(장애→"롤백 실행", 저하→"완화 조치 시작", 정상→"인시던트 종료"). 액션명 = 실행 결과와 동일 동사(예: "롤백 실행" → 완료 토스트 "롤백 실행됨").
  - 보조 액션(secondary, 중립 outline 버튼): "상태페이지 업데이트", "인시던트 브릿지 열기".
  - **담당 재지정**: `<label>` + `<input type="text">` + "지정" 버튼. 빈 값 지정 시 인라인 에러 "담당자를 입력하세요"(`role="alert"`).
- primary CTA 는 항상 패널 최상단·단일 → 스트레스 상황 오조작 최소화("무엇을 먼저 누를지" 고민 제거).

### 5.6 `EmptyState` (진행 중 장애 없음)
- 조건: `loadState==="empty"` 또는 `events.length===0`.
- 표시: 중립 도형 `●` + 제목 **"진행 중인 장애가 없습니다"** + 안내 "모든 서비스가 정상입니다. 새 인시던트가 열리면 여기에 타임라인이 나타납니다." + 보조 링크 "최근 종료된 인시던트 보기".
- 빈 상태는 **행동 초대**로 작성 — 사과/모호함 없이 현재 사실 + 다음 경로 제시.

### 5.7 `FailureState` (타임라인 로드 실패 — 빈 상태와 명확히 구분)
- 조건: `loadState==="error"`.
- 표시: 도형 `■`(장애형 실루엣, 라벨 "불러오기 실패") + 제목 **"타임라인을 불러오지 못했습니다"** + 원인/조치 "네트워크 또는 데이터 소스에 연결하지 못했습니다. 다시 시도하거나 상태 소스를 확인하세요." + **"다시 시도"** 버튼(primary) + "상태 소스 점검" 보조 링크.
- 실패 텍스트는 `--bf-color-danger`, `role="alert"`. **빈 상태(정상·정보)와 시각/문구가 절대 겹치지 않게** 구분(빈=●·중립 안내, 실패=■·danger·재시도 CTA).

---

## 6. dev 구현 가이드 (후속 Epic 참조용)

> 본 task 는 designer-only 단독 모드로 cascade 가 없다. 아래는 후속 구현 Epic 이 게시될 때 dev 가 따를 권장 지침이다. mockup 은 시각 참조용이며 픽셀 일치 의무는 없다.

1. **토큰 정의**: 전역 스타일(`:root`)에 §2 색상(전부 기존 공용 값) · §3 타이포 · §4 스페이싱 토큰 선언. 컴포넌트는 하드코딩 색상 금지, `var(--bf-*)` 참조. **상태용 새 색상 토큰을 만들지 말 것** — 상태는 §5.2 형태/패턴/라벨로만.
2. **클래스명 권장**: `.itp-panel`, `.itp-summary`, `.itp-status`(+ `--operational`/`--degraded`/`--outage` modifier), `.itp-rail`, `.itp-node`, `.itp-node--current`, `.itp-node__marker`, `.itp-node__time`, `.itp-actions`, `.itp-actions__cta`, `.itp-reassign`, `.itp-empty`, `.itp-error`.
3. **상태 부호화 구현**: modifier 클래스로 도형 글리프(`::before` content)·테두리 스타일(solid/dashed/double)·배경 해칭(`repeating-linear-gradient`, 중립색)을 지정. 색상은 상태 판별에 관여시키지 말 것.
4. **정렬**: 렌더 전 `events` 를 `at` 오름차순 정렬. 마지막 요소를 `isCurrent` 로 마킹. 다음 액션 라벨은 `currentStatus` 매핑 테이블(§5.5)로 결정.
5. **경과 타이머**: `elapsedSeconds` 를 `HH:MM:SS` 포맷, 1초 `setInterval` tick. `aria-live` 미적용(초단위 낭독 방지), 값은 텍스트로 접근 가능. `prefers-reduced-motion` 과 무관(타이머는 애니메이션 아님).
6. **접근성 필수 구현**:
   - 패널 landmark: 요약 `<header>`, 레일 `<section aria-labelledby>`, 액션 `<aside aria-labelledby>`.
   - 상태는 텍스트 라벨이 접근성 소스, 도형 글리프는 `aria-hidden`.
   - 재지정 입력 `<label for>`, 에러 시 `aria-invalid` + `aria-describedby`, 에러 컨테이너 `role="alert"`.
   - **키보드 포커스 순서**(§8) 명시 구현, `:focus-visible` outline 제거 금지.
   - 빈/실패 상태 진입 시 포커스를 각 상태의 주요 CTA(재시도/최근 보기)로 이동 고려.
7. **빈/실패 분기**: `loadState` 로 3분기(§5.1). 실패는 반드시 재시도 경로 제공, 빈은 정상 안내 + 최근 보기.
8. **reduced-motion**: hover/전환에 transition 을 쓰면 `@media (prefers-reduced-motion: reduce)` 에서 제거.

---

## 7. AC 매핑 표

| AC | 요구 | 디자인 반영 위치 | mockup 확인 지점 |
|---|---|---|---|
| AC-1 | 장애 타임라인·현재 영향·담당자·다음 액션의 레이아웃/우선순위/상태 정의 | §1 4영역, §4 단일 패널 레이아웃, §5.3~5.5 컴포넌트, §5.5 우선순위(primary CTA 단일 고정) | 요약 바 + 레일 + 다음 액션 3영역이 한 패널에 |
| AC-2a | 정상·저하·장애를 **색상 외 수단**(아이콘/라벨/패턴)으로 구분 | §5.2 3중 중복 부호화 표(도형 ●◆■ / solid·dashed·double / 해칭 + 라벨) | 레일 3개 상태 노드의 도형·패턴·라벨 |
| AC-2b | 키보드 **포커스 순서** 명시 | §8 포커스 순서, §6.6 | (명세로 확인 — 순서 표) |
| AC-2c | **빈 상태·실패 상태** 명시 | §5.6 EmptyState / §5.7 FailureState(빈과 시각·문구 분리) | mockup 하단 빈 상태·실패 상태 데모 블록 |
| AC-3 | 기존 파일 수정 없이 신규만, **신규 색상 토큰 미도입** | §0 산출 범위, §2(전부 기존 토큰 재사용·상태에 색 토큰 미배정) | `:root` 에 신규 색상 토큰 0건, 상태는 형태/패턴만 |

---

## 8. 접근성 · 키보드 포커스 순서

**Tab 포커스 순서(정상 로드 시)**:
1. 담당 재지정 트리거(요약 바) → 2. 타임라인 노드(과거→현재 순, 각 `tabindex=0`) → 3. 다음 액션 primary CTA(롤백 실행) → 4. 보조 액션(상태페이지 업데이트 → 인시던트 브릿지 열기) → 5. 담당 재지정 입력 → 6. "지정" 버튼.

- 논리 순서 = 스캔 순서(현재 영향 → 사건 경과 → 할 일). primary CTA 가 보조보다 먼저 포커스되어 급한 조작이 앞선다.
- **빈 상태**: 포커스 순서 = "최근 종료된 인시던트 보기" 링크.
- **실패 상태**: 포커스 순서 = "다시 시도" 버튼 → "상태 소스 점검" 링크.

**체크리스트(mockup 충족)**:
- [x] **키보드 이동**: 위 순서대로 `Tab`/`Shift+Tab` 도달, 버튼 `Enter`/`Space` 작동, 포커스 트랩 없음.
- [x] **대비**: 본문 ≥ 4.5:1, 배지/UI ≥ 3:1(§2 검증값).
- [x] **색상 비의존**: 상태는 도형+패턴+라벨(§5.2). danger 색은 이미 형태로 전달된 정보의 보강일 뿐.
- [x] **라벨링**: 상태 텍스트 라벨, landmark `aria-labelledby`, 에러 `role="alert"`, 입력 `<label>`.
- [x] **포커스 가시성**: `:focus-visible` 2px outline(offset 2px), 제거 금지.
- [x] **모션**: 전환 최소, `prefers-reduced-motion: reduce` 에서 transition 제거. 경과 타이머는 초단위 낭독 안 함.
- [x] **터치 타겟**: 모바일 버튼/입력 최소 높이 44px.

---

## 9. mockup 참조

- 파일: `docs/design/mockups/incident-timeline-canary-20260724.html`
- 단일 self-contained HTML(외부 의존성 0). §2~§4 토큰/타이포/레이아웃을 그대로 표현하며, 레일의 정상·저하·장애 3노드(도형·패턴·라벨), 현재 영향 요약 바, 다음 액션 패널, 그리고 하단에 **빈 상태·실패 상태 데모 블록**을 정적으로 포함.
- placeholder 데이터(예: "결제 API 5xx 급증", "김온콜")로 UX 의도 전달.

---

## 10. Self-critique (PR commit 직전 자기 점검)

1. **AC 매핑**: AC-1(4영역 레이아웃/우선순위/상태) · AC-2a(색상 외 3중 부호화) · AC-2b(포커스 순서) · AC-2c(빈·실패 상태 분리) · AC-3(기존 파일 무수정·신규 색 토큰 0) 전부 §7 표에 매핑. ✅
2. **dev 구현 가이드**: §6 에 토큰/클래스명/상태 부호화/정렬/타이머/접근성/분기 단계별 기술. 단, 본 task 는 cascade 없음 → "후속 Epic 참조용"임을 §6 서두에 명시. ✅
3. **기존 요소 보존**: 신규 패널이라 대체 대상 없음. 저장소 관측 스택(vanilla-static) 규약(외부 의존성 0·system font·CSS 변수 자체정의) 준수. 기존 canary 시안과 동일 중립 토큰 값 재사용 → 팔레트 일관성 유지. ✅
4. **컴포넌트 매핑**: 요구 4영역(타임라인·현재 영향·담당자·다음 액션)이 §5 컴포넌트(TimelineRail·SummaryBar·재지정·NextActionPanel)로 1:1 대응. 상태 3종이 StatusMarker 부호화 표로 대응. ✅
5. **모호함 flag**:
   - ⚠️ 요구에 색상 토큰 세부 스펙(정확한 SEV 색 등)이 없음 → **의도적으로 상태에 색을 배정하지 않는** 설계로 해소(제약 "신규 색 토큰 0" 과 정합). danger 색은 장애 상태의 색이 아니라 강조 보강임을 §2·§5.2 에 명시.
   - ⚠️ 타임라인 정렬 방향(오름/내림)이 미지정 → "시간 순서 스캔" 목표에 맞춰 **오름차순(위=과거→아래=현재)** 로 확정, 현재 노드에 "◀ 현재" 표식. 구현 시 변경하려면 §5.4 기준을 우선.
   - ⚠️ 경과 타이머의 스크린리더 낭독 정책이 미지정 → 초단위 폭주 방지 위해 `aria-live` 미적용(값은 접근 가능)으로 설계(§5.3·§6.5). 접근성 리뷰에서 재검토 여지 flag.
   - ⚠️ 후속 구현은 별도 Epic 필요(cascade 없음). 본 명세는 구현 계약이 아닌 시안 정의임을 §0·§6 에 명시.

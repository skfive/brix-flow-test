# 리뷰 증거 히트맵 — 디자인 명세 (BF-1189)

> route: `/demo/review-evidence-heatmap` · stack: `vanilla-static` (외부 의존성 0건, system font, CSS 변수 자체 정의)
> mockup: `docs/design/review-evidence-heatmap-mockup.html`
> 토큰 prefix: `--reh-*` / 클래스 prefix: `.reh-`
>
> ⚠️ **ownership 교정 필요 (dev 로 전달)**: 이번 designer task 의 owned_paths 는
> `docs/design/review-evidence-heatmap-BF-1188.md` + `docs/design/review-evidence-heatmap-mockup.html` 로 지정됨.
> 반면 요청 route 의 `expected_entry_path` 는 `demo/review-evidence-heatmap/index.html` 이며 현재 존재하지 않음.
> dev 는 이 명세를 읽고 `demo/review-evidence-heatmap/index.html` 에 구현하되, mockup 파일명이 JIRA-KEY 와
> 불일치(`-mockup.html` suffix, `-BF-1189` 미포함)하는 점은 운영자/PM 이 파일 경로 교정 여부를 판단하도록 flag 함.

---

## 1. 시안 개요

### 변경 범위
리뷰 증거 히트맵 SPA 를 신규 생성한다. 코드 리뷰 대상 파일들을 **격자(heatmap)** 로 배치하고,
각 파일의 **위험도(risk)** 와 **검증 상태(verification)** 를 한눈에 보여준다.
사용자는 위험도·검증상태로 **필터링**하고, 셀을 선택하면 **상세 증거 패널**에서
해당 파일의 리뷰 근거(변경 라인, 발견 이슈, 검증 로그)를 확인한다.

### 사용자 경험 목표
1. **색상에 의존하지 않는 접근성** — 위험도/검증상태를 색상 + 아이콘 + 텍스트 라벨 3중으로 표현하여
   색각 이상 사용자도 구분 가능 (WCAG 1.4.1 색 사용 준수).
2. **키보드 완전 조작** — 필터·히트맵 셀·상세 패널을 마우스 없이 Tab/방향키/Enter/Esc 로 조작.
3. **위험 우선순위 파악** — 위험도 범례와 정렬로 "어디부터 볼지"를 즉시 판단.
4. **결정론적 데모** — 고정 시드 예시 데이터로 렌더링이 항상 동일 (스냅샷/테스트 안정).

---

## 2. 컬러 팔레트

기존 demo 시각 언어(`review-generation-inspector`)의 neutral/brand 토큰 체계를 계승한다.

### Neutral (표면·텍스트)
| 토큰 | HEX | 용도 |
|---|---|---|
| `--reh-bg` | `#F8FAFC` | 페이지 배경 |
| `--reh-surface` | `#FFFFFF` | 카드·패널 표면 |
| `--reh-surface-muted` | `#F1F5F9` | hover·보조 표면 |
| `--reh-border` | `#E2E8F0` | 경계선 |
| `--reh-text` | `#0F172A` | 본문 텍스트 |
| `--reh-text-secondary` | `#475569` | 보조 텍스트 |
| `--reh-text-muted` | `#94A3B8` | 힌트·비활성 |

### Brand (액션·포커스)
| 토큰 | HEX | 용도 |
|---|---|---|
| `--reh-primary` | `#4F46E5` | 주 버튼·활성 필터 |
| `--reh-primary-hover` | `#4338CA` | 주 버튼 hover |
| `--reh-focus-ring` | `#6366F1` | 포커스 링 (모든 인터랙티브 요소) |

### 위험도(risk) — 색 + fg/bg 쌍 (범례에서 아이콘·라벨과 함께 사용)
| 위험도 | 색상 토큰 | bg | fg | 대비(fg on bg) |
|---|---|---|---|---|
| critical (심각) | `--reh-risk-critical` `#B91C1C` | `--reh-risk-critical-bg` `#FEE2E2` | `--reh-risk-critical-fg` `#7F1D1D` | ≥ 7:1 |
| high (높음) | `--reh-risk-high` `#EA580C` | `--reh-risk-high-bg` `#FFEDD5` | `--reh-risk-high-fg` `#9A3412` | ≥ 7:1 |
| medium (보통) | `--reh-risk-medium` `#CA8A04` | `--reh-risk-medium-bg` `#FEF9C3` | `--reh-risk-medium-fg` `#854D0E` | ≥ 7:1 |
| low (낮음) | `--reh-risk-low` `#16A34A` | `--reh-risk-low-bg` `#DCFCE7` | `--reh-risk-low-fg` `#166534` | ≥ 7:1 |

> ⚠️ **색상 단독 사용 금지**: 위 색상은 반드시 아래 아이콘·라벨과 동반한다 (§5.2 셀 명세, §5.5 범례).

### 검증 상태(verification) — 배지 색 (아이콘·라벨 필수 동반)
| 상태 | 색상 | bg | 아이콘 | 라벨 |
|---|---|---|---|---|
| verified (검증완료) | `#16A34A` | `#DCFCE7` | `✓` | "검증완료" |
| pending (대기) | `#2563EB` | `#DBEAFE` | `◷` | "검증대기" |
| failed (실패) | `#B91C1C` | `#FEE2E2` | `✕` | "검증실패" |
| stale (재검증필요) | `#D97706` | `#FEF3C7` | `⚠` | "재검증" |

---

## 3. 타이포그래피

기존 demo 의 system font stack 을 그대로 사용 (외부 폰트 로드 없음).

| 역할 | font-family | size | weight | line-height |
|---|---|---|---|---|
| heading / h1 | `--reh-font-sans` | 24px | 700 | 1.25 |
| section / h2 | `--reh-font-sans` | 18px | 600 | 1.33 |
| card title / h3 | `--reh-font-sans` | 15px | 600 | 1.4 |
| body | `--reh-font-sans` | 14px | 400 | 1.5 |
| label / badge | `--reh-font-sans` | 12px | 600 | 1 |
| caption / hint | `--reh-font-sans` | 11px | 400 | 1.4 |
| code / path | `--reh-font-mono` | 13px | 500 | 1.5 |

```css
--reh-font-sans: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
--reh-font-mono: ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
```

---

## 4. 레이아웃

### 섹션 구조 (위 → 아래)
1. **헤더** — 제목 "리뷰 증거 히트맵" + 요약 통계(총 파일 / 심각·높음 개수) + 데이터 리셋 버튼
2. **범례 + 필터 바** — 위험도 범례(4개) + 검증상태 범례(4개) + 위험도/검증 필터 컨트롤
3. **본문 2열 레이아웃**
   - 좌: **히트맵 격자** (파일 셀 그리드)
   - 우: **상세 증거 패널** (선택된 셀의 리뷰 근거)

### spacing 스케일
`--reh-space-1:4px` · `-2:8px` · `-3:12px` · `-4:16px` · `-5:24px` · `-6:32px` · `-8:48px`
`--reh-radius:12px` (카드) / `8px` (버튼·배지) / `999px` (pill)

### breakpoint 별 동작
| 구간 | 폭 | 히트맵 그리드 | 상세 패널 |
|---|---|---|---|
| desktop | ≥ 960px | `repeat(auto-fill, minmax(150px,1fr))` 다열 격자, 본문 2열(히트맵 `1fr` + 패널 `380px`) | 우측 sticky 컬럼 (`position:sticky; top:24px`) |
| tablet | 600–959px | `repeat(auto-fill, minmax(130px,1fr))`, 본문 1열 | 히트맵 아래로 흐름 |
| mobile | < 600px | `repeat(auto-fill, minmax(calc(50% - 8px),1fr))` (2열 고정 느낌), 본문 1열 | 셀 선택 시 화면 하단 고정 시트(`position:fixed; bottom:0`) 로 슬라이드업, Esc/닫기 버튼으로 해제 |

- 컨테이너 `max-width:1200px; margin:0 auto`.
- 상세 패널 미선택 시 desktop 에서는 "셀을 선택하세요" placeholder, mobile 에서는 시트 숨김.

---

## 5. 컴포넌트 명세

### 5.1 요약 통계 (`.reh-stats`)
- props: `{ total:number, critical:number, high:number, unverified:number }`
- 4개 stat 타일. 각 타일 = 큰 숫자 + 라벨. 심각/높음 타일은 위험도 fg 색 강조.
- 상태 없음(정적). `aria-live` 불필요(필터로 값 변하면 §5.4 결과 카운트가 `aria-live="polite"` 담당).

### 5.2 히트맵 셀 (`.reh-cell`) — 핵심 컴포넌트
- 시맨틱: `<button class="reh-cell" data-risk data-verify aria-pressed>` (그리드 내 선택 토글).
- props:
  ```
  { id, path, risk: 'critical'|'high'|'medium'|'low',
    verify: 'verified'|'pending'|'failed'|'stale',
    changedLines:number, findings:number }
  ```
- 시각 구성 (색상 외 표현 필수):
  1. 상단 좌: 위험도 **아이콘** (critical `▲` / high `◆` / medium `●` / low `▁` 서로 다른 도형)
  2. 상단 우: 검증상태 **아이콘 배지** (`✓ ◷ ✕ ⚠`)
  3. 중앙: 파일 경로 (`--reh-font-mono`, 말줄임 `text-overflow:ellipsis`)
  4. 하단: 위험도 **텍스트 라벨** (심각/높음/보통/낮음) + 발견 이슈 수 `n건`
  - 배경: 위험도 bg 색 (연한 톤), 좌측 4px 위험도 실색 accent bar.
- 상태:
  | 상태 | 시각 |
  |---|---|
  | default | 위험도 bg + accent bar |
  | hover | `box-shadow` 상승 + border 진하게 |
  | focus-visible | `outline:2px var(--reh-focus-ring); outline-offset:2px` |
  | selected (`aria-pressed="true"`) | border 2px primary + 우상단 선택 표시 |
  | filtered-out | DOM 제거(또는 `hidden`) — 격자 재배치 |
- 접근성: `aria-label="{path}, 위험도 {라벨}, {검증라벨}, 이슈 {n}건"` — 스크린리더가 색·아이콘 없이도 전체 파악.

### 5.3 위험도/검증 필터 (`.reh-filter`)
- 위험도 필터: 4개 토글 pill(`<button role="pressed" aria-pressed>`), "전체" 포함. 다중 선택(OR).
- 검증 필터: `<select>` 또는 4개 체크박스. 다중 선택.
- props: `{ activeRisks:Set, activeVerify:Set, onChange }`
- 인터랙션:
  - 클릭/Enter/Space 로 토글.
  - 필터 변경 → 히트맵 재렌더 + §5.4 결과 카운트 갱신 + `aria-live` 안내.
  - "필터 초기화" 버튼 제공.

### 5.4 결과 카운트 (`.reh-count`)
- `<p role="status" aria-live="polite">` — "표시 중 12 / 20 파일" 형태. 필터 변경 시 읽어줌.

### 5.5 범례 (`.reh-legend`)
- 위험도 범례: 4개 항목 = 색 스와치 + 아이콘 + 라벨(+간단 설명). **색·아이콘·라벨 3중 병기**로 AC "색상 외 상태 표현" 충족.
- 검증상태 범례: 4개 항목 = 아이콘 배지 + 라벨.
- 정적 표시(`<ul>`), 항상 노출(접었다 펴는 UI 불필요).

### 5.6 상세 증거 패널 (`.reh-detail`)
- 시맨틱: `<aside aria-labelledby="reh-detail-title" tabindex="-1">`. 셀 선택 시 패널로 포커스 이동.
- props: `{ selected: FileEvidence | null }`
- 내용:
  1. 파일 경로(제목) + 위험도 배지 + 검증상태 배지
  2. 메트릭: 변경 라인 수, 발견 이슈 수, 마지막 검증 시각
  3. **발견 이슈 리스트** — 각 이슈 = 심각도 아이콘 + 라벨 + 설명 + 라인 범위
  4. **검증 로그** — 검증 단계별 결과(통과/실패 아이콘 + 텍스트)
- 인터랙션:
  - 미선택: placeholder("좌측 히트맵에서 파일을 선택하세요").
  - 닫기 버튼(`✕ 닫기`) + `Esc` → 선택 해제, 포커스 원래 셀로 복귀(desktop) / 시트 닫힘(mobile).
- 접근성: mobile 시트는 `role="dialog" aria-modal="true"` 로 열리며 포커스 트랩 권장.

---

## 6. dev 구현 가이드 (dev-1 단계별)

> 대상 파일: `demo/review-evidence-heatmap/index.html` (단일 HTML, vanilla-static, 외부 의존성 0).
> route mapping = root-relative-static → URL `/demo/review-evidence-heatmap` = `demo/review-evidence-heatmap/index.html`.

1. **토큰 정의**: `:root` 에 §2 컬러 + §3 폰트 + §4 spacing 토큰을 `--reh-*` 로 선언. 하드코딩 색상 금지.
2. **결정론적 데이터**: `const FILES = [...]` (§7 데이터 모델, 20개 고정). `Math.random()` 사용 금지 — 스냅샷 안정.
3. **마크업 골격**:
   - `.reh-header` (h1 + `.reh-stats`)
   - `.reh-controls` (`.reh-legend` + `.reh-filter` + `.reh-count`)
   - `.reh-main` (`.reh-grid` + `.reh-detail`)
4. **히트맵 렌더 함수** `renderGrid(files, filters)`:
   - 필터 통과 파일만 `.reh-cell` `<button>` 로 생성.
   - `data-risk` / `data-verify` 속성 → CSS 로 색/아이콘 매핑 (JS 에서 아이콘 텍스트도 삽입).
   - `aria-label` §5.2 형식으로 설정.
5. **필터 로직**: 위험도 pill·검증 체크박스 → `activeRisks`/`activeVerify` Set 갱신 → `renderGrid` + `.reh-count` 갱신.
6. **셀 선택**: 클릭/Enter → `aria-pressed` 토글, `renderDetail(file)`, 패널로 포커스 이동.
7. **키보드**:
   - 그리드 내 `roving tabindex` 또는 각 셀 `tabindex="0"`; 방향키 이동은 선택(권장이나 최소 Tab 순회 필수).
   - `Esc`: 상세 패널 열려 있으면 닫고 포커스 복귀.
8. **반응형**: §4 breakpoint 를 `@media` 로. mobile 상세는 `position:fixed` 하단 시트.
9. **권장 클래스명**: `.reh-cell`, `.reh-cell__icon`, `.reh-cell__verify`, `.reh-cell__path`, `.reh-cell__label`,
   `.reh-filter__pill`, `.reh-legend__item`, `.reh-detail`, `.reh-detail__issue`, `.reh-count`.
10. **테스트 가드**: `demo/review-evidence-heatmap/tests/*.test.js` — 데이터 개수·필터 결과·aria-label 형식 검증
    (권위 명령: `node --test demo/review-evidence-heatmap/tests/*.test.js`). ※ dev 담당 영역.

---

## 7. 결정론적 예시 데이터 모델

각 파일 레코드 필드 (dev 는 이 스키마로 20개 고정 배열 생성):

| 필드 | 타입 | 설명 | 예시 |
|---|---|---|---|
| `id` | string | 고정 식별자 | `"f01"` |
| `path` | string | 파일 경로 | `"src/auth/session.js"` |
| `risk` | enum | `critical`\|`high`\|`medium`\|`low` | `"critical"` |
| `verify` | enum | `verified`\|`pending`\|`failed`\|`stale` | `"failed"` |
| `changedLines` | number | 변경 라인 수 | `142` |
| `findings` | number | 발견 이슈 수 | `3` |
| `lastVerified` | string | 마지막 검증(고정 문자열) | `"2026-07-24 14:20"` |
| `issues` | array | 이슈 목록(§ 아래) | — |
| `verifyLog` | array | 검증 단계 로그 | — |

**issue 항목**: `{ severity: 'critical'|'high'|'medium'|'low', title, lineStart, lineEnd, note }`
**verifyLog 항목**: `{ step:string, status:'pass'|'fail'|'skip', note:string }`

권장 분포(결정론적, 위험도 정렬 데모용): critical ×3, high ×5, medium ×7, low ×5 = 20.
검증상태는 위험도와 교차 분포(예: critical 3개 중 failed 2 / pending 1)로 필터 조합 데모 가능하게 구성.

---

## 8. mockup 참조
- 파일: `docs/design/review-evidence-heatmap-mockup.html`
- 명세 §2 컬러 / §3 타이포 / §4 레이아웃 / §5 컴포넌트를 그대로 시각화.
- desktop 2열 + mobile 하단 시트 + 범례 + 필터 + 상세 패널 + hover/focus/selected 상태 예시를 포함.
- placeholder 콘텐츠(샘플 경로/텍스트) 사용 — UX 의도 전달 목적. dev 는 픽셀 일치 의무 없음(참조 가이드).

---

## 9. AC 매핑 표

| 수용 기준 | 충족 근거(명세 위치) |
|---|---|
| 색상 외 상태 표현(아이콘/라벨) | §2 각 색상에 아이콘·라벨 병기 · §5.2 셀 3중 표현(도형 아이콘+텍스트 라벨) · §5.5 범례 색·아이콘·라벨 3중 |
| 위험도 범례 | §2 위험도 4단계 팔레트 · §5.5 위험도 범례 컴포넌트 |
| 키보드 접근 필터 규칙 | §5.3 필터 Enter/Space 토글 · §6-7 roving tabindex/Tab 순회·Esc 닫기 · 모든 인터랙티브 focus-visible 링(§2 focus-ring) |
| 반응형 데스크톱/모바일 레이아웃 + 상세 패널 상호작용 | §4 breakpoint 표(desktop 2열 sticky / mobile 하단 시트) · §5.6 상세 패널 상호작용 · mockup 시각화 |
| 결정론적 예시 데이터 — 파일별 위험도/검증상태 필드 | §7 데이터 모델(risk/verify/changedLines/findings/issues/verifyLog) · 고정 분포 20개 |

---

## 10. Self-critique

| 체크 항목 | 결과 |
|---|---|
| AC 매핑 | §9 표로 3개 AC 전부 명세 위치 매핑 완료 |
| dev 구현 가이드 | §6 단계별 10항목 + 권장 클래스명 + route/파일 경로 명시 |
| 기존 요소 보존 | 신규 route(기존 파일 없음) → 보존 대상 없음. 단, 기존 demo 시각 언어(토큰 체계) 계승 |
| 컴포넌트 매핑 | §5 각 컴포넌트 props/상태/인터랙션 정의, §7 데이터 스키마와 연결 |
| 모호함 flag | ① mockup 파일명이 JIRA-KEY(BF-1189) 불일치 + owned_path 가 `docs/design/mockups/` 표준 경로와 다름 → §맨 위 flag(운영자 판단). ② 방향키 그리드 네비는 권장(최소 Tab 필수)으로 dev 재량 명시. ③ expected_entry_path 미존재 → ownership 교정 필요 flag |

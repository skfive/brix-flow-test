# 메모리 매치 키보드·재시작 UI/UX 디자인 명세 — BF-955

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 관련 티켓: BF-955(본 designer task) · BF-954(planner 기획 명세) · BF-956(developer) · BF-958(tester)
> 대상 모듈: `phase18-games/memory-match/`(기존, 신규 생성 아님)
> tech-stack: `vanilla-static` — 외부 의존성 0건, CDN·웹폰트 금지, system font, CSS 변수 자체 정의
> 기획 SSOT(수정 금지 — 본 문서는 시각 addendum): `docs/plan/memory-match-BF-954.md`([박기획] · 방향키 이동/포커스 유지/재시작 초기화 동작 계약)
> 기반 시각 SSOT(수정 금지 — 본 문서는 그 위에 얹는 addendum): `docs/design/memory-match-BF-916.md`([이디자인] · 토큰·컴포넌트·레이아웃)
> 현재 구현 baseline(참조, 본 task 에서 수정하지 않음): `phase18-games/memory-match/{index.html,logic.js,main.js,styles.css}`(BF-919)
> mockup 참조: `docs/design/mockups/memory-match-BF-955.html`(본 명세와 함께 작성 — §7)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**전제 1 — 본 문서는 BF-916 시각 명세의 대체가 아니라 addendum:** 컬러 팔레트·타이포그래피·카드 3상태(hidden/revealed/matched)·mismatch 흔들림·HUD·완료 배너·레이아웃 등 기존 시각 언어는 `docs/design/memory-match-BF-916.md` 가 그대로 SSOT 다. 본 문서는 그 위에 **BF-954 가 새로 도입한 (a) 방향키 그리드 이동의 포커스 시각화, (b) 뒤집힌 카드에서의 포커스 유지 시각, (c) 재시작 시 초기화 UX(활성 인덱스 원점 리셋 포함)** 만 시각적으로 정의한다. 겹치는 토큰/컴포넌트는 인용(§ 참조)만 하고 재정의하지 않는다.

**전제 2 — 시각 변경 최소화(planner §10 승계):** planner BF-954 §10 은 "기존 `:focus-visible` 스타일은 `tabindex` 값과 무관하게 적용됨 — 신규 시각 변경 불필요, 회귀 확인만 권장"이라고 명시했다. 본 문서는 이 방침을 따른다 — **새 컬러 토큰·새 컴포넌트를 발명하지 않고**, 기존 `--color-focus-ring` / `:focus-visible` / `--card-*` 토큰이 방향키 내비게이션·재시작 UX 를 이미 충족함을 시각적으로 검증·정식화한다. 유일하게 신규 제안하는 시각 요소는 **조작 안내(hint) 문구에 방향키 안내 1줄 추가**(§5.4)이며, 이는 dev 재량 권장 항목이다(신규 필수 토큰 아님).

**전제 3 — 포인터 조작·매칭 규칙 보존(수용 기준 2):** 방향키는 **포커스 이동 전용**이며 카드 `data-state`(hidden/revealed/matched)를 바꾸지 않는다(planner AC-K03). 마우스/터치 클릭 → 뒤집기 경로, 2장 비교=1move, 8쌍 완료 판정 등 기존 게임 규칙은 시각적으로도 전혀 바뀌지 않는다. 본 문서의 모든 시안은 기존 보드/카드/HUD/배너 스타일을 그대로 재사용하고 **포커스 링의 위치와 이동**만 새로 그린다.

**전제 4 — 활성 셀(active cell)은 포커스와 별개의 지속 시각 마커를 두지 않는다:** roving tabindex 에서 "활성 카드"(`tabindex="0"`)는 다음 `Tab` 진입 지점일 뿐, DOM 포커스가 실제로 그 카드에 있을 때만 포커스 링이 보인다(표준 grid 위젯 동작). 재시작 직후처럼 활성 인덱스는 0 이지만 DOM 포커스가 보드 밖(재시작 버튼)에 있을 때는 **보드에 아무 링도 표시되지 않는다**(planner §4.3, focus stealing 방지). 별도의 "현재 셀" 상시 하이라이트(예: 은은한 배경)는 도입하지 않는다 — 초심자에게 "여기가 눌린 카드인가?"라는 혼동을 유발할 수 있고 색맹/저시력 사용자에게 상태(hidden/revealed/matched)와 위치(active)를 구분시키는 부담을 늘리기 때문이다(§8.4-1 모호함 flag).

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [dev 구현 가이드](#6-dev-구현-가이드)
7. [mockup 참조](#7-mockup-참조)
8. [AC 매핑 및 Self-critique](#8-ac-매핑-및-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

| 항목 | 내용 |
|---|---|
| 시각 변경 대상 | 4×4 카드 보드의 **키보드 포커스 표현**(방향키 이동에 따른 포커스 링 위치)과 **재시작 후 초기(idle) 화면** — 신규 화면·컴포넌트 없음, 기존 요소의 포커스 상태만 명세 |
| 신규 동작 시각화 | ① 방향키(`←↑→↓`)로 포커스 링이 인접 카드로 이동 ② 경계 클램프(가장자리에서 링이 그대로 유지) ③ 뒤집힌(revealed) 카드 위에 포커스 링 동시 표시 ④ matched 카드 위 포커스 링 ⑤ 재시작 후 16장 hidden·HUD 0회/00:00·배너 숨김 |
| 보존 대상 | 기존 카드 3상태 스타일·mismatch 흔들림·HUD·완료 배너·포인터 hover·모든 `--*` 토큰(§2) |
| 신규 토큰 | **없음**(전제 2) — 기존 `--color-focus-ring` 재사용 |
| 신규 텍스트(권장) | hint 문구에 "방향키로 이동, Enter/Space 로 뒤집기" 1줄 추가(§5.4, dev 재량) |
| 테마 | 다크 단일(BF-916 §0 승계) |

### 1.2 사용자 경험 목표 (planner §1 + 접근성 요구 승계)

- **키보드만으로 위치 감각 유지** — 방향키를 누르면 파란 포커스 링이 격자 위를 예측 가능하게 한 칸씩 이동하고(멘탈 맵 유지), 가장자리에서 바깥 방향키를 눌러도 링이 순간이동하지 않고 제자리를 지킨다(클램프, planner §2.3).
- **뒤집어도 포커스를 잃지 않음** — 포커스한 카드를 `Enter`/`Space` 로 뒤집으면, 카드가 앞면(revealed)으로 바뀌어도 **포커스 링은 그 카드에 그대로 남는다** — 사용자가 방향키로 바로 다음 카드로 이어서 이동할 수 있다(planner AC-E01, 수용 기준 "뒤집힌 카드에서 포커스 유지").
- **어떤 카드 상태 위에서도 링이 또렷** — hidden(어두운 뒷면)·revealed(밝은 앞면)·matched(초록 글로우) 어느 위에 링이 놓여도 파란 포커스 링이 배경과 충분히 대비되어 보인다(§2.2 대비 검증).
- **재시작은 "깨끗한 새 판"으로 읽힘** — 재시작 직후 16장이 전부 뒷면으로 돌아가고 HUD 가 `0회 · 00:00` 으로 리셋되며 완료 배너가 사라진다. 다음 `Tab` 진입 시 항상 1행 1열(1번 카드)부터 시작한다(planner §4.3 활성 인덱스 원점 리셋).
- **재시작이 포커스를 빼앗지 않음** — 재시작 버튼을 키보드로 눌렀다면 포커스는 재시작 버튼에 그대로 머문다(focus stealing 없음, planner AC-R03).

### 1.3 상태 → 포커스 시각 매핑 (본 문서 신규 관점)

| 시나리오 | 보드 포커스 표현 | 근거 |
|---|---|---|
| 보드 밖에서 `Tab` 진입 | 활성 인덱스(`tabindex="0"`) 카드에 포커스 링 표시 | planner §2.1 |
| 방향키 입력 | 이전 카드 링 제거 → 인접 카드에 링 이동, 카드 상태 불변 | planner AC-K01·K03 |
| 가장자리에서 바깥 방향키 | 링 위치 불변(클램프) | planner AC-K02 |
| 포커스한 hidden 카드 `Enter`/`Space` | 카드 hidden→revealed 전환, **링은 유지** | planner AC-E01 |
| matched/checking 중 방향키 | 링은 정상 이동, 활성화(뒤집기)만 no-op | planner AC-K04 |
| 재시작 직후(포커스가 재시작 버튼) | 보드에 링 없음, 활성 인덱스만 0 으로 설정 | planner §4.3 |
| 재시작 후 첫 `Tab` 진입 | 항상 1번 카드(인덱스 0)에 링 | planner AC-R02 |

---

## 2. 컬러 팔레트

### 2.1 재사용 토큰 (BF-916 §2 SSOT — 변경 없음)

본 task 는 **신규 컬러 토큰을 도입하지 않는다.** 포커스·재시작 UX 에 관여하는 기존 토큰만 아래에 인용한다(값은 `styles.css :root` = BF-916 mockup `:root` 원본).

| 토큰 | 값(HEX/RGBA) | 본 문서에서의 역할 |
|---|---|---|
| `--color-focus-ring` | `rgba(91,130,240,.55)` | **포커스 링** — 방향키 이동·뒤집기 유지·재시작 후 진입 모두 이 링 하나로 표현 |
| `--color-accent` | `#5B82F0` | 링 색 계열(파랑) 기준. revealed 카드 테두리와도 조화 |
| `--card-back-top` / `--card-back-bottom` | `#232E40` / `#18212F` | hidden 카드 배경 — 링(파랑, α.55)이 이 어두운 배경 위에서 대비 확보 |
| `--card-face-bg` | `#F4F6FB` | revealed 카드 밝은 앞면 — 링이 밝은 배경 위에서도 보이도록 outline-offset 로 카드 밖에 그림 |
| `--card-matched-bg` / `--card-matched-border` / `--card-matched-glow` | `#12241C` / `#4ADE80` / `rgba(74,222,128,.28)` | matched 카드 — 초록 글로우 위에 파란 링이 색상 대비(파랑 vs 초록)로 구분됨 |
| `--color-text-secondary` | `#9AA7B8` | hint(조작 안내) 문구 색 |
| `--color-bg-canvas` / `--color-bg-surface` | `#0B0F17` / `#141B26` | 재시작 후 idle 화면 배경·HUD |

### 2.2 포커스 링 대비 검증 (신규 — 카드 상태별)

포커스 링은 `outline:3px solid var(--color-focus-ring)` + `outline-offset:2px` 로 **카드 바깥 2px 지점**에 그려지므로, 링의 인접 배경은 대부분 카드 사이 gap(보드 배경 `--color-bg-canvas #0B0F17`)이다. 따라서 카드 내부 상태색과 무관하게 링은 항상 어두운 캔버스 배경과 대비된다. 상태별 최악 조건 검증:

| 카드 상태 | 링 인접 색 | 대비 판정 |
|---|---|---|
| hidden | 캔버스 `#0B0F17` + 카드 테두리 `#273140` | 파랑 링(밝기 중간) vs 어두운 배경 — 충분 |
| revealed | 카드 앞면 `#F4F6FB`(밝음) + offset gap `#0B0F17` | 링이 offset 로 카드 밖에 있어 어두운 gap 과 대비 확보. 밝은 앞면과 인접해도 파랑↔흰색 색상 대비로 구분 |
| matched | 초록 글로우 `rgba(74,222,128,.28)` | 파랑 링 vs 초록 글로우 — **색상(hue) 대비**로 구분(명도만 의존 안 함, 색맹 조건에서도 위치는 offset gap 으로 판별) |
| mismatch(순간) | 빨강 글로우 `rgba(229,88,88,.30)` | mismatch 는 checking 중 순간 상태 — 이 순간 포커스가 겹칠 수 있으나 링(파랑) vs 글로우(빨강) 색상 대비. mismatch 는 §5.3 참고 |

> **결론:** 신규 색 불필요. 기존 링 토큰이 4가지 카드 상태 전부에서 대비를 만족한다. dev 는 `outline-offset:2px` 를 **반드시 유지**해야 한다(0 으로 줄이면 revealed 밝은 앞면 위에서 링 시인성이 떨어짐 — §6 가이드).

---

## 3. 타이포그래피

BF-916 §3 타이포 토큰 전부 재사용, **변경 없음.** 본 task 가 관여하는 텍스트는 `hint`(조작 안내) 뿐이다.

| 요소 | 토큰 | 값 | 비고 |
|---|---|---|---|
| 조작 안내(hint) | `--text-caption` | `400 13px/1.4 var(--font-sans)` | 방향키 안내 1줄 추가 시에도 동일 토큰 유지(§5.4) |
| HUD 값(재시작 후 `0회`/`00:00`) | `--text-hud-value` | `700 clamp(20px,6vw,28px)/1 var(--font-mono)` | 재시작 리셋 표시, 값만 초기화 |
| HUD 라벨 | `--text-hud-label` | `600 12px/1.2 var(--font-sans)` | 변경 없음 |

폰트는 system stack(`--font-sans` / `--font-mono`) 유지 — vanilla-static 제약(외부 웹폰트 0건).

---

## 4. 레이아웃

### 4.1 구조 (BF-916 §4 승계 — 변경 없음)

세로 스택: 헤더(타이틀) → HUD(이동 횟수 · 시간 · 재시작 버튼) → 4×4 보드(`win-stage` 안, 완료 배너 오버레이 포함) → 조작 안내(hint) → 라이브 리전. `max-width:480px`, `.board { grid-template-columns:repeat(4,1fr); gap:var(--space-2); }`. 본 task 는 레이아웃 배치를 바꾸지 않는다.

### 4.2 포커스 이동의 공간 모델 (신규 명세)

방향키 이동은 **DOM 순서 = 시각 격자 순서 = 인덱스 순서**가 일치한다는 전제 위에서 동작한다(BF-919 구현·planner §2.2 근거). 4×4 인덱스 배치:

```
 0   1   2   3      row0 (1행)
 4   5   6   7      row1 (2행)
 8   9  10  11      row2 (3행)
12  13  14  15      row3 (4행)
```

- `ArrowRight`/`ArrowLeft` = 같은 행 내 ±1(열 경계에서 클램프)
- `ArrowDown`/`ArrowUp` = 같은 열 내 ±4(행 경계에서 클램프)
- 네 모서리(0/3/12/15)에서 바깥 방향 2개는 클램프(포커스 링 불변)

> 시각적 함의: `gap:var(--space-2)`(8px)로 카드가 균등 간격이므로 포커스 링이 한 칸 이동할 때 "카드 폭 + gap" 만큼 매끄럽게 점프한다. 링 자체에는 이동 애니메이션을 넣지 않는다(즉시 이동) — `prefers-reduced-motion` 사용자 배려 + 키 연타 시 잔상 방지(planner EC-K02 연타 대응).

### 4.3 반응형 (BF-916 §4 승계)

360px 소형 모바일에서도 4×4 보드가 가로 스크롤 없이 전부 보이고 카드 44×44px 이상 터치 타깃 확보. 방향키 내비게이션은 키보드 전용 기능이므로 뷰포트 크기와 무관하게 동일 동작. 링 두께 3px + offset 2px 는 소형 화면에서도 카드 경계를 침범하지 않는다(gap 8px 내 수용).

---

## 5. 컴포넌트 명세

기존 컴포넌트(BF-916 §5)의 **포커스 상태**만 아래에 세분화한다. 마크업/기본 스타일은 BF-919 그대로.

### 5.1 카드(`.card`) — roving tabindex 포커스 상태

| 속성/상태 | 값 | 시각 |
|---|---|---|
| 활성 카드 | `tabindex="0"`(보드 내 1장) | 지속 시각 마커 없음(전제 4). 실제 DOM 포커스 시에만 링 |
| 비활성 카드 | `tabindex="-1"`(나머지 15장) | 동일 — 포커스 시 링(방향키로 `.focus()` 되면 표시) |
| 포커스 링 | `:focus-visible` → `outline:3px solid var(--color-focus-ring); outline-offset:2px` | 카드 밖 2px 파란 링. **모든 카드 상태 공통**(BF-916 §5.5 재사용) |
| 포커스 + hidden | 어두운 뒷면 + 파란 링 | mockup §1 |
| 포커스 + revealed | 밝은 앞면 + accent 테두리 + 파란 링(뒤집기 후 유지) | mockup §3-B — "뒤집힌 카드에서 포커스 유지" 핵심 시안 |
| 포커스 + matched | 초록 글로우 + 파란 링 | mockup §3-C — matched 위 이동 가능(planner AC-K04) |

- 카드 상태(`data-state`) 전환은 포커스 유무와 **독립** — 방향키는 링만 옮기고 상태는 안 바꾼다. `Enter`/`Space` 만 상태 전환(뒤집기).
- `.card:focus-visible` 규칙은 `tabindex` 값(0/-1)과 무관하게 적용된다 — dev 는 신규 CSS 불필요, 기존 규칙 회귀만 확인.

### 5.2 인터랙션 상태 정리표 (포인터 vs 키보드 — 보존 확인)

| 입력 | 결과 | 카드 상태 변화 | 포커스 링 |
|---|---|---|---|
| 마우스 hover (hidden) | `translateY(-2px)` 상승(기존) | 없음 | 없음(hover ≠ focus) |
| 마우스 click (hidden, `status!=='checking'`) | 뒤집기 | hidden→revealed | 클릭 시 포커스 이동(브라우저 기본) |
| 방향키(←↑→↓) | 포커스 이동만 | **없음** | 인접 카드로 이동(경계 클램프) |
| `Enter`/`Space`(포커스한 hidden) | 뒤집기 | hidden→revealed | **그대로 유지** |
| `Enter`/`Space`(revealed/matched) | no-op | 없음 | 유지 |
| `Enter`/`Space`(checking 중) | no-op(입력 잠금) | 없음 | 유지 |

> 포인터 조작(hover 상승·click 뒤집기)은 기존 그대로 — 수용 기준 "포인터 조작·매칭 규칙과 무관 파일 변경 없이" 를 시각적으로도 보존.

### 5.3 재시작 버튼(`#restart-btn` / `#win-restart-btn`) — 상태

| 버튼 | 위치 | 스타일(기존) | 포커스 |
|---|---|---|---|
| `#restart-btn` | HUD 우측, 항상 표시 | `.btn.btn--secondary`(BF-916 §5) | `:focus-visible` 링 동일 |
| `#win-restart-btn` | 완료 배너 내 | `.btn.btn--primary` | won 전환 시 포커스 이동(BF-916 유지) |

재시작 실행 후 UX:
- 완료 배너 `hidden` 부여 → 사라짐.
- 보드 16장 전부 hidden 재렌더, HUD `0회`/`00:00`.
- 활성 인덱스 = 0(다음 `Tab` 진입 지점, planner §4.3).
- **DOM 포커스는 재시작 버튼에 유지**(강제 이동 없음) — 시각적으로 재시작 버튼에 링이 남는다(키보드로 눌렀을 경우).

### 5.4 조작 안내(`.hint`) — 방향키 안내 추가(권장, dev 재량)

기존 문구:
> 카드를 두 장 뒤집어 같은 그림의 짝을 맞추세요. 8쌍을 모두 맞추면 완료!

권장 추가(키보드 사용자 discoverability):
> 카드를 두 장 뒤집어 같은 그림의 짝을 맞추세요. 8쌍을 모두 맞추면 완료!
> **방향키로 카드 사이를 이동하고 Enter 또는 Space 로 뒤집을 수 있어요.**

- 동일 `.hint` / `--text-caption` 토큰, 새 컴포넌트 아님. `<br>` 또는 두 번째 `<p class="hint">` 로 분리(dev 재량).
- **필수 아님**(전제 2) — planner 는 시각 변경 최소를 요구했고, 이 문구는 접근성 discoverability 향상 목적의 선택 항목이다. 도입 시 라이브 리전과 별개(정적 안내). 미도입해도 AC 충족에는 영향 없음.

### 5.5 mismatch 순간과 포커스 (edge)

`checking` 중 2장이 mismatch(빨강 글로우 + shake)로 순간 표시될 때, 그 카드에 포커스가 있으면 파란 링과 빨강 글로우가 겹친다 — 색상 대비(파랑↔빨강)로 구분되며 별도 처리 불필요. shake 애니메이션은 링에 영향 없음(outline 은 transform 과 독립). `prefers-reduced-motion` 시 shake 제거(기존 BF-916 규칙 유지).

---

## 6. dev 구현 가이드 (developer BF-956 용)

> 본 task 는 시각 명세만 정의한다. 코드 구현은 BF-956 담당. 아래는 시각 계약 준수를 위한 dev 체크리스트다.

### 6.1 반드시 지킬 것 (시각 회귀 방지)

1. **포커스 링 규칙 보존** — `.card:focus-visible`(및 `.btn:focus-visible`)의 `outline:3px solid var(--color-focus-ring); outline-offset:2px` 를 **삭제/변경하지 말 것.** roving tabindex 도입 시 `outline:none` 를 추가하지 않도록 주의(흔한 실수). `tabindex` 값만 JS 로 토글하고 CSS 포커스 스타일은 그대로 둔다.
2. **방향키 이동 시 `.focus()` 호출** — 목표 카드에 `element.focus()` 를 호출해야 `:focus-visible` 링이 실제로 뜬다. `tabindex` 만 바꾸고 `.focus()` 를 빠뜨리면 링이 이동하지 않는다.
3. **방향키는 카드 `data-state` 를 건드리지 않음** — 링만 이동. `flipCard` 호출 경로와 분리(planner §5.3).
4. **`preventDefault`** — 보드 안에서 방향키(`ArrowUp/Down/Left/Right`) 입력 시 `event.preventDefault()` 로 페이지 스크롤 억제(포커스 이동과 스크롤 동시 발생 방지). 방향키 4종 외에는 preventDefault 하지 않음(EC-K03 네이티브 동작 보존).
5. **재시작 후 `activeIndex=0`** — 재시작 시 `tabindex="0"` 을 인덱스 0 카드에만 부여, 나머지 `-1`. DOM `.focus()` 는 강제 호출하지 않음(focus stealing 방지, planner AC-R03).
6. **`outline-offset:2px` 유지** — revealed 밝은 앞면 위 링 시인성 근거(§2.2). 0 으로 줄이지 말 것.

### 6.2 권장(재량)

- 조작 안내 hint 에 방향키 문구 1줄 추가(§5.4) — discoverability. `<br>` 또는 두 번째 `.hint` `<p>`.
- 방향키 `keydown` 리스너는 보드 컨테이너(`#board`)에 1개 위임(planner §10) — 카드별 중복 부착 회피.
- `role="grid"` 는 `#board` 에 이미 존재(BF-919). `role="row"`/`role="gridcell"` 세분화는 dev 재량(planner §10) — 세분화하지 않아도 본 시각 명세와 무관.

### 6.3 CSS 변수/클래스 매핑(권장 네이밍)

| 용도 | 권장 |
|---|---|
| 포커스 링 색 | `var(--color-focus-ring)`(기존, 신규 금지) |
| 활성 카드 표식 | `tabindex="0"`(속성만) — 신규 클래스 불필요 |
| 링 스타일 | `.card:focus-visible`(기존 규칙 재사용) |
| 재시작 후 카드 | `data-state="hidden"` 전체 재렌더(기존) |

> 요약: **신규 CSS 클래스·토큰 0개.** JS 의 `tabindex` 토글 + `.focus()` 호출만 추가하면 기존 스타일이 시각 계약을 그대로 충족한다.

---

## 7. mockup 참조

- 경로: `docs/design/mockups/memory-match-BF-955.html`
- 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`, `:root` 에 BF-916 토큰 복제).
- 포함 시안:
  1. **§1 방향키 내비게이션** — 4×4 보드에서 한 카드(hidden)에 포커스 링, 방향키 이동 화살표 주석.
  2. **§2 경계 클램프** — 가장자리 카드에서 바깥 방향키 시 링 불변 표현.
  3. **§3 포커스 + 카드 상태 조합** — A(포커스+hidden) / B(포커스+revealed = 뒤집기 후 포커스 유지) / C(포커스+matched).
  4. **§4 재시작 초기화 전/후** — before(진행 중: 일부 matched·revealed, HUD 8회/00:32) → after(idle: 16장 hidden, HUD 0회/00:00, 배너 숨김, 활성 인덱스=0).
  5. **§5 키보드 조작 레전드** — `←↑→↓`(포커스 이동) / `Enter`·`Space`(뒤집기) / `Tab`(보드↔재시작) 요약.
- mockup 은 정적 CSS 시뮬레이션 — 실제 게임 로직 아님. dev 는 픽셀 일치 의무 없음(시각 가이드).

---

## 8. AC 매핑 및 Self-critique

### 8.1 BF-955 수용 기준 ↔ 본 문서 매핑

| BF-955 수용 기준 | 충족 근거 |
|---|---|
| Given 기획 명세, When 설계, Then `docs/design/memory-match-*.md` 에 포커스 이동/유지·재시작 초기화 UI 상태가 명세되고 mockup 이 첨부된다 | 본 문서 `docs/design/memory-match-BF-955.md`: §1.3(상태→포커스 매핑)·§4.2(포커스 공간 모델)·§5.1(카드 포커스 상태)·§5.2(포인터 vs 키보드)·§5.3(재시작 UX)·§4.2/§5.3(초기화) + mockup `docs/design/mockups/memory-match-BF-955.html`(§7) |
| Given 기존 동작, When 설계, Then 포인터 조작·매칭 규칙과 무관 파일 변경 없이 접근성(키보드) 요구를 충족한다 | 전제 3·§5.2(포인터 hover/click 보존 표)·§6.1(포커스 링 규칙 보존)·신규 토큰 0개(§2.1). 본 task 산출물은 `docs/design/**` 2개 파일뿐 — 코드/포인터 로직 파일 무변경 |

### 8.2 Self-critique (PR commit 직전 자기 점검)

1. **AC 매핑 — 각 수용 기준이 명세 섹션에 대응되는가?** ✅ §8.1 표로 2개 수용 기준 모두 근거 매핑. 포커스 이동/유지(§5.1·5.2), 재시작 초기화(§5.3·§4.2), mockup 첨부(§7), 포인터 보존(§5.2·§6.1) 커버.
2. **dev 구현 가이드 — dev 가 따라할 단계가 구체적인가?** ✅ §6.1 에 6개 필수 항목(링 보존·`.focus()` 호출·상태 불변·preventDefault·activeIndex=0·offset 유지) + §6.3 네이밍 매핑. "신규 클래스/토큰 0개" 로 구현 범위 명확.
3. **기존 요소 보존 — 기존 시각 언어를 훼손하지 않는가?** ✅ 신규 토큰 0개(전제 2·§2.1). 포인터 hover/click·카드 3상태·HUD·배너 전부 인용만, 재정의 없음. 방향키는 포커스 링만 이동(전제 3).
4. **컴포넌트 매핑 — 명세의 컴포넌트가 실제 마크업(`#board`/`.card`/`#restart-btn`)과 일치하는가?** ✅ BF-919 `index.html` 마크업(`#board role="grid"`, `.card` 네이티브 `<button>`, `#restart-btn`, `#win-banner`) 그대로 참조. 신규 DOM 요소 없음.
5. **모호함 flag — 판단이 필요한 지점을 표시했는가?** ✅ §8.4 에 3건 flag(활성 셀 지속 마커 미도입 / hint 방향키 문구 선택 / wrap-around 미채택 승계).

### 8.3 남은 모호함 (운영자·dev 확인 권장)

1. **활성 셀 지속 시각 마커 미도입(§0 전제 4):** roving tabindex 활성 카드에 포커스와 별개의 상시 하이라이트를 두지 않았다(표준 grid 동작·색맹 부담 최소화 근거). "재시작 후 다음 진입 지점이 어디인지 미리 보이면 좋겠다"는 요구가 있다면 은은한 배경 마커를 후속 검토 가능.
2. **hint 방향키 문구(§5.4):** discoverability 향상을 위한 선택 항목으로 dev 재량에 남겼다. 필수화 여부는 운영자 판단.
3. **wrap-around 미채택(planner §2.3 승계):** 경계에서 클램프(순환 이동 아님)를 planner 가 확정했고 본 시각 명세도 이를 따랐다(§4.2). 순환을 원하면 planner §12-1 재확인 필요 — 시각 명세는 클램프 기준으로 작성됨.

---

*문서 종료 — [이디자인] · BF-955*
</content>
</invoke>

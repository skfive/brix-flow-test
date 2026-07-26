# 리뷰 재작업 자동수렴 상태 패널 — 디자인 명세 (BF-1193 / task BF-1194)

> primary-module: `review-revision-canary` · route: `/demo/review-revision-canary`
> mockup 참조: `docs/design/mockups/review-revision-canary-BF-1193.html`

## ⚠️ 스택·키 정정 (fail-honest)

- **stack 마커 불일치**: task epic 은 `bf:tech-stack:typescript-monorepo` 를 표기하지만, base SHA(`2483203`) 기준 저장소 실제 규약은 **vanilla-static** 입니다(기존 리뷰 도메인 demo 들이 인라인 `<style>` + CSS 변수 자체 정의 + system font + 외부 의존성 0건). 본 명세와 mockup 은 **관측된 vanilla-static 규약**을 authority 로 따릅니다 — `design-tokens.json` / `shadcn/ui` 는 이 저장소에 존재하지 않으므로 참조하지 않습니다.
- **JIRA 키 불일치**: task 키는 `BF-1194` 이나 AC 가 명세 파일명을 `docs/design/review-revision-canary-BF-1193.md` 로 명시하여 그대로 따랐습니다. mockup 도 동일 키(`-BF-1193.html`)로 페어링했습니다. 운영자 확인이 필요하면 파일명만 rename 하면 됩니다(내용 영향 없음).
- **ownership 정정**: 요청 URL 의 실제 엔트리 `demo/review-revision-canary/index.html` 는 아직 없으며(신규 feature) 본 designer task 의 owned_paths(`docs/design/**`) 밖입니다. 구현은 dev-1 가 본 명세를 읽고 진행합니다 — designer 는 명세 + mockup 까지만 산출합니다.

> **토큰 출처 표기 규약**: 본 명세는 다른 canary 모듈명을 직접 인용하지 않고 "기존 리뷰 도메인 demo 디자인 시스템" 으로 통칭한다(cross-canary 스코프 가드 준수). 재사용 근거는 아래 표의 **실제 토큰 값·구조 동일성**으로 증명한다.

---

## 1. 시안 개요

### 변경 범위
`/demo/review-revision-canary` 페이지에 **리뷰 재작업 자동수렴 상태 패널**을 신규 설계한다. 이 패널은 "리뷰어가 변경을 요청 → 개발자가 재작업(revision) → 재검토 → 자동으로 수렴(LGTM)"되는 사이클의 현재 상태를 한 화면에서 보여준다.

패널은 세 영역 + 상태 변경 안내 영역으로 구성한다.

| # | 영역 | 목적 |
|---|------|------|
| A | **현재 검증 단계** | 재작업 사이클이 어느 단계에 있는지 stepper 로 표시 |
| B | **최신 revision** | 가장 최근 재작업본의 메타(회차/SHA/작성자/시각/요약) 카드 |
| C | **검토 결과** | 재검토 판정(수렴 중 / 자동수렴 완료 / 사람 확인 필요) 배지 + 카드 |
| D | **상태 변경 영역** | 위 A/B/C 가 갱신될 때 스크린리더에 읽어주는 `aria-live` 영역 |

### 사용자 경험 목표
- **한눈 파악**: 색·아이콘·텍스트 3중 코드로 현재 판정을 즉시 인지.
- **결정론적 데모**: 외부 API·신규 DB 없이 로컬 고정 fixture 만으로 사이클 전개를 재현.
- **접근성**: 상태 전이가 시각뿐 아니라 `aria-live` 로도 전달되어 스크린리더 사용자가 수렴 진행을 인지.
- **일관성**: 기존 리뷰 도메인 demo 의 카드·배지·타이포·stepper 를 그대로 재사용해 리뷰 도메인 화면 간 시각 통일.

---

## 2. 컬러 팔레트

기존 리뷰 도메인 demo 의 `:root` 토큰을 **1:1 재사용**한다(HEX 값 동일, 프리픽스만 본 모듈 네임스페이스 `--rrc-` 로 선언). 신규 색상은 추가하지 않는다.

### 2.1 중립(neutral)
| 역할 | 토큰 | HEX | 재사용 근거 |
|------|------|-----|-------------|
| 페이지 배경 | `--rrc-bg` | `#F8FAFC` | 기존 demo 배경 토큰과 동일 값 |
| 카드 표면 | `--rrc-surface` | `#FFFFFF` | 기존 카드 표면과 동일 |
| 보조 표면 | `--rrc-surface-muted` | `#F1F5F9` | 기존 muted 표면과 동일 |
| 경계선 | `--rrc-border` | `#E2E8F0` | 기존 border 와 동일 |
| 본문 텍스트 | `--rrc-text` | `#0F172A` | 기존 text 와 동일 |
| 보조 텍스트 | `--rrc-text-secondary` | `#475569` | 기존 secondary 와 동일 |
| 흐린 텍스트 | `--rrc-text-muted` | `#94A3B8` | 기존 muted text 와 동일 |

### 2.2 브랜드(brand)
| 역할 | 토큰 | HEX | 재사용 근거 |
|------|------|-----|-------------|
| primary | `--rrc-primary` | `#4F46E5` | 기존 primary 와 동일 |
| primary hover | `--rrc-primary-hover` | `#4338CA` | 기존 hover 와 동일 |
| focus ring | `--rrc-focus-ring` | `#6366F1` | 기존 focus ring 과 동일 |

### 2.3 시맨틱(검토 결과 상태 — 3색)
검토 판정은 기존 리뷰 도메인 demo 의 상태 3색을 **의미 재매핑**하여 재사용한다.

| 판정(verdict) | 의미 | base / bg / fg 토큰 | HEX (base / bg / fg) |
|---------------|------|---------------------|----------------------|
| `approved` (자동수렴 완료) | 재검토 통과, 사이클 종료 | `--rrc-ok` / `--rrc-ok-bg` / `--rrc-ok-fg` | `#16A34A` / `#DCFCE7` / `#166534` |
| `converging` (수렴 중) | 재작업 반영 후 재검토 진행 | `--rrc-progress` / `--rrc-progress-bg` / `--rrc-progress-fg` | `#2563EB` / `#DBEAFE` / `#1E40AF` |
| `needs_human` (사람 확인 필요) | 미해결 존재, 자동수렴 불가 | `--rrc-warn` / `--rrc-warn-bg` / `--rrc-warn-fg` | `#D97706` / `#FEF3C7` / `#92400E` |

> **재사용 근거**: 기존 리뷰 도메인 demo 는 상태를 초록(완료/안전)·파랑(진행/신규)·주황(주의) 3색 스케일로 표현한다. 재작업 수렴 도메인도 "완료/진행/주의" 3분류로 동형이므로 위 HEX 값을 그대로 승계한다 — 리뷰 도메인 화면 전반에서 초록=안전, 파랑=진행, 주황=주의 라는 색 의미가 일관 유지된다.

---

## 3. 타이포그래피

기존 리뷰 도메인 demo 의 타이포 스케일을 그대로 재사용한다(폰트 스택·size·weight·line-height 동일).

| 요소 | font-family | size | weight | line-height |
|------|-------------|------|--------|-------------|
| 폰트 스택(sans) | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | — | — | — |
| 폰트 스택(mono) | `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace` | — | — | — |
| 페이지 제목 `h1` | sans | 24px | 700 | 1.25 |
| 섹션 제목 `h2` | sans | 18px | 600 | 1.33 |
| 카드 제목 `h3` | sans | 15px | 600 | 1.4 |
| 본문(body) | sans | 14px | 400 | 1.5 |
| 보조/설명(lead·meta) | sans | 13px | 400–600 | 1.5 |
| 캡션(caption·ts) | sans | 12px | 500 | 1.3 |
| 배지 텍스트 | sans | 12px | 600 | 1 |
| SHA·회차 등 mono | mono | 13px | 500 | 1 |
| 단계 번호 | sans | 13px | 700 | 1 |

> **재사용 근거**: system font 스택(별도 웹폰트 로드 0건)과 위 8단계 타입 스케일은 기존 리뷰 도메인 demo 와 동일하므로, dev 가 새 스타일을 정의하지 않고 동일 규칙을 선언하면 화면 간 타이포가 일치한다.

---

## 4. 레이아웃

### 4.1 섹션 구조 (위→아래)
```
┌───────────────────────────────────────────────────────────┐
│ header  ─ h1 "리뷰 재작업 자동수렴" + head 배지(현재 판정)     │
├───────────────────────────────────────────────────────────┤
│ [D] aria-live 상태 안내 (role=status, aria-live=polite)      │  ← 시각적으로도 얇은 바로 노출
├───────────────────────────────────────────────────────────┤
│ [A] 현재 검증 단계  ─ .rrc-track / .rrc-steps (가로 stepper)  │
├───────────────────────────────────────────────────────────┤
│ [B] 최신 revision  │ [C] 검토 결과   ← 데스크톱 2-column grid │
│     .rrc-card      │    .rrc-card                            │
└───────────────────────────────────────────────────────────┘
```

### 4.2 spacing
기존 spacing 스케일 재사용: `--rrc-space-1:4 / -2:8 / -3:12 / -4:16 / -5:24 / -6:32 / -8:48` (px).
- 페이지 `.wrap`: `max-width:1120px`, `margin:0 auto`, `padding: space-6 space-5`.
- 블록 간 세로 간격: `margin-bottom: space-8`.
- 카드 내부 padding: `space-5`.
- radius: `--rrc-radius:12px`, shadow: `--rrc-shadow` / hover `--rrc-shadow-hover` (기존 값 그대로).

### 4.3 breakpoint 별 동작
| viewport | [A] stepper | [B]/[C] grid |
|----------|-------------|--------------|
| ≥ 720px (desktop) | 가로 4단계 stepper (연결선 노출) | `grid-template-columns:1fr 1fr` 2열 |
| < 720px (mobile) | 세로 stepper 로 접힘(연결선 세로, 번호 좌측 정렬) | 1열 세로 스택 |

- aria-live 바(D)는 모든 breakpoint 에서 A 위 고정.
- 가로 stepper 가 좁을 때 `overflow-x:auto` 허용(기존 관례).

---

## 5. 컴포넌트 명세

각 컴포넌트는 vanilla DOM 렌더 기준 props(=렌더 입력 데이터)·상태·인터랙션을 정의한다.
(monorepo/React 가 아니므로 "props" 는 렌더 함수 입력 객체를 뜻한다 — §0 스택 정정 참조.)

### 5.1 `StatusBanner` (D — aria-live 상태 안내)
- **역할**: A/B/C 상태가 갱신될 때마다 현재 판정 문구를 스크린리더에 읽어줌 + 시각 바로도 노출.
- **마크업**: `<p id="rrc-live" class="rrc-live" role="status" aria-live="polite">` (기존 demo 의 aria-live status line 패턴 재사용).
- **props**: `{ verdict: 'approved'|'converging'|'needs_human', revLabel: string }`
- **상태별 문구**(고정 문안 — 배지·카드·live 공유):
  | verdict | 문구 |
  |---------|------|
  | `approved` | `자동수렴 완료 — {revLabel} 재검토 통과, 추가 재작업 불필요` |
  | `converging` | `수렴 중 — {revLabel} 재작업 반영, 재검토 진행 중` |
  | `needs_human` | `사람 확인 필요 — 미해결 지적 존재, 자동수렴 불가` |
- **인터랙션**: 없음(수동 포커스 대상 아님). 내용 텍스트 변경만으로 `aria-live=polite` 가 안내.
- **접근성 주의**: 페이지 최초 로드시에는 비어 있거나 현재 상태 1회만 채움(중복 announce 방지). 시각 바는 좌측 4px 컬러 스트립으로 현재 verdict 색 표시.

### 5.2 `StageStepper` (A — 현재 검증 단계)
- **역할**: 재작업 사이클 4단계의 진행 상태 표시.
- **마크업**: `.rrc-track > .rrc-track__cap + ol.rrc-steps > li.rrc-step`(기존 demo 의 단계 트랙 구조 재사용).
- **단계 정의(고정 4단계)**:
  | key | label | 설명 |
  |-----|-------|------|
  | `requested` | 변경 요청 | 리뷰어가 CHANGES_REQUESTED 게시 |
  | `revised` | 재작업 반영 | 개발자가 revision 커밋 push |
  | `re_reviewed` | 재검토 | 리뷰어/봇 재검토 수행 |
  | `converged` | 자동수렴 | 지적 0건 → 자동 LGTM |
- **단계 상태(status)**: `done`(✓) / `current`(●) / `blocked`(⚠) / `pending`(○) — 기존 단계 상태 메타 재사용.
  - `data-status` 속성으로 컬러 분기: done=`--rrc-ok`, current=`--rrc-primary`, blocked=`--rrc-warn`, pending=`--rrc-text-muted`.
  - 연결선: done 구간 `--rrc-ok`, 그 외 `--rrc-border`.
- **props**: `{ steps: Array<{ key, label, status }>, currentRev: string }` — cap 에 `현재 {currentRev} 기준` mono 표기.
- **인터랙션**: 정적(클릭 없음). `current`/`blocked` 단계는 아이콘+색+`sr-only` 라벨 3중 코드.

### 5.3 `RevisionCard` (B — 최신 revision)
- **역할**: 가장 최근 재작업본 메타 표시.
- **마크업**: `.rrc-card`(기존 카드 구조 — 좌측 4px 상태 스트립 포함) `> h3 + ul.rrc-meta`.
- **props**:
  ```
  { rev: number,            // 재작업 회차 (예: 3)
    sha: string,            // 7자 short SHA (mono)
    author: string,         // 작성자 표시명
    at: string,             // ISO 시각 → 상대시각 렌더
    filesChanged: number,   // 변경 파일 수
    summary: string }       // 한 줄 요약(placeholder OK)
  ```
- **표시**: `h3` = `rev {rev}` + `gen-tag`(mono short SHA). `.rrc-meta` 리스트로 작성자/시각/변경 파일수/요약.
- **상태 스트립**: 카드 좌측 4px = 현재 verdict 색(approved/converging/needs_human) → C 와 시각 동기화.
- **인터랙션**: 정적. hover 시 `--rrc-shadow-hover`(기존 관례 승계, 클릭 동작은 데모 범위 밖).

### 5.4 `VerdictCard` (C — 검토 결과)
- **역할**: 재검토 판정 + 근거 요약.
- **마크업**: `.rrc-card > h3(배지 포함) + ul.rrc-meta`.
- **props**:
  ```
  { verdict: 'approved'|'converging'|'needs_human',
    reviewer: string,
    at: string,
    unresolved: number,     // 미해결 지적 수 (0이면 approved 가능)
    note: string }          // 판정 근거 한 줄
  ```
- **배지**: `.rrc-badge.rrc-badge--{verdict}` — 아이콘(✓/↑/⚠) + 라벨. 기존 demo 의 pill 배지 스타일 재사용.
  | verdict | 아이콘 | 라벨 |
  |---------|--------|------|
  | `approved` | ✓ | 자동수렴 완료 |
  | `converging` | ↑ | 수렴 중 |
  | `needs_human` | ⚠ | 사람 확인 필요 |
- **인터랙션**: 정적. 배지 자체 `role="status"`(기존 head-badge 패턴).

### 5.5 상태 요약 매핑(색·아이콘·문구 단일 소스)
A/B/C/D 는 아래 단일 verdict 값에서 파생 — 화면 전체 색/아이콘/문구가 항상 일치.
```
STATE_META = {
  approved:    { icon:'✓', label:'자동수렴 완료', color:'--rrc-ok' },
  converging:  { icon:'↑', label:'수렴 중',       color:'--rrc-progress' },
  needs_human: { icon:'⚠', label:'사람 확인 필요', color:'--rrc-warn' },
}
```

---

## 6. dev 구현 가이드 (dev-1 단계별 지침)

> 대상 엔트리(신규 생성): `demo/review-revision-canary/index.html` + `data.js` + (선택) `panel.js`.
> 관측 규약 = **vanilla-static**: 외부 의존성 0건, 인라인 `<style>`, ESM `import` 만(fetch 금지). 기존 리뷰 도메인 demo 를 실제 구조 레퍼런스로 삼을 것.

1. **`<head>` 세팅**: `<meta charset="UTF-8">`, `<meta name="viewport" ...>`, `<title>리뷰 재작업 자동수렴</title>`, `<html lang="ko">`.
2. **`:root` 토큰 정의**: §2 표의 `--rrc-*` 토큰을 그대로 선언(HEX 값은 기존 리뷰 도메인 demo 와 동일). **하드코딩 HEX 금지** — 반드시 CSS 변수 경유.
3. **정적 데이터 모듈 `data.js`**: §7 canary 구조를 `export const` 로 정의하고 `Object.freeze`(기존 정적 fixture 관례). `REFERENCE_NOW` 고정 상수로 상대시각 결정론 보장.
4. **레이아웃 골격**: `.wrap`(max 1120px) 안에 header → `#rrc-live`(D) → `.rrc-track`(A) → `.rrc-grid`(B/C 2열) 순서.
5. **컴포넌트 렌더 함수**: `renderStepper(steps)`, `renderRevisionCard(rev)`, `renderVerdictCard(verdict)`, `updateLive(verdict, revLabel)` — 모두 §5 props 기준. 색은 `data-status`/`data-verdict` 속성 + CSS 분기로 처리.
6. **클래스명 권장**(기존 프리픽스 규약과 동형, 본 모듈은 `rrc-` 네임스페이스):
   - 컨테이너: `.wrap`, `.rrc-header`, `.rrc-grid`
   - stepper: `.rrc-track`, `.rrc-track__cap`, `.rrc-steps`, `.rrc-step`, `.rrc-step__num`, `.rrc-step__label`, `.rrc-step__mark`, `.rrc-step__detail`
   - 카드: `.rrc-card`, `.rrc-meta`, `.rrc-strip`, `.gen-tag`
   - 배지: `.rrc-badge`, `.rrc-badge--approved|--converging|--needs_human`
   - live: `.rrc-live`
   - 유틸: `.mono`, `.sr-only`
7. **aria-live**: `#rrc-live` 에 `role="status" aria-live="polite"`. 상태 변경 시 `textContent` 만 교체(§5.1 중복 announce 방지 규칙 준수).
8. **접근성**: 모든 상태는 색 단독 금지 — 아이콘 + 텍스트/`sr-only` 라벨 병행. focus 대상(있다면) `:focus-visible { outline:2px solid var(--rrc-focus-ring); outline-offset:2px; }`.
9. **결정론 검증**: `node --test demo/review-revision-canary/tests/*.test.js` 로 data 계층(단계 파생·verdict 문구·상대시각)이 고정 입력에 대해 고정 출력을 내는지 확인.

> mockup(`docs/design/mockups/review-revision-canary-BF-1193.html`)은 시각 참조용이며 픽셀 단위 일치 의무는 없다. 토큰·구조·상태 표현 의도만 따르면 된다.

---

## 7. 정적 카나리 데이터 구조

외부 API·신규 DB 없이 로컬 고정 상수만으로 3영역을 모두 표현 가능한 구조. 기존 리뷰 도메인 demo 의 결정론 관례(`REFERENCE_NOW` 고정 상수 + `Object.freeze`)를 따른다.

```js
// demo/review-revision-canary/data.js (dev-1 생성 예정)
// 외부 API/DB 금지 — 로컬 고정 fixture 만으로 결정론 렌더.

export const REFERENCE_NOW = '2026-07-26T09:00:00+09:00';

// 색+아이콘+라벨 3중 코드 단일 소스 (§5.5)
export const STATE_META = Object.freeze({
  approved:    { icon: '✓', label: '자동수렴 완료' },
  converging:  { icon: '↑', label: '수렴 중' },
  needs_human: { icon: '⚠', label: '사람 확인 필요' },
});

// aria-live/배지/카드 공유 고정 문안 (§5.1)
export const VERDICT_PHRASE = Object.freeze({
  approved:    '자동수렴 완료 — {revLabel} 재검토 통과, 추가 재작업 불필요',
  converging:  '수렴 중 — {revLabel} 재작업 반영, 재검토 진행 중',
  needs_human: '사람 확인 필요 — 미해결 지적 존재, 자동수렴 불가',
});

// 현재 데모가 표현하는 사이클 스냅샷 하나.
export const CANARY = Object.freeze({
  verdict: 'converging',            // A/B/C/D 공통 파생 소스
  currentRev: 'rev 3',

  // [A] 현재 검증 단계
  stages: Object.freeze([
    { key: 'requested',   label: '변경 요청', status: 'done' },
    { key: 'revised',     label: '재작업 반영', status: 'done' },
    { key: 're_reviewed', label: '재검토',     status: 'current' },
    { key: 'converged',   label: '자동수렴',   status: 'pending' },
  ]),

  // [B] 최신 revision
  latestRevision: Object.freeze({
    rev: 3,
    sha: 'a1b2c3d',
    author: '이개발',
    at: '2026-07-26T08:52:00+09:00',
    filesChanged: 4,
    summary: 'null 방어 + 테스트 3건 추가 (지적 2건 반영)',
  }),

  // [C] 검토 결과
  reviewResult: Object.freeze({
    verdict: 'converging',
    reviewer: '리뷰봇',
    at: '2026-07-26T08:58:00+09:00',
    unresolved: 1,
    note: '지적 3건 중 2건 해결, 1건 재확인 대기',
  }),
});

// 결정론 시나리오 전개(선택) — 재작업 회차별 상태 히스토리.
// 데모/테스트가 "수렴 과정"을 단계 재생할 때 사용. 외부 호출 없음.
export const CYCLE_HISTORY = Object.freeze([
  { rev: 1, verdict: 'needs_human', unresolved: 3, at: '2026-07-26T08:10:00+09:00' },
  { rev: 2, verdict: 'converging',  unresolved: 2, at: '2026-07-26T08:35:00+09:00' },
  { rev: 3, verdict: 'converging',  unresolved: 1, at: '2026-07-26T08:52:00+09:00' },
  // 다음 재작업에서 unresolved:0 → verdict:'approved' 로 수렴(데모 종단 상태).
]);
```

### 데이터 의존성 근거 (AC-3)
- **외부 API 없음**: 모든 값이 모듈 상수. `fetch`/네트워크 호출 0건.
- **신규 DB 없음**: 영속 저장소 불필요 — 페이지 로드시 `import` 로 확정.
- **결정론**: `REFERENCE_NOW` 고정 → 상대시각 렌더가 실행 시점과 무관하게 동일. 테스트가 고정 입력→고정 출력 검증 가능.
- **표현 완결성**: `CANARY` 단일 스냅샷으로 A/B/C/D 4영역 전부 렌더 가능. `CYCLE_HISTORY` 는 수렴 과정 재생용 선택 자산(미사용해도 3영역 표현에 지장 없음).

---

## 8. AC 매핑 표

| 수용 기준 | 충족 위치 |
|-----------|-----------|
| **AC-1**: 기존 demo 토큰 기반 상태 패널 설계 → 이 md 에 AC 매핑 표 + 카드·배지·타이포 재사용 근거 포함 | §2(컬러 1:1 재사용 표 + 근거) · §3(타이포 재사용 표 + 근거) · §5(카드/배지 구조 매핑) · 본 §8 표 |
| **AC-2**: mockup HTML 에 3개 상태 영역 + 상태 변경 영역(aria-live 위치) 시각화 | `docs/design/mockups/review-revision-canary-BF-1193.html` — A/B/C 영역 + D(aria-live 바, 위치·역할 라벨 명시) |
| **AC-3**: 외부 API·신규 DB 없이 표현 가능한 정적 카나리 데이터 구조 명세 | §7(`data.js` 구조 + 결정론 근거) |

---

## 9. mockup 참조
- 파일: `docs/design/mockups/review-revision-canary-BF-1193.html`
- 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`). 본 명세의 §2 컬러·§3 타이포·§4 레이아웃·§5 컴포넌트를 시각화하며 D(aria-live) 영역의 위치·역할을 주석·라벨로 표시.

---

## 10. Self-critique

| 체크 항목 | 결과 |
|-----------|------|
| **AC 매핑** | §8 표로 AC-1/2/3 → 명세 위치 1:1 매핑. 3개 AC 모두 대응 위치 존재. |
| **dev 구현 가이드** | §6 에 9단계 지침 + 클래스명/CSS 변수명 권장 + 관측 스택(vanilla-static) 명시. 신규 엔트리 경로도 안내. |
| **기존 요소 보존** | 신규 페이지이므로 파괴 대상 없음. 다만 기존 리뷰 도메인 demo 의 토큰/구조를 재사용(신규 색·신규 스케일 도입 0건)하여 시각 통일 유지. |
| **컴포넌트 매핑** | 4개 컴포넌트(StatusBanner/StageStepper/RevisionCard/VerdictCard) 각각 props·상태·인터랙션·기존 구조 매핑 정의(§5). |
| **모호함 flag** | ① stack 마커(typescript-monorepo) vs 관측 규약(vanilla-static) 불일치 → §0 에서 vanilla-static authority 로 정정. ② JIRA 키 BF-1194(task) vs BF-1193(AC 파일명) 불일치 → AC 우선하여 BF-1193 으로 명명, 운영자 rename 가능 명시. ③ 실제 엔트리 경로가 owned_paths 밖(신규, dev-1 담당) → §0 ownership 정정. |

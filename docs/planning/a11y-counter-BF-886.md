# 접근성 카운터 검증 페이지 기획 명세 — BF-886 (Phase 18 검증 2/5)

> 작성자: [박기획] (planner) · 작성일 2026-07-16
> 관련 티켓: BF-885 (Epic, 운영자 명시) · BF-886 (본 planner task)
> 검증 대상 라우트: `/phase18-validation/counter-2`
> tech-stack: 저장소 실질 스택은 `vanilla-static` (Next.js 등 라우터 부재)
> 재사용 원본(수정 금지): `src/app/demo/counter/`(BF-862) — `index.html`/`styles.css`/`counter.js`/`main.js`
> 단위 테스트: `node --test tests/a11y-counter-*.test.js` (focused scope · module: `a11y-counter`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 라우트 → 디렉터리 경로 매핑:** task 설명은 검증 대상을 `/phase18-validation/counter-2`로 표기한다. 저장소에는 실제 라우터가 없다(`package.json` `name: notepad-spa`, Next.js 의존성 0건). 직전 선례(`docs/planning/status-card-BF-879.md` §0 가정 1, Phase 18 검증 1/5)가 확립한 컨벤션 — "`/phase18-validation/<name>`" 표기를 실제 HTTP 라우팅이 아니라 **저장소 내 디렉터리 경로**로 직역 — 을 그대로 적용한다. 본 문서는 신규 경로를 `src/app/phase18-validation/counter-2/`로 정의한다.

**가정 2 — 재사용 대상 = `src/app/demo/counter/`(BF-862):** 본 저장소에서 "카운터"를 이미 구현·병합한 유일한 모듈은 `src/app/demo/counter/`이다(기획 SSOT `docs/plan/counter-BF-859.md`, 디자인 `docs/design/counter-BF-859.md`, 구현 BF-862). 이 모듈은 이미 0-플로어 클램프 연산(`increment`/`decrement`/`reset`), 네이티브 `<button>` 3종, `<output aria-live="polite">` 값 표시, 전역 키보드 단축키(`ArrowUp`/`ArrowDown`/`R`), `:focus-visible` 포커스 링까지 접근성 계약을 전부 확정해 두었다(원본 소스 확인 완료). "Phase 18 검증 1/5"인 `status-card-1`이 `src/app/demo/status/`를 재사용 검증했던 것과 동일하게, 본 task(2/5)는 **신규 카운터 로직을 발명하지 않고 원본의 접근성 계약 전체를 새 경로에서 재검증**하는 것으로 범위를 확정한다(§5).

**가정 3 — "포인터 상호작용"의 범위:** task 설명의 "포인터(값 조정)"는 마우스 클릭·터치·펜 등 W3C Pointer Events 스펙이 포괄하는 모든 포인터 입력을 의미한다. 원본 `counter.js`/`main.js`는 버튼에 `click` 이벤트만 바인딩하며, 네이티브 `<button>`의 `click` 이벤트는 마우스·터치·펜 입력 전부에서 브라우저가 동일하게 발생시킨다(별도 `pointerdown`/`touchstart` 핸들러 불필요 — 표준 동작). 따라서 본 문서는 **커스텀 포인터 이벤트 로직을 신규 요구하지 않고**, 원본의 `click` 기반 버튼 상호작용을 "포인터 상호작용" 요건으로 그대로 승계한다(§4.2, Simplicity First — 신규 이벤트 리스너 발명 금지).

**가정 4 — "상태 모델(브라우저 메모리)"의 의미:** task 설명의 "상태 모델(브라우저 메모리)"는 원본 §2.1(0-플로어 클램프, 영속화 없음)과 동일하게, 카운터 값이 **탭의 JS 실행 컨텍스트(in-memory) 안에서만 존재**하고 `localStorage`/쿠키/서버 등 어떤 영속 저장소에도 기록되지 않음을 의미한다. 새로고침·탭 종료 시 상태는 소실되고 다음 로드는 항상 `0`으로 시작한다(§6, 원본 §1.3·§9 EC-05 승계).

**가정 5 — Epic(BF-885)과 Phase 18 검증 스위트의 관계:** git 이력상 "Phase 18 검증 1/5"(status-card-1)의 상위 Epic은 BF-879였고, 그 체인의 planner/designer/dev/tester task는 BF-880~884였다. 본 task 설명이 "운영자 Epic BF-885"를 직접 명시하므로, BF-885는 "Phase 18 검증 2/5"(counter-2)의 상위 Epic이며 본 task(BF-886)가 그 체인의 planner task로 추정된다(status-card 체인과 동일한 번호 부여 패턴). "-1"/"-2" 접미사는 항목마다 **다른 주제**(1=status-card, 2=counter)에 붙는 일련번호이며, "동일 주제의 반복 검증"이 아님이 이번 task로 확인되었다(직전 문서 §13-2 미해결 항목이 본 task로 해소됨).

**가정 6 — 파일명 규칙:** BF-886 task 설명·수용 기준 원문에는 status-card 사례(BF-880)와 달리 산출물 파일명을 명시적으로 지정하는 문구가 없다(단순히 "docs/planning 에 문서화된다"). 따라서 표준 규칙("topic-JIRA-KEY.md", JIRA-KEY=본 planner task)을 적용해 `docs/planning/a11y-counter-BF-886.md`로 명명한다. topic을 "counter-2"가 아닌 "a11y-counter"로 정한 근거는 본 task 컨텍스트에 명시된 `primary-module` 태그(`a11y-counter`) 및 테스트 명령(`tests/a11y-counter-*.test.js`)과 파일명을 일치시켜 후속 designer/dev/tester가 동일한 module 키워드로 산출물을 찾을 수 있게 하기 위함이다(status-card-1 사례도 route suffix "-1"을 module명에서 생략하고 "status-card"만 사용한 것과 동일한 패턴).

**가정 7 — 파일 소유권:** 본 task의 담당 파일은 `docs/planning/a11y-counter-BF-886.md` 1개뿐이다. `src/app/phase18-validation/counter-2/*` 코드, `docs/design/*` 문서는 후속 designer/dev task 담당 영역이며 본 task에서 생성·수정하지 않는다.

실제 Epic(BF-885)에 위 가정과 다른 명시적 지침이 있다면 대조 확인이 필요하다(§15).

---

## 목차

1. [개요](#1-개요)
2. [사용자 가치](#2-사용자-가치)
3. [라우트](#3-라우트)
4. [키보드 상호작용](#4-키보드-상호작용)
5. [포인터 상호작용](#5-포인터-상호작용)
6. [상태 전이 (상태 모델 · 브라우저 메모리)](#6-상태-전이-상태-모델--브라우저-메모리)
7. [ARIA 및 접근성 마크업 요구](#7-aria-및-접근성-마크업-요구)
8. [기존 시각/로직 재사용 범위 확정](#8-기존-시각로직-재사용-범위-확정)
9. [진입 시나리오 및 렌더 조건](#9-진입-시나리오-및-렌더-조건)
10. [제외 범위 — 필수 명세](#10-제외-범위--필수-명세)
11. [파일 구조 및 기술 제약](#11-파일-구조-및-기술-제약)
12. [수용 기준 (Given/When/Then)](#12-수용-기준-givenwhenthen)
13. [Edge Case 목록](#13-edge-case-목록)
14. [비범위 (Out of Scope)](#14-비범위-out-of-scope)
15. [산출물 위치 및 참조 표](#15-산출물-위치-및-참조-표)
16. [남은 모호함 (운영자 확인 권장)](#16-남은-모호함-운영자-확인-권장)

---

## 1. 개요

### 1.1 목적

`/phase18-validation/counter-2`(= `src/app/phase18-validation/counter-2/`)는 Phase 18 검증 스위트의 두 번째 항목으로, 이미 병합된 `/demo/counter`(BF-862)의 **접근성 계약**(키보드 전체 조작·포인터 조작·ARIA 라이브 리전·포커스 가시성)이 새 경로/컨텍스트에서도 손실 없이 재사용 가능한지 확인하는 정적 검증 페이지다. 신규 카운터 기능이 아니라 **접근성 재사용성 검증**이 목적이다.

### 1.2 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `src/app/phase18-validation/counter-2/`(`index.html`/`styles.css`/`counter.js` 또는 재사용 모듈 import) — §0 가정 1 |
| 기존 코드 영향 | 없음 — `src/app/demo/counter/`는 수정하지 않는다(§8, §10.5) |
| 데이터 원천 | 없음 — 클라이언트 in-memory 상태만 사용(§6) |
| 외부 라이브러리 | 없음 — `file://` 프로토콜 직접 열기 가능 |
| 영속 저장 | 없음 — `localStorage`/쿠키 등 어떤 저장소도 사용하지 않음(§6, 원본 §1.3 승계) |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전) 또는 Node.js(`node --test`)로 순수 함수(카운터 로직) 단위 테스트
- `src/app/phase18-validation/counter-2/` 디렉터리는 아직 존재하지 않으며, 본 task 이후 별도 designer/dev task에서 신규 생성됨
- 원본 `src/app/demo/counter/counter.js`는 UMD 유사 패턴(ESM export)으로 이미 작성되어 있어 재사용 시 신규 빌드 도구 없이 상대경로 `import`가 가능하다(원본 소스 확인 완료)

---

## 2. 사용자 가치

1차 사용자는 최종 고객이 아니라 **내부 접근성 검증 담당자(QA/스크린리더 사용자/키보드 전용 사용자)**다. 목표:

1. **접근성 계약의 재현성 확인** — 새 경로에서도 `Tab` 순서·전역 단축키·`aria-live` 알림·포커스 링이 원본과 동일하게 동작함을 코드 리딩 없이 눈과 스크린리더로 확인한다.
2. **회귀 조기 감지** — 향후 원본 `/demo/counter`가 변경되었을 때, 본 검증 페이지가 재사용 import 구조라면 그 변경이 즉시 반영되어 접근성 회귀를 조기에 드러낸다(§9.1 S3).
3. **키보드·포인터 이중 경로 보장** — 마우스/터치가 불가능한 사용자와 스크린리더/키보드 전용 사용자 모두 동일한 결과(값 변경)에 도달할 수 있음을 검증 문서로 고정한다.

---

## 3. 라우트

| 항목 | 값 |
|---|---|
| 검증 대상 라우트(표기) | `/phase18-validation/counter-2` |
| 저장소 디렉터리 경로(실체) | `src/app/phase18-validation/counter-2/` (§0 가정 1) |
| 정적 서빙 접근 URL | `http://localhost:8888/src/app/phase18-validation/counter-2/` (`pnpm start` = `http-server . -p 8888`) |
| `file://` 직접 접근 | `index.html`을 브라우저로 직접 열기 — 상대경로 리소스(CSS/JS)만으로 완결(§9.1 S2) |
| 재사용 원본 라우트 | `/demo/counter` = `src/app/demo/counter/` (BF-862, 수정 금지) |
| `<title>` (원본과 문구만 차이) | `카운터 · /demo/counter` → `접근성 카운터 검증 · /phase18-validation/counter-2` |
| `<h1>` (원본과 문구만 차이) | `카운터` → `카운터 (Phase 18 검증 2/5 · 접근성)` |

> 위 표 밖의 모든 마크업 구조·id·클래스명·ARIA 속성은 원본과 1:1 동일해야 한다 — 이것이 "접근성 재사용 범위 확정"의 검증 대상이다(§8, §12 AC-3).

---

## 4. 키보드 상호작용

> 원본 `docs/plan/counter-BF-859.md` §6.1(검증 가능한 키보드 조작 요건)을 **재해석 없이 그대로 승계**한다. 본 절은 task 수용 기준("키보드 조작(증가/감소/리셋) 및 ARIA 요구가 명시된다")에 직접 대응한다.

### 4.1 요건 표

| 요건 | 상세 | 검증 방법 |
|---|---|---|
| 포커스 이동 | 3개 컨트롤(`+1`/`-1`/`초기화`) 모두 네이티브 `<button>` → `Tab`/`Shift+Tab`으로 브라우저 기본 순서(`btn-increment`→`btn-decrement`→`btn-reset`) 이동. 커스텀 `role="button"` div 금지 | 정적 마크업 검사: `grep -cE "<button" src/app/phase18-validation/counter-2/index.html` = 3, `grep -c 'role="button"'` = 0 |
| 활성화 키 | 포커스된 버튼에서 `Enter`/`Space` → 클릭과 동일 동작(네이티브 `<button>` 기본 제공) | 수동/E2E: 각 버튼 포커스 후 `Enter`·`Space` 각각 입력 → 값 변경 관찰(3버튼 × 2키 = 6케이스) |
| 전역 단축키 — 증가 | `ArrowUp` → 포커스 위치 무관 `+1` 실행, `preventDefault()`로 페이지 스크롤 방지 | E2E: `document.body` 포커스 상태에서 `ArrowUp` 입력 → 값 +1, `window.scrollY` 불변 확인 |
| 전역 단축키 — 감소 | `ArrowDown` → 포커스 위치 무관 `-1` 실행(0-플로어 클램프 적용), `preventDefault()` | E2E: 값 `0`에서 `ArrowDown` 입력 → 값 `0` 유지, 에러 없음 |
| 전역 단축키 — 리셋 | `R`/`r`(대소문자 무관) → 포커스 위치 무관 `초기화` 실행 | E2E: 임의 값에서 `r` 입력 → 값 `0` |
| 입력 요소 예외 | 텍스트 입력 필드(`INPUT`/`TEXTAREA`/`contenteditable`)에 포커스가 있을 때는 전역 단축키가 개입하지 않음(원본 §6.1 EC — 본 페이지는 텍스트 입력 요소가 없어 해당 없음이나, 재사용 코드가 이 가드를 유지해야 함) | 코드 리뷰: `main.js`의 `isEditable` 가드 로직이 원본과 동일하게 존재하는지 확인 |
| 포커스 가시성 | `:focus-visible` 스타일이 어떤 컨트롤에서도 `outline: none` 단독으로 제거되지 않음 | 정적 코드 검사: `styles.css`에서 `outline:\s*none`이 대응 커스텀 링 없이 단독 사용되지 않는지 확인 |

### 4.2 Tab 순서 (고정 계약)

```
(페이지 진입, 자동 포커스 없음)
  → Tab → #btn-increment (+1)
  → Tab → #btn-decrement (-1)
  → Tab → #btn-reset     (초기화)
  → Tab → 페이지 밖(포커스 트랩 없음)
```

---

## 5. 포인터 상호작용

> §0 가정 3에 따라 "포인터"는 마우스·터치·펜을 포괄하며, 신규 커스텀 포인터 이벤트 로직은 요구하지 않는다.

### 5.1 요건 표

| 요건 | 상세 | 검증 방법 |
|---|---|---|
| 클릭(마우스) | `+1`/`-1`/`초기화` 버튼 클릭 시 각각 대응 연산이 동기 실행되고 값이 즉시 갱신됨 | E2E: 각 버튼 클릭 → 값 변경 확인(§6.2 동기 갱신) |
| 탭(터치) | 네이티브 `<button>`의 `click` 이벤트가 터치 탭에서도 동일하게 발생(브라우저 표준) — 별도 `touchstart` 핸들러 불필요 | 코드 리뷰: `main.js`에 커스텀 `touchstart`/`pointerdown` 리스너가 **없음**을 확인(신규 발명 금지 원칙 위반 여부 점검) |
| 최소 터치 타깃 | 각 버튼 `min-height: 48px` 이상(원본 디자인 §5.2 승계) — 저시력/운동 장애 사용자의 오탭 방지 | 정적 코드 검사: `styles.css`의 `.counter-btn` `min-height` 값 확인 |
| 연타(더블/트리플 클릭) | debounce/throttle 없이 클릭 수만큼 정확히 값 누적(원본 §6.2 EC-02 승계) | 단위 테스트: `increment`를 N회 연속 호출한 결과가 정확히 N만큼 누적되는지 assert |
| 포인터로만 조작 완결 | 마우스/터치만으로 3개 조작(증가/감소/리셋) 모두 도달·실행 가능 — 키보드 조작(§4)과 상호 배타적이지 않고 **양쪽 다 항상 가능**해야 함 | E2E: 키보드 입력 없이 클릭만으로 AC-02~04(§12) 전부 재현 |

---

## 6. 상태 전이 (상태 모델 · 브라우저 메모리)

### 6.1 상태 모델

```javascript
// 상태는 탭의 메모리(JS 클로저/변수)에만 존재 — 영속 저장소 없음(§0 가정 4)
{
  value: number   // 항상 0 이상의 정수, 페이지 로드마다 0으로 초기화
}
```

| 속성 | 값 |
|---|---|
| 저장 위치 | 브라우저 탭의 JS 실행 컨텍스트(in-memory 변수) |
| 영속화 | 없음 — `localStorage`/`sessionStorage`/쿠키/서버 어느 것도 사용하지 않음 |
| 생명주기 | 페이지 로드 시 생성(`value = 0`) → 사용자 조작으로 갱신 → 새로고침/탭 종료 시 소멸 |
| 동시성 | 단일 탭 내 단일 상태 — 여러 탭에서 열어도 상태는 각 탭 독립(동기화 없음) |

### 6.2 상태 전이 다이어그램

```
                    ┌─────────────────────┐
                    │   [페이지 로드]       │
                    │   value = 0          │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                 │
        +1(클릭/Enter/      -1(클릭/Enter/    초기화(클릭/Enter/
         Space/ArrowUp)     Space/ArrowDown)   Space/R)
              │                │                 │
              ▼                ▼                 ▼
     value = value+1   value = max(0,      value = 0
     (상한 없음)         value-1)           (현재값 무관,
                        (0 미만 금지)         항상 허용)
              │                │                 │
              └────────────────┴────────┬────────┘
                                         │
                                  [화면 즉시 갱신]
                                  (동기, 지연 없음)
                                         │
                                         ▼
                              (다음 조작 대기 — 반복 가능)

              [새로고침/탭 종료] → 상태 소멸 → 다음 로드는 항상 value=0
```

### 6.3 전이 규칙 요약

| 전이 | 조건 | 결과 |
|---|---|---|
| `increment` | 항상 | `value = value + 1` (상한 없음) |
| `decrement` | `value > 0` | `value = value - 1` |
| `decrement` | `value === 0` | `value = 0` (무음 클램프, 에러 없음) |
| `reset` | 항상(현재 값 무관) | `value = 0` |
| 페이지 재로드 | 항상 | `value = 0`으로 재초기화(영속 상태 없음) |

원본 `src/app/demo/counter/counter.js`의 `increment`/`decrement`/`reset` 순수 함수를 상대경로 `import`로 그대로 재사용하며(§8), 본 검증 페이지는 신규 상태 전이 규칙을 발명하지 않는다.

---

## 7. ARIA 및 접근성 마크업 요구

> 본 절은 task 수용 기준("ARIA 요구가 명시된다")에 직접 대응한다. 원본 §6.3(접근성 마크업 계약)을 고정 승계한다.

### 7.1 고정 마크업 계약 (재해석·변경 금지)

```html
<output id="counter-value" aria-live="polite">0</output>
<button type="button" id="btn-increment">+1</button>
<button type="button" id="btn-decrement">-1</button>
<button type="button" id="btn-reset">초기화</button>
```

### 7.2 ARIA 요구 표

| 요구 | 상세 | 검증 방법 |
|---|---|---|
| 값 변경 알림 | `#counter-value`에 `aria-live="polite"` (또는 `<output>`의 암묵적 live region) — 값이 바뀔 때마다 스크린리더가 지연 없이 안내 | 정적 마크업 검사: `grep -E "aria-live|<output" index.html` |
| 네이티브 버튼 시맨틱 | 3개 컨트롤 모두 `<button type="button">` — `role`/`aria-label` 재정의 없이 텍스트 콘텐츠(`+1`/`-1`/`초기화`)가 곧 접근성 이름 | 정적 마크업 검사: `<button>` 3건, 커스텀 `role="button"` 0건 |
| 포커스 가시성 | `:focus-visible`에 `outline`+`box-shadow` 링 적용, `outline: none` 단독 사용 금지 | `styles.css` 검사(§4.1과 동일 항목) |
| 자동 포커스 없음 | 페이지 로드 시 특정 버튼에 자동 포커스를 주지 않음 — 스크린리더 사용자에게 예기치 않은 포커스 이동 방지(원본 §11 재량 항목을 검증 페이지에서는 "주지 않음"으로 고정) | 코드 리뷰: `main.js`에 `.focus()` 자동 호출 없음 확인 |
| 색만으로 구분하지 않음 | 버튼 라벨은 항상 텍스트(`+1`/`-1`/`초기화`)로 표시 — 아이콘만으로 대체 금지(원본 디자인 §5.3 승계) | 정적 마크업 검사: 버튼 텍스트 콘텐츠 비어있지 않음 확인 |
| 감소 모션 선호 대응 | `prefers-reduced-motion: reduce` 시 값 색 전환 등 트랜지션 제거(원본 §6.3 승계) | `styles.css`에 `@media (prefers-reduced-motion: reduce)` 블록 존재 확인 |

### 7.3 접근성 이름(Accessible Name) 매핑

| 요소 | 접근성 이름 산출 |
|---|---|
| `#btn-increment` | 텍스트 콘텐츠 `+1` |
| `#btn-decrement` | 텍스트 콘텐츠 `-1` |
| `#btn-reset` | 텍스트 콘텐츠 `초기화` |
| `#counter-value` | `<output>` 요소 + `aria-live="polite"` → 값 변경 시 스크린리더가 새 값을 능동적으로 announce(포커스 이동 없이) |

---

## 8. 기존 시각/로직 재사용 범위 확정

### 8.1 재사용 대상 (그대로 가져오는 것)

| 구분 | 원본 출처 | 재사용 방식 |
|---|---|---|
| CSS 디자인 토큰 전체(`--color-*`/`--space-*`/`--radius-*`/`--text-*`/`--motion-*`) | `src/app/demo/counter/styles.css` `:root`/다크 미디어쿼리 | 값 그대로 복제 또는 상대경로로 원본 `styles.css` 직접 참조(dev 재량) — 신규 색상/토큰 발명 금지 |
| 컴포넌트 CSS 규칙(`.counter-card`/`.counter-value`/`.counter-btn` 3 variant/`.counter-hint`) | 상동 | 그대로 복제 또는 참조 |
| 순수 로직(`increment`/`decrement`/`reset`) | `src/app/demo/counter/counter.js` | **신규 구현 금지** — 상대경로 `import`로 원본 모듈 재사용 |
| DOM 렌더 구조 및 ARIA 마크업(§7.1) | `src/app/demo/counter/index.html`, `main.js` | 동일 구조로 재현 |
| 키보드/전역 단축키 로직 | `src/app/demo/counter/main.js` | 동일 이벤트 바인딩 재사용(§4) |

### 8.2 재사용하지 않는 것 (신규 허용 범위, 최소)

- `<title>`/`<h1>` 텍스트만 검증 맥락을 반영해 구분한다(§3) — 시각/접근성 언어가 아닌 페이지 식별 문자열이므로 재사용 범위를 벗어나지 않는다.
- 디렉터리 경로 자체(`src/app/phase18-validation/counter-2/`)는 검증 목적상 원본과 분리된 신규 위치다.

### 8.3 재사용(접근성) 성공 판정 기준

designer/dev가 본 검증 페이지를 구현했을 때, 원본(`/demo/counter`)과 비교해 다음이 모두 참이면 "접근성 재사용 성공"으로 판정한다(§12 AC-3):

1. `counter.js`(또는 동등 모듈)가 자체 로직을 재구현하지 않고 원본을 import하거나 값이 100% 동일하다(§6.3 전이 규칙 대조).
2. 렌더된 DOM에 `#counter-value`(`aria-live="polite"`)와 `#btn-increment`/`#btn-decrement`/`#btn-reset` 3개 네이티브 버튼이 원본과 동일한 id·태그로 존재한다(§7.1).
3. `Tab` 순서·전역 단축키(`ArrowUp`/`ArrowDown`/`R`)·`:focus-visible` 링이 원본과 동일하게 동작한다(§4).
4. 클릭(포인터) 조작만으로도 3개 연산이 모두 도달 가능하다(§5.1).

---

## 9. 진입 시나리오 및 렌더 조건

### 9.1 진입 시나리오

| 시나리오 | 진입 경로 | 기대 동작 |
|---|---|---|
| S1. 정적 서버 경유 | `pnpm start`(`http-server . -p 8888`) 후 `http://localhost:8888/src/app/phase18-validation/counter-2/` 접속 | 네트워크 요청 없이 즉시 렌더 |
| S2. `file://` 직접 열기 | `index.html`을 브라우저로 직접 오픈 | 상대경로 리소스(`styles.css`, JS 모듈)가 모두 로드되어 S1과 동일 렌더(§16-3 — ES 모듈 cross-origin 제약 시 dev가 대안 검토) |
| S3. 원본 모듈 변경 후 재검증 | `src/app/demo/counter/counter.js` 또는 `main.js`가 향후 수정된 경우 | 본 페이지가 원본을 상대경로 import로 재사용하는 구조라면 변경이 자동 반영되어 접근성 회귀가 조기에 드러남(§2-2) |

### 9.2 렌더 조건 (필수)

1. **로드 즉시 1회 렌더** — 로딩 스피너·스켈레톤·지연 없이 값 `0` + 버튼 3개가 즉시 나타난다.
2. **오프라인 동작** — 네트워크 연결이 없어도 완전히 동일하게 렌더된다(외부 API 호출 0건).
3. **새로고침 안정성** — 몇 번을 새로고침해도 항상 `value = 0`으로 시작한다(§6, 영속화 없음).
4. **JS 비활성 시 폴백** — `<noscript>` 안내 문구를 표시한다(원본과 동일 패턴이 있다면 승계, 없다면 신규 최소 문구 추가는 dev 재량).

---

## 10. 제외 범위 — 필수 명세

### 10.1 실제 API·외부 통신 금지

`fetch()`/`XMLHttpRequest`/`WebSocket`/`EventSource` 등 어떤 형태로도 외부/내부 API를 호출하지 않는다. 신규 API 라우트를 만들지 않는다.

### 10.2 polling(주기 갱신) 금지

`setInterval`/`setTimeout` 기반의 재조회·재렌더 로직을 두지 않는다. 값 변경은 오직 사용자 조작(키보드/포인터)에 의해서만 발생한다.

### 10.3 DB 연동 금지

`prisma/schema.prisma` 수정, migration 생성, DB 조회 코드 어느 것도 포함하지 않는다.

### 10.4 신규 패키지 설치 금지

`package.json`에 신규 dependency를 추가하지 않는다. 외부 CDN 스크립트/스타일도 포함하지 않는다.

### 10.5 원본 모듈(`src/app/demo/counter/`) 수정 금지

본 검증 task는 원본을 "재사용"하는 것이지 "변경"하는 것이 아니다. `src/app/demo/counter/*` 파일을 수정하면 이미 병합된 BF-862 기능에 회귀를 유발할 수 있으므로 절대 수정하지 않는다(§8).

### 10.6 검증 방법

| 방법 | 절차 | 통과 조건 |
|---|---|---|
| 정적 코드 검사 | `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|setInterval|setTimeout|https?://" src/app/phase18-validation/counter-2/*` | 매치 0건(자체 상대경로 리소스 제외) |
| 원본 미변경 확인 | PR diff에서 `src/app/demo/counter/**` 변경 여부 확인 | 변경 0건 |
| `package.json`/`prisma/` diff 확인 | PR diff 확인 | 변경 0건 |
| ARIA/키보드 정적 검사 | `grep -E "aria-live|<output|<button"` + `role="button"` 미사용 확인(§7.2) | §7.1 계약과 1:1 일치 |

---

## 11. 파일 구조 및 기술 제약

| 파일 | 역할(제안 — 최종 파일 분할은 dev 재량) |
|---|---|
| `src/app/phase18-validation/counter-2/index.html` | 마크업(§3 `<title>`/`<h1>` 문구만 변경, §7.1 ARIA 계약 유지) |
| `src/app/phase18-validation/counter-2/styles.css` | `src/app/demo/counter/styles.css` 토큰·컴포넌트 규칙 복제(§8.1) |
| `src/app/phase18-validation/counter-2/main.js` | `../../demo/counter/counter.js`를 상대경로 `import`하여 재사용(§8.1) — DOM 바인딩·키보드 리스너만 재작성 또는 복제, 순수 로직 재구현 금지 |

- 외부 의존성 0건, `file://`/정적 서버 양쪽 호환.
- 테스트: `node --test tests/a11y-counter-*.test.js` — ① 원본 모듈 미변경 확인(§10.6), ② 재사용 import/값 동일성 확인(자체 로직 재구현 없음, §8.3), ③ `increment`/`decrement`/`reset` 전이 규칙(§6.3) 순수 함수 재검증, ④ ARIA 마크업 정적 검사(§7.2).

---

## 12. 수용 기준 (Given/When/Then)

### 12.1 BF-886 수용 기준 원문 매핑

**AC-1 (기획 명세 산출물)**
> **Given** 운영자 Epic(BF-885) 요구
> **When** 기획 명세를 작성하면
> **Then** `docs/planning/a11y-counter-BF-886.md`(본 문서)에 라우트(§3)·키보드 상호작용(§4)·포인터 상호작용(§5)·상태 전이(§6)·수용기준(§12)이 문서화된다.

**AC-2 (키보드 조작·ARIA)**
> **Given** 접근성 요구
> **When** 본 명세를 검토하면
> **Then** 키보드 조작(증가=`ArrowUp`/`Enter`+`+1`포커스, 감소=`ArrowDown`/`Enter`+`-1`포커스, 리셋=`R`/`Enter`+`초기화`포커스)이 §4에 명시되고, `aria-live`·네이티브 버튼 시맨틱·포커스 가시성 등 ARIA 요구가 §7에 명시된다.

### 12.2 파생 AC (원본 계약 재검증, §6·§8 근거)

**AC-3 (접근성 재사용 성공)**
> **Given** `src/app/phase18-validation/counter-2/*` 구현물
> **When** 원본 `src/app/demo/counter/*`와 비교하면
> **Then** §8.3 판정 기준 4항목(로직 재구현 없음, ARIA 마크업 동일, 키보드 계약 동일, 포인터만으로 조작 완결)을 모두 만족한다.

**AC-4 (증가 — 즉시 반영, 상한 없음)**
> **Given** 카운터 값이 `N`(0 이상 정수)인 상태
> **When** `+1` 클릭, `+1` 포커스 시 `Enter`/`Space`, 또는 `ArrowUp`을 입력하면
> **Then** 값이 `N+1`로 즉시(동기) 갱신되고 `aria-live` 영역이 새 값을 announce한다.

**AC-5 (감소 — 즉시 반영, 0-플로어)**
> **Given** 카운터 값이 `N`(0 이상 정수)인 상태
> **When** `-1` 클릭, `-1` 포커스 시 `Enter`/`Space`, 또는 `ArrowDown`을 입력하면
> **Then** `N > 0`이면 `N-1`로 갱신되고, `N === 0`이면 `0`을 유지하며 에러 없이 그대로 표시된다.

**AC-6 (리셋 — 상태 무관 항상 허용)**
> **Given** 카운터 값이 임의의 값(0 포함)인 상태
> **When** `초기화` 클릭, `초기화` 포커스 시 `Enter`/`Space`, 또는 `R`을 입력하면
> **Then** 값이 즉시 `0`으로 재설정된다.

**AC-7 (외부 API·영속화 없음)**
> **Given** 본 검증 페이지 소스 전체와 `package.json`
> **When** §10.6 정적 코드 검사를 실행하면
> **Then** 네트워크 호출·`localStorage`/쿠키 사용·신규 dependency 추가가 0건이다.

### 12.3 매핑 요약표

| BF-886 수용 기준 | 충족 근거 |
|---|---|
| Given 운영자 Epic BF-885, When 기획 명세를 작성, Then docs/planning 에 라우트/키보드 상호작용/포인터 상호작용/상태 전이/수용기준이 문서화 | §3(라우트)·§4(키보드)·§5(포인터)·§6(상태 전이)·§12(수용기준) 전체 |
| Given 접근성 요구, When 명세를 검토, Then 키보드 조작(증가/감소/리셋) 및 ARIA 요구가 명시 | §4(키보드 조작 표)·§7(ARIA 요구 표)·§12 AC-2 |

---

## 13. Edge Case 목록

| Edge Case ID | 시나리오 | 기대 동작 |
|---|---|---|
| EC-01 | 값이 `0`인 상태에서 `-1`(클릭/키보드 무관) | 값 `0` 유지, 에러 없음(§6.3) |
| EC-02 | `+1`을 매우 빠르게 연타(더블/트리플 클릭 또는 `ArrowUp` 연타) | debounce/throttle 없이 입력 수만큼 정확히 누적(§5.1) |
| EC-03 | 포커스가 어떤 버튼에도 없는 상태(`document.body`)에서 전역 단축키 입력 | 전역 `keydown` 리스너가 여전히 동작(§4.1) |
| EC-04 | 값을 여러 번 변경한 뒤 페이지 새로고침 | 영속화 로직이 없으므로 값은 항상 `0`으로 재시작(§6, §9.2-3) — 결함이 아닌 의도된 동작 |
| EC-05 | 스크린리더 사용자가 값 변경 없이 버튼만 Tab으로 순회 | `aria-live` 영역은 값이 실제로 변경될 때만 announce — 단순 포커스 이동으로는 announce 없음(정상, `polite` 특성) |
| EC-06 | `file://`에서 ES 모듈 상대경로 `import`가 브라우저 CORS 정책으로 차단되는 경우 | dev는 §9.1 S1(정적 서버 경유)만 공식 검증 경로로 채택하거나 대안 검토(§16-3, 강제 아님) |
| EC-07 | 원본 `src/app/demo/counter/`가 향후 삭제/이동되는 경우 | 본 페이지의 `import`가 깨짐 — 재사용 계약 위반의 조기 경고 신호로 간주, 별도 폴백 규정 없음(§16-4) |

---

## 14. 비범위 (Out of Scope)

- 신규 카운터 연산·상한/하한 변경 — §6.3 전이 규칙은 원본과 100% 동일(재사용 검증이 목적)
- `src/app/demo/counter/*` 원본 코드의 수정·리팩터링 — §10.5
- Phase 18 검증 스위트의 1, 3~5/5 항목 — 본 문서는 2/5만 다룬다
- 디자인 시안(정확한 mockup, 색상 대비 재검증 등) — designer 담당 영역, 원본 디자인 명세(`docs/design/counter-BF-859.md`)를 그대로 참조하면 충분하다고 판단(§16-5)
- 실제 스크린리더(NVDA/VoiceOver 등)를 이용한 수동 접근성 테스트 실행 — 본 문서는 검증 가능한 요건·정적 검사 방법만 정의, 실제 수동 QA 실행은 별도 tester 재량
- `localStorage` 등 영속화 도입 — v1은 새로고침 시 항상 0으로 재시작(원본과 동일 정책)

---

## 15. 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/planning/a11y-counter-BF-886.md`(본 문서) |
| 신규 구현 대상(후속 designer/dev task) | `src/app/phase18-validation/counter-2/index.html`, `styles.css`, `main.js` — 미정, 본 문서 §3~§11이 계약(contract) |
| 신규 테스트 대상(후속 tester task) | `tests/a11y-counter-*.test.js` — 미정, 본 문서 §10.6·§12가 검증 기준 |
| 재사용 원본(수정 금지) | `src/app/demo/counter/index.html`, `styles.css`, `counter.js`, `main.js`(BF-862) |
| 참조한 기존 선례 | `docs/plan/counter-BF-859.md`(카운터 연산/키보드/ARIA 계약 원본), `docs/design/counter-BF-859.md`(시각 토큰 원본), `docs/planning/status-card-BF-879.md`(Phase 18 검증 1/5 — 검증 스위트 문서 패턴 원본) |

---

## 16. 남은 모호함 (운영자 확인 권장)

1. **Epic(BF-885) 원문 미대조**: 본 세션에 Jira 조회 도구가 연결되어 있지 않아 BF-885 Epic 원문을 직접 대조하지 못했다. 본 문서는 BF-886 task 설명·수용 기준 원문 및 status-card 선례(BF-879/880)만으로 작성했다.
2. **Phase 18 검증 스위트 3~5/5 항목의 구체 범위**: 본 task로 "-1"/"-2" 접미사가 항목별 서로 다른 주제(1=status-card, 2=counter)에 대응함이 확인되었으나, 남은 3~5/5의 주제·라우트는 여전히 확인 불가하다.
3. **`file://` cross-origin import 제약**: §13 EC-06 — 실제 dev 구현 시 브라우저 정책으로 상대경로 모듈 import가 막히면 대안(정적 서버 전용 검증으로 축소, 또는 파일 복제)을 재검토해야 한다.
4. **원본 모듈 변경/이동 시 대응 정책**: §13 EC-07 — 재사용 계약이 깨졌을 때 본 검증 페이지가 "실패로 표시"되어야 하는지, 별도 유지보수 없이 방치돼도 되는지는 운영자 판단이 필요하다.
5. **디자인 산출물 필요 여부**: 본 문서는 원본 디자인 명세(`docs/design/counter-BF-859.md`) 재사용만으로 충분하다고 가정했으나(§14), Phase 18 검증 스위트가 별도 designer 산출물(신규 mockup 등)을 요구하는지는 확인되지 않는다.
6. **파일명 JIRA-KEY 선택(§0 가정 6)**: status-card 사례처럼 Epic 번호(BF-885)를 파일명에 쓰라는 명시적 지시가 원문에 없어 본 task 번호(BF-886)를 사용했다. 만약 Epic 원문이 특정 파일명을 지정하고 있다면 파일명 재조정이 필요하다.

---

*문서 종료 — [박기획] · BF-886*

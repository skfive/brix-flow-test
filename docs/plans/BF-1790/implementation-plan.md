# BF-1790 · 격리 실증 미니 페이지 구현 설계

> planner 산출물 (BF-1793). 이 문서는 PM 분해를 `backend`·`brix-cms` 두 repo의
> observed 실행 모델에 맞는 구현 설계와 handoff 계약으로 구체화한다.
> **frozen blueprint(ui-contract@v1)가 파일·소유자·상태·후조건의 유일한 권위이며,
> 이 문서는 그것을 재정의하지 않고 그대로 설명한다.** 새 파일·새 역할을 추가하지 않는다.

## 1. 목표와 범위

`격리 실증(isolation proof)` 미니 페이지를 두 repo에 각각 독립 구현하여, 동일한 UI 계약을
서로 다른 stack(vanilla-static / React·Next.js)에서 병렬로 실현할 수 있음을 실증한다.

- **primary repo**: `backend` (observed stack: `vanilla-static`, esm, npm, serve_root `.`)
- **reference repo**: `brix-cms` (React / Next.js app-router; `refs/brix-cms/` read-only)
- 각 repo는 서로의 파일을 건드리지 않고 자기 owned 경로만 구현한다 (격리 실증).

## 2. repo ↔ 파일 매핑 (frozen blueprint 그대로)

frozen `ui-contract@v1`이 동결한 6개 파일을, 각 repo의 observed stack 기준으로 분배한다.
파일 확장자(`.tsx` = React app-router, `index.html`+`src/feature.js` = vanilla ESM)와
DOM prefix(`mini-` / `mini-cms-`)가 소속 repo를 확정한다.

| repo | stack | 파일 | 소유자 | 상태(status) |
|------|-------|------|--------|--------------|
| backend | vanilla-static (ESM) | `apps/mini-page/index.html` | developer | additive |
| backend | vanilla-static (ESM) | `apps/mini-page/src/feature.js` | developer | additive |
| backend | vanilla-static (ESM) | `apps/mini-page/tests/feature.test.js` | developer | additive |
| brix-cms | React / Next.js app-router | `app/mini/page.tsx` | developer | additive |
| brix-cms | React / Next.js app-router | `app/mini/mini-feature.tsx` | developer | additive |
| brix-cms | React / Next.js app-router | `app/mini/mini-feature.test.tsx` | developer | additive |

- **additive 정책**: 위 6개 파일은 모두 `artifact-policy: additive`. developer는 새 파일을
  추가하기만 하며, 기존 파일을 파괴적으로 재작성하지 않는다.
- **소유권 권위**: 파일 소유자·상태 계약은 frozen blueprint가 유일 권위다. 이 문서는 재정의하지 않는다.

## 3. repo별 exact UI 계약

두 구현은 **동일한 상태 머신·동일한 design token·동일한 접근성/반응형 기준**을 공유하되,
selector 네임스페이스만 repo별로 분리한다. developer는 아래 selector와 token을
**변경하거나 재정의하지 않는다** (frozen invariant).

### 3.1 backend (`apps/mini-page/`)

| 항목 | 값 |
|------|-----|
| 진입 파일 | `apps/mini-page/index.html` |
| 로직(ESM) | `apps/mini-page/src/feature.js` |
| 단위 테스트 | `apps/mini-page/tests/feature.test.js` |
| route (root-relative-static) | `/apps/mini-page/index.html` |
| DOM id | `mini-root` (루트 컨테이너), `mini-submit` (주 실행 control) |
| CSS class | `mini` (루트), `mini__submit` (submit control) |
| 상태 | `idle` → `submitting` → `success` \| `error` |
| design token | `--color-action-primary: #2563eb`, `--space-control-gap: 12px` |
| 접근성 | `mini-submit` control은 명시적 `aria-label`을 가진다 |
| 접근성 | 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트·접근성 이름으로 노출한다 |
| 반응형 | 뷰포트 폭 320px 이상에서 content overflow가 발생하지 않는다 |

### 3.2 brix-cms (`app/mini/`)

| 항목 | 값 |
|------|-----|
| 라우트 페이지 | `app/mini/page.tsx` |
| 기능 컴포넌트 | `app/mini/mini-feature.tsx` |
| 단위 테스트 | `app/mini/mini-feature.test.tsx` |
| route (Next.js app-router) | `/mini` |
| DOM id | `mini-cms-root` (루트 컨테이너), `mini-cms-submit` (주 실행 control) |
| CSS class | `mini-cms` (루트), `mini-cms__submit` (submit control) |
| 상태 | `idle` → `submitting` → `success` \| `error` |
| design token | `--color-action-primary: #2563eb`, `--space-control-gap: 12px` |
| 접근성 | `mini-cms-submit` control은 명시적 `aria-label`을 가진다 |
| 접근성 | 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트·접근성 이름으로 노출한다 |
| 반응형 | 뷰포트 폭 320px 이상에서 content overflow가 발생하지 않는다 |

## 4. 상태 머신과 후조건 (두 repo 공통)

```
idle ──(submit)──▶ submitting ──▶ success
                         │
                         └──────▶ error
success | error ──(reset/취소/실패 복구)──▶ idle
```

- **idle**: 주 실행 control(`*-submit`) 사용 가능, 진행 표시 없음.
- **submitting**: 진행 표시 노출, 중복 제출 방지.
- **success**: 성공 상태를 텍스트+접근성 이름으로 노출.
- **error**: 실패 상태를 텍스트+접근성 이름으로 노출.
- **후조건 (frozen invariant)**: **초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값(idle)으로
  되돌리고, 주 실행 control을 다시 사용할 수 있어야 한다.**

## 5. 검증 (focused)

각 repo는 자기 module에 국한된 focused 단위 테스트만 실행한다. 다른 module 회귀는 이번 작업 범위 밖.

| repo | 테스트 파일 | 검증 대상 | evidence |
|------|-------------|-----------|----------|
| backend | `apps/mini-page/tests/feature.test.js` | 상태 전이(idle→submitting→success/error), 리셋 후조건 | `build_result`, `test_result` |
| brix-cms | `app/mini/mini-feature.test.tsx` | 상태 전이, 리셋 후조건, `aria-label`/상태 텍스트 노출 | `build_result`, `test_result` |

- backend: `npm test`는 표시용이며 신규 route의 full authority가 아니다. focused authority가
  `unavailable`이므로 developer는 신규 테스트 파일을 직접 실행해 상태 전이를 검증한다.

## 6. python producer 계약 제외 사유 (기록 필수)

- 이 작업의 UI 계약은 `backend`(vanilla-static)와 `brix-cms`(React) 두 repo만 producer/consumer로
  포함한다.
- **python은 base SHA의 bounded evidence에서 이 feature의 producer로 확정되지 않았다**
  (observed manifest는 `package.json`뿐이며 python 매니페스트·route·bounded test evidence 미확정).
- 따라서 python repo는 producer 계약에서 **의도적으로 제외**한다. 추측성 abstraction을 만들지 않으며,
  bounded evidence가 확정될 때 별도 packet으로 다룬다.

## 7. handoff 계약

- **producer**: planner (본 문서) — `docs/plans/BF-1790/implementation-plan.md`.
- **consumer**: `dev-backend`, `dev-brixcms` developer packet.
- **불변식**:
  1. developer는 승인된 본 실행 설계를 따른다.
  2. developer는 §3의 selector(DOM id/class)와 design token을 변경하거나 재정의하지 않는다.
  3. 6개 파일은 모두 `additive` — 파괴적 재작성 금지.
  4. 파일 소유권·상태 계약의 유일 권위는 frozen blueprint이며 본 문서는 이를 재정의하지 않는다.
  5. §4 리셋 후조건은 두 repo 모두에서 만족해야 한다.
- 후속 dispatch: dev PR 생성 → reviewer cascade → merge → tester cascade (시스템 자동).

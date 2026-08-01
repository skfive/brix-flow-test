# 실행 이력 필터 프리셋 — 구현 설계 (BF-1453 / plan: BF-1456)

## 1. 개요

실행 이력 화면에 상태 필터·페르소나 필터 조합을 이름 붙여 저장하고 재적용할 수 있는
"필터 프리셋" 기능을 추가한다. 저장소는 `localStorage` 이며, 외부 API·DB 변경은 없다.

본 문서는 designer(BF-1454)·developer(BF-1455)가 그대로 구현해야 하는 **frozen UI 계약**을
설명하는 기획 문서다. 아래 계약은 이 문서가 만든 것이 아니라 상위 Execution Blueprint에서
이미 동결된 값을 그대로 옮겨 적은 것이며, 이 문서는 selector·token·상태 텍스트를
재정의하지 않는다.

## 2. 산출물 및 소유자 (frozen — 변경 금지)

| 경로 | 소유 페르소나 | 비고 |
|---|---|---|
| `demo/run-filter-presets/index.html` | developer (BF-1455) | 엔트리 포인트, route: `/demo/run-filter-presets` |
| `demo/run-filter-presets/src/feature.js` | developer (BF-1455) | 프리셋 저장/적용 로직 |
| `docs/design/run-filter-presets-BF-1453.md` | designer (BF-1454) | 시각 명세·mockup |
| `docs/plans/run-filter-presets-BF-1453.md` | planner (본 문서, BF-1456) | 본 설계 문서 |

세 파일(`index.html`, `feature.js`, 설계 문서)은 모두 **additive** 정책이다 — 기존 파일을 대체하지 않고
새로 추가한다. planner는 이 표를 그대로 따르며 새 파일이나 새 역할을 추가하지 않는다.

## 3. UI 계약 (frozen — designer/developer 재정의 금지)

### 3.1 DOM ID
`preset-root`, `preset-name-input`, `preset-save-button`, `preset-reset-button`,
`preset-list`, `preset-status`

### 3.2 CSS class
`preset-panel`, `preset-panel__save`, `preset-panel__reset`, `preset-panel__item`

### 3.3 상태 모델 및 화면 텍스트 (`preset-status` 영역에 노출)

| 상태 | 화면 텍스트 |
|---|---|
| `idle` | 저장된 프리셋을 선택하거나 새로 저장하세요 |
| `saving` | 프리셋 저장 중… |
| `applied` | 프리셋이 적용되었습니다 |
| `empty` | 저장된 프리셋이 없습니다 |
| `error` | 프리셋 저장에 실패했습니다. 다시 시도하세요 |

전이 규칙: `idle → saving → (applied | error)`, 취소·실패 뒤에는 `idle`로 복귀하고
`preset-save-button`/`preset-reset-button`은 즉시 재사용 가능해야 한다. 저장된 프리셋이
0건이면 목록 영역은 `empty` 상태 텍스트를 노출한다.

### 3.4 디자인 토큰

- `--color-surface-dark: #0f172a`
- `--color-action-primary: #2563eb`
- `--color-text-primary: #e2e8f0`
- `--space-control-gap: 12px`

### 3.5 접근성

- `preset-save-button` → `aria-label="프리셋 저장"`
- `preset-reset-button` → `aria-label="필터 초기화"`
- `preset-list` 항목은 키보드 `Tab` 순회 및 `Enter` 키 적용을 지원한다.
- 모든 상태(3.3)는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름(`aria-live` 등)으로
  함께 노출한다.

### 3.6 반응형

- 360px 폭에서 콘텐츠 overflow가 발생하지 않는다.
- 데스크톱(≥1024px)과 360px 양쪽에서 `preset-panel` 레이아웃이 깨지지 않는다.

## 4. localStorage 데이터 스키마 (frozen 타입)

외부 API·DB는 변경하지 않는다. 프리셋은 브라우저 `localStorage`에만 저장한다.

```ts
// storage key
const RUN_FILTER_PRESETS_KEY = "runFilterPresets.v1";

// 저장 값: RunFilterPreset[] 를 JSON.stringify 하여 저장
interface RunFilterPreset {
  id: string;             // 프리셋 고유 식별자 (예: crypto.randomUUID())
  name: string;           // preset-name-input 입력값 (프리셋 이름)
  statusFilter: string[]; // 선택된 실행 상태 필터 값 목록
  personaFilter: string[];// 선택된 페르소나 필터 값 목록
  savedAt: string;        // 저장 시각, ISO-8601 문자열 (예: new Date().toISOString())
}
```

- `statusFilter`/`personaFilter`는 문자열 배열 타입으로만 동결한다. 구체적 값 집합(예: 성공/경고/실패,
  또는 planner/designer/developer/reviewer/tester)은 이 화면이 소비하는 실행 이력 데이터 소스의
  기존 상태·페르소나 표기를 그대로 재사용해야 하며, 이 문서가 새 값 집합을 발명하지 않는다.
- 프리셋 저장/삭제/적용은 모두 `RUN_FILTER_PRESETS_KEY` 하나의 배열을 읽고 다시 쓰는 방식으로
  구현한다 (개별 키 분산 저장 금지).
- 스키마 버전이 바뀌면 키 이름의 `.v1` 접미사를 올려 마이그레이션 없이 구버전 데이터를 무시한다
  (별도 마이그레이션 로직은 이번 범위에 포함하지 않는다).

## 5. 제약사항 / non-goals

- 서버 API, DB 스키마 변경 없음 — 프리셋은 클라이언트 `localStorage`에만 존재한다.
- 신규 파일·신규 역할 추가 금지. 위 2절 표에 없는 경로는 이번 Execution Blueprint 범위 밖이다.
- selector(§3.1~3.2)·상태 텍스트(§3.3)·토큰(§3.4)·접근성 이름(§3.5)은 designer/developer가
  구현 중 임의로 바꾸지 않는다. 변경이 필요하면 이 계획 문서의 후속 revision을 통해서만 갱신한다.

## 6. 완료 조건 / 검증

- 저장소 권위 검증 명령: `node --test demo/run-filter-presets/tests/*.test.js`
- 위 명령은 developer(BF-1455)가 만드는 구현과 tester(BF-1458)가 작성하는 회귀 테스트를
  대상으로 하며, 본 planner 문서 자체는 코드를 산출하지 않는다.

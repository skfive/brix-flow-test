# pixi-shooter 디자인 시스템 문서 (BF-1707)

## 0. 문서 성격 및 범위

- 본 문서는 `docs/plans/BF-1706/implementation-plan.md`에 기록된 frozen `ui-contract@v1`의 exact 값(컬러/타이포/레이아웃/DOM id·class/상태 구성/접근성)을 **재정의하지 않고 그대로 옮긴 뒤**, 구현에 필요한 시각·모션·화면 문구를 구체화한다.
- §2~§4, §7(구성 항목), §8(접근성 항목)의 굵게 표시된 **frozen** 값은 planner가 동결한 값과 정확히 일치해야 하며 designer/developer 모두 변경할 수 없다.
- §5(오브젝트 상세 형태), §6(모션), §7(전환 규칙·표시 문구), §9(dev 가이드)는 frozen 토큰에 없는 항목을 designer가 이번 task에서 새로 제안하는 값이며, 기존 frozen 토큰과 이름이 겹치지 않는 신규 네임스페이스(`--motion-*`)만 사용한다.
- 본 문서와 `pixi-shooter/README.md`만 이 작업의 산출물이며, 런타임 HTML/CSS/JS(및 시각 mockup HTML)는 생성하지 않는다. 실제 마크업·PixiJS 렌더링·시각 mockup 은 developer(BF-1708) 담당이다.

## 1. 시안 개요

- 게임 형태: PixiJS 기반 고정형(스크롤 없음) 세로 슈팅 게임. 플레이 영역 비율 `--layout-play-area-ratio: 9:16` 고정.
- 실행 방식: 별도 빌드 파이프라인 없이 정적 서버 + CDN PixiJS(ESM), `pixi-shooter/index.html`이 엔트리.
- UX 목표: 색상 하나에 의존하지 않는 이중 구분(형태+색), 과도한 연출 없이 반응성 위주의 피드백, 방향키+Space만으로 전체 플로우(시작~재시작) 조작 가능.
- 화면 구조: 상단 HUD(고정 64px) + 하단 플레이 영역(9:16 유지, 리사이즈 시 레터박스/중앙 정렬), 360px 이상 뷰포트에서 overflow 없이 표시.

## 2. 컬러 팔레트 (frozen — HEX, 재정의 금지)

| 토큰 | HEX | 용도 |
|---|---|---|
| `--color-bg-space` | `#05070f` | 배경(우주 공간), 오버레이 베이스 |
| `--color-player` | `#4fd1ff` | 플레이어 함선 |
| `--color-enemy-linear` | `#ff5470` | 직진형 적(삼각형) |
| `--color-enemy-zigzag` | `#ffb84f` | 지그재그형 적(마름모) |
| `--color-bullet-player` | `#e8fff3` | 플레이어 탄환 |
| `--color-bullet-enemy` | `#ff8080` | 적 탄환 |
| `--color-explosion` | `#ffd23f` | 폭발 이펙트 |
| `--color-hud-text` | `#f5f7ff` | HUD/메시지 텍스트 |

## 3. 타이포그래피 (frozen exact 값 + 보강 제안)

| 토큰 | 값 | 비고 |
|---|---|---|
| `--font-family-hud` | `'Segoe UI', system-ui, sans-serif` | frozen |
| `--font-size-score` | `20px` | frozen, HUD 점수 표시 |
| `--font-size-message` | `32px` | frozen, 상태 메시지(ready/paused/gameover) |

frozen 토큰에 weight/line-height는 없다. 아래는 designer 제안값(비-frozen, 신규 CSS 프로퍼티로만 사용하며 새 토큰명을 만들지 않음):

| 용도 | font-weight | line-height |
|---|---|---|
| 점수(`--font-size-score`) | 600 | 1.2 |
| 상태 메시지(`--font-size-message`) | 700 | 1.3 |
| 보조 안내 문구(조작 안내 등, 메시지보다 작게 표시 시 15~16px 권장) | 400 | 1.4 |

## 4. 레이아웃 (frozen exact 값)

| 토큰 | 값 |
|---|---|
| `--layout-hud-height` | `64px` |
| `--layout-play-area-ratio` | `9:16` |

- 구조: `.game-shell`(전체 컨테이너) = 상단 HUD 영역(고정 `--layout-hud-height`) + `.game-shell__canvas-wrap`(나머지 영역, `--layout-play-area-ratio` 유지, 뷰포트가 더 넓으면 좌우 레터박스 후 중앙 정렬).
- Breakpoint: 별도 breakpoint 단계 없음 — 360px 이상 모든 뷰포트에서 동일 비율 유지, HUD 높이는 고정(px), 플레이 영역만 비율 기준으로 스케일.
- DOM id(frozen): `game-root`, `game-canvas`
- CSS class(frozen): `game-shell`, `game-shell__canvas-wrap`

## 5. 게임 오브젝트 시각 명세

색상뿐 아니라 **형태**로도 구분한다(적 종류 접근성 요구사항).

| 오브젝트 | 형태 | 색상 | 크기(기준, 9:16 캔버스 기준 상대값) |
|---|---|---|---|
| 플레이어 함선 | 위를 향한 이등변삼각형 본체 + 좌우 소형 날개(작은 사다리꼴 2개)로 "함선" 실루엣 표현 | `--color-player` | 폭 32px × 높이 32px 내외 |
| 직진형 적 | 아래를 향한 정삼각형(꼭짓점이 진행 방향인 아래쪽) | `--color-enemy-linear` | 28px × 28px 내외 |
| 지그재그형 적 | 마름모(다이아몬드) | `--color-enemy-zigzag` | 28px × 28px 내외 |
| 플레이어 탄환 | 세로로 긴 캡슐/둥근 사각형 | `--color-bullet-player` | 4px × 12px 내외 |
| 적 탄환 | 원형 | `--color-bullet-enemy` | 6px 지름 내외 |
| 폭발 이펙트 | 중심에서 방사형으로 퍼지는 원형 파티클 군집 | `--color-explosion` | 파티클 개당 2~4px, §6 제한 참고 |

이동 패턴:
- 직진형 적: 스폰 위치에서 수직 하강만 수행(좌우 이동 없음).
- 지그재그형 적: 하강하면서 좌우로 주기적 방향 전환(지그재그 궤적)으로 직진형과 시각적으로도 구분.
- 플레이어 함선: 좌우 이동 시 진행 방향으로 최대 ±8° 정도의 미세한 기울임(과한 회전 지양, §6 과잉 연출 방지 기준 참조).

패럴랙스 배경(신규 제안, 새 색상 토큰을 만들지 않고 frozen `--color-bg-space`/`--color-hud-text` 알파 변형만 사용):

| 레이어 | 구성 | 스크롤 속도(상대) | 색상 |
|---|---|---|---|
| 베이스 | `--color-bg-space` 단색 배경 | 고정 | `--color-bg-space` |
| 원거리 별 레이어 | 작은 점(1px), 저밀도 | 0.2x | `--color-hud-text` alpha 0.25 |
| 근거리 별 레이어 | 중간 점(2px), 중밀도 | 0.5x | `--color-hud-text` alpha 0.5 |

- 패럴랙스는 배경 몰입감을 위한 장식 요소로, 게임 판정에는 영향을 주지 않는다. 레이어 수는 2개(원거리/근거리)로 제한해 성능·시각적 과잉을 방지한다.

## 6. 모션 명세 (신규 제안 — frozen 토큰 아님, `--motion-*` 네임스페이스로 추가)

| 이벤트 | 토큰(제안) | 지속시간 | 이징 | 설명 |
|---|---|---|---|---|
| 발사(fire) | `--motion-fire-duration` | 60ms | ease-out | 탄환 스폰 시 스케일 0.6→1.0 팝 |
| 피격(hit) | `--motion-hit-duration` | 120ms | ease-out | 피격 대상 흰색 플래시 오버레이 + 자체 흔들림(진폭 2px, 1회) |
| 폭발(explosion) | `--motion-explosion-duration` | 250ms | ease-out | 파티클 방사형 확산 후 알파 페이드아웃 |
| 적 등장(enemy spawn) | `--motion-spawn-duration` | 150ms | ease-out | 알파 페이드인 + 스케일 0.8→1.0 |
| 게임오버 전환(gameover transition) | `--motion-gameover-duration` | 400ms | ease-in-out | 전체 화면 디밍 오버레이 페이드인 + 결과 메시지 페이드인 |

과도한 연출 방지 기준:
1. 화면 전체를 흔드는 스크린 셰이크는 사용하지 않는다. 흔들림은 피격 대상 오브젝트 자체에만, 최대 진폭 2px, 1회성으로 제한한다.
2. 폭발 이펙트 파티클은 1회 폭발당 최대 8개로 제한한다(다중 동시 폭발 시에도 개별 폭발 단위로 8개 제한 유지).
3. 반복되는(loop) pulsing·blink 애니메이션은 사용하지 않는다 — 상태 텍스트를 포함한 모든 모션은 1회성 트랜지션으로 종료된다.
4. 동일 오브젝트에 대한 피격/폭발 이펙트는 이전 트랜지션이 끝난 뒤에만 재트리거한다(연속 피격 시 이펙트 누적·깜빡임 방지, debounce).
5. `fire`/`hit`/`spawn` 이펙트는 200ms 이내로 완료해 반응성을 해치지 않는다. `gameover` 전환만 예외적으로 400ms까지 허용한다.

## 7. 상태별 화면 구성, 표시 문구, 전환 규칙

### 7.1 화면 구성 (frozen 구성 + 표시 문구 추가)

| 상태 | 구성 | 표시 텍스트(신규 제안) |
|---|---|---|
| `ready` | 시작 대기 화면, 중앙 메시지(`--font-size-message`) | "스페이스바를 눌러 시작" (부제, 15~16px): "← → 이동 · Space 발사" |
| `playing` | 상단 HUD(`--layout-hud-height`) 점수(`--font-size-score`) + 상태 뱃지 + 하단 플레이 영역(9:16) | HUD: "SCORE {점수}" · 상태 뱃지: "PLAYING" |
| `paused` | 반투명 오버레이(`--color-bg-space` alpha 0.7) + 중앙 메시지 | "일시정지" (부제) "Space로 재개" |
| `gameover` | 반투명 오버레이 + 결과 메시지 | "GAME OVER" (부제) "SCORE {최종점수}" (부제) "Space로 재시작" |

- 모든 상태는 색상만으로 구분하지 않고, 위 표시 텍스트를 화면에 노출하는 동시에 접근성 이름(예: `role="status"` 요소의 텍스트/`aria-label`)으로도 동일한 상태명을 노출한다(§8 참조).

### 7.2 전환 규칙

| 전이 | 트리거 | 지속시간/이징 |
|---|---|---|
| `ready` → `playing` | Space keydown | 즉시 전환(연출 없음) |
| `playing` 중 발사 | Space keydown(반복) | §6 `--motion-fire-duration` (상태 전이 아님) |
| `playing` → `paused` | 창 포커스 상실(`blur`) 또는 탭 비활성(`visibilitychange` → hidden) | 즉시 전환(연출 없음) |
| `paused` → `playing` | Space keydown | 즉시 전환(연출 없음) |
| `playing` → `gameover` | 게임오버 조건 충족(플레이어 피격 소진 등, gameLogic 내부 규칙) | §6 `--motion-gameover-duration`(400ms, ease-in-out) |
| `gameover` → `ready`/`playing` 재시작 | Space keydown | 즉시 전환, 점수·진행 표시·스폰 타이머 초기값 복귀 |

- `playing → paused` 전이를 별도 키가 아닌 포커스 상실/탭 비활성으로 설계한 이유: 접근성 계약이 "방향키(이동)와 Space(발사)만으로 전체 플로우 조작"을 요구하며, `Space`는 이미 `playing` 상태에서 발사에 사용된다. 새 키를 추가하지 않고도 오조작(다른 창 작업 중 배경에서 게임 진행) 없이 일시정지를 보장하기 위한 결정이다. 재개는 frozen 요구대로 `Space`로 수행한다.

## 8. 접근성 기준 (frozen + 구체화)

- **형태 구분**: 직진형 적=삼각형, 지그재그형 적=마름모로 색상 외 형태로도 구분한다(§5).
- **WCAG AA 텍스트 대비**: HUD/메시지 텍스트 `--color-hud-text`(#f5f7ff) vs 배경 `--color-bg-space`(#05070f)의 상대휘도 기준 대비비는 약 **18.8:1**로 WCAG AA(4.5:1)와 AAA(7:1) 기준을 모두 충족한다.
- **키보드 전용 플레이**: 마우스/포인터 조작 없이 방향키(좌/우 이동)와 Space(시작/발사/재개/재시작)만으로 `ready → playing → paused → playing → gameover → ready` 전체 플로우를 조작할 수 있다. `paused` 진입만 예외적으로 포커스 상실 이벤트로 자동 트리거되며, 사용자의 키 입력을 추가로 요구하지 않는다.
- **상태명 노출**: 모든 상태는 화면 텍스트(§7.1)와 동일한 문자열을 접근성 이름으로도 노출한다. 예: 상태 표시 요소에 `role="status"`, `aria-live="polite"`를 부여하고 텍스트 콘텐츠를 상태 문구와 동일하게 유지한다.
- **반응형**: 360px 이상 뷰포트에서 `--layout-hud-height`(64px)와 `--layout-play-area-ratio`(9:16)를 유지한 채 HUD·플레이 영역이 잘리거나 overflow 없이 표시된다.

## 9. dev 구현 가이드 (developer 참조용, BF-1708)

1. CSS 변수는 frozen 토큰명을 그대로 `:root`(또는 `.game-shell`)에 선언한다. 토큰명·값을 변경하지 않는다.
2. 클래스명: frozen `.game-shell`, `.game-shell__canvas-wrap`은 그대로 사용. 추가 요소가 필요하면 BEM 하위 요소로 확장 권장 — `.game-shell__hud`, `.game-shell__hud-score`, `.game-shell__hud-status`, `.game-shell__overlay`, `.game-shell__overlay--paused`, `.game-shell__overlay--gameover`.
3. `game-root`/`game-canvas` id는 frozen 값 그대로 사용(`#game-root`가 `.game-shell` 컨테이너, `#game-canvas`가 PixiJS 캔버스 마운트 지점).
4. §5 오브젝트는 PixiJS `Graphics`로 벡터 드로잉(삼각형/마름모/원/캡슐)한다. 별도 스프라이트 에셋을 추가하지 않는다(CDN 외 의존성 금지 원칙 유지).
5. §6 모션은 PixiJS `ticker` 기반의 자체 lerp/tween으로 구현하고(외부 tween 라이브러리 추가 금지), 지속시간·이징은 §6 표의 값을 그대로 사용한다.
6. `playing → paused` 전이는 `main.js`에서 `document.addEventListener('visibilitychange', ...)`와 `window.addEventListener('blur', ...)`로 구현한다. `paused → playing` 복귀 시 해당 프레임의 `Space` keydown이 즉시 발사로 새지 않도록 재개 입력과 발사 입력을 분리 처리한다(예: 재개 직후 1프레임 발사 억제).
7. 상태 뱃지/메시지 요소에는 `role="status"`, `aria-live="polite"`를 부여하고 §7.1의 표시 문구를 텍스트 콘텐츠로 그대로 사용한다.
8. 발사 쿨다운, 게임오버 판정 조건 등 §6/§7에 명시되지 않은 세부 수치(ms 상수 등)는 `docs/plans/BF-1706/implementation-plan.md` §7(Edge Case)에 따라 developer가 `gameLogic.js` 내부 상수로 관리하고 본 문서 범위 밖으로 둔다.

## 10. mockup 참조

이번 작업(BF-1707)은 packet acceptance criteria에 따라 산출물 범위가 `pixi-shooter/docs/design.md`, `pixi-shooter/README.md`로 한정되며 런타임 HTML/CSS/JS(시각 mockup HTML 포함)를 생성하지 않는다. 별도 mockup HTML 파일은 작성하지 않았으며, 시각 구현은 위 §5~§9 명세를 기준으로 developer(BF-1708)가 PixiJS로 직접 구현한다.

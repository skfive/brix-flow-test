# Phaser Memory Match

4×4(8쌍) 카드를 뒤집어 짝을 맞추는 단일 플레이어 메모리 게임. 본 문서는 planner(BF-1726)가 동결한 UI·토큰·상태 계약의 **시각 명세**이며, developer(BF-1723)는 이 계약을 그대로 구현한다. selector·token 재정의 금지.

> frozen 계약 원문: [`docs/plans/BF-1715/implementation-plan.md`](../docs/plans/BF-1715/implementation-plan.md)
> 시각 산출물: [`docs/design/BF-1715/design-tokens.html`](../docs/design/BF-1715/design-tokens.html) · [`docs/design/BF-1715/design-mockup.html`](../docs/design/BF-1715/design-mockup.html)

## 실행

`serve_root = .`, root-relative-static. 저장소 루트에서 정적 서버로 연다.

```
# 예: 저장소 루트에서
python3 -m http.server 8000
# → http://localhost:8000/phaser-memory-match/index.html (게임)
# → http://localhost:8000/docs/design/BF-1715/design-tokens.html (토큰 시안)
# → http://localhost:8000/docs/design/BF-1715/design-mockup.html (화면 시안)
```

## 화면 상태

상태는 색상만으로 구분하지 않고 **상태명을 화면 텍스트와 접근성 이름으로** 노출한다.

| 상태 | 진입 조건 | 화면 텍스트(정확 값) | HUD |
| --- | --- | --- | --- |
| `start` | 최초 로드 / 리셋 직후 | `"카드를 뒤집어 짝을 맞추세요"` + 시작 라벨 `"게임 시작"` | `#hud-moves` = `"이동: 0"`, `#hud-timer` = `"시간: 00:00"` |
| `playing` | 시작 control 활성화 | 오버레이 없음, 4×4 격자 표시 | 이동/타이머 실시간 갱신 |
| `paused` | 일시정지 활성화 | `"일시정지"` | 타이머 정지, 마지막 값 유지 |
| `cleared` | 8쌍 모두 matched | `#clear-overlay` 내부 `"클리어! 총 {moves}회 이동, {mm:ss}"` | 최종 값 고정 |

전이: `start ─(시작)→ playing ─(일시정지)⇄(재개)─ paused`, `playing ─(8쌍 matched)→ cleared`, 어느 상태든 `다시 시작 → start`(이동 0 · 타이머 `00:00` 리셋, 주 실행 control 재사용 가능).

## DOM selector 계약 (frozen — 변경 금지)

**DOM ID**: `game-root`(캔버스 마운트 루트) · `hud-moves` · `hud-timer` · `restart-button` · `clear-overlay`
**CSS class**: `memory-match`(wrapper) · `hud` · `hud__stat` · `btn-restart` · `clear-screen`

## 디자인 토큰 계약 (frozen — 정확 값)

CSS custom property로 선언한다. 시각 정의는 `design-tokens.html` 참조.

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-bg` | `#1a1a2e` | 배경 |
| `--color-card-back` | `#16213e` | 카드 뒷면 |
| `--color-card-face` | `#e94560` | 카드 앞면 |
| `--color-accent` | `#0f3460` | 강조/테두리 |
| `--color-text` | `#f5f5f5` | 텍스트 |
| `--space-card-gap` | `12px` | 카드 간격 |
| `--radius-card` | `8px` | 카드 반경 |
| `--font-size-hud` | `18px` | HUD 지표 크기 |

## 접근성 계약

- `#restart-button` 은 명시적 `aria-label="게임 다시 시작"` 을 가진다.
- 카드 요소는 키보드로 포커스·활성화 가능하며(`tabindex`, `Enter`/`Space`), 뒤집힘·일치·클리어 등 상태 변화가 텍스트로 안내된다(`aria-live` 영역 또는 상태 텍스트 갱신).
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

## 반응형 계약

- **≥ 320px (base)**: 4×4 격자와 HUD가 content overflow 없이 배치된다. 카드 간격은 `--space-card-gap`.
- **≥ 768px (desktop)**: 4×4 구조·selector 유지한 채 확대.
- 캔버스(`#game-root`)는 뷰포트 폭에 맞춰 **종횡비를 유지하며 스케일링**한다(4×4 → 1:1). Phaser Scale Manager `FIT` + `autoCenter` 권장, 왜곡·잘림 없음.

## 게임 로직 (developer 소유 — 순수 함수)

`src/logic.js` 는 Phaser/DOM 을 import 하지 않는 순수 함수 계층이며, 무작위 셔플은 **주입 가능한 시드로 결정적**이다. `src/game.js` 는 렌더링·입력만 담당하고 상태 전이는 `logic.js` 를 호출한다.

시그니처: `createSeededRng(seed)` · `buildDeck(pairCount?)` · `shuffle(deck, rng)` · `createInitialState({pairCount?, seed})` · `flipCard(state, cardIndex)` · `resolveTurn(state)` · `isCleared(state)` · `resetGame(state, {seed?}?)` · `formatTime(totalSeconds)`. 상세는 계약 원문 §7 참조.

## 파일 소유권 (additive)

| 파일 | 소유자 |
| --- | --- |
| `docs/design/BF-1715/design-tokens.html` · `design-mockup.html` · `phaser-memory-match/README.md` | designer |
| `phaser-memory-match/index.html` · `src/game.js` · `src/logic.js` · `tests/logic.test.js` | developer |

모든 파일은 신규 생성(additive)이며 무관 코드/파일을 수정·삭제하지 않는다.

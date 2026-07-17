/* BF-937 · Simon Says 순수 상태 전이 로직 (시작·시퀀스 확장·입력 판정·라운드 증가·오답 종료)
 * 디자인 SSOT: docs/design/simon-says-BF-936.md §5 (상태·라운드·패드 계약)
 * file:// CORS 안전 — ES module / 네트워크 요청 / 외부 CDN / 영속 저장 0건.
 * UMD 패턴 — 브라우저: globalThis.SimonLogic, Node: module.exports (node --test 대상)
 * module: simon-says
 *
 * 상태(state) 는 불변으로 다룬다. 모든 전이 함수는 새 객체를 반환하며 입력을 변형하지 않는다.
 *   status: "idle"     — 시작 전 대기
 *           "watch"    — 컴퓨터가 시퀀스를 재생 중 (입력 잠금)
 *           "input"    — 플레이어 입력 대기
 *           "gameover" — 오답으로 종료 (재시작 가능)
 *   sequence: 정답 패드 배열 (길이 = round)
 *   round: 현재 라운드 (= sequence.length, idle 은 0)
 *   inputIndex: 현재 플레이어가 맞춰야 할 sequence 위치
 *   lastPad: 마지막으로 처리한 입력 패드 (렌더 피드백용, 없으면 null)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SimonLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ── 상수 (design §2.2 · §5.1) ───────────────────────────
  // 인덱스 = 숫자키(1~4)-1, 위치: green=좌상, red=우상, yellow=좌하, blue=우하.
  var PADS = ["green", "red", "yellow", "blue"];

  var STATUS = {
    IDLE: "idle",
    WATCH: "watch",
    INPUT: "input",
    GAMEOVER: "gameover",
  };

  // ── 내부 유틸 ───────────────────────────────────────────
  // rand: () => [0,1) 주입 → 결정론 테스트 가능. 미주입 시 Math.random.
  function resolveRand(rand) {
    return typeof rand === "function" ? rand : Math.random;
  }

  // 무작위 패드 1개 선택. r()===1(경계) 이어도 인덱스 초과하지 않도록 방어.
  function randomPad(rand) {
    var r = resolveRand(rand);
    var idx = Math.floor(r() * PADS.length);
    if (idx < 0) idx = 0;
    if (idx >= PADS.length) idx = PADS.length - 1;
    return PADS[idx];
  }

  // ── 초기 상태 ───────────────────────────────────────────
  function createInitialState() {
    return {
      status: STATUS.IDLE,
      sequence: [],
      round: 0,
      inputIndex: 0,
      lastPad: null,
    };
  }

  // ── 게임 시작 / 재시작 (idle·gameover → watch) ──────────
  // 첫 시퀀스 1개를 생성하고 라운드 1 로 초기화. 어떤 상태에서 호출해도 새 게임으로 리셋.
  function startGame(state, rand) {
    var seq = [randomPad(rand)];
    return {
      status: STATUS.WATCH,
      sequence: seq,
      round: 1,
      inputIndex: 0,
      lastPad: null,
    };
  }

  // ── 재생 완료 → 입력 대기 진입 (watch → input) ──────────
  // DOM 타이머가 시퀀스 재생을 끝내면 호출. watch 가 아니면 무시(원본 반환).
  function beginInput(state) {
    if (state.status !== STATUS.WATCH) return state;
    return {
      status: STATUS.INPUT,
      sequence: state.sequence.slice(),
      round: state.round,
      inputIndex: 0,
      lastPad: null,
    };
  }

  // ── 핵심: 플레이어 패드 입력 처리 (AC1 · AC2) ───────────
  // input 상태에서만 유효. 그 외 상태에서는 입력을 무시하고 원본 반환.
  //   · 오답            → gameover 전이 (AC2)
  //   · 시퀀스 미완 정답 → inputIndex 전진, input 유지
  //   · 시퀀스 완주 정답 → round +1, 시퀀스 1개 확장, watch 복귀 (AC1)
  function handleInput(state, pad, rand) {
    if (state.status !== STATUS.INPUT) return state;

    var expected = state.sequence[state.inputIndex];

    // AC2: 오답 → 종료 (라운드·시퀀스 보존, 재시작은 startGame 으로)
    if (pad !== expected) {
      return {
        status: STATUS.GAMEOVER,
        sequence: state.sequence.slice(),
        round: state.round,
        inputIndex: state.inputIndex,
        lastPad: pad,
      };
    }

    var nextIndex = state.inputIndex + 1;

    // 아직 시퀀스가 남음 → 다음 입력 대기
    if (nextIndex < state.sequence.length) {
      return {
        status: STATUS.INPUT,
        sequence: state.sequence.slice(),
        round: state.round,
        inputIndex: nextIndex,
        lastPad: pad,
      };
    }

    // AC1: 현재 라운드 시퀀스 전부 정답 → 라운드 증가 + 시퀀스 확장 + 재생 대기
    var nextSeq = state.sequence.concat([randomPad(rand)]);
    return {
      status: STATUS.WATCH,
      sequence: nextSeq,
      round: state.round + 1,
      inputIndex: 0,
      lastPad: pad,
    };
  }

  return {
    // 상수
    PADS: PADS,
    STATUS: STATUS,
    // 순수 함수
    randomPad: randomPad,
    createInitialState: createInitialState,
    startGame: startGame,
    beginInput: beginInput,
    handleInput: handleInput,
  };
});

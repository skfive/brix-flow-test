/* BF-983 · 컬러 스위치 반응 게임 순수 상태 전이 로직
 * 디자인 SSOT: docs/design/color-switch-BF-979.md §1.1 간섭 규칙 · §5 컴포넌트 · §6 dev 가이드
 * file:// CORS 안전 — ES module / 네트워크 요청 / 외부 CDN / 영속 저장 0건 (상태는 메모리 전용).
 * UMD 패턴 — 브라우저: globalThis.ColorSwitchLogic, Node: module.exports (node --test 대상)
 * module: color-switch
 *
 * 상태(state) 는 불변으로 다룬다. 모든 전이 함수는 새 객체를 반환하며 입력을 변형하지 않는다.
 *   status: "idle"     — 시작 전 대기
 *           "playing"  — 진행 중 (라운드 응답 대기)
 *           "gameover" — 시간 종료 (재시작 가능)
 *   round: { rule:'ink'|'word', word:색, ink:색 } — 현재 자극. idle/gameover 는 null.
 *   locked: 응답 판정 직후 true (다음 라운드 진입 전까지 입력 잠금)
 *   score/streak/bestStreak — 점수·연속 정답·최고 연속
 *   timeLeft — 남은 시간(초). tick() 으로 감소, 0 이면 gameover.
 *   lastResult/lastGained/lastAnswer/correctAnswer — 직전 판정 피드백용
 *   totalAnswers/correctCount — 정답률 집계용
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.ColorSwitchLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ── 상수 (design §2.2 · §4.1) ───────────────────────────
  // 인덱스 = 숫자키(1~4)-1. 응답 버튼 순서: red=1, green=2, yellow=3, blue=4 (2×2 사분면).
  var COLORS = ["red", "green", "yellow", "blue"];
  // 규칙: ink=글자 색(🎨), word=글자 뜻(💬). design §1.1 간섭 규칙 표.
  var RULES = ["ink", "word"];

  var STATUS = {
    IDLE: "idle",
    PLAYING: "playing",
    GAMEOVER: "gameover",
  };

  // ── 게임 파라미터 (design §8.4 F2 — dev 결정 범위) ───────
  var ROUND_TIME = 30; // 제한 시간(초)
  var BASE_SCORE = 50; // 정답 기본 점수
  var MAX_SPEED_BONUS = 50; // 반응속도 보너스 최대치
  var SPEED_WINDOW_MS = 2000; // 이 시간 내 응답 시 보너스 부여(0ms=최대, 2000ms+=0)

  // ── 내부 유틸 ───────────────────────────────────────────
  // rand: () => [0,1) 주입 → 결정론 테스트 가능. 미주입 시 Math.random.
  function resolveRand(rand) {
    return typeof rand === "function" ? rand : Math.random;
  }

  // [0, n) 범위 무작위 정수. r()===1(경계) 이어도 초과하지 않도록 방어.
  function randInt(rand, n) {
    var idx = Math.floor(resolveRand(rand)() * n);
    if (idx < 0) idx = 0;
    if (idx >= n) idx = n - 1;
    return idx;
  }

  // ── 라운드(자극) 생성 (design §1.1 · §5.3) ──────────────
  // rand 소비 순서: rule → word → ink. word 와 ink 는 독립 → Stroop 간섭 유지(같을 수도 다를 수도).
  function generateRound(rand) {
    var r = resolveRand(rand);
    var rule = RULES[randInt(r, RULES.length)];
    var word = COLORS[randInt(r, COLORS.length)];
    var ink = COLORS[randInt(r, COLORS.length)];
    return { rule: rule, word: word, ink: ink };
  }

  // 규칙별 정답 색: ink=글자 색(잉크), word=글자 뜻(단어).
  function getCorrectAnswer(round) {
    if (!round) return null;
    return round.rule === "ink" ? round.ink : round.word;
  }

  // 반응속도 보너스: 빠를수록 큼. SPEED_WINDOW_MS 이내 선형, 이후 0.
  function speedBonus(elapsedMs) {
    var ms = typeof elapsedMs === "number" && elapsedMs >= 0 ? elapsedMs : SPEED_WINDOW_MS;
    var ratio = (SPEED_WINDOW_MS - ms) / SPEED_WINDOW_MS;
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;
    return Math.round(ratio * MAX_SPEED_BONUS);
  }

  // ── 초기 상태 ───────────────────────────────────────────
  function createInitialState() {
    return {
      status: STATUS.IDLE,
      round: null,
      locked: false,
      score: 0,
      streak: 0,
      bestStreak: 0,
      timeLeft: ROUND_TIME,
      lastResult: null,
      lastGained: 0,
      lastAnswer: null,
      correctAnswer: null,
      totalAnswers: 0,
      correctCount: 0,
    };
  }

  // ── 게임 시작 / 재시작 (idle·gameover → playing) ────────
  // 어떤 상태에서 호출해도 새 게임으로 리셋하고 첫 라운드를 생성한다.
  function startGame(state, rand) {
    return {
      status: STATUS.PLAYING,
      round: generateRound(rand),
      locked: false,
      score: 0,
      streak: 0,
      bestStreak: 0,
      timeLeft: ROUND_TIME,
      lastResult: null,
      lastGained: 0,
      lastAnswer: null,
      correctAnswer: null,
      totalAnswers: 0,
      correctCount: 0,
    };
  }

  // ── 핵심: 응답 판정 (AC1 정답 · AC2 오답) ────────────────
  // playing 이고 locked 가 아닐 때만 유효. 그 외에는 입력 무시(원본 반환).
  // 판정 후 locked=true 로 잠그고 라운드는 그대로 유지(피드백 표시용) — nextRound 로 전진.
  function answer(state, color, elapsedMs, rand) {
    if (state.status !== STATUS.PLAYING || state.locked) return state;

    var correct = getCorrectAnswer(state.round);
    var isCorrect = color === correct;
    var gained = isCorrect ? BASE_SCORE + speedBonus(elapsedMs) : 0;
    var nextStreak = isCorrect ? state.streak + 1 : 0;
    var nextBest = nextStreak > state.bestStreak ? nextStreak : state.bestStreak;

    return {
      status: state.status,
      round: state.round,
      locked: true,
      score: state.score + gained,
      streak: nextStreak,
      bestStreak: nextBest,
      timeLeft: state.timeLeft,
      lastResult: isCorrect ? "correct" : "wrong",
      lastGained: gained,
      lastAnswer: color,
      correctAnswer: correct,
      totalAnswers: state.totalAnswers + 1,
      correctCount: state.correctCount + (isCorrect ? 1 : 0),
    };
  }

  // ── 다음 라운드 진입 (locked → 해제 + 새 자극) ───────────
  // 판정 후 피드백 표시가 끝나면 호출. locked 가 아니면 무시.
  function nextRound(state, rand) {
    if (state.status !== STATUS.PLAYING || !state.locked) return state;
    return {
      status: state.status,
      round: generateRound(rand),
      locked: false,
      score: state.score,
      streak: state.streak,
      bestStreak: state.bestStreak,
      timeLeft: state.timeLeft,
      lastResult: null,
      lastGained: 0,
      lastAnswer: null,
      correctAnswer: null,
      totalAnswers: state.totalAnswers,
      correctCount: state.correctCount,
    };
  }

  // ── 시간 카운트다운 (playing 에서만, 0 도달 시 gameover) ──
  function tick(state) {
    if (state.status !== STATUS.PLAYING) return state;
    var nextTime = state.timeLeft - 1;
    if (nextTime <= 0) {
      return {
        status: STATUS.GAMEOVER,
        round: state.round,
        locked: true,
        score: state.score,
        streak: state.streak,
        bestStreak: state.bestStreak,
        timeLeft: 0,
        lastResult: state.lastResult,
        lastGained: state.lastGained,
        lastAnswer: state.lastAnswer,
        correctAnswer: state.correctAnswer,
        totalAnswers: state.totalAnswers,
        correctCount: state.correctCount,
      };
    }
    return {
      status: state.status,
      round: state.round,
      locked: state.locked,
      score: state.score,
      streak: state.streak,
      bestStreak: state.bestStreak,
      timeLeft: nextTime,
      lastResult: state.lastResult,
      lastGained: state.lastGained,
      lastAnswer: state.lastAnswer,
      correctAnswer: state.correctAnswer,
      totalAnswers: state.totalAnswers,
      correctCount: state.correctCount,
    };
  }

  // ── 정답률(%) — 응답 0 건이면 0 ─────────────────────────
  function accuracy(state) {
    if (!state.totalAnswers) return 0;
    return Math.round((state.correctCount / state.totalAnswers) * 100);
  }

  // ── mm:ss 포맷 (design §5.1 HUD 시간 표시) ───────────────
  function formatTime(seconds) {
    var s = seconds < 0 ? 0 : seconds;
    var m = Math.floor(s / 60);
    var rest = s % 60;
    return m + ":" + (rest < 10 ? "0" + rest : "" + rest);
  }

  return {
    // 상수
    COLORS: COLORS,
    RULES: RULES,
    STATUS: STATUS,
    ROUND_TIME: ROUND_TIME,
    BASE_SCORE: BASE_SCORE,
    MAX_SPEED_BONUS: MAX_SPEED_BONUS,
    SPEED_WINDOW_MS: SPEED_WINDOW_MS,
    // 순수 함수
    generateRound: generateRound,
    getCorrectAnswer: getCorrectAnswer,
    speedBonus: speedBonus,
    createInitialState: createInitialState,
    startGame: startGame,
    answer: answer,
    nextRound: nextRound,
    tick: tick,
    accuracy: accuracy,
    formatTime: formatTime,
  };
});

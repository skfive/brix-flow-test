/* BF-983 · 컬러 스위치 반응 게임 DOM 바인딩·타이머·입력·렌더
 * 디자인 SSOT: docs/design/color-switch-BF-979.md §5 컴포넌트 · §6 dev 가이드
 * 순수 로직(logic.js ColorSwitchLogic)과 분리 — 여기서는 state 를 들고 렌더/타이머/입력만 담당.
 * 상태는 메모리 전용(영속 저장 없음, 외부 API 없음). file:// CORS 안전 — IIFE 전역 함수.
 * module: color-switch
 */
(function () {
  "use strict";

  var L = globalThis.ColorSwitchLogic;
  if (!L) return; // logic.js 로드 실패 방어 (정상 흐름에서는 발생하지 않음)

  // ── 색상 표시 메타 (라벨·도형 이름) ─────────────────────
  var LABEL = { red: "빨강", green: "초록", yellow: "노랑", blue: "파랑" };
  var SHAPE = { red: "원", green: "삼각형", yellow: "사각형", blue: "마름모" };
  var RULE_META = {
    ink: { icon: "🎨", key: "글자 색", trap: "뜻" },
    word: { icon: "💬", key: "글자 뜻", trap: "잉크" },
  };

  // ── 타이밍 ──────────────────────────────────────────────
  var FEEDBACK_MS = 850; // 판정 피드백 표시 후 다음 라운드로 전진
  var TICK_MS = 1000; // 카운트다운 간격

  var prefersReducedMotion =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── DOM 참조 ────────────────────────────────────────────
  var scoreEl = document.querySelector('[data-role="score"]');
  var streakEl = document.querySelector('[data-role="streak"]');
  var timeEl = document.querySelector('[data-role="time"]');
  var ruleBannerEl = document.querySelector(".rule-banner");
  var ruleIconEl = document.querySelector('[data-role="rule-icon"]');
  var ruleTextEl = document.querySelector('[data-role="rule-text"]');
  var stimulusEl = document.querySelector('[data-role="stimulus"]');
  var stimulusWordEl = document.querySelector('[data-role="stimulus-word"]');
  var feedbackEl = document.querySelector('[data-role="feedback"]');
  var answerGridEl = document.querySelector('[data-role="answer-grid"]');
  var btnStart = document.getElementById("btn-start");
  var btnRestart = document.getElementById("btn-restart");

  var answerBtns = {};
  var btnEls = document.querySelectorAll(".answer-btn");
  for (var i = 0; i < btnEls.length; i++) {
    answerBtns[btnEls[i].getAttribute("data-color")] = btnEls[i];
  }

  // ── 런타임 상태 ─────────────────────────────────────────
  var state = L.createInitialState();
  var rand = Math.random;
  var roundStartTs = 0; // 라운드 자극 표시 시각(반응시간 측정 기준)
  var feedbackTimer = null;
  var tickTimer = null;
  var prevRule = null; // 규칙 전환 감지용

  function now() {
    return typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  }

  // ── 마커 도형 span 생성 ─────────────────────────────────
  function markSpan(color, cls) {
    var span = document.createElement("span");
    span.className = (cls ? cls + " " : "") + "mark mark--" + color;
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  // ── 렌더: HUD ───────────────────────────────────────────
  function pop(el) {
    if (!el || prefersReducedMotion) return;
    el.classList.remove("is-pop");
    // 강제 리플로우로 애니메이션 재시작
    void el.offsetWidth;
    el.classList.add("is-pop");
  }

  function renderHud(animate) {
    if (scoreEl) scoreEl.textContent = String(state.score);
    if (streakEl) streakEl.textContent = String(state.streak);
    if (timeEl) timeEl.textContent = L.formatTime(state.timeLeft);
    if (animate) {
      pop(scoreEl);
      pop(streakEl);
    }
  }

  // ── 렌더: 규칙 배너 ─────────────────────────────────────
  function renderRule() {
    var round = state.round;
    if (!round) {
      ruleBannerEl.setAttribute("data-rule", "idle");
      ruleIconEl.textContent = "🎮";
      ruleTextEl.textContent = "시작을 눌러 주세요";
      return;
    }
    var meta = RULE_META[round.rule];
    var switched = prevRule !== null && prevRule !== round.rule;
    ruleBannerEl.setAttribute("data-rule", round.rule);
    ruleIconEl.textContent = meta.icon;
    // 규칙 전환 시 "규칙 전환!" 접두 (design §5.2)
    ruleTextEl.innerHTML = (switched ? "규칙 전환! " : "이번엔 ") +
      '<span class="rule-banner__key">' + meta.key + "</span> 을 고르세요";
    if (switched && !prefersReducedMotion) {
      ruleBannerEl.classList.remove("is-switch");
      void ruleBannerEl.offsetWidth;
      ruleBannerEl.classList.add("is-switch");
    }
    prevRule = round.rule;
  }

  // ── 렌더: 자극 존 ───────────────────────────────────────
  function renderStimulus() {
    var round = state.round;
    stimulusEl.classList.remove("is-correct", "is-wrong");
    stimulusWordEl.style.color = "";
    stimulusWordEl.className = "stimulus__word";
    stimulusWordEl.innerHTML = "";
    if (!round) {
      stimulusWordEl.style.color = "var(--color-text-muted)";
      stimulusWordEl.textContent = "준비";
      return;
    }
    // 뜻=단어 문자열, 잉크=색(글자색+도형). 간섭 유지.
    stimulusWordEl.classList.add("ink-" + round.ink);
    stimulusWordEl.appendChild(markSpan(round.ink, "stimulus__mark"));
    stimulusWordEl.appendChild(document.createTextNode(LABEL[round.word]));
  }

  // ── 렌더: 피드백 라인 ───────────────────────────────────
  function renderIdleFeedback() {
    feedbackEl.className = "feedback feedback--idle";
    if (state.status === "playing" && state.round) {
      var meta = RULE_META[state.round.rule];
      var target = state.round.rule === "ink" ? LABEL[state.round.ink] : LABEL[state.round.word];
      feedbackEl.innerHTML = "글자의 <strong>" + meta.key.replace("글자 ", "") +
        "</strong>(" + target + ")을 고르세요 — " + meta.trap + "에 속지 마세요";
    } else {
      feedbackEl.textContent = "규칙에 맞는 색을 빠르게 고르세요";
    }
  }

  function renderResultFeedback() {
    feedbackEl.innerHTML = "";
    if (state.lastResult === "correct") {
      feedbackEl.className = "feedback feedback--ok";
      var okIcon = document.createElement("span");
      okIcon.className = "feedback__icon";
      okIcon.setAttribute("aria-hidden", "true");
      okIcon.textContent = "✓";
      feedbackEl.appendChild(okIcon);
      feedbackEl.appendChild(document.createTextNode("정답 "));
      var gain = document.createElement("span");
      gain.className = "feedback__gain";
      gain.textContent = "+" + state.lastGained;
      feedbackEl.appendChild(gain);
    } else {
      feedbackEl.className = "feedback feedback--ng";
      var ngIcon = document.createElement("span");
      ngIcon.className = "feedback__icon";
      ngIcon.setAttribute("aria-hidden", "true");
      ngIcon.textContent = "✗";
      feedbackEl.appendChild(ngIcon);
      feedbackEl.appendChild(document.createTextNode("오답 "));
      var hint = document.createElement("span");
      hint.className = "feedback__hint";
      hint.appendChild(document.createTextNode("정답: "));
      hint.appendChild(markSpan(state.correctAnswer));
      hint.appendChild(document.createTextNode(" " + LABEL[state.correctAnswer]));
      feedbackEl.appendChild(hint);
    }
  }

  // ── 렌더: 응답 버튼 상태 ────────────────────────────────
  function clearBtnResults() {
    for (var c in answerBtns) {
      var el = answerBtns[c];
      el.classList.remove("is-correct", "is-wrong");
      var badge = el.querySelector(".answer-btn__badge");
      if (badge) badge.parentNode.removeChild(badge);
    }
  }

  function addBadge(el, kind, symbol) {
    var badge = document.createElement("span");
    badge.className = "answer-btn__badge answer-btn__badge--" + kind;
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = symbol;
    el.appendChild(badge);
  }

  function renderAnswerResult() {
    clearBtnResults();
    var correctBtn = answerBtns[state.correctAnswer];
    if (correctBtn) {
      correctBtn.classList.add("is-correct");
      addBadge(correctBtn, "ok", "✓");
    }
    if (state.lastResult === "wrong") {
      var chosen = answerBtns[state.lastAnswer];
      if (chosen && state.lastAnswer !== state.correctAnswer) {
        chosen.classList.add("is-wrong");
        addBadge(chosen, "ng", "✗");
      }
    }
  }

  // ── 입력 잠금/해제 ──────────────────────────────────────
  function setAnswersEnabled(enabled) {
    answerGridEl.setAttribute("aria-disabled", enabled ? "false" : "true");
    for (var c in answerBtns) {
      if (enabled) answerBtns[c].removeAttribute("aria-disabled");
      else answerBtns[c].setAttribute("aria-disabled", "true");
    }
  }

  // ── 전체 렌더 (라운드 대기 화면) ────────────────────────
  function renderPlayingRound(animateSwitch) {
    renderHud(false);
    renderRule();
    renderStimulus();
    renderIdleFeedback();
    clearBtnResults();
    setAnswersEnabled(true);
    roundStartTs = now();
  }

  // ── 컨트롤 활성/비활성 ──────────────────────────────────
  function syncControls() {
    var playing = state.status === "playing";
    btnStart.disabled = playing;
    btnRestart.disabled = !(playing || state.status === "gameover");
  }

  // ── 게임 시작 ───────────────────────────────────────────
  function start() {
    clearTimers();
    prevRule = null;
    state = L.startGame(state, rand);
    removeGameover();
    renderPlayingRound(false);
    syncControls();
    startTick();
  }

  // ── 응답 처리 ───────────────────────────────────────────
  function submitAnswer(color) {
    if (state.status !== "playing" || state.locked) return;
    var elapsed = now() - roundStartTs;
    state = L.answer(state, color, elapsed, rand);

    // 결과 렌더
    renderHud(state.lastResult === "correct");
    stimulusEl.classList.add(state.lastResult === "correct" ? "is-correct" : "is-wrong");
    renderResultFeedback();
    renderAnswerResult();
    setAnswersEnabled(false);

    // 피드백 표시 후 다음 라운드
    feedbackTimer = setTimeout(advanceRound, FEEDBACK_MS);
  }

  function advanceRound() {
    if (state.status !== "playing") return;
    state = L.nextRound(state, rand);
    renderPlayingRound(true);
  }

  // ── 카운트다운 ──────────────────────────────────────────
  function startTick() {
    tickTimer = setInterval(function () {
      state = L.tick(state);
      if (timeEl) timeEl.textContent = L.formatTime(state.timeLeft);
      if (state.status === "gameover") {
        endGame();
      }
    }, TICK_MS);
  }

  function clearTimers() {
    if (feedbackTimer) { clearTimeout(feedbackTimer); feedbackTimer = null; }
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }

  // ── 게임오버 ────────────────────────────────────────────
  function endGame() {
    clearTimers();
    setAnswersEnabled(false);
    renderHud(false);
    renderGameover();
    syncControls();
  }

  function renderGameover() {
    removeGameover();
    var over = document.createElement("div");
    over.className = "gameover";
    over.setAttribute("role", "status");
    over.setAttribute("aria-live", "polite");
    over.setAttribute("data-role", "gameover");

    var title = document.createElement("p");
    title.className = "gameover__title";
    title.textContent = "⏱ 시간 종료!";
    over.appendChild(title);

    var stats = document.createElement("div");
    stats.className = "gameover__stats";
    stats.appendChild(statBlock(String(state.score), "최종 점수"));
    stats.appendChild(statBlock(String(state.bestStreak), "최고 연속"));
    stats.appendChild(statBlock(L.accuracy(state) + "%", "정답률"));
    over.appendChild(stats);

    var cta = document.createElement("button");
    cta.className = "btn btn--cta";
    cta.type = "button";
    cta.style.maxWidth = "200px";
    cta.textContent = "다시하기";
    cta.addEventListener("click", start);
    over.appendChild(cta);

    // 자극 존을 결과 요약으로 대체
    stimulusEl.style.display = "none";
    stimulusEl.parentNode.insertBefore(over, stimulusEl.nextSibling);
  }

  function statBlock(value, label) {
    var block = document.createElement("div");
    block.className = "gameover__stat";
    var b = document.createElement("b");
    b.textContent = value;
    var span = document.createElement("span");
    span.textContent = label;
    block.appendChild(b);
    block.appendChild(span);
    return block;
  }

  function removeGameover() {
    var existing = document.querySelector('[data-role="gameover"]');
    if (existing) existing.parentNode.removeChild(existing);
    stimulusEl.style.display = "";
  }

  // ── 이벤트 바인딩 ───────────────────────────────────────
  for (var color in answerBtns) {
    (function (c) {
      answerBtns[c].addEventListener("click", function () {
        submitAnswer(c);
      });
    })(color);
  }

  btnStart.addEventListener("click", start);
  btnRestart.addEventListener("click", start);

  // 키보드: 숫자키 1~4 → 해당 색 응답 (design §6-7)
  var KEY_TO_COLOR = { 1: "red", 2: "green", 3: "yellow", 4: "blue" };
  document.addEventListener("keydown", function (ev) {
    var color = KEY_TO_COLOR[ev.key];
    if (color && state.status === "playing" && !state.locked) {
      ev.preventDefault();
      submitAnswer(color);
    }
  });

  // ── 초기 렌더 ───────────────────────────────────────────
  renderHud(false);
  renderRule();
  renderStimulus();
  syncControls();
})();

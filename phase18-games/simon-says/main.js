/* BF-937 · Simon Says DOM 바인딩·시퀀스 재생·입력·라운드 렌더
 * 디자인 SSOT: docs/design/simon-says-BF-936.md §5 컴포넌트 · §5.6 접근성 · §5.7 모션
 * 순수 로직(logic.js SimonLogic)과 분리 — 여기서는 state 를 들고 렌더/타이머/입력만 담당.
 * file:// CORS 안전 — ES module / fetch / 외부 CDN 0건. IIFE 전역 함수.
 */
(function () {
  "use strict";

  var L = globalThis.SimonLogic;
  if (!L) return; // logic.js 로드 실패 방어 (정상 흐름에서는 발생하지 않음)

  // ── DOM 참조 ────────────────────────────────────────────
  var statusEl = document.querySelector(".status");
  var roundValueEl = document.querySelector('[data-role="round"]');
  var roundBadgeEl = document.querySelector(".round-badge");
  var btnStart = document.getElementById("btn-start");
  var btnRestart = document.getElementById("btn-restart");
  var appEl = document.querySelector(".simon-app");
  var pads = {};
  var padEls = document.querySelectorAll(".pad");
  for (var i = 0; i < padEls.length; i++) {
    pads[padEls[i].getAttribute("data-pad")] = padEls[i];
  }

  // ── 재생 타이밍 (design §5.7 — 500ms on / 200ms off) ────
  var LIT_ON_MS = 480;
  var LIT_OFF_MS = 200;
  var FEEDBACK_MS = 220; // 플레이어 입력 피드백 점등 길이

  var prefersReducedMotion =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── 런타임 상태 (순수 state + 타이머 핸들) ──────────────
  var state = L.createInitialState();
  var playbackTimers = [];
  var rand = Math.random;

  // ── 렌더 ────────────────────────────────────────────────
  function setStatus(text, modifier) {
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.className = "status" + (modifier ? " status--" + modifier : "");
    }
  }

  function renderRound() {
    if (roundValueEl) roundValueEl.textContent = String(state.round);
    if (roundBadgeEl) {
      roundBadgeEl.setAttribute("aria-label", "현재 라운드 " + state.round);
    }
  }

  function setPadsDisabled(disabled) {
    for (var k in pads) {
      if (!Object.prototype.hasOwnProperty.call(pads, k)) continue;
      if (disabled) pads[k].setAttribute("aria-disabled", "true");
      else pads[k].removeAttribute("aria-disabled");
    }
  }

  function litOn(pad) {
    if (pads[pad]) pads[pad].classList.add("is-lit");
  }
  function litOff(pad) {
    if (pads[pad]) pads[pad].classList.remove("is-lit");
  }
  function clearAllLit() {
    for (var k in pads) {
      if (Object.prototype.hasOwnProperty.call(pads, k)) litOff(k);
    }
  }

  function clearPlaybackTimers() {
    for (var i = 0; i < playbackTimers.length; i++) {
      clearTimeout(playbackTimers[i]);
    }
    playbackTimers = [];
  }

  // ── 시퀀스 재생 (watch) → 완료 후 beginInput ────────────
  function playSequence() {
    clearPlaybackTimers();
    clearAllLit();
    setPadsDisabled(true);
    setStatus("잘 보세요…", "watch");
    renderRound();

    var seq = state.sequence;
    var t = 300; // 첫 점등 전 짧은 지연

    for (var i = 0; i < seq.length; i++) {
      (function (pad, at) {
        playbackTimers.push(setTimeout(function () { litOn(pad); }, at));
        playbackTimers.push(setTimeout(function () { litOff(pad); }, at + LIT_ON_MS));
      })(seq[i], t);
      t += LIT_ON_MS + LIT_OFF_MS;
    }

    // 재생 완료 → 입력 대기 진입
    playbackTimers.push(setTimeout(function () {
      state = L.beginInput(state);
      setPadsDisabled(false);
      setStatus("당신 차례입니다", "your-turn");
    }, t + 100));
  }

  // ── 플레이어 입력 처리 ──────────────────────────────────
  function feedbackLit(pad) {
    litOn(pad);
    // playbackTimers 에 등록 → 재시작(startNewGame) 시 stale litOff 취소
    playbackTimers.push(setTimeout(function () { litOff(pad); }, FEEDBACK_MS));
  }

  function onPadInput(pad) {
    if (state.status !== L.STATUS.INPUT) return;

    var prevRound = state.round;
    state = L.handleInput(state, pad, rand);

    if (state.status === L.STATUS.GAMEOVER) {
      feedbackLit(pad); // 오답 패드 잠깐 점등
      handleGameOver();
      return;
    }

    feedbackLit(pad);

    if (state.status === L.STATUS.WATCH && state.round > prevRound) {
      // AC1: 라운드 완주 → 라운드 증가 + 시퀀스 확장 재생
      renderRound();
      setStatus("좋아요! 계속", "success");
      var nextDelay = prefersReducedMotion ? FEEDBACK_MS + 120 : 700;
      // playbackTimers 에 등록 → 대기창 중 "다시하기" 눌러도 stale 재생 예약 취소 (재시작 경쟁 방지)
      playbackTimers.push(setTimeout(playSequence, nextDelay));
    } else {
      // 시퀀스 진행 중 — 입력 대기 유지
      setStatus("당신 차례입니다", "your-turn");
    }
  }

  function handleGameOver() {
    // AC2: 종료 상태 — 화면 tint flash, 컨트롤 활성화(재시작 가능)
    setPadsDisabled(true);
    setStatus("틀렸습니다 — 다시 도전!", "fail");
    if (appEl) {
      appEl.classList.add("is-fail");
      setTimeout(function () { appEl.classList.remove("is-fail"); }, 600);
    }
    if (btnStart) btnStart.disabled = false;
    if (btnRestart) btnRestart.disabled = false;
  }

  // ── 게임 시작 / 재시작 ──────────────────────────────────
  function startNewGame() {
    clearPlaybackTimers();
    clearAllLit();
    if (appEl) appEl.classList.remove("is-fail");
    state = L.startGame(state, rand);
    renderRound();
    if (btnStart) btnStart.disabled = true;
    if (btnRestart) btnRestart.disabled = false;
    playSequence();
  }

  // ── 이벤트 바인딩 ───────────────────────────────────────
  for (var p in pads) {
    if (!Object.prototype.hasOwnProperty.call(pads, p)) continue;
    (function (pad) {
      pads[pad].addEventListener("click", function () { onPadInput(pad); });
    })(p);
  }

  if (btnStart) btnStart.addEventListener("click", startNewGame);
  if (btnRestart) btnRestart.addEventListener("click", startNewGame);

  // 전역 숫자키 1~4 매핑 (design §5.6 — 포커스 무관 직접 입력)
  var KEY_TO_PAD = { "1": "green", "2": "red", "3": "yellow", "4": "blue" };
  document.addEventListener("keydown", function (e) {
    if (e.repeat) return; // auto-repeat 로 같은 패드 연속 입력 방지
    var pad = KEY_TO_PAD[e.key];
    if (!pad) return;
    if (state.status !== L.STATUS.INPUT) return;
    e.preventDefault();
    if (document.activeElement && pads[pad]) pads[pad].focus();
    onPadInput(pad);
  });

  // 초기 렌더
  renderRound();
})();

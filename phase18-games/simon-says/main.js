/* BF-937/BF-949 · Simon Says DOM 바인딩·시퀀스 재생·입력·라운드 렌더
 * 디자인 SSOT: docs/design/simon-says-BF-936.md §5 컴포넌트 · §5.6 접근성 · §5.7 모션
 * 유지보수 명세(BF-948): docs/design/simon-says-maintenance-BF-948.md
 *   §5.2 라운드 능동 공지 · §5.3 visibility 일시정지/재개 · §5.4 최고기록 접근성 · §5.6 저장 실패 폴백
 * 순수 로직(logic.js SimonLogic)과 분리 — 여기서는 state 를 들고 렌더/타이머/입력만 담당.
 * 최고점수 영속은 storage.js(SimonStore) 로 격리 — 영속 저장 API 는 본 파일에 등장하지 않음.
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
  var bestChipEl = document.querySelector('[data-role="best-score"]');
  var bestValueEl = document.querySelector('[data-role="best-round"]');
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
  var LEAD_MS = 300; // 첫 점등 전 짧은 지연
  var BEGIN_MS = 100; // 마지막 점등 후 입력 진입까지 추가 지연
  var NEW_RECORD_MS = 1200; // .best-score--new 강조 유지 시간 (§5.1)

  var prefersReducedMotion =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── 최고기록 저장소 (storage.js) — 접근 실패해도 게임 유지(§5.6) ──
  var store = null;
  try {
    if (globalThis.SimonStore && globalThis.SimonStore.createSimonStore) {
      store = globalThis.SimonStore.createSimonStore();
    }
  } catch (_e) {
    store = null; // 게임은 정상 동작, 최고기록만 "기록 없음" 폴백
  }
  function loadBest() {
    try {
      return store ? store.loadBestRound() : 0;
    } catch (_e) {
      return 0;
    }
  }

  // ── 런타임 상태 (순수 state + 타이머 핸들) ──────────────
  var state = L.createInitialState();
  var rand = Math.random;
  var isPaused = false; // visibility 일시정지 플래그 (§5.3)

  // ── 일시정지 가능한 단일 타이머 스케줄러 ────────────────
  // 재생/라운드전환 지연을 한 번에 하나의 setTimeout 으로 구동 → hidden 시 잔여 지연 보존,
  // visible 복귀 시 멈춘 지점부터 재개(건너뛴 점등 없음 — AC-B2).
  var stepQueue = []; // [{ delay, action }]
  var stepTimer = null;
  var stepTarget = 0; // 현재 스텝의 목표 시각(ms)
  var stepRemaining = 0; // pause 시점의 잔여 지연(ms)
  var stepGen = 0; // 재진입/취소 판별용 세대 카운터

  function nowMs() {
    return Date.now();
  }

  function clearStepQueue() {
    stepGen += 1;
    if (stepTimer != null) {
      clearTimeout(stepTimer);
      stepTimer = null;
    }
    stepQueue = [];
    stepRemaining = 0;
  }

  function armTimer(delay) {
    var myGen = stepGen;
    stepTarget = nowMs() + delay;
    stepTimer = setTimeout(function () {
      if (myGen !== stepGen) return; // 이미 취소/재구성됨
      stepTimer = null;
      var step = stepQueue.shift();
      if (step && step.action) step.action();
      if (myGen !== stepGen) return; // action 이 큐를 재구성(enqueue)했으면 이 체인 종료
      runQueue();
    }, delay);
  }

  function runQueue() {
    if (stepQueue.length === 0) {
      stepTimer = null;
      return;
    }
    stepRemaining = stepQueue[0].delay;
    armTimer(stepRemaining);
  }

  function enqueueSteps(steps) {
    clearStepQueue();
    stepQueue = steps.slice();
    runQueue();
  }

  function pauseSteps() {
    if (stepTimer != null) {
      clearTimeout(stepTimer);
      stepTimer = null;
      stepRemaining = Math.max(0, stepTarget - nowMs()); // 잔여 지연 보존
    }
  }

  function resumeSteps() {
    if (stepQueue.length > 0 && stepTimer == null) {
      armTimer(stepRemaining); // 멈춘 지점부터 재개
    }
  }

  // ── 입력 피드백 점등 타이머 (스케줄러와 분리) ───────────
  var feedbackTimers = [];
  function clearFeedbackTimers() {
    for (var i = 0; i < feedbackTimers.length; i++) {
      clearTimeout(feedbackTimers[i]);
    }
    feedbackTimers = [];
  }

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

  // 최고기록 chip 갱신 (§5.1·§5.4 방식 A — 시각 텍스트가 접근 가능한 이름)
  function renderBest(best, isNewRecord) {
    if (!bestValueEl) return;
    if (best && best > 0) {
      bestValueEl.textContent = best + " 라운드";
      if (bestChipEl) bestChipEl.classList.remove("is-empty");
    } else {
      bestValueEl.textContent = "기록 없음";
      if (bestChipEl) bestChipEl.classList.add("is-empty");
    }
    if (isNewRecord && bestChipEl) {
      bestChipEl.classList.add("best-score--new");
      setTimeout(function () {
        bestChipEl.classList.remove("best-score--new");
      }, NEW_RECORD_MS);
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

  // ── 시퀀스 재생 (watch) → 완료 후 입력 진입 ─────────────
  function watchStatusText() {
    return "라운드 " + state.round + " · 잘 보세요…";
  }
  function yourTurnStatusText() {
    return "라운드 " + state.round + " · 당신 차례입니다";
  }

  function enterInputPhase() {
    state = L.beginInput(state);
    setPadsDisabled(false);
    setStatus(yourTurnStatusText(), "your-turn");
  }

  function playSequence() {
    clearFeedbackTimers();
    clearAllLit();
    setPadsDisabled(true);
    renderRound();
    setStatus(watchStatusText(), "watch"); // AC-A1: 라운드 정보 포함 라이브 공지

    var seq = state.sequence;
    var steps = [];
    for (var i = 0; i < seq.length; i++) {
      (function (pad, isFirst) {
        steps.push({
          delay: isFirst ? LEAD_MS : LIT_OFF_MS,
          action: function () {
            litOn(pad);
          },
        });
        steps.push({
          delay: LIT_ON_MS,
          action: function () {
            litOff(pad);
          },
        });
      })(seq[i], i === 0);
    }
    // 마지막 점등 이후 입력 대기 진입
    steps.push({ delay: LIT_OFF_MS + BEGIN_MS, action: enterInputPhase });
    enqueueSteps(steps);
  }

  // ── 플레이어 입력 처리 ──────────────────────────────────
  function feedbackLit(pad) {
    litOn(pad);
    feedbackTimers.push(
      setTimeout(function () {
        litOff(pad);
      }, FEEDBACK_MS),
    );
  }

  function onPadInput(pad) {
    if (isPaused) return; // 일시정지 중 입력 무시 (AC-B1)
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
      setStatus("좋아요! 라운드 " + state.round + " 진행", "success");
      var nextDelay = prefersReducedMotion ? FEEDBACK_MS + 120 : 700;
      // 라운드 전환 지연도 스케줄러로 → 대기창 중 hidden 시 pause, "다시하기" 시 취소.
      enqueueSteps([{ delay: nextDelay, action: playSequence }]);
    } else {
      // 시퀀스 진행 중 — 입력 대기 유지
      setStatus(yourTurnStatusText(), "your-turn");
    }
  }

  function handleGameOver() {
    // AC2: 종료 상태 — 화면 tint flash, 컨트롤 활성화(재시작 가능)
    setPadsDisabled(true);

    // 최고기록 저장 시도 — 실패해도 게임 유지(§5.6). 라운드 정의 = 게임오버 시점 round(§전제 5).
    var reached = state.round;
    var prevBest = loadBest();
    var best = prevBest;
    try {
      if (store) best = store.saveBestRoundIfHigher(reached);
    } catch (_e) {
      best = prevBest;
    }
    var isNewRecord = best > prevBest;
    renderBest(best, isNewRecord);

    // 새 기록 능동 공지(§5.4) — 단일 라이브 리전 .status 로 통합
    var msg;
    if (isNewRecord && best > 0) {
      msg = "틀렸습니다 — 새 최고 기록! " + best + " 라운드";
    } else if (best > 0) {
      msg = "틀렸습니다 — 최고 기록 " + best + " 라운드";
    } else {
      msg = "틀렸습니다 — 다시 도전!";
    }
    setStatus(msg, "fail");

    if (appEl) {
      appEl.classList.add("is-fail");
      setTimeout(function () {
        appEl.classList.remove("is-fail");
      }, 600);
    }
    if (btnStart) btnStart.disabled = false;
    if (btnRestart) btnRestart.disabled = false;
  }

  // ── 게임 시작 / 재시작 ──────────────────────────────────
  function startNewGame() {
    // 일시정지 중 다시하기(AC-B4) 포함 — 보존 타이머/플래그 전부 초기화 후 새 게임.
    isPaused = false;
    clearStepQueue();
    clearFeedbackTimers();
    clearAllLit();
    if (appEl) appEl.classList.remove("is-fail");
    state = L.startGame(state, rand);
    renderRound();
    if (btnStart) btnStart.disabled = true;
    if (btnRestart) btnRestart.disabled = false;
    playSequence();
  }

  // ── visibility 일시정지 / 재개 (§5.3) ───────────────────
  function onHidden() {
    if (isPaused) return;
    if (state.status === L.STATUS.WATCH) {
      isPaused = true;
      pauseSteps(); // 재생 타이머 정지, 잔여 지연 보존
      setPadsDisabled(true);
      setStatus("일시정지 — 탭으로 돌아오면 이어서 진행됩니다", "paused");
    } else if (state.status === L.STATUS.INPUT) {
      isPaused = true;
      setPadsDisabled(true); // 입력 무시 + 패드 비활성
      setStatus("일시정지 — 탭으로 돌아오면 이어서 진행됩니다", "paused");
    }
    // idle / gameover 는 no-op (AC-B3)
  }

  function onVisible() {
    if (!isPaused) return;
    isPaused = false;
    if (state.status === L.STATUS.WATCH) {
      setStatus(watchStatusText(), "watch"); // 직전 상태 문구 복원
      resumeSteps(); // 멈춘 지점부터 재개, 패드는 watch 동안 비활성 유지
    } else if (state.status === L.STATUS.INPUT) {
      setPadsDisabled(false); // 패드 재활성
      setStatus(yourTurnStatusText(), "your-turn"); // inputIndex 보존 — 억울한 오답 없음(AC-B2)
    }
  }

  // ── 이벤트 바인딩 ───────────────────────────────────────
  for (var p in pads) {
    if (!Object.prototype.hasOwnProperty.call(pads, p)) continue;
    (function (pad) {
      pads[pad].addEventListener("click", function () {
        onPadInput(pad);
      });
    })(p);
  }

  if (btnStart) btnStart.addEventListener("click", startNewGame);
  if (btnRestart) btnRestart.addEventListener("click", startNewGame);

  // 전역 숫자키 1~4 매핑 (design §5.6 — 포커스 무관 직접 입력)
  var KEY_TO_PAD = { "1": "green", "2": "red", "3": "yellow", "4": "blue" };
  document.addEventListener("keydown", function (e) {
    if (e.repeat) return; // auto-repeat 로 같은 패드 연속 입력 방지
    if (isPaused) return; // 일시정지 중 키 입력 무시 (AC-B1)
    var pad = KEY_TO_PAD[e.key];
    if (!pad) return;
    if (state.status !== L.STATUS.INPUT) return;
    e.preventDefault();
    if (document.activeElement && pads[pad]) pads[pad].focus();
    onPadInput(pad);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) onHidden();
    else onVisible();
  });

  // 초기 렌더 — 저장된 최고기록을 게임 시작 전에도 표시(AC-C4)
  renderRound();
  renderBest(loadBest(), false);
})();

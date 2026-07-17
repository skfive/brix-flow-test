/* BF-919 · 메모리 매치 DOM 바인딩·타이머·렌더·입력
 * 기획 SSOT: docs/plan/memory-match-BF-916.md (§2 규칙·§3 상태·§6 contract·§7 접근성)
 * 디자인 SSOT: docs/design/memory-match-BF-916.md (§5 컴포넌트·§6.3 상태→DOM 매핑)
 * file:// CORS 안전 — ES module / 원격 요청 / 외부 CDN / 영속 저장 0건. IIFE 전역 함수.
 */
(function () {
  "use strict";

  var L = globalThis.MemoryMatchLogic;
  if (!L) return; // logic.js 로드 실패 방어

  // ── 쌍별 기호/대체텍스트 (design §2.3) ──────────────────
  var SYMBOLS = ["🍎", "🍌", "🍇", "🍉", "🍓", "🍒", "🍑", "🥝"];
  var SYMBOL_LABELS = ["사과", "바나나", "포도", "수박", "딸기", "체리", "복숭아", "키위"];
  var FLIP_BACK_DELAY = 800; // §6.4 불일치 지연

  // ── DOM 참조 ────────────────────────────────────────────
  var boardEl = document.getElementById("board");
  if (!boardEl) return;
  var moveCountEl = document.getElementById("move-count");
  var timerEl = document.getElementById("timer");
  var restartBtn = document.getElementById("restart-btn");
  var winBanner = document.getElementById("win-banner");
  var winMovesEl = document.getElementById("win-moves");
  var winTimeEl = document.getElementById("win-time");
  var winRestartBtn = document.getElementById("win-restart-btn");
  var announceEl = document.getElementById("announce");

  // ── 런타임 상태 ─────────────────────────────────────────
  var state = null;
  var cardEls = []; // deck 순서와 1:1 (index === card.id)
  var flipBackTimer = null; // 불일치 복귀 대기 타이머
  var timerInterval = null; // 타이머 tick

  // ── 시간 포맷 (mm:ss) ───────────────────────────────────
  function formatTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var mm = Math.floor(totalSec / 60);
    var ss = totalSec % 60;
    return (mm < 10 ? "0" + mm : "" + mm) + ":" + (ss < 10 ? "0" + ss : "" + ss);
  }

  // ── 타이머 (Date.now() 차분, §2.4 드리프트 방지) ─────────
  function currentElapsed() {
    if (!state || state.startedAt == null) return 0;
    var end = state.finishedAt != null ? state.finishedAt : Date.now();
    return end - state.startedAt;
  }

  function renderTimer() {
    timerEl.textContent = formatTime(currentElapsed());
  }

  function startTimerTick() {
    if (timerInterval) return;
    timerInterval = setInterval(renderTimer, 250);
  }

  function stopTimerTick() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // ── 카드 DOM 생성 ───────────────────────────────────────
  function buildBoard() {
    boardEl.innerHTML = "";
    cardEls = [];
    state.deck.forEach(function (card) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card";

      var back = document.createElement("span");
      back.className = "card__back";
      back.setAttribute("aria-hidden", "true");
      back.textContent = "◆";

      var face = document.createElement("span");
      face.className = "card__face";
      face.setAttribute("aria-hidden", "true");
      face.textContent = SYMBOLS[card.pairId];

      btn.appendChild(back);
      btn.appendChild(face);
      btn.addEventListener("click", onCardClick.bind(null, card.id));

      boardEl.appendChild(btn);
      cardEls[card.id] = btn;
    });
  }

  // ── 카드 1장 DOM 동기화 ─────────────────────────────────
  function syncCard(card) {
    var btn = cardEls[card.id];
    if (!btn) return;
    btn.dataset.state = card.state;
    btn.dataset.pair = "" + card.pairId;
    var position = card.id + 1; // 좌상→우하 1~16
    if (card.state === "hidden") {
      btn.setAttribute("aria-label", "카드 " + position + ", 뒤집기 전");
      btn.removeAttribute("aria-disabled");
    } else if (card.state === "matched") {
      btn.setAttribute("aria-label", "카드 " + position + ", " + SYMBOL_LABELS[card.pairId] + ", 짝 맞춤");
      btn.setAttribute("aria-disabled", "true");
    } else {
      // revealed / mismatch
      btn.setAttribute("aria-label", "카드 " + position + ", " + SYMBOL_LABELS[card.pairId]);
      btn.removeAttribute("aria-disabled");
    }
  }

  // ── HUD·보드 전체 렌더 ──────────────────────────────────
  function render() {
    state.deck.forEach(syncCard);
    moveCountEl.textContent = state.moves + "회";
    renderTimer();
  }

  function announce(msg) {
    if (announceEl) announceEl.textContent = msg;
  }

  // ── 승리 처리 ───────────────────────────────────────────
  function showWin() {
    stopTimerTick();
    renderTimer();
    var timeStr = formatTime(currentElapsed());
    winMovesEl.textContent = "" + state.moves;
    winTimeEl.textContent = timeStr;
    winBanner.hidden = false;
    announce("모두 맞췄습니다! 이동 " + state.moves + "회, " + Math.floor(currentElapsed() / 1000) + "초");
    winRestartBtn.focus();
  }

  // ── 카드 클릭 처리 ──────────────────────────────────────
  function onCardClick(cardId) {
    // checking / 불일치 대기 중이면 로직이 no-op 처리(입력 잠금, EC-02)
    var prev = state;
    state = L.flipCard(state, cardId, Date.now());
    if (state === prev) return; // 변화 없음

    // 최초 flip 로 playing 진입 시 타이머 tick 시작
    if (state.status === "playing" || state.status === "checking") {
      startTimerTick();
    }

    if (state.status === "checking") {
      // 2장 공개 완료 — 렌더 후 판정
      render();
      resolveCheck();
    } else {
      render();
    }
  }

  // ── 2장 판정 (일치 즉시 / 불일치 지연 복귀) ─────────────
  function resolveCheck() {
    var checkingState = state; // 판정 대기 상태(입력 잠금 유지)
    var pending = checkingState.revealedIds.slice();
    var result = L.evaluateCheck(checkingState, Date.now());
    var isMatch = result.matchedPairs > checkingState.matchedPairs;

    if (isMatch) {
      state = result;
      render();
      if (state.status === "won") {
        showWin();
      } else {
        announce("짝을 맞췄습니다");
      }
      return;
    }

    // 불일치 — 두 카드에 mismatch 시각 표시 후 지연 복귀
    pending.forEach(function (id) {
      var btn = cardEls[id];
      if (btn) btn.dataset.state = "mismatch";
    });
    // state 는 checking 유지 → 대기 중 추가 입력 no-op (입력 잠금)
    flipBackTimer = setTimeout(function () {
      flipBackTimer = null;
      state = result; // playing, 두 카드 hidden 복귀
      render();
    }, FLIP_BACK_DELAY);
  }

  // ── 재시작 (언제든, §2.5 / EC-05) ───────────────────────
  function restart() {
    if (flipBackTimer) {
      clearTimeout(flipBackTimer);
      flipBackTimer = null;
    }
    stopTimerTick();
    state = L.createInitialState(L.createDeck(L.PAIR_COUNT));
    winBanner.hidden = true;
    buildBoard();
    render();
    announce("새 게임을 시작했습니다");
  }

  // ── 초기화 ──────────────────────────────────────────────
  restartBtn.addEventListener("click", restart);
  winRestartBtn.addEventListener("click", restart);

  state = L.createInitialState(L.createDeck(L.PAIR_COUNT));
  buildBoard();
  render();
})();

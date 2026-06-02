/* rps/game.js — 가위바위보 게임 UI/인터랙션
 * BF-792 · docs/design/rps-BF-789.md §5, §6
 * file:// 안전 — 외부 fetch·CDN·import/export 0건 (IIFE + globalThis.RpsJudge)
 */
(function () {
  "use strict";

  /* ─── judge 순수함수 참조 (judge.js 가 먼저 로드되어야 함) ─── */
  var J = globalThis.RpsJudge;
  if (!J) {
    console.error("[rps/game.js] RpsJudge not found — judge.js 가 먼저 로드되어야 합니다");
    return;
  }
  var judge = J.judge;

  /* ─── 상수 (§5.3 결과 톤) ─── */
  var CHOICES = {
    scissors: { emoji: "✌️", name: "가위" },
    rock: { emoji: "✊", name: "바위" },
    paper: { emoji: "🖐", name: "보" },
  };
  var RESULTS = {
    win: { text: "WIN", icon: "🎉" },
    lose: { text: "LOSE", icon: "😢" },
    draw: { text: "DRAW", icon: "🤝" },
  };
  var CHOICE_KEYS = Object.keys(CHOICES);

  /* ─── 점수 스토어 (localStorage 추상화, §6) ─── */
  var SCORE_KEY = "rps:score";
  function loadScore() {
    try {
      var raw = localStorage.getItem(SCORE_KEY);
      if (!raw) return { win: 0, draw: 0, lose: 0 };
      var p = JSON.parse(raw);
      return {
        win: Number(p.win) || 0,
        draw: Number(p.draw) || 0,
        lose: Number(p.lose) || 0,
      };
    } catch (e) {
      return { win: 0, draw: 0, lose: 0 };
    }
  }
  function saveScore() {
    try {
      localStorage.setItem(SCORE_KEY, JSON.stringify(score));
    } catch (e) {
      /* 저장 실패해도 게임 진행은 계속 */
    }
  }

  var score = loadScore();

  /* ─── DOM 참조 ─── */
  var game = document.getElementById("game");
  var playerCard = document.getElementById("player-card");
  var cpuCard = document.getElementById("cpu-card");
  var playerIcon = document.getElementById("player-icon");
  var cpuIcon = document.getElementById("cpu-icon");
  var playerName = document.getElementById("player-name");
  var cpuName = document.getElementById("cpu-name");
  var resultBanner = document.getElementById("result-banner");
  var resultIcon = document.getElementById("result-icon");
  var resultText = document.getElementById("result-text");
  var countWin = document.getElementById("count-win");
  var countDraw = document.getElementById("count-draw");
  var countLose = document.getElementById("count-lose");
  var themeBtn = document.getElementById("theme-btn");
  var resetBtn = document.getElementById("reset-btn");

  /* ─── 초기화 ─── */
  renderScore();
  initTheme();

  /* ─── 유틸 ─── */
  function delay(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }
  function setGameState(state) {
    game.dataset.gameState = state;
  }
  function cpuPick() {
    return CHOICE_KEYS[Math.floor(Math.random() * CHOICE_KEYS.length)];
  }

  /* ─── 렌더 ─── */
  function renderScore() {
    countWin.textContent = score.win;
    countDraw.textContent = score.draw;
    countLose.textContent = score.lose;
  }
  function popScore(type) {
    var el = type === "win" ? countWin : type === "draw" ? countDraw : countLose;
    el.classList.remove("score-pop");
    void el.offsetWidth; // reflow — 애니 재시작
    el.classList.add("score-pop");
  }
  function showResultBanner(result) {
    var r = RESULTS[result];
    resultBanner.dataset.result = result;
    resultIcon.textContent = r.icon;
    resultText.textContent = r.text;
    resultBanner.classList.remove("visible");
    void resultBanner.offsetWidth; // reflow
    resultBanner.classList.add("visible");
  }
  function hideResultBanner() {
    resultBanner.classList.remove("visible");
    resultBanner.dataset.result = "none";
    resultIcon.textContent = "";
    resultText.textContent = "";
  }
  function resetCards() {
    playerCard.dataset.state = "idle";
    playerCard.dataset.choice = "none";
    cpuCard.dataset.state = "idle";
    cpuCard.dataset.choice = "none";
    playerIcon.textContent = "❓";
    cpuIcon.textContent = "❓";
    playerName.textContent = "";
    cpuName.textContent = "";
    playerCard.setAttribute("aria-label", "나의 선택: 아직 선택하지 않음");
    cpuCard.setAttribute("aria-label", "컴퓨터의 선택: 아직 선택하지 않음");
  }
  function showThinkingAnimation() {
    cpuIcon.innerHTML =
      '<span class="thinking-dots"><span></span><span></span><span></span></span>';
    cpuCard.dataset.state = "thinking";
  }

  /* ─── 게임 플로우 (§5.1 thinking → flipIn → 결과) ─── */
  async function play(playerChoice) {
    if (game.dataset.gameState === "thinking") return;
    if (!CHOICES[playerChoice]) return;

    hideResultBanner();
    resetCards();

    // 플레이어 선택 표시
    var pChoice = CHOICES[playerChoice];
    playerCard.dataset.choice = playerChoice;
    playerCard.dataset.state = "revealed";
    playerIcon.textContent = pChoice.emoji;
    playerName.textContent = pChoice.name;
    playerCard.setAttribute("aria-label", "나의 선택: " + pChoice.name);

    // thinking 상태 — CPU 생각 중 (입력 차단)
    setGameState("thinking");
    showThinkingAnimation();
    await delay(500);

    // CPU 선택 공개 (flipIn)
    var cChoiceKey = cpuPick();
    var cChoice = CHOICES[cChoiceKey];
    cpuCard.dataset.choice = cChoiceKey;
    cpuCard.dataset.state = "revealed";
    cpuIcon.textContent = cChoice.emoji;
    cpuName.textContent = cChoice.name;
    cpuCard.setAttribute("aria-label", "컴퓨터의 선택: " + cChoice.name);
    cpuCard.classList.add("flip-in");
    cpuCard.addEventListener(
      "animationend",
      function () {
        cpuCard.classList.remove("flip-in");
      },
      { once: true }
    );

    // 판정 + 결과
    await delay(200);
    var result = judge(playerChoice, cChoiceKey);
    setGameState("result-" + result);
    showResultBanner(result);

    // 누적 전적 갱신 + 저장
    score[result] += 1;
    renderScore();
    popScore(result);
    saveScore();
  }

  /* ─── 점수 초기화 (§5.6) ─── */
  function resetScores() {
    score.win = 0;
    score.draw = 0;
    score.lose = 0;
    renderScore();
    saveScore();
    resetCards();
    hideResultBanner();
    setGameState("idle");
  }

  /* ─── 이벤트: 선택 버튼 ─── */
  document.querySelectorAll(".choice-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      play(btn.dataset.choice);
    });
  });

  /* ─── 이벤트: 키보드 단축키 (§6-7: R 바위 · P 보 · S 가위 · Esc 초기화) ─── */
  document.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    if (k === "escape") {
      resetScores();
      return;
    }
    if (game.dataset.gameState === "thinking") return;
    if (k === "s") play("scissors");
    else if (k === "r") play("rock");
    else if (k === "p") play("paper");
  });

  /* ─── 이벤트: 초기화 버튼 ─── */
  resetBtn.addEventListener("click", resetScores);

  /* ─── 테마 토글 (§5.5 — localStorage['rps:theme']) ─── */
  function initTheme() {
    var saved;
    try {
      saved = localStorage.getItem("rps:theme");
    } catch (e) {
      saved = null;
    }
    applyTheme(saved === "light" ? "light" : "dark");
  }
  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    themeBtn.textContent = theme === "dark" ? "🌙" : "☀️";
    themeBtn.setAttribute(
      "aria-label",
      theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환"
    );
    try {
      localStorage.setItem("rps:theme", theme);
    } catch (e) {
      /* 저장 실패 무시 */
    }
  }
  themeBtn.addEventListener("click", function () {
    var current = document.body.dataset.theme === "light" ? "light" : "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  });
})();

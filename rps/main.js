/* rps/main.js — 가위바위보 게임 UI/인터랙션
 * BF-648 · docs/design/rps-BF-645.md §8, §10.5
 * file:// 안전 — 외부 fetch·CDN 0건
 */
(function () {
  'use strict';

  /* ─── Logic 참조 (UMD globalThis.RpsLogic) ─── */
  var L = globalThis.RpsLogic;
  if (!L) {
    console.error('[rps/main.js] RpsLogic not found — logic.js 가 먼저 로드되어야 합니다');
    return;
  }
  var CHOICES = L.CHOICES;
  var RESULTS  = L.RESULTS;
  var cpuPick  = L.cpuPick;
  var judge    = L.judge;
  var createScoreStore = L.createScoreStore;

  /* ─── 스코어 스토어 초기화 ─── */
  var scoreStore = createScoreStore(localStorage);
  var score = scoreStore.load();

  /* ─── DOM 참조 ─── */
  var game        = document.getElementById('game');
  var playerCard  = document.getElementById('player-card');
  var cpuCard     = document.getElementById('cpu-card');
  var playerIcon  = document.getElementById('player-icon');
  var cpuIcon     = document.getElementById('cpu-icon');
  var playerName  = document.getElementById('player-name');
  var cpuName     = document.getElementById('cpu-name');
  var resultBanner = document.getElementById('result-banner');
  var resultIcon  = document.getElementById('result-icon');
  var resultText  = document.getElementById('result-text');
  var countWin    = document.getElementById('count-win');
  var countDraw   = document.getElementById('count-draw');
  var countLose   = document.getElementById('count-lose');
  var themeBtn    = document.getElementById('theme-btn');
  var resetBtn    = document.getElementById('reset-btn');

  /* ─── 초기화 ─── */
  renderScore();
  initTheme();

  /* ─── 유틸 ─── */
  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function setGameState(state) {
    game.dataset.gameState = state;
  }

  /* ─── 렌더 함수 ─── */
  function renderScore() {
    countWin.textContent  = score.win;
    countDraw.textContent = score.draw;
    countLose.textContent = score.lose;
  }

  function popScore(type) {
    var el = type === 'win' ? countWin : type === 'draw' ? countDraw : countLose;
    el.classList.remove('score-pop');
    void el.offsetWidth; // reflow — 애니메이션 재시작
    el.classList.add('score-pop');
  }

  function showResultBanner(result) {
    var r = RESULTS[result];
    resultBanner.dataset.result = r.dataResult;
    resultIcon.textContent = r.icon;
    resultText.textContent = r.text;
    resultBanner.classList.remove('visible');
    void resultBanner.offsetWidth; // reflow
    resultBanner.classList.add('visible');
  }

  function hideResultBanner() {
    resultBanner.classList.remove('visible');
    resultBanner.dataset.result = 'none';
    resultIcon.textContent = '';
    resultText.textContent = '';
  }

  function resetCards() {
    playerCard.dataset.state  = 'idle';
    playerCard.dataset.choice = 'none';
    cpuCard.dataset.state     = 'idle';
    cpuCard.dataset.choice    = 'none';
    playerIcon.textContent    = '❓';
    cpuIcon.textContent       = '❓';
    playerName.textContent    = '';
    cpuName.textContent       = '';
    playerCard.setAttribute('aria-label', '나의 선택: 아직 선택하지 않음');
    cpuCard.setAttribute('aria-label', '컴퓨터의 선택: 아직 선택하지 않음');
  }

  function showThinkingAnimation() {
    cpuIcon.innerHTML = '<span class="thinking-dots"><span></span><span></span><span></span></span>';
    cpuCard.dataset.state = 'thinking';
  }

  /* ─── 게임 플로우 (§8.1, §10.5) ─── */
  async function play(playerChoice) {
    if (game.dataset.gameState === 'thinking') return;

    hideResultBanner();
    resetCards();

    // 플레이어 선택 표시
    var pChoice = CHOICES[playerChoice];
    playerCard.dataset.choice = playerChoice;
    playerCard.dataset.state  = 'revealed';
    playerIcon.textContent    = pChoice.emoji;
    playerName.textContent    = pChoice.name;
    playerCard.setAttribute('aria-label', '나의 선택: ' + pChoice.name);

    // thinking 상태 진입
    setGameState('thinking');
    showThinkingAnimation();

    // CPU 생각 딜레이 (500ms)
    await delay(500);

    // CPU 선택 공개 + flipIn 애니메이션
    var cpuChoice = cpuPick();
    var cChoice   = CHOICES[cpuChoice];
    cpuCard.dataset.choice = cpuChoice;
    cpuCard.dataset.state  = 'revealed';
    cpuIcon.textContent    = cChoice.emoji;
    cpuName.textContent    = cChoice.name;
    cpuCard.setAttribute('aria-label', '컴퓨터의 선택: ' + cChoice.name);
    cpuCard.classList.add('flip-in');
    cpuCard.addEventListener('animationend', function () {
      cpuCard.classList.remove('flip-in');
    }, { once: true });

    // 판정 + 결과 표시 (200ms 후)
    await delay(200);
    var result = judge(playerChoice, cpuChoice);
    setGameState('result-' + result);
    showResultBanner(result);

    // 점수 업데이트 + 저장
    score[result]++;
    renderScore();
    popScore(result);
    scoreStore.save(score);
  }

  /* ─── 이벤트: 선택 버튼 ─── */
  document.querySelectorAll('.choice-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      play(btn.dataset.choice);
    });
  });

  /* ─── 이벤트: 키보드 단축키 (§8.2) ─── */
  document.addEventListener('keydown', function (e) {
    if (game.dataset.gameState === 'thinking') return;
    if (e.key === '1') play('scissors');
    if (e.key === '2') play('rock');
    if (e.key === '3') play('paper');
    if (e.key === 'r' || e.key === 'R') resetScores();
  });

  /* ─── 이벤트: 점수 초기화 ─── */
  function resetScores() {
    score.win = score.draw = score.lose = 0;
    renderScore();
    scoreStore.reset();
    resetCards();
    hideResultBanner();
    setGameState('idle');
  }
  resetBtn.addEventListener('click', resetScores);

  /* ─── 이벤트: 테마 토글 (§9 rps:theme) ─── */
  function initTheme() {
    var saved = localStorage.getItem('rps:theme') || 'dark';
    applyTheme(saved);
  }

  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    themeBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
    themeBtn.setAttribute('aria-label', theme === 'dark' ? '라이트 테마로 전환' : '다크 테마로 전환');
    localStorage.setItem('rps:theme', theme);
  }

  themeBtn.addEventListener('click', function () {
    var current = document.body.dataset.theme === 'dark' ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

})();

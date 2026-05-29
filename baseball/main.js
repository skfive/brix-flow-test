/* baseball/main.js — 숫자 야구 게임 UI/인터랙션
 * BF-654 · docs/design/baseball-BF-651.md §6 §7 §8
 * file:// 안전 — 외부 fetch·CDN 0건
 * 의존: baseball/logic.js (globalThis.BaseballLogic)
 */
(function () {
  'use strict';

  /* ─── Logic 참조 (UMD globalThis.BaseballLogic) ─── */
  var L = globalThis.BaseballLogic;
  if (!L) {
    console.error('[baseball/main.js] BaseballLogic not found — logic.js 가 먼저 로드되어야 합니다');
    return;
  }
  var MAX_TRIES      = L.MAX_TRIES;
  var generateSecret = L.generateSecret;
  var judge          = L.judge;
  var validateGuess  = L.validateGuess;

  /* ─── 게임 상태 ─── */
  var state = {
    secret:  [],
    history: [],   /* [{index, guess, strike, ball}] */
    isOver:  false
  };

  /* ─── DOM 참조 ─── */
  var game       = document.getElementById('game');
  var inningDots = document.getElementById('inning-dots');
  var tryCount   = document.getElementById('try-count');
  var inputs     = Array.prototype.slice.call(document.querySelectorAll('.digit-input'));
  var inputError = document.getElementById('input-error');
  var submitBtn  = document.getElementById('submit-btn');
  var historyList = document.getElementById('history-list');
  var resultPanel  = document.getElementById('result-panel');
  var resultEmoji  = document.getElementById('result-emoji');
  var resultTitle  = document.getElementById('result-title');
  var resultDesc   = document.getElementById('result-desc');
  var answerDigits = document.getElementById('answer-digits');
  var newGameBtn   = document.getElementById('new-game-btn');
  var themeBtn     = document.getElementById('theme-toggle');

  /* ─── 이닝 바 렌더 (§5.5) ─── */
  function renderInningBar() {
    inningDots.innerHTML = '';
    var usedCount = state.history.length;
    inningDots.setAttribute('aria-valuenow', String(usedCount));
    for (var i = 0; i < MAX_TRIES; i++) {
      var dot = document.createElement('span');
      dot.className = 'inning-dot';
      if (i < usedCount) {
        /* 소진된 기회 */
        dot.classList.add('inning-dot--used');
      } else if (i === MAX_TRIES - 1 && usedCount === MAX_TRIES - 1) {
        /* 마지막 1칸 남음 — 긴장감 (빨간색) */
        dot.classList.add('inning-dot--last');
      } else {
        dot.classList.add('inning-dot--active');
      }
      inningDots.appendChild(dot);
    }
    tryCount.textContent = '시도: ' + usedCount;
  }

  /* ─── 시도 기록 행 생성 (§5.3) ─── */
  function createHistoryRow(entry, isLatest) {
    var li = document.createElement('li');
    li.className = 'history-row';
    if (isLatest) li.setAttribute('data-latest', 'true');

    /* 회차 배지 */
    var idx = document.createElement('span');
    idx.className = 'history-row__index';
    idx.textContent = '#' + entry.index;

    /* 추리 숫자 */
    var guess = document.createElement('span');
    guess.className = 'history-row__guess';
    guess.textContent = entry.guess.join(' ');

    /* S/B 텍스트 */
    var score = document.createElement('span');
    score.className = 'history-row__score';
    if (entry.strike === 0 && entry.ball === 0) {
      var outSpan = document.createElement('span');
      outSpan.className = 'score-out';
      outSpan.textContent = '아웃';
      score.appendChild(outSpan);
    } else {
      var sSpan = document.createElement('span');
      sSpan.className = 'score-s';
      sSpan.textContent = entry.strike + 'S';
      var bSpan = document.createElement('span');
      bSpan.className = 'score-b';
      bSpan.textContent = entry.ball + 'B';
      score.appendChild(sSpan);
      score.appendChild(bSpan);
    }

    /* 도트 인디케이터 — 순서: S → B → O (§4.5, §5.3) */
    var dotsEl = document.createElement('div');
    dotsEl.className = 'history-row__dots';
    dotsEl.setAttribute('aria-label',
      '스트라이크 ' + entry.strike + ', 볼 ' + entry.ball +
      ', 아웃 ' + (4 - entry.strike - entry.ball));

    var dotTypes = [];
    for (var i = 0; i < entry.strike; i++) dotTypes.push('strike');
    for (var j = 0; j < entry.ball;   j++) dotTypes.push('ball');
    for (var k = 0; k < 4 - entry.strike - entry.ball; k++) dotTypes.push('out');

    dotTypes.forEach(function (type, di) {
      var d = document.createElement('span');
      d.className = 'dot dot--' + type;
      d.style.animationDelay = (di * 50) + 'ms';
      dotsEl.appendChild(d);
    });

    /* li aria-label */
    li.setAttribute('aria-label',
      entry.index + '번째 시도 ' + entry.guess.join('') +
      ' — 스트라이크 ' + entry.strike + ', 볼 ' + entry.ball);

    li.appendChild(idx);
    li.appendChild(guess);
    li.appendChild(score);
    li.appendChild(dotsEl);
    return li;
  }

  /* ─── 시도 기록 렌더 ─── */
  function renderHistory() {
    historyList.innerHTML = '';

    if (state.history.length === 0) {
      var emptyLi = document.createElement('li');
      emptyLi.className = 'history-empty';
      emptyLi.id = 'history-empty';
      emptyLi.textContent = '아직 시도 기록 없음';
      historyList.appendChild(emptyLi);
      return;
    }

    /* 최신이 위 — 역순 렌더 */
    for (var i = state.history.length - 1; i >= 0; i--) {
      var isLatest = i === state.history.length - 1;
      historyList.appendChild(createHistoryRow(state.history[i], isLatest));
    }
  }

  /* ─── 결과 패널 표시 (§5.4) ─── */
  function showResult(isWin) {
    resultPanel.setAttribute('data-result', isWin ? 'win' : 'lose');
    resultEmoji.textContent = isWin ? '🎉' : '💀';
    resultTitle.textContent = isWin ? '정답!' : '실패!';

    if (isWin) {
      resultDesc.textContent = state.history.length + '번째 시도만에 맞혔습니다';
    } else {
      resultDesc.textContent = MAX_TRIES + '번의 기회를 모두 소진했습니다';
    }
    answerDigits.textContent = state.secret.join(' ');
  }

  /* ─── 입력 유효성 검사 + 버튼 활성화 ─── */
  function getGuessDigits() {
    return inputs.map(function (inp) {
      var v = inp.value.trim();
      return v === '' ? null : parseInt(v, 10);
    });
  }

  function validateAndUpdate() {
    var digits = getGuessDigits();
    var result = validateGuess(digits);

    /* error 클래스 초기화 */
    inputs.forEach(function (inp) { inp.classList.remove('error'); });

    if (!result.valid && result.errorMessage === '중복된 숫자가 있습니다') {
      /* 중복된 칸 표시 */
      var counts = {};
      digits.forEach(function (d) {
        if (d !== null) counts[d] = (counts[d] || 0) + 1;
      });
      digits.forEach(function (d, i) {
        if (d !== null && counts[d] > 1) {
          inputs[i].classList.add('error');
        }
      });
    }

    inputError.textContent = result.valid ? '' : (
      result.errorMessage === '중복된 숫자가 있습니다' ? result.errorMessage : ''
    );
    submitBtn.disabled = !result.valid || state.isOver;
  }

  /* ─── 입력칸 이벤트 (§7.1 §7.2 §8.5) ─── */
  inputs.forEach(function (input, idx) {
    input.addEventListener('input', function () {
      /* 숫자 외 문자 제거 */
      this.value = this.value.replace(/[^0-9]/g, '').slice(-1);

      if (this.value.length === 1) {
        this.classList.add('filled');
        /* 다음 칸 자동 포커스 */
        if (idx < inputs.length - 1) {
          inputs[idx + 1].focus();
        }
      } else {
        this.classList.remove('filled');
      }
      validateAndUpdate();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace') {
        if (this.value === '' && idx > 0) {
          e.preventDefault();
          inputs[idx - 1].value = '';
          inputs[idx - 1].classList.remove('filled');
          inputs[idx - 1].focus();
        } else {
          this.classList.remove('filled');
        }
        validateAndUpdate();
      }
      if (e.key === 'ArrowLeft'  && idx > 0)               inputs[idx - 1].focus();
      if (e.key === 'ArrowRight' && idx < inputs.length - 1) inputs[idx + 1].focus();
      if (e.key === 'Enter') submitBtn.click();
    });

    input.addEventListener('focus', function () {
      this.select();
    });
  });

  /* ─── 제출 버튼 (§7.1) ─── */
  submitBtn.addEventListener('click', function () {
    if (state.isOver) return;
    var digits = getGuessDigits();
    var validation = validateGuess(digits);
    if (!validation.valid) return;

    /* 판정 */
    var result = judge(state.secret, digits);

    state.history.push({
      index:  state.history.length + 1,
      guess:  digits,
      strike: result.strike,
      ball:   result.ball
    });

    renderHistory();
    renderInningBar();

    /* 입력 초기화 */
    inputs.forEach(function (inp) {
      inp.value = '';
      inp.classList.remove('filled', 'error');
    });
    inputError.textContent = '';
    submitBtn.disabled = true;

    /* 게임 종료 판단 */
    if (result.strike === 4) {
      state.isOver = true;
      game.setAttribute('data-game-state', 'win');
      showResult(true);
    } else if (state.history.length >= MAX_TRIES) {
      state.isOver = true;
      game.setAttribute('data-game-state', 'lose');
      showResult(false);
    } else {
      game.setAttribute('data-game-state', 'playing');
      inputs[0].focus();
    }
  });

  /* ─── 새 게임 버튼 ─── */
  newGameBtn.addEventListener('click', function () {
    initGame();
  });

  /* ─── 테마 토글 (§5.6) ─── */
  themeBtn.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    themeBtn.textContent = next === 'dark' ? '🌙' : '☀';
    try { localStorage.setItem('bf-theme', next); } catch (_e) {}
  });

  /* ─── 키보드 단축키 (§7.2 — T: 테마 토글) ─── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 't' || e.key === 'T') {
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        themeBtn.click();
      }
    }
  });

  /* ─── 게임 초기화 ─── */
  function initGame() {
    state.secret  = generateSecret();
    state.history = [];
    state.isOver  = false;

    game.setAttribute('data-game-state', 'idle');
    resultPanel.setAttribute('data-result', 'none');
    inputError.textContent = '';

    inputs.forEach(function (inp) {
      inp.value = '';
      inp.classList.remove('filled', 'error');
      inp.removeAttribute('disabled');
    });
    submitBtn.disabled = true;

    renderHistory();
    renderInningBar();
    inputs[0].focus();
  }

  /* ─── 테마 버튼 초기 아이콘 동기화 ─── */
  (function () {
    var t = document.documentElement.getAttribute('data-theme');
    themeBtn.textContent = t === 'light' ? '☀' : '🌙';
  })();

  /* ─── 시작 ─── */
  initGame();
})();

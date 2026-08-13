(function () {
  'use strict';

  var DEFAULT_SYMBOLS = ['🍎', '🍋', '🍇', '🍒', '🍉', '🍓', '🍑', '🍍', '🥝', '🍌', '🍊', '🍈'];
  var MISMATCH_DELAY_MS = 1000;

  function createDeck(symbols) {
    if (!Array.isArray(symbols) || symbols.length === 0) return [];
    var cards = [];
    var id = 0;
    for (var i = 0; i < symbols.length; i++) {
      cards.push({ id: id++, symbol: symbols[i], state: 'hidden' });
      cards.push({ id: id++, symbol: symbols[i], state: 'hidden' });
    }
    return cards;
  }

  function shuffle(cards, rng) {
    var random = typeof rng === 'function' ? rng : Math.random;
    var result = Array.isArray(cards) ? cards.slice() : [];
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
    return result;
  }

  function isMatch(cardA, cardB) {
    if (!cardA || !cardB) return false;
    return cardA.symbol === cardB.symbol && cardA.id !== cardB.id;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatTime(seconds) {
    var s = Number(seconds);
    if (!Number.isFinite(s) || s < 0) s = 0;
    s = Math.floor(s);
    var mm = Math.floor(s / 60);
    var ss = s % 60;
    return pad2(mm) + ':' + pad2(ss);
  }

  function isWon(cards) {
    if (!Array.isArray(cards) || cards.length === 0) return false;
    return cards.every(function (card) {
      return card && card.state === 'matched';
    });
  }

  function shuffledDeck(pairCount, rng) {
    var count = Number.isInteger(pairCount) && pairCount > 0 ? pairCount : DEFAULT_SYMBOLS.length;
    var symbols = DEFAULT_SYMBOLS.slice(0, count);
    return shuffle(createDeck(symbols), rng);
  }

  function judgeFlip(cardA, cardB) {
    return isMatch(cardA, cardB);
  }

  function initGame() {
    var boardEl = document.getElementById('memory-board');
    var attemptsEl = document.getElementById('memory-attempts');
    var timerEl = document.getElementById('memory-timer');
    var resultEl = document.getElementById('memory-result');
    var restartEl = document.getElementById('memory-restart');

    if (!boardEl || !attemptsEl || !timerEl || !resultEl || !restartEl) return;

    var cards = [];
    var buttons = [];
    var flippedIndexes = [];
    var attempts = 0;
    var timerSeconds = 0;
    var timerHandle = null;
    var inputLocked = false;

    function stateLabel(state) {
      if (state === 'flipped') return '뒤집힘';
      if (state === 'matched') return '맞춤';
      return '가려짐';
    }

    function renderCard(index) {
      var card = cards[index];
      var button = buttons[index];
      var className = 'memory-card';
      if (card.state === 'flipped') className += ' memory-card--flipped';
      if (card.state === 'matched') className += ' memory-card--matched';
      button.className = className;
      button.textContent = card.state === 'hidden' ? '' : card.symbol;
      button.setAttribute('aria-label', '카드 ' + (index + 1) + ', ' + stateLabel(card.state));
    }

    function renderAll() {
      for (var i = 0; i < cards.length; i++) renderCard(i);
      attemptsEl.textContent = String(attempts);
      timerEl.textContent = formatTime(timerSeconds);
    }

    function stopTimer() {
      if (timerHandle !== null) {
        clearInterval(timerHandle);
        timerHandle = null;
      }
    }

    function startTimer() {
      if (timerHandle !== null) return;
      timerHandle = setInterval(function () {
        timerSeconds += 1;
        timerEl.textContent = formatTime(timerSeconds);
      }, 1000);
    }

    function hideResult() {
      resultEl.classList.remove('memory-result--visible');
      resultEl.textContent = '';
    }

    function showResult() {
      resultEl.textContent = '완료! 시도 ' + attempts + '회, 시간 ' + formatTime(timerSeconds);
      resultEl.classList.add('memory-result--visible');
    }

    function buildBoard() {
      boardEl.textContent = '';
      buttons = [];
      for (var i = 0; i < cards.length; i++) {
        var button = document.createElement('button');
        button.type = 'button';
        (function (index) {
          button.addEventListener('click', function () {
            handleActivate(index);
          });
        })(i);
        boardEl.appendChild(button);
        buttons.push(button);
      }
    }

    function resolvePair() {
      var indexA = flippedIndexes[0];
      var indexB = flippedIndexes[1];
      var cardA = cards[indexA];
      var cardB = cards[indexB];

      if (judgeFlip(cardA, cardB)) {
        cardA.state = 'matched';
        cardB.state = 'matched';
        flippedIndexes = [];
        inputLocked = false;
        renderAll();
        if (isWon(cards)) {
          stopTimer();
          showResult();
        }
        return;
      }

      setTimeout(function () {
        cardA.state = 'hidden';
        cardB.state = 'hidden';
        flippedIndexes = [];
        inputLocked = false;
        renderAll();
      }, MISMATCH_DELAY_MS);
    }

    function handleActivate(index) {
      if (inputLocked) return;
      var card = cards[index];
      if (!card || card.state !== 'hidden') return;

      if (flippedIndexes.length === 0) startTimer();

      card.state = 'flipped';
      flippedIndexes.push(index);
      renderCard(index);

      if (flippedIndexes.length < 2) return;

      attempts += 1;
      attemptsEl.textContent = String(attempts);
      inputLocked = true;
      resolvePair();
    }

    function restart() {
      stopTimer();
      cards = shuffledDeck(8, Math.random);
      flippedIndexes = [];
      attempts = 0;
      timerSeconds = 0;
      inputLocked = false;
      hideResult();
      buildBoard();
      renderAll();
    }

    restartEl.addEventListener('click', restart);
    restart();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initGame);
    } else {
      initGame();
    }
  }

  var api = {
    createDeck: createDeck,
    shuffle: shuffle,
    isMatch: isMatch,
    formatTime: formatTime,
    isWon: isWon,
    shuffledDeck: shuffledDeck,
    judgeFlip: judgeFlip
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.MemoryGame = api;
  }
})();

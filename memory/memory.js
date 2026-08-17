(function () {
  'use strict';

  var SYMBOLS = ['🍎', '🍋', '🍇', '🍒', '🍉', '🍓', '🍑', '🍍'];
  var MISMATCH_DELAY_MS = 800;

  function defaultShuffle(cards) {
    var result = cards.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
    return result;
  }

  function createDeck(symbols, shuffleFn) {
    var list = Array.isArray(symbols) ? symbols : [];
    var cards = [];
    var id = 0;
    for (var i = 0; i < list.length; i++) {
      cards.push({ id: id++, symbol: list[i], flipped: false, matched: false });
      cards.push({ id: id++, symbol: list[i], flipped: false, matched: false });
    }
    var shuffle = typeof shuffleFn === 'function' ? shuffleFn : defaultShuffle;
    return shuffle(cards);
  }

  function applyFlip(state, index) {
    if (!state || !Array.isArray(state.deck)) return state;
    if (state.phase === 'comparing' || state.phase === 'done') return state;
    if (typeof index !== 'number' || index < 0 || index >= state.deck.length) return state;

    var card = state.deck[index];
    if (!card || card.flipped || card.matched) return state;

    if (state.phase === 'idle') {
      var deckAfterFirst = state.deck.slice();
      deckAfterFirst[index] = Object.assign({}, card, { flipped: true });
      return Object.assign({}, state, {
        deck: deckAfterFirst,
        flippedIndices: [index],
        phase: 'one-flipped'
      });
    }

    // phase === 'one-flipped'
    var firstIndex = state.flippedIndices[0];
    var deck = state.deck.slice();
    deck[index] = Object.assign({}, card, { flipped: true });
    var firstCard = deck[firstIndex];
    var moveCount = state.moveCount + 1;

    if (firstCard.symbol === deck[index].symbol) {
      deck[firstIndex] = Object.assign({}, firstCard, { matched: true });
      deck[index] = Object.assign({}, deck[index], { matched: true });
      var allMatched = deck.every(function (c) {
        return c.matched;
      });
      return Object.assign({}, state, {
        deck: deck,
        flippedIndices: [],
        moveCount: moveCount,
        phase: allMatched ? 'done' : 'idle'
      });
    }

    return Object.assign({}, state, {
      deck: deck,
      flippedIndices: [firstIndex, index],
      moveCount: moveCount,
      phase: 'comparing'
    });
  }

  function initGame() {
    var boardEl = document.getElementById('game-board');
    var counterEl = document.getElementById('move-counter');
    var messageEl = document.getElementById('completion-message');
    var restartEl = document.getElementById('restart-button');

    if (!boardEl || !counterEl || !messageEl || !restartEl) return;

    var state = null;
    var buttons = [];
    var mismatchTimer = null;

    function cardLabel(card) {
      if (card.matched) return '맞춘 카드, ' + card.symbol;
      if (card.flipped) return '뒤집힌 카드, ' + card.symbol;
      return '가려진 카드';
    }

    function renderCard(index) {
      var card = state.deck[index];
      var button = buttons[index];
      var className = 'card';
      if (card.flipped) className += ' card--flipped';
      if (card.matched) className += ' card--matched';
      button.className = className;
      button.textContent = card.flipped || card.matched ? card.symbol : '';
      button.setAttribute('aria-label', cardLabel(card));
      button.disabled = card.matched || state.phase === 'comparing' || state.phase === 'done';
    }

    function renderAll() {
      for (var i = 0; i < state.deck.length; i++) renderCard(i);
      counterEl.textContent = String(state.moveCount);
      messageEl.textContent =
        state.phase === 'done' ? '모두 맞췄습니다! 총 ' + state.moveCount + '번 시도' : '';
    }

    function buildBoard() {
      boardEl.textContent = '';
      buttons = [];
      for (var i = 0; i < state.deck.length; i++) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'card';
        (function (index) {
          button.addEventListener('click', function () {
            handleCardClick(index);
          });
        })(i);
        boardEl.appendChild(button);
        buttons.push(button);
      }
    }

    function clearMismatchTimer() {
      if (mismatchTimer !== null) {
        clearTimeout(mismatchTimer);
        mismatchTimer = null;
      }
    }

    function scheduleMismatchRevert() {
      mismatchTimer = setTimeout(function () {
        mismatchTimer = null;
        var indices = state.flippedIndices;
        var newDeck = state.deck.slice();
        indices.forEach(function (i) {
          newDeck[i] = Object.assign({}, newDeck[i], { flipped: false });
        });
        state = Object.assign({}, state, {
          deck: newDeck,
          flippedIndices: [],
          phase: 'idle'
        });
        renderAll();
      }, MISMATCH_DELAY_MS);
    }

    function handleCardClick(index) {
      var nextState = applyFlip(state, index);
      if (nextState === state) return;
      state = nextState;
      renderAll();
      if (state.phase === 'comparing') {
        scheduleMismatchRevert();
      }
    }

    function restart() {
      clearMismatchTimer();
      state = {
        deck: createDeck(SYMBOLS),
        flippedIndices: [],
        moveCount: 0,
        phase: 'idle'
      };
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
    applyFlip: applyFlip
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.MemoryGame = api;
  }
})();

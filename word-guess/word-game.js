'use strict';

var WORDS = ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'MANGO', 'LEMON', 'CHERRY', 'PEACH'];
var MAX_MISS = 6;
var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function revealState(word, guesses) {
  return word.split('').map(function (ch) {
    return guesses.indexOf(ch) !== -1 ? ch : '_';
  });
}

function judgeGame(word, guesses, maxMiss) {
  var wordLetters = [];
  word.split('').forEach(function (ch) {
    if (wordLetters.indexOf(ch) === -1) wordLetters.push(ch);
  });

  var guessSet = [];
  guesses.forEach(function (g) {
    if (guessSet.indexOf(g) === -1) guessSet.push(g);
  });

  var allRevealed = wordLetters.every(function (ch) {
    return guessSet.indexOf(ch) !== -1;
  });
  if (allRevealed) return 'won';

  var wrongCount = guessSet.filter(function (g) {
    return wordLetters.indexOf(g) === -1;
  }).length;
  if (wrongCount >= maxMiss) return 'lost';

  return 'playing';
}

function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

if (typeof document !== 'undefined' && document.getElementById('word-guess-root')) {
  (function () {
    var wordDisplayEl = document.getElementById('word-display');
    var keyboardEl = document.getElementById('keyboard');
    var messageEl = document.getElementById('message');
    var triesLeftEl = document.getElementById('tries-left');
    var restartBtn = document.getElementById('restart-btn');

    var state = {
      word: pickWord(),
      guesses: [],
      status: 'playing'
    };

    var buttons = {};

    function buildKeyboard() {
      LETTERS.forEach(function (letter) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'letter-btn-' + letter;
        btn.className = 'letter-btn';
        btn.textContent = letter;
        btn.dataset.letter = letter;
        btn.addEventListener('click', function () {
          guessLetter(letter);
        });
        keyboardEl.appendChild(btn);
        buttons[letter] = btn;
      });
    }

    function render() {
      wordDisplayEl.textContent = revealState(state.word, state.guesses).join(' ');

      var wrongCount = state.guesses.filter(function (g) {
        return state.word.indexOf(g) === -1;
      }).filter(function (g, idx, arr) {
        return arr.indexOf(g) === idx;
      }).length;
      triesLeftEl.textContent = '남은 기회: ' + String(MAX_MISS - wrongCount) + '회';

      if (state.status === 'won') {
        messageEl.textContent = '승리! 정답은 ' + state.word + ' 입니다.';
      } else if (state.status === 'lost') {
        messageEl.textContent = '패배... 정답은 ' + state.word + ' 입니다.';
      } else {
        messageEl.textContent = '';
      }

      LETTERS.forEach(function (letter) {
        var btn = buttons[letter];
        var wasGuessed = state.guesses.indexOf(letter) !== -1;
        var locked = state.status !== 'playing';

        btn.classList.remove('letter-btn--correct', 'letter-btn--wrong');

        if (locked || wasGuessed) {
          btn.disabled = true;
          btn.setAttribute('aria-disabled', 'true');
          btn.classList.add('letter-btn--disabled');
        } else {
          btn.disabled = false;
          btn.setAttribute('aria-disabled', 'false');
          btn.classList.remove('letter-btn--disabled');
        }

        if (wasGuessed) {
          if (state.word.indexOf(letter) !== -1) {
            btn.classList.add('letter-btn--correct');
            btn.setAttribute('aria-label', letter + ' 정답');
          } else {
            btn.classList.add('letter-btn--wrong');
            btn.setAttribute('aria-label', letter + ' 오답');
          }
        } else {
          btn.setAttribute('aria-label', letter);
        }
      });
    }

    function guessLetter(letter) {
      if (state.status !== 'playing') return;
      if (state.guesses.indexOf(letter) !== -1) return;

      state.guesses.push(letter);
      state.status = judgeGame(state.word, state.guesses, MAX_MISS);
      render();
    }

    function restart() {
      state.word = pickWord();
      state.guesses = [];
      state.status = 'playing';
      render();
    }

    buildKeyboard();
    render();

    restartBtn.addEventListener('click', restart);

    document.addEventListener('keydown', function (e) {
      var key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        guessLetter(key);
      }
    });
  })();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { revealState: revealState, judgeGame: judgeGame };
}

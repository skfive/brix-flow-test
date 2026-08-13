'use strict';

var SOLVED_BOARD = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null];
var SHUFFLE_MOVE_COUNT = 150;

function findBlankIndex(board) {
  return board.indexOf(null);
}

function getNeighbors(index) {
  var neighbors = [];
  if (index >= 4) neighbors.push(index - 4); // up
  if (index < 12) neighbors.push(index + 4); // down
  if (index % 4 !== 0) neighbors.push(index - 1); // left
  if (index % 4 !== 3) neighbors.push(index + 1); // right
  return neighbors;
}

function canMove(board, index) {
  if (index < 0 || index >= 16) return false;
  if (board[index] === null) return false;
  var blankIndex = findBlankIndex(board);
  return getNeighbors(index).indexOf(blankIndex) !== -1;
}

function applyMove(board, index) {
  if (!canMove(board, index)) return board;
  var blankIndex = findBlankIndex(board);
  var next = board.slice();
  next[blankIndex] = board[index];
  next[index] = null;
  return next;
}

function isSolved(board) {
  if (board.length !== SOLVED_BOARD.length) return false;
  for (var i = 0; i < SOLVED_BOARD.length; i++) {
    if (board[i] !== SOLVED_BOARD[i]) return false;
  }
  return true;
}

function getTargetIndexForKey(key, blankIndex) {
  if (key === 'ArrowUp') return blankIndex >= 4 ? blankIndex - 4 : null;
  if (key === 'ArrowDown') return blankIndex < 12 ? blankIndex + 4 : null;
  if (key === 'ArrowLeft') return blankIndex % 4 !== 0 ? blankIndex - 1 : null;
  if (key === 'ArrowRight') return blankIndex % 4 !== 3 ? blankIndex + 1 : null;
  return null;
}

function shuffleBoard(moves) {
  var moveCount = typeof moves === 'number' ? moves : SHUFFLE_MOVE_COUNT;
  var board = SOLVED_BOARD.slice();
  var lastBlankIndex = -1;
  for (var i = 0; i < moveCount; i++) {
    var blankIndex = findBlankIndex(board);
    var candidates = getNeighbors(blankIndex).filter(function (n) {
      return n !== lastBlankIndex;
    });
    if (candidates.length === 0) candidates = getNeighbors(blankIndex);
    var choice = candidates[Math.floor(Math.random() * candidates.length)];
    lastBlankIndex = blankIndex;
    board = applyMove(board, choice);
  }
  while (isSolved(board)) {
    var refreshBlankIndex = findBlankIndex(board);
    var refreshNeighbors = getNeighbors(refreshBlankIndex);
    board = applyMove(board, refreshNeighbors[0]);
  }
  return board;
}

function initPuzzleApp(doc) {
  var boardEl = doc.getElementById('puzzle-board');
  var shuffleButton = doc.getElementById('puzzle-shuffle-button');
  var moveCountEl = doc.getElementById('puzzle-move-count');
  var timerEl = doc.getElementById('puzzle-timer');
  var successEl = doc.getElementById('puzzle-success-message');
  var statusEl = doc.getElementById('puzzle-status');

  var STATE_LABEL = {
    idle: '대기 중',
    shuffling: '섞는 중',
    playing: '진행 중',
    solved: '완료',
  };

  var board = SOLVED_BOARD.slice();
  var state = 'idle';
  var moveCount = 0;
  var elapsedSeconds = 0;
  var timerId = null;

  function setState(next) {
    state = next;
    if (statusEl) statusEl.textContent = STATE_LABEL[next];
  }

  function updateMoveCount() {
    moveCountEl.textContent = '이동 횟수: ' + moveCount;
  }

  function updateTimer() {
    timerEl.textContent = '경과 시간: ' + elapsedSeconds + '초';
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerId = setInterval(function () {
      elapsedSeconds += 1;
      updateTimer();
    }, 1000);
  }

  function renderBoard() {
    boardEl.textContent = '';
    var blankIndex = findBlankIndex(board);
    board.forEach(function (value, index) {
      if (value === null) {
        var blankTile = doc.createElement('div');
        blankTile.className = 'puzzle-tile puzzle-tile--blank';
        blankTile.setAttribute('aria-hidden', 'true');
        boardEl.appendChild(blankTile);
        return;
      }
      var tile = doc.createElement('button');
      tile.type = 'button';
      tile.className = getNeighbors(index).indexOf(blankIndex) !== -1
        ? 'puzzle-tile puzzle-tile--movable'
        : 'puzzle-tile';
      tile.textContent = String(value);
      tile.setAttribute('aria-label', '타일 ' + value);
      tile.addEventListener('click', function () {
        attemptMove(index);
      });
      boardEl.appendChild(tile);
    });
  }

  function triggerInvalidFeedback(index) {
    var tile = boardEl.children[index];
    if (!tile) return;
    tile.classList.add('puzzle-tile--invalid');
    setTimeout(function () {
      tile.classList.remove('puzzle-tile--invalid');
    }, 200);
  }

  function finishGame() {
    stopTimer();
    setState('solved');
    successEl.textContent =
      '축하합니다! 퍼즐을 완성했습니다. (이동 횟수: ' + moveCount + ', 경과 시간: ' + elapsedSeconds + '초)';
  }

  function attemptMove(index) {
    if (state !== 'playing') return;
    if (!canMove(board, index)) {
      triggerInvalidFeedback(index);
      return;
    }
    board = applyMove(board, index);
    moveCount += 1;
    updateMoveCount();
    renderBoard();
    if (isSolved(board)) finishGame();
  }

  function handleShuffleClick() {
    shuffleButton.disabled = true;
    setState('shuffling');
    successEl.textContent = '';
    moveCount = 0;
    updateMoveCount();
    stopTimer();
    elapsedSeconds = 0;
    updateTimer();

    board = shuffleBoard();
    renderBoard();
    setState('playing');
    startTimer();
    shuffleButton.disabled = false;
  }

  function handleKeydown(event) {
    if (state !== 'playing') return;
    var blankIndex = findBlankIndex(board);
    var target = getTargetIndexForKey(event.key, blankIndex);
    if (target === null) return;
    event.preventDefault();
    attemptMove(target);
  }

  shuffleButton.addEventListener('click', handleShuffleClick);
  doc.addEventListener('keydown', handleKeydown);

  renderBoard();
  updateMoveCount();
  updateTimer();
  setState('idle');
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    initPuzzleApp(document);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { canMove: canMove, applyMove: applyMove, isSolved: isSolved };
}

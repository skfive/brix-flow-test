'use strict';

(function () {
  var WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  function checkWinner(board) {
    if (!Array.isArray(board) || board.length !== 9) {
      return { winner: null, lines: [] };
    }
    var winner = null;
    var lines = [];
    WIN_LINES.forEach(function (line) {
      var a = line[0];
      var b = line[1];
      var c = line[2];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        if (winner === null) {
          winner = board[a];
        }
        if (board[a] === winner) {
          lines.push(line);
        }
      }
    });
    return { winner: winner, lines: lines };
  }

  function isDraw(board, checkWinnerResult) {
    if (!Array.isArray(board) || board.length !== 9) {
      return false;
    }
    var hasEmpty = board.some(function (cell) {
      return cell === null;
    });
    if (hasEmpty) {
      return false;
    }
    if (checkWinnerResult && checkWinnerResult.winner !== null) {
      return false;
    }
    return true;
  }

  if (typeof document !== 'undefined') {
    var boardEl = null;
    var statusEl = null;
    var restartBtnEl = null;
    var cellEls = [];
    var board = [];
    var currentPlayer = 'X';
    var locked = false;

    function createInitialBoard() {
      return new Array(9).fill(null);
    }

    function renderCell(index) {
      var cellEl = cellEls[index];
      var value = board[index];
      cellEl.textContent = value || '';
      cellEl.dataset.value = value || '';
    }

    function renderAll(winResult) {
      for (var i = 0; i < 9; i++) {
        renderCell(i);
        cellEls[i].classList.remove('cell--win');
      }
      winResult.lines.forEach(function (line) {
        line.forEach(function (index) {
          cellEls[index].classList.add('cell--win');
        });
      });
    }

    function updateStatus(winResult, draw) {
      if (winResult.winner) {
        statusEl.textContent = winResult.winner + ' 승리!';
        return;
      }
      if (draw) {
        statusEl.textContent = '무승부입니다';
        return;
      }
      statusEl.textContent = currentPlayer + '의 차례입니다';
    }

    function handleCellClick(index) {
      if (locked || board[index] !== null) {
        return;
      }
      board[index] = currentPlayer;
      var winResult = checkWinner(board);
      var draw = isDraw(board, winResult);

      renderAll(winResult);

      if (winResult.winner || draw) {
        locked = true;
        updateStatus(winResult, draw);
        return;
      }
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      updateStatus(winResult, draw);
    }

    function restart() {
      board = createInitialBoard();
      currentPlayer = 'X';
      locked = false;
      var emptyResult = { winner: null, lines: [] };
      renderAll(emptyResult);
      updateStatus(emptyResult, false);
    }

    function buildBoard() {
      for (var i = 0; i < 9; i++) {
        var row = Math.floor(i / 3) + 1;
        var col = (i % 3) + 1;
        var cellEl = document.createElement('button');
        cellEl.type = 'button';
        cellEl.className = 'cell';
        cellEl.setAttribute('aria-label', '칸 ' + row + ',' + col);
        (function (index) {
          cellEl.addEventListener('click', function () {
            handleCellClick(index);
          });
        })(i);
        boardEl.appendChild(cellEl);
        cellEls.push(cellEl);
      }
    }

    function initGame() {
      boardEl = document.getElementById('board');
      statusEl = document.getElementById('status');
      restartBtnEl = document.getElementById('restart-btn');

      if (!boardEl || !statusEl || !restartBtnEl) {
        return;
      }

      buildBoard();
      restartBtnEl.addEventListener('click', restart);
      restart();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initGame);
    } else {
      initGame();
    }
  }

  globalThis.TicTacToe = {
    checkWinner: checkWinner,
    isDraw: isDraw
  };
})();

// FIXME(BF-1696): none — 초기 구현
// 렌더링 · 키보드 입력 · 게임 루프 · 일시정지/재시작 wiring.
// 게임 로직은 game.js 에서만 구현하며, 이 파일은 그 결과를 화면에 반영한다.

import { createGame } from './game.js';

const TICK_INTERVAL_MS = 150;

const KEY_TO_DIRECTION = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

function readDesignTokens() {
  const styles = getComputedStyle(document.documentElement);
  return {
    board: styles.getPropertyValue('--color-board').trim(),
    snake: styles.getPropertyValue('--color-snake').trim(),
    food: styles.getPropertyValue('--color-food').trim(),
  };
}

function init() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const scoreValueEl = document.querySelector('#score-display .score-value');
  const pauseButton = document.getElementById('pause-button');
  const restartButton = document.getElementById('restart-button');
  const overlay = document.getElementById('status-overlay');
  const overlayMessage = document.getElementById('overlay-message');
  const finalScore = document.getElementById('final-score');

  const tokens = readDesignTokens();
  const game = createGame({ columns: 20, rows: 20 });

  function render() {
    const state = game.getState();
    const cellWidth = canvas.width / state.columns;
    const cellHeight = canvas.height / state.rows;

    ctx.fillStyle = tokens.board;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state.food) {
      ctx.fillStyle = tokens.food;
      ctx.fillRect(
        state.food.x * cellWidth,
        state.food.y * cellHeight,
        cellWidth,
        cellHeight
      );
    }

    ctx.fillStyle = tokens.snake;
    for (const segment of state.snake) {
      ctx.fillRect(segment.x * cellWidth, segment.y * cellHeight, cellWidth, cellHeight);
    }

    scoreValueEl.textContent = String(state.score);

    updateControls(state);
    updateOverlay(state);
  }

  function updateControls(state) {
    pauseButton.disabled = state.status === 'game-over';
    if (state.status === 'paused') {
      pauseButton.textContent = '계속하기';
      pauseButton.setAttribute('aria-label', '계속하기');
    } else {
      pauseButton.textContent = '일시정지';
      pauseButton.setAttribute('aria-label', '일시정지');
    }
  }

  function updateOverlay(state) {
    overlay.classList.remove('overlay--hidden', 'overlay--paused', 'overlay--game-over');

    if (state.status === 'paused') {
      overlay.classList.add('overlay--paused');
      overlayMessage.textContent = '일시정지';
      finalScore.textContent = '';
      pauseButton.focus();
    } else if (state.status === 'game-over') {
      overlay.classList.add('overlay--game-over');
      overlayMessage.textContent = '게임 오버';
      finalScore.textContent = `최종 점수: ${state.score}`;
      restartButton.focus();
    } else {
      overlay.classList.add('overlay--hidden');
      overlayMessage.textContent = '';
      finalScore.textContent = '';
    }
  }

  function handleKeydown(event) {
    const direction = KEY_TO_DIRECTION[event.key];
    if (!direction) {
      return;
    }
    event.preventDefault();
    game.setDirection(direction);
    render();
  }

  function handlePauseToggle() {
    const state = game.getState();
    if (state.status === 'playing') {
      game.pause();
    } else if (state.status === 'paused') {
      game.resume();
    }
    render();
  }

  function handleRestart() {
    game.reset();
    render();
  }

  window.addEventListener('keydown', handleKeydown);
  pauseButton.addEventListener('click', handlePauseToggle);
  restartButton.addEventListener('click', handleRestart);

  setInterval(() => {
    game.tick();
    render();
  }, TICK_INTERVAL_MS);

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

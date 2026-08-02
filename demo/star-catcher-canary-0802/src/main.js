// 별빛 수집가 — DOM 바인딩/렌더링 (game.js의 순수 상태를 화면에 반영)
import {
  createInitialState,
  startGame,
  pauseGame,
  resumeGame,
  restartGame,
  tick,
  moveCatcher,
  collectStar,
} from './game.js';

const STATUS_LABEL = {
  idle: '대기 중 — 시작 버튼을 눌러 별빛 수집을 시작하세요',
  running: '진행 중 — 별을 수집하세요',
  paused: '일시정지됨',
  ended: '게임 종료',
};

function init() {
  const gameRoot = document.getElementById('game-root');
  const gameBoard = document.getElementById('game-board');
  const scoreValue = document.getElementById('score-value');
  const comboValue = document.getElementById('combo-value');
  const missedValue = document.getElementById('missed-value');
  const timerValue = document.getElementById('timer-value');
  const gameStatus = document.getElementById('game-status');
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const restartBtn = document.getElementById('restart-btn');

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  let state = createInitialState();
  let lastFrameTime = null;
  let rafId = null;

  function statusText(current) {
    if (current.status === 'ended') {
      return `게임 종료 — 최종 점수 ${current.score}점`;
    }
    return STATUS_LABEL[current.status];
  }

  function render() {
    const focusedControl = document.activeElement;

    scoreValue.textContent = String(state.score);
    comboValue.textContent = String(state.combo);
    missedValue.textContent = String(state.missed);
    timerValue.textContent = String(Math.ceil(state.timeRemaining));
    gameStatus.textContent = statusText(state);

    startBtn.disabled = state.status !== 'idle';
    pauseBtn.disabled = state.status !== 'running' && state.status !== 'paused';
    pauseBtn.textContent = state.status === 'paused' ? '재개' : '일시정지';
    pauseBtn.setAttribute(
      'aria-label',
      state.status === 'paused' ? '게임 재개' : '게임 일시정지'
    );

    if (
      (focusedControl === startBtn || focusedControl === pauseBtn || focusedControl === restartBtn) &&
      document.activeElement === document.body
    ) {
      gameRoot.focus();
    }

    gameBoard.innerHTML = '';
    for (const star of state.stars) {
      const starEl = document.createElement('div');
      starEl.className = 'star-catcher__star';
      starEl.style.setProperty('--sc-star-column', String(star.column));
      starEl.style.setProperty('--sc-star-y', `${star.y}%`);
      if (prefersReducedMotion) {
        starEl.classList.add('star-catcher__star--reduced-motion');
      }
      gameBoard.appendChild(starEl);
    }

    const catcherEl = gameBoard.querySelector('.star-catcher__catcher') ||
      (() => {
        const el = document.createElement('div');
        el.className = 'star-catcher__catcher';
        gameBoard.appendChild(el);
        return el;
      })();
    catcherEl.style.setProperty('--sc-catcher-column', String(state.catcherColumn));
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastFrameTime = null;
  }

  function loop(now) {
    if (state.status !== 'running') {
      stopLoop();
      return;
    }
    if (lastFrameTime === null) lastFrameTime = now;
    const deltaMs = now - lastFrameTime;
    lastFrameTime = now;
    state = tick(state, deltaMs);
    render();
    if (state.status === 'running') {
      rafId = requestAnimationFrame(loop);
    } else {
      stopLoop();
    }
  }

  function startLoop() {
    stopLoop();
    rafId = requestAnimationFrame(loop);
  }

  startBtn.addEventListener('click', () => {
    state = startGame(state);
    render();
    if (state.status === 'running') startLoop();
  });

  pauseBtn.addEventListener('click', () => {
    if (state.status === 'running') {
      state = pauseGame(state);
      stopLoop();
    } else if (state.status === 'paused') {
      state = resumeGame(state);
      startLoop();
    }
    render();
  });

  restartBtn.addEventListener('click', () => {
    stopLoop();
    state = restartGame(state);
    render();
  });

  gameRoot.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      state = moveCatcher(state, 'left');
      render();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      state = moveCatcher(state, 'right');
      render();
    } else if (event.key === ' ' || event.key === 'Enter') {
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        return;
      }
      event.preventDefault();
      state = collectStar(state);
      render();
    }
  });

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

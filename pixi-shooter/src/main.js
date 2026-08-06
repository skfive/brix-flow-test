// 엔트리 포인트: DOM(#game-root, #game-canvas) 초기화, 입력 바인딩, gameLogic·renderer 연결, 게임 루프 구동.

import {
  STATUS,
  createGameState,
  startGame,
  pauseGame,
  resumeGame,
  update,
} from './logic/gameLogic.js';
import { createRenderer } from './render/renderer.js';

const BEST_SCORE_KEY = 'pixi-shooter:best-score';
const MAX_DT = 0.05; // 탭 비활성 등으로 프레임 간격이 벌어져도 물리 폭주 방지

const STATUS_LABEL = {
  [STATUS.READY]: 'ready',
  [STATUS.PLAYING]: 'playing',
  [STATUS.PAUSED]: 'paused',
  [STATUS.GAMEOVER]: 'gameover',
};

function loadBestScore() {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_KEY);
    const parsed = raw == null ? 0 : Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    // localStorage 접근 불가 환경(프라이빗 모드 등) — 최고 점수 0으로 시작
    return 0;
  }
}

function saveBestScore(value) {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(value));
  } catch {
    // 저장 실패는 게임 진행에 영향을 주지 않는다
  }
}

function bindInput(state, input) {
  window.addEventListener('keydown', (event) => {
    switch (event.code) {
      case 'ArrowLeft':
        input.left = true;
        event.preventDefault();
        break;
      case 'ArrowRight':
        input.right = true;
        event.preventDefault();
        break;
      case 'ArrowUp':
        input.up = true;
        event.preventDefault();
        break;
      case 'ArrowDown':
        input.down = true;
        event.preventDefault();
        break;
      case 'Space':
        event.preventDefault();
        if (!event.repeat && (state.status === STATUS.READY || state.status === STATUS.GAMEOVER)) {
          startGame(state);
        }
        input.fire = true;
        break;
      case 'Escape':
      case 'KeyP':
        if (state.status === STATUS.PLAYING) pauseGame(state);
        else if (state.status === STATUS.PAUSED) resumeGame(state);
        break;
      default:
        break;
    }
  });

  window.addEventListener('keyup', (event) => {
    switch (event.code) {
      case 'ArrowLeft':
        input.left = false;
        break;
      case 'ArrowRight':
        input.right = false;
        break;
      case 'ArrowUp':
        input.up = false;
        break;
      case 'ArrowDown':
        input.down = false;
        break;
      case 'Space':
        input.fire = false;
        break;
      default:
        break;
    }
  });
}

async function main() {
  const canvas = document.getElementById('game-canvas');
  const statusEl = document.getElementById('game-status');

  const state = createGameState({ bestScore: loadBestScore() });
  const renderer = await createRenderer(canvas, state.config);

  const input = { left: false, right: false, up: false, down: false, fire: false };
  bindInput(state, input);

  let lastStatus = null;
  let lastBestScore = state.bestScore;

  function syncSideEffects() {
    if (state.status !== lastStatus) {
      lastStatus = state.status;
      if (statusEl) statusEl.textContent = STATUS_LABEL[state.status];
    }
    if (state.bestScore !== lastBestScore) {
      lastBestScore = state.bestScore;
      saveBestScore(state.bestScore);
    }
  }

  let previousTime = performance.now();

  function loop(now) {
    const dt = Math.min(MAX_DT, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;

    if (state.status === STATUS.PLAYING) {
      update(state, dt, input, Math.random);
    }
    renderer.render(state, dt);
    syncSideEffects();

    requestAnimationFrame(loop);
  }

  syncSideEffects();
  requestAnimationFrame(loop);
}

main();

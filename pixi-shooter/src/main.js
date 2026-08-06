// 엔트리 포인트: DOM(#game-root, #game-canvas) 초기화, 입력 바인딩, gameLogic·renderer 연결, 게임 루프 구동.

import {
  STATUS,
  createGameState,
  startGame,
  pauseGame,
  resumeGame,
  update,
} from './logic/gameLogic.js';
import { createRenderer, STATUS_TEXT } from './render/renderer.js';

const BEST_SCORE_KEY = 'pixi-shooter:best-score';
const MAX_DT = 0.05; // 탭 비활성 등으로 프레임 간격이 벌어져도 물리 폭주 방지

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
        if (!event.repeat) {
          if (state.status === STATUS.READY || state.status === STATUS.GAMEOVER) {
            startGame(state);
          } else if (state.status === STATUS.PAUSED) {
            // design.md §7.2/§9: 재개는 Space로 수행하되, 재개를 트리거한 이 keydown 자체는
            // 발사로 새지 않도록 input.fire를 세우지 않고 즉시 반환한다(재개 직후 1프레임 발사 억제).
            resumeGame(state);
            break;
          }
        }
        if (state.status === STATUS.PLAYING) input.fire = true;
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

// design.md §7.2/§9: playing → paused 전이는 별도 키가 아닌 창 포커스 상실(blur)/탭 비활성(visibilitychange)으로
// 자동 트리거한다 — 방향키+Space만으로 전체 플로우를 조작한다는 접근성 계약을 지키기 위함(재개는 Space, bindInput 참고).
function bindAutoPause(state) {
  const tryPause = () => {
    if (state.status === STATUS.PLAYING) pauseGame(state);
  };
  window.addEventListener('blur', tryPause);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) tryPause();
  });
}

async function main() {
  const canvas = document.getElementById('game-canvas');
  const statusEl = document.getElementById('game-status');

  const state = createGameState({ bestScore: loadBestScore() });
  const renderer = await createRenderer(canvas, state.config);

  const input = { left: false, right: false, up: false, down: false, fire: false };
  bindInput(state, input);
  bindAutoPause(state);

  let lastStatus = null;
  let lastBestScore = state.bestScore;

  function syncSideEffects() {
    if (state.status !== lastStatus) {
      lastStatus = state.status;
      // 화면 텍스트(renderer STATUS_TEXT)와 접근성 이름을 동일하게 유지한다(design.md §8).
      if (statusEl) statusEl.textContent = STATUS_TEXT[state.status].main;
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

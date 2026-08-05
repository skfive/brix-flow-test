// pixi-breakout/src/renderer.js
//
// 렌더링 계층 (BF-1702).
// - PixiJS(전역 window.PIXI, index.html의 CDN <script>가 주입)와 DOM 접근을 전담한다.
// - game-logic.js가 생성한 state를 입력받아 canvas(PixiJS Application)에 그리고
//   HUD/overlay DOM을 동기화한다.
// - 프레임마다 새 PixiJS 객체를 대량 할당하지 않는다: Graphics는 초기화 시 1회만
//   생성하고, 매 프레임에는 position/visible 갱신 또는 상태가 실제로 바뀐 경우에만
//   clear() 후 재드로우한다.

import {
  createInitialState,
  startGame,
  togglePause,
  restartGame,
  movePaddleTo,
  movePaddleByDirection,
  update,
} from './game-logic.js';

const PIXI = window.PIXI;

if (!PIXI) {
  throw new Error('PixiJS(window.PIXI)를 찾을 수 없습니다. index.html의 CDN <script> 로드 순서를 확인하세요.');
}

const COLORS = {
  bg: 0x0b1021,
  brickTier1: 0x38bdf8,
  brickTier2: 0x818cf8,
  brickTier3: 0xf472b6,
  ball: 0xfacc15,
  paddle: 0xe2e8f0,
  spot: 0x0b1021,
};

const TIER_COLOR = {
  1: COLORS.brickTier1,
  2: COLORS.brickTier2,
  3: COLORS.brickTier3,
};

const STATUS_LABEL = {
  start: '시작 전',
  playing: '진행 중',
  paused: '일시정지',
  'game-over': '게임 오버',
  clear: '클리어',
};

const OVERLAY_CLASS_BY_STATUS = {
  start: 'overlay--start',
  paused: 'overlay--paused',
  'game-over': 'overlay--gameover',
  clear: 'overlay--clear',
};

const ALL_OVERLAY_CLASSES = ['overlay--start', 'overlay--paused', 'overlay--gameover', 'overlay--clear'];

function createBrickGraphics(brick) {
  const graphics = new PIXI.Graphics();
  graphics.x = brick.x;
  graphics.y = brick.y;
  paintBrick(graphics, brick);
  return graphics;
}

// 벽돌 표면을 tier 색상 + spot 패턴(접근성: 색상만으로 구분하지 않음)으로 그린다.
// hits가 바뀔 때만 호출된다(프레임마다 호출하지 않음).
function paintBrick(graphics, brick) {
  graphics.clear();
  graphics.beginFill(TIER_COLOR[brick.tier] ?? COLORS.brickTier1);
  graphics.drawRoundedRect(0, 0, brick.width, brick.height, 3);
  graphics.endFill();

  const spotCount = brick.hits;
  const spotRadius = 2;
  const padding = 8;
  const usableWidth = Math.max(brick.width - padding * 2, 1);
  for (let i = 0; i < spotCount; i += 1) {
    const spotX = spotCount === 1 ? brick.width / 2 : padding + (usableWidth * i) / (spotCount - 1);
    graphics.beginFill(COLORS.spot, 0.85);
    graphics.drawCircle(spotX, brick.height / 2, spotRadius);
    graphics.endFill();
  }
}

export function createGameView(rootDocument = document) {
  const dom = {
    gameRoot: rootDocument.getElementById('game-root'),
    overlay: rootDocument.getElementById('game-overlay'),
    overlayMessage: rootDocument.getElementById('overlay-message'),
    scoreValue: rootDocument.getElementById('score-value'),
    livesValue: rootDocument.getElementById('lives-value'),
    bestScoreValue: rootDocument.getElementById('best-score-value'),
    pauseButton: rootDocument.getElementById('pause-button'),
    restartButton: rootDocument.getElementById('restart-button'),
  };

  let state = createInitialState();

  const app = new PIXI.Application({
    width: state.board.width,
    height: state.board.height,
    backgroundColor: COLORS.bg,
    antialias: true,
  });
  app.view.setAttribute('role', 'img');
  app.view.setAttribute('aria-label', '벽돌깨기 게임 보드');
  dom.gameRoot.insertBefore(app.view, dom.gameRoot.firstChild);

  const boardBg = new PIXI.Graphics();
  boardBg.beginFill(COLORS.bg);
  boardBg.drawRect(0, 0, state.board.width, state.board.height);
  boardBg.endFill();
  app.stage.addChild(boardBg);

  const brickLayer = new PIXI.Container();
  app.stage.addChild(brickLayer);

  const brickGraphicsById = new Map();
  const brickLastHitsById = new Map();
  state.bricks.forEach((brick) => {
    const graphics = createBrickGraphics(brick);
    brickGraphicsById.set(brick.id, graphics);
    brickLastHitsById.set(brick.id, brick.hits);
    brickLayer.addChild(graphics);
  });

  const paddleGraphics = new PIXI.Graphics();
  paddleGraphics.beginFill(COLORS.paddle);
  paddleGraphics.drawRoundedRect(0, 0, state.paddle.width, state.paddle.height, 4);
  paddleGraphics.endFill();
  app.stage.addChild(paddleGraphics);

  const ballGraphics = new PIXI.Graphics();
  ballGraphics.beginFill(COLORS.ball);
  ballGraphics.drawCircle(0, 0, state.ball.radius);
  ballGraphics.endFill();
  app.stage.addChild(ballGraphics);

  let lastOverlayStatus = null;
  let lastPauseButtonStatus = null;
  let lastScoreText = null;
  let lastLivesText = null;
  let lastBestScoreText = null;

  function renderHud(current) {
    const scoreText = String(current.score);
    if (scoreText !== lastScoreText) {
      dom.scoreValue.textContent = scoreText;
      lastScoreText = scoreText;
    }
    const livesText = String(current.lives);
    if (livesText !== lastLivesText) {
      dom.livesValue.textContent = livesText;
      lastLivesText = livesText;
    }
    const bestScoreText = String(current.bestScore);
    if (bestScoreText !== lastBestScoreText) {
      dom.bestScoreValue.textContent = bestScoreText;
      lastBestScoreText = bestScoreText;
    }
  }

  function renderOverlay(current) {
    if (current.status === lastOverlayStatus) return;
    lastOverlayStatus = current.status;
    dom.overlay.classList.remove(...ALL_OVERLAY_CLASSES);
    const overlayClass = OVERLAY_CLASS_BY_STATUS[current.status];
    if (overlayClass) dom.overlay.classList.add(overlayClass);
    dom.overlay.setAttribute('data-state', current.status);
    dom.overlayMessage.textContent = STATUS_LABEL[current.status] ?? current.status;
  }

  function renderPauseButton(current) {
    if (current.status === lastPauseButtonStatus) return;
    lastPauseButtonStatus = current.status;

    if (current.status === 'start') {
      dom.pauseButton.textContent = '시작';
      dom.pauseButton.setAttribute('aria-label', '게임 시작');
      dom.pauseButton.setAttribute('aria-pressed', 'false');
      dom.pauseButton.disabled = false;
    } else if (current.status === 'playing') {
      dom.pauseButton.textContent = '일시정지';
      dom.pauseButton.setAttribute('aria-label', '일시정지');
      dom.pauseButton.setAttribute('aria-pressed', 'false');
      dom.pauseButton.disabled = false;
    } else if (current.status === 'paused') {
      dom.pauseButton.textContent = '재개';
      dom.pauseButton.setAttribute('aria-label', '게임 재개');
      dom.pauseButton.setAttribute('aria-pressed', 'true');
      dom.pauseButton.disabled = false;
    } else {
      dom.pauseButton.textContent = '일시정지';
      dom.pauseButton.setAttribute('aria-label', '일시정지');
      dom.pauseButton.setAttribute('aria-pressed', 'false');
      dom.pauseButton.disabled = true;
    }
  }

  function renderBricks(current) {
    current.bricks.forEach((brick) => {
      const graphics = brickGraphicsById.get(brick.id);
      if (!graphics) return;
      graphics.visible = brick.alive;
      if (!brick.alive) return;
      if (brickLastHitsById.get(brick.id) !== brick.hits) {
        brickLastHitsById.set(brick.id, brick.hits);
        paintBrick(graphics, brick);
      }
    });
  }

  function renderScene(current) {
    ballGraphics.x = current.ball.x;
    ballGraphics.y = current.ball.y;
    paddleGraphics.x = current.paddle.x;
    paddleGraphics.y = current.paddle.y;
    renderBricks(current);
  }

  function render(current) {
    renderScene(current);
    renderHud(current);
    renderOverlay(current);
    renderPauseButton(current);
  }

  const keys = { left: false, right: false };

  function handleKeydown(event) {
    if (event.key === 'ArrowLeft') {
      keys.left = true;
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      keys.right = true;
      event.preventDefault();
    }
  }

  function handleKeyup(event) {
    if (event.key === 'ArrowLeft') keys.left = false;
    else if (event.key === 'ArrowRight') keys.right = false;
  }

  function handlePointerMove(event) {
    if (state.status !== 'playing') return;
    const rect = app.view.getBoundingClientRect();
    const scaleX = state.board.width / rect.width;
    const localX = (event.clientX - rect.left) * scaleX;
    state = movePaddleTo(state, localX - state.paddle.width / 2);
  }

  function handlePauseButtonClick() {
    if (state.status === 'start') {
      state = startGame(state);
    } else if (state.status === 'playing' || state.status === 'paused') {
      state = togglePause(state);
    }
    render(state);
  }

  function handleRestartButtonClick() {
    dom.restartButton.disabled = true;
    state = restartGame(state);
    render(state);
    dom.restartButton.disabled = false;
  }

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
  app.view.addEventListener('pointermove', handlePointerMove);
  dom.pauseButton.addEventListener('click', handlePauseButtonClick);
  dom.restartButton.addEventListener('click', handleRestartButtonClick);

  app.ticker.add(() => {
    if (state.status === 'playing') {
      const dtSeconds = app.ticker.deltaMS / 1000;
      const direction = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (direction !== 0) {
        state = movePaddleByDirection(state, direction, dtSeconds);
      }
      state = update(state, dtSeconds);
    }
    render(state);
  });

  render(state);

  return {
    app,
    getState: () => state,
  };
}

createGameView();

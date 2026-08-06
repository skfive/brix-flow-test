// Star Collector — Phaser 렌더링/입력/DOM 갱신 계층 (CDN Phaser 전역 사용)
//
// 게임 상태 계산은 전적으로 logic.js의 순수 함수에 위임하고,
// 이 모듈은 그 결과를 캔버스와 frozen selector(HUD/overlay)에 반영한다.

import {
  STATES,
  STATUS_TEXT,
  WORLD,
  createInitialState,
  startGame,
  pauseGame,
  resumeGame,
  restartGame,
  stepGame,
} from './logic.js';

const COLORS = {
  bg: 0x0f172a,
  player: 0x38bdf8,
  star: 0xfbbf24,
  hazard: 0xef4444,
  platform: 0x334155,
};

const dom = {
  root: document.getElementById('game-root'),
  canvas: document.getElementById('game-canvas'),
  score: document.getElementById('hud-score'),
  overlay: document.getElementById('game-overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  restartButton: document.getElementById('restart-button'),
};

let state = createInitialState();
const rng = Math.random;

function setState(next) {
  state = next;
  syncDom();
}

/** HUD 점수 · overlay 상태 텍스트/클래스 · restart 버튼 활성화를 DOM에 반영 */
function syncDom() {
  if (dom.score) {
    dom.score.textContent = `점수: ${state.score}`;
  }
  if (dom.overlay) {
    dom.overlay.className = `overlay overlay--${state.status}`;
    dom.overlay.hidden = state.status === STATES.PLAYING;
  }
  if (dom.overlayTitle) {
    const suffix =
      state.status === STATES.GAMEOVER ? ` · 최종 점수 ${state.score}` : '';
    dom.overlayTitle.textContent = `${STATUS_TEXT[state.status]}${suffix}`;
  }
  if (dom.restartButton) {
    // 시작/재시작 시에만 활성화, 진행/일시정지 중에는 비활성화
    const active =
      state.status === STATES.START || state.status === STATES.GAMEOVER;
    dom.restartButton.disabled = !active;
    dom.restartButton.textContent =
      state.status === STATES.GAMEOVER ? '다시 시작' : '시작';
  }
}

function beginGame() {
  setState(startGame(restartGame(state), rng));
}

class StarScene extends Phaser.Scene {
  constructor() {
    super('star');
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.gfx = this.add.graphics();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.enterKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    );
    this.pauseKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.P,
    );

    // 스페이스: start에서 게임 시작 / gameover에서 재시작
    this.spaceKey.on('down', () => {
      if (state.status === STATES.START || state.status === STATES.GAMEOVER) {
        beginGame();
      }
    });
    // Enter: gameover에서 재시작
    this.enterKey.on('down', () => {
      if (state.status === STATES.GAMEOVER) beginGame();
    });
    // P: 일시정지 토글
    this.pauseKey.on('down', () => {
      if (state.status === STATES.PLAYING) setState(pauseGame(state));
      else if (state.status === STATES.PAUSED) setState(resumeGame(state));
    });

    if (dom.restartButton) {
      dom.restartButton.addEventListener('click', () => {
        if (
          state.status === STATES.START ||
          state.status === STATES.GAMEOVER
        ) {
          beginGame();
        }
      });
    }

    syncDom();
    this.draw();
  }

  update() {
    if (state.status === STATES.PLAYING) {
      const input = {
        left: this.cursors.left.isDown,
        right: this.cursors.right.isDown,
        jump: this.cursors.up.isDown || this.spaceKey.isDown,
      };
      setState(stepGame(state, input, rng));
    }
    this.draw();
  }

  draw() {
    const g = this.gfx;
    g.clear();

    for (const p of state.platforms) {
      g.fillStyle(COLORS.platform, 1);
      g.fillRect(p.x, p.y, p.width, p.height);
    }
    for (const s of state.stars) {
      if (s.collected) continue;
      g.fillStyle(COLORS.star, 1);
      g.fillRect(s.x, s.y, s.width, s.height);
    }
    for (const h of state.hazards) {
      g.fillStyle(COLORS.hazard, 1);
      g.fillRect(h.x, h.y, h.width, h.height);
    }
    const player = state.player;
    g.fillStyle(COLORS.player, 1);
    g.fillRect(player.x, player.y, player.width, player.height);
  }
}

function boot() {
  // CDN 로드 실패 시 화면을 빈 상태로 방치하지 않고 상태 텍스트를 유지한다.
  if (typeof Phaser === 'undefined') {
    if (dom.overlayTitle) {
      dom.overlayTitle.textContent =
        'Phaser 로드 실패 — 네트워크를 확인한 뒤 새로고침하세요';
    }
    syncDom();
    return;
  }

  syncDom();

  // eslint-disable-next-line no-new
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-canvas',
    width: WORLD.WIDTH,
    height: WORLD.HEIGHT,
    backgroundColor: COLORS.bg,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    },
    scene: [StarScene],
  });
}

boot();

// Space Defender — Phaser 렌더링/입력 레이어 (BF-1718)
// 상태는 저장하지 않고 logic.js 순수 함수 반환값을 화면에 반영만 한다.
// Phaser/DOM/Math.random 주입은 이 파일에서만 수행한다.

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SHIP_Y,
  createInitialState,
  transition,
  moveShip,
  fireBullet,
  stepPhysics,
  resolveCollisions,
} from './logic.js';

const HIGHSCORE_KEY = 'space-defender-highscore';

// --- localStorage 최고 점수 입출력 (실패해도 게임 진행) ---
function loadHighScore() {
  try {
    const raw = window.localStorage.getItem(HIGHSCORE_KEY);
    const value = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(value) {
  try {
    window.localStorage.setItem(HIGHSCORE_KEY, String(value));
  } catch {
    /* localStorage 비활성 환경 무시 */
  }
}

// --- DOM 참조 ---
const dom = {
  hudScore: document.getElementById('hud-score'),
  hudLives: document.getElementById('hud-lives'),
  hudHighScore: document.getElementById('hud-highscore'),
  startScreen: document.getElementById('start-screen'),
  startButton: document.getElementById('start-button'),
  pauseOverlay: document.getElementById('pause-overlay'),
  gameoverScreen: document.getElementById('gameover-screen'),
  finalScore: document.getElementById('final-score'),
  restartButton: document.getElementById('restart-button'),
};

function renderHud(state) {
  dom.hudScore.textContent = `점수 ${state.score}`;
  dom.hudLives.textContent = `목숨 ${state.lives}`;
  dom.hudHighScore.textContent = `최고 ${state.highScore}`;
  dom.finalScore.textContent = `최종 점수 ${state.score}`;
}

function renderScreens(status) {
  dom.startScreen.hidden = status !== 'start';
  dom.pauseOverlay.hidden = status !== 'paused';
  dom.gameoverScreen.hidden = status !== 'gameover';
}

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // 순수 상태 (렌더 레이어가 보유하되 갱신은 logic 함수로만)
    this.state = createInitialState(loadHighScore());
    this.prevStatus = null;

    // 렌더용 Graphics
    this.gfx = this.add.graphics();

    // 입력
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keySpace = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    // P 일시정지 토글 (edge)
    this.keyP.on('down', () => {
      this.state = transition(this.state, 'togglePause');
    });
    // 스페이스 발사 (edge — 연사 간격 제한은 logic 이 담당)
    this.keySpace.on('down', () => {
      this.state = fireBullet(this.state, this.time.now);
    });

    // DOM control
    dom.startButton.addEventListener('click', () => this.startGame());
    dom.restartButton.addEventListener('click', () => this.restartGame());

    this.syncDom(true);
  }

  startGame() {
    this.state = transition(this.state, 'start');
    this.syncDom(true);
  }

  restartGame() {
    // 초기값 복원 → start 화면으로. control 재활성화.
    this.state = transition(this.state, 'restart');
    this.syncDom(true);
  }

  syncDom(force = false) {
    renderHud(this.state);
    if (force || this.state.status !== this.prevStatus) {
      renderScreens(this.state.status);
      this.prevStatus = this.state.status;
    }
  }

  update(time, delta) {
    let state = this.state;

    if (state.status === 'playing') {
      // 함선 이동 (좌우 방향키)
      const dir =
        (this.cursors.left.isDown ? -1 : 0) +
        (this.cursors.right.isDown ? 1 : 0);
      state = moveShip(state, dir, delta);

      // 물리 진행 + 충돌/점수 반영
      state = stepPhysics(state, delta, Math.random);
      state = resolveCollisions(state);

      // gameover 전이 시 최고 점수 저장
      if (state.status === 'gameover') {
        saveHighScore(state.highScore);
      }
    }

    this.state = state;
    this.syncDom();
    this.draw(state);
  }

  draw(state) {
    const g = this.gfx;
    g.clear();

    // 함선
    g.fillStyle(0x00e5ff, 1);
    g.fillTriangle(
      state.ship.x,
      SHIP_Y - 16,
      state.ship.x - 14,
      SHIP_Y + 12,
      state.ship.x + 14,
      SHIP_Y + 12,
    );

    // 탄
    g.fillStyle(0xe8ecf8, 1);
    for (const b of state.bullets) {
      g.fillRect(b.x - 2, b.y - 8, 4, 12);
    }

    // 적
    g.fillStyle(0xff3b6b, 1);
    for (const e of state.enemies) {
      g.fillRect(e.x - 12, e.y - 12, 24, 24);
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-canvas',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b0e1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: GameScene,
});

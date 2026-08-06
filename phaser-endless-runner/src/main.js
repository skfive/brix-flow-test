// main.js — Phaser 씬·렌더링·입력 부트스트랩.
// 판정 로직은 전부 game-logic.js(순수)에 있고, 이 파일은 상태를 화면에 그리기만 한다.

import {
  STATUS,
  STATUS_LABEL,
  CONFIG,
  createGame,
  startGame,
  pauseGame,
  resumeGame,
  restartGame,
  step,
} from './game-logic.js';

const HIGHSCORE_KEY = 'phaser-endless-runner:highscore';

// 색상 토큰(Phaser는 숫자 색상값을 쓰므로 0x 형태로 보관)
const COLOR = {
  ground: 0x334155,
  player: 0x38bdf8,
  obstacleGround: 0xf43f5e,
  obstacleAir: 0xa855f7,
  accent: 0xfbbf24,
};

function readHighScore() {
  try {
    const raw = window.localStorage.getItem(HIGHSCORE_KEY);
    const n = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeHighScore(value) {
  try {
    window.localStorage.setItem(HIGHSCORE_KEY, String(value));
  } catch {
    /* localStorage 불가 환경은 무시 */
  }
}

class RunnerScene extends Phaser.Scene {
  constructor() {
    super('runner');
  }

  create() {
    this.state = createGame({ rng: () => Math.random(), highScore: readHighScore() });
    this.input.keyboard.addCapture(['SPACE', 'UP', 'DOWN']);

    this.graphics = this.add.graphics();

    // 배경 스크롤용 지면 마커 위치(장식). 상태의 distance로 위상 이동한다.
    this.groundOffset = 0;

    // DOM 참조
    this.dom = {
      score: document.getElementById('hud-score'),
      distance: document.getElementById('hud-distance'),
      highscore: document.getElementById('hud-highscore'),
      startOverlay: document.getElementById('start-overlay'),
      pauseOverlay: document.getElementById('pause-overlay'),
      gameoverOverlay: document.getElementById('gameover-overlay'),
      gameoverScore: document.getElementById('gameover-score'),
      startButton: document.getElementById('start-button'),
      resumeButton: document.getElementById('resume-button'),
      restartButton: document.getElementById('restart-button'),
    };

    // 버튼 바인딩 — 각 전이 후 오버레이/컨트롤을 복원한다.
    this.dom.startButton.addEventListener('click', () => {
      this.state = startGame(this.state);
      this.syncDom();
    });
    this.dom.resumeButton.addEventListener('click', () => {
      this.state = resumeGame(this.state);
      this.syncDom();
    });
    this.dom.restartButton.addEventListener('click', () => {
      this.state = restartGame(this.state);
      this.syncDom();
    });

    // 키 입력 상태(현재 눌림 여부)
    this.held = { jump: false, duck: false };
    const keydown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        this.held.jump = true;
        e.preventDefault();
      } else if (e.code === 'ArrowDown') {
        this.held.duck = true;
        e.preventDefault();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        // playing↔paused 토글(계약 외 편의 키, 접근성 키에는 영향 없음)
        if (this.state.status === STATUS.PLAYING) this.state = pauseGame(this.state);
        else if (this.state.status === STATUS.PAUSED) this.state = resumeGame(this.state);
        this.syncDom();
      }
    };
    const keyup = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') this.held.jump = false;
      else if (e.code === 'ArrowDown') this.held.duck = false;
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    // 탭이 가려지면 playing 상태를 자동 일시정지
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state.status === STATUS.PLAYING) {
        this.state = pauseGame(this.state);
        this.syncDom();
      }
    });

    this.prevStatus = null;
    this.syncDom();
    this.render();
  }

  update(_time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05); // 큰 프레임 점프 제한
    if (this.state.status === STATUS.PLAYING) {
      const prevHigh = this.state.highScore;
      this.state = step(this.state, dt, { jump: this.held.jump, duck: this.held.duck });
      this.groundOffset = (this.state.distance % 40);
      if (this.state.status === STATUS.GAMEOVER && this.state.highScore > prevHigh) {
        writeHighScore(this.state.highScore);
      }
    }
    if (this.state.status !== this.prevStatus) {
      this.syncDom();
    }
    this.render();
  }

  syncDom() {
    const s = this.state;
    this.prevStatus = s.status;

    this.dom.score.textContent = `점수 ${s.score}`;
    this.dom.distance.textContent = `거리 ${Math.floor(s.distance / 10)}m`;
    this.dom.highscore.textContent = `최고 ${s.highScore}`;

    // 오버레이 토글 — 상태명을 화면 텍스트로도 노출
    this.dom.startOverlay.hidden = s.status !== STATUS.START;
    this.dom.pauseOverlay.hidden = s.status !== STATUS.PAUSED;
    this.dom.gameoverOverlay.hidden = s.status !== STATUS.GAMEOVER;

    if (s.status === STATUS.GAMEOVER) {
      this.dom.gameoverScore.textContent =
        `${STATUS_LABEL[STATUS.GAMEOVER]} — 점수 ${s.score} · 최고 ${s.highScore}`;
    }

    // 주 실행 control 재활성화(후조건: 초기화/실패 뒤 다시 사용 가능)
    this.dom.startButton.disabled = false;
    this.dom.resumeButton.disabled = false;
    this.dom.restartButton.disabled = false;
  }

  render() {
    const g = this.graphics;
    const s = this.state;
    g.clear();

    // 지면
    g.fillStyle(COLOR.ground, 1);
    g.fillRect(0, CONFIG.groundY, CONFIG.worldWidth, CONFIG.worldHeight - CONFIG.groundY);

    // 배경 스크롤 마커(거리 비례로 이동)
    g.fillStyle(COLOR.accent, 0.25);
    for (let x = -this.groundOffset; x < CONFIG.worldWidth; x += 40) {
      g.fillRect(x, CONFIG.groundY + 10, 18, 4);
    }

    // 플레이어
    const height = s.player.action === 'duck' ? CONFIG.duckHeight : CONFIG.playerHeight;
    const bottom = CONFIG.groundY - Math.max(0, s.player.offset);
    g.fillStyle(COLOR.player, 1);
    g.fillRect(CONFIG.playerX, bottom - height, CONFIG.playerWidth, height);

    // 장애물
    for (const o of s.obstacles) {
      g.fillStyle(o.kind === 'air' ? COLOR.obstacleAir : COLOR.obstacleGround, 1);
      g.fillRect(o.x, o.y, o.width, o.height);
    }
  }
}

function boot() {
  // eslint-disable-next-line no-new
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-root',
    width: CONFIG.worldWidth,
    height: CONFIG.worldHeight,
    backgroundColor: '#0b1120',
    scale: {
      mode: Phaser.Scale.FIT, // 고정 종횡비 유지 + 뷰포트 폭 축소
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [RunnerScene],
  });
}

if (typeof window !== 'undefined' && window.Phaser) {
  boot();
}

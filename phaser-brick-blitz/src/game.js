// phaser-brick-blitz/src/game.js
// Phaser 3 Scene 렌더/입력 어댑터. 모든 게임 로직 계산은 src/logic.js(순수 함수)에 위임하고,
// 이 파일은 입력 이벤트를 로직에 전달하고 로직이 반환한 상태/좌표/점수로 캔버스와
// DOM(HUD·overlay·상태 클래스)을 갱신하는 역할만 한다.
//
// 브라우저는 Phaser 를 CDN 전역(window.Phaser)으로 로드한다. Node 테스트는 이 파일을
// import 하지 않는다(로직은 logic.js 에서만 검증).

import {
  STATES,
  EVENTS,
  DEFAULT_CONFIG,
  ROW_COLOR_TOKENS,
  nextStatus,
  createInitialState,
  reflectWalls,
  isBelowFloor,
  paddleReflection,
  ballRectIntersects,
  resolveBrickCollisions,
  applyBrickResult,
  loseLife,
  countAliveBricks,
} from './logic.js';

/** CSS 변수 값을 읽어 Phaser 색상(0xRRGGBB)으로 변환. */
function cssColorToHex(varName, fallback) {
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue(varName).trim() || fallback;
  return Number.parseInt(raw.replace('#', ''), 16);
}

/** 상태별 overlay id 매핑(UI 계약과 1:1). */
const OVERLAY_BY_STATE = {
  [STATES.READY]: 'overlay-start',
  [STATES.PAUSED]: 'overlay-pause',
  [STATES.GAMEOVER]: 'overlay-gameover',
  [STATES.CLEARED]: 'overlay-clear',
  [STATES.PLAYING]: null, // playing 에서는 overlay 없음
};

/** DOM 갱신 헬퍼: HUD·overlay·상태 클래스/속성 동기화. */
function createDomView() {
  const root = document.getElementById('game-root');
  const hudScore = document.getElementById('hud-score');
  const hudLives = document.getElementById('hud-lives');
  const pauseBtn = document.getElementById('btn-pause');
  const overlays = {
    [STATES.READY]: document.getElementById('overlay-start'),
    [STATES.PAUSED]: document.getElementById('overlay-pause'),
    [STATES.GAMEOVER]: document.getElementById('overlay-gameover'),
    [STATES.CLEARED]: document.getElementById('overlay-clear'),
  };

  function render(state) {
    hudScore.textContent = `점수: ${state.score}`;
    hudLives.textContent = `목숨: ${state.lives}`;
    root.dataset.state = state.status;

    // 각 상태 overlay 를 상태에 맞춰 표시/숨김
    Object.entries(overlays).forEach(([status, el]) => {
      if (!el) return;
      el.hidden = state.status !== status;
    });

    // gameover/cleared 점수 텍스트
    const goScore = document.getElementById('overlay-gameover-score');
    if (goScore) goScore.textContent = `최종 점수: ${state.score}`;
    const clScore = document.getElementById('overlay-clear-score');
    if (clScore) clScore.textContent = `모든 벽돌을 깼습니다! 점수: ${state.score}`;

    // 시작 control 재활성화: ready/gameover/cleared 에서 시작 계열 버튼 사용 가능
    const canStart = state.status === STATES.READY || state.status === STATES.GAMEOVER || state.status === STATES.CLEARED;
    pauseBtn.disabled = !(state.status === STATES.PLAYING || state.status === STATES.PAUSED);
    return canStart;
  }

  return { render, root, pauseBtn, overlays };
}

/** Phaser Scene 정의. */
function createScene(Phaser) {
  return class BrickBlitzScene extends Phaser.Scene {
    constructor() {
      super('brick-blitz');
    }

    create() {
      this.cfg = { ...DEFAULT_CONFIG };
      this.view = createDomView();
      this.rng = Math.random;
      this.state = createInitialState(this.cfg, this.rng);

      // 색상 토큰 로드
      this.colors = {
        paddle: cssColorToHex('--color-paddle', '#4cc9f0'),
        ball: cssColorToHex('--color-ball', '#f8f9fa'),
        rows: ROW_COLOR_TOKENS.map((tok, i) => cssColorToHex(tok, ['#ef476f', '#ffd166', '#06d6a0'][i] ?? '#ffffff')),
      };

      // 그래픽 객체
      this.brickRects = new Map(); // id -> Phaser.GameObjects.Rectangle
      this.paddleRect = this.add.rectangle(0, 0, this.cfg.paddleWidth, this.cfg.paddleHeight, this.colors.paddle);
      this.ballCircle = this.add.circle(0, 0, this.cfg.ballRadius, this.colors.ball);

      this.rebuildBricks();
      this.syncGraphics();
      this.view.render(this.state);

      // 입력: 키보드
      this.cursors = this.input.keyboard.createCursorKeys();
      this.input.keyboard.on('keydown-SPACE', () => this.handleSpace());
      this.input.keyboard.on('keydown-P', () => this.togglePause());

      // 입력: 마우스(패들 좌우 이동)
      this.input.on('pointermove', (pointer) => this.handlePointer(pointer));

      // 버튼 바인딩
      this.bindButtons();
    }

    bindButtons() {
      const on = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
      };
      on('btn-start', () => this.startGame());
      on('btn-resume', () => this.resumeGame());
      on('btn-pause', () => this.togglePause());
      on('btn-restart-gameover', () => this.restartGame());
      on('btn-restart-clear', () => this.restartGame());
    }

    rebuildBricks() {
      this.brickRects.forEach((r) => r.destroy());
      this.brickRects.clear();
      this.state.bricks.forEach((b) => {
        const rect = this.add.rectangle(
          b.x + b.width / 2,
          b.y + b.height / 2,
          b.width - 2,
          b.height - 2,
          this.colors.rows[b.row] ?? this.colors.rows[this.colors.rows.length - 1],
        );
        rect.setData('brickId', b.id);
        this.brickRects.set(b.id, rect);
      });
    }

    syncGraphics() {
      const { ball, paddle, bricks } = this.state;
      this.ballCircle.setPosition(ball.x, ball.y);
      this.paddleRect.setPosition(paddle.x + paddle.width / 2, paddle.y + paddle.height / 2);
      bricks.forEach((b) => {
        const rect = this.brickRects.get(b.id);
        if (rect) rect.setVisible(b.alive);
      });
    }

    handleSpace() {
      if (this.state.status === STATES.READY) this.startGame();
      else if (this.state.status === STATES.PAUSED) this.resumeGame();
      else if (this.state.status === STATES.PLAYING) this.togglePause();
    }

    startGame() {
      if (this.state.status !== STATES.READY) return;
      this.state = { ...this.state, status: nextStatus(this.state.status, EVENTS.START) };
      this.view.render(this.state);
    }

    togglePause() {
      if (this.state.status === STATES.PLAYING) {
        this.state = { ...this.state, status: nextStatus(this.state.status, EVENTS.PAUSE) };
      } else if (this.state.status === STATES.PAUSED) {
        this.state = { ...this.state, status: nextStatus(this.state.status, EVENTS.RESUME) };
      }
      this.view.render(this.state);
    }

    resumeGame() {
      if (this.state.status !== STATES.PAUSED) return;
      this.state = { ...this.state, status: nextStatus(this.state.status, EVENTS.RESUME) };
      this.view.render(this.state);
    }

    restartGame() {
      // 초기화 후조건: 점수·목숨·상태·엔티티 초기값 복원 + 시작 control 재활성화
      this.state = createInitialState(this.cfg, this.rng);
      this.rebuildBricks();
      this.syncGraphics();
      this.view.render(this.state);
    }

    handlePointer(pointer) {
      if (this.state.status !== STATES.PLAYING) return;
      const scaleX = this.cfg.width / this.scale.width;
      const localX = pointer.x * scaleX;
      this.movePaddleTo(localX - this.state.paddle.width / 2);
    }

    movePaddleTo(x) {
      const maxX = this.cfg.width - this.state.paddle.width;
      const clamped = Math.max(0, Math.min(x, maxX));
      this.state = { ...this.state, paddle: { ...this.state.paddle, x: clamped } };
    }

    update(_time, delta) {
      if (this.state.status !== STATES.PLAYING) return;
      const dt = delta / 1000;

      // 키보드 패들 이동
      const paddleSpeed = 420;
      if (this.cursors.left.isDown) this.movePaddleTo(this.state.paddle.x - paddleSpeed * dt);
      else if (this.cursors.right.isDown) this.movePaddleTo(this.state.paddle.x + paddleSpeed * dt);

      // 공 이동(적분)
      let ball = { ...this.state.ball };
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      const bounds = { width: this.cfg.width, height: this.cfg.height };

      // 벽 반사
      ball = reflectWalls(ball, bounds).ball;

      // 패들 반사
      const paddle = this.state.paddle;
      if (ball.vy > 0 && ballRectIntersects(ball, paddle)) {
        const { vx, vy } = paddleReflection(ball, paddle, this.cfg);
        ball = { ...ball, vx, vy, y: paddle.y - ball.radius - 1 };
      }

      // 벽돌 충돌
      const brickRes = resolveBrickCollisions(ball, this.state.bricks);
      ball = brickRes.ball;
      let nextState = { ...this.state, ball };
      if (brickRes.hitBrick) {
        nextState = applyBrickResult(nextState, brickRes.gainedScore, brickRes.bricks);
      }

      // 바닥 이탈 → 목숨 소진
      if (isBelowFloor(ball, bounds)) {
        nextState = loseLife(nextState);
        if (nextState.status === STATES.PLAYING) {
          // 목숨 남음: 공 재배치
          const fresh = createInitialState(this.cfg, this.rng).ball;
          nextState = { ...nextState, ball: fresh };
        }
      }

      this.state = nextState;

      // 클리어/게임오버로 전이 시 그래픽/HUD 반영
      this.syncGraphics();
      this.view.render(this.state);

      if (this.state.status !== STATES.PLAYING && countAliveBricks(this.state.bricks) === 0) {
        // cleared 유지
      }
    }
  };
}

/** 부트스트랩: DOM 준비 후 Phaser 게임 생성. */
function bootstrap() {
  const Phaser = globalThis.Phaser;
  if (!Phaser) {
    // Phaser CDN 로드 실패 시 조용히 중단(테스트/정적 검증 환경 보호)
    return;
  }
  const Scene = createScene(Phaser);
  // eslint-disable-next-line no-new
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-canvas',
    width: DEFAULT_CONFIG.width,
    height: DEFAULT_CONFIG.height,
    backgroundColor: cssColorToHex('--color-surface', '#1b2138'),
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [Scene],
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}

export { createScene, bootstrap, OVERLAY_BY_STATE };

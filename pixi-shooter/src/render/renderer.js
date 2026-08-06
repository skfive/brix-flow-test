// PixiJS 렌더링 계층.
// gameLogic.js의 상태를 "읽어서 그리기만" 한다 — 게임 규칙을 직접 판단하지 않는다.
// 탄환/적/폭발 뷰는 gameLogic 풀 크기에 맞춰 1회 생성 후 재사용한다(매 프레임 신규 대량 할당 없음).

import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/+esm';
import { STATUS } from '../logic/gameLogic.js';

const COLORS = {
  bgSpace: 0x05070f,
  player: 0x4fd1ff,
  enemyLinear: 0xff5470,
  enemyZigzag: 0xffb84f,
  bulletPlayer: 0xe8fff3,
  bulletEnemy: 0xff8080,
  explosion: 0xffd23f,
  hudText: 0xf5f7ff,
};

const STATUS_MESSAGE = {
  [STATUS.READY]: 'PRESS SPACE TO START',
  [STATUS.PAUSED]: 'PAUSED\nPress ESC to Resume',
  [STATUS.GAMEOVER]: 'GAME OVER',
};

function hudTextStyle(fontSize, extra = {}) {
  return new PIXI.TextStyle({
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    fontSize,
    fill: COLORS.hudText,
    align: 'center',
    ...extra,
  });
}

function makePlayerGraphic(width, height) {
  const g = new PIXI.Graphics();
  const w = width;
  const h = height;
  g.moveTo(0, -h / 2)
    .lineTo(w / 2, h / 2)
    .lineTo(-w / 2, h / 2)
    .closePath()
    .fill({ color: COLORS.player });
  return g;
}

function makeRectGraphic(width, height, color) {
  return new PIXI.Graphics().rect(-width / 2, -height / 2, width, height).fill({ color });
}

function makeExplosionGraphic(radius) {
  return new PIXI.Graphics().circle(0, 0, radius).fill({ color: COLORS.explosion });
}

function drawEnemyShape(graphic, type, width, height) {
  const color = type === 'zigzag' ? COLORS.enemyZigzag : COLORS.enemyLinear;
  graphic.clear();
  if (type === 'zigzag') {
    // 마름모
    graphic
      .moveTo(0, -height / 2)
      .lineTo(width / 2, 0)
      .lineTo(0, height / 2)
      .lineTo(-width / 2, 0)
      .closePath()
      .fill({ color });
  } else {
    // 삼각형(직진형)
    graphic
      .moveTo(0, -height / 2)
      .lineTo(width / 2, height / 2)
      .lineTo(-width / 2, height / 2)
      .closePath()
      .fill({ color });
  }
}

function syncRectPool(views, models, parent, width, height, color) {
  models.forEach((model, i) => {
    let view = views[i];
    if (!view) {
      view = makeRectGraphic(width, height, color);
      views[i] = view;
      parent.addChild(view);
    }
    view.visible = model.active;
    if (model.active) {
      view.position.set(model.x + model.width / 2, model.y + model.height / 2);
    }
  });
}

function syncEnemyPool(views, models, parent) {
  models.forEach((model, i) => {
    let view = views[i];
    if (!view) {
      view = new PIXI.Graphics();
      view.__type = null;
      views[i] = view;
      parent.addChild(view);
    }
    view.visible = model.active;
    if (!model.active) return;
    if (view.__type !== model.type) {
      drawEnemyShape(view, model.type, model.width, model.height);
      view.__type = model.type;
    }
    view.position.set(model.x + model.width / 2, model.y + model.height / 2);
  });
}

function syncExplosionPool(views, models, parent, radius) {
  models.forEach((model, i) => {
    let view = views[i];
    if (!view) {
      view = makeExplosionGraphic(radius);
      views[i] = view;
      parent.addChild(view);
    }
    view.visible = model.active;
    if (model.active) {
      view.position.set(model.x, model.y);
      view.alpha = Math.max(0, model.timer / model.duration);
    }
  });
}

function createStarLayers(parent, config) {
  const layerDefs = [
    { count: 40, speed: 24, size: 1, alpha: 0.5 },
    { count: 22, speed: 60, size: 1.8, alpha: 0.9 },
  ];

  return layerDefs.map((def) => {
    const container = new PIXI.Container();
    parent.addChild(container);
    const stars = [];
    for (let i = 0; i < def.count; i += 1) {
      const star = new PIXI.Graphics().circle(0, 0, def.size).fill({ color: 0xffffff, alpha: def.alpha });
      star.x = (i * 97) % config.playAreaWidth;
      star.y = (i * 53) % config.playAreaHeight;
      container.addChild(star);
      stars.push(star);
    }
    return { stars, speed: def.speed };
  });
}

function updateStarLayers(layers, dt, config) {
  for (const layer of layers) {
    for (const star of layer.stars) {
      star.y += layer.speed * dt;
      if (star.y > config.playAreaHeight) star.y -= config.playAreaHeight;
    }
  }
}

/**
 * PixiJS Application을 초기화하고 render(state, dt) 함수를 반환한다.
 * @param {HTMLCanvasElement} canvas
 * @param {import('../logic/gameLogic.js').DEFAULT_CONFIG} config
 */
export async function createRenderer(canvas, config) {
  const app = new PIXI.Application();
  await app.init({
    canvas,
    width: config.playAreaWidth,
    height: config.playAreaHeight,
    background: COLORS.bgSpace,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });

  const starLayer = new PIXI.Container();
  const gameLayer = new PIXI.Container();
  const hudLayer = new PIXI.Container();
  app.stage.addChild(starLayer, gameLayer, hudLayer);

  const stars = createStarLayers(starLayer, config);

  const playerGraphic = makePlayerGraphic(config.playerWidth, config.playerHeight);
  gameLayer.addChild(playerGraphic);

  const bulletViews = [];
  const enemyViews = [];
  const enemyBulletViews = [];
  const explosionViews = [];

  const scoreText = new PIXI.Text({ text: 'SCORE 0', style: hudTextStyle(20) });
  scoreText.position.set(12, 10);
  hudLayer.addChild(scoreText);

  const livesText = new PIXI.Text({ text: 'LIVES 3', style: hudTextStyle(20) });
  livesText.position.set(12, 34);
  hudLayer.addChild(livesText);

  const bestText = new PIXI.Text({ text: 'BEST 0', style: hudTextStyle(20) });
  bestText.anchor.set(1, 0);
  bestText.position.set(config.playAreaWidth - 12, 10);
  hudLayer.addChild(bestText);

  const messageText = new PIXI.Text({ text: '', style: hudTextStyle(32) });
  messageText.anchor.set(0.5);
  messageText.position.set(config.playAreaWidth / 2, config.playAreaHeight / 2);
  hudLayer.addChild(messageText);

  const subMessageText = new PIXI.Text({ text: '', style: hudTextStyle(20) });
  subMessageText.anchor.set(0.5);
  subMessageText.position.set(config.playAreaWidth / 2, config.playAreaHeight / 2 + 40);
  hudLayer.addChild(subMessageText);

  function render(state, dt = 0) {
    updateStarLayers(stars, dt, config);

    playerGraphic.position.set(
      state.player.x + state.player.width / 2,
      state.player.y + state.player.height / 2
    );

    syncRectPool(bulletViews, state.bullets, gameLayer, config.bulletWidth, config.bulletHeight, COLORS.bulletPlayer);
    syncRectPool(
      enemyBulletViews,
      state.enemyBullets,
      gameLayer,
      config.enemyBulletWidth,
      config.enemyBulletHeight,
      COLORS.bulletEnemy
    );
    syncEnemyPool(enemyViews, state.enemies, gameLayer);
    syncExplosionPool(explosionViews, state.explosions, gameLayer, config.enemyWidth / 2);

    scoreText.text = `SCORE ${state.score}`;
    livesText.text = `LIVES ${state.lives}`;
    bestText.text = `BEST ${state.bestScore}`;

    if (state.status === STATUS.GAMEOVER) {
      messageText.text = STATUS_MESSAGE[STATUS.GAMEOVER];
      subMessageText.text = `FINAL SCORE ${state.score}\nPRESS SPACE TO RESTART`;
    } else if (state.status === STATUS.READY || state.status === STATUS.PAUSED) {
      messageText.text = STATUS_MESSAGE[state.status];
      subMessageText.text = '';
    } else {
      messageText.text = '';
      subMessageText.text = '';
    }

    playerGraphic.visible = state.status !== STATUS.GAMEOVER;
  }

  return { app, render };
}

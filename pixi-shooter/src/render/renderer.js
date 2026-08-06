// PixiJS 렌더링 계층.
// gameLogic.js의 상태를 "읽어서 그리기만" 한다 — 게임 규칙을 직접 판단하지 않는다.
// 탄환/적/폭발 뷰는 gameLogic 풀 크기에 맞춰 1회 생성 후 재사용한다(매 프레임 신규 대량 할당 없음).
// 모션은 design.md §6 명세를 따라 외부 tween 라이브러리 없이 dt 기반 자체 lerp/easing으로 구현한다.

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

// design.md §6 모션 명세 (지속시간, 초 단위)
const MOTION = {
  fireDuration: 0.06,
  hitDuration: 0.12,
  explosionDuration: 0.25,
  spawnDuration: 0.15,
  gameoverDuration: 0.4,
};

const HIT_SHAKE_AMPLITUDE = 2; // px, §6 과잉 연출 방지 기준: 피격 대상 자체에만, 최대 2px, 1회성
const EXPLOSION_PARTICLE_COUNT = 8; // §6 과잉 연출 방지 기준: 폭발당 최대 8개
const EXPLOSION_PARTICLE_RADIUS = 3;
const OVERLAY_ALPHA = 0.7; // design.md §7.1 반투명 오버레이(--color-bg-space alpha 0.7)

// design.md §7.1 상태별 표시 문구(한국어). main.js의 접근성 이름(aria-live 텍스트)도 이 값을 그대로 사용한다.
export const STATUS_TEXT = {
  [STATUS.READY]: { main: '스페이스바를 눌러 시작', sub: '← → 이동 · Space 발사' },
  [STATUS.PLAYING]: { main: 'PLAYING', sub: '' },
  [STATUS.PAUSED]: { main: '일시정지', sub: 'Space로 재개' },
  [STATUS.GAMEOVER]: { main: 'GAME OVER', sub: '' },
};

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

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

// 탄환 풀: 비활성→활성 전환("발사") 시 §6 fire 모션(스케일 0.6→1.0 팝)을 재생한다.
function syncRectPool(views, models, parent, width, height, color, dt) {
  models.forEach((model, i) => {
    let view = views[i];
    if (!view) {
      view = makeRectGraphic(width, height, color);
      view.__wasActive = false;
      view.__age = 0;
      views[i] = view;
      parent.addChild(view);
    }
    const justSpawned = model.active && !view.__wasActive;
    view.__wasActive = model.active;
    view.visible = model.active;
    if (!model.active) return;

    view.__age = justSpawned ? 0 : view.__age + dt;
    view.position.set(model.x + model.width / 2, model.y + model.height / 2);

    const progress = Math.min(1, view.__age / MOTION.fireDuration);
    view.scale.set(lerp(0.6, 1, easeOutQuad(progress)));
  });
}

// 적 풀: 비활성→활성 전환("스폰") 시 §6 spawn 모션(알파 페이드인 + 스케일 0.8→1.0)을 재생한다.
function syncEnemyPool(views, models, parent, dt) {
  models.forEach((model, i) => {
    let view = views[i];
    if (!view) {
      view = new PIXI.Graphics();
      view.__type = null;
      view.__wasActive = false;
      view.__age = 0;
      views[i] = view;
      parent.addChild(view);
    }
    const justSpawned = model.active && !view.__wasActive;
    view.__wasActive = model.active;
    view.visible = model.active;
    if (!model.active) return;
    if (view.__type !== model.type) {
      drawEnemyShape(view, model.type, model.width, model.height);
      view.__type = model.type;
    }

    view.__age = justSpawned ? 0 : view.__age + dt;
    view.position.set(model.x + model.width / 2, model.y + model.height / 2);

    const progress = Math.min(1, view.__age / MOTION.spawnDuration);
    const eased = easeOutQuad(progress);
    view.alpha = eased;
    view.scale.set(lerp(0.8, 1, eased));
  });
}

// 폭발 풀: 원 1개가 아닌 §6 명세대로 최대 8개 파티클이 방사형으로 퍼지며 페이드아웃되는 군집으로 표현한다.
function makeExplosionView(spreadRadius) {
  const container = new PIXI.Container();
  container.__wasActive = false;
  container.__age = 0;
  container.__spreadRadius = spreadRadius;
  container.__particles = [];
  for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i += 1) {
    const angle = (i / EXPLOSION_PARTICLE_COUNT) * Math.PI * 2;
    const particle = new PIXI.Graphics().circle(0, 0, EXPLOSION_PARTICLE_RADIUS).fill({ color: COLORS.explosion });
    particle.__angle = angle;
    container.addChild(particle);
    container.__particles.push(particle);
  }
  return container;
}

function syncExplosionPool(views, models, parent, spreadRadius, dt) {
  models.forEach((model, i) => {
    let view = views[i];
    if (!view) {
      view = makeExplosionView(spreadRadius);
      views[i] = view;
      parent.addChild(view);
    }
    const justSpawned = model.active && !view.__wasActive;
    view.__wasActive = model.active;
    view.visible = model.active;
    if (!model.active) return;

    view.__age = justSpawned ? 0 : view.__age + dt;
    view.position.set(model.x, model.y);

    const progress = Math.min(1, view.__age / MOTION.explosionDuration);
    const eased = easeOutQuad(progress);
    const dist = view.__spreadRadius * eased;
    for (const particle of view.__particles) {
      particle.position.set(Math.cos(particle.__angle) * dist, Math.sin(particle.__angle) * dist);
      particle.alpha = 1 - eased;
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

  // §6 hit 모션: 피격 대상(플레이어) 흰색 플래시 오버레이
  const playerHitFlash = makeRectGraphic(config.playerWidth, config.playerHeight, 0xffffff);
  playerHitFlash.visible = false;
  gameLayer.addChild(playerHitFlash);

  const bulletViews = [];
  const enemyViews = [];
  const enemyBulletViews = [];
  const explosionViews = [];

  // §7.1 상태 전환 시 표시되는 반투명 오버레이(paused/gameover). HUD 텍스트보다 아래에 위치해야 하므로 hudLayer의 첫 자식으로 추가한다.
  const overlay = new PIXI.Graphics().rect(0, 0, config.playAreaWidth, config.playAreaHeight).fill({ color: COLORS.bgSpace });
  overlay.alpha = 0;
  overlay.visible = false;
  hudLayer.addChild(overlay);

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

  // §7.1 playing 상태 뱃지
  const statusBadgeText = new PIXI.Text({ text: STATUS_TEXT[STATUS.PLAYING].main, style: hudTextStyle(14) });
  statusBadgeText.anchor.set(1, 0);
  statusBadgeText.position.set(config.playAreaWidth - 12, 34);
  hudLayer.addChild(statusBadgeText);

  const messageText = new PIXI.Text({ text: '', style: hudTextStyle(32) });
  messageText.anchor.set(0.5);
  messageText.position.set(config.playAreaWidth / 2, config.playAreaHeight / 2);
  hudLayer.addChild(messageText);

  const subMessageText = new PIXI.Text({ text: '', style: hudTextStyle(16) });
  subMessageText.anchor.set(0.5);
  subMessageText.position.set(config.playAreaWidth / 2, config.playAreaHeight / 2 + 40);
  hudLayer.addChild(subMessageText);

  // 프레임 간 상태 비교로 "이벤트"(피격/게임오버 전이)를 감지하기 위한 렌더러 전용 상태(게임 판정에는 관여하지 않음)
  let prevLives = null;
  let prevStatus = null;
  let hitAge = Infinity;
  let gameoverAge = Infinity;

  function render(state, dt = 0) {
    updateStarLayers(stars, dt, config);

    if (prevLives === null) prevLives = state.lives;
    // §6 과잉 연출 방지 기준 4: 이전 hit 트랜지션이 끝난 뒤에만 재트리거(debounce)
    if (state.lives < prevLives && hitAge >= MOTION.hitDuration) {
      hitAge = 0;
    }
    prevLives = state.lives;

    let hitShakeX = 0;
    let hitFlashAlpha = 0;
    if (hitAge < MOTION.hitDuration) {
      hitAge += dt;
      const progress = Math.min(1, hitAge / MOTION.hitDuration);
      hitFlashAlpha = 1 - progress;
      hitShakeX = HIT_SHAKE_AMPLITUDE * (1 - progress) * Math.sin(progress * Math.PI * 4);
    }

    playerGraphic.position.set(
      state.player.x + state.player.width / 2 + hitShakeX,
      state.player.y + state.player.height / 2
    );
    playerHitFlash.position.copyFrom(playerGraphic.position);
    playerHitFlash.alpha = hitFlashAlpha;
    playerHitFlash.visible = hitFlashAlpha > 0;

    syncRectPool(bulletViews, state.bullets, gameLayer, config.bulletWidth, config.bulletHeight, COLORS.bulletPlayer, dt);
    syncRectPool(
      enemyBulletViews,
      state.enemyBullets,
      gameLayer,
      config.enemyBulletWidth,
      config.enemyBulletHeight,
      COLORS.bulletEnemy,
      dt
    );
    syncEnemyPool(enemyViews, state.enemies, gameLayer, dt);
    syncExplosionPool(explosionViews, state.explosions, gameLayer, config.enemyWidth * 0.9, dt);

    scoreText.text = `SCORE ${state.score}`;
    livesText.text = `LIVES ${state.lives}`;
    bestText.text = `BEST ${state.bestScore}`;
    statusBadgeText.visible = state.status === STATUS.PLAYING;

    if (state.status === STATUS.GAMEOVER) {
      messageText.text = STATUS_TEXT[STATUS.GAMEOVER].main;
      subMessageText.text = `SCORE ${state.score}\nSpace로 재시작`;
    } else if (state.status === STATUS.READY) {
      messageText.text = STATUS_TEXT[STATUS.READY].main;
      subMessageText.text = STATUS_TEXT[STATUS.READY].sub;
    } else if (state.status === STATUS.PAUSED) {
      messageText.text = STATUS_TEXT[STATUS.PAUSED].main;
      subMessageText.text = STATUS_TEXT[STATUS.PAUSED].sub;
    } else {
      messageText.text = '';
      subMessageText.text = '';
    }

    // §7.1/§7.2 오버레이 + §6 gameover 트랜지션(400ms ease-in-out). paused는 별도 키가 아닌 상태이므로 즉시 전환(연출 없음).
    if (state.status === STATUS.PAUSED) {
      gameoverAge = Infinity;
      overlay.visible = true;
      overlay.alpha = OVERLAY_ALPHA;
      messageText.alpha = 1;
      subMessageText.alpha = 1;
    } else if (state.status === STATUS.GAMEOVER) {
      if (prevStatus !== STATUS.GAMEOVER) gameoverAge = 0;
      else gameoverAge += dt;
      const progress = Math.min(1, gameoverAge / MOTION.gameoverDuration);
      const eased = easeInOutQuad(progress);
      overlay.visible = true;
      overlay.alpha = OVERLAY_ALPHA * eased;
      messageText.alpha = eased;
      subMessageText.alpha = eased;
    } else {
      gameoverAge = Infinity;
      overlay.visible = false;
      overlay.alpha = 0;
      messageText.alpha = 1;
      subMessageText.alpha = 1;
    }
    prevStatus = state.status;

    playerGraphic.visible = state.status !== STATUS.GAMEOVER;
    playerHitFlash.visible = playerHitFlash.visible && state.status !== STATUS.GAMEOVER;
  }

  return { app, render };
}

/**
 * Memory Match 렌더링·입력 계층 (BF-1723 / 계약 BF-1715 §7)
 *
 * game.js 는 Phaser 씬 구성·렌더링·입력만 담당하고, 모든 상태 전이는
 * 순수 로직(logic.js)을 호출해 얻는다. selector·token 은 계약을 그대로 사용한다.
 */
import {
  createInitialState,
  flipCard,
  resolveTurn,
  isCleared,
  resetGame,
  formatTime,
} from './logic.js';

const PAIR_COUNT = 8;
const COLS = 4;
const ROWS = 4;
const BOARD_SIZE = 480; // 논리 캔버스 크기(정사각). Scale FIT 로 뷰포트에 맞춤.
const MISMATCH_DELAY = 800; // 불일치 카드 뒷면 복귀 지연(ms)

// 카드 앞면에 표시할 심볼(색상만으로 구분하지 않도록 텍스트 심볼 부여, 계약 §5)
const SYMBOLS = ['🍎', '🍋', '🍇', '🍒', '🥝', '🍑', '🫐', '🍊'];

const css = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const el = {
  statusText: document.getElementById('status-text'),
  hudMoves: document.getElementById('hud-moves'),
  hudTimer: document.getElementById('hud-timer'),
  restartButton: document.getElementById('restart-button'),
  clearOverlay: document.getElementById('clear-overlay'),
  clearDetail: document.getElementById('clear-detail'),
  live: document.getElementById('a11y-live'),
};

/** 브라우저 런타임 seed 생성(로직은 여전히 결정적). */
function makeSeed() {
  return (Date.now() ^ Math.floor(performance.now())) >>> 0;
}

class MemoryScene extends Phaser.Scene {
  constructor() {
    super('memory');
    /** @type {import('./logic.js').GameState} */
    this.state = createInitialState({ pairCount: PAIR_COUNT, seed: makeSeed() });
    this.cardViews = [];
    this.focusIndex = 0;
    this.locked = false; // 불일치 판정 대기 중 입력 잠금
    this.elapsedSeconds = 0;
    this.timerEvent = null;
  }

  create() {
    this.buildBoard();
    this.renderCards();
    this.updateHud();

    // 키보드 접근성: 방향키 이동 + Enter/Space 활성화 (계약 §5)
    this.input.keyboard.on('keydown', (event) => this.onKeydown(event));

    // 다시 시작 control
    el.restartButton.addEventListener('click', () => this.restart());
  }

  buildBoard() {
    const gap = parseInt(css('--space-card-gap'), 10) || 12;
    const cellW = (BOARD_SIZE - gap * (COLS + 1)) / COLS;
    const cellH = (BOARD_SIZE - gap * (ROWS + 1)) / ROWS;
    this.geom = { gap, cellW, cellH };

    this.cardViews = this.state.cards.map((_, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const x = gap + col * (cellW + gap) + cellW / 2;
      const y = gap + row * (cellH + gap) + cellH / 2;

      const rect = this.add
        .rectangle(x, y, cellW, cellH, colorInt('--color-card-back'))
        .setStrokeStyle(3, colorInt('--color-accent'))
        .setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.onCardTap(index));

      const label = this.add
        .text(x, y, '', {
          fontSize: `${Math.floor(cellH * 0.5)}px`,
          color: css('--color-text'),
        })
        .setOrigin(0.5);

      const focus = this.add
        .rectangle(x, y, cellW + 6, cellH + 6)
        .setStrokeStyle(4, colorInt('--color-card-face'))
        .setVisible(false);

      return { rect, label, focus, x, y };
    });
  }

  renderCards() {
    this.state.cards.forEach((card, index) => {
      const view = this.cardViews[index];
      const faceUp = card.faceUp || card.matched;
      view.rect.setFillStyle(
        faceUp ? colorInt('--color-card-face') : colorInt('--color-card-back')
      );
      view.rect.setAlpha(card.matched ? 0.65 : 1);
      view.label.setText(faceUp ? SYMBOLS[card.value % SYMBOLS.length] : '');
      view.focus.setVisible(index === this.focusIndex);
    });
  }

  onCardTap(index) {
    if (this.locked) return;
    const next = flipCard(this.state, index);
    if (next === this.state) return; // 무시된 입력

    this.state = next;
    this.focusIndex = index;
    this.startTimerIfNeeded();
    this.renderCards();
    this.announce(`카드 ${index + 1} 뒤집힘`);

    if (this.state.flippedIndices.length === 2) {
      this.locked = true;
      const isMatch =
        this.state.cards[this.state.flippedIndices[0]].value ===
        this.state.cards[this.state.flippedIndices[1]].value;
      if (isMatch) {
        this.resolve();
      } else {
        this.time.delayedCall(MISMATCH_DELAY, () => this.resolve());
      }
    }
  }

  resolve() {
    this.state = resolveTurn(this.state);
    this.locked = false;
    this.renderCards();
    this.updateHud();

    if (isCleared(this.state)) {
      this.finishGame();
    } else {
      this.announce(`이동 ${this.state.moves}회`);
    }
  }

  onKeydown(event) {
    const key = event.key;
    if (key === 'ArrowRight') this.moveFocus(1, 0);
    else if (key === 'ArrowLeft') this.moveFocus(-1, 0);
    else if (key === 'ArrowDown') this.moveFocus(0, 1);
    else if (key === 'ArrowUp') this.moveFocus(0, -1);
    else if (key === 'Enter' || key === ' ') this.onCardTap(this.focusIndex);
    else return;
    this.renderCards();
  }

  moveFocus(dx, dy) {
    let col = (this.focusIndex % COLS) + dx;
    let row = Math.floor(this.focusIndex / COLS) + dy;
    col = Math.max(0, Math.min(COLS - 1, col));
    row = Math.max(0, Math.min(ROWS - 1, row));
    this.focusIndex = row * COLS + col;
  }

  startTimerIfNeeded() {
    if (this.timerEvent || this.state.status !== 'playing') return;
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.elapsedSeconds += 1;
        this.updateHud();
      },
    });
  }

  stopTimer() {
    if (this.timerEvent) {
      this.timerEvent.remove();
      this.timerEvent = null;
    }
  }

  updateHud() {
    el.hudMoves.textContent = `이동: ${this.state.moves}`;
    el.hudTimer.textContent = `시간: ${formatTime(this.elapsedSeconds)}`;
  }

  finishGame() {
    this.stopTimer();
    const detail = `클리어! 총 ${this.state.moves}회 이동, ${formatTime(
      this.elapsedSeconds
    )}`;
    el.clearDetail.textContent = detail;
    el.clearOverlay.hidden = false;
    el.statusText.textContent = '클리어! 다시 시작할 수 있습니다';
    this.announce(detail);
  }

  restart() {
    this.stopTimer();
    this.elapsedSeconds = 0;
    this.state = resetGame(this.state, { seed: makeSeed() });
    this.focusIndex = 0;
    this.locked = false;

    el.clearOverlay.hidden = true;
    el.statusText.textContent = '카드를 뒤집어 짝을 맞추세요';
    el.restartButton.textContent = '게임 시작';
    el.restartButton.disabled = false;

    this.renderCards();
    this.updateHud();
    el.restartButton.focus();
    this.announce('게임을 다시 시작했습니다');
  }

  announce(message) {
    if (el.live) el.live.textContent = message;
  }
}

function colorInt(tokenName) {
  const hex = css(tokenName).replace('#', '');
  return parseInt(hex, 16);
}

function boot() {
  // eslint-disable-next-line no-new
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-root',
    backgroundColor: css('--color-bg'),
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    scale: {
      // 뷰포트 폭에 맞춰 종횡비 유지 스케일 (계약 §6)
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: MemoryScene,
  });
}

if (typeof window !== 'undefined' && window.Phaser) {
  boot();
}

export { MemoryScene, boot };

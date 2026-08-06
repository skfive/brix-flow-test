// svg-puzzle-slider/src/render.js
// SVG 렌더링 + 입력 처리만 담당한다(게임 규칙은 puzzle.js 에 위임).
// 셔플·이동 판정·승리 판정을 재구현하지 않는다(설계 §4 불변식).
import {
  SIZE,
  TILE_COUNT,
  EMPTY,
  shuffle,
  canMove,
  move,
  isSolved,
} from './puzzle.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// SVG 좌표 상수 (viewBox 단위). 축소는 CSS width:100% 로 처리.
const PAD = 8;
const CELL = 96; // 타일 간 pitch (타일 + gap)
const GAP = 8;
const TILE = CELL - GAP; // 88
const BOARD_DIM = PAD * 2 + SIZE * CELL - GAP; // 392

const STATE = Object.freeze({
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  CLEARED: 'cleared',
});

// index → SVG 좌표
function tileX(index) {
  return PAD + (index % SIZE) * CELL;
}
function tileY(index) {
  return PAD + Math.floor(index / SIZE) * CELL;
}

// 렌더러를 생성한다. rng 는 주입 가능(테스트/결정성). 기본은 Math.random.
export function createPuzzle(root, rng = Math.random) {
  const els = {
    wrapper: root.querySelector('.puzzle'),
    board: root.querySelector('#puzzle-board'),
    tiles: root.querySelector('#puzzle-tiles'),
    moveCount: root.querySelector('#move-count'),
    elapsed: root.querySelector('#elapsed-time'),
    restart: root.querySelector('#restart-button'),
    clear: root.querySelector('#clear-screen'),
    status: root.querySelector('#puzzle-status'),
  };

  let board = [];
  let moves = 0;
  let elapsedSec = 0;
  let timerId = null;
  let state = STATE.START;
  // 값(1..15) → <g> 엘리먼트 캐시
  const tileEls = new Map();

  function setState(next) {
    state = next;
    if (els.wrapper) els.wrapper.dataset.state = next;
    if (els.status) els.status.textContent = `상태: ${stateLabel(next)}`;
    const cleared = next === STATE.CLEARED;
    if (els.clear) els.clear.hidden = !cleared;
  }

  function stateLabel(s) {
    switch (s) {
      case STATE.START:
        return '준비';
      case STATE.PLAYING:
        return '진행 중';
      case STATE.PAUSED:
        return '일시 정지';
      case STATE.CLEARED:
        return '완료';
      default:
        return s;
    }
  }

  function formatTime(totalSec) {
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function renderHud() {
    if (els.moveCount) els.moveCount.textContent = String(moves);
    if (els.elapsed) els.elapsed.textContent = formatTime(elapsedSec);
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerId = setInterval(() => {
      elapsedSec += 1;
      renderHud();
    }, 1000);
  }

  // 타일 엘리먼트를 최초 1회 생성한다(값 1..15).
  function buildTiles() {
    els.tiles.replaceChildren();
    tileEls.clear();
    for (let value = 1; value < TILE_COUNT; value++) {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'puzzle__tile');
      g.setAttribute('role', 'button');
      g.setAttribute('tabindex', '0');
      g.setAttribute('aria-label', `타일 ${value}`);

      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('width', String(TILE));
      rect.setAttribute('height', String(TILE));
      rect.setAttribute('rx', '12');
      rect.setAttribute('class', 'puzzle__tile-rect');

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', String(TILE / 2));
      text.setAttribute('y', String(TILE / 2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('class', 'puzzle__tile-text');
      text.textContent = String(value);

      g.appendChild(rect);
      g.appendChild(text);

      const activate = () => tryMoveValue(value);
      g.addEventListener('click', activate);
      g.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          activate();
        }
      });

      els.tiles.appendChild(g);
      tileEls.set(value, g);
    }
  }

  // 현재 board 를 기준으로 각 타일의 위치(transform)를 갱신한다 → CSS transition 슬라이딩.
  function positionTiles() {
    for (let value = 1; value < TILE_COUNT; value++) {
      const index = board.indexOf(value);
      const g = tileEls.get(value);
      if (!g) continue;
      g.setAttribute('transform', `translate(${tileX(index)}, ${tileY(index)})`);
      const movable = state === STATE.PLAYING && canMove(board, index);
      g.classList.toggle('puzzle__tile--movable', movable);
      g.setAttribute('tabindex', movable ? '0' : '-1');
    }
  }

  function tryMoveValue(value) {
    if (state !== STATE.PLAYING) return; // cleared/paused/start 에서는 입력 무시(E5)
    const index = board.indexOf(value);
    if (!canMove(board, index)) return; // 비인접(E1)
    board = move(board, index);
    moves += 1;
    renderHud();
    positionTiles();
    if (isSolved(board)) {
      setState(STATE.CLEARED);
      stopTimer();
      positionTiles();
    }
  }

  // 상태·이동·타이머·보드를 초기화하고 새 solvable 보드로 playing 시작.
  function reset() {
    stopTimer();
    moves = 0;
    elapsedSec = 0;
    setState(STATE.START);
    board = shuffle(rng);
    renderHud();
    positionTiles();
    setState(STATE.PLAYING);
    positionTiles();
    startTimer();
    if (els.restart) els.restart.disabled = false; // 주 실행 control 재활성화
  }

  function init() {
    buildTiles();
    if (els.restart) {
      els.restart.addEventListener('click', () => reset());
    }
    reset();
  }

  init();

  // 테스트/디버깅용 최소 표면 (렌더러 제어)
  return {
    reset,
    getState: () => state,
    getMoves: () => moves,
    getBoard: () => board.slice(),
  };
}

// 브라우저 자동 부트스트랩 (index.html 이 직접 import).
if (typeof document !== 'undefined') {
  const start = () => {
    if (document.querySelector('#puzzle-board')) {
      createPuzzle(document);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}

export { STATE, BOARD_DIM };

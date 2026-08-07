// Addiction Mini — 보드 렌더 및 카드 이동 인터랙션 (DOM ↔ game.js).
// BF-1856 · game.js 의 5개 순수 함수만 통해 로직에 접근.
import {
  createBoard,
  canMove,
  shuffle,
  checkWin,
  computeScore,
  CELL_COUNT,
  COLS,
} from './game.js';

const SUIT_SYMBOL = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_LABEL = { hearts: '하트', diamonds: '다이아몬드', clubs: '클로버', spades: '스페이드' };
const RANK_LABEL = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6' };

const el = (id) => document.getElementById(id);

/** @type {{board: Array, status: string, selected: number|null, shuffleUsed: boolean, moves: number, score: number, startedAt: number|null}} */
let state;
let timerId = null;

function initState() {
  return {
    board: createBoard(),
    status: 'playing',
    selected: null,
    shuffleUsed: false,
    moves: 0,
    score: 0,
    startedAt: null,
  };
}

function isAnchorCell(index) {
  return index % COLS === 0;
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function tickTime() {
  if (state.startedAt !== null && state.status === 'playing') {
    el('hud-time').textContent = formatTime(Date.now() - state.startedAt);
  }
}

function ensureTimer() {
  if (timerId === null) timerId = setInterval(tickTime, 250);
}

function updateHud() {
  el('hud-score').textContent = String(state.score);
  el('hud-moves').textContent = String(state.moves);
  if (state.startedAt === null) el('hud-time').textContent = '0:00';
}

function render() {
  const boardEl = el('game-board');
  boardEl.innerHTML = '';
  state.board.forEach((card, i) => {
    const cell = document.createElement('div');
    cell.dataset.index = String(i);
    cell.setAttribute('role', 'gridcell');
    cell.tabIndex = 0; // 카드/빈 칸 모두 키보드 포커스 가능

    if (card === null) {
      cell.className = 'cell cell--empty';
      cell.setAttribute('aria-label', '빈 칸');
    } else {
      const anchor = isAnchorCell(i) && card.rank === 1;
      cell.className = `cell card card--${card.color}${anchor ? ' card--anchor' : ''}`;
      cell.textContent = `${RANK_LABEL[card.rank]}${SUIT_SYMBOL[card.suit]}`;
      const desc = `${RANK_LABEL[card.rank]} ${SUIT_LABEL[card.suit]}`;
      if (anchor) {
        cell.setAttribute('aria-label', `${desc} 앵커 (고정, 이동 불가)`);
      } else {
        cell.setAttribute('aria-label', desc);
      }
    }

    if (state.selected === i) cell.classList.add('selected');
    boardEl.appendChild(cell);
  });
  updateHud();
}

// 카드 i 가 이동 가능한 빈 칸 대상을 찾는다(없으면 -1).
function findTarget(i) {
  for (let to = 0; to < CELL_COUNT; to++) {
    if (state.board[to] === null && canMove(state.board, i, to)) return to;
  }
  return -1;
}

function tryMove(i) {
  if (state.status !== 'playing') return;
  const card = state.board[i];
  if (!card) return;
  if (isAnchorCell(i) && card.rank === 1) return; // 앵커 이동 불가

  const to = findTarget(i);
  if (to === -1) return; // 유효한 대상 없음

  if (state.startedAt === null) {
    state.startedAt = Date.now();
    ensureTimer();
  }
  state.board[to] = card;
  state.board[i] = null;
  state.moves += 1;
  state.score = computeScore(state.board);
  state.selected = null;

  if (checkWin(state.board)) {
    win();
    return;
  }
  render();
}

function win() {
  state.status = 'won';
  stopTimer();
  const root = el('game-root');
  root.classList.remove('playing');
  root.classList.add('won');
  el('win-overlay').hidden = false;
  render();
}

function doShuffle() {
  if (state.status !== 'playing' || state.shuffleUsed) return; // 게임당 1회
  state.board = shuffle(state.board);
  state.shuffleUsed = true;
  state.score = computeScore(state.board);

  const btn = el('btn-shuffle');
  btn.classList.add('shuffle-disabled');
  btn.setAttribute('aria-disabled', 'true');
  btn.disabled = true;
  render();
}

function restart() {
  stopTimer();
  state = initState();

  const root = el('game-root');
  root.classList.remove('won');
  root.classList.add('playing');
  el('win-overlay').hidden = true;

  const btn = el('btn-shuffle');
  btn.classList.remove('shuffle-disabled');
  btn.setAttribute('aria-disabled', 'false');
  btn.disabled = false;

  el('hud-time').textContent = '0:00';
  render();
}

function onBoardClick(e) {
  const cell = e.target.closest('.cell');
  if (!cell || !cell.classList.contains('card')) return;
  tryMove(Number(cell.dataset.index));
}

function onBoardKeydown(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const cell = e.target.closest('.cell');
  if (!cell || !cell.classList.contains('card')) return;
  e.preventDefault();
  tryMove(Number(cell.dataset.index));
}

function onBoardFocusIn(e) {
  const cell = e.target.closest('.cell');
  if (!cell) return;
  el('game-board').querySelectorAll('.selected').forEach((c) => c.classList.remove('selected'));
  cell.classList.add('selected');
  state.selected = Number(cell.dataset.index);
}

function setup() {
  state = initState();
  const boardEl = el('game-board');
  boardEl.addEventListener('click', onBoardClick);
  boardEl.addEventListener('keydown', onBoardKeydown);
  boardEl.addEventListener('focusin', onBoardFocusIn);
  el('btn-shuffle').addEventListener('click', doShuffle);
  el('btn-restart').addEventListener('click', restart);
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}

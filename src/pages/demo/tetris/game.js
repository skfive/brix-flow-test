/**
 * /demo/tetris UI 컨트롤러 — BF-836 (AC4)
 *
 * 디자인 명세: docs/design/tetris-BF-833.md (BF-835)
 * 게임 규칙 SSOT: src/features/tetris/rules.js (렌더링과 분리된 순수 함수)
 *
 * 이 파일은 "렌더링·입력·상태 머신" 만 담당하며 게임 규칙은 rules.js 를 호출한다.
 * 리더보드/점수 영속화는 leaderboard-gateway.js 게이트웨이에 위임한다.
 */
import {
  BOARD_COLS,
  BOARD_ROWS,
  createBoard,
  createRandomPiece,
  movePiece,
  softDrop,
  hardDrop,
  tryRotate,
  placePiece,
  clearLines,
  calcScore,
  calcLevel,
  calcDropInterval,
  getGhostY,
  isGameOver,
} from '../../../features/tetris/rules.js';
import { LocalLeaderboardGateway } from './leaderboard-gateway.js';

const PLAYER_NAME_PATTERN = /^[\p{L}\p{N} _-]{1,20}$/u;
const HIDDEN_DROP_STEP = 50; // 소프트 드롭 가속 하한(ms)

// 백엔드 미기동 데모: Local 게이트웨이. 백엔드 준비 시 HttpLeaderboardGateway 로 교체.
const gateway = new LocalLeaderboardGateway();

const $ = (id) => document.getElementById(id);

/** @type {Record<string, HTMLElement>} */
const el = {};
[
  'game-board', 'next-grid', 'hold-grid',
  'score-value', 'best-value', 'level-value', 'lines-value',
  'm-score', 'm-level', 'm-lines', 'start-best',
  'overlay-pause', 'overlay-gameover',
  'go-score', 'go-best', 'go-level', 'go-lines', 'go-new-record',
  'score-submit', 'nickname-input', 'nickname-error',
  'btn-submit-score', 'btn-submit-later',
  'save-status', 'save-icon', 'save-msg', 'save-actions',
  'overlay-leaderboard', 'lb-body', 'lb-empty', 'lb-loading', 'lb-error',
].forEach((id) => { el[id] = $(id); });

/** 게임 상태. */
const state = {
  board: createBoard(),
  current: /** @type {ReturnType<typeof createRandomPiece>|null} */ (null),
  next: createRandomPiece(),
  hold: /** @type {ReturnType<typeof createRandomPiece>|null} */ (null),
  holdUsed: false,
  score: 0,
  best: readBest(),
  lines: 0,
  level: 1,
  status: 'start',
  lastDrop: 0,
  softDropping: false,
  submitted: false,
};

// ── 영속화(BEST) ──────────────────────────────────────────
function readBest() {
  try { return Number(localStorage.getItem('tetris:highScore')) || 0; } catch { return 0; }
}
function writeBest(v) {
  try { localStorage.setItem('tetris:highScore', String(v)); } catch { /* noop */ }
}

// ── 보드 셀 초기화 ────────────────────────────────────────
const cells = [];
function buildBoard() {
  el['game-board'].style.setProperty('--cols', String(BOARD_COLS));
  el['game-board'].style.setProperty('--rows', String(BOARD_ROWS));
  const frag = document.createDocumentFragment();
  for (let i = 0; i < BOARD_COLS * BOARD_ROWS; i += 1) {
    const c = document.createElement('div');
    c.className = 'cell';
    frag.appendChild(c);
    cells.push(c);
  }
  el['game-board'].appendChild(frag);
}

function paintCell(r, c, type, ghost) {
  const cell = cells[r * BOARD_COLS + c];
  if (!cell) return;
  if (type) { cell.dataset.piece = type; cell.dataset.ghost = ghost ? '1' : ''; }
}

function renderBoard() {
  for (const cell of cells) { delete cell.dataset.piece; delete cell.dataset.ghost; }
  // 고정 블록
  for (let r = 0; r < BOARD_ROWS; r += 1) {
    for (let c = 0; c < BOARD_COLS; c += 1) {
      if (state.board[r][c]) paintCell(r, c, state.board[r][c], false);
    }
  }
  const p = state.current;
  if (!p) return;
  // 고스트
  const gy = getGhostY(state.board, p);
  drawPiece({ ...p, y: gy }, true);
  // 현재 피스
  drawPiece(p, false);
}

function drawPiece(p, ghost) {
  for (let r = 0; r < p.shape.length; r += 1) {
    for (let c = 0; c < p.shape[r].length; c += 1) {
      if (!p.shape[r][c]) continue;
      const br = p.y + r;
      const bc = p.x + c;
      if (br >= 0 && br < BOARD_ROWS && bc >= 0 && bc < BOARD_COLS) {
        if (ghost && state.board[br][bc]) continue;
        paintCell(br, bc, p.type, ghost);
      }
    }
  }
}

function renderPreview(container, piece) {
  container.innerHTML = '';
  if (!piece) return;
  const size = piece.shape.length;
  container.style.setProperty('--pcols', String(piece.shape[0].length));
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < piece.shape[r].length; c += 1) {
      const d = document.createElement('div');
      d.className = 'pcell';
      if (piece.shape[r][c]) d.dataset.piece = piece.type;
      container.appendChild(d);
    }
  }
}

function renderHud() {
  const pad = (n) => String(n).padStart(6, '0');
  el['score-value'].textContent = pad(state.score);
  el['best-value'].textContent = pad(state.best);
  el['level-value'].textContent = String(state.level);
  el['lines-value'].textContent = String(state.lines);
  el['m-score'].textContent = pad(state.score);
  el['m-level'].textContent = String(state.level);
  el['m-lines'].textContent = String(state.lines);
  el['start-best'].textContent = pad(state.best);
  renderPreview(el['next-grid'], state.next);
  renderPreview(el['hold-grid'], state.hold);
}

function setStatus(status) {
  state.status = status;
  document.body.dataset.status = status;
  el['overlay-pause'].hidden = status !== 'paused';
  el['overlay-gameover'].hidden = status !== 'gameover';
}

// ── 게임 진행 ─────────────────────────────────────────────
function spawnNext() {
  state.current = state.next;
  state.next = createRandomPiece();
  state.holdUsed = false;
  if (isGameOver(state.board, state.current)) {
    endGame();
    return false;
  }
  return true;
}

function lockAndAdvance() {
  state.board = placePiece(state.board, state.current);
  const { board, cleared } = clearLines(state.board);
  state.board = board;
  if (cleared > 0) {
    state.lines += cleared;
    state.score += calcScore(cleared, state.level);
    state.level = calcLevel(state.lines);
    if (state.score > state.best) { state.best = state.score; writeBest(state.best); }
  }
  spawnNext();
}

function endGame() {
  setStatus('gameover');
  el['go-score'].textContent = String(state.score).padStart(6, '0');
  el['go-best'].textContent = String(state.best).padStart(6, '0');
  el['go-level'].textContent = String(state.level);
  el['go-lines'].textContent = String(state.lines);
  el['go-new-record'].hidden = !(state.score > 0 && state.score >= state.best);
  state.submitted = false;
  showSubmitState('idle');
  renderHud();
  renderBoard();
  window.setTimeout(() => el['nickname-input'].focus(), 0);
}

function startGame() {
  state.board = createBoard();
  state.next = createRandomPiece();
  state.hold = null;
  state.holdUsed = false;
  state.score = 0;
  state.lines = 0;
  state.level = 1;
  state.softDropping = false;
  state.submitted = false;
  spawnNext();
  setStatus('playing');
  state.lastDrop = performance.now();
  renderHud();
  renderBoard();
  requestAnimationFrame(loop);
}

function loop(now) {
  if (state.status !== 'playing') return;
  const base = calcDropInterval(state.level);
  const interval = state.softDropping ? Math.min(HIDDEN_DROP_STEP, base) : base;
  if (now - state.lastDrop >= interval) {
    const res = softDrop(state.board, state.current);
    if (res.locked) lockAndAdvance();
    else state.current = res.piece;
    state.lastDrop = now;
    renderHud();
    renderBoard();
  }
  requestAnimationFrame(loop);
}

// ── 입력 디스패처 (키보드/터치 공용) ──────────────────────
function dispatch(cmd) {
  if (state.status !== 'playing') {
    if (cmd === 'pause') return; // 재개는 별도 처리
    return;
  }
  const p = state.current;
  switch (cmd) {
    case 'moveLeft': state.current = movePiece(state.board, p, -1); break;
    case 'moveRight': state.current = movePiece(state.board, p, 1); break;
    case 'softDrop': {
      const res = softDrop(state.board, p);
      if (res.locked) { lockAndAdvance(); } else { state.current = res.piece; state.score += 1; }
      break;
    }
    case 'hardDrop': {
      const { piece, cellsDropped } = hardDrop(state.board, p);
      state.current = piece;
      state.score += cellsDropped * 2;
      lockAndAdvance();
      break;
    }
    case 'rotateCW': { const r = tryRotate(state.board, p, true); if (r) state.current = r; break; }
    case 'rotateCCW': { const r = tryRotate(state.board, p, false); if (r) state.current = r; break; }
    case 'hold': doHold(); break;
    case 'pause': setStatus('paused'); break;
    default: break;
  }
  renderHud();
  renderBoard();
}

function doHold() {
  if (state.holdUsed) return;
  const cur = state.current;
  if (state.hold) {
    state.current = { ...state.hold, x: Math.floor((BOARD_COLS - state.hold.shape[0].length) / 2), y: 0 };
    state.hold = { ...cur, x: 0, y: 0, rotation: 0 };
  } else {
    state.hold = { ...cur, x: 0, y: 0, rotation: 0 };
    if (!spawnNext()) return;
  }
  state.holdUsed = true;
}

function resume() {
  if (state.status !== 'paused') return;
  setStatus('playing');
  state.lastDrop = performance.now();
  requestAnimationFrame(loop);
}

// ── 키보드 ────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return; // 닉네임 타이핑 보호
  if (!el['overlay-leaderboard'].hidden) {
    if (e.key === 'Escape') closeLeaderboard();
    return;
  }
  const k = e.key;
  if (state.status === 'start' && (k === 'Enter' || k === ' ')) { e.preventDefault(); startGame(); return; }
  if (state.status === 'paused') {
    if (k === 'p' || k === 'P' || k === 'Escape') { e.preventDefault(); resume(); return; }
    if (k === 'r' || k === 'R') { startGame(); return; }
    return;
  }
  if (state.status === 'gameover' && (k === 'r' || k === 'R')) { startGame(); return; }
  if (state.status !== 'playing') return;
  switch (k) {
    case 'ArrowLeft': e.preventDefault(); dispatch('moveLeft'); break;
    case 'ArrowRight': e.preventDefault(); dispatch('moveRight'); break;
    case 'ArrowDown': case 's': case 'S': e.preventDefault(); state.softDropping = true; dispatch('softDrop'); break;
    case 'ArrowUp': case 'w': case 'W': e.preventDefault(); dispatch('rotateCW'); break;
    case 'z': case 'Z': dispatch('rotateCCW'); break;
    case ' ': e.preventDefault(); dispatch('hardDrop'); break;
    case 'c': case 'C': dispatch('hold'); break;
    case 'p': case 'P': case 'Escape': e.preventDefault(); dispatch('pause'); break;
    default: break;
  }
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') state.softDropping = false;
});

// ── 터치 컨트롤 ───────────────────────────────────────────
let repeatTimer = null;
for (const btn of document.querySelectorAll('.touch-btn')) {
  const cmd = btn.getAttribute('data-cmd');
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (cmd === 'pause') { state.status === 'paused' ? resume() : dispatch('pause'); return; }
    dispatch(cmd);
    if (cmd === 'moveLeft' || cmd === 'moveRight') {
      repeatTimer = window.setInterval(() => dispatch(cmd), 120);
    }
  });
  const stop = () => { if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; } };
  btn.addEventListener('pointerup', stop);
  btn.addEventListener('pointerleave', stop);
  btn.addEventListener('pointercancel', stop);
}

// ── 점수 제출 서브상태 머신 ───────────────────────────────
function showSubmitState(when) {
  document.body.dataset.submit = when;
  el['score-submit'].hidden = when !== 'idle';
  el['save-status'].hidden = when === 'idle';
  el['save-status'].dataset.when = when;
}

function validateNickname(raw) {
  const name = raw.trim();
  if (name.length < 1 || name.length > 20 || !PLAYER_NAME_PATTERN.test(name)) return null;
  return name;
}

let lastPayload = null;
async function submitScore(name) {
  lastPayload = {
    playerName: name,
    score: state.score,
    level: state.level,
    lines: state.lines,
    durationMs: null,
  };
  await runSubmit();
}

async function runSubmit() {
  showSubmitState('saving');
  el['save-icon'].textContent = '◠';
  el['save-icon'].className = 'save-status__icon save-status__icon--spin';
  el['save-msg'].textContent = '저장 중…';
  el['save-actions'].innerHTML = '';
  el['save-status'].setAttribute('aria-busy', 'true');
  el['save-status'].setAttribute('aria-live', 'polite');
  el['save-status'].removeAttribute('role');
  try {
    const result = await gateway.submitScore(lastPayload);
    state.submitted = true;
    el['save-status'].removeAttribute('aria-busy');
    el['save-icon'].textContent = '✓';
    el['save-icon'].className = 'save-status__icon save-status__icon--success';
    el['save-msg'].textContent = `리더보드 ${result.rank}위 등록!`;
    el['save-actions'].innerHTML = '';
    addSaveButton('리더보드 보기', 'primary', () => openLeaderboard());
    showSubmitState('success');
  } catch (err) {
    el['save-status'].removeAttribute('aria-busy');
    el['save-status'].setAttribute('role', 'alert');
    el['save-status'].setAttribute('aria-live', 'assertive');
    el['save-icon'].textContent = '⚠';
    el['save-icon'].className = 'save-status__icon save-status__icon--error';
    el['save-msg'].textContent = '저장 실패 — 점수는 사라지지 않았습니다. 다시 시도해 주세요.';
    el['save-actions'].innerHTML = '';
    addSaveButton('다시 시도', 'primary', () => runSubmit());
    addSaveButton('나중에', 'ghost', () => showSubmitState('idle'));
    showSubmitState('error');
  }
}

function addSaveButton(label, variant, onClick) {
  const b = document.createElement('button');
  b.className = `btn btn--${variant}`;
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  el['save-actions'].appendChild(b);
}

el['score-submit'].addEventListener('submit', (e) => {
  e.preventDefault();
  const name = validateNickname(el['nickname-input'].value);
  if (!name) {
    el['nickname-input'].setAttribute('aria-invalid', 'true');
    el['nickname-error'].hidden = false;
    el['nickname-error'].textContent = '닉네임을 1~20자로 입력하세요 (허용: 한글/영문/숫자·공백·_·-)';
    return;
  }
  el['nickname-input'].removeAttribute('aria-invalid');
  el['nickname-error'].hidden = true;
  submitScore(name);
});
el['nickname-input'].addEventListener('input', () => {
  const name = validateNickname(el['nickname-input'].value);
  el['btn-submit-score'].disabled = !name;
  if (name) { el['nickname-input'].removeAttribute('aria-invalid'); el['nickname-error'].hidden = true; }
});
el['btn-submit-later'].addEventListener('click', () => showSubmitState('idle'));

// ── 리더보드 ──────────────────────────────────────────────
let lbTrigger = null;
async function openLeaderboard() {
  lbTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  el['overlay-leaderboard'].hidden = false;
  await loadLeaderboard();
  $('btn-lb-close').focus();
}
function closeLeaderboard() {
  el['overlay-leaderboard'].hidden = true;
  if (lbTrigger) lbTrigger.focus();
}
function setLbState(s) { el['overlay-leaderboard'].dataset.lbState = s; }

async function loadLeaderboard() {
  setLbState('loading');
  el['lb-loading'].hidden = false;
  el['lb-empty'].hidden = true;
  el['lb-error'].hidden = true;
  el['lb-body'].innerHTML = '';
  try {
    const page = await gateway.fetchLeaderboard(10, 0);
    el['lb-loading'].hidden = true;
    if (page.items.length === 0) { setLbState('empty'); el['lb-empty'].hidden = false; return; }
    setLbState('loaded');
    const medals = { 1: 'gold', 2: 'silver', 3: 'bronze' };
    const myTop = lastPayload && state.submitted ? lastPayload : null;
    let meMarked = false;
    for (const item of page.items) {
      const tr = document.createElement('tr');
      tr.className = 'lb-row';
      const isMe = !meMarked && myTop
        && item.playerName === myTop.playerName && item.score === myTop.score;
      if (isMe) { tr.classList.add('lb-row--me'); meMarked = true; }
      const medal = medals[item.rank] || '';
      tr.innerHTML =
        `<td class="lb-rank"${medal ? ` data-medal="${medal}"` : ''}>${medal ? '🏅' : ''}${item.rank}</td>`
        + `<td class="lb-name">${escapeHtml(item.playerName)}${isMe ? ' <span class="lb-badge">나</span>' : ''}</td>`
        + `<td class="lb-num">${item.score}</td>`
        + `<td class="lb-num lb-sub">${item.level}</td>`
        + `<td class="lb-num lb-sub">${item.lines}</td>`;
      el['lb-body'].appendChild(tr);
    }
  } catch {
    el['lb-loading'].hidden = true;
    setLbState('error');
    el['lb-error'].hidden = false;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ── 버튼 바인딩 ───────────────────────────────────────────
$('btn-start').addEventListener('click', startGame);
$('btn-newgame').addEventListener('click', startGame);
$('btn-pause-restart').addEventListener('click', startGame);
$('btn-resume').addEventListener('click', resume);
$('btn-pause-quit').addEventListener('click', () => { setStatus('start'); renderHud(); });
$('btn-go-quit').addEventListener('click', () => { setStatus('start'); renderHud(); });
$('btn-open-leaderboard').addEventListener('click', openLeaderboard);
$('btn-start-leaderboard').addEventListener('click', openLeaderboard);
$('btn-lb-close').addEventListener('click', closeLeaderboard);
$('btn-lb-retry').addEventListener('click', loadLeaderboard);
$('theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('tetris:theme', next); } catch { /* noop */ }
});

// ── 초기화 ────────────────────────────────────────────────
buildBoard();
renderHud();
setStatus('start');

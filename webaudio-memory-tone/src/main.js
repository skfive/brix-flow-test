// Tone Recall — 엔트리/바인딩 (BF-1742)
//
// DOM 이벤트를 game.js 순수 로직으로 전달하고, 상태 결과를 DOM/오디오로 렌더링한다.
// 무작위·타이머·오디오 등 부수효과를 로직 밖에서 주입한다.
// (implementation-plan §7 단방향 흐름: 입력 → game.js → main.js 렌더링)

import { createGame, PADS, STATUS } from './game.js';
import { createAudioEngine } from './audio.js';

const PAD_LABELS = {
  green: '초록',
  red: '빨강',
  yellow: '노랑',
  blue: '파랑',
};

function initGame() {
  const game = createGame({ random: Math.random, pads: PADS });
  const audio = createAudioEngine();

  const els = {
    board: document.getElementById('board'),
    round: document.getElementById('round-indicator'),
    status: document.getElementById('status-message'),
    start: document.getElementById('start-button'),
    panel: document.getElementById('game-over-panel'),
    panelDetail: document.getElementById('game-over-panel-detail'),
    pads: Object.fromEntries(PADS.map((p) => [p, document.getElementById(`pad-${p}`)])),
  };

  const PLAYBACK_STEP_MS = 600;
  const PLAYBACK_TONE_MS = 380;
  const timers = [];

  function clearTimers() {
    while (timers.length) clearTimeout(timers.pop());
  }

  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function flashPad(pad, durationMs) {
    const el = els.pads[pad];
    if (!el) return;
    el.classList.add('pad--active');
    later(() => el.classList.remove('pad--active'), durationMs);
  }

  function renderRound(round) {
    els.round.textContent = round > 0 ? `라운드 ${round}` : '라운드 —';
  }

  function setBoardState(status) {
    if (els.board) els.board.dataset.state = status;
  }

  function setStatus(text) {
    els.status.textContent = text;
  }

  // 현재 시퀀스를 소리·빛으로 재생한 뒤 input 상태로 전환
  function playbackSequence() {
    const snap = game.snapshot();
    setBoardState(STATUS.PLAYBACK);
    setStatus(`재생 중… 순서를 잘 기억하세요 (라운드 ${snap.round})`);
    els.start.disabled = true;

    snap.sequence.forEach((pad, i) => {
      later(() => {
        flashPad(pad, PLAYBACK_TONE_MS);
        audio.playTone(pad, PLAYBACK_TONE_MS);
      }, i * PLAYBACK_STEP_MS);
    });

    later(() => {
      game.beginInput();
      setBoardState(STATUS.INPUT);
      setStatus(`따라 눌러 보세요 (0/${snap.sequence.length})`);
    }, snap.sequence.length * PLAYBACK_STEP_MS + 150);
  }

  function handlePadPress(pad) {
    const before = game.snapshot();
    if (before.status !== STATUS.INPUT) return; // 재생 중·idle 입력 무시 (AC-2)

    const res = game.pressPad(pad);
    flashPad(pad, 180);
    audio.playTone(pad, 200);

    if (res.correct === false) {
      onGameOver(before.round);
      return;
    }

    if (res.roundComplete) {
      setStatus(`정답! 라운드 ${res.round} 로 진행합니다.`);
      renderRound(res.round);
      later(() => playbackSequence(), 700);
      return;
    }

    setStatus(`따라 눌러 보세요 (${res.inputIndex}/${res.sequence.length})`);
  }

  function onGameOver(reachedRound) {
    clearTimers();
    setBoardState(STATUS.GAMEOVER);
    const detail = `도달 라운드: ${reachedRound}`;
    setStatus(`게임 오버 — ${detail}`);
    if (els.panelDetail) els.panelDetail.textContent = detail;
    if (els.panel) els.panel.hidden = false;
    els.start.disabled = false; // 재시작 control 재활성화 (AC-5)
    els.start.textContent = '다시 시작';
  }

  function startGame() {
    clearTimers();
    audio.resume(); // 사용자 제스처 시 AudioContext resume (edge case §6)
    if (els.panel) els.panel.hidden = true;
    const snap = game.start();
    renderRound(snap.round);
    playbackSequence();
  }

  // 이벤트 바인딩
  els.start.addEventListener('click', startGame);
  Object.entries(els.pads).forEach(([pad, el]) => {
    if (!el) return;
    el.addEventListener('click', () => handlePadPress(pad));
  });

  // 초기 렌더 (idle)
  renderRound(0);
  setBoardState(STATUS.IDLE);

  return { game, audio, startGame, handlePadPress };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
}

export { initGame, PAD_LABELS };

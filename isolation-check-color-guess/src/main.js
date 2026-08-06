// src/main.js — 브라우저 실행 스크립트
// game.js 순수 로직을 소비해 상태를 DOM(§3 selector)에 반영한다.
// 무작위성은 Math.random을 game.js에 주입해 공급한다.

import {
  generateRound,
  scoreGuess,
  applyLife,
  createInitialState,
  DEFAULT_OPTION_COUNT,
} from './game.js';

const FEEDBACK_TEXT = {
  playing: '색상을 맞혀보세요',
  correct: '정답입니다',
  wrong: '오답입니다 — 목숨이 하나 줄었습니다',
};

const els = {
  target: document.getElementById('color-target'),
  swatches: document.getElementById('swatch-options'),
  score: document.getElementById('score-value'),
  lives: document.getElementById('lives-value'),
  feedback: document.getElementById('feedback-message'),
  gameoverPanel: document.getElementById('gameover-panel'),
  finalScore: document.getElementById('final-score'),
  restart: document.getElementById('restart-button'),
};

// 주입 가능한 RNG. 브라우저에서는 Math.random 사용.
const rng = () => Math.random();

let state = createInitialState();
let round = null;

/** HUD(점수·목숨) 텍스트를 현재 상태로 갱신한다. */
function renderHud() {
  els.score.textContent = String(state.score);
  els.lives.textContent = String(state.lives);
}

/** 현재 라운드의 목표 색상 값과 견본 button들을 렌더한다. */
function renderRound() {
  els.target.textContent = round.target;
  els.swatches.replaceChildren();

  round.options.forEach((color, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.style.backgroundColor = color;
    button.setAttribute('aria-label', `${index + 1}번 색상 견본`);
    button.addEventListener('click', () => handleGuess(index, button));
    els.swatches.appendChild(button);
  });
}

/** 견본 선택을 비활성화(라운드 종료 순간)한다. */
function disableSwatches() {
  els.swatches
    .querySelectorAll('button.swatch')
    .forEach((button) => {
      button.disabled = true;
    });
}

/** 새 라운드를 시작한다(playing 상태 진입). */
function startRound() {
  state.status = 'playing';
  round = generateRound(rng, DEFAULT_OPTION_COUNT);
  els.feedback.textContent = FEEDBACK_TEXT.playing;
  renderRound();
  renderHud();
}

/** gameover 화면을 표시하고 최종 점수를 노출한다. */
function renderGameOver() {
  state.status = 'gameover';
  disableSwatches();
  els.finalScore.textContent = String(state.score);
  els.feedback.textContent = `게임 오버 — 최종 점수 ${state.score}`;
  els.gameoverPanel.hidden = false;
}

/**
 * 견본 선택 처리: 채점 → 점수/목숨 반영 → 상태 전이.
 * @param {number} index 선택한 견본 index
 * @param {HTMLButtonElement} button 선택한 button 요소
 */
function handleGuess(index, button) {
  if (state.status !== 'playing') {
    return;
  }
  disableSwatches();

  const wasCorrect = scoreGuess(round, index);
  if (wasCorrect) {
    state.status = 'correct';
    state.score += 1;
    button.classList.add('swatch--correct');
    els.feedback.textContent = FEEDBACK_TEXT.correct;
  } else {
    state.status = 'wrong';
    button.classList.add('swatch--wrong');
    // 정답 견본을 함께 표시해 색상 외 단서를 제공한다.
    const correctButton = els.swatches.children[round.correctIndex];
    if (correctButton) {
      correctButton.classList.add('swatch--correct');
    }
    els.feedback.textContent = FEEDBACK_TEXT.wrong;
  }

  const life = applyLife(state.lives, wasCorrect);
  state.lives = life.lives;
  renderHud();

  if (life.gameOver) {
    window.setTimeout(renderGameOver, 700);
  } else {
    window.setTimeout(startRound, 700);
  }
}

/** 점수·목숨·상태를 초기화하고 playing으로 복귀한다(다시 시작). */
function restart() {
  state = createInitialState();
  els.gameoverPanel.hidden = true;
  startRound();
}

els.restart.addEventListener('click', restart);

// 최초 진입: playing 상태로 첫 라운드 시작.
startRound();

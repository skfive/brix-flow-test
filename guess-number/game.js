// 숫자 맞히기 게임 로직 (BF-1608)
// - judge(guess, answer): 부수효과 없는 순수함수. DOM/localStorage/랜덤은 호출부에 둔다.
// - 브라우저에서 game.js 를 직접 import 하면 DOM 바인딩이 실행되고,
//   node --test 로 import 하면 document 가 없어 바인딩을 건너뛴다.

/**
 * 추측과 정답을 비교해 frozen UI 계약의 상태명을 반환한다.
 * @param {number} guess 플레이어 추측값
 * @param {number} answer 정답
 * @returns {'guess-higher'|'guess-lower'|'win'}
 *   guess < answer → 'guess-higher' (더 큰 수 필요)
 *   guess > answer → 'guess-lower'  (더 작은 수 필요)
 *   guess === answer → 'win'
 */
export function judge(guess, answer) {
  if (guess < answer) return 'guess-higher';
  if (guess > answer) return 'guess-lower';
  return 'win';
}

// 상태별 화면 텍스트 — 색상만이 아니라 상태명/안내를 텍스트로 노출 (접근성)
const STATE_TEXT = {
  ready: '1부터 100 사이의 숫자를 맞혀보세요.',
  'guess-higher': '더 큰 수예요. (guess-higher)',
  'guess-lower': '더 작은 수예요. (guess-lower)',
  win: '정답입니다! (win)',
};

const BEST_SCORE_KEY = 'guess-number:best-score';
const MIN = 1;
const MAX = 100;

function randomAnswer() {
  return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
}

function readBestScore() {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_KEY);
    if (raw === null) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  } catch {
    // localStorage 미지원/차단 — 게임 진행은 계속
    return null;
  }
}

function writeBestScore(value) {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(value));
  } catch {
    // 저장 실패 무시 (세션 내 진행은 유지)
  }
}

// DOM 바인딩 — 브라우저에서만 실행
export function initGame(doc) {
  const input = doc.getElementById('guess-input');
  const submit = doc.getElementById('guess-submit');
  const newGame = doc.getElementById('new-game');
  const attemptCount = doc.getElementById('attempt-count');
  const bestScore = doc.getElementById('best-score');
  const feedback = doc.getElementById('feedback');

  let answer = randomAnswer();
  let attempts = 0;
  let finished = false;

  function renderBestScore() {
    const best = readBestScore();
    bestScore.textContent = best === null ? '-' : String(best);
  }

  function setFeedback(state) {
    feedback.textContent = STATE_TEXT[state];
    feedback.classList.toggle('game__feedback--win', state === 'win');
  }

  function reset() {
    answer = randomAnswer();
    attempts = 0;
    finished = false;
    attemptCount.textContent = '0';
    setFeedback('ready');
    input.value = '';
    input.disabled = false;
    submit.disabled = false;
    input.focus();
    renderBestScore();
  }

  function handleSubmit() {
    if (finished) return;

    const raw = input.value.trim();
    if (raw === '') {
      feedback.textContent = '숫자를 입력하세요.';
      return;
    }

    const guess = Number(raw);
    if (!Number.isInteger(guess)) {
      feedback.textContent = '정수를 입력하세요.';
      return;
    }
    if (guess < MIN || guess > MAX) {
      feedback.textContent = `${MIN}부터 ${MAX} 사이의 숫자를 입력하세요.`;
      return;
    }

    attempts += 1;
    attemptCount.textContent = String(attempts);

    const state = judge(guess, answer);
    setFeedback(state);

    if (state === 'win') {
      finished = true;
      input.disabled = true;
      submit.disabled = true;

      const best = readBestScore();
      if (best === null || attempts < best) {
        writeBestScore(attempts);
      }
      renderBestScore();
    }
  }

  submit.addEventListener('click', handleSubmit);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
  });
  newGame.addEventListener('click', reset);

  // 초기 표시
  attemptCount.textContent = '0';
  setFeedback('ready');
  renderBestScore();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initGame(document));
  } else {
    initGame(document);
  }
}

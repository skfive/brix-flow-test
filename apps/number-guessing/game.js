// 숫자 맞히기 게임 (BF-1602)
// planning-contract@v1 / ui-contract@v1 (docs/plans/number-guessing-BF-1600.md) 을 그대로 구현한다.

// §4 순수함수 judge — 부수효과 없이 export. 검증(범위/NaN/정수)은 호출부 책임.
// @param {number} guess  - 이미 검증·정규화된 정수 추측
// @param {number} answer - 비밀 정답 정수 (1~100)
// @returns {'higher' | 'lower' | 'win'}
export function judge(guess, answer) {
  if (guess < answer) return 'higher';
  if (guess > answer) return 'lower';
  return 'win';
}

// §3.4 상태별 화면 텍스트 (frozen — 재정의 금지). win 은 시도 횟수 N 을 포함한다.
const STATE_TEXT = {
  idle: '1~100 사이 숫자를 입력하세요',
  higher: '더 큼 — 더 큰 수를 입력하세요',
  lower: '더 작음 — 더 작은 수를 입력하세요',
  invalid: '1~100 사이 정수를 입력하세요',
};

// §5 best score localStorage 키
const BEST_SCORE_KEY = 'number-guessing:best-score';
const MIN = 1;
const MAX = 100;

// 1~100 정수 난수 정답 생성
function generateAnswer() {
  return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
}

// §5 장애 내성: localStorage 접근 실패해도 게임 진행을 막지 않는다.
function readBestScore() {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    if (raw === null) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isInteger(value) ? value : null;
  } catch {
    return null;
  }
}

function writeBestScore(value) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(value));
  } catch {
    // 저장 실패는 무시 — best score 만 세션 한정으로 동작
  }
}

// 브라우저 로드 시점에만 실행되는 게임 오케스트레이션(§6). node --test 는 이 블록을 건너뛴다.
export function initGame(doc = typeof document !== 'undefined' ? document : undefined) {
  if (!doc) return;

  const form = doc.getElementById('guess-form');
  const input = doc.getElementById('guess-input');
  const submit = doc.getElementById('guess-submit');
  const feedback = doc.getElementById('guess-feedback');
  const attemptsCount = doc.getElementById('attempts-count');
  const bestScoreEl = doc.getElementById('best-score');
  const newGame = doc.getElementById('new-game');

  if (!form || !input || !submit || !feedback || !attemptsCount || !bestScoreEl || !newGame) {
    return;
  }

  let answer = generateAnswer();
  let attempts = 0;

  // §5 표시 규칙: 저장값 없으면 "기록 없음" 대체 텍스트 (빈 값 노출 금지)
  function renderBestScore() {
    const best = readBestScore();
    bestScoreEl.textContent = best === null ? '기록 없음' : `${best}번`;
  }

  function renderAttempts() {
    attemptsCount.textContent = String(attempts);
  }

  // 상태별 화면 텍스트·색상(data-state)·control 재활성화를 한 곳에서 적용
  function setState(state, text) {
    feedback.dataset.state = state;
    feedback.textContent = text;
  }

  function resetGame() {
    answer = generateAnswer();
    attempts = 0;
    renderAttempts();
    setState('idle', STATE_TEXT.idle);
    submit.disabled = false; // §3.4 후조건 불변식: 주 실행 control 재활성화
    newGame.classList.remove('is-emphasized');
    input.value = '';
    input.focus();
  }

  function handleSubmit(event) {
    event.preventDefault();

    const raw = input.value.trim();
    const guess = Number(raw);

    // §6.2 검증: 정수 아님/범위 밖 → invalid, 시도 미증가, submit 유지
    const isValid = raw !== '' && Number.isInteger(guess) && guess >= MIN && guess <= MAX;
    if (!isValid) {
      setState('invalid', STATE_TEXT.invalid);
      submit.disabled = false; // invalid 후에도 주 실행 control 재활성화 유지
      input.focus();
      return;
    }

    attempts += 1;
    renderAttempts();

    const result = judge(guess, answer);
    if (result === 'win') {
      setState('win', `정답! ${attempts}번 만에 맞혔습니다`);
      submit.disabled = true; // §3.4 win: submit 비활성
      newGame.classList.add('is-emphasized'); // new-game 강조

      // §5 best score 갱신: 기존값 없거나 이번이 더 작을 때만
      const best = readBestScore();
      if (best === null || attempts < best) {
        writeBestScore(attempts);
      }
      renderBestScore();
    } else {
      setState(result, STATE_TEXT[result]);
    }

    input.value = '';
    input.focus();
  }

  form.addEventListener('submit', handleSubmit);
  newGame.addEventListener('click', resetGame);

  // 초기 렌더(§6.1)
  renderAttempts();
  renderBestScore();
  setState('idle', STATE_TEXT.idle);
}

// 브라우저에서만 자동 초기화 — node --test 로 import 시에는 실행되지 않는다(§4 import 안전성).
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initGame());
  } else {
    initGame();
  }
}

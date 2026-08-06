// Beat Tap — 렌더/입력 레이어 (BF-1757)
// 설계 계약 §2: engine(순수 로직) 결과를 DOM에 반영하고, 키/포인터 이벤트를 engine 호출로 변환.
// 부수효과(DOM·requestAnimationFrame·이벤트)는 이 파일에만 존재한다.
import {
  DEFAULT_CONFIG,
  LANE_KEYS,
  createInitialState,
  generatePattern,
  resolveHit,
  accuracy,
  advance,
  transition,
} from './engine.js';

const KEY_TO_LANE = { d: 0, f: 1, j: 2, k: 3 };
const JUDGMENT_TEXT = { perfect: 'PERFECT', good: 'GOOD', miss: 'MISS' };

/**
 * 게임 컨트롤러 초기화. DOM 준비 후 1회 호출.
 * @param {Document|HTMLElement} root
 * @param {{rng?: () => number, config?: object}} [deps] rng 주입 가능(테스트/결정론)
 */
export function initGame(root, deps = {}) {
  const config = deps.config || DEFAULT_CONFIG;
  const rng = deps.rng || Math.random;

  const el = {
    gameRoot: root.querySelector('#game-root'),
    score: root.querySelector('#hud-score'),
    combo: root.querySelector('#hud-combo'),
    accuracy: root.querySelector('#hud-accuracy'),
    feedback: root.querySelector('#judgment-feedback'),
    laneContainer: root.querySelector('#lane-container'),
    startButton: root.querySelector('#start-button'),
    pauseButton: root.querySelector('#pause-button'),
    resumeButton: root.querySelector('#resume-button'),
    restartButton: root.querySelector('#result-restart-button'),
    resultPerfect: root.querySelector('#result-perfect'),
    resultGood: root.querySelector('#result-good'),
    resultMiss: root.querySelector('#result-miss'),
    resultMaxCombo: root.querySelector('#result-maxcombo'),
    resultAccuracy: root.querySelector('#result-accuracy'),
  };
  const lanes = Array.from(root.querySelectorAll('.game__lane'));

  let state = createInitialState();
  let startTime = 0;
  let pauseStartedAt = 0;
  let rafId = 0;
  // 노트 id → DOM 요소 캐시
  const noteEls = new Map();

  const nowMs = () =>
    typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

  function setStatusScreen() {
    el.gameRoot.setAttribute('data-state', state.status);
    // 주 실행 control(start-button)은 start 상태에서만 활성(§3.4)
    if (el.startButton) el.startButton.disabled = state.status !== 'start';
    if (el.pauseButton) el.pauseButton.disabled = state.status !== 'playing';
  }

  function updateHud() {
    el.score.textContent = String(state.score);
    el.combo.textContent = String(state.combo);
    el.accuracy.textContent = `${Math.round(accuracy(state))}%`;
  }

  function showFeedback(result) {
    if (!result) return;
    el.feedback.textContent = JUDGMENT_TEXT[result];
    el.feedback.className = `note--${result}`;
  }

  function clearNotes() {
    for (const node of noteEls.values()) node.remove();
    noteEls.clear();
  }

  function renderNotes(elapsed) {
    for (const note of state.notes) {
      const spawnAt = note.time - config.fallDuration;
      const visible =
        note.status === 'pending' && elapsed >= spawnAt && elapsed <= note.time + config.GOOD_WINDOW;
      let node = noteEls.get(note.id);
      if (!visible) {
        if (node) {
          node.remove();
          noteEls.delete(note.id);
        }
        continue;
      }
      if (!node) {
        node = document.createElement('div');
        node.className = 'game__note';
        node.setAttribute('aria-hidden', 'true');
        lanes[note.lane].appendChild(node);
        noteEls.set(note.id, node);
      }
      // 진행 비율: spawn(0, 상단) → 판정선(1). 판정선은 레인 하단 15% 지점.
      const ratio = Math.max(0, Math.min(1, (elapsed - spawnAt) / config.fallDuration));
      node.style.top = `${ratio * 85}%`;
    }
  }

  function tick() {
    if (state.status !== 'playing') return;
    const elapsed = nowMs() - startTime;
    state = advance(state, elapsed, config);
    if (state.status === 'gameover') {
      finish();
      return;
    }
    renderNotes(elapsed);
    updateHud();
    rafId = requestAnimationFrame(tick);
  }

  function startGame() {
    state = transition(createInitialState(), 'start');
    state = { ...state, notes: generatePattern(rng) };
    startTime = nowMs();
    clearNotes();
    el.feedback.textContent = '';
    el.feedback.className = '';
    setStatusScreen();
    updateHud();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function pauseGame() {
    if (state.status !== 'playing') return;
    state = transition(state, 'pause');
    pauseStartedAt = nowMs();
    cancelAnimationFrame(rafId);
    setStatusScreen();
  }

  function resumeGame() {
    if (state.status !== 'paused') return;
    // 정지 동안 흐른 시간만큼 startTime 보정 → elapsed 연속성 유지
    startTime += nowMs() - pauseStartedAt;
    state = transition(state, 'resume');
    setStatusScreen();
    rafId = requestAnimationFrame(tick);
  }

  function finish() {
    cancelAnimationFrame(rafId);
    clearNotes();
    // 결과 집계 표시(§3.4 결과 화면)
    el.resultPerfect.textContent = String(state.counts.perfect);
    el.resultGood.textContent = String(state.counts.good);
    el.resultMiss.textContent = String(state.counts.miss);
    el.resultMaxCombo.textContent = String(state.maxCombo);
    el.resultAccuracy.textContent = `${Math.round(accuracy(state))}%`;
    updateHud();
    setStatusScreen();
  }

  function restartGame() {
    // gameover → 초기값 완전 리셋 후 start 화면으로(§7). start-button 재활성화.
    cancelAnimationFrame(rafId);
    state = transition(state, 'restart');
    clearNotes();
    el.feedback.textContent = '';
    el.feedback.className = '';
    setStatusScreen();
    updateHud();
  }

  function handleHit(lane) {
    if (state.status !== 'playing') return;
    const elapsed = nowMs() - startTime;
    const res = resolveHit(state, lane, elapsed, config);
    state = res.state;
    if (res.result) {
      showFeedback(res.result);
      updateHud();
    }
  }

  // ── 이벤트 바인딩 ──────────────────────────────────────────────
  el.startButton.addEventListener('click', startGame);
  el.pauseButton.addEventListener('click', pauseGame);
  el.resumeButton.addEventListener('click', resumeGame);
  el.restartButton.addEventListener('click', restartGame);

  for (const laneEl of lanes) {
    const lane = Number(laneEl.dataset.lane);
    laneEl.addEventListener('pointerdown', () => handleHit(lane));
  }

  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key in KEY_TO_LANE) {
      handleHit(KEY_TO_LANE[key]);
    }
  });

  // 초기 상태 반영
  setStatusScreen();
  updateHud();

  // 테스트/디버그용 최소 핸들 노출(부수효과 없음)
  return {
    start: startGame,
    pause: pauseGame,
    resume: resumeGame,
    restart: restartGame,
    hit: handleHit,
    getState: () => state,
  };
}

// 브라우저 진입점: DOM 로드 후 자동 초기화
if (typeof document !== 'undefined') {
  const boot = () => initGame(document);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}

export { LANE_KEYS };

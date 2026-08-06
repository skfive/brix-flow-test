// Tone Recall — Web Audio 오실레이터 기반 음 합성 모듈 (BF-1742)
//
// 외부 음원 파일을 쓰지 않고 4색 pad 각각 고유 주파수 음을 오실레이터로 합성한다.
// (implementation-plan §7 오디오 렌더링 계층)

/** pad 색 이름 → 주파수(Hz). 4색 각각 고유한 음. */
export const PAD_FREQUENCIES = {
  green: 329.63,  // E4
  red: 261.63,    // C4
  yellow: 392.0,  // G4
  blue: 220.0,    // A3
};

/**
 * Web Audio 컨텍스트를 감싼 음 합성기를 생성한다.
 * @param {object} [options]
 * @param {typeof AudioContext} [options.AudioContextCtor] 주입 가능한 AudioContext 생성자(테스트/환경 대응)
 */
export function createAudioEngine({ AudioContextCtor } = {}) {
  const Ctor =
    AudioContextCtor ||
    (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
    null;

  let ctx = null;

  function ensureContext() {
    if (!Ctor) return null;
    if (!ctx) {
      try {
        ctx = new Ctor();
      } catch {
        ctx = null;
      }
    }
    return ctx;
  }

  /**
   * 브라우저 정책상 suspend 된 AudioContext 를 사용자 제스처 시 resume 한다.
   * @returns {Promise<void>}
   */
  async function resume() {
    const context = ensureContext();
    if (context && context.state === 'suspended' && typeof context.resume === 'function') {
      try {
        await context.resume();
      } catch {
        /* 오디오 실패는 게임 진행을 막지 않는다 */
      }
    }
  }

  /**
   * 지정한 pad 의 음을 재생한다. 오디오 미지원/실패 시 조용히 no-op.
   * @param {string} pad pad 색 이름
   * @param {number} [durationMs] 재생 길이(ms)
   */
  function playTone(pad, durationMs = 300) {
    const context = ensureContext();
    const freq = PAD_FREQUENCIES[pad];
    if (!context || !freq) return;
    try {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const now = context.currentTime;
      const dur = durationMs / 1000;
      // 짧은 attack/release 로 클릭 노이즈 완화
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(now);
      osc.stop(now + dur);
    } catch {
      /* 오디오 실패는 게임 진행을 막지 않는다 (시각 피드백은 별도 유지) */
    }
  }

  return { resume, playTone, get context() { return ctx; } };
}

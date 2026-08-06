// Tone Recall — 순수 게임 로직 모듈 (BF-1742)
//
// 이 모듈은 DOM·오디오·실시간 타이머에 직접 의존하지 않는 순수 상태 머신입니다.
// 무작위 소스는 외부에서 주입받아(테스트에서 결정적으로 제어) 시퀀스를 생성합니다.
// (implementation-plan §7 로직/렌더링 분리, §7.1 결정적 무작위 주입)

/** 동결된 pad 색 이름 목록 (implementation-plan §3.4 / §8) */
export const PADS = ['green', 'red', 'yellow', 'blue'];

/** 동결된 게임 상태 (implementation-plan §3.3) */
export const STATUS = {
  IDLE: 'idle',
  PLAYBACK: 'playback',
  INPUT: 'input',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
};

/**
 * 게임 인스턴스를 생성한다.
 * @param {object} [options]
 * @param {() => number} [options.random] 0 이상 1 미만을 반환하는 무작위 함수(주입 가능)
 * @param {string[]} [options.pads] pad 색 이름 목록
 */
export function createGame({ random = Math.random, pads = PADS } = {}) {
  const padList = [...pads];

  const state = {
    status: STATUS.IDLE,
    sequence: [],
    round: 0,
    inputIndex: 0,
    pads: [...padList],
    resumeStatus: null,
  };

  function randomPad() {
    const raw = Math.floor(random() * padList.length);
    // 방어적 clamp: random 이 1 을 반환하거나 음수여도 유효 인덱스 유지
    const idx = Math.min(Math.max(raw, 0), padList.length - 1);
    return padList[idx];
  }

  function snapshot() {
    return {
      status: state.status,
      sequence: [...state.sequence],
      round: state.round,
      inputIndex: state.inputIndex,
      pads: [...state.pads],
    };
  }

  /** 다음 라운드로 진입: 시퀀스를 한 칸 늘리고 playback 상태로 전환 */
  function nextRound() {
    state.round += 1;
    state.sequence.push(randomPad());
    state.inputIndex = 0;
    state.status = STATUS.PLAYBACK;
    return snapshot();
  }

  /** 게임(재)시작: 시퀀스·라운드·입력 인덱스를 초기화하고 라운드 1 재생을 시작 */
  function start() {
    state.sequence = [];
    state.round = 0;
    state.inputIndex = 0;
    state.resumeStatus = null;
    return nextRound();
  }

  /** 시퀀스 재생이 끝났음을 알려 입력 대기(input) 상태로 전환 */
  function beginInput() {
    if (state.status !== STATUS.PLAYBACK) return snapshot();
    state.status = STATUS.INPUT;
    state.inputIndex = 0;
    return snapshot();
  }

  /**
   * input 상태에서 pad 입력을 처리한다.
   * playback 등 input 이 아닌 상태에서는 무시(accepted:false)한다.
   * @param {string} pad 눌린 pad 색 이름
   * @returns {{accepted:boolean, correct:(boolean|null), roundComplete:boolean} & ReturnType<typeof snapshot>}
   */
  function pressPad(pad) {
    if (state.status !== STATUS.INPUT) {
      return { ...snapshot(), accepted: false, correct: null, roundComplete: false };
    }
    const expected = state.sequence[state.inputIndex];
    if (pad !== expected) {
      state.status = STATUS.GAMEOVER;
      return { ...snapshot(), accepted: true, correct: false, roundComplete: false };
    }
    state.inputIndex += 1;
    const roundComplete = state.inputIndex >= state.sequence.length;
    if (roundComplete) {
      nextRound();
      return { ...snapshot(), accepted: true, correct: true, roundComplete: true };
    }
    return { ...snapshot(), accepted: true, correct: true, roundComplete: false };
  }

  /** 진행 중 일시정지: 직전 상태를 기억하고 paused 로 전환 */
  function pause() {
    if (state.status === STATUS.PAUSED || state.status === STATUS.GAMEOVER || state.status === STATUS.IDLE) {
      return snapshot();
    }
    state.resumeStatus = state.status;
    state.status = STATUS.PAUSED;
    return snapshot();
  }

  /** 일시정지 해제: 직전 상태로 복귀 */
  function resume() {
    if (state.status !== STATUS.PAUSED) return snapshot();
    state.status = state.resumeStatus ?? STATUS.INPUT;
    state.resumeStatus = null;
    return snapshot();
  }

  /** 초기화: idle 로 되돌리고 모든 진행 상태를 비운다 (AC-5) */
  function reset() {
    state.status = STATUS.IDLE;
    state.sequence = [];
    state.round = 0;
    state.inputIndex = 0;
    state.resumeStatus = null;
    return snapshot();
  }

  return {
    start,
    nextRound,
    beginInput,
    pressPad,
    pause,
    resume,
    reset,
    snapshot,
    getState: snapshot,
  };
}

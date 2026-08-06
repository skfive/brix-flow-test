// BF-1791 · 격리 실증 미니 페이지 — vanilla ESM 상태 머신 + DOM 마운트
//
// frozen ui-contract@v1:
//   - DOM id: mini-root, mini-submit / class: mini, mini__submit
//   - 상태: idle → submitting → success | error
//   - 모든 상태를 색상만이 아닌 화면 텍스트·접근성 이름으로 노출
//   - 초기화·취소·실패 뒤 idle 복원 + 진행 표시 제거 + mini-submit 재활성화
//
// 상태 머신(createMiniFeature)은 DOM 비의존 순수 로직으로 node --test 로 검증하고,
// mount() 가 브라우저에서 이 로직을 실제 DOM 에 연결한다.

export const STATES = Object.freeze({
  IDLE: 'idle',
  SUBMITTING: 'submitting',
  SUCCESS: 'success',
  ERROR: 'error',
});

// 상태마다 색상 외에 화면에 표시할 텍스트 (frozen 접근성 계약)
export const STATE_LABEL = Object.freeze({
  [STATES.IDLE]: '대기 중',
  [STATES.SUBMITTING]: '제출 중…',
  [STATES.SUCCESS]: '제출 성공',
  [STATES.ERROR]: '제출 실패',
});

/**
 * DOM 비의존 미니 페이지 상태 머신.
 * @param {Object} [options]
 * @param {() => (void | Promise<void>)} [options.submitAction] 실제 제출 동작(성공 시 resolve, 실패 시 throw)
 * @param {(snapshot: object) => void} [options.onChange] 상태 전이마다 최신 snapshot 통지
 */
export function createMiniFeature({ submitAction, onChange } = {}) {
  let state = STATES.IDLE;

  const snapshot = () => ({
    state,
    statusText: STATE_LABEL[state],
    // submitting 동안에만 중복 제출을 막고, 그 외 상태는 재사용 가능
    submitDisabled: state === STATES.SUBMITTING,
    progressVisible: state === STATES.SUBMITTING,
  });

  const emit = () => {
    if (typeof onChange === 'function') onChange(snapshot());
  };

  async function submit() {
    if (state === STATES.SUBMITTING) return snapshot(); // 중복 제출 방지
    state = STATES.SUBMITTING;
    emit();
    try {
      if (typeof submitAction === 'function') await submitAction();
      state = STATES.SUCCESS;
    } catch {
      state = STATES.ERROR;
    }
    emit();
    return snapshot();
  }

  function reset() {
    // 초기화·취소·실패 복구 후조건: idle 복원 + 진행 표시 제거 + control 재활성화
    state = STATES.IDLE;
    emit();
    return snapshot();
  }

  return {
    snapshot,
    submit,
    reset,
    get state() {
      return state;
    },
  };
}

/**
 * frozen selector 를 가진 root 요소에 상태 머신을 연결한다 (브라우저 전용).
 * @param {HTMLElement} root #mini-root 컨테이너
 * @param {Object} [options] createMiniFeature 로 전달할 옵션(submitAction 등)
 */
export function mount(root, options = {}) {
  const submitBtn = root.querySelector('#mini-submit');
  const resetBtn = root.querySelector('#mini-reset');
  const statusEl = root.querySelector('[data-mini-status]');
  const progressEl = root.querySelector('[data-mini-progress]');

  const feature = createMiniFeature({
    ...options,
    onChange: render,
  });

  function render(snap = feature.snapshot()) {
    root.dataset.state = snap.state;
    if (statusEl) {
      statusEl.textContent = snap.statusText;
      statusEl.setAttribute('aria-label', `현재 상태: ${snap.statusText}`);
    }
    if (submitBtn) submitBtn.disabled = snap.submitDisabled;
    if (progressEl) progressEl.hidden = !snap.progressVisible;
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      feature.submit();
    });
  }
  if (resetBtn) {
    // 초기화/취소 control — 어떤 상태에서든 idle 로 복원
    resetBtn.addEventListener('click', () => {
      feature.reset();
    });
  }

  render();
  return feature;
}

// 브라우저에서 직접 로드되면 자동 마운트 (node 환경에서는 실행되지 않음)
if (typeof document !== 'undefined') {
  const boot = () => {
    const root = document.getElementById('mini-root');
    if (root) {
      mount(root, {
        // 데모용 제출 동작: 짧은 지연 후 성공
        submitAction: () =>
          new Promise((resolve) => {
            setTimeout(resolve, 600);
          }),
      });
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}

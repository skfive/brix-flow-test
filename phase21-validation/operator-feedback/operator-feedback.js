// BF-1449: 피드백 카드 상태 머신 + DOM 바인딩
// frozen 계약: docs/plans/operator-feedback-BF-1446.md (state 모델·selector·token)

export const STATES = Object.freeze({
  IDLE: 'idle',
  CONFIRMING: 'confirming',
  SUBMITTING: 'submitting',
  SUCCESS: 'success',
  WARNING: 'warning',
  FAILURE: 'failure',
});

export const STATUS_MESSAGES = Object.freeze({
  [STATES.IDLE]: '대기 중입니다. 확인 버튼을 눌러 시작하세요.',
  [STATES.CONFIRMING]: '확인됨 — 제출을 눌러주세요',
  [STATES.SUBMITTING]: '제출 중...',
  [STATES.SUCCESS]: '성공: 처리 완료. 확인 버튼을 눌러 다시 시작할 수 있습니다.',
  [STATES.WARNING]: '경고: 확인이 필요합니다. 확인 버튼을 눌러 다시 시도하세요.',
  [STATES.FAILURE]: '실패: 다시 시도해주세요. 확인 버튼을 눌러 다시 시작하세요.',
});

const TERMINAL_STATES = new Set([STATES.SUCCESS, STATES.WARNING, STATES.FAILURE]);

export class FeedbackCardController {
  constructor({ submitHandler, onTransition } = {}) {
    this.state = STATES.IDLE;
    this.submitHandler =
      typeof submitHandler === 'function' ? submitHandler : async () => ({ outcome: 'success' });
    this.onTransition = typeof onTransition === 'function' ? onTransition : null;
    this.transitions = [];
  }

  getState() {
    return this.state;
  }

  getMessage() {
    return STATUS_MESSAGES[this.state];
  }

  _transition(to) {
    const from = this.state;
    this.state = to;
    const record = { from, to, at: Date.now() };
    this.transitions.push(record);
    if (this.onTransition) this.onTransition(record);
    return true;
  }

  confirm() {
    if (this.state !== STATES.IDLE) return false;
    return this._transition(STATES.CONFIRMING);
  }

  cancel() {
    if (this.state !== STATES.CONFIRMING) return false;
    return this._transition(STATES.IDLE);
  }

  reset() {
    if (!TERMINAL_STATES.has(this.state)) return false;
    return this._transition(STATES.IDLE);
  }

  async submit() {
    if (this.state !== STATES.CONFIRMING) return false;
    this._transition(STATES.SUBMITTING);
    let outcome;
    try {
      const result = await this.submitHandler();
      outcome = result && result.outcome;
    } catch (err) {
      outcome = 'failure';
    }
    if (outcome === 'warning') this._transition(STATES.WARNING);
    else if (outcome === 'failure') this._transition(STATES.FAILURE);
    else this._transition(STATES.SUCCESS);
    return true;
  }
}

export function mount(root, { submitHandler } = {}) {
  const confirmBtn = root.querySelector('#feedback-confirm-btn');
  const submitBtn = root.querySelector('#feedback-submit-btn');
  const statusLive = root.querySelector('#feedback-status-live');
  const messageEl = statusLive.querySelector('.feedback-card__message');

  const controller = new FeedbackCardController({
    submitHandler,
    onTransition: (record) => {
      root.dispatchEvent(
        new CustomEvent('feedback-card:transition', { detail: record, bubbles: true })
      );
    },
  });

  function render() {
    const state = controller.getState();
    root.dataset.state = state;
    statusLive.dataset.state = state;
    statusLive.setAttribute('aria-busy', state === STATES.SUBMITTING ? 'true' : 'false');
    messageEl.textContent = controller.getMessage();

    confirmBtn.disabled = state === STATES.CONFIRMING || state === STATES.SUBMITTING;
    submitBtn.disabled = state !== STATES.CONFIRMING;
  }

  confirmBtn.addEventListener('click', () => {
    if (TERMINAL_STATES.has(controller.getState())) controller.reset();
    else controller.confirm();
    render();
  });

  submitBtn.addEventListener('click', async () => {
    const pending = controller.submit();
    render();
    await pending;
    render();
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      controller.cancel();
      render();
    }
  });

  render();
  return controller;
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('feedback-card-root');
  if (root) mount(root);
}

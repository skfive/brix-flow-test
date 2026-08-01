import test from 'node:test';
import assert from 'node:assert/strict';
import { FeedbackCardController, STATES, STATUS_MESSAGES } from './operator-feedback.js';

test('초기 상태는 idle이며 대기 안내 문구를 노출한다', () => {
  const controller = new FeedbackCardController();
  assert.equal(controller.getState(), STATES.IDLE);
  assert.equal(controller.getMessage(), STATUS_MESSAGES.idle);
});

test('idle에서 confirm() 호출 시 confirming으로 전이한다', () => {
  const controller = new FeedbackCardController();
  assert.equal(controller.confirm(), true);
  assert.equal(controller.getState(), STATES.CONFIRMING);
  assert.equal(controller.getMessage(), STATUS_MESSAGES.confirming);
});

test('confirming이 아닌 상태에서는 confirm()이 무시된다', () => {
  const controller = new FeedbackCardController();
  controller.confirm();
  assert.equal(controller.confirm(), false);
  assert.equal(controller.getState(), STATES.CONFIRMING);
});

test('confirming에서 cancel() 호출 시 idle로 복원된다', () => {
  const controller = new FeedbackCardController();
  controller.confirm();
  assert.equal(controller.cancel(), true);
  assert.equal(controller.getState(), STATES.IDLE);
  assert.equal(controller.getMessage(), STATUS_MESSAGES.idle);
});

test('idle에서 cancel()은 무시된다', () => {
  const controller = new FeedbackCardController();
  assert.equal(controller.cancel(), false);
  assert.equal(controller.getState(), STATES.IDLE);
});

test('confirming -> submit() 성공 응답 시 success로 전이한다', async () => {
  const controller = new FeedbackCardController({
    submitHandler: async () => ({ outcome: 'success' }),
  });
  controller.confirm();
  const started = controller.submit();
  assert.equal(controller.getState(), STATES.SUBMITTING);
  assert.equal(controller.getMessage(), STATUS_MESSAGES.submitting);
  await started;
  assert.equal(controller.getState(), STATES.SUCCESS);
  assert.equal(controller.getMessage(), STATUS_MESSAGES.success);
});

test('confirming -> submit() 경고 응답 시 warning으로 전이한다', async () => {
  const controller = new FeedbackCardController({
    submitHandler: async () => ({ outcome: 'warning' }),
  });
  controller.confirm();
  await controller.submit();
  assert.equal(controller.getState(), STATES.WARNING);
  assert.equal(controller.getMessage(), STATUS_MESSAGES.warning);
});

test('confirming -> submit() 실패 응답 시 failure로 전이한다', async () => {
  const controller = new FeedbackCardController({
    submitHandler: async () => ({ outcome: 'failure' }),
  });
  controller.confirm();
  await controller.submit();
  assert.equal(controller.getState(), STATES.FAILURE);
  assert.equal(controller.getMessage(), STATUS_MESSAGES.failure);
});

test('submitHandler가 예외를 던지면 failure로 전이한다', async () => {
  const controller = new FeedbackCardController({
    submitHandler: async () => {
      throw new Error('network error');
    },
  });
  controller.confirm();
  await controller.submit();
  assert.equal(controller.getState(), STATES.FAILURE);
});

test('submitting 중 중복 submit() 호출은 차단된다', async () => {
  let resolveHandler;
  const controller = new FeedbackCardController({
    submitHandler: () =>
      new Promise((resolve) => {
        resolveHandler = resolve;
      }),
  });
  controller.confirm();

  const first = controller.submit();
  assert.equal(controller.getState(), STATES.SUBMITTING);

  // 진행 중 중복 클릭 시뮬레이션
  const second = controller.submit();
  assert.equal(await second, false);
  assert.equal(controller.getState(), STATES.SUBMITTING);

  resolveHandler({ outcome: 'success' });
  await first;

  assert.equal(controller.getState(), STATES.SUCCESS);
  // 중복 호출이 전이 로그에 추가 submitting 기록을 남기지 않아야 한다
  const submittingCount = controller.transitions.filter((t) => t.to === STATES.SUBMITTING).length;
  assert.equal(submittingCount, 1);
});

test('실패 후 reset()으로 idle 복원되고 confirm 컨트롤이 재활성화된다', async () => {
  const controller = new FeedbackCardController({
    submitHandler: async () => ({ outcome: 'failure' }),
  });
  controller.confirm();
  await controller.submit();
  assert.equal(controller.getState(), STATES.FAILURE);

  assert.equal(controller.reset(), true);
  assert.equal(controller.getState(), STATES.IDLE);

  // 재활성화된 confirm 컨트롤로 새 사이클을 다시 시작할 수 있어야 한다
  assert.equal(controller.confirm(), true);
  assert.equal(controller.getState(), STATES.CONFIRMING);
});

test('success/warning/failure가 아닌 상태에서 reset()은 무시된다', () => {
  const controller = new FeedbackCardController();
  assert.equal(controller.reset(), false);
  controller.confirm();
  assert.equal(controller.reset(), false);
  assert.equal(controller.getState(), STATES.CONFIRMING);
});

test('6개 상태 모두 색상 외 화면 텍스트 메시지(다음 행동 안내 포함)를 갖는다', () => {
  for (const state of Object.values(STATES)) {
    const message = STATUS_MESSAGES[state];
    assert.equal(typeof message, 'string');
    assert.ok(message.length > 0, `${state} 상태 메시지가 비어있음`);
  }
});

test('KPI 계측: 상태 전이마다 from/to/at 레코드가 기록되고 onTransition 콜백이 호출된다', async () => {
  const observed = [];
  const controller = new FeedbackCardController({
    submitHandler: async () => ({ outcome: 'success' }),
    onTransition: (record) => observed.push(record),
  });

  controller.confirm();
  await controller.submit();

  const sequence = controller.transitions.map((t) => `${t.from}->${t.to}`);
  assert.deepEqual(sequence, ['idle->confirming', 'confirming->submitting', 'submitting->success']);

  for (const record of controller.transitions) {
    assert.equal(typeof record.at, 'number');
  }
  assert.equal(observed.length, controller.transitions.length);
});

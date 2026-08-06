// Tone Recall — 순수 게임 로직 단위 테스트 (BF-1742)
// 실행: node --test webaudio-memory-tone/tests/game.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, PADS, STATUS } from '../src/game.js';

/**
 * 결정적 무작위 스텁: 주어진 pad 인덱스 시퀀스를 순서대로 반환하도록
 * random() 값을 (idx + 0.5) / n 으로 매핑한다. 소진되면 0 을 반환.
 */
function stubRandom(indices, padCount = PADS.length) {
  let i = 0;
  return () => {
    const idx = i < indices.length ? indices[i] : 0;
    i += 1;
    return (idx + 0.5) / padCount;
  };
}

test('start: idle → playback, 라운드 1, 결정적 시퀀스 길이 1', () => {
  const game = createGame({ random: stubRandom([0]) }); // green
  const snap = game.start();
  assert.equal(snap.status, STATUS.PLAYBACK);
  assert.equal(snap.round, 1);
  assert.deepEqual(snap.sequence, ['green']);
  assert.equal(snap.inputIndex, 0);
});

test('결정적 무작위 주입: 주입한 인덱스대로 pad 가 선택된다', () => {
  const game = createGame({ random: stubRandom([1, 3, 2]) }); // red, blue, yellow
  game.start();          // seq: [red]
  game.beginInput();
  game.pressPad('red');  // roundComplete → nextRound push blue
  const snap = game.snapshot();
  assert.deepEqual(snap.sequence, ['red', 'blue']);
});

test('beginInput: playback → input 으로 전환', () => {
  const game = createGame({ random: stubRandom([0]) });
  game.start();
  const snap = game.beginInput();
  assert.equal(snap.status, STATUS.INPUT);
});

test('정답 전체 입력: 라운드 증가 + 시퀀스 확장 + playback 복귀 (AC-3)', () => {
  const game = createGame({ random: stubRandom([0, 1]) }); // green, red
  game.start();          // seq [green], round 1
  game.beginInput();
  const res = game.pressPad('green');
  assert.equal(res.correct, true);
  assert.equal(res.roundComplete, true);
  assert.equal(res.round, 2);
  assert.equal(res.status, STATUS.PLAYBACK);
  assert.deepEqual(res.sequence, ['green', 'red']);
});

test('두 칸 시퀀스: 첫 입력만으로 라운드 종료되지 않는다', () => {
  const game = createGame({ random: stubRandom([0, 1, 2]) });
  game.start();          // [green]
  game.beginInput();
  game.pressPad('green'); // → round2 [green, red]
  game.beginInput();
  const first = game.pressPad('green');
  assert.equal(first.correct, true);
  assert.equal(first.roundComplete, false);
  assert.equal(first.status, STATUS.INPUT);
  assert.equal(first.inputIndex, 1);
  const second = game.pressPad('red');
  assert.equal(second.roundComplete, true);
  assert.equal(second.round, 3);
});

test('오답: input 중 잘못된 pad → gameover (AC-4)', () => {
  const game = createGame({ random: stubRandom([0, 1]) });
  game.start();          // [green]
  game.beginInput();
  game.pressPad('green'); // round2 [green, red]
  game.beginInput();
  const res = game.pressPad('blue'); // expected green
  assert.equal(res.accepted, true);
  assert.equal(res.correct, false);
  assert.equal(res.status, STATUS.GAMEOVER);
});

test('첫 pad 부터 오답 → 즉시 gameover (edge case)', () => {
  const game = createGame({ random: stubRandom([2]) }); // yellow
  game.start();
  game.beginInput();
  const res = game.pressPad('green');
  assert.equal(res.status, STATUS.GAMEOVER);
  assert.equal(res.correct, false);
});

test('playback 중 입력은 무시된다 (AC-2)', () => {
  const game = createGame({ random: stubRandom([0]) });
  game.start(); // status playback
  const res = game.pressPad('green');
  assert.equal(res.accepted, false);
  assert.equal(res.correct, null);
  assert.equal(res.status, STATUS.PLAYBACK);
});

test('gameover 후 reset → idle 초기화 (AC-5)', () => {
  const game = createGame({ random: stubRandom([0, 1]) });
  game.start();
  game.beginInput();
  game.pressPad('green');
  game.beginInput();
  game.pressPad('blue'); // gameover
  const snap = game.reset();
  assert.equal(snap.status, STATUS.IDLE);
  assert.deepEqual(snap.sequence, []);
  assert.equal(snap.round, 0);
  assert.equal(snap.inputIndex, 0);
});

test('gameover 후 재시작(start) → 상태 잔존 없이 라운드 1 로 초기화 (AC-5)', () => {
  const game = createGame({ random: stubRandom([2, 3]) }); // yellow, blue
  game.start();
  game.beginInput();
  game.pressPad('green'); // gameover (expected yellow)
  const snap = game.start();
  assert.equal(snap.status, STATUS.PLAYBACK);
  assert.equal(snap.round, 1);
  assert.equal(snap.sequence.length, 1);
  assert.equal(snap.inputIndex, 0);
});

test('pause/resume: 직전 상태(input)로 복귀', () => {
  const game = createGame({ random: stubRandom([0]) });
  game.start();
  game.beginInput(); // input
  const paused = game.pause();
  assert.equal(paused.status, STATUS.PAUSED);
  const resumed = game.resume();
  assert.equal(resumed.status, STATUS.INPUT);
});

test('random 이 1 을 반환해도 유효 pad 를 반환한다 (clamp)', () => {
  const game = createGame({ random: () => 1 });
  const snap = game.start();
  assert.ok(PADS.includes(snap.sequence[0]));
  assert.equal(snap.sequence[0], PADS[PADS.length - 1]); // blue
});

test('snapshot 은 내부 상태의 복사본이라 외부 변경이 전파되지 않는다', () => {
  const game = createGame({ random: stubRandom([0]) });
  const snap = game.start();
  snap.sequence.push('tampered');
  assert.deepEqual(game.snapshot().sequence, ['green']);
});

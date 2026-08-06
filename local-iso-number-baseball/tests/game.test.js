import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSecret,
  scoreGuess,
  validateGuess,
  createGame,
  MAX_ATTEMPTS,
  DIGITS_COUNT,
} from '../src/game.js';

// 결정적 RNG — 미리 정한 시퀀스를 순환 반환한다(restart 시 동일 정답 재생성).
function seqRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

// index k(0-base)를 길이 L 풀에서 뽑는 안전한 rng 값(버킷 중앙).
const bucket = (k, len) => (k + 0.5) / len;

test('AC-1: generateSecret은 결정적 RNG로 지정한 세 자리 정답을 만든다', () => {
  // [3,7,1] → 풀 길이 9에서 idx2, 길이 8에서 idx5, 길이 7에서 idx0
  const rng = seqRng([bucket(2, 9), bucket(5, 8), bucket(0, 7)]);
  assert.deepEqual(generateSecret(rng), [3, 7, 1]);
});

test('AC-1: generateSecret은 서로 다른 세 자리(1–9)를 반환하며 동일 RNG면 동일 결과', () => {
  const secret = generateSecret(seqRng([0]));
  assert.equal(secret.length, DIGITS_COUNT);
  assert.equal(new Set(secret).size, DIGITS_COUNT);
  secret.forEach((d) => assert.ok(d >= 1 && d <= 9));
  assert.deepEqual(secret, [1, 2, 3]);
  assert.deepEqual(generateSecret(seqRng([0])), [1, 2, 3]);
});

test('AC-2: scoreGuess는 스트라이크/볼을 정확히 계산한다', () => {
  assert.deepEqual(scoreGuess([3, 7, 1], [1, 7, 2]), { strikes: 1, balls: 1, out: false });
});

test('AC-3: scoreGuess는 겹치는 숫자가 없으면 out=true', () => {
  assert.deepEqual(scoreGuess([3, 7, 1], [4, 5, 6]), { strikes: 0, balls: 0, out: true });
});

test('scoreGuess: 3 스트라이크와 볼-only 케이스', () => {
  assert.deepEqual(scoreGuess([1, 2, 3], [1, 2, 3]), { strikes: 3, balls: 0, out: false });
  assert.deepEqual(scoreGuess([3, 7, 1], [1, 3, 7]), { strikes: 0, balls: 3, out: false });
});

test('AC-6: validateGuess는 유효/무효 입력을 판별한다', () => {
  assert.deepEqual(validateGuess('123'), { valid: true, digits: [1, 2, 3] });
  assert.equal(validateGuess('12').valid, false); // 길이 부족
  assert.equal(validateGuess('1234').valid, false); // 길이 초과
  assert.equal(validateGuess('12a').valid, false); // 숫자 아님
  assert.equal(validateGuess('112').valid, false); // 중복 자리
  assert.equal(validateGuess('').valid, false); // 빈 입력
  assert.equal(validateGuess('120').valid, false); // 0 포함
  // 무효 입력은 error 메시지를 갖는다
  assert.ok(typeof validateGuess('112').error === 'string');
});

test('createGame: 초기 상태는 playing, 정답은 주입 RNG로 결정적', () => {
  const game = createGame({ rng: seqRng([0]) });
  assert.equal(game.getState(), 'playing');
  assert.equal(game.getAttemptsUsed(), 0);
  assert.deepEqual(game.getSecret(), [1, 2, 3]);
});

test('AC-6: 유효하지 않은 추측은 시도를 소모하지 않고 error를 돌려준다', () => {
  const game = createGame({ rng: seqRng([0]) });
  const result = game.submit('112');
  assert.equal(result.state, 'playing');
  assert.equal(result.attemptsUsed, 0);
  assert.ok(result.error);
  assert.equal(game.getAttemptsUsed(), 0);
});

test('AC-4: 3 스트라이크 추측 제출 시 상태가 win으로 전이된다', () => {
  const game = createGame({ rng: seqRng([0]) }); // secret [1,2,3]
  const result = game.submit('123');
  assert.equal(result.state, 'win');
  assert.equal(result.strikes, 3);
  assert.equal(game.getState(), 'win');
});

test('win 이후 제출은 무시되고 error를 돌려준다', () => {
  const game = createGame({ rng: seqRng([0]) });
  game.submit('123');
  const after = game.submit('456');
  assert.equal(after.state, 'win');
  assert.ok(after.error);
});

test('AC-5: 9회 유효 시도를 소진하고 못 맞히면 lose, 정답이 노출 가능하다', () => {
  const game = createGame({ rng: seqRng([0]) }); // secret [1,2,3]
  const wrong = ['456', '789', '214', '325', '136', '241', '352', '163', '452'];
  wrong.forEach((guess, i) => {
    const result = game.submit(guess);
    if (i < wrong.length - 1) {
      assert.equal(result.state, 'playing', `${i + 1}회차는 아직 playing`);
    }
  });
  assert.equal(game.getState(), 'lose');
  assert.equal(game.getAttemptsUsed(), MAX_ATTEMPTS);
  assert.deepEqual(game.getSecret(), [1, 2, 3]);
});

test('9회째 시도에서 정답을 맞히면 lose가 아니라 win', () => {
  const game = createGame({ rng: seqRng([0]) });
  const wrong = ['456', '789', '214', '325', '136', '241', '352', '163'];
  wrong.forEach((guess) => game.submit(guess));
  assert.equal(game.getState(), 'playing');
  const final = game.submit('123');
  assert.equal(final.state, 'win');
  assert.equal(final.attemptsUsed, MAX_ATTEMPTS);
});

test('AC-7: restart 시 상태·시도가 초기화되고 정답이 재생성된다', () => {
  const game = createGame({ rng: seqRng([0]) });
  game.submit('123'); // win
  assert.equal(game.getState(), 'win');
  game.restart();
  assert.equal(game.getState(), 'playing');
  assert.equal(game.getAttemptsUsed(), 0);
  assert.deepEqual(game.getSecret(), [1, 2, 3]);
});

test('MAX_ATTEMPTS 기본값은 9이며 maxAttempts 주입으로 조절된다', () => {
  assert.equal(MAX_ATTEMPTS, 9);
  const game = createGame({ rng: seqRng([0]), maxAttempts: 2 });
  game.submit('456');
  assert.equal(game.getState(), 'playing');
  game.submit('789');
  assert.equal(game.getState(), 'lose');
});

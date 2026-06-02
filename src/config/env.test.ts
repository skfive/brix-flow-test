import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  requireEnv,
  optionalEnv,
  parseIntEnv,
  parseBoolEnv,
} from './env.ts';

describe('requireEnv — 정상', () => {
  it('값이 있으면 그 값을 반환한다', () => {
    assert.equal(requireEnv('FOO', { FOO: 'bar' }), 'bar');
  });

  it('주입한 env 객체에서 값을 읽는다', () => {
    assert.equal(requireEnv('PORT', { PORT: '8080' }), '8080');
  });
});

describe('requireEnv — 누락 (AC1)', () => {
  it('변수가 없으면 변수명을 포함한 에러를 던진다', () => {
    assert.throws(
      () => requireEnv('FOO', {}),
      (err: unknown) => err instanceof Error && err.message.includes('FOO'),
    );
  });

  it('빈 문자열은 누락으로 간주하고 에러를 던진다', () => {
    assert.throws(
      () => requireEnv('FOO', { FOO: '' }),
      (err: unknown) => err instanceof Error && err.message.includes('FOO'),
    );
  });

  it('공백만 있는 값도 누락으로 간주한다', () => {
    assert.throws(
      () => requireEnv('FOO', { FOO: '   ' }),
      (err: unknown) => err instanceof Error && err.message.includes('FOO'),
    );
  });
});

describe('optionalEnv — 정상', () => {
  it('값이 있으면 그 값을 반환한다', () => {
    assert.equal(optionalEnv('FOO', 'fallback', { FOO: 'bar' }), 'bar');
  });
});

describe('optionalEnv — 누락 → fallback (AC2)', () => {
  it('값이 없으면 fallback 을 반환한다', () => {
    assert.equal(optionalEnv('FOO', 'fallback', {}), 'fallback');
  });

  it('빈 문자열도 누락으로 보고 fallback 을 반환한다', () => {
    assert.equal(optionalEnv('FOO', 'fallback', { FOO: '' }), 'fallback');
  });

  it('fallback 미지정 시 값이 없으면 undefined 를 반환한다', () => {
    assert.equal(optionalEnv('FOO', undefined, {}), undefined);
  });
});

describe('parseIntEnv — 정상', () => {
  it('정수 문자열을 number 로 파싱한다', () => {
    assert.equal(parseIntEnv('PORT', 3000, { PORT: '8080' }), 8080);
  });

  it('음수 정수도 파싱한다', () => {
    assert.equal(parseIntEnv('OFFSET', 0, { OFFSET: '-5' }), -5);
  });

  it('앞뒤 공백이 있어도 파싱한다', () => {
    assert.equal(parseIntEnv('PORT', 3000, { PORT: '  42  ' }), 42);
  });
});

describe('parseIntEnv — 누락/파싱실패 → fallback (AC2)', () => {
  it('값이 없으면 fallback 을 반환한다', () => {
    assert.equal(parseIntEnv('PORT', 3000, {}), 3000);
  });

  it('정수가 아닌 문자열은 fallback 을 반환한다', () => {
    assert.equal(parseIntEnv('PORT', 3000, { PORT: 'abc' }), 3000);
  });

  it('소수점/혼합 문자열(12abc)은 파싱실패로 보고 fallback 을 반환한다', () => {
    assert.equal(parseIntEnv('PORT', 3000, { PORT: '12abc' }), 3000);
    assert.equal(parseIntEnv('PORT', 3000, { PORT: '3.14' }), 3000);
  });

  it('빈 문자열은 fallback 을 반환한다', () => {
    assert.equal(parseIntEnv('PORT', 3000, { PORT: '' }), 3000);
  });
});

describe('parseBoolEnv — true 케이스 (AC3)', () => {
  it("'true' 는 true 를 반환한다", () => {
    assert.equal(parseBoolEnv('FLAG', false, { FLAG: 'true' }), true);
  });

  it("'1' 은 true 를 반환한다", () => {
    assert.equal(parseBoolEnv('FLAG', false, { FLAG: '1' }), true);
  });

  it("대소문자·공백을 정규화한다 ('  TRUE  ' → true)", () => {
    assert.equal(parseBoolEnv('FLAG', false, { FLAG: '  TRUE  ' }), true);
  });
});

describe('parseBoolEnv — false 케이스 (AC3)', () => {
  it("'false' 는 false 를 반환한다", () => {
    assert.equal(parseBoolEnv('FLAG', true, { FLAG: 'false' }), false);
  });

  it("'0' 은 false 를 반환한다", () => {
    assert.equal(parseBoolEnv('FLAG', true, { FLAG: '0' }), false);
  });

  it("그 외 임의 문자열('yes')은 false 를 반환한다", () => {
    assert.equal(parseBoolEnv('FLAG', true, { FLAG: 'yes' }), false);
  });
});

describe('parseBoolEnv — 누락 → fallback', () => {
  it('값이 없으면 fallback(false) 을 반환한다', () => {
    assert.equal(parseBoolEnv('FLAG', false, {}), false);
  });

  it('값이 없고 fallback 이 true 면 true 를 반환한다', () => {
    assert.equal(parseBoolEnv('FLAG', true, {}), true);
  });

  it('fallback 미지정 시 누락이면 false 를 반환한다', () => {
    assert.equal(parseBoolEnv('FLAG', undefined, {}), false);
  });
});

describe('env — 입력 검증', () => {
  it('requireEnv: name 이 문자열이 아니면 TypeError 를 던진다', () => {
    // @ts-expect-error 런타임 방어 동작 검증을 위해 의도적으로 잘못된 타입 전달
    assert.throws(() => requireEnv(123, {}), TypeError);
  });
});

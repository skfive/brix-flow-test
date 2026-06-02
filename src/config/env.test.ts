import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  requireEnv,
  optionalEnv,
  parseIntEnv,
  parseBoolEnv,
} from './env.ts';

// 테스트 격리: 실제 환경변수를 오염시키지 않도록 사용한 키를 추적해 정리한다.
const TEST_KEYS = [
  'BF781_REQUIRED',
  'BF781_OPTIONAL',
  'BF781_INT',
  'BF781_BOOL',
] as const;

function clearTestKeys(): void {
  for (const key of TEST_KEYS) {
    delete process.env[key];
  }
}

beforeEach(clearTestKeys);
afterEach(clearTestKeys);

describe('requireEnv', () => {
  it('값이 설정돼 있으면 그 문자열을 반환한다 (정상)', () => {
    process.env.BF781_REQUIRED = 'hello';
    assert.equal(requireEnv('BF781_REQUIRED'), 'hello');
  });

  it('값 앞뒤 공백을 trim 하여 반환한다', () => {
    process.env.BF781_REQUIRED = '  spaced  ';
    assert.equal(requireEnv('BF781_REQUIRED'), 'spaced');
  });

  it('값이 없으면 명시적 에러를 던진다 (누락)', () => {
    assert.throws(() => requireEnv('BF781_REQUIRED'), /BF781_REQUIRED/);
  });

  it('빈 문자열/공백만 있으면 누락으로 간주해 에러를 던진다', () => {
    process.env.BF781_REQUIRED = '   ';
    assert.throws(() => requireEnv('BF781_REQUIRED'), /BF781_REQUIRED/);
  });

  it('name 이 빈 문자열이면 TypeError 를 던진다', () => {
    assert.throws(() => requireEnv(''), TypeError);
  });
});

describe('optionalEnv', () => {
  it('값이 설정돼 있으면 그 문자열을 반환한다 (정상)', () => {
    process.env.BF781_OPTIONAL = 'world';
    assert.equal(optionalEnv('BF781_OPTIONAL'), 'world');
  });

  it('값 앞뒤 공백을 trim 하여 반환한다', () => {
    process.env.BF781_OPTIONAL = '  trimmed  ';
    assert.equal(optionalEnv('BF781_OPTIONAL'), 'trimmed');
  });

  it('값이 없고 기본값이 없으면 undefined 를 반환한다', () => {
    assert.equal(optionalEnv('BF781_OPTIONAL'), undefined);
  });

  it('값이 없으면 기본값을 반환한다', () => {
    assert.equal(optionalEnv('BF781_OPTIONAL', 'fallback'), 'fallback');
  });

  it('빈 문자열/공백만 있으면 기본값을 반환한다', () => {
    process.env.BF781_OPTIONAL = '   ';
    assert.equal(optionalEnv('BF781_OPTIONAL', 'fallback'), 'fallback');
  });

  it('name 이 빈 문자열이면 TypeError 를 던진다', () => {
    assert.throws(() => optionalEnv(''), TypeError);
  });
});

describe('parseIntEnv', () => {
  it('정수 문자열을 number 로 파싱한다 (정상)', () => {
    process.env.BF781_INT = '42';
    assert.equal(parseIntEnv('BF781_INT'), 42);
  });

  it('음의 정수도 파싱한다', () => {
    process.env.BF781_INT = '-7';
    assert.equal(parseIntEnv('BF781_INT'), -7);
  });

  it('앞뒤 공백이 있어도 파싱한다', () => {
    process.env.BF781_INT = '  100  ';
    assert.equal(parseIntEnv('BF781_INT'), 100);
  });

  it('값이 없고 기본값이 있으면 기본값을 반환한다', () => {
    assert.equal(parseIntEnv('BF781_INT', 9), 9);
  });

  it('값이 없고 기본값도 없으면 에러를 던진다 (누락)', () => {
    assert.throws(() => parseIntEnv('BF781_INT'), /BF781_INT/);
  });

  it('정수가 아닌 값이면 에러를 던진다 (파싱 실패)', () => {
    process.env.BF781_INT = 'abc';
    assert.throws(() => parseIntEnv('BF781_INT'), /BF781_INT/);
  });

  it('실수 문자열이면 에러를 던진다 (정수만 허용)', () => {
    process.env.BF781_INT = '3.14';
    assert.throws(() => parseIntEnv('BF781_INT'), /BF781_INT/);
  });

  it('숫자 뒤 문자가 붙으면 에러를 던진다 (parseInt 의 느슨함 방지)', () => {
    process.env.BF781_INT = '12px';
    assert.throws(() => parseIntEnv('BF781_INT'), /BF781_INT/);
  });

  it('name 이 빈 문자열이면 TypeError 를 던진다', () => {
    assert.throws(() => parseIntEnv(''), TypeError);
  });
});

describe('parseBoolEnv', () => {
  it("'true' 를 true 로 파싱한다 (정상, 대소문자 무관)", () => {
    process.env.BF781_BOOL = 'TRUE';
    assert.equal(parseBoolEnv('BF781_BOOL'), true);
  });

  it("'false' 를 false 로 파싱한다", () => {
    process.env.BF781_BOOL = 'false';
    assert.equal(parseBoolEnv('BF781_BOOL'), false);
  });

  it("'1' 을 true, '0' 을 false 로 파싱한다", () => {
    process.env.BF781_BOOL = '1';
    assert.equal(parseBoolEnv('BF781_BOOL'), true);
    process.env.BF781_BOOL = '0';
    assert.equal(parseBoolEnv('BF781_BOOL'), false);
  });

  it('앞뒤 공백이 있어도 파싱한다', () => {
    process.env.BF781_BOOL = '  true  ';
    assert.equal(parseBoolEnv('BF781_BOOL'), true);
  });

  it('값이 없고 기본값이 있으면 기본값을 반환한다', () => {
    assert.equal(parseBoolEnv('BF781_BOOL', true), true);
    assert.equal(parseBoolEnv('BF781_BOOL', false), false);
  });

  it('값이 없고 기본값도 없으면 에러를 던진다 (누락)', () => {
    assert.throws(() => parseBoolEnv('BF781_BOOL'), /BF781_BOOL/);
  });

  it('인식할 수 없는 값이면 에러를 던진다 (파싱 실패)', () => {
    process.env.BF781_BOOL = 'yes';
    assert.throws(() => parseBoolEnv('BF781_BOOL'), /BF781_BOOL/);
  });

  it('name 이 빈 문자열이면 TypeError 를 던진다', () => {
    assert.throws(() => parseBoolEnv(''), TypeError);
  });
});

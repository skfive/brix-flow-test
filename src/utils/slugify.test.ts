import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { slugify } from './slugify.ts';

describe('slugify — 기본 변환 규칙', () => {
  it('공백을 하이픈으로 치환한다', () => {
    assert.equal(slugify('hello world'), 'hello-world');
  });

  it('대문자를 소문자로 변환한다', () => {
    assert.equal(slugify('Hello World'), 'hello-world');
  });

  it('영숫자·하이픈 외 특수문자를 제거한다', () => {
    assert.equal(slugify('Hello, World!'), 'hello-world');
    assert.equal(slugify('a@b#c$d'), 'abcd');
  });

  it('숫자는 보존한다', () => {
    assert.equal(slugify('Top 10 Movies'), 'top-10-movies');
  });
});

describe('slugify — 다중 공백·하이픈 정규화', () => {
  it('다중 공백을 단일 하이픈으로 축약한다', () => {
    assert.equal(slugify('hello    world'), 'hello-world');
  });

  it('탭·개행 등 공백 문자도 하이픈으로 처리한다', () => {
    assert.equal(slugify('hello\tworld\nfoo'), 'hello-world-foo');
  });

  it('연속 하이픈을 단일 하이픈으로 축약한다', () => {
    assert.equal(slugify('hello---world'), 'hello-world');
    assert.equal(slugify('a - - b'), 'a-b');
  });

  it('양끝 하이픈을 제거한다', () => {
    assert.equal(slugify('-hello-world-'), 'hello-world');
    assert.equal(slugify('  hello world  '), 'hello-world');
    assert.equal(slugify('!!!hello!!!'), 'hello');
  });
});

describe('slugify — 엣지 케이스', () => {
  it('빈 문자열은 빈 문자열을 반환한다', () => {
    assert.equal(slugify(''), '');
  });

  it('특수문자만 있는 입력은 빈 문자열을 반환한다', () => {
    assert.equal(slugify('!@#$%^&*()'), '');
    assert.equal(slugify('---'), '');
    assert.equal(slugify('   '), '');
  });

  it('유니코드(비 ASCII) 문자는 제거한다', () => {
    assert.equal(slugify('카페 라떼'), '');
    assert.equal(slugify('café'), 'caf');
    assert.equal(slugify('한글 hello 월드'), 'hello');
    assert.equal(slugify('日本語 test'), 'test');
  });

  it('이미 슬러그 형태인 입력은 그대로 유지한다', () => {
    assert.equal(slugify('already-a-slug'), 'already-a-slug');
  });
});

describe('slugify — 입력 검증', () => {
  it('문자열이 아닌 입력은 TypeError 를 던진다', () => {
    // @ts-expect-error 잘못된 타입 입력 테스트
    assert.throws(() => slugify(123), TypeError);
    // @ts-expect-error 잘못된 타입 입력 테스트
    assert.throws(() => slugify(null), TypeError);
    // @ts-expect-error 잘못된 타입 입력 테스트
    assert.throws(() => slugify(undefined), TypeError);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { slugify } from './slugify.ts';

describe('slugify — 수용 기준', () => {
  it("'  Hello, World!  ' 를 정확히 'hello-world' 로 변환한다 (AC3)", () => {
    assert.equal(slugify('  Hello, World!  '), 'hello-world');
  });
});

describe('slugify — 빈 문자열', () => {
  it('빈 문자열은 빈 문자열을 반환한다', () => {
    assert.equal(slugify(''), '');
  });

  it('공백만 있는 문자열은 빈 문자열을 반환한다', () => {
    assert.equal(slugify('   '), '');
  });

  it('영숫자가 없는(특수문자만) 문자열은 빈 문자열을 반환한다', () => {
    assert.equal(slugify('!@#$%^&*()'), '');
  });
});

describe('slugify — 특수문자 제거', () => {
  it('영숫자·하이픈 외 문자를 제거한다', () => {
    assert.equal(slugify('Foo & Bar!'), 'foo-bar');
  });

  it('문장부호로 분리된 단어를 하이픈으로 잇는다', () => {
    assert.equal(slugify('Hello, World!'), 'hello-world');
  });

  it('공백 없이 붙은 특수문자는 단어를 합친다', () => {
    assert.equal(slugify('Hello@World'), 'helloworld');
  });
});

describe('slugify — 다중 공백', () => {
  it('연속 공백을 하이픈 하나로 축약한다', () => {
    assert.equal(slugify('a   b    c'), 'a-b-c');
  });

  it('탭·개행 등 공백류도 하이픈으로 처리한다', () => {
    assert.equal(slugify('a\t\tb\nc'), 'a-b-c');
  });
});

describe('slugify — 유니코드', () => {
  it('비ASCII(한글) 문자를 제거하고 주변 하이픈을 정리한다', () => {
    assert.equal(slugify('Hello 한글 World'), 'hello-world');
  });

  it('악센트 등 비ASCII 문자를 제거한다', () => {
    assert.equal(slugify('Héllo Wörld'), 'hllo-wrld');
  });

  it('한글만 있으면 빈 문자열을 반환한다', () => {
    assert.equal(slugify('제목 입니다'), '');
  });

  it('이모지를 제거한다', () => {
    assert.equal(slugify('coffee ☕ time'), 'coffee-time');
  });
});

describe('slugify — 하이픈 정규화', () => {
  it('소문자로 변환한다', () => {
    assert.equal(slugify('UPPER CASE'), 'upper-case');
  });

  it('연속 하이픈을 하나로 축약한다', () => {
    assert.equal(slugify('a---b'), 'a-b');
  });

  it('양끝 하이픈을 제거한다', () => {
    assert.equal(slugify('-hello-'), 'hello');
  });

  it('숫자를 보존한다', () => {
    assert.equal(slugify('Top 10 Songs'), 'top-10-songs');
  });

  it('이미 슬러그 형태인 입력은 그대로 유지한다 (멱등)', () => {
    assert.equal(slugify('already-a-slug'), 'already-a-slug');
  });
});

describe('slugify — 입력 검증', () => {
  it('문자열이 아닌 입력은 명시적 에러를 던진다', () => {
    // @ts-expect-error 런타임 방어 동작을 검증하기 위해 의도적으로 잘못된 타입 전달
    assert.throws(() => slugify(123), TypeError);
    // @ts-expect-error 런타임 방어 동작을 검증하기 위해 의도적으로 잘못된 타입 전달
    assert.throws(() => slugify(null), TypeError);
    // @ts-expect-error 런타임 방어 동작을 검증하기 위해 의도적으로 잘못된 타입 전달
    assert.throws(() => slugify(undefined), TypeError);
  });
});

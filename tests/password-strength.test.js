import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const START_MARKER = '// scorePassword:start';
const END_MARKER = '// scorePassword:end';

function loadScorePassword() {
  const htmlPath = path.join(__dirname, '..', 'password-strength.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);
  assert.notEqual(startIdx, -1, 'scorePassword:start 마커를 찾을 수 없음');
  assert.notEqual(endIdx, -1, 'scorePassword:end 마커를 찾을 수 없음');

  const source = html.slice(startIdx + START_MARKER.length, endIdx);
  const wrapped = source + '\nmodule.exports.scorePassword = scorePassword;';

  const context = vm.createContext({ module: { exports: {} } });
  const script = new vm.Script(wrapped);
  script.runInContext(context);

  return context.module.exports.scorePassword;
}

const scorePassword = loadScorePassword();

test('빈 문자열 → empty 상태, score 0, 모든 규칙 false', () => {
  const result = scorePassword('');
  assert.equal(result.score, 0);
  assert.equal(result.state, 'empty');
  assert.equal(result.rules.length, false);
  assert.equal(result.rules.lowercase, false);
  assert.equal(result.rules.uppercase, false);
  assert.equal(result.rules.number, false);
  assert.equal(result.rules.special, false);
});

test('약함 경계 — 규칙 2개(length+lowercase)만 충족 시 weak', () => {
  const result = scorePassword('abcdefgh');
  assert.equal(result.score, 2);
  assert.equal(result.state, 'weak');
  assert.equal(result.rules.length, true);
  assert.equal(result.rules.lowercase, true);
  assert.equal(result.rules.uppercase, false);
  assert.equal(result.rules.number, false);
  assert.equal(result.rules.special, false);
});

test('보통 경계 — 규칙 3개 충족 시 medium', () => {
  const result = scorePassword('Abcdefgh');
  assert.equal(result.score, 3);
  assert.equal(result.state, 'medium');
});

test('보통 경계 — 규칙 4개 충족 시 medium', () => {
  const result = scorePassword('Abcdefg1');
  assert.equal(result.score, 4);
  assert.equal(result.state, 'medium');
});

test('강함 — 규칙 5개 모두 충족 시 strong', () => {
  const result = scorePassword('Abcdefg1!');
  assert.equal(result.score, 5);
  assert.equal(result.state, 'strong');
  assert.equal(result.rules.length, true);
  assert.equal(result.rules.lowercase, true);
  assert.equal(result.rules.uppercase, true);
  assert.equal(result.rules.number, true);
  assert.equal(result.rules.special, true);
});

test('개별 규칙 판정 — 소문자만 없는 경우 rules.lowercase가 false', () => {
  const result = scorePassword('ABCDEFG1!');
  assert.equal(result.rules.lowercase, false);
  assert.equal(result.score, 4);
  assert.equal(result.state, 'medium');
});

test('개별 규칙 판정 — 특수문자만 없는 경우 rules.special이 false', () => {
  const result = scorePassword('Abcdefg1');
  assert.equal(result.rules.special, false);
});

test('특수문자 경계 — 문자 클래스 포함 문자(!)는 special true', () => {
  const result = scorePassword('Abcdefg1!');
  assert.equal(result.rules.special, true);
});

test('특수문자 경계 — 영숫자만 있으면 special false', () => {
  const result = scorePassword('Abcdefg12');
  assert.equal(result.rules.special, false);
});

test('경계값 실패 케이스 — 7자 길이 + 나머지 4규칙 충족 시 length만 미충족, medium 유지', () => {
  const result = scorePassword('Ab1!cde');
  assert.equal(result.rules.length, false);
  assert.equal(result.rules.lowercase, true);
  assert.equal(result.rules.uppercase, true);
  assert.equal(result.rules.number, true);
  assert.equal(result.rules.special, true);
  assert.equal(result.score, 4);
  assert.equal(result.state, 'medium');
});

test('공백만 입력 — length만 충족, special로 오판정하지 않고 weak', () => {
  const result = scorePassword('        ');
  assert.equal(result.rules.length, true);
  assert.equal(result.rules.lowercase, false);
  assert.equal(result.rules.uppercase, false);
  assert.equal(result.rules.number, false);
  assert.equal(result.rules.special, false);
  assert.equal(result.score, 1);
  assert.equal(result.state, 'weak');
});

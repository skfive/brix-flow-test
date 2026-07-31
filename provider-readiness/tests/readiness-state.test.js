// developer unit test — 순수 판정 함수 resolveReadiness (implementation-plan §1 규칙).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveReadiness, STATE_TEXT } from '../src/readiness-card.js';

test('loading: phase 미지정/loading → 확인 중 + 진행 표시', () => {
  for (const input of [undefined, {}, { phase: 'loading' }]) {
    const d = resolveReadiness(input);
    assert.equal(d.state, 'loading');
    assert.equal(d.statusText, '확인 중…');
    assert.equal(d.statusText, STATE_TEXT.loading);
    assert.equal(d.statusClass, null);
    assert.equal(d.showProgress, true);
    assert.equal(d.showRetry, false);
    assert.equal(d.showSettingsLink, false);
  }
});

test('error: 조회 실패 → 오류 텍스트 + 재시도 노출', () => {
  const d = resolveReadiness({ phase: 'error' });
  assert.equal(d.state, 'error');
  assert.equal(d.statusText, '상태를 불러오지 못했습니다');
  assert.equal(d.statusClass, null);
  assert.equal(d.showRetry, true);
  assert.equal(d.showSettingsLink, false);
  assert.equal(d.showProgress, false);
});

test('unset: Provider 미선택 → 설정되지 않음 + 설정 링크', () => {
  const d = resolveReadiness({ phase: 'loaded', providerSelected: false });
  assert.equal(d.state, 'unset');
  assert.equal(d.statusText, '설정되지 않음');
  assert.equal(d.statusClass, 'readiness-card__status--unset');
  assert.equal(d.showSettingsLink, true);
  assert.equal(d.showRetry, false);
});

test('ready: 선택 & 정책 허용 → 준비됨', () => {
  const d = resolveReadiness({ phase: 'loaded', providerSelected: true, policyAllowed: true });
  assert.equal(d.state, 'ready');
  assert.equal(d.statusText, '준비됨');
  assert.equal(d.statusClass, 'readiness-card__status--ready');
  assert.equal(d.showSettingsLink, false);
  assert.equal(d.showRetry, false);
});

test('blocked: 선택 & 정책 차단 → 차단됨 + 설정 링크', () => {
  const d = resolveReadiness({ phase: 'loaded', providerSelected: true, policyAllowed: false });
  assert.equal(d.state, 'blocked');
  assert.equal(d.statusText, '차단됨 — 설정 필요');
  assert.equal(d.statusClass, 'readiness-card__status--blocked');
  assert.equal(d.showSettingsLink, true);
  assert.equal(d.showRetry, false);
});

test('상태는 색상이 아니라 상태명 텍스트로 구분된다 (5개 상태 텍스트 고유)', () => {
  const texts = Object.values(STATE_TEXT);
  assert.equal(new Set(texts).size, texts.length);
});

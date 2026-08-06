// 팔레트 페이지 focused 단위 테스트 (BF-1821)
// 검증 범위: 4색 카드 렌더(순서·hex·이름·aria-label·swatch token), 복사 상태 전환(copied/error→idle),
// idle 복구 시 control 재활성화 + 상태 텍스트 복원. DOM/브라우저 의존 없이 순수 로직만 검증한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PALETTE_ITEMS,
  COPY_LABELS,
  copyAriaLabel,
  cardMarkup,
  paletteMarkup,
  viewForState,
  performCopy,
} from './palette.js';

test('PALETTE_ITEMS: 브랜드 4색이 계약 순서·값으로 고정', () => {
  assert.deepEqual(PALETTE_ITEMS, [
    { name: 'Primary', hex: '#2563EB', token: '--brand-primary' },
    { name: 'Secondary', hex: '#7C3AED', token: '--brand-secondary' },
    { name: 'Accent', hex: '#F59E0B', token: '--brand-accent' },
    { name: 'Neutral', hex: '#111827', token: '--brand-neutral' },
  ]);
});

test('copyAriaLabel: 색상 이름과 hex를 포함한 명시적 라벨', () => {
  assert.equal(copyAriaLabel(PALETTE_ITEMS[0]), 'Primary #2563EB 복사');
  assert.equal(copyAriaLabel(PALETTE_ITEMS[3]), 'Neutral #111827 복사');
});

test('cardMarkup: 계약 selector·token·텍스트·aria-label을 모두 포함', () => {
  const html = cardMarkup(PALETTE_ITEMS[0]);
  assert.match(html, /class="palette__card"/);
  assert.match(html, /tabindex="0"/); // 카드 키보드 포커스 가능
  assert.match(html, /class="palette__swatch"/);
  assert.match(html, /var\(--brand-primary\)/); // swatch 배경 = 대응 token
  assert.match(html, />Primary</); // 색상 이름 텍스트 노출
  assert.match(html, /class="palette__value">#2563EB</); // hex 대문자 표시
  assert.match(html, /class="palette__copy"/);
  assert.match(html, /aria-label="Primary #2563EB 복사"/);
  assert.match(html, /data-hex="#2563EB"/);
  assert.match(html, />복사</); // idle 초기 라벨
});

test('paletteMarkup: 4개 카드가 계약 순서대로 렌더', () => {
  const html = paletteMarkup();
  const cards = html.match(/class="palette__card"/g) ?? [];
  assert.equal(cards.length, 4);
  assert.ok(
    html.indexOf('#2563EB') <
      html.indexOf('#7C3AED') &&
      html.indexOf('#7C3AED') < html.indexOf('#F59E0B') &&
      html.indexOf('#F59E0B') < html.indexOf('#111827'),
    'Primary→Secondary→Accent→Neutral 순서',
  );
});

test('viewForState: idle은 control 재활성화 + 상태 텍스트 복원', () => {
  const idle = viewForState('idle');
  assert.equal(idle.buttonText, COPY_LABELS.idle);
  assert.equal(idle.disabled, false); // 재활성화
  assert.equal(idle.statusText, ''); // idle 복원

  const copied = viewForState('copied');
  assert.equal(copied.buttonText, COPY_LABELS.copied);
  assert.equal(copied.statusText, COPY_LABELS.copied);
  assert.equal(copied.disabled, true);

  const error = viewForState('error');
  assert.equal(error.buttonText, COPY_LABELS.error);
  assert.equal(error.statusText, COPY_LABELS.error);
  assert.equal(error.disabled, true);
});

test('performCopy 성공: clipboard 기록 후 copied→idle 전환', async () => {
  const written = [];
  const states = [];
  const clipboard = { writeText: async (v) => void written.push(v) };
  const outcome = await performCopy({
    hex: '#2563EB',
    clipboard,
    onState: (s) => states.push(s),
    schedule: (fn) => fn(), // 리셋 즉시 실행
  });
  assert.equal(outcome, 'copied');
  assert.deepEqual(written, ['#2563EB']);
  assert.deepEqual(states, ['copied', 'idle']);
});

test('performCopy 실패(clipboard 미지원): error→idle 복구', async () => {
  const states = [];
  const outcome = await performCopy({
    hex: '#7C3AED',
    clipboard: undefined,
    onState: (s) => states.push(s),
    schedule: (fn) => fn(),
  });
  assert.equal(outcome, 'error');
  assert.deepEqual(states, ['error', 'idle']);
});

test('performCopy 실패(writeText reject): error→idle 복구', async () => {
  const states = [];
  const clipboard = { writeText: async () => { throw new Error('denied'); } };
  const outcome = await performCopy({
    hex: '#F59E0B',
    clipboard,
    onState: (s) => states.push(s),
    schedule: (fn) => fn(),
  });
  assert.equal(outcome, 'error');
  assert.deepEqual(states, ['error', 'idle']);
});

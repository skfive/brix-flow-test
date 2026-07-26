// 리뷰 피드백 계보 canary 상태 카드 — 1차 구현 focused test
// 검증 프로토콜: 1차 구현은 카드 루트에 data-review-cycle="pending" marker 를 포함해야 하며
// 이 초기 상태를 focused test 로 검증한다. (browser/E2E 는 downstream tester 담당 — 여기선 정적 검증만)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = resolve(__dirname, '..', 'index.html');

async function readIndex() {
  return readFile(INDEX_PATH, 'utf8');
}

test('index.html 이 정상적으로 로드된다 (정적 의존성 확인)', async () => {
  const html = await readIndex();
  assert.ok(html.length > 0, 'index.html 이 비어 있으면 안 된다');
  assert.match(html, /<!DOCTYPE html>/i, 'HTML 문서 선언이 있어야 한다');
});

test('상태 카드 루트에 data-review-cycle="pending" marker 가 존재한다', async () => {
  const html = await readIndex();
  // 카드 루트 요소에 pending marker 가 포함돼야 한다
  assert.match(
    html,
    /data-review-cycle="pending"/,
    '카드 루트에 data-review-cycle="pending" marker 가 있어야 한다',
  );
});

test('카드 루트가 식별 가능한 region marker 를 가진다', async () => {
  const html = await readIndex();
  assert.match(
    html,
    /data-region="review-feedback-provenance"/,
    '카드 루트에 review-feedback-provenance region marker 가 있어야 한다',
  );
});

test('정적 canary 카드가 계보(provenance) 콘텐츠를 렌더한다', async () => {
  const html = await readIndex();
  assert.match(html, /provenance|계보/i, '카드에 계보 관련 콘텐츠가 있어야 한다');
});

test('외부 API·환경변수 의존 없이 정적 자산만 사용한다 (fetch/XMLHttpRequest 미사용)', async () => {
  const html = await readIndex();
  assert.doesNotMatch(html, /\bfetch\s*\(/, '1차 정적 구현은 런타임 fetch 를 사용하지 않아야 한다');
  assert.doesNotMatch(html, /XMLHttpRequest/, '1차 정적 구현은 XHR 을 사용하지 않아야 한다');
});

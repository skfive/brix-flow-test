// BF-1633 — status-card 확장 필드(uptimeSec/version) 소비 순수 함수 단위 테스트.
// planning-contract@v1 §5.5(uptime 포맷 순수 함수)·§5.6(필드 소비·구버전 legacy 호환)을
// node --test 로 검증한다. DOM/브라우저 없이 순수 함수만 대상으로 하며(브라우저/E2E 는
// downstream tester 소관), refresh.js 를 side-effect import 해 globalThis 로 노출된
// 순수 함수(formatUptime/deriveFieldDisplay)를 그대로 검증한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// refresh.js 는 vanilla-static classic <script> IIFE 라 ESM export 가 없다.
// import 시 side-effect 로 globalThis.StatusCardRefresh 에 순수 API 를 노출한다.
import '../src/refresh.js';

const { formatUptime, deriveFieldDisplay } = globalThis.StatusCardRefresh;

test('formatUptime — 경계값 0 은 "0초"', () => {
  assert.equal(formatUptime(0), '0초');
});

test('formatUptime — 초 단위만(값이 0인 상위 단위 생략)', () => {
  assert.equal(formatUptime(59), '59초');
});

test('formatUptime — 분/초, 상위 단위(시간/일)는 생략', () => {
  assert.equal(formatUptime(60), '1분 0초');
  assert.equal(formatUptime(137), '2분 17초');
});

test('formatUptime — 시간 단위가 생기면 하위 분/초는 0이어도 표기', () => {
  assert.equal(formatUptime(3600), '1시간 0분 0초');
  assert.equal(formatUptime(3720), '1시간 2분 0초');
});

test('formatUptime — 일 단위가 생기면 하위 시간/분/초는 0이어도 표기', () => {
  assert.equal(formatUptime(86400), '1일 0시간 0분 0초');
  assert.equal(formatUptime(90061), '1일 1시간 1분 1초');
});

test('formatUptime — 큰 값도 일/시간/분/초 로 결정적 환산', () => {
  assert.equal(formatUptime(100000), '1일 3시간 46분 40초');
});

test('formatUptime — 결정적(같은 입력 → 같은 출력)', () => {
  assert.equal(formatUptime(137), formatUptime(137));
  assert.equal(formatUptime(100000), formatUptime(100000));
});

test('formatUptime — 시계(Date) 에 접근하지 않는 순수 함수', () => {
  const OriginalDate = globalThis.Date;
  // 함수가 Date 를 읽으면 즉시 throw 하도록 대체한다. 순수하면 영향 없이 동작한다.
  globalThis.Date = function BrokenDate() {
    throw new Error('formatUptime must not access the clock');
  };
  globalThis.Date.now = () => {
    throw new Error('formatUptime must not access Date.now');
  };
  try {
    assert.equal(formatUptime(3720), '1시간 2분 0초');
  } finally {
    globalThis.Date = OriginalDate;
  }
});

test('formatUptime — 출력에 undefined/NaN 문자열을 노출하지 않는다', () => {
  for (const sec of [0, 59, 137, 3720, 86400, 100000]) {
    const out = formatUptime(sec);
    assert.ok(!out.includes('undefined'), `undefined 노출: ${out}`);
    assert.ok(!out.includes('NaN'), `NaN 노출: ${out}`);
  }
});

test('deriveFieldDisplay — 완전한 응답은 success(legacy=false)로 값 렌더', () => {
  const result = deriveFieldDisplay({ status: 'ok', uptimeSec: 3720, version: '1.4.0' });
  assert.deepEqual(result, {
    uptimeText: '1시간 2분 0초',
    versionText: '1.4.0',
    legacy: false,
  });
});

test('deriveFieldDisplay — uptimeSec=0 도 유효(legacy 아님)', () => {
  const result = deriveFieldDisplay({ status: 'ok', uptimeSec: 0, version: '2.0.0' });
  assert.equal(result.uptimeText, '0초');
  assert.equal(result.versionText, '2.0.0');
  assert.equal(result.legacy, false);
});

test('deriveFieldDisplay — version 누락 시 legacy + 대체 텍스트', () => {
  const result = deriveFieldDisplay({ status: 'ok', uptimeSec: 137 });
  assert.equal(result.uptimeText, '2분 17초');
  assert.equal(result.versionText, '버전 정보 없음');
  assert.equal(result.legacy, true);
});

test('deriveFieldDisplay — uptimeSec 누락 시 legacy + 대체 텍스트(status 만 표시)', () => {
  const result = deriveFieldDisplay({ status: 'ok', version: '1.4.0' });
  assert.equal(result.uptimeText, '가동 시간 정보 없음');
  assert.equal(result.versionText, '1.4.0');
  assert.equal(result.legacy, true);
});

test('deriveFieldDisplay — 구버전 응답(두 필드 모두 없음)도 깨지지 않고 legacy 대체 텍스트', () => {
  const result = deriveFieldDisplay({ status: 'ok' });
  assert.equal(result.uptimeText, '가동 시간 정보 없음');
  assert.equal(result.versionText, '버전 정보 없음');
  assert.equal(result.legacy, true);
});

test('deriveFieldDisplay — payload 부재(undefined/null)에서도 안전하게 legacy', () => {
  for (const payload of [undefined, null]) {
    const result = deriveFieldDisplay(payload);
    assert.equal(result.uptimeText, '가동 시간 정보 없음');
    assert.equal(result.versionText, '버전 정보 없음');
    assert.equal(result.legacy, true);
  }
});

test('deriveFieldDisplay — 계약 위반 입력(소수/음수/빈 문자열)은 legacy 로 방어', () => {
  const fractional = deriveFieldDisplay({ uptimeSec: 12.5, version: '1.0.0' });
  assert.equal(fractional.uptimeText, '가동 시간 정보 없음');
  assert.equal(fractional.legacy, true);

  const negative = deriveFieldDisplay({ uptimeSec: -1, version: '1.0.0' });
  assert.equal(negative.uptimeText, '가동 시간 정보 없음');
  assert.equal(negative.legacy, true);

  const emptyVersion = deriveFieldDisplay({ uptimeSec: 60, version: '' });
  assert.equal(emptyVersion.versionText, '버전 정보 없음');
  assert.equal(emptyVersion.legacy, true);
});

test('deriveFieldDisplay — 출력에 undefined/NaN 문자열을 노출하지 않는다', () => {
  const payloads = [
    { status: 'ok', uptimeSec: 3720, version: '1.4.0' },
    { status: 'ok' },
    undefined,
    { uptimeSec: NaN, version: '1.0.0' },
  ];
  for (const payload of payloads) {
    const { uptimeText, versionText } = deriveFieldDisplay(payload);
    for (const text of [uptimeText, versionText]) {
      assert.ok(!text.includes('undefined'), `undefined 노출: ${text}`);
      assert.ok(!text.includes('NaN'), `NaN 노출: ${text}`);
    }
  }
});

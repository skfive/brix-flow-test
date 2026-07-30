// 전달 상태 보드 v3 — tester 소유 회귀 가드 (node --test)
// 목적: dev 단위 테스트(delivery-board.test.js)가 커버하지 않는 각도에서
//   (1) frozen 정적 계약이 파일 간 실제로 일치하는지,
//   (2) 새로고침 "실패"·"취소" 조합 중 dev 스위트가 다루지 않은 상태/진행 복원·재활성화 경로가
//   미래 리팩터링으로 silent break 되지 않도록 잠근다.
// dev 가 이미 검증한 항목(기본 상태 전이 idle/loading/loaded/empty, 단일 error, 단일 cancel 시나리오,
// STATUS_LABELS 매핑, defaultFetchStatus 셰이프)은 재작성하지 않는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { STATES, STATE_LABELS, createController } from '../main.js';

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const MAIN = readFileSync(new URL('../main.js', import.meta.url), 'utf8');

// ---- 경량 fake DOM (dev 스위트와 동일한 최소 인터페이스 — main.js 가 요구하는 getElementById/createElement만) ----
class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.attributes = {};
    this.className = '';
    this.textContent = '';
    this.disabled = false;
    this._listeners = {};
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return name in this.attributes ? this.attributes[name] : null; }
  appendChild(node) { this.children.push(node); return node; }
  replaceChildren(...nodes) { this.children = nodes; }
  addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); }
}

function buildDom() {
  const byId = new Map();
  const mk = (tag, id) => { const el = new FakeElement(tag); el.id = id; byId.set(id, el); return el; };
  mk('main', 'delivery-board-root');
  mk('button', 'board-refresh');
  mk('p', 'board-status');
  mk('ul', 'board-role-list');
  mk('span', 'board-revision');
  return {
    getElementById: (id) => byId.get(id) || null,
    createElement: (tag) => new FakeElement(tag),
  };
}

// ================= 정적 계약: index.html ↔ main.js 파일 간 selector 일치 =================

test('정적 계약: main.js가 참조하는 getElementById id 집합이 index.html의 frozen id와 정확히 일치한다', () => {
  const referenced = new Set(
    [...MAIN.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]),
  );
  const frozenIds = ['delivery-board-root', 'board-refresh', 'board-status', 'board-role-list', 'board-revision'];
  assert.deepEqual([...referenced].sort(), [...frozenIds].sort());
  for (const id of frozenIds) {
    assert.ok(HTML.includes(`id="${id}"`), `index.html에 main.js가 참조하는 id="${id}"가 없음`);
  }
});

test('정적 계약: index.html/main.js는 module 내부 리소스만 상대경로로 참조한다 (파일 경계)', () => {
  assert.match(HTML, /<link rel="stylesheet" href="\.\/styles\.css"/);
  assert.match(HTML, /<script[^>]*src="\.\/main\.js"/);
  assert.ok(!/https?:\/\//.test(HTML), 'index.html에 외부(CDN 등) URL 참조가 없어야 한다');
});

test('정적 계약: STATE_LABELS 5개 상태 텍스트가 서로 달라 상태별로 구분 가능하다', () => {
  const labels = Object.values(STATE_LABELS);
  assert.equal(new Set(labels).size, labels.length, '상태 라벨 문자열이 중복되면 board-status 텍스트만으로 상태 구분 불가');
});

// ================= 회귀: 새로고침 "실패" — dev 스위트가 다루지 않은 "loaded 이후 실패" 경로 =================

test('회귀: loaded 스냅샷이 있는 상태에서 재새로고침이 실패하면 error로 전이하고 board-refresh가 재활성화된다', async () => {
  const doc = buildDom();
  let call = 0;
  const c = createController({
    document: doc,
    fetchStatus: () => {
      call += 1;
      return call === 1
        ? Promise.resolve({ revision: 'rev-ok', roles: [{ role: 'planner', status: 'verified' }] })
        : Promise.reject(new Error('second call fails'));
    },
  });
  await c.refresh();
  assert.equal(c.getState(), STATES.LOADED);

  await c.refresh(); // 두 번째 호출은 실패
  assert.equal(c.getState(), STATES.ERROR);
  assert.equal(doc.getElementById('board-status').textContent, STATE_LABELS.error);
  assert.equal(doc.getElementById('board-refresh').disabled, false);
  assert.equal(doc.getElementById('board-status').getAttribute('aria-busy'), 'false');
});

// ================= 회귀: "취소"가 아닌 "실패 상태에서의 취소" — dev 스위트가 다루지 않은 조합 =================

test('회귀: 성공 이력 없이 error 상태에서 cancel 호출 시 idle로 복원되고 board-refresh가 재활성화된다', async () => {
  const doc = buildDom();
  const c = createController({
    document: doc,
    fetchStatus: () => Promise.reject(new Error('always fails')),
  });
  await c.refresh();
  assert.equal(c.getState(), STATES.ERROR);

  c.cancel();
  assert.equal(c.getState(), STATES.IDLE);
  assert.equal(doc.getElementById('board-status').textContent, STATE_LABELS.idle);
  assert.equal(doc.getElementById('board-refresh').disabled, false);
  assert.equal(doc.getElementById('board-status').getAttribute('aria-busy'), 'false');
});

test('회귀: 연속 cancel 호출은 예외 없이 idempotent하며 board-refresh 재활성화 상태를 유지한다', async () => {
  const doc = buildDom();
  const c = createController({
    document: doc,
    fetchStatus: () => Promise.resolve({ revision: 'rev-stable', roles: [{ role: 'developer', status: 'pending' }] }),
  });
  await c.refresh();
  assert.equal(c.getState(), STATES.LOADED);

  assert.doesNotThrow(() => c.cancel());
  assert.equal(c.getState(), STATES.LOADED);
  assert.equal(doc.getElementById('board-revision').textContent, 'rev-stable');
  assert.equal(doc.getElementById('board-refresh').disabled, false);

  assert.doesNotThrow(() => c.cancel());
  assert.equal(c.getState(), STATES.LOADED);
  assert.equal(doc.getElementById('board-role-list').children.length, 1);
  assert.equal(doc.getElementById('board-refresh').disabled, false);
});

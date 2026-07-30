// 전달 상태 보드 v3 — developer 소유 단위 테스트 (vanilla ESM, node --test)
// 프로즌 UI 계약(ui-contract@v1)의 상태 전이·접근성·반응형·토큰을 검증한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  STATES,
  STATE_LABELS,
  STATUS_LABELS,
  statusLabel,
  createController,
  defaultFetchStatus,
} from '../main.js';

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const MAIN = readFileSync(new URL('../main.js', import.meta.url), 'utf8');

// ---- 경량 fake DOM (브라우저 없이 컨트롤러 로직 단위 검증) ----
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
  dispatch(type) { for (const fn of this._listeners[type] || []) fn({ type }); }
  click() { this.dispatch('click'); }
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
    _byId: byId,
  };
}

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

// ---- STEP-INIT: 초기 진입 idle + board-refresh 활성 ----
test('STEP-INIT: 초기 상태는 idle이고 board-refresh가 활성이다', () => {
  const doc = buildDom();
  const c = createController({ document: doc, fetchStatus: () => new Promise(() => {}) });
  assert.equal(c.getState(), STATES.IDLE);
  assert.equal(doc.getElementById('board-refresh').disabled, false);
  assert.equal(doc.getElementById('delivery-board-root').getAttribute('data-state'), 'idle');
  assert.equal(doc.getElementById('board-status').textContent, STATE_LABELS.idle);
});

// ---- STEP-LOADING: 실행 시 loading 전이 + 진행 표시 ----
test('STEP-LOADING: refresh 실행 시 loading으로 전이하고 진행 표시가 노출된다', () => {
  const doc = buildDom();
  const c = createController({ document: doc, fetchStatus: () => new Promise(() => {}) });
  c.refresh(); // 미해결 promise — loading에 머문다
  assert.equal(c.getState(), STATES.LOADING);
  assert.equal(doc.getElementById('delivery-board-root').getAttribute('data-state'), 'loading');
  assert.equal(doc.getElementById('board-refresh').disabled, true);
  assert.equal(doc.getElementById('board-status').getAttribute('aria-busy'), 'true');
});

// ---- STEP-LOADED: 비어있지 않은 목록 → loaded + 배지 렌더 ----
test('STEP-LOADED: 목록 수신 시 loaded로 전이하고 board-role-list에 배지가 렌더된다', async () => {
  const doc = buildDom();
  const c = createController({
    document: doc,
    fetchStatus: () => Promise.resolve({
      revision: 'rev-42',
      roles: [
        { role: 'planner', status: 'verified' },
        { role: 'developer', status: 'pending' },
        { role: 'tester', status: 'failed' },
      ],
    }),
  });
  await c.refresh();
  assert.equal(c.getState(), STATES.LOADED);
  assert.equal(doc.getElementById('board-revision').textContent, 'rev-42');
  const list = doc.getElementById('board-role-list');
  assert.equal(list.children.length, 3);
  const badges = list.children.map((li) => li.children.find((n) => n.className === 'delivery-board__badge'));
  assert.deepEqual(badges.map((b) => b.textContent), [STATUS_LABELS.verified, STATUS_LABELS.pending, STATUS_LABELS.failed]);
  assert.deepEqual(badges.map((b) => b.getAttribute('data-status')), ['verified', 'pending', 'failed']);
  // 색상 외 화면 텍스트 라벨 존재
  for (const b of badges) assert.ok(b.textContent.length > 0);
  assert.equal(doc.getElementById('board-refresh').disabled, false);
});

// ---- STEP-EMPTY: 빈 목록 → empty + 빈 상태 텍스트 ----
test('STEP-EMPTY: 빈 목록 수신 시 empty로 전이하고 빈 상태 텍스트가 노출된다', async () => {
  const doc = buildDom();
  const c = createController({
    document: doc,
    fetchStatus: () => Promise.resolve({ revision: 'rev-0', roles: [] }),
  });
  await c.refresh();
  assert.equal(c.getState(), STATES.EMPTY);
  assert.equal(doc.getElementById('board-role-list').children.length, 0);
  assert.equal(doc.getElementById('board-status').textContent, STATE_LABELS.empty);
  assert.equal(doc.getElementById('board-refresh').disabled, false);
});

// ---- STEP-ERROR: fetch 실패 → error + 상태명 텍스트/접근성 이름 ----
test('STEP-ERROR: fetch 실패 시 error로 전이하고 상태명이 텍스트로 노출되며 재시도 가능하다', async () => {
  const doc = buildDom();
  const c = createController({
    document: doc,
    fetchStatus: () => Promise.reject(new Error('network down')),
  });
  await c.refresh();
  assert.equal(c.getState(), STATES.ERROR);
  const status = doc.getElementById('board-status');
  assert.equal(status.textContent, STATE_LABELS.error);
  assert.ok(status.textContent.length > 0); // 상태명 = board-status 텍스트가 접근성 이름(role=status)
  assert.equal(doc.getElementById('board-refresh').disabled, false); // 재시도 가능
});

// ---- STEP-RETRY: error 이후 refresh 재실행 시 loaded로 재전이 ----
test('STEP-RETRY: error 상태에서 board-refresh 재실행 시 loading을 거쳐 loaded로 복구된다', async () => {
  const doc = buildDom();
  let call = 0;
  const c = createController({
    document: doc,
    fetchStatus: () => {
      call += 1;
      return call === 1
        ? Promise.reject(new Error('fail'))
        : Promise.resolve({ revision: 'rev-9', roles: [{ role: 'planner', status: 'verified' }] });
    },
  });
  await c.refresh();
  assert.equal(c.getState(), STATES.ERROR);
  // 버튼 click 핸들러 경유 재시도
  doc.getElementById('board-refresh').click();
  await Promise.resolve(); await Promise.resolve();
  assert.equal(c.getState(), STATES.LOADED);
  assert.equal(doc.getElementById('board-role-list').children.length, 1);
});

// ---- STEP-REENABLE(cancel): 취소 후 직전 loaded 복원 + 재활성화 ----
test('STEP-REENABLE: 새로고침 취소 시 직전 loaded 상태·진행표시를 복원하고 board-refresh를 재활성화한다', async () => {
  const doc = buildDom();
  const pending = deferred();
  let phase = 0;
  const c = createController({
    document: doc,
    fetchStatus: () => {
      phase += 1;
      return phase === 1
        ? Promise.resolve({ revision: 'rev-loaded', roles: [{ role: 'planner', status: 'verified' }] })
        : pending.promise; // 2번째 요청은 매달림 → 취소 대상
    },
  });
  await c.refresh(); // loaded 확보
  assert.equal(c.getState(), STATES.LOADED);

  c.refresh(); // loading (미해결)
  assert.equal(c.getState(), STATES.LOADING);
  assert.equal(doc.getElementById('board-refresh').disabled, true);

  c.cancel(); // 취소 → 직전 loaded 복원
  assert.equal(c.getState(), STATES.LOADED);
  assert.equal(doc.getElementById('board-revision').textContent, 'rev-loaded');
  assert.equal(doc.getElementById('board-role-list').children.length, 1);
  assert.equal(doc.getElementById('board-refresh').disabled, false);
  assert.equal(doc.getElementById('board-status').getAttribute('aria-busy'), 'false');

  // stale 응답이 뒤늦게 와도 상태를 덮어쓰지 않는다
  pending.resolve({ revision: 'STALE', roles: [] });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(c.getState(), STATES.LOADED);
  assert.equal(doc.getElementById('board-revision').textContent, 'rev-loaded');
});

// ---- STEP-REENABLE(초기 취소): loaded 이력 없으면 idle로 복귀 ----
test('STEP-REENABLE: loaded 이력 없이 취소하면 idle로 복귀하고 재활성화된다', () => {
  const doc = buildDom();
  const c = createController({ document: doc, fetchStatus: () => new Promise(() => {}) });
  c.refresh();
  assert.equal(c.getState(), STATES.LOADING);
  c.cancel();
  assert.equal(c.getState(), STATES.IDLE);
  assert.equal(doc.getElementById('board-refresh').disabled, false);
});

// ---- 순수 라벨 매핑 ----
test('STATUS_LABELS/statusLabel: 상태값은 화면 텍스트 라벨을 가진다', () => {
  assert.equal(statusLabel('verified'), STATUS_LABELS.verified);
  assert.equal(statusLabel('pending'), STATUS_LABELS.pending);
  assert.equal(statusLabel('failed'), STATUS_LABELS.failed);
  for (const label of Object.values(STATUS_LABELS)) assert.ok(label.trim().length > 0);
  for (const label of Object.values(STATE_LABELS)) assert.ok(label.trim().length > 0);
});

// ---- defaultFetchStatus: 브라우저 기본 데이터 소스 ----
test('defaultFetchStatus: revision과 roles를 담은 데이터를 반환한다', async () => {
  const data = await defaultFetchStatus();
  assert.ok(typeof data.revision === 'string' && data.revision.length > 0);
  assert.ok(Array.isArray(data.roles) && data.roles.length > 0);
  for (const r of data.roles) assert.ok(r.role && r.status);
});

// ================= 정적 계약 검증 (frozen selectors / a11y / tokens / responsive) =================

test('index.html: frozen DOM ID를 재정의 없이 노출한다', () => {
  for (const id of ['delivery-board-root', 'board-refresh', 'board-status', 'board-role-list', 'board-revision']) {
    assert.ok(HTML.includes(`id="${id}"`), `누락된 frozen id: ${id}`);
  }
});

test('index.html: frozen CSS class를 사용한다', () => {
  for (const cls of ['delivery-board', 'delivery-board__status', 'delivery-board__refresh']) {
    assert.ok(HTML.includes(cls), `누락된 frozen class: ${cls}`);
  }
});

test('index.html: 접근성 계약(aria-label, role=status, aria-live=polite)을 만족한다', () => {
  assert.match(HTML, /aria-label="전달 상태 새로고침"/);
  assert.match(HTML, /id="board-status"[^>]*role="status"/s);
  assert.match(HTML, /id="board-status"[^>]*aria-live="polite"/s);
  // board-refresh는 native 활성화(Enter/Space) 가능한 button 요소
  assert.match(HTML, /<button[^>]*id="board-refresh"/s);
  assert.match(HTML, /<html[^>]*lang="ko"/);
});

test('styles.css: frozen design token을 정확한 값으로 정의한다', () => {
  assert.match(CSS, /--color-status-verified:\s*#16a34a/);
  assert.match(CSS, /--color-status-pending:\s*#f59e0b/);
  assert.match(CSS, /--color-status-failed:\s*#dc2626/);
  assert.match(CSS, /--space-board-gap:\s*16px/);
  assert.match(CSS, /--font-board-label:\s*14px/);
});

test('styles.css: frozen class와 badge 상태 색상을 토큰으로 연결한다', () => {
  assert.match(CSS, /\.delivery-board__badge\[data-status="verified"\][^}]*var\(--color-status-verified\)/s);
  assert.match(CSS, /\.delivery-board__badge\[data-status="pending"\][^}]*var\(--color-status-pending\)/s);
  assert.match(CSS, /\.delivery-board__badge\[data-status="failed"\][^}]*var\(--color-status-failed\)/s);
});

test('styles.css: 반응형 breakpoint(320px 스택 / 768px 다열 grid)를 정의한다', () => {
  assert.match(CSS, /@media\s*\(min-width:\s*320px\)/);
  assert.match(CSS, /@media\s*\(min-width:\s*768px\)/);
  assert.match(CSS, /@media\s*\(min-width:\s*768px\)[\s\S]*grid-template-columns/);
});

test('main.js: 브라우저에서 직접 실행 가능한 vanilla JS이며 TS/JSX 문법이 없다', () => {
  assert.ok(!/:\s*(string|number|boolean)\b/.test(MAIN), 'TS 타입 주석이 없어야 한다');
  assert.ok(!MAIN.includes('interface '), 'TS interface가 없어야 한다');
  assert.match(MAIN, /export function createController/);
});

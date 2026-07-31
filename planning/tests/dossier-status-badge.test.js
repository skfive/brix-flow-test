// BF-1345 · Dossier 근거 상태 배지 회귀 가드
// 대상: planning/src/dossier-status-badge.js (BF-1342), planning/index.html
// 목적: 상태별(sufficient/insufficient/empty/error) 렌더와 빈 상태 숨김·실패 복원이
//       향후 silent break 되지 않도록 고정한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  STATUS,
  applyStatus,
  createDossierStatusBadge,
} from '../src/dossier-status-badge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLANNING_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 테스트용 stub DOM — 모듈이 표준 DOM 속성/메서드만 쓰므로 stub 으로도 검증 가능.
// ---------------------------------------------------------------------------
function makeStubEl() {
  const attrs = {};
  return {
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
    setAttribute(k, v) {
      attrs[k] = String(v);
    },
    removeAttribute(k) {
      delete attrs[k];
    },
    getAttribute(k) {
      return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null;
    },
  };
}

function makeStubRefs() {
  return {
    container: makeStubEl(),
    label: { textContent: '' },
    detailLink: makeStubEl(),
  };
}

function makeStubDocument() {
  const container = makeStubEl();
  const label = { textContent: '' };
  const detailLink = makeStubEl();
  const byId = {
    'dossier-status-badge': container,
    'dossier-status-label': label,
    'dossier-status-detail-link': detailLink,
  };
  return {
    doc: { getElementById: (id) => byId[id] ?? null },
    container,
    label,
    detailLink,
  };
}

// ---------------------------------------------------------------------------
// AC1 — 상태별 렌더 (색상 무관 텍스트 + aria-label + 상세 링크)
// ---------------------------------------------------------------------------

test('BF-1345 sufficient — 텍스트/aria-label 렌더 + 상세 링크 비활성', () => {
  const refs = makeStubRefs();
  applyStatus(refs, STATUS.SUFFICIENT);
  assert.equal(refs.container.hidden, false);
  assert.equal(refs.container.getAttribute('data-state'), 'sufficient');
  assert.equal(refs.container.getAttribute('aria-label'), '근거 충족');
  assert.equal(refs.label.textContent, '근거 충족');
  assert.equal(refs.detailLink.hidden, true);
  assert.equal(refs.detailLink.getAttribute('aria-disabled'), 'true');
});

test('BF-1345 insufficient — 텍스트/aria-label 렌더 + 상세 링크 활성화', () => {
  const refs = makeStubRefs();
  applyStatus(refs, STATUS.INSUFFICIENT, { detailHref: '#planning-dossier' });
  assert.equal(refs.container.hidden, false);
  assert.equal(refs.container.getAttribute('data-state'), 'insufficient');
  assert.equal(refs.container.getAttribute('aria-label'), '근거 부족');
  assert.equal(refs.label.textContent, '근거 부족');
  assert.equal(refs.detailLink.hidden, false);
  assert.equal(refs.detailLink.getAttribute('tabindex'), '0');
  assert.equal(refs.detailLink.getAttribute('aria-disabled'), null);
  assert.equal(refs.detailLink.getAttribute('href'), '#planning-dossier');
});

test('BF-1345 empty — 배지 숨김 + 기존 빈 상태 유지 (회귀 가드)', () => {
  const refs = makeStubRefs();
  applyStatus(refs, STATUS.EMPTY);
  assert.equal(refs.container.hidden, true);
  assert.equal(refs.container.getAttribute('aria-label'), null);
  assert.equal(refs.label.textContent, '');
  assert.equal(refs.detailLink.hidden, true);
});

test('BF-1345 error — 중립 렌더 + 상세 링크 비활성', () => {
  const refs = makeStubRefs();
  applyStatus(refs, STATUS.ERROR);
  assert.equal(refs.container.hidden, false);
  assert.equal(refs.container.getAttribute('data-state'), 'error');
  assert.equal(refs.container.getAttribute('aria-label'), '상태를 불러오지 못했습니다');
  assert.equal(refs.detailLink.hidden, true);
});

// ---------------------------------------------------------------------------
// AC2 — 실패 복원 회귀: error 이후 refresh() 로 초기값 재진입 + 상세 링크 재활성
// ---------------------------------------------------------------------------

test('BF-1345 실패 복원 — error 이후 refresh() 로 상태·링크가 정상 복원된다', async () => {
  const { doc, container, detailLink } = makeStubDocument();
  let mode = 'error';
  const badge = createDossierStatusBadge({
    document: doc,
    loadStatus: () => {
      if (mode === 'error') throw new Error('boom');
      return { evidenceSufficient: false };
    },
    detailHref: '#planning-dossier',
  });
  assert.ok(badge, 'root 노드가 있으면 컨트롤러가 생성된다');

  const errorStatus = await badge.refresh();
  assert.equal(errorStatus, STATUS.ERROR);
  assert.equal(container.getAttribute('data-state'), 'error');
  assert.equal(detailLink.hidden, true);

  mode = 'insufficient';
  const restoredStatus = await badge.refresh();
  assert.equal(restoredStatus, STATUS.INSUFFICIENT);
  assert.equal(container.getAttribute('data-state'), 'insufficient');
  assert.equal(container.getAttribute('aria-label'), '근거 부족');
  assert.equal(detailLink.hidden, false, '재조회 성공 시 상세 링크가 재활성된다');
  assert.equal(detailLink.getAttribute('tabindex'), '0');
});

test('BF-1345 rollback-safe — #dossier-status-badge 노드 제거 시 컨트롤러가 null 을 반환한다', () => {
  const badge = createDossierStatusBadge({ document: { getElementById: () => null } });
  assert.equal(badge, null);
});

// ---------------------------------------------------------------------------
// 정적 가드 — frozen selector·CSS 토큰이 index.html 에서 silent break 되지 않았는지 고정
// ---------------------------------------------------------------------------

test('BF-1345 정적 가드 — index.html 에 frozen selector·CSS 토큰이 존재한다', () => {
  const html = fs.readFileSync(path.join(PLANNING_ROOT, 'index.html'), 'utf-8');
  assert.ok(html.includes('id="dossier-status-badge"'), 'DOM ID: dossier-status-badge');
  assert.ok(html.includes('id="dossier-status-label"'), 'DOM ID: dossier-status-label');
  assert.ok(html.includes('id="dossier-status-detail-link"'), 'DOM ID: dossier-status-detail-link');
  assert.ok(html.includes('dossier-status__badge'), 'CSS class: dossier-status__badge');
  assert.ok(html.includes('dossier-status__label'), 'CSS class: dossier-status__label');
  assert.ok(html.includes('dossier-status__detail'), 'CSS class: dossier-status__detail');
  assert.ok(html.includes('--color-evidence-sufficient'), 'token: --color-evidence-sufficient');
  assert.ok(html.includes('--color-evidence-insufficient'), 'token: --color-evidence-insufficient');
  assert.ok(html.includes('--space-badge-gap'), 'token: --space-badge-gap');
});

// ---------------------------------------------------------------------------
// e2e-runner — 실 브라우저 상태 전이 (sufficient → insufficient → error → 복원 → empty)
// ---------------------------------------------------------------------------

const STATIC_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function startStaticServer(serveRoot) {
  const root = path.resolve(serveRoot);
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const resolved = path.resolve(root, `.${urlPath}`);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const target = urlPath.endsWith('/') ? path.join(resolved, 'index.html') : resolved;
    fs.readFile(target, (err, buf) => {
      if (err) {
        res.writeHead(404).end('not found');
        return;
      }
      const contentType = STATIC_MIME_TYPES[path.extname(target)] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

test('BF-1345 e2e — 근거 상태 배지 상태 전이·복원 실 브라우저 렌더', async (t) => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }
  try {
    const probe = await fetch('http://e2e-runner:3030/health', {
      signal: AbortSignal.timeout(2000),
    });
    if (!probe.ok) {
      t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
      return;
    }
  } catch (err) {
    t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
    return;
  }

  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

  const { server, port } = await startStaticServer(PLANNING_ROOT);
  t.after(() => server.close());

  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const scriptText = `
    const result = await page.evaluate(async () => {
      const mod = await import('./src/dossier-status-badge.js');
      let mode = 'sufficient';
      const loadStatus = () => {
        if (mode === 'error') throw new Error('boom');
        if (mode === 'sufficient') return { evidenceSufficient: true };
        if (mode === 'insufficient') return { evidenceSufficient: false };
        return null;
      };
      const badge = mod.createDossierStatusBadge({ loadStatus, detailHref: '#planning-dossier' });
      if (!badge) return { ok: false, reason: 'badge-null' };
      const snap = () => {
        const el = document.getElementById('dossier-status-badge');
        const label = document.getElementById('dossier-status-label');
        const link = document.getElementById('dossier-status-detail-link');
        return {
          hidden: el.hidden,
          state: el.getAttribute('data-state'),
          ariaLabel: el.getAttribute('aria-label'),
          labelText: label.textContent,
          linkHidden: link.hidden,
          linkTabindex: link.getAttribute('tabindex'),
        };
      };
      const snaps = {};
      await badge.refresh();
      snaps.sufficient = snap();
      mode = 'insufficient';
      await badge.refresh();
      snaps.insufficient = snap();
      mode = 'error';
      await badge.refresh();
      snaps.error = snap();
      mode = 'insufficient';
      await badge.refresh();
      snaps.restored = snap();
      mode = 'empty';
      await badge.refresh();
      snaps.empty = snap();
      return { ok: true, snaps };
    });
    if (!result.ok) throw new Error('badge init failed: ' + result.reason);
    const s = result.snaps;
    const checks = [
      ['sufficient.hidden', s.sufficient.hidden === false],
      ['sufficient.state', s.sufficient.state === 'sufficient'],
      ['sufficient.ariaLabel', s.sufficient.ariaLabel === '근거 충족'],
      ['insufficient.linkHidden', s.insufficient.linkHidden === false],
      ['insufficient.linkTabindex', s.insufficient.linkTabindex === '0'],
      ['error.state', s.error.state === 'error'],
      ['error.ariaLabel', s.error.ariaLabel === '상태를 불러오지 못했습니다'],
      ['error.linkHidden', s.error.linkHidden === true],
      ['restored.state', s.restored.state === 'insufficient'],
      ['restored.linkHidden', s.restored.linkHidden === false],
      ['empty.hidden', s.empty.hidden === true],
      ['empty.ariaLabel', s.empty.ariaLabel === null],
    ];
    const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
    if (failed.length) throw new Error('assertions failed: ' + failed.join(', '));
  `;

  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({
      url,
      label: '근거 상태 배지 — 상태 전이(sufficient→insufficient→error→복원→empty)',
      scriptText,
      timeoutMs: 30000,
    }),
  });
  const body = await res.json();
  assert.equal(body.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
  assert.equal(body.passed, true, `e2e 시나리오 실패: ${body.stdout ?? ''}`);
});

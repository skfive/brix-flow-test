// 납품 추적 상태 보드 focused 단위 테스트 (BF-1242).
// 권위 검증 명령: node --test demo/delivery-trace-canary/tests/*.test.js
// board.ts / fixtures.ts 의 순수 로직·렌더 문자열을 DOM 없이 검증한다.
// (브라우저/E2E 는 downstream tester(BF-1245) 책임 — 여기서는 실행하지 않음)

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  initialState,
  applyFilter,
  openDetail,
  closeDetail,
  resetView,
  toReady,
  toError,
  toLoading,
  findCell,
  computeMissingEvidence,
  isCellFocused,
  renderBoard,
  escapeHtml,
} from '../../../apps/backend/src/demo/delivery-trace-canary/board.ts';
import {
  readyTrace,
  missingEvidenceTrace,
  stateFixtures,
  createDeterministicLoader,
} from '../../../apps/backend/src/demo/delivery-trace-canary/fixtures.ts';

// ── T-1: ready 상태 — 5단계 연결·완료 상태가 한국어/영문 용어로 렌더 ──
test('T-1 ready: 5단계 연결과 단계별 상태를 한국어/영문 용어로 렌더', () => {
  const html = renderBoard(stateFixtures.ready);
  assert.match(html, /id="delivery-trace-board"/);
  for (const [ko, en] of [
    ['요구사항', 'Requirement'],
    ['설계', 'Design'],
    ['구현', 'Implementation'],
    ['검토', 'Review'],
    ['테스트', 'Test'],
  ]) {
    assert.ok(html.includes(ko), `한국어 용어 ${ko} 누락`);
    assert.ok(html.includes(en), `영문 용어 ${en} 누락`);
  }
  // 색상 외 화면 텍스트로 상태 노출
  assert.ok(html.includes('완료 (Complete)'));
  assert.ok(html.includes('진행 중 (Pending)'));
  // ready 는 진행 표시 복원 + 필터 control 활성(select 에 disabled 없음)
  assert.match(html, /data-phase="ready"/);
  assert.ok(!/id="trace-stage-filter"[^>]*disabled/.test(html));
});

// ── T-2: filtered 상태 — 선택 필터 단계만 강조, 나머지 흐림 ──
test('T-2 filtered: 필터 단계만 강조되고 나머지는 흐리게 표시', () => {
  const html = renderBoard(stateFixtures.filtered); // filter=complete
  assert.ok(html.includes('trace-board__stage--focus'));
  assert.ok(html.includes('trace-board__stage--dim'));
  // complete 셀은 focus, pending 셀은 dim 이어야 함
  const complete = readyTrace.rows[0].stages[0]; // requirement complete
  const pending = readyTrace.rows[1].stages[3]; // review pending
  assert.equal(isCellFocused(complete, 'complete'), true);
  assert.equal(isCellFocused(pending, 'complete'), false);
  // all 필터면 전부 강조
  assert.equal(isCellFocused(pending, 'all'), true);
});

// ── T-3: missing-evidence 상태 — 경고 텍스트·보완 대상 목록 ──
test('T-3 missing-evidence: 경고 텍스트와 보완 대상 목록 노출', () => {
  const html = renderBoard(stateFixtures['missing-evidence']);
  assert.ok(html.includes('누락된 evidence — 보완 대상'));
  assert.match(html, /id="trace-evidence-warning"[^>]*aria-live="polite"/);
  const missing = computeMissingEvidence(missingEvidenceTrace);
  assert.ok(missing.length >= 1);
  // 보완 대상 목록에 누락 단계 한국어명이 명시됨
  for (const item of missing) {
    assert.ok(html.includes(item.stageLabelKo), `보완 대상 ${item.stageLabelKo} 누락`);
  }
  // ready 데이터(누락 없음)면 경고 hidden
  const readyHtml = renderBoard(stateFixtures.ready);
  assert.match(readyHtml, /id="trace-evidence-warning"[^>]*hidden/);
});

// ── T-4: detail-open 상태 — 상세 패널 evidence 텍스트 ──
test('T-4 detail-open: 상세 패널에 선택 단계 evidence 상세 텍스트 표시', () => {
  const html = renderBoard(stateFixtures['detail-open']); // REQ-1:design 선택
  assert.match(html, /id="trace-detail-panel"[^>]*role="region"/);
  assert.match(html, /data-open="true"/);
  const cell = findCell(readyTrace, 'REQ-1:design');
  assert.ok(cell);
  assert.ok(html.includes(escapeHtml(cell.evidence)));
  // 상세 패널은 포커스 가능(tabindex=-1)·aria-label 보유
  assert.match(html, /id="trace-detail-panel"[^>]*tabindex="-1"/);
  assert.match(html, /id="trace-detail-panel"[^>]*aria-label="[^"]+"/);
});

// ── T-5: loading / error 상태 텍스트 ──
test('T-5 loading/error: 각 안내·오류 텍스트 표시', () => {
  const loading = renderBoard(stateFixtures.loading);
  assert.ok(loading.includes('추적 데이터를 불러오는 중'));
  assert.match(loading, /data-phase="loading"/);
  // 로딩 중에는 필터 control 비활성
  assert.match(loading, /id="trace-stage-filter"[^>]*disabled/);

  const error = renderBoard(stateFixtures.error);
  assert.ok(error.includes('추적 데이터를 표시할 수 없습니다'));
  assert.ok(error.includes('다시 시도'));
  assert.match(error, /id="trace-stage-filter"[^>]*disabled/);
});

// ── T-6: 접근성 — 필터 aria-label, 상세 role/tabindex, 경고 aria-live ──
test('T-6 접근성: aria-label / role / aria-live 존재', () => {
  const html = renderBoard(stateFixtures['missing-evidence']);
  assert.match(html, /id="trace-stage-filter"[^>]*aria-label="단계 상태 필터"/);
  assert.match(html, /id="trace-detail-panel"[^>]*role="region"/);
  assert.match(html, /id="trace-evidence-warning"[^>]*aria-live="polite"/);
  // 단계 버튼은 색상 외 접근성 이름(상태명)을 aria-label 로 노출
  assert.match(html, /aria-label="[^"]*누락 \(Missing\)"/);
});

// ── T-8: 초기화 후조건 — 취소·실패·리셋 후 초기값 복귀 + control 재활성화 ──
test('T-8 후조건: 필터 초기화·상세 취소·실패 후 ready 복원과 control 재활성화', () => {
  // 상세 취소 → 선택 해제
  const opened = openDetail(stateFixtures.ready, 'REQ-1:design');
  assert.equal(opened.selectedCellId, 'REQ-1:design');
  const closed = closeDetail(opened);
  assert.equal(closed.selectedCellId, null);

  // 필터 초기화(resetView) → filter all · 선택 해제 (데이터 유지)
  const filtered = applyFilter(opened, 'missing');
  const reset = resetView(filtered);
  assert.equal(reset.filter, 'all');
  assert.equal(reset.selectedCellId, null);
  assert.equal(reset.data, stateFixtures.ready.data);

  // 데이터 실패 → error, 이후 ready 로 복원되면 control 재활성화(disabled 없음)
  const errored = toError(initialState(), '추적 데이터를 표시할 수 없습니다');
  assert.equal(errored.phase, 'error');
  const restored = toReady(errored, readyTrace);
  assert.equal(restored.phase, 'ready');
  assert.equal(restored.filter, 'all');
  assert.equal(restored.selectedCellId, null);
  assert.ok(!/id="trace-stage-filter"[^>]*disabled/.test(renderBoard(restored)));
});

// ── immutability: 순수 전이는 원본을 변경하지 않음 ──
test('상태 전이는 immutable(원본 미변경)', () => {
  const base = initialState();
  const next = applyFilter(base, 'complete');
  assert.equal(base.filter, 'all');
  assert.equal(next.filter, 'complete');
  assert.notEqual(base, next);
  const loaded = toLoading(base);
  assert.equal(loaded.phase, 'loading');
});

// ── fixture 결정론: 동일 loader 는 동일 결과 ──
test('결정론적 fixture: ready 완결 / missing 누락 포함', async () => {
  const readyLoader = createDeterministicLoader('ready');
  const a = await readyLoader();
  const b = await readyLoader();
  assert.deepEqual(a, b);
  // ready fixture 는 누락 없음
  assert.equal(computeMissingEvidence(readyTrace).length, 0);
  // missing fixture 는 최소 1개 누락
  assert.ok(computeMissingEvidence(missingEvidenceTrace).length >= 1);
  // error loader 는 계약 오류 메시지로 reject
  await assert.rejects(createDeterministicLoader('error')(), /추적 데이터를 표시할 수 없습니다/);
});

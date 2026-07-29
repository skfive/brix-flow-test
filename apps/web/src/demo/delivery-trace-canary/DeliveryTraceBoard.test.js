// focused 단위 테스트 (BF-1235) — DeliveryTraceBoard 순수 로직 + fixture 계약
// node --test apps/web/src/demo/delivery-trace-canary/DeliveryTraceBoard.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  renderBoard,
  resolveState,
  collectMissingStages,
  bannerText,
  effectiveStatus,
  isCellVisible,
  cellId,
  findCell,
  STAGE_LABEL,
  STATUS_TEXT,
  STATUS_ARIA,
  STATE_TEXT,
} from './DeliveryTraceBoard.js';
import { defaultFixture, emptyFixture, completeFixture, TRACE_STAGES } from './fixtures.js';

test('fixture 는 결정론적: 각 행 stages 는 길이 5, 고정 순서(§5)', () => {
  for (const row of defaultFixture.rows) {
    assert.equal(row.stages.length, 5);
    assert.deepEqual(
      row.stages.map((c) => c.stage),
      TRACE_STAGES,
    );
  }
});

test('AC6 결정론: 동일 fixture 를 두 번 렌더하면 동일 결과', () => {
  assert.equal(renderBoard(defaultFixture), renderBoard(defaultFixture));
});

test('effectiveStatus: evidenceHref===null 은 missing 으로 취급(EC6)', () => {
  assert.equal(effectiveStatus({ status: 'pending', evidenceHref: null }), 'missing');
  assert.equal(effectiveStatus({ status: 'complete', evidenceHref: '#x' }), 'complete');
  assert.equal(effectiveStatus({ status: 'pending', evidenceHref: '#x' }), 'pending');
});

test('collectMissingStages: 누락 단계명을 TRACE_STAGES 고정 순서로 반환', () => {
  const missing = collectMissingStages(defaultFixture);
  // 기본 fixture 누락: R3.test, R4.review, R4.test → [review, test]
  assert.deepEqual(missing, ['review', 'test']);
});

test('AC2 경고 배너 텍스트: 누락 단계명을 한국어로 나열(§7)', () => {
  assert.equal(bannerText(['review', 'test']), '누락 evidence: 검토, 테스트');
});

test('resolveState: 상태 모델(§4) 우선순위', () => {
  assert.equal(resolveState(emptyFixture, null), 'empty');
  assert.equal(resolveState(completeFixture, null), 'ready');
  assert.equal(resolveState(defaultFixture, null), 'evidence-missing');
  assert.equal(resolveState(defaultFixture, 'R1:requirement'), 'stage-selected');
});

test('AC1 렌더: 동결 domId·상태 텍스트·단계명 노출', () => {
  const html = renderBoard(defaultFixture);
  assert.match(html, /id="delivery-trace-board"/);
  assert.match(html, /id="trace-stage-filter"/);
  assert.match(html, /id="trace-detail-panel"/);
  for (const stage of TRACE_STAGES) {
    assert.ok(html.includes(STAGE_LABEL[stage]), `단계명 ${STAGE_LABEL[stage]} 노출`);
  }
  // 상태 텍스트가 색상 외 화면 텍스트로 노출(AC4)
  assert.ok(html.includes(STATUS_TEXT.complete));
  assert.ok(html.includes(STATUS_TEXT.pending));
  assert.ok(html.includes(STATUS_TEXT.missing));
});

test('AC2 렌더: 누락 존재 시 evidence-warning-banner(role=alert, aria-label) 노출', () => {
  const html = renderBoard(defaultFixture);
  assert.match(html, /id="evidence-warning-banner"[^>]*role="alert"/);
  assert.match(html, /aria-label="누락 evidence 경고"/);
  assert.ok(html.includes('누락 evidence: 검토, 테스트'));
});

test('EC2 전 단계 evidence 존재 시 경고 배너 미렌더 + state=ready', () => {
  const html = renderBoard(completeFixture);
  assert.ok(!html.includes('id="evidence-warning-banner"'));
  assert.match(html, /data-state="ready"/);
});

test('AC3 단계 선택: aria-current=step 부여 + 상세 패널 노출', () => {
  const selectedId = cellId('R1', 'design');
  const html = renderBoard(defaultFixture, { selectedId });
  assert.match(html, /data-cell-id="R1:design"[^>]*aria-current="step"/);
  assert.match(html, /data-state="stage-selected"/);
  assert.ok(html.includes('R1 · 설계'));
  // 상세 패널 닫기 control 존재(초기화 경로)
  assert.match(html, /id="trace-detail-close"/);
});

test('AC3 선택 시 주 실행 control(trace-stage-filter) 비활성화', () => {
  const html = renderBoard(defaultFixture, { selectedId: cellId('R1', 'design') });
  assert.match(html, /id="trace-stage-filter"[^>]*disabled/);
});

test('AC(초기화 후조건): 선택 해제 시 필터 재활성화 + ready/evidence-missing 복원', () => {
  const html = renderBoard(defaultFixture, { selectedId: null });
  assert.ok(!/id="trace-stage-filter"[^>]*disabled/.test(html), '필터가 재활성화됨');
});

test('AC4 접근성: 상태 카드 aria-label 에 한국어(영문) 상태명 병기', () => {
  const html = renderBoard(defaultFixture);
  assert.ok(html.includes(`aria-label="요구사항 ${STATUS_ARIA.complete}"`));
});

test('AC7 빈 상태: state=empty 안내 + 필터/패널 초기값 유지', () => {
  const html = renderBoard(emptyFixture);
  assert.match(html, /data-state="empty"/);
  assert.ok(html.includes(STATE_TEXT.empty));
  assert.match(html, /id="trace-stage-filter"/);
  assert.ok(!/id="trace-stage-filter"[^>]*disabled/.test(html), '빈 상태에서 필터 조작 가능');
  assert.match(html, /id="trace-detail-panel"/);
});

test('R4 필터: missing 필터 시 missing 셀만 표시', () => {
  const html = renderBoard(defaultFixture, { filter: 'missing' });
  // R4.review(missing) 표시, R4.implementation(pending) 미표시
  assert.match(html, /data-cell-id="R4:review"/);
  assert.ok(!html.includes('data-cell-id="R4:implementation"'));
});

test('isCellVisible: 필터 규칙', () => {
  const complete = { status: 'complete', evidenceHref: '#x' };
  assert.equal(isCellVisible(complete, 'all'), true);
  assert.equal(isCellVisible(complete, 'complete'), true);
  assert.equal(isCellVisible(complete, 'missing'), false);
});

test('findCell: selectedId 로 셀·행 조회', () => {
  const found = findCell(defaultFixture, cellId('R2', 'review'));
  assert.equal(found.row.id, 'R2');
  assert.equal(found.cell.stage, 'review');
  assert.equal(findCell(defaultFixture, null), null);
});

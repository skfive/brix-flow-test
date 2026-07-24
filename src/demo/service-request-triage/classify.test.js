// BF-1123 개발자 단위 테스트 — 서비스 요청 우선순위 분류 순수 함수 + 엔트리 정적 구조 가드.
// 저장소 관측 규약: vanilla-static / esm (RepoConventionCapsule). 브라우저/E2E 는 tester(BF-1125) 소관.
// 실행: node --test src/demo/service-request-triage/classify.test.js
// (권위 명령 경로 demo/service-request-triage/tests/ 는 developer owned write scope 밖 — PR 본문 Implementation Notes 참조)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  classifyServiceRequestPriority,
  UndefinedTriageCodeError,
  PRIORITY_MATRIX,
  REQUEST_TYPES,
  IMPACTS,
} from './classify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const entryPath = path.join(repoRoot, 'demo/service-request-triage/index.html');

// 기획 BF-1121 §3 매트릭스 (5×4 = 20 조합, 1:1 확정 매핑). 테스트는 module 과 독립적으로 기대값을 명시한다.
const EXPECTED = {
  incident: { critical: 'P1', high: 'P1', medium: 'P2', low: 'P3' },
  security: { critical: 'P1', high: 'P1', medium: 'P2', low: 'P3' },
  bug: { critical: 'P1', high: 'P2', medium: 'P3', low: 'P4' },
  change_request: { critical: 'P2', high: 'P2', medium: 'P3', low: 'P4' },
  inquiry: { critical: 'P2', high: 'P3', medium: 'P4', low: 'P4' },
};

// 기획 §3.1 다음 조치 텍스트 (재해석 금지 — 원문 고정).
const NEXT_ACTION_TEXT = {
  P1: '즉시 담당자 배정 + 실시간 모니터링 채널 개설, 필요 시 책임자 에스컬레이션',
  P2: '당일 내 담당자 배정 및 착수, 2시간 주기 진행 상황 업데이트',
  P3: '익영업일 이내 착수, 정기(일 단위) 업데이트',
  P4: '백로그에 등록, 다음 스프린트 계획 시 우선순위 재검토',
};

test('BF-1123 — 20개 조합 전체가 기획 §3 매트릭스와 1:1 일치', () => {
  for (const type of Object.keys(EXPECTED)) {
    for (const impact of Object.keys(EXPECTED[type])) {
      const res = classifyServiceRequestPriority(type, impact);
      assert.equal(res.priority, EXPECTED[type][impact], `${type} × ${impact}`);
      assert.equal(res.nextAction, NEXT_ACTION_TEXT[res.priority], `${type} × ${impact} nextAction`);
    }
  }
});

test('BF-1123 — 반환값은 순수 객체이며 priority·nextAction 계약을 만족', () => {
  const res = classifyServiceRequestPriority('incident', 'critical');
  assert.equal(res.priority, 'P1');
  assert.equal(typeof res.nextAction, 'string');
  assert.ok(res.nextAction.length > 0);
});

test('BF-1123 — incident/security 라도 영향도가 낮으면 격상하지 않는다 (§3.2)', () => {
  assert.equal(classifyServiceRequestPriority('incident', 'low').priority, 'P3');
  assert.equal(classifyServiceRequestPriority('inquiry', 'critical').priority, 'P2');
});

test('BF-1123 — 정의되지 않은 유형 코드는 계산 거부(예외), 폴백 추정 없음 (§4)', () => {
  assert.throws(() => classifyServiceRequestPriority('unknown_type', 'critical'), UndefinedTriageCodeError);
});

test('BF-1123 — 정의되지 않은 영향도 코드는 계산 거부(예외) (§4)', () => {
  assert.throws(() => classifyServiceRequestPriority('incident', 'urgent'), UndefinedTriageCodeError);
});

test('BF-1123 — null/undefined 입력도 계산 거부(예외)', () => {
  assert.throws(() => classifyServiceRequestPriority(null, null), UndefinedTriageCodeError);
  assert.throws(() => classifyServiceRequestPriority(undefined, 'high'), UndefinedTriageCodeError);
});

test('BF-1123 — 순수 함수: 동일 입력 반복 호출이 동일 결과(무상태 재계산, §4)', () => {
  const a = classifyServiceRequestPriority('bug', 'medium');
  const b = classifyServiceRequestPriority('bug', 'medium');
  assert.deepEqual(a, b);
});

test('BF-1123 — 상수 메타: 유형 5종·영향도 4단계·매트릭스 20셀', () => {
  assert.equal(REQUEST_TYPES.length, 5);
  assert.equal(IMPACTS.length, 4);
  const cells = Object.values(PRIORITY_MATRIX).reduce((n, row) => n + Object.keys(row).length, 0);
  assert.equal(cells, 20);
});

// ── 엔트리 정적 구조 가드 (파일 존재·라우트·핵심 클래스·모듈 import) ──
test('BF-1123 — 엔트리 index.html 이 존재하고 핵심 구조를 포함', () => {
  assert.ok(fs.existsSync(entryPath), 'demo/service-request-triage/index.html 가 존재해야 함');
  const html = fs.readFileSync(entryPath, 'utf8');
  assert.match(html, /서비스 요청 분류 보드/);
  assert.match(html, /class="board"/);
  for (const col of ['column--p1', 'column--p2', 'column--p3', 'column--p4', 'column--unclassified']) {
    assert.match(html, new RegExp(col), `보드에 ${col} 컬럼이 있어야 함`);
  }
  assert.match(html, /type="module"/);
  assert.match(html, /classify\.js/, 'index.html 은 순수 함수 모듈을 import 해야 함');
  assert.match(html, /--color-primary:\s*#2563EB/i, '전역 토큰(§2) 복사 사용');
});
